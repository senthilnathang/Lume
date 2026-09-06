import { Router } from 'express';
import { authenticate } from '../../../core/middleware/auth.js';

const createMailRoutes = (service) => {
  const router = Router();

  router.get('/servers', authenticate, async (req, res) => {
    try {
      const result = await service.servers.findAll({ limit: 100, offset: 0 });
      const rows = (result.rows || result).map((s) => ({ ...s, password: undefined }));
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/servers', authenticate, async (req, res) => {
    try {
      const { name, host } = req.body || {};
      if (!name || !host) {
        return res.status(400).json({ success: false, error: 'Name and host are required' });
      }
      const server = await service.servers.create(req.body);
      res.status(201).json({ success: true, data: { ...server, password: undefined } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/servers/:id', authenticate, async (req, res) => {
    try {
      await service.servers.destroy(req.params.id);
      res.json({ success: true, message: 'Server deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/servers/:id/fetch', authenticate, async (req, res) => {
    try {
      const result = await service.fetchServer(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/rules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await service.listRules() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/rules', authenticate, async (req, res) => {
    try {
      const rule = await service.createRule(req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/rules/test', authenticate, async (req, res) => {
    try {
      const rules = await service.listRules();
      const message = req.body || {};
      const matched = (Array.isArray(rules) ? rules : [])
        .filter((r) => r.isActive !== false)
        .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10))
        .find((r) => service.ruleMatches(r, message));
      res.json({ success: true, data: { matched: !!matched, ruleId: matched?.id || null, rule: matched?.name || null } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/messages', authenticate, async (req, res) => {
    try {
      const result = await service.messages.findAll({
        limit: Math.min(Number(req.query.limit) || 20, 100),
        offset: Number(req.query.offset) || 0,
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, data: result.rows || result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/queue', authenticate, async (req, res) => {
    try {
      const result = await service.queue.findAll({
        limit: Math.min(Number(req.query.limit) || 20, 100),
        offset: Number(req.query.offset) || 0,
        order: [['createdAt', 'DESC']],
      });
      res.json({ success: true, data: result.rows || result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/queue', authenticate, async (req, res) => {
    try {
      const item = await service.enqueue(req.body || {});
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/queue/process', authenticate, async (req, res) => {
    try {
      const results = await service.processQueue(Number(req.body?.limit) || 10);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createMailRoutes;
