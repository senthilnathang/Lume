/**
 * Base Automation Module Initialization
 */

import {
  WorkflowModel,
  FlowModel,
  BusinessRuleModel,
  ApprovalChainModel,
  ScheduledActionModel,
  ValidationRuleModel,
  AssignmentRuleModel,
  RollupFieldModel
} from './models/index.js';
import { AutomationService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBaseAutomation = async (context) => {
  const { sequelize, app } = context;

  console.log('🔧 Initializing Base Automation Module...');

  const models = {
    Workflow: WorkflowModel(sequelize),
    Flow: FlowModel(sequelize),
    BusinessRule: BusinessRuleModel(sequelize),
    ApprovalChain: ApprovalChainModel(sequelize),
    ScheduledAction: ScheduledActionModel(sequelize),
    ValidationRule: ValidationRuleModel(sequelize),
    AssignmentRule: AssignmentRuleModel(sequelize),
    RollupField: RollupFieldModel(sequelize)
  };
  console.log(`✅ Base Automation models created: ${Object.keys(models).join(', ')}`);

  const services = {
    automationService: new AutomationService(models, sequelize)
  };
  console.log('✅ Base Automation services created');

  const routes = createRoutes(models, services);
  app.use('/api/base_automation', routes);
  console.log('✅ Base Automation API routes registered: /api/base_automation');

  console.log('✅ Base Automation Module initialized');

  return { models, services };
};

export default initializeBaseAutomation;
