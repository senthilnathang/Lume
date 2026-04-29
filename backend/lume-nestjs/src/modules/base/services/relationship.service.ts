import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class RelationshipService {
  constructor(private prisma: PrismaService) {}

  /**
   * Link two records together via a relationship
   */
  async linkRecords(relationshipId: number, recordId: number, targetRecordId: number): Promise<any> {
    // Check for circular reference (simple check)
    if (recordId === targetRecordId) {
      throw new BadRequestException('Cannot create circular relationship - record cannot link to itself');
    }

    // Create the relationship link
    const link = await this.prisma.entityRelationshipRecord.create({
      data: {
        relationshipId,
        sourceRecordId: recordId,
        targetRecordId: targetRecordId,
      },
    });

    return {
      success: true,
      data: link,
      message: 'Records linked successfully',
    };
  }

  /**
   * Unlink two records
   */
  async unlinkRecords(relationshipId: number, recordId: number, targetRecordId: number): Promise<any> {
    await this.prisma.entityRelationshipRecord.deleteMany({
      where: {
        relationshipId,
        sourceRecordId: recordId,
        targetRecordId: targetRecordId,
      },
    });

    return {
      success: true,
      message: 'Records unlinked successfully',
    };
  }

  /**
   * Get all relationships for a record
   */
  async getRecordRelationships(recordId: number): Promise<any> {
    const relationships = await this.prisma.entityRelationshipRecord.findMany({
      where: {
        sourceRecordId: recordId,
      },
      include: {
        relationship: true,
      },
    });

    return relationships;
  }

  /**
   * Get linked records for a specific relationship
   */
  async getLinkedRecords(recordId: number, relationshipId: number): Promise<any> {
    const links = await this.prisma.entityRelationshipRecord.findMany({
      where: {
        sourceRecordId: recordId,
        relationshipId,
      },
    });

    return links.map((link) => link.targetRecordId);
  }
}
