/**
 * Workflow Approval Action Service
 * Handles executing approval actions within workflow transitions
 * Bridges ApprovalRuntimeService and AutomationService
 */

export class WorkflowApprovalActionService {
  constructor(approvalRuntimeService, models) {
    this.approvalRuntimeService = approvalRuntimeService;
    this.models = models;
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
    if (!execution || !execution.id) {
      throw new Error('Workflow execution must have a valid ID');
    }

    if (action.type !== 'request_approval') {
      throw new Error(`Unsupported approval action type: "${action.type}". Expected "request_approval".`);
    }

    const { chainId, onApprove, onReject } = action;
    if (!chainId || !onApprove || !onReject) {
      throw new Error('Approval action requires chainId, onApprove, and onReject');
    }
    // onApprove/onReject are validated here and will be used in approval callback handling
    // (see Task 3: handleApprovalCallback in AutomationService)

    const approvalInstance = await this.approvalRuntimeService.submitForApproval(
      chainId,
      'workflow_execution',
      String(execution.id),
      userId,
      execution.id
    );

    // Create approval link for tracking
    if (this.models?.WorkflowApprovalLink) {
      try {
        await this.models.WorkflowApprovalLink.create({
          executionId: execution.id,
          approvalInstanceId: approvalInstance.id,
          actionType: action.type,
          onApproveState: action.onApprove,
          onRejectState: action.onReject,
          status: 'pending'
        });
      } catch (e) {
        console.warn('Failed to create workflow approval link:', e.message);
        // Don't fail the approval if link creation fails
      }
    }

    return approvalInstance;
  }
}

export default WorkflowApprovalActionService;
