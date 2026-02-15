/**
 * NotificationService — Dispatches notifications to users via in-app and email channels.
 */

import { EmailService } from './email.service.js';

const emailService = new EmailService();

export class NotificationService {
  /**
   * @param {Object} notificationAdapter - DrizzleAdapter for notifications table
   * @param {Object} [channelAdapter] - DrizzleAdapter for notification_channels table
   */
  constructor(notificationAdapter, channelAdapter) {
    this.notifications = notificationAdapter;
    this.channels = channelAdapter;
  }

  /**
   * Send a notification to a single user.
   * @param {number} userId - Target user ID
   * @param {Object} notification
   * @param {string} notification.title
   * @param {string} notification.message
   * @param {string} [notification.type] - info, success, warning, error
   * @param {string} [notification.channel] - in_app, email, both
   * @param {string} [notification.relatedModel]
   * @param {number} [notification.relatedId]
   * @param {string} [notification.actionUrl]
   */
  async dispatch(userId, notification) {
    const record = await this.notifications.create({
      userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      channel: notification.channel || 'in_app',
      relatedModel: notification.relatedModel || null,
      relatedId: notification.relatedId || null,
      actionUrl: notification.actionUrl || null,
      status: 'unread',
    });

    // Send email if channel is email or both
    if (notification.channel === 'email' || notification.channel === 'both') {
      if (notification.email) {
        await emailService.sendEmail(
          notification.email,
          notification.title,
          `<p>${notification.message}</p>${notification.actionUrl ? `<p><a href="${notification.actionUrl}">View Details</a></p>` : ''}`
        );
      }
    }

    return record;
  }

  /**
   * Send a notification to multiple users.
   */
  async dispatchBulk(userIds, notification) {
    const results = [];
    for (const userId of userIds) {
      const result = await this.dispatch(userId, notification);
      results.push(result);
    }
    return results;
  }

  /**
   * Get notifications for a user.
   */
  async getNotifications(userId, options = {}) {
    const where = [['userId', '=', userId]];
    if (options.status) where.push(['status', '=', options.status]);
    if (options.type) where.push(['type', '=', options.type]);

    const result = await this.notifications.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
    return result;
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(userId) {
    return this.notifications.count([['userId', '=', userId], ['status', '=', 'unread']]);
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id, userId) {
    const notification = await this.notifications.findById(id);
    if (!notification || notification.userId !== userId) return null;
    return this.notifications.update(id, { status: 'read', readAt: new Date() });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(userId) {
    const result = await this.notifications.findAll({
      where: [['userId', '=', userId], ['status', '=', 'unread']],
      limit: 10000,
      offset: 0,
    });
    let count = 0;
    for (const n of result.rows) {
      await this.notifications.update(n.id, { status: 'read', readAt: new Date() });
      count++;
    }
    return { updated: count };
  }
}

export default NotificationService;
