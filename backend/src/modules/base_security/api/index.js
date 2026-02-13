/**
 * Base Security API Routes
 */

import { Router } from 'express';
import crypto from 'crypto';

const createRoutes = (models, services) => {
  const router = Router();
  
  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Security module running' });
  });

  router.get('/api-keys', async (req, res) => {
    try {
      const userId = req.user?.id;
      const keys = await services.securityService.getApiKeys(userId);
      res.json({ success: true, data: keys });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/api-keys', async (req, res) => {
    try {
      const { name, scopes = [] } = req.body;
      const userId = req.user?.id;
      const key = await services.securityService.generateApiKey(name, userId, scopes);
      res.json({ success: true, data: key });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/api-keys/:id', async (req, res) => {
    try {
      await services.securityService.revokeApiKey(req.params.id);
      res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/ip-access', async (req, res) => {
    try {
      const ips = await models.IpAccess.findAll({
        order: [['type', 'ASC'], ['createdAt', 'DESC']]
      });
      res.json({ success: true, data: ips });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/ip-access', async (req, res) => {
    try {
      const { ipAddress, description, type } = req.body;
      const ip = await models.IpAccess.create({ ipAddress, description, type });
      res.json({ success: true, data: ip });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/ip-access/:id', async (req, res) => {
    try {
      const ip = await models.IpAccess.findByPk(req.params.id);
      if (ip) {
        await ip.update(req.body);
      }
      res.json({ success: true, data: ip });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/ip-access/:id', async (req, res) => {
    try {
      const ip = await models.IpAccess.findByPk(req.params.id);
      if (ip) {
        await ip.destroy();
      }
      res.json({ success: true, message: 'IP access rule deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/sessions', async (req, res) => {
    try {
      const userId = req.user?.id;
      const sessions = await models.Session.findAll({
        where: { userId, status: 'active' },
        order: [['lastActivityAt', 'DESC']]
      });
      res.json({ success: true, data: sessions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/sessions/:id', async (req, res) => {
    try {
      const session = await models.Session.findByPk(req.params.id);
      if (session) {
        await session.update({ status: 'revoked' });
      }
      res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/logs', async (req, res) => {
    try {
      const logs = await services.securityService.getSecurityLogs(req.query);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
