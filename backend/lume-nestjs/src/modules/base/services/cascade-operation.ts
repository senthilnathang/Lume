import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { RecordService } from './record.service';
import type { CascadeContext } from './cascade.service';
import { SecurityService } from './security.service';
import { RecordUpdatedEvent, RecordDeletedEvent } from '../events/record.events';

/** One-hop cascade using the caller's transaction. Returned events are uncommitted. */
export async function executeCascade(
  tx: Prisma.TransactionClient, records: RecordService, entityId: number, recordId: number,
  operation: 'delete' | 'update', context: CascadeContext, updates: Record<string, any> = {},
  excludedIds: number[] = [],
): Promise<Array<RecordUpdatedEvent | RecordDeletedEvent>> {
  if (!context || ![context.companyId,context.userId].every(id=>Number.isSafeInteger(id) && id>0)) {
    throw new ForbiddenException('Cascade requires a valid tenant and actor');
  }
  const origin = await records.getRecord(recordId, context.companyId, context.userId, entityId);
  if (!origin) throw new NotFoundException('Cascade source record not found');

  const actor = await tx.user.findUnique({ where: { id: context.userId } });
  if (!actor) throw new ForbiddenException('User not found');
  const entity = await tx.entity.findUnique({ where: { id: entityId } });
  const allowed = await new SecurityService(tx as any).recordPredicate(
    ['EntityRecord', 'entity_records', entity.name], operation === 'delete' ? 'unlink' : 'write',
    { userId: actor.id, roleId: actor.role_id },
  );
  if (!allowed(origin.data)) throw new ForbiddenException('Cascade source denied by record rule');
  const visited = new Set<number>([recordId, ...excludedIds]);
  const events: Array<RecordUpdatedEvent | RecordDeletedEvent> = [];
  const relationships = await tx.entityRelationship.findMany({
    where: { OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }] },
    orderBy: { id: 'asc' },
  });
  for (const relationship of relationships) {
    if (operation === 'delete' ? !relationship.cascadeDelete : !relationship.cascadeUpdate) continue;
    // A self-referencing relationship may contain links in both directions.
    const directions = [
      ...(relationship.sourceEntityId === entityId ? ['source' as const] : []),
      ...(relationship.targetEntityId === entityId ? ['target' as const] : []),
    ];
    for (const direction of directions) {
      const links = await tx.entityRelationshipRecord.findMany({
        orderBy: { id: 'asc' },
        where: {
          relationshipId: relationship.id,
          ...(direction === 'source' ? { sourceRecordId: recordId } : { targetRecordId: recordId }),
        },
      });
      for (const link of links) {
        const relatedId = direction === 'source' ? link.targetRecordId : link.sourceRecordId;
        if (visited.has(relatedId)) continue;
        const where = {
          id: relatedId,
          entityId: direction === 'source' ? relationship.targetEntityId : relationship.sourceEntityId,
          companyId: origin.companyId,
          deletedAt: null,
        };
        const related = await tx.entityRecord.findFirst({ where });
        if (!related) continue;
        visited.add(relatedId);
        if (!await records.getRecord(relatedId, context.companyId, context.userId, where.entityId)) {
          throw new ForbiddenException('Cascade target denied by record rule');
        }
        // Return events to the owner of the transaction; never publish before commit.
        if (operation === 'delete') {
          if (!await records.deleteRecord(relatedId, true, context.companyId, context.userId, where.entityId, { emitEvent: false })) {
            throw new NotFoundException('Cascade target disappeared');
          }
          events.push(new RecordDeletedEvent(where.entityId, relatedId, context.userId, context.companyId));
        } else {
          const updated = await records.updateRecord(relatedId, updates, context.companyId, context.userId, where.entityId, { emitEvent: false });
          if (!updated) {
            throw new NotFoundException('Cascade target disappeared');
          }
          events.push(new RecordUpdatedEvent(where.entityId, updated, JSON.parse(related.data), context.userId));
        }
      }
    }
  }
  return events;
}
