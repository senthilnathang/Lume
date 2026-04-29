/**
 * Base Module Services
 */

import SecurityService from './security.service.js';
import ModuleService from './module.service.js';
import { RecordService } from './record.service.js';
import { EntityBuilderService } from './entity-builder.service.js';

export {
  SecurityService,
  ModuleService,
  RecordService,
  EntityBuilderService
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
