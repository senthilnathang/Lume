/**
 * Base Security Module Initialization
 */

import {
  apiKeys,
  sessions,
  ipAccess,
  twoFactor,
  securityLogs
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { SecurityService } from './services/index.js';
import createRoutes from './api/index.js';
import { setSecurityService } from '../../core/middleware/ipAccess.js';
import serviceRegistry from '../../core/services/service-registry.js';

const initializeBaseSecurity = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Base Security Module...');

  const adapters = {
    ApiKey: new DrizzleAdapter(apiKeys),
    Session: new DrizzleAdapter(sessions),
    IpAccess: new DrizzleAdapter(ipAccess),
    TwoFactor: new DrizzleAdapter(twoFactor),
    SecurityLog: new DrizzleAdapter(securityLogs)
  };
  console.log(`✅ Base Security adapters created: ${Object.keys(adapters).join(', ')}`);

  const securityService = new SecurityService(adapters);
  const services = { securityService };
  console.log('✅ Base Security services created');

  // Register security service globally for IP access middleware and cross-module use
  serviceRegistry.register('securityService', securityService);
  setSecurityService(securityService);

  const routes = createRoutes(adapters, services);
  app.use('/api/base_security', routes);
  console.log('✅ Base Security API routes registered: /api/base_security');

  console.log('✅ Base Security Module initialized');

  return { models: adapters, services };
};

export default initializeBaseSecurity;
