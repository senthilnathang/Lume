import { createServices } from './services/index.js';
import createRoutes from './api/index.js';

export default async function initializeAgentGrid(context = {}) {
  try {
    const { app } = context;
    const services = createServices();

    // Register API routes
    if (app) {
      const router = createRoutes({}, services);
      app.use('/api/agentgrid', router);
      console.log('✅ AgentGrid API routes registered: /api/agentgrid');
    }

    // Clear expired memory records on startup
    try {
      await services.memoryService.clearExpired();
    } catch (err) {
      console.warn('⚠️  AgentGrid: clearExpired() failed (safe to ignore on first run):', err.message);
    }

    console.log('✅ AgentGrid Module initialized');

    return {
      services
    };
  } catch (error) {
    console.error('❌ Error initializing AgentGrid:', error.message);
    throw error;
  }
}
