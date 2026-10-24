/**
 * Base Customization Module Initialization
 */

import {
  customFields,
  customViews,
  formLayouts,
  listConfigs,
  dashboardWidgets
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { CustomizationService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBaseCustomization = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Base Customization Module...');

  const adapters = {
    CustomField: new DrizzleAdapter(customFields),
    CustomView: new DrizzleAdapter(customViews),
    FormLayout: new DrizzleAdapter(formLayouts),
    ListConfig: new DrizzleAdapter(listConfigs),
    DashboardWidget: new DrizzleAdapter(dashboardWidgets)
  };
  console.log(`✅ Base Customization adapters created: ${Object.keys(adapters).join(', ')}`);

  const services = {
    customizationService: new CustomizationService(adapters)
  };
  console.log('✅ Base Customization services created');

  const routes = createRoutes(adapters, services);
  app.use('/api/base_customization', routes);
  console.log('✅ Base Customization API routes registered: /api/base_customization');

  console.log('✅ Base Customization Module initialized');

  return { models: adapters, services };
};

export default initializeBaseCustomization;
