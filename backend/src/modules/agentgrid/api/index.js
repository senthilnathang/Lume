import { Router } from 'express';
import { authenticate, authorize } from '../../../core/middleware/auth.js';

const createRoutes = (models, services) => {
  const router = Router();

  if (!services) {
    throw new Error('Services object is required for AgentGrid API');
  }

  if (typeof services === 'function') {
    throw new Error('Services must be an object, not a function');
  }

  const { gridService, agentService, executionService, memoryService, toolRegistry, orchestrator } = services;

  router.use(authenticate);

  // Most specific routes first (non-parameterized paths)

  // Tools
  router.get('/tools', authorize(['agentgrid.read']), (req, res) => {
    try {
      const tools = Array.from(toolRegistry.tools.values()).map(tool => {
        const schema = tool.getSchema();
        return {
          name: schema.name,
          description: schema.description,
          parameters: schema.parameters
        };
      });
      res.json(tools);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execution endpoints
  router.post('/execute', authorize(['agentgrid.execute']), async (req, res) => {
    try {
      const { agentId, input } = req.body;

      const result = await orchestrator.executeAgent(agentId, input || {}, {
        userId: req.user.id
      });

      res.status(202).json({
        executionId: result.executionId,
        agentId: result.agentId,
        status: result.status,
        output: result.output
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/executions/:id', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const execution = await executionService.getExecutionWithLogs(req.params.id);
      if (!execution) return res.status(404).json({ error: 'Execution not found' });
      res.json(execution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/executions/:id', authorize(['agentgrid.execute']), async (req, res) => {
    try {
      await orchestrator.cancelAgent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/executions/:id/logs', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const logs = await executionService.getExecutionLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Memory endpoints
  router.get('/memory/:namespace', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const memory = await memoryService.recallAll(req.params.namespace, req.query.pattern);
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/memory/:namespace', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const { key, value, ttl } = req.body;
      await memoryService.remember(req.user.id, req.params.namespace, key, value, ttl);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete('/memory/:namespace/:key', authorize(['agentgrid.write']), async (req, res) => {
    try {
      await memoryService.forget(req.user.id, req.params.namespace, req.params.key);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Grid list and create (less specific than :id)
  router.get('/', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const tenantId = req.user.tenantId || req.user.id || 1;
      const result = await gridService.getByTenant(tenantId, {
        page,
        limit
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const tenantId = req.user.tenantId || req.user.id || 1;
      const grid = await gridService.create({
        ...req.body,
        tenantId
      });
      res.status(201).json(grid);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Grid CRUD with ID
  router.get('/:id', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const grid = await gridService.read(req.params.id);
      if (!grid) return res.status(404).json({ error: 'Grid not found' });
      res.json(grid);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const grid = await gridService.update(req.params.id, req.body);
      res.json(grid);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete('/:id', authorize(['agentgrid.delete']), async (req, res) => {
    try {
      await gridService.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Agent management routes
  router.get('/:gridId/agents', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const agents = await agentService.getByGrid(req.params.gridId, {
        page: req.query.page || 1,
        limit: req.query.limit || 20
      });
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:gridId/agents', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const agent = await agentService.create({
        ...req.body,
        gridId: req.params.gridId,
        tenantId: req.user.tenantId
      });
      res.status(201).json(agent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/:gridId/agents/:id', authorize(['agentgrid.read']), async (req, res) => {
    try {
      const agent = await agentService.read(req.params.id);
      if (!agent || agent.gridId !== Number(req.params.gridId)) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:gridId/agents/:id', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const agent = await agentService.update(req.params.id, req.body);
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete('/:gridId/agents/:id', authorize(['agentgrid.delete']), async (req, res) => {
    try {
      await agentService.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/:gridId/agents/:id/activate', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const agent = await agentService.activate(req.params.id, { userId: req.user.id });
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/:gridId/agents/:id/deactivate', authorize(['agentgrid.write']), async (req, res) => {
    try {
      const agent = await agentService.deactivate(req.params.id, { userId: req.user.id });
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};

export default createRoutes;
