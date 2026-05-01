import { Router } from 'express';
import { authenticate, authorize } from '../../../core/middleware/auth.js';
import { QueueManagerService } from '../../../core/services/queue-manager.service.js';

const queueManager = new QueueManagerService();

const createRoutes = (models, services) => {
  const router = Router();
  const { workflowService, executionService, executionEngine, nodeRegistry } = services;

  router.use(authenticate);

  router.get('/', authorize('flowgrid', 'read'), async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await workflowService.search({
        page: Number(page),
        limit: Number(limit)
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/', authorize('flowgrid', 'write'), async (req, res) => {
    try {
      const { name, description, nodes = [], edges = [], variables = {}, trigger = {} } = req.body;
      const workflow = await workflowService.create({
        name,
        description,
        nodes,
        edges,
        variables,
        trigger,
        status: 'draft',
        tenantId: req.user?.tenantId,
        createdById: req.user?.id
      }, { userId: req.user?.id });
      res.status(201).json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', authorize('flowgrid', 'read'), async (req, res) => {
    try {
      const workflow = await workflowService.read(req.params.id);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/:id', authorize('flowgrid', 'write'), async (req, res) => {
    try {
      const workflow = await workflowService.update(req.params.id, req.body, { userId: req.user?.id });
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/:id', authorize('flowgrid', 'delete'), async (req, res) => {
    try {
      await workflowService.delete(req.params.id, { userId: req.user?.id });
      res.json({ message: 'Workflow deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:id/publish', authorize('flowgrid', 'write'), async (req, res) => {
    try {
      const workflow = await workflowService.publishWorkflow(req.params.id, { userId: req.user?.id });
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:id/duplicate', authorize('flowgrid', 'write'), async (req, res) => {
    try {
      const workflow = await workflowService.duplicateWorkflow(req.params.id, { userId: req.user?.id });
      res.status(201).json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/:id/execute', authorize('flowgrid', 'execute'), async (req, res) => {
    try {
      const { input = {} } = req.body;
      const jobId = await queueManager.addJob('automations', {
        type: 'execute-flowgrid-workflow',
        workflowId: req.params.id,
        input,
        userId: req.user?.id
      });

      const execution = await executionEngine.executeWorkflow(req.params.id, input, {
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        triggeredBy: 'api'
      });

      res.status(202).json({
        executionId: execution.executionId,
        status: 'pending',
        jobId
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id/executions', authorize('flowgrid', 'read'), async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await executionService.listExecutions(req.params.id, {
        page: Number(page),
        limit: Number(limit)
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/executions/:executionId', authorize('flowgrid', 'read'), async (req, res) => {
    try {
      const execution = await executionService.getExecutionWithTimeline(req.params.executionId);
      if (!execution) return res.status(404).json({ error: 'Execution not found' });
      res.json(execution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/executions/:executionId', authorize('flowgrid', 'execute'), async (req, res) => {
    try {
      await executionService.cancelExecution(req.params.executionId);
      res.json({ message: 'Execution cancelled' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/node-types', authorize('flowgrid', 'read'), async (req, res) => {
    try {
      const nodeTypes = nodeRegistry.getAllMetadata();
      res.json(nodeTypes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/validate', authorize('flowgrid', 'write'), async (req, res) => {
    try {
      const { nodes = [], edges = [] } = req.body;
      const validation = workflowService.validateWorkflow({ nodes, edges });
      res.json(validation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

export default createRoutes;
