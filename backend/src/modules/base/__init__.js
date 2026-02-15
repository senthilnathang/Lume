/**
 * Base Module Initialization
 */

import { PrismaAdapter } from '../../core/db/adapters/prisma-adapter.js';
import { createServices } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBase = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Base Module...');

  // Create Prisma adapters for core models
  const adapters = {
    InstalledModule: new PrismaAdapter('InstalledModule'),
    Menu: new PrismaAdapter('Menu'),
    Permission: new PrismaAdapter('Permission'),
    Role: new PrismaAdapter('Role'),
    Group: new PrismaAdapter('Group'),
    RecordRule: new PrismaAdapter('RecordRule'),
    Sequence: new PrismaAdapter('Sequence'),
    AuditLog: new PrismaAdapter('AuditLog'),
    Setting: new PrismaAdapter('Setting'),
    RolePermission: new PrismaAdapter('RolePermission'),
  };
  console.log(`✅ Base Prisma adapters created: ${Object.keys(adapters).join(', ')}`);

  // Create services (pass adapters as models)
  const services = createServices(adapters);
  console.log('✅ Base services created');

  // Register API routes
  const routes = createRoutes(adapters, services);
  app.use('/api/base', routes);
  console.log('✅ Base API routes registered: /api/base');

  // Store in context for other modules
  context.baseModels = adapters;
  context.baseServices = services;
  context.securityService = services.securityService;
  context.moduleService = services.moduleService;

  console.log('✅ Base Module initialized');

  return {
    models: adapters,
    services
  };
};

export default initializeBase;
export { createServices, createRoutes };
