import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { automationAssignmentRules } from '../models/schema';
import { eq } from 'drizzle-orm';
import { RecordCreatedEvent } from '@base/events/record.events';

@Injectable()
export class AssignmentRuleEngineService implements OnModuleInit {
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
    await this.executeAssignmentRules(event.entityId, event.record);
  }

  private async executeAssignmentRules(entityId: number, record: any) {
    try {
      // Get entity to find model name
      const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
      if (!entity) return;

      // Get all active assignment rules for this model
      const rules = await this.db
        .select()
        .from(automationAssignmentRules)
        .where(eq(automationAssignmentRules.status, 'active'));

      const applicableRules = rules
        .filter((rule: any) => rule.model === entity.name || rule.model === entity.slug)
        .sort((a: any, b: any) => (a.priority || 10) - (b.priority || 10));

      // Find first matching rule and execute
      for (const rule of applicableRules) {
        if (!rule.condition || this.evaluateCondition(rule.condition, record)) {
          await this.assignRecord(rule, record);
          break; // Stop at first match
        }
      }
    } catch (error: any) {
      console.error(`Assignment rule execution failed for entity ${entityId}: ${error.message}`);
    }
  }

  private evaluateCondition(condition: any, record: any): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

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
          case '$lt':
            if (!(record[field] < opValue)) return false;
            break;
          case '$in':
            if (!Array.isArray(opValue) || !opValue.includes(record[field])) return false;
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

  private async assignRecord(rule: any, record: any) {
    try {
      const assignTo = rule.assignTo || 'user';
      let assigneeId: number | null = null;

      switch (assignTo) {
        case 'user':
          assigneeId = rule.assigneeId;
          break;

        case 'role':
          // Get first user with this role
          const roleUsers = await this.prisma.user.findMany({
            where: { roleId: rule.assigneeId },
            take: 1,
          });
          if (roleUsers.length > 0) {
            assigneeId = roleUsers[0].id;
          }
          break;

        case 'round_robin':
          assigneeId = await this.getRoundRobinAssignee(rule);
          break;

        default:
          assigneeId = rule.assigneeId;
      }

      // Update record with assignee
      if (assigneeId) {
        const recordData = JSON.parse(record.data || '{}');
        recordData.assignedTo = assigneeId;

        await this.prisma.entityRecord.update({
          where: { id: record.id },
          data: {
            data: JSON.stringify(recordData),
          },
        });
      }
    } catch (error: any) {
      console.error(`Record assignment failed: ${error.message}`);
    }
  }

  private async getRoundRobinAssignee(rule: any): Promise<number | null> {
    try {
      // Get all users with the specified role
      const users = await this.prisma.user.findMany({
        where: { roleId: rule.assigneeId },
      });

      if (users.length === 0) return null;

      // Get last assigned index from rule
      const lastIndex = (rule as any).lastAssignedIndex || 0;
      const nextIndex = (lastIndex + 1) % users.length;

      // Update rule with new index
      await this.db
        .update(automationAssignmentRules)
        .set({ lastAssignedIndex: nextIndex })
        .where(eq(automationAssignmentRules.id, rule.id));

      return users[nextIndex].id;
    } catch {
      return null;
    }
  }
}
