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
    result.rows.forEach(workflow => this._parseWorkflowJSON(workflow));
    return result.rows;
  }

  async getWorkflow(id) {
    const workflow = await this.models.Workflow.findById(id);
    if (workflow) {
      this._parseWorkflowJSON(workflow);
    }
    return workflow;
  }

  _parseWorkflowJSON(workflow) {
    if (workflow.states && typeof workflow.states === 'string') {
      workflow.states = JSON.parse(workflow.states);
    }
    if (workflow.transitions && typeof workflow.transitions === 'string') {
      workflow.transitions = JSON.parse(workflow.transitions);
    }
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

  // ── Workflow Execution ────────────────────────────────────────

  async startWorkflowExecution(workflowId, recordId, userId) {
    // Fetch the workflow to get initial state
    const workflow = await this.models.Workflow.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    this._parseWorkflowJSON(workflow);

    const initialState = workflow.states.find(s => s.is_start) || workflow.states[0];
    if (!initialState) throw new Error('Workflow has no states');

    // Create execution record
    const execution = await this.models.WorkflowExecution.create({
      workflowId,
      recordId,
      currentState: initialState.name,
      status: 'active',
      executionData: {
        initiatedBy: userId,
        initialState: initialState.name
      }
    });

    // Create history entry for start
    await this.models.WorkflowExecutionHistory.create({
      executionId: execution.id,
      fromState: null,
      toState: initialState.name,
      transitionName: 'START',
      userId
    });

    return execution;
  }

  async getWorkflowExecution(executionId) {
    return this.models.WorkflowExecution.findById(executionId);
  }

  async getExecutionHistory(executionId) {
    const result = await this.models.WorkflowExecutionHistory.findAll({
      where: [['executionId', '=', executionId]],
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async transitionWorkflowState(executionId, toState, transitionName, userId) {
    // Get execution
    const execution = await this.models.WorkflowExecution.findById(executionId);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'active') throw new Error('Execution is not active');

    const currentState = execution.currentState;

    // Record transition in history
    await this.models.WorkflowExecutionHistory.create({
      executionId,
      fromState: currentState,
      toState,
      transitionName,
      userId
    });

    // Parse executionData and update
    let executionDataObj = {};
    if (execution.executionData) {
      if (typeof execution.executionData === 'string') {
        try {
          executionDataObj = JSON.parse(execution.executionData);
        } catch (e) {
          console.warn('Could not parse executionData:', e);
        }
      } else {
        executionDataObj = execution.executionData;
      }
    }

    // Update execution state
    const updated = await this.models.WorkflowExecution.update(executionId, {
      currentState: toState,
      status: toState.endsWith('_end') ? 'completed' : 'active',
      executionData: {
        ...executionDataObj,
        lastTransition: { from: currentState, to: toState, at: new Date() }
      }
    });

    return updated;
  }

  // ── Auto-Transitions (Wave 4) ──────────────────────────────

  async scheduleAutoTransition(executionId, fromState, toState, triggerType, config = {}) {
    const { delaySeconds, webhookUrl, conditionData } = config;

    const scheduledFor = delaySeconds
      ? new Date(Date.now() + delaySeconds * 1000)
      : config.scheduledFor;

    return this.models.AutoTransition.create({
      executionId,
      workflowId: (await this.models.WorkflowExecution.findById(executionId))?.workflowId,
      fromState,
      toState,
      triggerType,
      delaySeconds,
      webhookUrl,
      conditionData,
      scheduledFor,
      status: 'pending'
    });
  }

  async getPendingAutoTransitions() {
    const now = new Date();
    const result = await this.models.AutoTransition.findAll({
      where: [['status', '=', 'pending']],
      limit: 1000,
      offset: 0
    });

    // Filter by scheduledFor in JavaScript
    return result.rows.filter(t => {
      if (!t.scheduledFor) return false;
      const scheduledTime = new Date(t.scheduledFor);
      return scheduledTime <= now;
    });
  }

  async executeAutoTransition(autoTransitionId) {
    const autoTransition = await this.models.AutoTransition.findById(autoTransitionId);
    if (!autoTransition) throw new Error('Auto-transition not found');
    if (autoTransition.status !== 'pending') throw new Error('Auto-transition is not pending');

    const execution = await this.models.WorkflowExecution.findById(autoTransition.executionId);
    if (!execution) throw new Error('Execution not found');

    // Verify the execution is still in the expected state
    if (execution.currentState !== autoTransition.fromState) {
      await this.models.AutoTransition.update(autoTransitionId, {
        status: 'cancelled'
      });
      throw new Error('Execution state has changed, auto-transition cancelled');
    }

    // Execute the transition
    const updated = await this.transitionWorkflowState(
      autoTransition.executionId,
      autoTransition.toState,
      `Auto: ${autoTransition.toState}`,
      null
    );

    // Mark auto-transition as executed
    await this.models.AutoTransition.update(autoTransitionId, {
      status: 'executed',
      executedAt: new Date()
    });

    return updated;
  }
}

export default { AutomationService };
