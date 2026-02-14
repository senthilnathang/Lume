/**
 * Base Automation Services
 */

export class AutomationService {
  constructor(models, sequelize) {
    this.models = models;
    this.sequelize = sequelize;
  }

  // ── Workflows ─────────────────────────────────────────────────

  async getWorkflows(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.Workflow.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getWorkflow(id) {
    return this.models.Workflow.findByPk(id);
  }

  async createWorkflow(data) {
    return this.models.Workflow.create(data);
  }

  async updateWorkflow(id, data) {
    const workflow = await this.models.Workflow.findByPk(id);
    if (!workflow) return null;
    await workflow.update(data);
    return workflow;
  }

  async deleteWorkflow(id) {
    const workflow = await this.models.Workflow.findByPk(id);
    if (workflow) await workflow.destroy();
    return workflow;
  }

  // ── Flows ─────────────────────────────────────────────────────

  async getFlows(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.Flow.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getFlow(id) {
    return this.models.Flow.findByPk(id);
  }

  async createFlow(data) {
    return this.models.Flow.create(data);
  }

  async updateFlow(id, data) {
    const flow = await this.models.Flow.findByPk(id);
    if (!flow) return null;
    await flow.update(data);
    return flow;
  }

  async deleteFlow(id) {
    const flow = await this.models.Flow.findByPk(id);
    if (flow) await flow.destroy();
    return flow;
  }

  // ── Business Rules ────────────────────────────────────────────

  async getBusinessRules(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.BusinessRule.findAll({
      where,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  async getBusinessRule(id) {
    return this.models.BusinessRule.findByPk(id);
  }

  async createBusinessRule(data) {
    return this.models.BusinessRule.create(data);
  }

  async updateBusinessRule(id, data) {
    const rule = await this.models.BusinessRule.findByPk(id);
    if (!rule) return null;
    await rule.update(data);
    return rule;
  }

  async deleteBusinessRule(id) {
    const rule = await this.models.BusinessRule.findByPk(id);
    if (rule) await rule.destroy();
    return rule;
  }

  // ── Approval Chains ───────────────────────────────────────────

  async getApprovalChains(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.ApprovalChain.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getApprovalChain(id) {
    return this.models.ApprovalChain.findByPk(id);
  }

  async createApprovalChain(data) {
    return this.models.ApprovalChain.create(data);
  }

  async updateApprovalChain(id, data) {
    const chain = await this.models.ApprovalChain.findByPk(id);
    if (!chain) return null;
    await chain.update(data);
    return chain;
  }

  async deleteApprovalChain(id) {
    const chain = await this.models.ApprovalChain.findByPk(id);
    if (chain) await chain.destroy();
    return chain;
  }

  // ── Scheduled Actions ─────────────────────────────────────────

  async getScheduledActions(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;

    return this.models.ScheduledAction.findAll({
      where,
      order: [['nextRunAt', 'ASC']]
    });
  }

  async getScheduledAction(id) {
    return this.models.ScheduledAction.findByPk(id);
  }

  async createScheduledAction(data) {
    return this.models.ScheduledAction.create(data);
  }

  async updateScheduledAction(id, data) {
    const action = await this.models.ScheduledAction.findByPk(id);
    if (!action) return null;
    await action.update(data);
    return action;
  }

  async deleteScheduledAction(id) {
    const action = await this.models.ScheduledAction.findByPk(id);
    if (action) await action.destroy();
    return action;
  }

  // ── Validation Rules ──────────────────────────────────────────

  async getValidationRules(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.ValidationRule.findAll({
      where,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  async getValidationRule(id) {
    return this.models.ValidationRule.findByPk(id);
  }

  async createValidationRule(data) {
    return this.models.ValidationRule.create(data);
  }

  async updateValidationRule(id, data) {
    const rule = await this.models.ValidationRule.findByPk(id);
    if (!rule) return null;
    await rule.update(data);
    return rule;
  }

  async deleteValidationRule(id) {
    const rule = await this.models.ValidationRule.findByPk(id);
    if (rule) await rule.destroy();
    return rule;
  }

  // ── Assignment Rules ──────────────────────────────────────────

  async getAssignmentRules(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.AssignmentRule.findAll({
      where,
      order: [['priority', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  async getAssignmentRule(id) {
    return this.models.AssignmentRule.findByPk(id);
  }

  async createAssignmentRule(data) {
    return this.models.AssignmentRule.create(data);
  }

  async updateAssignmentRule(id, data) {
    const rule = await this.models.AssignmentRule.findByPk(id);
    if (!rule) return null;
    await rule.update(data);
    return rule;
  }

  async deleteAssignmentRule(id) {
    const rule = await this.models.AssignmentRule.findByPk(id);
    if (rule) await rule.destroy();
    return rule;
  }

  // ── Rollup Fields ─────────────────────────────────────────────

  async getRollupFields(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.parentModel) where.parentModel = filters.parentModel;

    return this.models.RollupField.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getRollupField(id) {
    return this.models.RollupField.findByPk(id);
  }

  async createRollupField(data) {
    return this.models.RollupField.create(data);
  }

  async updateRollupField(id, data) {
    const field = await this.models.RollupField.findByPk(id);
    if (!field) return null;
    await field.update(data);
    return field;
  }

  async deleteRollupField(id) {
    const field = await this.models.RollupField.findByPk(id);
    if (field) await field.destroy();
    return field;
  }
}

export default { AutomationService };
