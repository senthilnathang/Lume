/**
 * Base Customization API Routes
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();
  const svc = services.customizationService;

  // ── Health ────────────────────────────────────────────────────

  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Customization module running' });
  });

  // ── Custom Fields ─────────────────────────────────────────────

  router.get('/fields', async (req, res) => {
    try {
      const fields = await svc.getCustomFields(req.query);
      res.json({ success: true, data: fields });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/fields/model/:model', async (req, res) => {
    try {
      const fields = await svc.getFieldsByModel(req.params.model);
      res.json({ success: true, data: fields });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/fields/:id', async (req, res) => {
    try {
      const field = await svc.getCustomField(req.params.id);
      if (!field) return res.status(404).json({ success: false, error: 'Custom field not found' });
      res.json({ success: true, data: field });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/fields', async (req, res) => {
    try {
      const { name, label, model } = req.body;
      if (!name || !label || !model) {
        return res.status(400).json({ success: false, error: 'Name, label, and model are required' });
      }
      const field = await svc.createCustomField(req.body);
      res.json({ success: true, data: field });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/fields/:id', async (req, res) => {
    try {
      const field = await svc.updateCustomField(req.params.id, req.body);
      if (!field) return res.status(404).json({ success: false, error: 'Custom field not found' });
      res.json({ success: true, data: field });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/fields/:id', async (req, res) => {
    try {
      await svc.deleteCustomField(req.params.id);
      res.json({ success: true, message: 'Custom field deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Custom Views ──────────────────────────────────────────────

  router.get('/views', async (req, res) => {
    try {
      const views = await svc.getCustomViews(req.query);
      res.json({ success: true, data: views });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/views/:id', async (req, res) => {
    try {
      const view = await svc.getCustomView(req.params.id);
      if (!view) return res.status(404).json({ success: false, error: 'Custom view not found' });
      res.json({ success: true, data: view });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/views', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const view = await svc.createCustomView(req.body);
      res.json({ success: true, data: view });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/views/:id', async (req, res) => {
    try {
      const view = await svc.updateCustomView(req.params.id, req.body);
      if (!view) return res.status(404).json({ success: false, error: 'Custom view not found' });
      res.json({ success: true, data: view });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/views/:id', async (req, res) => {
    try {
      await svc.deleteCustomView(req.params.id);
      res.json({ success: true, message: 'Custom view deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Form Layouts ──────────────────────────────────────────────

  router.get('/forms', async (req, res) => {
    try {
      const layouts = await svc.getFormLayouts(req.query);
      res.json({ success: true, data: layouts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/forms/:id', async (req, res) => {
    try {
      const layout = await svc.getFormLayout(req.params.id);
      if (!layout) return res.status(404).json({ success: false, error: 'Form layout not found' });
      res.json({ success: true, data: layout });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/forms', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const layout = await svc.createFormLayout(req.body);
      res.json({ success: true, data: layout });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/forms/:id', async (req, res) => {
    try {
      const layout = await svc.updateFormLayout(req.params.id, req.body);
      if (!layout) return res.status(404).json({ success: false, error: 'Form layout not found' });
      res.json({ success: true, data: layout });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/forms/:id', async (req, res) => {
    try {
      await svc.deleteFormLayout(req.params.id);
      res.json({ success: true, message: 'Form layout deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── List Configurations ───────────────────────────────────────

  router.get('/lists', async (req, res) => {
    try {
      const configs = await svc.getListConfigs(req.query);
      res.json({ success: true, data: configs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/lists/:id', async (req, res) => {
    try {
      const config = await svc.getListConfig(req.params.id);
      if (!config) return res.status(404).json({ success: false, error: 'List config not found' });
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/lists', async (req, res) => {
    try {
      const { name, model } = req.body;
      if (!name || !model) {
        return res.status(400).json({ success: false, error: 'Name and model are required' });
      }
      const config = await svc.createListConfig(req.body);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/lists/:id', async (req, res) => {
    try {
      const config = await svc.updateListConfig(req.params.id, req.body);
      if (!config) return res.status(404).json({ success: false, error: 'List config not found' });
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/lists/:id', async (req, res) => {
    try {
      await svc.deleteListConfig(req.params.id);
      res.json({ success: true, message: 'List config deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Dashboard Widgets ─────────────────────────────────────────

  router.get('/widgets', async (req, res) => {
    try {
      const widgets = await svc.getDashboardWidgets(req.query);
      res.json({ success: true, data: widgets });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/widgets/:id', async (req, res) => {
    try {
      const widget = await svc.getDashboardWidget(req.params.id);
      if (!widget) return res.status(404).json({ success: false, error: 'Widget not found' });
      res.json({ success: true, data: widget });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/widgets', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      const widget = await svc.createDashboardWidget(req.body);
      res.json({ success: true, data: widget });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/widgets/:id', async (req, res) => {
    try {
      const widget = await svc.updateDashboardWidget(req.params.id, req.body);
      if (!widget) return res.status(404).json({ success: false, error: 'Widget not found' });
      res.json({ success: true, data: widget });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/widgets/:id', async (req, res) => {
    try {
      await svc.deleteDashboardWidget(req.params.id);
      res.json({ success: true, message: 'Widget deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Available Models (for field/view creation) ────────────────

  router.get('/models', (req, res) => {
    try {
      const allModels = svc.sequelize.models;
      const models = Object.keys(allModels)
        .filter(name => !['SequelizeMeta'].includes(name))
        .map(name => ({
          name,
          tableName: allModels[name].tableName,
          fields: Object.entries(allModels[name].rawAttributes || {}).map(([fieldName, attr]) => ({
            name: attr.field || fieldName,
            type: attr.type?.constructor?.name || 'STRING',
            required: attr.allowNull === false,
          }))
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({ success: true, data: models });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
