/**
 * Advanced Features Services
 */

export class AdvancedFeaturesService {
  constructor(models, sequelize) {
    this.models = models;
    this.sequelize = sequelize;
  }

  // ── Webhooks ──────────────────────────────────────────────────

  async getWebhooks(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.Webhook.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getWebhook(id) {
    return this.models.Webhook.findByPk(id);
  }

  async createWebhook(data) {
    return this.models.Webhook.create(data);
  }

  async updateWebhook(id, data) {
    const webhook = await this.models.Webhook.findByPk(id);
    if (!webhook) return null;
    await webhook.update(data);
    return webhook;
  }

  async deleteWebhook(id) {
    const webhook = await this.models.Webhook.findByPk(id);
    if (webhook) await webhook.destroy();
    return webhook;
  }

  async getWebhookLogs(webhookId, limit = 50) {
    return this.models.WebhookLog.findAll({
      where: { webhookId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  // ── Notifications ─────────────────────────────────────────────

  async getNotifications(userId, filters = {}) {
    const where = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return this.models.Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: filters.limit || 50
    });
  }

  async getUnreadCount(userId) {
    return this.models.Notification.count({
      where: { userId, status: 'unread' }
    });
  }

  async createNotification(data) {
    return this.models.Notification.create(data);
  }

  async markAsRead(id, userId) {
    const notification = await this.models.Notification.findOne({
      where: { id, userId }
    });
    if (!notification) return null;
    await notification.update({ status: 'read', readAt: new Date() });
    return notification;
  }

  async markAllAsRead(userId) {
    await this.models.Notification.update(
      { status: 'read', readAt: new Date() },
      { where: { userId, status: 'unread' } }
    );
  }

  async dismissNotification(id, userId) {
    const notification = await this.models.Notification.findOne({
      where: { id, userId }
    });
    if (!notification) return null;
    await notification.update({ status: 'dismissed' });
    return notification;
  }

  // ── Notification Channels ─────────────────────────────────────

  async getNotificationChannels(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;

    return this.models.NotificationChannel.findAll({
      where,
      order: [['name', 'ASC']]
    });
  }

  async getNotificationChannel(id) {
    return this.models.NotificationChannel.findByPk(id);
  }

  async createNotificationChannel(data) {
    return this.models.NotificationChannel.create(data);
  }

  async updateNotificationChannel(id, data) {
    const channel = await this.models.NotificationChannel.findByPk(id);
    if (!channel) return null;
    await channel.update(data);
    return channel;
  }

  async deleteNotificationChannel(id) {
    const channel = await this.models.NotificationChannel.findByPk(id);
    if (channel) await channel.destroy();
    return channel;
  }

  // ── Tags ──────────────────────────────────────────────────────

  async getTags(filters = {}) {
    const where = {};
    if (filters.category) where.category = filters.category;

    return this.models.Tag.findAll({
      where,
      order: [['name', 'ASC']]
    });
  }

  async getTag(id) {
    return this.models.Tag.findByPk(id);
  }

  async createTag(data) {
    return this.models.Tag.create(data);
  }

  async updateTag(id, data) {
    const tag = await this.models.Tag.findByPk(id);
    if (!tag) return null;
    await tag.update(data);
    return tag;
  }

  async deleteTag(id) {
    const tag = await this.models.Tag.findByPk(id);
    if (tag) {
      await this.models.Tagging.destroy({ where: { tagId: id } });
      await tag.destroy();
    }
    return tag;
  }

  async getTagsForRecord(taggableType, taggableId) {
    const taggings = await this.models.Tagging.findAll({
      where: { taggableType, taggableId }
    });
    const tagIds = taggings.map(t => t.tagId);
    if (tagIds.length === 0) return [];

    const { Op } = (await import('sequelize')).default || await import('sequelize');
    return this.models.Tag.findAll({
      where: { id: { [Op.in]: tagIds } }
    });
  }

  async tagRecord(tagId, taggableType, taggableId) {
    return this.models.Tagging.findOrCreate({
      where: { tagId, taggableType, taggableId }
    });
  }

  async untagRecord(tagId, taggableType, taggableId) {
    return this.models.Tagging.destroy({
      where: { tagId, taggableType, taggableId }
    });
  }

  // ── Comments ──────────────────────────────────────────────────

  async getComments(commentableType, commentableId) {
    return this.models.Comment.findAll({
      where: { commentableType, commentableId },
      order: [['createdAt', 'ASC']]
    });
  }

  async createComment(data) {
    return this.models.Comment.create(data);
  }

  async updateComment(id, userId, data) {
    const comment = await this.models.Comment.findOne({
      where: { id, userId }
    });
    if (!comment) return null;
    await comment.update({ body: data.body });
    return comment;
  }

  async deleteComment(id, userId) {
    const comment = await this.models.Comment.findOne({
      where: { id, userId }
    });
    if (comment) await comment.destroy();
    return comment;
  }

  // ── Attachments ───────────────────────────────────────────────

  async getAttachments(attachableType, attachableId) {
    return this.models.Attachment.findAll({
      where: { attachableType, attachableId },
      order: [['createdAt', 'DESC']]
    });
  }

  async createAttachment(data) {
    return this.models.Attachment.create(data);
  }

  async deleteAttachment(id) {
    const attachment = await this.models.Attachment.findByPk(id);
    if (attachment) await attachment.destroy();
    return attachment;
  }
}

export default { AdvancedFeaturesService };
