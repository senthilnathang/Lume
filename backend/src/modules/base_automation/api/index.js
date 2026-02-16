/**
 * Base Automation API Routes
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();
  const svc = services.automationService;

  // ── Health ────────────────────────────────────────────────────

  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Automation module running' });
  });

  // ── Workflows ─────────────────────────────────────────────────

  router.get('/workflows', async (req, res) => {
    try {
      const workflows = await svc.getWorkflows(req.query);
      res.json({ success: true, data: workflows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/workflows/:id', async (req, res) => {
    try {
      const workflow = await svc.getWorkflow(req.params.id);
      if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
      res.json({ success: true, data: workflow });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/workflows', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const workflow = await svc.createWorkflow(req.body);
      res.json({ success: true, data: workflow });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/workflows/:id', async (req, res) => {
    try {
      const workflow = await svc.updateWorkflow(req.params.id, req.body);
      if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
      res.json({ success: true, data: workflow });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/workflows/:id', async (req, res) => {
    try {
      await svc.deleteWorkflow(req.params.id);
      res.json({ success: true, message: 'Workflow deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Flows ─────────────────────────────────────────────────────

  router.get('/flows', async (req, res) => {
    try {
      const flows = await svc.getFlows(req.query);
      res.json({ success: true, data: flows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/flows/:id', async (req, res) => {
    try {
      const flow = await svc.getFlow(req.params.id);
      if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
      res.json({ success: true, data: flow });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/flows', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const flow = await svc.createFlow(req.body);
      res.json({ success: true, data: flow });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/flows/:id', async (req, res) => {
    try {
      const flow = await svc.updateFlow(req.params.id, req.body);
      if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
      res.json({ success: true, data: flow });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/flows/:id', async (req, res) => {
    try {
      await svc.deleteFlow(req.params.id);
      res.json({ success: true, message: 'Flow deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Business Rules ────────────────────────────────────────────

  router.get('/rules', async (req, res) => {
    try {
      const rules = await svc.getBusinessRules(req.query);
      res.json({ success: true, data: rules });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/rules/:id', async (req, res) => {
    try {
      const rule = await svc.getBusinessRule(req.params.id);
      if (!rule) return res.status(404).json({ success: false, error: 'Business rule not found' });
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/rules', async (req, res) => {
    try {
      const { name, model, field } = req.body;
      if (!name || !model || !field) {
        return res.status(400).json({ success: false, error: 'Name, model, and field are required' });
      }
      const rule = await svc.createBusinessRule(req.body);
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/rules/:id', async (req, res) => {
    try {
      const rule = await svc.updateBusinessRule(req.params.id, req.body);
      if (!rule) return res.status(404).json({ success: false, error: 'Business rule not found' });
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/rules/:id', async (req, res) => {
    try {
      await svc.deleteBusinessRule(req.params.id);
      res.json({ success: true, message: 'Business rule deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Approval Chains ───────────────────────────────────────────

  router.get('/approvals', async (req, res) => {
    try {
      const chains = await svc.getApprovalChains(req.query);
      res.json({ success: true, data: chains });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/approvals/:id', async (req, res) => {
    try {
      const chain = await svc.getApprovalChain(req.params.id);
      if (!chain) return res.status(404).json({ success: false, error: 'Approval chain not found' });
      res.json({ success: true, data: chain });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/approvals', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const chain = await svc.createApprovalChain(req.body);
      res.json({ success: true, data: chain });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/approvals/:id', async (req, res) => {
    try {
      const chain = await svc.updateApprovalChain(req.params.id, req.body);
      if (!chain) return res.status(404).json({ success: false, error: 'Approval chain not found' });
      res.json({ success: true, data: chain });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/approvals/:id', async (req, res) => {
    try {
      await svc.deleteApprovalChain(req.params.id);
      res.json({ success: true, message: 'Approval chain deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Scheduled Actions ─────────────────────────────────────────

  router.get('/scheduled', async (req, res) => {
    try {
      const actions = await svc.getScheduledActions(req.query);
      res.json({ success: true, data: actions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/scheduled/status', async (req, res) => {
    try {
      const status = services.schedulerService ? services.schedulerService.getStatus() : { activeJobs: 0 };
      res.json({ success: true, data: status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/scheduled/:id', async (req, res) => {
    try {
      const action = await svc.getScheduledAction(req.params.id);
      if (!action) return res.status(404).json({ success: false, error: 'Scheduled action not found' });
      res.json({ success: true, data: action });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/scheduled', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      const action = await svc.createScheduledAction(req.body);
      if (services.schedulerService && action?.id) {
        await services.schedulerService.registerAction(action.id);
      }
      res.json({ success: true, data: action });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/scheduled/:id', async (req, res) => {
    try {
      const action = await svc.updateScheduledAction(req.params.id, req.body);
      if (!action) return res.status(404).json({ success: false, error: 'Scheduled action not found' });
      if (services.schedulerService) {
        await services.schedulerService.registerAction(req.params.id);
      }
      res.json({ success: true, data: action });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/scheduled/:id', async (req, res) => {
    try {
      if (services.schedulerService) {
        services.schedulerService.unregisterAction(Number(req.params.id));
      }
      await svc.deleteScheduledAction(req.params.id);
      res.json({ success: true, message: 'Scheduled action deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Validation Rules ──────────────────────────────────────────

  router.get('/validation-rules', async (req, res) => {
    try {
      const rules = await svc.getValidationRules(req.query);
      res.json({ success: true, data: rules });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/validation-rules/:id', async (req, res) => {
    try {
      const rule = await svc.getValidationRule(req.params.id);
      if (!rule) return res.status(404).json({ success: false, error: 'Validation rule not found' });
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/validation-rules', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const rule = await svc.createValidationRule(req.body);
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/validation-rules/:id', async (req, res) => {
    try {
      const rule = await svc.updateValidationRule(req.params.id, req.body);
      if (!rule) return res.status(404).json({ success: false, error: 'Validation rule not found' });
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/validation-rules/:id', async (req, res) => {
    try {
      await svc.deleteValidationRule(req.params.id);
      res.json({ success: true, message: 'Validation rule deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Assignment Rules ──────────────────────────────────────────

  router.get('/assignment-rules', async (req, res) => {
    try {
      const rules = await svc.getAssignmentRules(req.query);
      res.json({ success: true, data: rules });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/assignment-rules/:id', async (req, res) => {
    try {
      const rule = await svc.getAssignmentRule(req.params.id);
      if (!rule) return res.status(404).json({ success: false, error: 'Assignment rule not found' });
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/assignment-rules', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const rule = await svc.createAssignmentRule(req.body);
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/assignment-rules/:id', async (req, res) => {
    try {
      const rule = await svc.updateAssignmentRule(req.params.id, req.body);
      if (!rule) return res.status(404).json({ success: false, error: 'Assignment rule not found' });
      res.json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/assignment-rules/:id', async (req, res) => {
    try {
      await svc.deleteAssignmentRule(req.params.id);
      res.json({ success: true, message: 'Assignment rule deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Rollup Fields ─────────────────────────────────────────────

  router.get('/rollup-fields', async (req, res) => {
    try {
      const fields = await svc.getRollupFields(req.query);
      res.json({ success: true, data: fields });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/rollup-fields/:id', async (req, res) => {
    try {
      const field = await svc.getRollupField(req.params.id);
      if (!field) return res.status(404).json({ success: false, error: 'Rollup field not found' });
      res.json({ success: true, data: field });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/rollup-fields', async (req, res) => {
    try {
      const { name, parentModel, childModel, rollupField, targetField } = req.body;
      if (!name || !parentModel || !childModel || !rollupField || !targetField) {
        return res.status(400).json({ success: false, error: 'Name, parentModel, childModel, rollupField, and targetField are required' });
      }
      const field = await svc.createRollupField(req.body);
      res.json({ success: true, data: field });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/rollup-fields/:id', async (req, res) => {
    try {
      const field = await svc.updateRollupField(req.params.id, req.body);
      if (!field) return res.status(404).json({ success: false, error: 'Rollup field not found' });
      res.json({ success: true, data: field });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/rollup-fields/:id', async (req, res) => {
    try {
      await svc.deleteRollupField(req.params.id);
      res.json({ success: true, message: 'Rollup field deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
