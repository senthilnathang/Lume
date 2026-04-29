import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { QueryAuditLogsDto } from '../dtos';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(logData: any) {
    try {
      const data = {
        action: logData.action,
        model: logData.resource_type || logData.model,
        recordId: logData.record_id || logData.recordId,
        oldValues: logData.old_values || logData.oldValues,
        newValues: logData.new_values || logData.newValues,
        userId: logData.user_id || logData.userId,
        ipAddress: logData.ip_address || logData.ipAddress,
        userAgent: logData.user_agent || logData.userAgent,
      };

      // Remove undefined keys
      Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

      const log = await this.prisma.auditLog.create({ data });
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      return null;
    }
  }

  async findAll(query: QueryAuditLogsDto) {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      resource_type,
      start_date,
      end_date,
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {};

    if (user_id) {
      where.userId = user_id;
    }

    if (action) {
      where.action = action;
    }

    if (resource_type) {
      where.model = resource_type;
    }

    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt.gte = new Date(start_date);
      if (end_date) where.createdAt.lte = new Date(end_date);
    }

    const [rows, count] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async findById(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return {
      success: true,
      data: log,
    };
  }

  async cleanup(daysToKeep: number = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      success: true,
      data: { deleted_count: result.count },
      message: `Cleaned up ${result.count} old audit logs`,
    };
  }
}
