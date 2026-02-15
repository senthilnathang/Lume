import prisma from '../../core/db/prisma.js';
import { responseUtil } from '../../shared/utils/index.js';
import { PAGINATION } from '../../shared/constants/index.js';

export class AuditService {
  async log(logData) {
    try {
      const data = {
        action: logData.action,
        model: logData.resource_type || logData.model,
        recordId: logData.record_id || logData.recordId,
        oldValues: logData.old_values || logData.oldValues,
        newValues: logData.new_values || logData.newValues,
        userId: logData.user_id || logData.userId,
        ipAddress: logData.ip_address || logData.ipAddress,
        userAgent: logData.user_agent || logData.userAgent
      };

      // Remove undefined keys
      Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

      const log = await prisma.auditLog.create({ data });
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      return null;
    }
  }

  async findAll(options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, user_id, action, resource_type, start_date, end_date } = options;
    const offset = (page - 1) * limit;

    const where = {};

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
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async findById(id) {
    const log = await prisma.auditLog.findUnique({ where: { id: Number(id) } });
    if (!log) {
      return responseUtil.notFound('Audit Log');
    }
    return responseUtil.success(log);
  }

  async cleanup(daysToKeep = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    return responseUtil.success({ deleted_count: result.count }, `Cleaned up ${result.count} old audit logs`);
  }
}

export default AuditService;
