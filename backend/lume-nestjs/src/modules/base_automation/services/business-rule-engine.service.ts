import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { WorkflowActionsService } from '@core/workflow/workflow-actions.service';
import { OnEvent } from '@nestjs/event-emitter';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { automationBusinessRules } from '../models/schema';
import { eq } from 'drizzle-orm';
import { RecordCreatedEvent, RecordUpdatedEvent } from '@modules/base/events/record.events';
import { RecordService } from '@modules/base/services/record.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class BusinessRuleEngineService implements OnModuleInit {
  private db: any;

  constructor(
    private drizzle: DrizzleService,
    private prisma: PrismaService,
    private records: RecordService,
    @Optional() private actions?: WorkflowActionsService,
  ) {
    this.db = drizzle.getDrizzle();
  }

  onModuleInit() {
    // Service initialized
  }

  @OnEvent('record.created',{suppressErrors:false})
  async handleRecordCreated(event: RecordCreatedEvent) {
    await this.executeRules(event.entityId, 'record.created', event.record, event.userId,undefined,event);
  }

  @OnEvent('record.updated',{suppressErrors:false})
  async handleRecordUpdated(event: RecordUpdatedEvent) {
    await this.executeRules(event.entityId, 'record.updated', event.record, event.userId, event.previousData,event);
  }

  private async executeRules(entityId: number, trigger: string, record: any, userId: number, previousData?: any,event?:any) {
    try {
      if (![entityId, record?.id, record?.companyId, userId].every(id => Number.isSafeInteger(id) && id > 0) || record.entityId !== entityId) return;
      // Authorize and reload persisted data instead of trusting a stale event payload.
      record = await this.records.getRecord(record.id, record.companyId, userId, entityId);
      if (!record) return;
      // Get entity to find model name
      const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
      if (!entity || entity.deletedAt) return;

      // Get all active business rules for this model
      const rules = await this.db
        .select()
        .from(automationBusinessRules)
        .where(eq(automationBusinessRules.status, 'active'));

      const applicableRules = rules
        .filter((rule: any) => rule.model === entity.name)
        .sort((a: any, b: any) => (a.priority ?? 10) - (b.priority ?? 10) || a.id - b.id);

      // Execute each rule
      for (const rule of applicableRules) {
        const condition = this.object(rule.condition ?? {}, 'condition');
        if (this.evaluateCondition(condition, record.data, previousData)) {
          const context={companyId:record.companyId,userId,record,variables:{...record.data},executionKey:event?.executionKey,stepKey:`rule.${rule.id}`} as any;
          record = await this.executeAction(this.object(rule.action ?? {}, 'action'), entityId, record, userId,context,event?.durable) ?? record;
        }
      }
    } catch (error: any) {
      if(event?.durable)throw error;
      console.error(`Business rule execution failed for entity ${entityId}: ${error.message}`);
    }
  }

  private object(value: any, label: string) {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new BadRequestException(`Invalid business rule ${label}`);
    return parsed;
  }

  private evaluateCondition(condition: any, record: any, previousData?: any): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    // Support simple field equality: { fieldName: value } or { fieldName: { $eq: value } }
    for (const [field, value] of Object.entries(condition)) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) return false;
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value) || !Object.keys(value).length) return false;
        for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case '$eq':
            if (record[field] !== opValue) return false;
            break;
          case '$ne':
            if (record[field] === opValue) return false;
            break;
          case '$gt':
            if (!(record[field] > opValue)) return false;
            break;
          case '$gte':
            if (!(record[field] >= opValue)) return false;
            break;
          case '$lt':
            if (!(record[field] < opValue)) return false;
            break;
          case '$lte':
            if (!(record[field] <= opValue)) return false;
            break;
          case '$in':
            if (!Array.isArray(opValue) || !opValue.includes(record[field])) return false;
            break;
          case '$nin':
            if (!Array.isArray(opValue) || opValue.includes(record[field])) return false;
            break;
          case '$contains':
            if (!String(record[field] || '').includes(String(opValue))) return false;
            break;
          default:
            return false;
        }
        }
      } else {
        if (record[field] !== value) return false;
      }
    }

    return true;
  }

  private async executeAction(action: any, entityId: number, record: any, userId: number,context?:any,durable=false) {
    if (!action) return;

    try {
      const actionType = action.type || action.actionType;

      switch (actionType) {
        case 'set_field':
          if(durable){
            if(!this.actions)throw new Error('Workflow action service unavailable');
            if(typeof action.fieldName!=='string'||!action.fieldName||['__proto__','constructor','prototype'].includes(action.fieldName)||action.value===undefined)throw new BadRequestException('Invalid set_field action');
            return this.actions.once(context,tx=>this.records.withTransaction(tx).updateRecord(record.id,{[action.fieldName]:action.value},record.companyId,userId,entityId,{emitEvent:false}));
          }
          return await this.executeSetFieldAction(entityId, record, action, userId);
        case 'send_notification':
          if(!this.actions)throw new Error('Workflow action service unavailable');
          await this.actions.notify(context,{to:String(action.recipientId),message:action.message,title:action.title,channel:action.channel});
          break;
        case 'call_webhook':
          if(!this.actions)throw new Error('Workflow action service unavailable');
          await this.actions.webhook(context,{url:action.webhookUrl,method:'POST',body:action.body??{event:'rule_executed',recordId:record.id}});
          break;
        default:
          throw new BadRequestException(`Unknown action type: ${actionType}`);
      }
    } catch (error: any) {
      if(durable)throw error;
      console.error(`Action execution failed: ${error.message}`);
    }
  }

  private async executeSetFieldAction(entityId: number, record: any, action: any, userId: number) {
    // Set field on a record
    if (typeof action.fieldName !== 'string' || !action.fieldName || ['__proto__','constructor','prototype'].includes(action.fieldName) || action.value === undefined) {
      throw new BadRequestException('Invalid set_field action');
    }

    return this.records.updateRecord(record.id, { [action.fieldName]: action.value }, record.companyId, userId, entityId, { emitEvent: false });
  }

}
