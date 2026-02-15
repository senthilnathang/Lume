/**
 * Advanced Features Services
 * Uses DrizzleAdapter pattern for all model operations.
 */

export class AdvancedFeaturesService {
  constructor(models) {
    this.models = models;
  }

  // ── Webhooks ──────────────────────────────────────────────────

  async getWebhooks(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.Webhook.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async getWebhook(id) {
    return this.models.Webhook.findById(id);
  }

  async createWebhook(data) {
    return this.models.Webhook.create(data);
  }

  async updateWebhook(id, data) {
    const webhook = await this.models.Webhook.findById(id);
    if (!webhook) return null;
    return this.models.Webhook.update(id, data);
  }

  async deleteWebhook(id) {
    const webhook = await this.models.Webhook.findById(id);
    if (!webhook) return null;
    await this.models.Webhook.destroy(id);
    return webhook;
  }

  async getWebhookLogs(webhookId, limit = 50) {
    const result = await this.models.WebhookLog.findAll({
      where: [['webhookId', '=', webhookId]],
      order: [['createdAt', 'DESC']],
      limit
    });
    return result.rows;
  }

  // ── Notifications ─────────────────────────────────────────────

  async getNotifications(userId, filters = {}) {
    const where = [['userId', '=', userId]];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.type) where.push(['type', '=', filters.type]);

    const result = await this.models.Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 50
    });
    return result.rows;
  }

  async getUnreadCount(userId) {
    return this.models.Notification.count([['userId', '=', userId], ['status', '=', 'unread']]);
  }

  async createNotification(data) {
    return this.models.Notification.create(data);
  }

  async markAsRead(id, userId) {
    const result = await this.models.Notification.findAll({
      where: [['id', '=', id], ['userId', '=', userId]],
      limit: 1
    });
    const notification = result.rows[0];
    if (!notification) return null;
    return this.models.Notification.update(id, { status: 'read', readAt: new Date() });
  }

  async markAllAsRead(userId) {
    const unread = await this.models.Notification.findAll({
      where: [['userId', '=', userId], ['status', '=', 'unread']]
    });
    for (const n of unread.rows) {
      await this.models.Notification.update(n.id, { status: 'read', readAt: new Date() });
    }
  }

  async dismissNotification(id, userId) {
    const result = await this.models.Notification.findAll({
      where: [['id', '=', id], ['userId', '=', userId]],
      limit: 1
    });
    const notification = result.rows[0];
    if (!notification) return null;
    return this.models.Notification.update(id, { status: 'dismissed' });
  }

  // ── Notification Channels ─────────────────────────────────────

  async getNotificationChannels(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);

    const result = await this.models.NotificationChannel.findAll({
      where,
      order: [['name', 'ASC']]
    });
    return result.rows;
  }

  async getNotificationChannel(id) {
    return this.models.NotificationChannel.findById(id);
  }

  async createNotificationChannel(data) {
    return this.models.NotificationChannel.create(data);
  }

  async updateNotificationChannel(id, data) {
    const channel = await this.models.NotificationChannel.findById(id);
    if (!channel) return null;
    return this.models.NotificationChannel.update(id, data);
  }

  async deleteNotificationChannel(id) {
    const channel = await this.models.NotificationChannel.findById(id);
    if (!channel) return null;
    await this.models.NotificationChannel.destroy(id);
    return channel;
  }

  // ── Tags ──────────────────────────────────────────────────────

  async getTags(filters = {}) {
    const where = [];
    if (filters.category) where.push(['category', '=', filters.category]);

    const result = await this.models.Tag.findAll({
      where,
      order: [['name', 'ASC']]
    });
    return result.rows;
  }

  async getTag(id) {
    return this.models.Tag.findById(id);
  }

  async createTag(data) {
    return this.models.Tag.create(data);
  }

  async updateTag(id, data) {
    const tag = await this.models.Tag.findById(id);
    if (!tag) return null;
    return this.models.Tag.update(id, data);
  }

  async deleteTag(id) {
    const tag = await this.models.Tag.findById(id);
    if (!tag) return null;
    // Remove all taggings for this tag first
    const taggingResults = await this.models.Tagging.findAll({ where: [['tagId', '=', id]] });
    for (const t of taggingResults.rows) {
      await this.models.Tagging.destroy(t.id);
    }
    await this.models.Tag.destroy(id);
    return tag;
  }

  async getTagsForRecord(taggableType, taggableId) {
    const taggingResult = await this.models.Tagging.findAll({
      where: [['taggableType', '=', taggableType], ['taggableId', '=', taggableId]]
    });
    const tagIds = taggingResult.rows.map(t => t.tagId);
    if (tagIds.length === 0) return [];

    const result = await this.models.Tag.findAll({
      where: [['id', 'in', tagIds]]
    });
    return result.rows;
  }

  async tagRecord(tagId, taggableType, taggableId) {
    // Check if tagging already exists
    const existing = await this.models.Tagging.findAll({
      where: [['tagId', '=', tagId], ['taggableType', '=', taggableType], ['taggableId', '=', taggableId]],
      limit: 1
    });
    if (existing.rows.length > 0) return existing.rows[0];
    return this.models.Tagging.create({ tagId, taggableType, taggableId });
  }

  async untagRecord(tagId, taggableType, taggableId) {
    const existing = await this.models.Tagging.findAll({
      where: [['tagId', '=', tagId], ['taggableType', '=', taggableType], ['taggableId', '=', taggableId]],
      limit: 1
    });
    if (existing.rows.length > 0) {
      return this.models.Tagging.destroy(existing.rows[0].id);
    }
    return false;
  }

  // ── Comments ──────────────────────────────────────────────────

  async getComments(commentableType, commentableId) {
    const result = await this.models.Comment.findAll({
      where: [['commentableType', '=', commentableType], ['commentableId', '=', commentableId]],
      order: [['createdAt', 'ASC']]
    });
    return result.rows;
  }

  async createComment(data) {
    return this.models.Comment.create(data);
  }

  async updateComment(id, userId, data) {
    const result = await this.models.Comment.findAll({
      where: [['id', '=', id], ['userId', '=', userId]],
      limit: 1
    });
    const comment = result.rows[0];
    if (!comment) return null;
    return this.models.Comment.update(id, { body: data.body });
  }

  async deleteComment(id, userId) {
    const result = await this.models.Comment.findAll({
      where: [['id', '=', id], ['userId', '=', userId]],
      limit: 1
    });
    const comment = result.rows[0];
    if (!comment) return null;
    await this.models.Comment.destroy(id);
    return comment;
  }

  // ── Attachments ───────────────────────────────────────────────

  async getAttachments(attachableType, attachableId) {
    const result = await this.models.Attachment.findAll({
      where: [['attachableType', '=', attachableType], ['attachableId', '=', attachableId]],
      order: [['createdAt', 'DESC']]
    });
    return result.rows;
  }

  async createAttachment(data) {
    return this.models.Attachment.create(data);
  }

  async deleteAttachment(id) {
    const attachment = await this.models.Attachment.findById(id);
    if (!attachment) return null;
    await this.models.Attachment.destroy(id);
    return attachment;
  }
}

export default { AdvancedFeaturesService };
