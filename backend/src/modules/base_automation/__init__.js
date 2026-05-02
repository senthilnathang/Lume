/**
 * Base Automation Module Initialization
 */

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
  automationAutoTransitions,
  automationWorkflowWebhooks,
  automationApprovalInstances,
  automationApprovalTasks,
  automationWorkflowNotificationSettings,
  automationWorkflowApprovalLinks,
  automationApprovalEscalations,
  automationApprovalEscalationChains
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { AutomationService } from './services/index.js';
import { AutoTransitionProcessor } from './services/auto-transition-processor.js';
import { ApprovalRuntimeService } from './services/approval-runtime.js';
import { WorkflowNotificationService } from './services/workflow-notifications.js';
import { ApprovalEscalationService } from './services/approval-escalation.js';
import { EscalationChainHandler } from './services/escalation-chain-handler.js';
import { EscalationProcessor } from './jobs/escalation-processor.js';
import { SchedulerService } from '../../core/services/scheduler.service.js';
import { RuleEngineService } from '../../core/services/rule-engine.service.js';
import createRoutes from './api/index.js';
import serviceRegistry from '../../core/services/service-registry.js';
import prisma from '../../core/db/prisma.js';

const initializeBaseAutomation = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Base Automation Module...');

  const adapters = {
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
    WorkflowWebhook: new DrizzleAdapter(automationWorkflowWebhooks),
    ApprovalInstance: new DrizzleAdapter(automationApprovalInstances),
    ApprovalTask: new DrizzleAdapter(automationApprovalTasks),
    WorkflowNotificationSetting: new DrizzleAdapter(automationWorkflowNotificationSettings),
    WorkflowApprovalLink: new DrizzleAdapter(automationWorkflowApprovalLinks),
    ApprovalEscalation: new DrizzleAdapter(automationApprovalEscalations),
    ApprovalEscalationChain: new DrizzleAdapter(automationApprovalEscalationChains)
  };
  console.log(`✅ Base Automation adapters created: ${Object.keys(adapters).join(', ')}`);

  const webhookService = serviceRegistry.get('webhookService');
  const schedulerService = new SchedulerService(adapters.ScheduledAction);
  const ruleEngineService = new RuleEngineService(adapters.BusinessRule);
  const workflowNotificationService = new WorkflowNotificationService(adapters);
  const approvalRuntimeService = new ApprovalRuntimeService(adapters, prisma);
  const approvalEscalationService = new ApprovalEscalationService(adapters, workflowNotificationService);
  const escalationChainHandler = new EscalationChainHandler(adapters);
  const automationService = new AutomationService(adapters, webhookService, workflowNotificationService, approvalRuntimeService);
  const autoTransitionProcessor = new AutoTransitionProcessor(automationService);
  const escalationProcessor = new EscalationProcessor(approvalEscalationService);

  const services = {
    automationService,
    schedulerService,
    ruleEngineService,
    autoTransitionProcessor,
    approvalRuntimeService,
    workflowNotificationService,
    approvalEscalationService,
    escalationChainHandler,
    escalationProcessor
  };
  console.log('✅ Base Automation services created (scheduler + rule engine + auto-transition processor + approval runtime + notifications + escalation chain handler + escalation processor)');

  // Register services globally for cross-module access (BaseService hooks)
  serviceRegistry.register('schedulerService', schedulerService);
  serviceRegistry.register('ruleEngineService', ruleEngineService);
  serviceRegistry.register('approvalEscalationService', approvalEscalationService);
  serviceRegistry.register('escalationChainHandler', escalationChainHandler);

  const routes = createRoutes(adapters, services);
  app.use('/api/base_automation', routes);
  console.log('✅ Base Automation API routes registered: /api/base_automation');

  // Initialize the scheduler (start cron jobs for active scheduled actions)
  try {
    await schedulerService.initialize();
  } catch (err) {
    console.warn('⚠️ Scheduler initialization warning:', err.message);
  }

  // Start auto-transition processor (Wave 4)
  try {
    const processorInterval = process.env.NODE_ENV === 'test' ? 2 : 30; // 2s in tests, 30s in production
    autoTransitionProcessor.startProcessor(processorInterval);
    console.log('✅ Auto-transition processor started');
  } catch (err) {
    console.warn('⚠️ Auto-transition processor warning:', err.message);
  }

  // Start escalation processor (Task 3 - runs every 5 minutes)
  try {
    const escalationInterval = process.env.NODE_ENV === 'test' ? 2 : 300; // 2s in tests, 5 minutes (300s) in production
    escalationProcessor.startProcessor(escalationInterval);
    console.log('✅ Escalation processor started (every 5 minutes)');
  } catch (err) {
    console.warn('⚠️ Escalation processor warning:', err.message);
  }

  console.log('✅ Base Automation Module initialized');

  return { models: adapters, services };
};

export default initializeBaseAutomation;
