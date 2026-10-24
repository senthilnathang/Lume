/**
 * Approval Analytics Service
 * Tracks approval metrics: average approval time, SLA compliance rate, bottleneck tasks
 */

export class ApprovalAnalyticsService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Get overall approval metrics (total approvals, average time, SLA breach rate)
   * @param {Object} filters - Optional filters for approval tasks
   * @returns {Promise<Object>} Metrics object with totalApprovals, avgTime, slaBreachers, breachRate
   */
  async getApprovalMetrics(_filters = {}) {
    const result = await this.models.ApprovalTask.findAll({
      where: []  // Get all, then filter completed
    });
    const tasks = (result && result.rows) ? result.rows.filter(t => t.status === 'approved' || t.status === 'rejected') : [];
    if (tasks.length === 0) {
      return { totalApprovals: 0, avgTime: 0, slaBreachers: 0, breachRate: 0 };
    }

    let totalTime = 0;
    let slaBreachers = 0;

    tasks.forEach(task => {
      if (task.decidedAt && task.createdAt) {
        totalTime += (new Date(task.decidedAt) - new Date(task.createdAt)) / (1000 * 60 * 60); // hours
      }
      if (task.decidedAt && task.dueAt && new Date(task.decidedAt) > new Date(task.dueAt)) {
        slaBreachers++;
      }
    });

    return {
      totalApprovals: tasks.length,
      avgTime: Math.round(totalTime / tasks.length),
      slaBreachers,
      breachRate: slaBreachers / tasks.length
    };
  }

  /**
   * Get bottleneck tasks (longest pending approval tasks)
   * @param {number} limit - Maximum number of bottleneck tasks to return
   * @returns {Promise<Array>} Array of pending tasks sorted by pending duration (longest first)
   */
  async getBottlenecks(limit = 10) {
    const result = await this.models.ApprovalTask.findAll({
      where: [['status', '=', 'pending']]
    });

    const tasks = (result && result.rows) ? result.rows : [];
    const now = new Date();

    const withPendingTime = tasks.map(task => ({
      ...task,
      pendingFor: Math.round((now - new Date(task.createdAt)) / (1000 * 60 * 60)) // hours
    }));

    return withPendingTime
      .sort((a, b) => b.pendingFor - a.pendingFor)
      .slice(0, limit);
  }

  /**
   * Get escalation metrics by level and reason
   * @returns {Promise<Object>} Metrics with total escalations, breakdown by level and reason
   */
  async getEscalationMetrics() {
    const result = await this.models.ApprovalEscalation.findAll({});

    const escalations = (result && result.rows) ? result.rows : [];
    if (escalations.length === 0) {
      return { totalEscalations: 0, byLevel: {}, byReason: {} };
    }

    const byLevel = {};
    const byReason = {};

    escalations.forEach(esc => {
      byLevel[esc.level] = (byLevel[esc.level] || 0) + 1;
      byReason[esc.reason] = (byReason[esc.reason] || 0) + 1;
    });

    return {
      totalEscalations: escalations.length,
      byLevel,
      byReason
    };
  }

  /**
   * Get average approval time for a specific role
   * @param {string} role - Role name to filter by
   * @returns {Promise<Object>} Metrics with role, avgTimeHours, and totalApprovals
   */
  async getApprovalTimeByRole(role) {
    const result = await this.models.ApprovalTask.findAll({
      where: [['assignedToRole', '=', role]]
    });
    const tasks = (result && result.rows) ? result.rows.filter(t => t.status === 'approved' || t.status === 'rejected') : [];
    if (tasks.length === 0) {
      return { role, avgTimeHours: 0, totalApprovals: 0 };
    }

    let totalTime = 0;
    tasks.forEach(task => {
      if (task.decidedAt && task.createdAt) {
        totalTime += (new Date(task.decidedAt) - new Date(task.createdAt)) / (1000 * 60 * 60);
      }
    });

    return {
      role,
      avgTimeHours: Math.round(totalTime / tasks.length * 10) / 10,
      totalApprovals: tasks.length
    };
  }
}
