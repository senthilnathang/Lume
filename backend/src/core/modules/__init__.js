/**
 * Core Module Initialization
 */

const initializeCore = async (context) => {
  const { sequelize, database } = context;
  
  console.log('🔧 Initializing Core Module...');
  
  // Models are already loaded via setupModels
  // Services are available for use
  
  console.log('✅ Core Module initialized');
  
  return true;
};

export default initializeCore;
