/**
 * Base Module Services
 */

import SecurityService from './security.service.js';
import ModuleService from './module.service.js';

export {
  SecurityService,
  ModuleService
};

export const createServices = (models, config = {}) => {
  const securityService = new SecurityService(models);
  const moduleService = new ModuleService(models);
  
  return {
    securityService,
    moduleService
  };
};

export default createServices;
