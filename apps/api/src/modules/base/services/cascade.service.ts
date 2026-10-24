import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

import { RecordService } from './record.service';
import { executeCascade } from './cascade-operation';

export interface CascadeContext { companyId: number; userId: number }

@Injectable()
export class CascadeService {
  constructor(private prisma: PrismaService, private records: RecordService) {}

  async handleCascadeDelete(entityId: number, recordId: number, context: CascadeContext): Promise<void> {
    await this.cascade(entityId, recordId, 'delete', context);
  }

  async handleCascadeUpdate(entityId: number, recordId: number, updates: Record<string, any>, context: CascadeContext): Promise<void> {
    await this.cascade(entityId, recordId, 'update', context, updates);
  }

  private async cascade(
    entityId: number,
    recordId: number,
    operation: 'delete' | 'update',
    context: CascadeContext,
    updates: Record<string, any> = {},
  ): Promise<void> {
    if (!context || ![context.companyId, context.userId].every(id => Number.isSafeInteger(id) && id > 0)) {
      throw new ForbiddenException('Cascade requires a valid tenant and actor');
    }
    if (![entityId, recordId].every(id => Number.isSafeInteger(id) && id > 0) ||
        !updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new BadRequestException('Invalid cascade input');
    }
    await this.prisma.$transaction(async (tx) => {
      await executeCascade(tx, this.records.withTransaction(tx), entityId, recordId, operation, context, updates);
    });
  }
}
