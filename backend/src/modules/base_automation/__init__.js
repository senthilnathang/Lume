/**
 * Base Automation Module Initialization
 */

import { Router } from 'express';

const initializeBaseAutomation = async (context) => {
  const { sequelize, app } = context;
  
  console.log('🔧 Initializing Base Automation Module...');
  
  // Create router
  const router = Router();
  
  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Automation module running' });
  });

  router.get('/workflows', (req, res) => {
    res.json({ success: true, data: [] });
  });

  router.post('/workflows', (req, res) => {
    const { name, model } = req.body;
    if (!name || !model) {
      return res.status(400).json({ success: false, error: 'Name and model are required' });
    }
    res.json({ success: true, data: { id: 1, name, model } });
  });

  router.get('/flows', (req, res) => {
    res.json({ success: true, data: [] });
  });

  app.use('/api/base_automation', router);
  console.log('✅ Base Automation API routes registered: /api/base_automation');
  
  console.log('✅ Base Automation Module initialized');
  
  return { models: {}, services: {} };
};

export default initializeBaseAutomation;
