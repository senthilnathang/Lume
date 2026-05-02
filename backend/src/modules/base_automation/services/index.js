/**
 * Base Automation Services
 */

import { RuleEngineService } from '../../../core/services/rule-engine.service.js';
import { WorkflowApprovalActionService } from './workflow-approval-action.js';

export class AutomationService {
  constructor(models, webhookService = null, workflowNotificationService = null, approvalRuntimeService = null) {
    this.models = models;
    this.webhookService = webhookService;
    this.workflowNotificationService = workflowNotificationService;
    this.approvalRuntimeService = approvalRuntimeService;
    this.workflowApprovalActionService = new WorkflowApprovalActionService(approvalRuntimeService);
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

  async startWorkflowExecution(workflowId, recordId, userId, recordData = {}) {
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
        initialState: initialState.name,
        record: recordData
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

  /**
   * Transition workflow execution to a new state
   * Optionally triggers approval actions that defer state change
   *
   * @param {number} executionId - ID of the workflow execution
   * @param {string} toState - Target state name
   * @param {string} transitionName - Human-readable transition name
   * @param {string} userId - User performing the transition
   * @param {boolean} [hasApprovalAction=false] - Whether to check for approval actions
   * @returns {Promise<Object>} Updated execution record
   * @throws {Error} If execution not found or not active
   */
  async transitionWorkflowState(executionId, toState, transitionName, userId, hasApprovalAction = false) {
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

    // Lookup workflow to get state definitions
    const workflow = await this.models.Workflow.findById(execution.workflowId);
    if (!workflow) throw new Error('Workflow not found');
    this._parseWorkflowJSON(workflow);
    const stateDef = (workflow?.states || []).find(s => s.name === toState);
    const isEndState = stateDef?.is_end === true;

    // Check if this transition has approval actions
    let approvalAction = null;
    if (hasApprovalAction) {
      const transition = (workflow?.transitions || []).find(
        t => t.from === currentState && t.to === toState
      );
      approvalAction = transition?.actions?.find(a => a.type === 'request_approval');
    }

    // If approval action exists, execute it and defer state change
    if (approvalAction) {
      await this.workflowApprovalActionService.executeApprovalAction(
        execution,
        approvalAction,
        userId
      );

      const updated = await this.models.WorkflowExecution.update(executionId, {
        status: 'awaiting_approval',
        executionData: {  // DrizzleAdapter auto-stringifies JSON fields on persist
          ...executionDataObj,
          pendingApprovalAction: approvalAction,
          pendingApprovalState: toState,
          lastTransition: { from: currentState, to: toState, at: new Date(), deferred: true }
        }
      });

      return updated;
    }

    // Normal state transition (no approval)
    const updated = await this.models.WorkflowExecution.update(executionId, {
      currentState: toState,
      status: isEndState ? 'completed' : 'active',
      executionData: {
        ...executionDataObj,
        lastTransition: { from: currentState, to: toState, at: new Date() }
      }
    });

    // Fire workflow webhooks (non-blocking)
    this.webhookService?.triggerWebhooks('workflow.state_changed', 'workflow', {
      executionId,
      workflowId: execution.workflowId,
      fromState: currentState,
      toState
    }).catch(() => {});

    // Send workflow notifications (non-blocking)
    this.workflowNotificationService?.notifyStateChange(
      executionId,
      execution.workflowId,
      currentState,
      toState,
      {
        recordId: execution.recordId,
        workflowName: workflow?.name,
        submitter: executionDataObj.initiatedBy ? { id: executionDataObj.initiatedBy } : null
      }
    ).catch(() => {});

    return updated;
  }

  // ── Auto-Transitions (Wave 4) ──────────────────────────────

  async scheduleAutoTransition(executionId, fromState, toState, triggerType, config = {}) {
    const { delaySeconds, webhookUrl, conditionData, businessHoursOnly, timezone } = config;

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
      status: 'pending',
      businessHoursOnly: businessHoursOnly || false,
      timezone: timezone || 'UTC'
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

    // Evaluate condition if present
    if (autoTransition.conditionData) {
      const condition = typeof autoTransition.conditionData === 'string'
        ? JSON.parse(autoTransition.conditionData) : autoTransition.conditionData;
      let execData = {};
      if (execution.executionData) {
        execData = typeof execution.executionData === 'string'
          ? JSON.parse(execution.executionData) : execution.executionData;
      }
      const record = execData.record || {};
      const ruleEngine = new RuleEngineService(null);
      const conditionMet = ruleEngine._evaluateCondition(condition, record, {});
      if (!conditionMet) {
        throw new Error('Condition not met — transition deferred');
      }
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

  // ── Workflow Webhooks (Wave 2) ────────────────────────────────

  async getWorkflowWebhooks(workflowId) {
    const result = await this.models.WorkflowWebhook.findAll({
      where: [['workflowId', '=', workflowId]],
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async createWorkflowWebhook(data) {
    return this.models.WorkflowWebhook.create(data);
  }

  async deleteWorkflowWebhook(id) {
    const existing = await this.models.WorkflowWebhook.findById(id);
    if (!existing) return null;
    await this.models.WorkflowWebhook.destroy(id);
    return existing;
  }

  async triggerWorkflowWebhook(workflowId, event, payload) {
    const webhooks = await this.getWorkflowWebhooks(workflowId);
    const activeHooks = webhooks.filter(w => w.status === 'active');

    for (const webhook of activeHooks) {
      if (!webhook.events || !webhook.events.includes(event)) continue;

      try {
        const headers = webhook.headers || {};
        headers['Content-Type'] = 'application/json';

        await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            ...payload
          })
        });
      } catch (err) {
        console.error(`Failed to trigger webhook ${webhook.id}:`, err.message);
      }
    }
  }

  // ── Workflow Notification Settings (Wave 3) ───────────────────

  async getNotificationSettings(workflowId) {
    const result = await this.models.WorkflowNotificationSetting.findAll({
      where: [['workflowId', '=', workflowId]],
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async createNotificationSetting(data) {
    return this.models.WorkflowNotificationSetting.create(data);
  }

  async updateNotificationSetting(id, data) {
    const existing = await this.models.WorkflowNotificationSetting.findById(id);
    if (!existing) return null;
    return this.models.WorkflowNotificationSetting.update(id, data);
  }

  async deleteNotificationSetting(id) {
    const existing = await this.models.WorkflowNotificationSetting.findById(id);
    if (!existing) return null;
    await this.models.WorkflowNotificationSetting.destroy(id);
    return existing;
  }

  // ── Approval Callbacks (Wave 1) ─────────────────────────────────

  /**
   * Handle approval callback to advance workflow state
   * Called when an approval task is approved/rejected
   *
   * @param {number} approvalInstanceId - ID of the ApprovalInstance
   * @param {string} decision - 'approved' or 'rejected'
   * @param {string} userId - User who made the decision
   * @returns {Promise<Object>} Updated execution record
   * @throws {Error} If decision is invalid or execution not found
   */
  async handleApprovalCallback(approvalInstanceId, decision, userId) {
    if (!['approved', 'rejected'].includes(decision)) {
      throw new Error('Decision must be "approved" or "rejected"');
    }

    // Get approval instance
    const approvalInstance = await this.models.ApprovalInstance.findById(approvalInstanceId);
    if (!approvalInstance) throw new Error('Approval instance not found');

    // Parse metadata to get execution ID
    let meta = {};
    if (approvalInstance.metadata) {
      meta = typeof approvalInstance.metadata === 'string'
        ? JSON.parse(approvalInstance.metadata) : approvalInstance.metadata;
    }

    if (meta.entityType !== 'workflow_execution') {
      throw new Error('Approval instance is not for a workflow execution');
    }

    const executionId = parseInt(meta.entityRef, 10);
    const execution = await this.models.WorkflowExecution.findById(executionId);
    if (!execution) throw new Error('Workflow execution not found');

    // Get execution data to find pending approval action
    let executionDataObj = {};
    if (execution.executionData) {
      executionDataObj = typeof execution.executionData === 'string'
        ? JSON.parse(execution.executionData) : execution.executionData;
    }

    const approvalAction = executionDataObj.pendingApprovalAction;
    if (!approvalAction) throw new Error('No pending approval action found');

    // Determine next state based on decision
    const nextState = decision === 'approved' ? approvalAction.onApprove : approvalAction.onReject;

    // Store approval decision in execution data
    executionDataObj.lastApprovalDecision = {
      decision,
      instanceId: approvalInstanceId,
      decidedBy: userId,
      decidedAt: new Date(),
      decidedFor: executionDataObj.pendingApprovalState
    };
    delete executionDataObj.pendingApprovalAction;
    delete executionDataObj.pendingApprovalState;

    // Transition to next state (without approval action this time)
    const updated = await this.models.WorkflowExecution.update(executionId, {
      currentState: nextState,
      status: 'active',
      executionData: executionDataObj
    });

    // Record transition in history
    await this.models.WorkflowExecutionHistory.create({
      executionId,
      fromState: execution.currentState,
      toState: nextState,
      transitionName: `approval_${decision}`,
      userId
    });

    // Fire webhooks and notifications
    const workflow = await this.models.Workflow.findById(execution.workflowId);
    this.webhookService?.triggerWebhooks('workflow.state_changed', 'workflow', {
      executionId,
      workflowId: execution.workflowId,
      fromState: execution.currentState,
      toState: nextState,
      approvalDecision: decision
    }).catch(() => {});

    this.workflowNotificationService?.notifyStateChange(
      executionId,
      execution.workflowId,
      execution.currentState,
      nextState,
      {
        recordId: execution.recordId,
        workflowName: workflow?.name,
        submitter: executionDataObj.initiatedBy ? { id: executionDataObj.initiatedBy } : null,
        approvalDecision: decision
      }
    ).catch(() => {});

    return updated;
  }
}

export { WorkflowApprovalActionService };

export default { AutomationService };
