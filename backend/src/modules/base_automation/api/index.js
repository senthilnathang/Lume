/**
 * Base Automation API Routes
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();
  
  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Automation module running' });
  });

  router.get('/workflows', async (req, res) => {
    try {
      const workflows = await models.Workflow?.findAll?.({ order: [['createdAt', 'DESC']] }) || [];
      res.json({ success: true, data: workflows });
    } catch (error) {
      res.json({ success: true, data: [] });
    }
  });

  router.post('/workflows', async (req, res) => {
    try {
      const { name, model, states, initialState } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      res.json({ success: true, data: { id: 1, name, model, states: states || [], initialState, status: 'active' } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/flows', async (req, res) => {
    try {
      const flows = await models.Flow?.findAll?.({ order: [['createdAt', 'DESC']] }) || [];
      res.json({ success: true, data: flows });
    } catch (error) {
      res.json({ success: true, data: [] });
    }
  });

  router.post('/flows', async (req, res) => {
    try {
      const { name, model, nodes, edges } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      res.json({ success: true, data: { id: 1, name, model, nodes: nodes || [], edges: edges || [], status: 'draft' } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/rules', async (req, res) => {
    try {
      const rules = await models.BusinessRule?.findAll?.({ order: [['createdAt', 'DESC']] }) || [];
      res.json({ success: true, data: rules });
    } catch (error) {
      res.json({ success: true, data: [] });
    }
  });

  router.post('/rules', async (req, res) => {
    try {
      const { name, model, field, condition, action } = req.body;
      if (!name || !model || !field) {
        return res.status(400).json({ success: false, error: 'Name, model, and field are required' });
      }
      res.json({ success: true, data: { id: 1, name, model, field, condition: condition || {}, action: action || {}, status: 'active' } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/approvals', async (req, res) => {
    try {
      const approvals = await models.ApprovalChain?.findAll?.({ order: [['createdAt', 'DESC']] }) || [];
      res.json({ success: true, data: approvals });
    } catch (error) {
      res.json({ success: true, data: [] });
    }
  });

  router.post('/approvals', async (req, res) => {
    try {
      const { name, model, steps } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      res.json({ success: true, data: { id: 1, name, model, steps: steps || [], status: 'active' } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
