/**
 * Notification API Routes
 * Endpoints for managing notification templates and delivery tracking
 */

import { Router } from 'express';

const createNotificationRoutes = (models, services) => {
  const router = Router();
  const notificationService = services?.notificationService;

  if (!notificationService) {
    console.warn('⚠️ Notification service not available');
  }

  // ── Templates ─────────────────────────────────────────────────

  /**
   * GET /api/base_automation/notifications/templates
   * List all notification templates
   */
  router.get('/templates', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const filters = {};
      if (req.query.channel) filters.channel = req.query.channel;
      if (req.query.enabled !== undefined) {
        filters.enabled = req.query.enabled === 'true';
      }

      const result = await notificationService.listTemplates(filters);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/base_automation/notifications/templates/:id
   * Get a specific notification template
   */
  router.get('/templates/:id', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const template = await notificationService.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/base_automation/notifications/templates
   * Create a new notification template
   */
  router.post('/templates', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const { name, channel, subject, body, variables, enabled, metadata } = req.body;

      if (!name || !channel || !body) {
        return res.status(400).json({
          success: false,
          error: 'Name, channel, and body are required'
        });
      }

      const template = await notificationService.createTemplate({
        name,
        channel,
        subject,
        body,
        variables,
        enabled,
        metadata
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /api/base_automation/notifications/templates/:id
   * Update a notification template
   */
  router.put('/templates/:id', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const template = await notificationService.updateTemplate(req.params.id, req.body);
      res.json({ success: true, data: template });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/base_automation/notifications/templates/:id
   * Delete a notification template
   */
  router.delete('/templates/:id', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      await notificationService.deleteTemplate(req.params.id);
      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/base_automation/notifications/templates/:id/stats
   * Get delivery stats for a template
   */
  router.get('/templates/:id/stats', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const stats = await notificationService.getDeliveryStats(req.params.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Send Notifications ────────────────────────────────────────

  /**
   * POST /api/base_automation/notifications/send
   * Send a notification using a template
   */
  router.post('/send', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const { templateId, recipient, variables } = req.body;

      if (!templateId || !recipient) {
        return res.status(400).json({
          success: false,
          error: 'templateId and recipient are required'
        });
      }

      const result = await notificationService.sendFromTemplate(
        templateId,
        recipient,
        variables || {}
      );

      res.json({ success: result.success, data: { deliveryId: result.deliveryId, error: result.error } });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      if (error.message.includes('Disabled') || error.message.includes('Invalid')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/base_automation/notifications/send-bulk
   * Send notifications to multiple recipients
   */
  router.post('/send-bulk', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const { templateId, recipients, variables } = req.body;

      if (!templateId || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          success: false,
          error: 'templateId and recipients array are required'
        });
      }

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const recipient of recipients) {
        try {
          const result = await notificationService.sendFromTemplate(
            templateId,
            recipient,
            variables || {}
          );
          results.push({
            recipient,
            success: result.success,
            deliveryId: result.deliveryId,
            error: result.error
          });
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          results.push({
            recipient,
            success: false,
            error: error.message
          });
          failureCount++;
        }
      }

      res.json({
        success: failureCount === 0,
        data: {
          total: results.length,
          sent: successCount,
          failed: failureCount,
          results
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Delivery Tracking ─────────────────────────────────────────

  /**
   * GET /api/base_automation/notifications/delivery
   * Get delivery history with optional filters
   */
  router.get('/delivery', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const filters = {};
      if (req.query.notificationId) filters.notificationId = parseInt(req.query.notificationId);
      if (req.query.status) filters.status = req.query.status;
      if (req.query.channel) filters.channel = req.query.channel;
      if (req.query.recipient) filters.recipient = req.query.recipient;

      const result = await notificationService.getDeliveryHistory(filters);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/base_automation/notifications/delivery/:id
   * Get a specific delivery record
   */
  router.get('/delivery/:id', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const delivery = await models.NotificationDelivery.findById(req.params.id);
      if (!delivery) {
        return res.status(404).json({ success: false, error: 'Delivery record not found' });
      }

      res.json({ success: true, data: delivery });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/base_automation/notifications/delivery/template/:templateId
   * Get delivery history for a specific template
   */
  router.get('/delivery/template/:templateId', async (req, res) => {
    try {
      if (!notificationService) {
        return res.status(503).json({ success: false, error: 'Notification service unavailable' });
      }

      const result = await notificationService.getDeliveryHistory({
        notificationId: parseInt(req.params.templateId)
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createNotificationRoutes;
