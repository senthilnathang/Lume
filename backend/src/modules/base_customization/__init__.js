/**
 * Base Customization Module Initialization
 */

import {
  CustomFieldModel,
  CustomViewModel,
  FormLayoutModel,
  ListConfigModel,
  DashboardWidgetModel
} from './models/index.js';
import { CustomizationService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBaseCustomization = async (context) => {
  const { sequelize, app } = context;

  console.log('🔧 Initializing Base Customization Module...');

  const models = {
    CustomField: CustomFieldModel(sequelize),
    CustomView: CustomViewModel(sequelize),
    FormLayout: FormLayoutModel(sequelize),
    ListConfig: ListConfigModel(sequelize),
    DashboardWidget: DashboardWidgetModel(sequelize)
  };
  console.log(`✅ Base Customization models created: ${Object.keys(models).join(', ')}`);

  const services = {
    customizationService: new CustomizationService(models, sequelize)
  };
  console.log('✅ Base Customization services created');

  const routes = createRoutes(models, services);
  app.use('/api/base_customization', routes);
  console.log('✅ Base Customization API routes registered: /api/base_customization');

  console.log('✅ Base Customization Module initialized');

  return { models, services };
};

export default initializeBaseCustomization;
