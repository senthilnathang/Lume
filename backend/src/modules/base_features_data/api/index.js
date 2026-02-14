/**
 * Data Management API Routes
 * Import/export workflow endpoints matching FastVue's API
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();
  const svc = services.featuresDataService;

  // ── Health ────────────────────────────────────────────────────

  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Data Management module running' });
  });

  // ── Import: Models Discovery ──────────────────────────────────

  router.get('/import/models', (req, res) => {
    try {
      const models = svc.getAvailableModels();
      res.json({ success: true, data: models });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Import: Preview ───────────────────────────────────────────

  router.post('/import/preview', (req, res) => {
    try {
      const { model_name, file_content, file_name, has_header = true, delimiter = ',', max_preview_rows = 10 } = req.body;

      if (!model_name || !file_content) {
        return res.status(400).json({ success: false, error: 'model_name and file_content are required' });
      }

      // Parse file
      const { columns, rows, totalRows } = svc.parseFile(file_content, file_name, has_header, delimiter);

      // Get model fields for mapping suggestions
      const availableModels = svc.getAvailableModels();
      const modelInfo = availableModels.find(m => m.name === model_name);
      if (!modelInfo) {
        return res.status(400).json({ success: false, error: `Model "${model_name}" not found` });
      }

      // Suggest mappings
      const suggested_mappings = svc.suggestMappings(columns, modelInfo.fields);

      // Preview data (limited rows)
      const preview_data = rows.slice(0, max_preview_rows);

      res.json({
        success: true,
        data: {
          columns,
          preview_data,
          total_rows: totalRows,
          suggested_mappings,
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Import: Validate ──────────────────────────────────────────

  router.post('/import/validate', (req, res) => {
    try {
      const { model_name, file_content, file_name, has_header = true, delimiter = ',', column_mappings } = req.body;

      if (!model_name || !file_content || !column_mappings) {
        return res.status(400).json({ success: false, error: 'model_name, file_content, and column_mappings are required' });
      }

      const { rows } = svc.parseFile(file_content, file_name, has_header, delimiter);
      const result = svc.validateImportData(model_name, rows, column_mappings);

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Import: Execute ───────────────────────────────────────────

  router.post('/import/execute', async (req, res) => {
    try {
      const { model_name, file_content, file_name, has_header = true, delimiter = ',', column_mappings, update_existing = false, skip_errors = false } = req.body;

      if (!model_name || !file_content || !column_mappings) {
        return res.status(400).json({ success: false, error: 'model_name, file_content, and column_mappings are required' });
      }

      const { rows } = svc.parseFile(file_content, file_name, has_header, delimiter);
      const result = await svc.executeImport(model_name, rows, column_mappings, {
        updateExisting: update_existing,
        skipErrors: skip_errors,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Import: Template Download ─────────────────────────────────

  router.get('/import/template/:model_name', (req, res) => {
    try {
      const csv = svc.generateTemplate(req.params.model_name);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.model_name}_template.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Export: Models Discovery ──────────────────────────────────

  router.get('/export/models', (req, res) => {
    try {
      const models = svc.getAvailableModels();
      res.json({ success: true, data: models });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Export: Preview ───────────────────────────────────────────

  router.post('/export/preview', async (req, res) => {
    try {
      const { model_name, fields, search, format } = req.body;

      if (!model_name) {
        return res.status(400).json({ success: false, error: 'model_name is required' });
      }

      const { data, total_records } = await svc.getExportData(model_name, {
        fields,
        search,
        limit: 10,
      });

      res.json({
        success: true,
        data: {
          data,
          total_records,
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Export: Download ──────────────────────────────────────────

  router.post('/export/download', async (req, res) => {
    try {
      const { model_name, fields, search, limit, format = 'csv' } = req.body;

      if (!model_name) {
        return res.status(400).json({ success: false, error: 'model_name is required' });
      }

      const { data } = await svc.getExportData(model_name, {
        fields,
        search,
        limit,
      });

      if (format === 'json') {
        const jsonContent = svc.exportToJson(data, fields);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${model_name}_export.json"`);
        res.send(jsonContent);
      } else {
        const csvContent = svc.exportToCsv(data, fields);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${model_name}_export.csv"`);
        res.send(csvContent);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Feature Flags (kept for backward compat) ─────────────────

  router.get('/flags', async (req, res) => {
    try {
      const userId = req.user?.id;
      const flags = await svc.getFeatureFlags(userId);
      res.json({ success: true, data: flags });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/flags', async (req, res) => {
    try {
      const flag = await svc.createFeature(req.body);
      res.json({ success: true, data: flag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/flags/:id', async (req, res) => {
    try {
      const flag = await svc.updateFeature(req.params.id, req.body);
      res.json({ success: true, data: flag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/flags/:id', async (req, res) => {
    try {
      await svc.deleteFeature(req.params.id);
      res.json({ success: true, message: 'Feature flag deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/flags/:key/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      const flag = await svc.toggleFeature(req.params.key, enabled);
      res.json({ success: true, data: flag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
