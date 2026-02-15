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
  automationRollupFields
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { AutomationService } from './services/index.js';
import { SchedulerService } from '../../core/services/scheduler.service.js';
import { RuleEngineService } from '../../core/services/rule-engine.service.js';
import createRoutes from './api/index.js';

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
    RollupField: new DrizzleAdapter(automationRollupFields)
  };
  console.log(`✅ Base Automation adapters created: ${Object.keys(adapters).join(', ')}`);

  const schedulerService = new SchedulerService(adapters.ScheduledAction);
  const ruleEngineService = new RuleEngineService(adapters.BusinessRule);

  const services = {
    automationService: new AutomationService(adapters),
    schedulerService,
    ruleEngineService
  };
  console.log('✅ Base Automation services created (including scheduler + rule engine)');

  const routes = createRoutes(adapters, services);
  app.use('/api/base_automation', routes);
  console.log('✅ Base Automation API routes registered: /api/base_automation');

  // Initialize the scheduler (start cron jobs for active scheduled actions)
  try {
    await schedulerService.initialize();
  } catch (err) {
    console.warn('⚠️ Scheduler initialization warning:', err.message);
  }

  console.log('✅ Base Automation Module initialized');

  return { models: adapters, services };
};

export default initializeBaseAutomation;
