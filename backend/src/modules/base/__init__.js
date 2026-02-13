/**
 * Base Module Initialization
 */

import { createModels } from './models/index.js';
import { createServices } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBase = async (context) => {
  const { sequelize, app } = context;
  
  console.log('🔧 Initializing Base Module...');
  
  // Create models
  const models = createModels(sequelize);
  console.log(`✅ Base models created: ${Object.keys(models).join(', ')}`);
  
  // Create services
  const services = createServices(models);
  console.log('✅ Base services created');
  
  // Register API routes
  const routes = createRoutes(models, services);
  app.use('/api/base', routes);
  console.log('✅ Base API routes registered: /api/base');
  
  // Store in context for other modules
  context.baseModels = models;
  context.baseServices = services;
  context.securityService = services.securityService;
  context.moduleService = services.moduleService;
  
  console.log('✅ Base Module initialized');
  
  return {
    models,
    services
  };
};

export default initializeBase;
export { createModels, createServices, createRoutes };
