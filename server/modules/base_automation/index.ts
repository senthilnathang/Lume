import type { ModuleDefinition } from '../_types';
import { manifest } from './__manifest__';

// Models
import {
  WorkflowDefinition,
  WorkflowTransition,
  WorkflowState,
  WorkflowActivity,
} from './models/workflow.model';
import { Flow, FlowVersion, FlowExecution } from './models/flow.model';
import { BusinessRule, RuleExecutionLog } from './models/business-rule.model';
import { EmailTemplate, EmailQueue } from './models/email-template.model';
import { WebhookDefinition, WebhookLog } from './models/webhook.model';
import { ValidationRule, FieldValidation } from './models/validation-rule.model';
import { AssignmentRule, RoundRobinState } from './models/assignment-rule.model';
import { RollupField, RollupComputeLog } from './models/rollup.model';

export {
  WorkflowDefinition,
  WorkflowTransition,
  WorkflowState,
  WorkflowActivity,
  Flow,
  FlowVersion,
  FlowExecution,
  BusinessRule,
  RuleExecutionLog,
  EmailTemplate,
  EmailQueue,
  WebhookDefinition,
  WebhookLog,
  ValidationRule,
  FieldValidation,
  AssignmentRule,
  RoundRobinState,
  RollupField,
  RollupComputeLog,
};

const baseAutomationModule: ModuleDefinition = {
  manifest,
  initModels(sequelize) {
    WorkflowDefinition.initModel(sequelize);
    WorkflowTransition.initModel(sequelize);
    WorkflowState.initModel(sequelize);
    WorkflowActivity.initModel(sequelize);
    Flow.initModel(sequelize);
    FlowVersion.initModel(sequelize);
    FlowExecution.initModel(sequelize);
    BusinessRule.initModel(sequelize);
    RuleExecutionLog.initModel(sequelize);
    EmailTemplate.initModel(sequelize);
    EmailQueue.initModel(sequelize);
    WebhookDefinition.initModel(sequelize);
    WebhookLog.initModel(sequelize);
    ValidationRule.initModel(sequelize);
    FieldValidation.initModel(sequelize);
    AssignmentRule.initModel(sequelize);
    RoundRobinState.initModel(sequelize);
    RollupField.initModel(sequelize);
    RollupComputeLog.initModel(sequelize);
  },
};

export default baseAutomationModule;
