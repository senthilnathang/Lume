import { getDatabase } from '../../config.js';
import { Op } from 'sequelize';
import { responseUtil } from '../../shared/utils/index.js';
import { PAGINATION } from '../../shared/constants/index.js';

export class AuditService {
  constructor() {
    this.db = getDatabase();
    this.AuditLog = this.db.models.AuditLog;
    this.sequelize = this.db.models.sequelize || this.db.sequelize;
  }

  async log(logData) {
    try {
      const log = await this.AuditLog.create(logData);
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
      where.user_id = user_id;
    }

    if (action) {
      where.action = action;
    }

    if (resource_type) {
      where.resource_type = resource_type;
    }

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    const { count, rows } = await this.AuditLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return responseUtil.paginated(rows, {
      page,
      limit,
      total: count
    });
  }

  async findById(id) {
    const log = await this.AuditLog.findByPk(id);
    if (!log) {
      return responseUtil.notFound('Audit Log');
    }
    return responseUtil.success(log);
  }

  async cleanup(daysToKeep = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const deleted = await this.AuditLog.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });
    return responseUtil.success({ deleted_count: deleted }, `Cleaned up ${deleted} old audit logs`);
  }
}

export default AuditService;
