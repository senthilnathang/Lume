import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { QueryAuditLogsDto } from '../dtos';
import { audit_logs_action } from '@prisma/client';
import { isDeepStrictEqual } from 'node:util';

export function auditGraphqlView(row: any) {
  const parse = (value: string | null) => { if (value == null) return null; try { return JSON.parse(value); } catch { return value; } };
  const oldValues = parse(row.oldValues), newValues = parse(row.newValues);
  const object = (value: any) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const keys = new Set([...Object.keys(object(oldValues) ? oldValues : {}), ...Object.keys(object(newValues) ? newValues : {})]);
  const changeCount = object(oldValues) || object(newValues)
    ? [...keys].filter(key => !isDeepStrictEqual(object(oldValues) ? oldValues[key] : undefined, object(newValues) ? newValues[key] : undefined)).length
    : Number(!isDeepStrictEqual(oldValues, newValues));
  return { id: String(row.id), entity: row.model, action: row.action, recordId: row.recordId,
    changes: { oldValues, newValues }, userId: row.userId == null ? null : String(row.userId),
    userEmail: null, userRole: null, ipAddress: row.ipAddress, changeCount, createdAt: row.createdAt };
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async requirePlatformAdmin(userId?: number) {
    if (!Number.isSafeInteger(userId) || userId < 1) throw new ForbiddenException('Platform administrator required for unscoped audit records');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user?.isActive || !user.role?.isActive || !['admin', 'super_admin'].includes(user.role.name)) throw new ForbiddenException('Platform administrator required for unscoped audit records');
  }

  async log(logData: any) {
    try {
      const serialize = (value: any) => value == null || typeof value === 'string' ? value : JSON.stringify(value);
      const recordId = logData.record_id ?? logData.recordId;
      const now = new Date();
      const data = {
        action: logData.action,
        model: logData.resource_type || logData.model,
        recordId: recordId == null ? recordId : String(recordId),
        oldValues: serialize(logData.old_values ?? logData.oldValues),
        newValues: serialize(logData.new_values ?? logData.newValues),
        userId: logData.user_id || logData.userId,
        ipAddress: logData.ip_address || logData.ipAddress,
        userAgent: logData.user_agent || logData.userAgent,
        createdAt: now,
        updatedAt: now,
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

  async findAll(query: QueryAuditLogsDto & { record_id?: string }, readerId?: number) {
    await this.requirePlatformAdmin(readerId);
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      resource_type,
      start_date,
      end_date,
    } = query;

    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500 ||
      !Number.isSafeInteger((page - 1) * limit) || (page - 1) * limit > 2147483647) throw new BadRequestException('Invalid audit pagination');
    if (user_id !== undefined && (!Number.isSafeInteger(user_id) || user_id < 1 || user_id > 2147483647)) throw new BadRequestException('Invalid audit user ID');
    if (action !== undefined && !Object.values(audit_logs_action).includes(action as audit_logs_action)) throw new BadRequestException('Invalid audit action');
    if (resource_type !== undefined && (typeof resource_type !== 'string' || !resource_type.trim() || resource_type.length > 100)) throw new BadRequestException('Invalid audit entity');
    const start = start_date === undefined ? undefined : new Date(start_date), end = end_date === undefined ? undefined : new Date(end_date);
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime())) || (start && end && start > end)) throw new BadRequestException('Invalid audit date range');

    const offset = (page - 1) * limit;
    const where: any = {};
    if (query.record_id !== undefined) where.recordId = query.record_id;

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
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

  async findById(id: number, readerId?: number) {
    await this.requirePlatformAdmin(readerId);
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new BadRequestException('Invalid audit ID');
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

  async cleanup(daysToKeep: number = 90, readerId?: number) {
    await this.requirePlatformAdmin(readerId);
    if (!Number.isSafeInteger(daysToKeep) || daysToKeep < 1 || daysToKeep > 36500) throw new BadRequestException('Invalid audit retention period');
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
