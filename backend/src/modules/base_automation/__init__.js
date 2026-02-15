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

  const services = {
    automationService: new AutomationService(adapters)
  };
  console.log('✅ Base Automation services created');

  const routes = createRoutes(adapters, services);
  app.use('/api/base_automation', routes);
  console.log('✅ Base Automation API routes registered: /api/base_automation');

  console.log('✅ Base Automation Module initialized');

  return { models: adapters, services };
};

export default initializeBaseAutomation;
