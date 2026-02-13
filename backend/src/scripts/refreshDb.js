import { getDatabase, initializeDatabase, closeDatabase } from '../config.js';
import { setupModels } from '../database/models/index.js';
import { readFileSync } from 'fs';

const refreshDatabase = async () => {
  try {
    console.log('🔄 Starting database refresh...');
    
    const sequelize = await initializeDatabase();
    setupModels(sequelize);

    console.log('📋 Dropping all tables...');
    await sequelize.drop({ cascade: true });
    console.log('✅ All tables dropped.');

    console.log('🔄 Syncing models...');
    await sequelize.sync({ force: true });
    console.log('✅ Models synced.');

    console.log('🎉 Database refresh complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run db:admin  (create admin user)');
    console.log('   2. Run: npm run db:seed  (seed sample data)');
    
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error refreshing database:', error);
    process.exit(1);
  }
};

refreshDatabase();
