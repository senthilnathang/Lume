/**
 * Base Automation Models
 * Drizzle ORM adapters for all automation entities
 */

import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import {
  automationWorkflows,
  automationFlows,
  automationBusinessRules,
  automationApprovalChains,
  automationScheduledActions,
  automationValidationRules,
  automationAssignmentRules,
  automationRollupFields,
  automationWorkflowExecutions,
  automationWorkflowExecutionHistory,
  automationAutoTransitions
} from './schema.js';

export function createAutomationModels() {
  return {
    Workflow: new DrizzleAdapter(automationWorkflows),
    Flow: new DrizzleAdapter(automationFlows),
    BusinessRule: new DrizzleAdapter(automationBusinessRules),
    ApprovalChain: new DrizzleAdapter(automationApprovalChains),
    ScheduledAction: new DrizzleAdapter(automationScheduledActions),
    ValidationRule: new DrizzleAdapter(automationValidationRules),
    AssignmentRule: new DrizzleAdapter(automationAssignmentRules),
    RollupField: new DrizzleAdapter(automationRollupFields),
    WorkflowExecution: new DrizzleAdapter(automationWorkflowExecutions),
    WorkflowExecutionHistory: new DrizzleAdapter(automationWorkflowExecutionHistory),
    AutoTransition: new DrizzleAdapter(automationAutoTransitions),
  };
}

export default createAutomationModels;
