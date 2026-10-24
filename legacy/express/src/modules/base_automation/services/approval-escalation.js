/**
 * Approval Escalation Service
 * Processes overdue approval tasks and creates escalation records
 * Handles SLA enforcement and escalation assignment
 */

export class ApprovalEscalationService {
  constructor(models, notificationService = null) {
    this.models = models;
    this.notificationService = notificationService;
  }

  /**
   * Process overdue approval tasks and create escalations
   * Checks all pending tasks against their SLA hours from the approval chain config
   * @returns {Promise<Array>} Array of created escalation records
   */
  async processOverdueTasks() {
    const now = new Date();

    // Get all pending approval tasks
    const result = await this.models.ApprovalTask.findAll({
      where: [['status', '=', 'pending']],
      limit: 1000
    });

    const tasks = result.rows || [];
    const escalations = [];

    for (const task of tasks) {
      // Check if task is overdue
      if (!task.dueAt || new Date(task.dueAt) > now) {
        continue;
      }

      // Get instance and chain to find escalation config
      const instance = await this.models.ApprovalInstance.findById(task.instanceId);
      if (!instance) continue;

      const chain = await this.models.ApprovalChain.findById(instance.chainId);
      if (!chain || !chain.escalationConfig) continue;

      // Parse escalation config (could be JSON string or object)
      let config;
      try {
        config = typeof chain.escalationConfig === 'string'
          ? JSON.parse(chain.escalationConfig) : chain.escalationConfig;
      } catch (e) {
        console.warn(`Failed to parse escalation config for chain ${instance.chainId}:`, e.message);
        continue;
      }

      // Calculate hours overdue
      const hoursOverdue = Math.floor((now - new Date(task.dueAt)) / 3600000);

      // Check if already escalated for this task
      const existing = await this.models.ApprovalEscalation.findAll({
        where: [
          ['taskId', '=', task.id],
          ['reason', '=', 'sla_breach']
        ]
      });

      if (existing.rows && existing.rows.length > 0) {
        continue; // Already escalated
      }

      // Create escalation record
      const escalation = await this.models.ApprovalEscalation.create({
        taskId: task.id,
        instanceId: task.instanceId,
        escalatedFrom: task.assignedTo || task.assignedToUserId,
        escalatedTo: config.escalateToRole || 'manager',
        reason: 'sla_breach',
        hoursOverdue,
        notificationSent: false
      });

      escalations.push(escalation);

      // Trigger notifications if configured (non-blocking)
      if (config.notifyOnEscalation && this.notificationService) {
        this.notificationService.notifyEscalation(escalation).catch((err) => {
          console.warn('Notification failed for escalation:', err.message);
        });
      }
    }

    return escalations;
  }

  /**
   * Retrieve escalation history with optional filtering
   * @param {Object} filters - Filter criteria (instanceId, taskId)
   * @returns {Promise<Array>} Array of escalation records
   */
  async getEscalationHistory(filters = {}) {
    const where = [];

    if (filters.instanceId) {
      where.push(['instanceId', '=', filters.instanceId]);
    }

    if (filters.taskId) {
      where.push(['taskId', '=', filters.taskId]);
    }

    const result = await this.models.ApprovalEscalation.findAll({
      where,
      order: [['escalatedAt', 'DESC']]
    });

    return result.rows || [];
  }
}
