import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class LookupResolverService {
  constructor(private prisma: PrismaService) {}

  async resolveLookupFields(
    record: any,
    fields: any[],
    entityId: number,
  ): Promise<Record<string, any>> {
    const resolvedRecord = { ...record };

    try {
      const lookupFields = fields.filter((f: any) => f.type === 'lookup' && f.lookupEntityId && f.lookupField);

      for (const lookupField of lookupFields) {
        const referencedId = record[lookupField.name];

        if (referencedId) {
          // Get referenced record
          const refRecord = await this.prisma.entityRecord.findUnique({
            where: { id: referencedId },
          });

          if (refRecord) {
            const refData = JSON.parse(refRecord.data || '{}');
            const displayValue = refData[lookupField.lookupField];

            // Add display field
            resolvedRecord[`${lookupField.name}__display`] = displayValue;

            // Optionally add full referenced data
            resolvedRecord[`${lookupField.name}__data`] = refData;
          }
        }
      }
    } catch (error: any) {
      console.error(`Lookup field resolution failed: ${error.message}`);
    }

    return resolvedRecord;
  }

  async resolveRelatedRecords(
    record: any,
    relationshipId: number,
    direction: 'forward' | 'reverse' = 'forward',
  ): Promise<any[]> {
    try {
      const relationship = await this.prisma.entityRelationship.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        return [];
      }

      const relatedRecords = await this.prisma.entityRelationshipRecord.findMany({
        where:
          direction === 'forward'
            ? { sourceRecordId: record.id }
            : { targetRecordId: record.id },
      });

      const recordIds = relatedRecords.map((r: any) =>
        direction === 'forward' ? r.targetRecordId : r.sourceRecordId,
      );

      if (recordIds.length === 0) {
        return [];
      }

      const records = await this.prisma.entityRecord.findMany({
        where: { id: { in: recordIds }, deletedAt: null },
      });

      return records.map((r: any) => ({
        ...r,
        data: JSON.parse(r.data || '{}'),
      }));
    } catch (error: any) {
      console.error(`Reverse relationship resolution failed: ${error.message}`);
      return [];
    }
  }
}
