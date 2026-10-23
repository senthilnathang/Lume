import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { RecordService } from '@modules/base/services/record.service';
import { SecurityService } from '@modules/base/services/security.service';
import { RecordCreatedEvent, RecordUpdatedEvent, RecordDeletedEvent } from '@modules/base/events/record.events';
import { RelationshipChangedEvent } from '@modules/base/events/relationship.events';

@Injectable()
export class RollupEngineService {
  constructor(private prisma: PrismaService, private records: RecordService) {}

  @OnEvent('record.created',{suppressErrors:false})
  async handleRecordCreated(event: RecordCreatedEvent) {
    await this.recompute(event.entityId,event.record?.id,event.userId,event.record?.companyId,false,undefined,event.durable);
  }

  @OnEvent('record.updated',{suppressErrors:false})
  async handleRecordUpdated(event: RecordUpdatedEvent) {
    await this.recompute(event.entityId,event.record?.id,event.userId,event.record?.companyId,false,undefined,event.durable);
  }

  @OnEvent('record.deleted',{suppressErrors:false})
  async handleRecordDeleted(event: RecordDeletedEvent) {
    await this.recompute(event.entityId,event.recordId,event.userId,event.companyId,true,undefined,event.durable);
  }

  @OnEvent('relationship.changed',{suppressErrors:false})
  async handleRelationshipChanged(event: RelationshipChangedEvent) {
    if (![event.relationshipId,event.sourceRecordId,event.targetRecordId,event.userId,event.companyId].every(id=>Number.isSafeInteger(id) && id>0)) return;
    const relation = await this.prisma.entityRelationship.findUnique({where:{id:event.relationshipId}});
    if (!relation) return;
    // The endpoint can be deleted after the link mutation commits. Tenant context
    // still lets us reset the surviving parent using its current contributors.
    await this.recompute(relation.targetEntityId,event.targetRecordId,event.userId,event.companyId,true,
      { entityId:relation.sourceEntityId, recordId:event.sourceRecordId },event.durable);
    // Self-relations consistently use source as parent.
    if (relation.sourceEntityId !== relation.targetEntityId) {
      await this.recompute(relation.sourceEntityId,event.sourceRecordId,event.userId,event.companyId,true,
        { entityId:relation.targetEntityId, recordId:event.targetRecordId },event.durable);
    }
  }

  private async recompute(entityId: number, recordId: number, userId: number, companyId: number | undefined, deleted: boolean,
    affectedParent?: { entityId: number; recordId: number }, durable = false) {
    try {
      if (![entityId,recordId,userId].every(id=>Number.isSafeInteger(id) && id>0)) return;
      const origin = await this.prisma.entityRecord.findUnique({where:{id:recordId}});
      if (origin && (origin.entityId !== entityId || (companyId !== undefined && origin.companyId !== companyId))) return;
      if (!deleted && (!origin || origin.deletedAt)) return;
      const tenant = companyId ?? origin?.companyId;
      if (!Number.isSafeInteger(tenant) || tenant < 1) return;
      const childEntity = await this.prisma.entity.findFirst({where:{id:entityId,deletedAt:null}});
      if (!childEntity) return;
      const rules = await this.prisma.automation_rollup_fields.findMany({where:{child_model:childEntity.name,status:'active'},orderBy:{id:'asc'}});
      for (const candidate of rules) {
        await this.prisma.$transaction(async tx => {
          // Serialize recomputations of one rollup so a later event cannot publish an older total.
          await tx.$queryRaw(Prisma.sql`SELECT id FROM automation_rollup_fields WHERE id = ${candidate.id} FOR UPDATE`);
          const rule = await tx.automation_rollup_fields.findUnique({where:{id:candidate.id}});
          if (!rule || rule.status !== 'active' || rule.child_model !== childEntity.name) return;
          if (!rule.target_field || ['__proto__','constructor','prototype'].includes(rule.target_field)) throw new BadRequestException('Invalid rollup target field');
          const filter = rule.filter_condition == null ? {} : JSON.parse(rule.filter_condition);
          if (!filter || typeof filter !== 'object' || Array.isArray(filter)) throw new BadRequestException('Invalid rollup filter');
          this.validateFilter(filter);
          const parentEntity = await tx.entity.findFirst({where:{name:rule.parent_model,deletedAt:null}});
          if (!parentEntity) return;
          if (affectedParent && parentEntity.id !== affectedParent.entityId) return;
          const relations = await tx.entityRelationship.findMany({where:{OR:[
            {sourceEntityId:parentEntity.id,targetEntityId:entityId},
            {sourceEntityId:entityId,targetEntityId:parentEntity.id},
          ]}});
          const links = relations.length ? await tx.entityRelationshipRecord.findMany({where:{relationshipId:{in:relations.map(r=>r.id)}},orderBy:{id:'asc'}}) : [];
          const relationMap = new Map(relations.map(r=>[r.id,r]));
          const childrenByParent = new Map<number,Set<number>>();
          for (const link of links) {
            const relation = relationMap.get(link.relationshipId)!;
            // For self-relations, source is parent and target is child.
            const forward = relation.sourceEntityId === parentEntity.id;
            const parentId = forward ? link.sourceRecordId : link.targetRecordId;
            const childId = forward ? link.targetRecordId : link.sourceRecordId;
            if (!childrenByParent.has(parentId)) childrenByParent.set(parentId,new Set());
            childrenByParent.get(parentId)!.add(childId);
          }
          const actor = await tx.user.findUnique({where:{id:userId}});
          if (!actor) throw new ForbiddenException('User not found');
          const readable = await new SecurityService(tx as any).recordPredicate(['EntityRecord','entity_records',childEntity.name],'read',{userId:actor.id,roleId:actor.role_id});
          const records = this.records.withTransaction(tx);
          // After the last unlink, the affected parent is absent from the link map.
          if (affectedParent && !childrenByParent.has(affectedParent.recordId)) {
            childrenByParent.set(affectedParent.recordId,new Set());
          }
          for (const [parentId,childIds] of childrenByParent) {
            if (affectedParent ? parentId !== affectedParent.recordId : !childIds.has(recordId)) continue;
            const parent = await tx.entityRecord.findFirst({where:{id:parentId,entityId:parentEntity.id,companyId:tenant,deletedAt:null}});
            if (!parent) continue;
            if (!await records.getRecord(parentId,tenant,userId,parentEntity.id)) throw new ForbiddenException('Rollup parent is not readable');
            const children = await tx.entityRecord.findMany({where:{id:{in:[...childIds]},entityId,companyId:tenant,deletedAt:null}});
            const values = [];
            for (const child of children) {
              const data = JSON.parse(child.data);
              if (!readable(data)) throw new ForbiddenException('Rollup child is not readable');
              if (this.matches(filter,data)) values.push(data[rule.rollup_field]);
            }
            const value = this.aggregate(rule.operation ?? 'sum',values);
            if (!await records.updateRecord(parentId,{[rule.target_field]:value},tenant,userId,parentEntity.id,{emitEvent:false})) {
              throw new ForbiddenException('Rollup parent is no longer writable');
            }
          }
        });
      }
    } catch (error: any) {
      if(durable)throw error;
      console.error(`Rollup execution failed for entity ${entityId}: ${error.message}`);
    }
  }

  private aggregate(operation: string, values: any[]) {
    if (operation === 'count') return values.filter(value=>value !== undefined && value !== null).length;
    const numbers = values.filter(value => typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
      .map(Number).filter(Number.isFinite);
    switch (operation) {
      case 'sum': return numbers.reduce((sum,value)=>sum+value,0);
      case 'avg': return numbers.length ? numbers.reduce((sum,value)=>sum+value,0)/numbers.length : null;
      case 'min': return numbers.length ? Math.min(...numbers) : null;
      case 'max': return numbers.length ? Math.max(...numbers) : null;
      default: throw new BadRequestException('Unsupported rollup operation');
    }
  }

  private validateFilter(condition: Record<string, any>) {
    for (const [field,value] of Object.entries(condition)) {
      if (!field || ['__proto__','constructor','prototype'].includes(field)) throw new BadRequestException('Invalid rollup filter field');
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value) || !Object.keys(value).length) throw new BadRequestException('Invalid rollup filter condition');
        for (const [op,operand] of Object.entries(value)) {
          if (!['$eq','$ne','$gt','$gte','$lt','$lte','$in','$nin'].includes(op)) throw new BadRequestException('Unsupported rollup filter operator');
          if (['$in','$nin'].includes(op)) {
            if (!Array.isArray(operand) || operand.some(item=>item !== null && typeof item === 'object')) throw new BadRequestException('Invalid rollup membership filter');
          } else if (operand !== null && typeof operand === 'object') throw new BadRequestException('Invalid rollup comparison');
        }
      }
    }
  }

  private matches(condition: Record<string, any>, data: Record<string, any>) {
    for (const [field,value] of Object.entries(condition)) {
      if (!Object.prototype.hasOwnProperty.call(data,field)) return false;
      if (value !== null && typeof value === 'object') {
        if (Array.isArray(value) || !Object.keys(value).length) throw new BadRequestException('Invalid rollup filter condition');
        for (const [op,operand] of Object.entries(value)) {
          switch (op) {
            case '$eq': if (data[field] !== operand) return false; break;
            case '$ne': if (data[field] === operand) return false; break;
            case '$gt': if (!(data[field] > operand)) return false; break;
            case '$gte': if (!(data[field] >= operand)) return false; break;
            case '$lt': if (!(data[field] < operand)) return false; break;
            case '$lte': if (!(data[field] <= operand)) return false; break;
            case '$in': if (!Array.isArray(operand)) throw new BadRequestException('Invalid in filter'); if (!operand.includes(data[field])) return false; break;
            case '$nin': if (!Array.isArray(operand)) throw new BadRequestException('Invalid nin filter'); if (operand.includes(data[field])) return false; break;
            default: throw new BadRequestException('Unsupported rollup filter operator');
          }
        }
      } else if (data[field] !== value) return false;
    }
    return true;
  }
}
