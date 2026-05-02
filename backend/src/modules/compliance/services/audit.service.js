/**
 * AuditService
 * Logs all state changes and actions for compliance auditing
 */
export class AuditService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Log an audit event
   * @param {string} action - Action that occurred (e.g., 'approval_created', 'document_approved')
   * @param {string} entityType - Type of entity affected (e.g., 'ApprovalTask', 'Document')
   * @param {string} entityId - ID of the affected entity
   * @param {number} userId - ID of the user who performed the action
   * @param {object} changes - What changed (before/after values)
   * @param {string} ipAddress - Optional: IP address of the user
   * @param {string} userAgent - Optional: User agent string
   * @param {object} metadata - Optional: Additional metadata
   * @returns {object} Created audit log entry
   */
  async logEvent(action, entityType, entityId, userId, changes = {}, ipAddress = null, userAgent = null, metadata = {}) {
    if (!action) throw new Error('Action is required');
    if (!entityType) throw new Error('Entity type is required');
    if (!entityId) throw new Error('Entity ID is required');
    if (!userId) throw new Error('User ID is required');

    const auditLog = await this.models.AuditLog.create({
      action,
      entityType,
      entityId,
      userId,
      changes,
      ipAddress,
      userAgent,
      metadata,
    });

    return auditLog;
  }

  /**
   * Get audit history with optional filters
   * @param {object} filters - Filter options
   *   - action: string - Filter by action
   *   - entityType: string - Filter by entity type
   *   - entityId: string - Filter by entity ID
   *   - userId: number - Filter by user ID
   *   - dateRange: { startDate, endDate } - Filter by date range
   * @returns {array} Audit log entries
   */
  async getAuditHistory(filters = {}) {
    const queryFilters = {};

    if (filters.action) {
      queryFilters.where = queryFilters.where || [];
      queryFilters.where.push(['action', '=', filters.action]);
    }

    if (filters.entityType) {
      queryFilters.where = queryFilters.where || [];
      queryFilters.where.push(['entityType', '=', filters.entityType]);
    }

    if (filters.entityId) {
      queryFilters.where = queryFilters.where || [];
      queryFilters.where.push(['entityId', '=', filters.entityId]);
    }

    if (filters.userId) {
      queryFilters.where = queryFilters.where || [];
      queryFilters.where.push(['userId', '=', filters.userId]);
    }

    if (filters.dateRange) {
      const { startDate, endDate } = filters.dateRange;
      if (startDate) {
        queryFilters.where = queryFilters.where || [];
        queryFilters.where.push(['createdAt', '>=', startDate]);
      }
      if (endDate) {
        queryFilters.where = queryFilters.where || [];
        queryFilters.where.push(['createdAt', '<=', endDate]);
      }
    }

    const result = await this.models.AuditLog.findAll(queryFilters);
    return (result && result.rows) || [];
  }

  /**
   * Get complete audit trail for a specific entity
   * Shows all actions that affected a particular entity
   * @param {string} entityType - Type of entity (e.g., 'ApprovalTask', 'Document')
   * @param {string} entityId - ID of the entity
   * @returns {array} Audit trail entries, sorted by creation date
   */
  async getAuditTrail(entityType, entityId) {
    if (!entityType) throw new Error('Entity type is required');
    if (!entityId) throw new Error('Entity ID is required');

    const result = await this.models.AuditLog.findAll({
      where: [
        ['entityType', '=', entityType],
        ['entityId', '=', entityId],
      ],
    });

    const entries = (result && result.rows) || [];
    // Sort by creation date (oldest first)
    return entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  /**
   * Get audit logs for a specific user
   * @param {number} userId - User ID
   * @param {object} options - Optional: { limit, offset, dateRange }
   * @returns {array} User's audit log entries
   */
  async getUserAuditLogs(userId, options = {}) {
    if (!userId) throw new Error('User ID is required');

    const filters = {
      where: [['userId', '=', userId]],
    };

    if (options.limit) {
      filters.limit = options.limit;
    }

    if (options.offset) {
      filters.offset = options.offset;
    }

    if (options.dateRange) {
      const { startDate, endDate } = options.dateRange;
      if (startDate) {
        filters.where.push(['createdAt', '>=', startDate]);
      }
      if (endDate) {
        filters.where.push(['createdAt', '<=', endDate]);
      }
    }

    const result = await this.models.AuditLog.findAll(filters);
    return (result && result.rows) || [];
  }

  /**
   * Search audit logs by action pattern
   * @param {string} actionPattern - Pattern to match (e.g., 'approval%', '%approved')
   * @returns {array} Matching audit entries
   */
  async searchByAction(actionPattern) {
    if (!actionPattern) throw new Error('Action pattern is required');

    const result = await this.models.AuditLog.findAll({
      where: [['action', 'like', actionPattern]],
    });

    return (result && result.rows) || [];
  }

  /**
   * Count audit logs by action
   * @returns {object} Count of logs per action
   */
  async getActionStats() {
    const result = await this.models.AuditLog.findAll({});
    const logs = (result && result.rows) || [];

    const stats = {};
    logs.forEach((log) => {
      stats[log.action] = (stats[log.action] || 0) + 1;
    });

    return stats;
  }
}

export default AuditService;
