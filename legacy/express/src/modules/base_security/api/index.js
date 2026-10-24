/**
 * Base Security API Routes
 * Uses DrizzleAdapter API for models and SecurityService for business logic.
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Base Security module running' });
  });

  // ─── API Keys ─────────────────────────────────────────────

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
      await services.securityService.revokeApiKey(parseInt(req.params.id, 10));
      res.json({ success: true, message: 'API key revoked' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ─── IP Access ────────────────────────────────────────────

  router.get('/ip-access', async (req, res) => {
    try {
      const rules = await services.securityService.getIpAccessRules();
      res.json({ success: true, data: rules });
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
      const updated = await models.IpAccess.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/ip-access/:id', async (req, res) => {
    try {
      await models.IpAccess.destroy(req.params.id);
      res.json({ success: true, message: 'IP access rule deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ─── Sessions ─────────────────────────────────────────────

  router.get('/sessions', async (req, res) => {
    try {
      const userId = req.user?.id;
      const sessions = await services.securityService.getActiveSessions(userId);
      res.json({ success: true, data: sessions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/sessions/all-other', async (req, res) => {
    try {
      const userId = req.user?.id;
      const token = req.headers.authorization?.replace('Bearer ', '');
      const result = await services.securityService.terminateAllOtherSessions(userId, token);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/sessions/:id', async (req, res) => {
    try {
      await services.securityService.terminateSession(parseInt(req.params.id, 10));
      res.json({ success: true, message: 'Session revoked' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ─── Security Logs ────────────────────────────────────────

  router.get('/logs', async (req, res) => {
    try {
      const logs = await services.securityService.getSecurityLogs(req.query);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ─── Two-Factor Authentication ────────────────────────────

  router.post('/2fa/setup', async (req, res) => {
    try {
      const userId = req.user?.id;
      const email = req.user?.email;
      const result = await services.securityService.setup2FA(userId, email);
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/2fa/verify', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'Token is required' });
      }
      const result = await services.securityService.verify2FA(userId, token);
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/2fa/disable', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'Token is required' });
      }
      const result = await services.securityService.disable2FA(userId, token);
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/2fa/status', async (req, res) => {
    try {
      const userId = req.user?.id;
      const enabled = await services.securityService.is2FAEnabled(userId);
      res.json({ success: true, data: { enabled } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/2fa/backup-codes', async (req, res) => {
    try {
      const userId = req.user?.id;
      const result = await services.securityService.getBackupCodes(userId);
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/2fa/backup-codes/regenerate', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, error: 'Token is required' });
      }
      const result = await services.securityService.regenerateBackupCodes(userId, token);
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
