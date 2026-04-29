import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { automationRollupFields } from '../models/schema';
import { eq } from 'drizzle-orm';
import { RecordCreatedEvent, RecordUpdatedEvent, RecordDeletedEvent } from '@base/events/record.events';

@Injectable()
export class RollupEngineService implements OnModuleInit {
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
    await this.recomputeRollups(event.record);
  }

  @OnEvent('record.updated')
  async handleRecordUpdated(event: RecordUpdatedEvent) {
    await this.recomputeRollups(event.record);
  }

  @OnEvent('record.deleted')
  async handleRecordDeleted(event: RecordDeletedEvent) {
    // Recompute rollups for parent records
    await this.recomputeRollupsByChildRecord({ id: event.recordId, entityId: event.entityId });
  }

  private async recomputeRollups(childRecord: any) {
    try {
      // Get the entity of the child record
      const childEntity = await this.prisma.entity.findUnique({
        where: { id: childRecord.entityId },
      });

      if (!childEntity) return;

      // Get all rollup fields that reference this entity as child
      const rollups = await this.db
        .select()
        .from(automationRollupFields)
        .where(eq(automationRollupFields.status, 'active'));

      const applicableRollups = rollups.filter(
        (rollup: any) => rollup.childModel === childEntity.name || rollup.childModel === childEntity.slug,
      );

      for (const rollup of applicableRollups) {
        await this.executeRollup(rollup, childRecord);
      }
    } catch (error: any) {
      console.error(`Rollup execution failed: ${error.message}`);
    }
  }

  private async recomputeRollupsByChildRecord(childRecord: any) {
    try {
      // Similar to recomputeRollups but triggered from deletion
      const childEntity = await this.prisma.entity.findUnique({
        where: { id: childRecord.entityId },
      });

      if (!childEntity) return;

      const rollups = await this.db
        .select()
        .from(automationRollupFields)
        .where(eq(automationRollupFields.status, 'active'));

      const applicableRollups = rollups.filter(
        (rollup: any) => rollup.childModel === childEntity.name || rollup.childModel === childEntity.slug,
      );

      for (const rollup of applicableRollups) {
        // Get all child records and recompute
        const allChildRecords = await this.prisma.entityRecord.findMany({
          where: { entityId: childRecord.entityId, deletedAt: null },
        });

        for (const record of allChildRecords) {
          const parsedData = JSON.parse(record.data || '{}');
          await this.executeRollup(rollup, { ...record, ...parsedData });
        }
      }
    } catch (error: any) {
      console.error(`Rollup recomputation failed: ${error.message}`);
    }
  }

  private async executeRollup(rollup: any, childRecord: any) {
    try {
      const { parentModel, rollupField, targetField, operation, filterCondition } = rollup;

      // Get parent entity
      const parentEntity = await this.prisma.entity.findFirst({
        where: {
          OR: [{ name: parentModel }, { slug: parentModel }],
        },
      });

      if (!parentEntity) return;

      // Get parent records (assuming foreign key relationship)
      // For now, we'll compute the rollup value from all child records
      const childRecords = await this.prisma.entityRecord.findMany({
        where: {
          entityId: parentEntity.id,
          deletedAt: null,
        },
      });

      const value = childRecord[rollupField];
      if (value === undefined || value === null) return;

      // Apply filter condition if specified
      let applicableRecords = childRecords.map((r: any) => ({
        ...r,
        data: JSON.parse(r.data || '{}'),
      }));

      if (filterCondition && Object.keys(filterCondition).length > 0) {
        applicableRecords = applicableRecords.filter((record: any) =>
          this.evaluateCondition(filterCondition, record.data),
        );
      }

      // Calculate rollup value
      const rollupValue = this.calculateRollup(
        operation,
        applicableRecords.map((r: any) => r.data[rollupField]),
      );

      // Update parent record with rollup value
      for (const parentRecord of childRecords) {
        const data = JSON.parse(parentRecord.data || '{}');
        data[targetField] = rollupValue;

        await this.prisma.entityRecord.update({
          where: { id: parentRecord.id },
          data: { data: JSON.stringify(data) },
        });
      }
    } catch (error: any) {
      console.error(`Rollup calculation failed: ${error.message}`);
    }
  }

  private calculateRollup(operation: string, values: any[]): any {
    const numericValues = values
      .filter((v: any) => v !== undefined && v !== null)
      .map((v: any) => Number(v))
      .filter((v: any) => !isNaN(v));

    if (numericValues.length === 0) {
      return operation === 'count' ? 0 : null;
    }

    switch (operation) {
      case 'sum':
        return numericValues.reduce((a, b) => a + b, 0);
      case 'count':
        return values.filter((v: any) => v !== undefined && v !== null).length;
      case 'avg':
        return numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
      case 'min':
        return Math.min(...numericValues);
      case 'max':
        return Math.max(...numericValues);
      default:
        return null;
    }
  }

  private evaluateCondition(condition: any, data: Record<string, any>): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true;
    }

    for (const [field, value] of Object.entries(condition)) {
      if (typeof value === 'object' && value !== null) {
        const op = Object.keys(value)[0];
        const opValue = (value as any)[op];

        switch (op) {
          case '$eq':
            if (data[field] !== opValue) return false;
            break;
          case '$ne':
            if (data[field] === opValue) return false;
            break;
          case '$gt':
            if (!(data[field] > opValue)) return false;
            break;
          case '$lt':
            if (!(data[field] < opValue)) return false;
            break;
          default:
            return false;
        }
      } else {
        if (data[field] !== value) return false;
      }
    }

    return true;
  }
}
