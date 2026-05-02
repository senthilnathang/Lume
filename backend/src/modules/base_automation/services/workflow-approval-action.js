/**
 * Workflow Approval Action Service
 * Handles executing approval actions within workflow transitions
 * Bridges ApprovalRuntimeService and AutomationService
 */

export class WorkflowApprovalActionService {
  constructor(models, approvalRuntimeService) {
    this.models = models;
    this.approvalRuntimeService = approvalRuntimeService;
  }

  /**
   * Execute an approval action within a workflow transition
   * @param {Object} execution - The workflow execution instance
   * @param {Object} action - The approval action configuration
   * @param {string} action.type - Must be 'request_approval'
   * @param {number} action.chainId - ID of the approval chain to execute
   * @param {string} action.onApprove - Target state if approval succeeds
   * @param {string} action.onReject - Target state if approval is rejected
   * @param {string} userId - The user ID triggering the action
   * @returns {Promise<Object>} The created approval instance
   */
  async executeApprovalAction(execution, action, userId) {
    if (action.type !== 'request_approval') {
      throw new Error(`Unknown approval action type: ${action.type}`);
    }

    const { chainId, onApprove, onReject } = action;
    if (!chainId || !onApprove || !onReject) {
      throw new Error('Approval action requires chainId, onApprove, and onReject');
    }

    const approvalInstance = await this.approvalRuntimeService.submitForApproval(
      chainId,
      'workflow_execution',
      String(execution.id),
      userId,
      execution.id
    );

    return approvalInstance;
  }
}

export default WorkflowApprovalActionService;
