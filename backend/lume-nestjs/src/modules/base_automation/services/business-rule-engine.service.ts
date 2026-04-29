import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { automationBusinessRules } from '../models/schema';
import { eq } from 'drizzle-orm';
import { RecordCreatedEvent, RecordUpdatedEvent } from '@base/events/record.events';

@Injectable()
export class BusinessRuleEngineService implements OnModuleInit {
  private db: any;

  constructor(
    private drizzle: DrizzleService,
    private prisma: PrismaService,
  ) {
    this.db = drizzle.getDrizzle();
  }

  onModuleInit() {
    // Service initialized
  }

  @OnEvent('record.created')
  async handleRecordCreated(event: RecordCreatedEvent) {
    await this.executeRules(event.entityId, 'record.created', event.record);
  }

  @OnEvent('record.updated')
  async handleRecordUpdated(event: RecordUpdatedEvent) {
    await this.executeRules(event.entityId, 'record.updated', event.record, event.previousData);
  }

  private async executeRules(entityId: number, trigger: string, record: any, previousData?: any) {
    try {
      // Get entity to find model name
      const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
      if (!entity) return;

      // Get all active business rules for this model
      const rules = await this.db
        .select()
        .from(automationBusinessRules)
        .where(eq(automationBusinessRules.status, 'active'));

      const applicableRules = rules
        .filter((rule: any) => rule.model === entity.name || rule.model === entity.slug)
        .sort((a: any, b: any) => (a.priority || 10) - (b.priority || 10));

      // Execute each rule
      for (const rule of applicableRules) {
        if (this.evaluateCondition(rule.condition, record, previousData)) {
          await this.executeAction(rule.action, entityId, record);
        }
      }
    } catch (error: any) {
      console.error(`Business rule execution failed for entity ${entityId}: ${error.message}`);
    }
  }

  private evaluateCondition(condition: any, record: any, previousData?: any): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    // Support simple field equality: { fieldName: value } or { fieldName: { $eq: value } }
    for (const [field, value] of Object.entries(condition)) {
      if (typeof value === 'object' && value !== null) {
        const op = Object.keys(value)[0];
        const opValue = (value as any)[op];

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
      } else {
        if (record[field] !== value) return false;
      }
    }

    return true;
  }

  private async executeAction(action: any, entityId: number, record: any) {
    if (!action) return;

    try {
      const actionType = action.type || action.actionType;

      switch (actionType) {
        case 'set_field':
          await this.executeSetFieldAction(entityId, record.id, action);
          break;
        case 'send_notification':
          await this.executeSendNotificationAction(action, record);
          break;
        case 'call_webhook':
          await this.executeCallWebhookAction(action, record);
          break;
        default:
          console.warn(`Unknown action type: ${actionType}`);
      }
    } catch (error: any) {
      console.error(`Action execution failed: ${error.message}`);
    }
  }

  private async executeSetFieldAction(entityId: number, recordId: number, action: any) {
    // Set field on a record
    if (!action.fieldName || action.value === undefined) {
      return;
    }

    const record = await this.prisma.entityRecord.findUnique({ where: { id: recordId } });
    if (!record) return;

    const data = JSON.parse(record.data);
    data[action.fieldName] = action.value;

    await this.prisma.entityRecord.update({
      where: { id: recordId },
      data: { data: JSON.stringify(data) },
    });
  }

  private async executeSendNotificationAction(action: any, record: any) {
    // Placeholder for notification logic
    console.log(`[Notification] ${action.message}`, {
      recipientId: action.recipientId,
      record: record.id,
    });
  }

  private async executeCallWebhookAction(action: any, record: any) {
    // Placeholder for webhook logic
    if (!action.webhookUrl) return;

    try {
      const response = await fetch(action.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'rule_executed', record, action }),
      });

      if (!response.ok) {
        console.error(`Webhook failed with status ${response.status}`);
      }
    } catch (error: any) {
      console.error(`Webhook call failed: ${error.message}`);
    }
  }
}
