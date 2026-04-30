/**
 * @fileoverview Audit Logger - Track all entity changes for compliance
 * Records who did what, when, and why for audit trails
 */

import logger from '../services/logger.js';

class AuditLogger {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.db - Database adapter for audit storage
   * @param {boolean} config.enabled - Enable audit logging (default true)
   * @param {number} config.retentionDays - Audit retention period (default 365)
   */
  constructor(config = {}) {
    this.db = config.db;
    this.enabled = config.enabled !== false;
    this.retentionDays = config.retentionDays || 365;
    this.logs = []; // In-memory buffer
    this.logId = 0;
  }

  /**
   * Log an entity change
   * @param {Object} entry - Audit entry
   * @param {string} entry.entity - Entity slug
   * @param {string} entry.action - Action (create, update, delete)
   * @param {number} entry.recordId - Record ID
   * @param {Object} entry.changes - Changed fields { before, after }
   * @param {string} entry.userId - User ID who made change
   * @param {string} entry.userEmail - User email
   * @param {string} entry.userRole - User role
   * @param {string} entry.ipAddress - IP address
   * @param {string} entry.reason - Why change was made (optional)
   * @returns {Promise<Object>} Audit log entry
   */
  async log(entry) {
    if (!this.enabled) {
      return null;
    }

    const auditEntry = {
      id: ++this.logId,
      entity: entry.entity,
      action: entry.action,
      recordId: entry.recordId,
      changes: entry.changes || {},
      userId: entry.userId,
      userEmail: entry.userEmail,
      userRole: entry.userRole,
      ipAddress: entry.ipAddress,
      reason: entry.reason || null,
      timestamp: new Date(),
      changeCount: Object.keys(entry.changes || {}).length,
    };

    this.logs.push(auditEntry);

    // Persist to database if configured
    if (this.db) {
      try {
        await this.db.insertAuditLog(auditEntry);
      } catch (error) {
        logger.error(`[AuditLogger] Failed to persist audit log: ${error.message}`);
      }
    }

    logger.info(
      `[AuditLogger] ${entry.action} ${entry.entity}#${entry.recordId} by ${entry.userEmail}`
    );

    return auditEntry;
  }

  /**
   * Get audit logs for entity or record
   * @param {Object} filters - Filter options
   * @param {string} filters.entity - Entity slug
   * @param {number} filters.recordId - Record ID (optional)
   * @param {string} filters.userId - User ID (optional)
   * @param {string} filters.action - Action type (optional)
   * @param {Date} filters.startDate - Start date (optional)
   * @param {Date} filters.endDate - End date (optional)
   * @returns {Promise<Object[]>} Audit logs matching filters
   */
  async getAuditTrail(filters = {}) {
    let results = this.logs;

    // Filter by entity
    if (filters.entity) {
      results = results.filter(log => log.entity === filters.entity);
    }

    // Filter by record ID
    if (filters.recordId) {
      results = results.filter(log => log.recordId === filters.recordId);
    }

    // Filter by user
    if (filters.userId) {
      results = results.filter(log => log.userId === filters.userId);
    }

    // Filter by action
    if (filters.action) {
      results = results.filter(log => log.action === filters.action);
    }

    // Filter by date range
    if (filters.startDate) {
      results = results.filter(log => log.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      results = results.filter(log => log.timestamp <= filters.endDate);
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get change history for a record
   * @param {string} entity - Entity slug
   * @param {number} recordId - Record ID
   * @returns {Promise<Object[]>} Change history
   */
  async getRecordHistory(entity, recordId) {
    return this.getAuditTrail({ entity, recordId });
  }

  /**
   * Get user activity
   * @param {string} userId - User ID
   * @param {Object} options - Options { limit, startDate, endDate }
   * @returns {Promise<Object[]>} User activity logs
   */
  async getUserActivity(userId, options = {}) {
    const logs = await this.getAuditTrail({
      userId,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    return logs.slice(0, options.limit || 100);
  }

  /**
   * Detect suspicious activity
   * @returns {Object[]} Suspicious activities
   */
  detectSuspiciousActivity() {
    const suspicious = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Group by user and check for unusual patterns
    const userActions = {};

    for (const log of this.logs) {
      if (!userActions[log.userId]) {
        userActions[log.userId] = [];
      }
      userActions[log.userId].push(log);
    }

    // Check for unusual patterns
    for (const [userId, actions] of Object.entries(userActions)) {
      const recentActions = actions.filter(a => now - a.timestamp < oneHour);

      // Flag rapid-fire deletions
      const deletions = recentActions.filter(a => a.action === 'delete');
      if (deletions.length > 10) {
        suspicious.push({
          type: 'rapid-deletes',
          userId,
          count: deletions.length,
          severity: 'high',
        });
      }

      // Flag bulk updates to sensitive fields
      const bulkUpdates = recentActions.filter(a => a.action === 'update' && a.changeCount > 5);
      if (bulkUpdates.length > 5) {
        suspicious.push({
          type: 'bulk-updates',
          userId,
          count: bulkUpdates.length,
          severity: 'medium',
        });
      }

      // Flag access outside business hours (simplified)
      const offHoursActions = recentActions.filter(a => {
        const hour = a.timestamp.getHours();
        return hour < 6 || hour > 22;
      });

      if (offHoursActions.length > 5) {
        suspicious.push({
          type: 'off-hours-activity',
          userId,
          count: offHoursActions.length,
          severity: 'low',
        });
      }
    }

    return suspicious;
  }

  /**
   * Get statistics for compliance reporting
   * @returns {Object}
   */
  getStatistics() {
    const stats = {
      totalLogs: this.logs.length,
      byAction: { create: 0, update: 0, delete: 0 },
      byEntity: {},
      byUser: {},
      changesPerDay: {},
    };

    for (const log of this.logs) {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by entity
      stats.byEntity[log.entity] = (stats.byEntity[log.entity] || 0) + 1;

      // Count by user
      stats.byUser[log.userEmail] = (stats.byUser[log.userEmail] || 0) + 1;

      // Count by day
      const day = log.timestamp.toISOString().split('T')[0];
      stats.changesPerDay[day] = (stats.changesPerDay[day] || 0) + 1;
    }

    return stats;
  }

  /**
   * Export audit logs as JSON
   * @param {Object} filters - Filter options
   * @returns {Promise<string>} JSON export
   */
  async exportLogs(filters = {}) {
    const logs = await this.getAuditTrail(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export audit logs as CSV
   * @param {Object} filters - Filter options
   * @returns {Promise<string>} CSV export
   */
  async exportAsCSV(filters = {}) {
    const logs = await this.getAuditTrail(filters);

    if (logs.length === 0) {
      return 'No logs found';
    }

    // Header
    const headers = ['ID', 'Entity', 'Action', 'RecordID', 'UserEmail', 'UserRole', 'Timestamp', 'Changes'];
    const rows = [headers.join(',')];

    // Rows
    for (const log of logs) {
      const changes = JSON.stringify(log.changes).replace(/"/g, '""');
      rows.push(
        [
          log.id,
          log.entity,
          log.action,
          log.recordId,
          log.userEmail,
          log.userRole,
          log.timestamp.toISOString(),
          `"${changes}"`,
        ].join(',')
      );
    }

    return rows.join('\n');
  }

  /**
   * Clear old audit logs (cleanup)
   * @returns {number} Number of logs deleted
   */
  cleanup() {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const initialLength = this.logs.length;

    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);

    const deleted = initialLength - this.logs.length;
    logger.info(`[AuditLogger] Cleaned up ${deleted} old audit logs`);

    return deleted;
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    logger.info('[AuditLogger] All audit logs cleared');
  }
}

export default AuditLogger;
