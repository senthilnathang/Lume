/**
 * Base Features Data Module Initialization
 */

import { FeatureFlagModel, DataImportModel, DataExportModel, BackupModel } from './models/index.js';
import { FeaturesDataService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeBaseFeaturesData = async (context) => {
  const { sequelize, app } = context;
  
  console.log('🔧 Initializing Base Features Data Module...');
  
  const models = {
    FeatureFlag: FeatureFlagModel(sequelize),
    DataImport: DataImportModel(sequelize),
    DataExport: DataExportModel(sequelize),
    Backup: BackupModel(sequelize)
  };
  console.log(`✅ Base Features Data models created: ${Object.keys(models).join(', ')}`);
  
  const services = {
    featuresDataService: new FeaturesDataService(models, sequelize)
  };
  console.log('✅ Base Features Data services created');
  
  const routes = createRoutes(models, services);
  app.use('/api/base_features_data', routes);
  console.log('✅ Base Features Data API routes registered: /api/base_features_data');
  
  console.log('✅ Base Features Data Module initialized');
  
  return { models, services };
};

export default initializeBaseFeaturesData;
