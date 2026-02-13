import { useDB, testDBConnection, closeDB } from '../utils/db';
import { initModels } from '../models/index';

export default defineNitroPlugin(async (nitroApp) => {
  console.log('[Lume] Initializing database connection...');

  const connected = await testDBConnection();
  if (!connected) {
    console.error('[Lume] Failed to connect to database. Server will start but DB operations will fail.');
    return;
  }

  // Initialize all Sequelize models and associations
  const sequelize = useDB();
  initModels(sequelize);
  console.log('[Lume] Models initialized');

  // In development, sync models (creates tables if they don't exist)
  if (process.env.NODE_ENV === 'development') {
    try {
      await sequelize.sync({ force: false });
      console.log('[Lume] Database synced successfully');
    } catch (error) {
      console.error('[Lume] Failed to sync database:', error);
    }
  }

  // Graceful shutdown
  nitroApp.hooks.hook('close', async () => {
    console.log('[Lume] Closing database connection...');
    await closeDB();
  });
});
