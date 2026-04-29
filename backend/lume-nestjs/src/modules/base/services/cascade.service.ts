import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class CascadeService {
  constructor(private prisma: PrismaService) {}

  async handleCascadeDelete(entityId: number, recordId: number): Promise<void> {
    try {
      // Get all relationships for this entity
      const relationships = await this.prisma.entityRelationship.findMany({
        where: {
          OR: [
            { sourceEntityId: entityId },
            { targetEntityId: entityId },
          ],
        },
      });

      // Process cascade deletes
      for (const relationship of relationships) {
        if (!relationship.cascadeDelete) continue;

        // If source entity is being deleted, cascade to target
        if (relationship.sourceEntityId === entityId) {
          const relatedRecords = await this.prisma.entityRelationshipRecord.findMany({
            where: { sourceRecordId: recordId },
          });

          for (const rel of relatedRecords) {
            // Soft delete related records
            await this.prisma.entityRecord.update({
              where: { id: rel.targetRecordId },
              data: { deletedAt: new Date() },
            });
          }
        } else if (relationship.targetEntityId === entityId) {
          const relatedRecords = await this.prisma.entityRelationshipRecord.findMany({
            where: { targetRecordId: recordId },
          });

          for (const rel of relatedRecords) {
            // Soft delete related records
            await this.prisma.entityRecord.update({
              where: { id: rel.sourceRecordId },
              data: { deletedAt: new Date() },
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`Cascade delete failed: ${error.message}`);
    }
  }

  async handleCascadeUpdate(entityId: number, recordId: number, updates: Record<string, any>): Promise<void> {
    try {
      // Get all relationships for this entity
      const relationships = await this.prisma.entityRelationship.findMany({
        where: {
          OR: [
            { sourceEntityId: entityId },
            { targetEntityId: entityId },
          ],
        },
      });

      // Process cascade updates
      for (const relationship of relationships) {
        if (!relationship.cascadeUpdate) continue;

        if (relationship.sourceEntityId === entityId) {
          const relatedRecords = await this.prisma.entityRelationshipRecord.findMany({
            where: { sourceRecordId: recordId },
          });

          for (const rel of relatedRecords) {
            const targetRecord = await this.prisma.entityRecord.findUnique({
              where: { id: rel.targetRecordId },
            });

            if (targetRecord) {
              const data = JSON.parse(targetRecord.data || '{}');
              const mergedData = { ...data, ...updates };

              await this.prisma.entityRecord.update({
                where: { id: rel.targetRecordId },
                data: { data: JSON.stringify(mergedData) },
              });
            }
          }
        } else if (relationship.targetEntityId === entityId) {
          const relatedRecords = await this.prisma.entityRelationshipRecord.findMany({
            where: { targetRecordId: recordId },
          });

          for (const rel of relatedRecords) {
            const sourceRecord = await this.prisma.entityRecord.findUnique({
              where: { id: rel.sourceRecordId },
            });

            if (sourceRecord) {
              const data = JSON.parse(sourceRecord.data || '{}');
              const mergedData = { ...data, ...updates };

              await this.prisma.entityRecord.update({
                where: { id: rel.sourceRecordId },
                data: { data: JSON.stringify(mergedData) },
              });
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`Cascade update failed: ${error.message}`);
    }
  }
}
