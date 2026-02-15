/**
 * Base Features Data Module Initialization
 */

import {
  featureFlags,
  dataImports,
  dataExports,
  backups
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { FeaturesDataService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBaseFeaturesData = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Base Features Data Module...');

  const adapters = {
    FeatureFlag: new DrizzleAdapter(featureFlags),
    DataImport: new DrizzleAdapter(dataImports),
    DataExport: new DrizzleAdapter(dataExports),
    Backup: new DrizzleAdapter(backups)
  };
  console.log(`✅ Base Features Data adapters created: ${Object.keys(adapters).join(', ')}`);

  const services = {
    featuresDataService: new FeaturesDataService(adapters)
  };
  console.log('✅ Base Features Data services created');

  const routes = createRoutes(adapters, services);
  app.use('/api/base_features_data', routes);
  console.log('✅ Base Features Data API routes registered: /api/base_features_data');

  console.log('✅ Base Features Data Module initialized');

  return { models: adapters, services };
};

export default initializeBaseFeaturesData;
