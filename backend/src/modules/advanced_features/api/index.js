/**
 * Advanced Features API Routes
 */

import { Router } from 'express';

const createRoutes = (models, services) => {
  const router = Router();
  const svc = services.advancedFeaturesService;

  // ── Health ────────────────────────────────────────────────────

  router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Advanced Features module running' });
  });

  // ── Webhooks ──────────────────────────────────────────────────

  router.get('/webhooks', async (req, res) => {
    try {
      const webhooks = await svc.getWebhooks(req.query);
      res.json({ success: true, data: webhooks });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/webhooks/:id', async (req, res) => {
    try {
      const webhook = await svc.getWebhook(req.params.id);
      if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
      res.json({ success: true, data: webhook });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/webhooks', async (req, res) => {
    try {
      const { name, url } = req.body;
      if (!name || !url) {
        return res.status(400).json({ success: false, error: 'Name and URL are required' });
      }
      const webhook = await svc.createWebhook(req.body);
      res.json({ success: true, data: webhook });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/webhooks/:id', async (req, res) => {
    try {
      const webhook = await svc.updateWebhook(req.params.id, req.body);
      if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
      res.json({ success: true, data: webhook });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/webhooks/:id', async (req, res) => {
    try {
      await svc.deleteWebhook(req.params.id);
      res.json({ success: true, message: 'Webhook deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/webhooks/:id/logs', async (req, res) => {
    try {
      const logs = await svc.getWebhookLogs(req.params.id, parseInt(req.query.limit) || 50);
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/webhooks/:id/test', async (req, res) => {
    try {
      if (!services.webhookService) {
        return res.status(400).json({ success: false, error: 'Webhook service not initialized' });
      }
      const result = await services.webhookService.testWebhook(req.params.id);
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ── Notifications ─────────────────────────────────────────────

  router.get('/notifications', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      const notifications = await svc.getNotifications(userId, req.query);
      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/notifications/unread-count', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      const count = await svc.getUnreadCount(userId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/notifications/:id/read', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      const notification = await svc.markAsRead(req.params.id, userId);
      if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/notifications/read-all', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      await svc.markAllAsRead(userId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/notifications/:id/dismiss', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      const notification = await svc.dismissNotification(req.params.id, userId);
      if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Notification Channels ─────────────────────────────────────

  router.get('/notification-channels', async (req, res) => {
    try {
      const channels = await svc.getNotificationChannels(req.query);
      res.json({ success: true, data: channels });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/notification-channels/:id', async (req, res) => {
    try {
      const channel = await svc.getNotificationChannel(req.params.id);
      if (!channel) return res.status(404).json({ success: false, error: 'Channel not found' });
      res.json({ success: true, data: channel });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/notification-channels', async (req, res) => {
    try {
      const { name, channelType } = req.body;
      if (!name || !channelType) {
        return res.status(400).json({ success: false, error: 'Name and channelType are required' });
      }
      const channel = await svc.createNotificationChannel(req.body);
      res.json({ success: true, data: channel });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/notification-channels/:id', async (req, res) => {
    try {
      const channel = await svc.updateNotificationChannel(req.params.id, req.body);
      if (!channel) return res.status(404).json({ success: false, error: 'Channel not found' });
      res.json({ success: true, data: channel });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/notification-channels/:id', async (req, res) => {
    try {
      await svc.deleteNotificationChannel(req.params.id);
      res.json({ success: true, message: 'Channel deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Tags ──────────────────────────────────────────────────────

  router.get('/tags', async (req, res) => {
    try {
      const tags = await svc.getTags(req.query);
      res.json({ success: true, data: tags });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/tags/:id', async (req, res) => {
    try {
      const tag = await svc.getTag(req.params.id);
      if (!tag) return res.status(404).json({ success: false, error: 'Tag not found' });
      res.json({ success: true, data: tag });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/tags', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      const tag = await svc.createTag(req.body);
      res.json({ success: true, data: tag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/tags/:id', async (req, res) => {
    try {
      const tag = await svc.updateTag(req.params.id, req.body);
      if (!tag) return res.status(404).json({ success: false, error: 'Tag not found' });
      res.json({ success: true, data: tag });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/tags/:id', async (req, res) => {
    try {
      await svc.deleteTag(req.params.id);
      res.json({ success: true, message: 'Tag deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Tag Records (polymorphic) ─────────────────────────────────

  router.get('/tags/record/:type/:id', async (req, res) => {
    try {
      const tags = await svc.getTagsForRecord(req.params.type, parseInt(req.params.id));
      res.json({ success: true, data: tags });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/tags/record/:type/:id', async (req, res) => {
    try {
      const { tagId } = req.body;
      if (!tagId) return res.status(400).json({ success: false, error: 'tagId is required' });
      await svc.tagRecord(tagId, req.params.type, parseInt(req.params.id));
      res.json({ success: true, message: 'Tag applied' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/tags/record/:type/:id/:tagId', async (req, res) => {
    try {
      await svc.untagRecord(parseInt(req.params.tagId), req.params.type, parseInt(req.params.id));
      res.json({ success: true, message: 'Tag removed' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Comments (polymorphic) ────────────────────────────────────

  router.get('/comments/:type/:id', async (req, res) => {
    try {
      const comments = await svc.getComments(req.params.type, parseInt(req.params.id));
      res.json({ success: true, data: comments });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/comments/:type/:id', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      const { body, parentId } = req.body;
      if (!body) return res.status(400).json({ success: false, error: 'Comment body is required' });

      const comment = await svc.createComment({
        body,
        commentableType: req.params.type,
        commentableId: parseInt(req.params.id),
        parentId: parentId || null,
        userId
      });
      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.put('/comments/:id', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      const comment = await svc.updateComment(req.params.id, userId, req.body);
      if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });
      res.json({ success: true, data: comment });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/comments/:id', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
      await svc.deleteComment(req.params.id, userId);
      res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ── Attachments (polymorphic) ─────────────────────────────────

  router.get('/attachments/:type/:id', async (req, res) => {
    try {
      const attachments = await svc.getAttachments(req.params.type, parseInt(req.params.id));
      res.json({ success: true, data: attachments });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/attachments/:type/:id', async (req, res) => {
    try {
      const userId = req.user?.id;
      const { fileName, filePath, fileSize, mimeType } = req.body;
      if (!fileName || !filePath) {
        return res.status(400).json({ success: false, error: 'fileName and filePath are required' });
      }
      const attachment = await svc.createAttachment({
        fileName,
        filePath,
        fileSize,
        mimeType,
        attachableType: req.params.type,
        attachableId: parseInt(req.params.id),
        uploadedBy: userId
      });
      res.json({ success: true, data: attachment });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.delete('/attachments/:id', async (req, res) => {
    try {
      await svc.deleteAttachment(req.params.id);
      res.json({ success: true, message: 'Attachment deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
};

export default createRoutes;
