/**
 * Base Security Module Initialization
 */

import { ApiKeyModel, SessionModel, IpAccessModel, TwoFactorModel, SecurityLogModel } from './models/index.js';
import { SecurityService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBaseSecurity = async (context) => {
  const { sequelize, app } = context;
  
  console.log('🔧 Initializing Base Security Module...');
  
  const models = {
    ApiKey: ApiKeyModel(sequelize),
    Session: SessionModel(sequelize),
    IpAccess: IpAccessModel(sequelize),
    TwoFactor: TwoFactorModel(sequelize),
    SecurityLog: SecurityLogModel(sequelize)
  };
  console.log(`✅ Base Security models created: ${Object.keys(models).join(', ')}`);
  
  const services = {
    securityService: new SecurityService(models)
  };
  console.log('✅ Base Security services created');
  
  const routes = createRoutes(models, services);
  app.use('/api/base_security', routes);
  console.log('✅ Base Security API routes registered: /api/base_security');
  
  console.log('✅ Base Security Module initialized');
  
  return { models, services };
};

export default initializeBaseSecurity;
