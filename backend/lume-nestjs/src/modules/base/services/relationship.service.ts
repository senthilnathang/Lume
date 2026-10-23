import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { SecurityService } from './security.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RelationshipChangedEvent } from '../events/relationship.events';
import { durableEvents, enqueueAutomationEvent } from '@core/workflow/automation-outbox';

export interface RelationshipContext {
  companyId: number;
  userId: number;
  entityId: number;
}

@Injectable()
export class RelationshipService {
  constructor(private prisma: PrismaService, private events: EventEmitter2) {}

  private ids(...ids: number[]) {
    if (ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException('IDs must be positive integers');
  }

  private context(context: RelationshipContext) {
    if (!context || !Number.isSafeInteger(context.userId) || context.userId < 1 || !Number.isSafeInteger(context.companyId) || context.companyId < 1) {
      throw new ForbiddenException('Authenticated user and company required');
    }
    this.ids(context.entityId);
  }

  private async actor(db: Prisma.TransactionClient, context: RelationshipContext) {
    const user = await db.user.findUnique({ where: { id: context.userId } });
    if (!user) throw new ForbiddenException('User not found');
    return { userId: user.id, roleId: user.role_id };
  }

  private async record(db: Prisma.TransactionClient, id: number, entityId: number, context: RelationshipContext) {
    const record = await db.entityRecord.findFirst({ where: { id, entityId, companyId: context.companyId, deletedAt: null,
      entity: { deletedAt: null } }, include: { entity: true } });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  private async allowed(db: Prisma.TransactionClient, record: any, actor: { userId: number; roleId: number }, write: boolean) {
    const security = new SecurityService(db as any);
    const models = ['EntityRecord', 'entity_records', record.entity.name];
    const data = JSON.parse(record.data);
    const read = await security.recordPredicate(models, 'read', actor);
    if (!read(data)) return false;
    return !write || (await security.recordPredicate(models, 'write', actor))(data);
  }

  private async mutate(relationshipId: number, recordId: number, targetRecordId: number, context: RelationshipContext, remove: boolean) {
    this.context(context);
    this.ids(relationshipId, recordId, targetRecordId);
    if (recordId === targetRecordId) throw new BadRequestException('Cannot create circular relationship - record cannot link to itself');
    let changed = false;
    const result = await this.prisma.$transaction(async tx => {
      // Serialize changes to this relationship, including duplicate-link detection.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM entity_relationships WHERE id = ${relationshipId} FOR UPDATE`);
      const relationship = await tx.entityRelationship.findUnique({ where: { id: relationshipId } });
      if (!relationship || relationship.sourceEntityId !== context.entityId) throw new NotFoundException('Relationship not found for source entity');
      const entityIds = [...new Set([relationship.sourceEntityId, relationship.targetEntityId])].sort((a,b) => a-b);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM entities WHERE id IN (${Prisma.join(entityIds)}) ORDER BY id FOR UPDATE`);
      const ids = [recordId, targetRecordId].sort((a,b) => a-b);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM entity_records WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
      const actor = await this.actor(tx, context);
      const source = await this.record(tx, recordId, relationship.sourceEntityId, context);
      const target = await this.record(tx, targetRecordId, relationship.targetEntityId, context);
      if (!await this.allowed(tx, source, actor, true) || !await this.allowed(tx, target, actor, true)) {
        throw new ForbiddenException('Access denied by record rule');
      }
      const where = { relationshipId, sourceRecordId: recordId, targetRecordId };
      if (remove) {
        const result = await tx.entityRelationshipRecord.deleteMany({ where });
        changed = result.count > 0;
        if(changed)await enqueueAutomationEvent(tx,'relationship.changed',new RelationshipChangedEvent(relationshipId,recordId,targetRecordId,context.userId,context.companyId));
        return { success: true, removed: result.count, message: 'Records unlinked successfully' };
      }
      const existing = await tx.entityRelationshipRecord.findFirst({ where, orderBy: { id: 'asc' } });
      const link = existing ?? await tx.entityRelationshipRecord.create({ data: where });
      changed = !existing;
      if(changed)await enqueueAutomationEvent(tx,'relationship.changed',new RelationshipChangedEvent(relationshipId,recordId,targetRecordId,context.userId,context.companyId));
      return { success: true, data: link, message: 'Records linked successfully' };
    });
    if (changed&&!durableEvents()) {
      try {
        await this.events.emitAsync('relationship.changed', new RelationshipChangedEvent(
          relationshipId, recordId, targetRecordId, context.userId, context.companyId,
        ));
      } catch (error: any) {
        // The link is committed; listener failure must not report a failed mutation.
        console.error(`Relationship automation failed: ${error.message}`);
      }
    }
    return result;
  }

  linkRecords(relationshipId: number, recordId: number, targetRecordId: number, context: RelationshipContext) {
    return this.mutate(relationshipId, recordId, targetRecordId, context, false);
  }

  unlinkRecords(relationshipId: number, recordId: number, targetRecordId: number, context: RelationshipContext) {
    return this.mutate(relationshipId, recordId, targetRecordId, context, true);
  }

  async getRecordRelationships(recordId: number, context: RelationshipContext): Promise<any[]> {
    this.context(context);
    this.ids(recordId);
    const actor = await this.actor(this.prisma, context);
    const source = await this.record(this.prisma, recordId, context.entityId, context);
    if (!await this.allowed(this.prisma, source, actor, false)) throw new ForbiddenException('Access denied by record rule');
    const links = await this.prisma.entityRelationshipRecord.findMany({ where: { sourceRecordId: recordId,
      relationship: { sourceEntityId: context.entityId } }, include: { relationship: true }, orderBy: { id: 'asc' } });
    const visible = [];
    for (const link of links) {
      const target = await this.prisma.entityRecord.findFirst({ where: { id: link.targetRecordId,
        entityId: link.relationship.targetEntityId, companyId: context.companyId, deletedAt: null,
        entity: { deletedAt: null } }, include: { entity: true } });
      if (target && await this.allowed(this.prisma, target, actor, false)) visible.push(link);
    }
    return visible;
  }

  async getLinkedRecords(recordId: number, relationshipId: number, context: RelationshipContext): Promise<number[]> {
    this.ids(relationshipId);
    const links = await this.getRecordRelationships(recordId, context);
    return links.filter(link => link.relationshipId === relationshipId).map(link => link.targetRecordId);
  }
}
