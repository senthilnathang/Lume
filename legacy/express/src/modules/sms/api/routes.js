import { Router } from 'express';
import { authenticate } from '../../../core/middleware/auth.js';

const createSmsRoutes = (service) => {
  const router = Router();

  router.get('/providers', authenticate, async (req, res) => {
    try {
      const result = await service.providers.findAll({ limit: 100, offset: 0 });
      res.json({ success: true, data: result.rows || result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/providers', authenticate, async (req, res) => {
    try {
      const provider = await service.createProvider(req.body);
      res.status(201).json({ success: true, data: provider });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/providers/:id', authenticate, async (req, res) => {
    try {
      await service.providers.destroy(req.params.id);
      res.json({ success: true, message: 'Provider deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/templates', authenticate, async (req, res) => {
    try {
      const result = await service.templates.findAll({ limit: 100, offset: 0 });
      res.json({ success: true, data: result.rows || result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/templates', authenticate, async (req, res) => {
    try {
      const template = await service.createTemplate(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/templates/:id', authenticate, async (req, res) => {
    try {
      await service.templates.destroy(req.params.id);
      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/logs', authenticate, async (req, res) => {
    try {
      const result = await service.logs.findAll({
        limit: Math.min(Number(req.query.limit) || 20, 100),
        offset: Number(req.query.offset) || 0,
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, data: result.rows || result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/send', authenticate, async (req, res) => {
    try {
      const result = await service.send(req.body || {});
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message, logId: error.logId || null });
    }
  });

  router.post('/send-bulk', authenticate, async (req, res) => {
    try {
      const results = await service.sendBulk(req.body?.items || []);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/retry/:id', authenticate, async (req, res) => {
    try {
      const result = await service.retry(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createSmsRoutes;
