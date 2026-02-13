/**
 * Base Features Data API Routes
 */

import { Router } from 'express';
import { FeaturesDataService } from '../services/index.js';

const createRoutes = (models, services) => {
  const router = Router();
  
  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Features Data module running' });
  });

  router.get('/flags', async (req, res) => {
    try {
      const userId = req.user?.id;
      const flags = await services.featuresDataService.getFeatureFlags(userId);
      res.json({ success: true, data: flags });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/flags/:key/check', async (req, res) => {
    try {
      const userId = req.user?.id;
      const enabled = await services.featuresDataService.isFeatureEnabled(req.params.key, userId);
      res.json({ success: true, data: { enabled } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/flags', async (req, res) => {
    try {
      const flag = await services.featuresDataService.createFeature(req.body);
      res.json({ success: true, data: flag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/flags/:id', async (req, res) => {
    try {
      const flag = await services.featuresDataService.updateFeature(req.params.id, req.body);
      res.json({ success: true, data: flag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/flags/:id', async (req, res) => {
    try {
      await services.featuresDataService.deleteFeature(req.params.id);
      res.json({ success: true, message: 'Feature flag deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/flags/:key/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;
      const flag = await services.featuresDataService.toggleFeature(req.params.key, enabled);
      res.json({ success: true, data: flag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/imports', async (req, res) => {
    try {
      const imports = await services.featuresDataService.getImports();
      res.json({ success: true, data: imports });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/imports', async (req, res) => {
    try {
      const { name, model, mapping, fileName } = req.body;
      const imp = await services.featuresDataService.createImport({
        name,
        model,
        mapping,
        fileName,
        importedBy: req.user?.id
      });
      res.json({ success: true, data: imp });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/exports', async (req, res) => {
    try {
      const exports = await services.featuresDataService.getExports();
      res.json({ success: true, data: exports });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/exports', async (req, res) => {
    try {
      const { name, model, filters, fields, format } = req.body;
      const exp = await services.featuresDataService.createExport({
        name,
        model,
        filters,
        fields,
        format: format || 'csv',
        exportedBy: req.user?.id
      });
      res.json({ success: true, data: exp });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/backups', async (req, res) => {
    try {
      const backups = await services.featuresDataService.getBackups();
      res.json({ success: true, data: backups });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/backups', async (req, res) => {
    try {
      const { name, type, tables } = req.body;
      const backup = await services.featuresDataService.createBackup({
        name,
        type: type || 'full',
        tables: tables || [],
        createdBy: req.user?.id
      });
      res.json({ success: true, data: backup });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
