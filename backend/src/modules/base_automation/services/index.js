/**
 * Base Automation Services
 */

export class AutomationService {
  constructor(models) {
    this.models = models;
  }

  // ── Workflows ─────────────────────────────────────────────────

  async getWorkflows(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.Workflow.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getWorkflow(id) {
    return this.models.Workflow.findById(id);
  }

  async createWorkflow(data) {
    return this.models.Workflow.create(data);
  }

  async updateWorkflow(id, data) {
    const existing = await this.models.Workflow.findById(id);
    if (!existing) return null;
    return this.models.Workflow.update(id, data);
  }

  async deleteWorkflow(id) {
    const existing = await this.models.Workflow.findById(id);
    if (!existing) return null;
    await this.models.Workflow.destroy(id);
    return existing;
  }

  // ── Flows ─────────────────────────────────────────────────────

  async getFlows(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.Flow.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getFlow(id) {
    return this.models.Flow.findById(id);
  }

  async createFlow(data) {
    return this.models.Flow.create(data);
  }

  async updateFlow(id, data) {
    const existing = await this.models.Flow.findById(id);
    if (!existing) return null;
    return this.models.Flow.update(id, data);
  }

  async deleteFlow(id) {
    const existing = await this.models.Flow.findById(id);
    if (!existing) return null;
    await this.models.Flow.destroy(id);
    return existing;
  }

  // ── Business Rules ────────────────────────────────────────────

  async getBusinessRules(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.BusinessRule.findAll({
      where,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getBusinessRule(id) {
    return this.models.BusinessRule.findById(id);
  }

  async createBusinessRule(data) {
    return this.models.BusinessRule.create(data);
  }

  async updateBusinessRule(id, data) {
    const existing = await this.models.BusinessRule.findById(id);
    if (!existing) return null;
    return this.models.BusinessRule.update(id, data);
  }

  async deleteBusinessRule(id) {
    const existing = await this.models.BusinessRule.findById(id);
    if (!existing) return null;
    await this.models.BusinessRule.destroy(id);
    return existing;
  }

  // ── Approval Chains ───────────────────────────────────────────

  async getApprovalChains(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.ApprovalChain.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getApprovalChain(id) {
    return this.models.ApprovalChain.findById(id);
  }

  async createApprovalChain(data) {
    return this.models.ApprovalChain.create(data);
  }

  async updateApprovalChain(id, data) {
    const existing = await this.models.ApprovalChain.findById(id);
    if (!existing) return null;
    return this.models.ApprovalChain.update(id, data);
  }

  async deleteApprovalChain(id) {
    const existing = await this.models.ApprovalChain.findById(id);
    if (!existing) return null;
    await this.models.ApprovalChain.destroy(id);
    return existing;
  }

  // ── Scheduled Actions ─────────────────────────────────────────

  async getScheduledActions(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);

    const result = await this.models.ScheduledAction.findAll({
      where,
      order: [['nextRunAt', 'ASC']]
    });
    return result.rows;
  }

  async getScheduledAction(id) {
    return this.models.ScheduledAction.findById(id);
  }

  async createScheduledAction(data) {
    return this.models.ScheduledAction.create(data);
  }

  async updateScheduledAction(id, data) {
    const existing = await this.models.ScheduledAction.findById(id);
    if (!existing) return null;
    return this.models.ScheduledAction.update(id, data);
  }

  async deleteScheduledAction(id) {
    const existing = await this.models.ScheduledAction.findById(id);
    if (!existing) return null;
    await this.models.ScheduledAction.destroy(id);
    return existing;
  }

  // ── Validation Rules ──────────────────────────────────────────

  async getValidationRules(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.ValidationRule.findAll({
      where,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getValidationRule(id) {
    return this.models.ValidationRule.findById(id);
  }

  async createValidationRule(data) {
    return this.models.ValidationRule.create(data);
  }

  async updateValidationRule(id, data) {
    const existing = await this.models.ValidationRule.findById(id);
    if (!existing) return null;
    return this.models.ValidationRule.update(id, data);
  }

  async deleteValidationRule(id) {
    const existing = await this.models.ValidationRule.findById(id);
    if (!existing) return null;
    await this.models.ValidationRule.destroy(id);
    return existing;
  }

  // ── Assignment Rules ──────────────────────────────────────────

  async getAssignmentRules(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.AssignmentRule.findAll({
      where,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getAssignmentRule(id) {
    return this.models.AssignmentRule.findById(id);
  }

  async createAssignmentRule(data) {
    return this.models.AssignmentRule.create(data);
  }

  async updateAssignmentRule(id, data) {
    const existing = await this.models.AssignmentRule.findById(id);
    if (!existing) return null;
    return this.models.AssignmentRule.update(id, data);
  }

  async deleteAssignmentRule(id) {
    const existing = await this.models.AssignmentRule.findById(id);
    if (!existing) return null;
    await this.models.AssignmentRule.destroy(id);
    return existing;
  }

  // ── Rollup Fields ─────────────────────────────────────────────

  async getRollupFields(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.parentModel) where.push(['parentModel', '=', filters.parentModel]);

    const result = await this.models.RollupField.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getRollupField(id) {
    return this.models.RollupField.findById(id);
  }

  async createRollupField(data) {
    return this.models.RollupField.create(data);
  }

  async updateRollupField(id, data) {
    const existing = await this.models.RollupField.findById(id);
    if (!existing) return null;
    return this.models.RollupField.update(id, data);
  }

  async deleteRollupField(id) {
    const existing = await this.models.RollupField.findById(id);
    if (!existing) return null;
    await this.models.RollupField.destroy(id);
    return existing;
  }
}

export default { AutomationService };
