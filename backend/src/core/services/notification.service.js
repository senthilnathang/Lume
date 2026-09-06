/**
 * NotificationService — Multi-channel dispatch (in_app, email, sms) with
 * per-channel delivery logging. Channel failures never fail the dispatch.
 */

import { EmailService } from './email.service.js';
import prisma from '../db/prisma.js';

const emailService = new EmailService();

function wantsChannel(requested, channel) {
  if (!requested || requested === 'in_app') {
    return channel === 'in_app';
  }
  if (requested === 'both') {
    return channel === 'in_app' || channel === 'email';
  }
  if (requested === 'all') {
    return true;
  }
  return requested.split(',').map((c) => c.trim()).includes(channel);
}

export class NotificationService {
  /**
   * @param {Object} notificationAdapter - DrizzleAdapter for notifications table
   * @param {Object} [channelAdapter] - DrizzleAdapter for notification_channels table
   * @param {Object} [deliveryAdapter] - DrizzleAdapter for notification_deliveries table
   * @param {Object} [options] - { userLookup, smsSender }
   */
  constructor(notificationAdapter, channelAdapter, deliveryAdapter = null, options = {}) {
    this.notifications = notificationAdapter;
    this.channels = channelAdapter;
    this.deliveries = deliveryAdapter;
    this.userLookup = options.userLookup || null;
    this.smsSender = options.smsSender || null;
  }

  async logDelivery(notificationId, channel, status, errorMessage = null) {
    if (!this.deliveries) {
      return null;
    }
    try {
      return await this.deliveries.create({
        notificationId,
        channel,
        status,
        errorMessage,
        sentAt: status === 'sent' ? new Date() : null,
      });
    } catch {
      return null;
    }
  }

  async resolveEmail(userId, notification) {
    if (notification.email) {
      return notification.email;
    }
    try {
      if (this.userLookup) {
        const user = await this.userLookup(userId);
        return user?.email || null;
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user?.email || null;
    } catch {
      return null;
    }
  }

  async sendSms(to, message) {
    if (this.smsSender) {
      return this.smsSender(to, message);
    }
    const providerUrl = process.env.SMS_PROVIDER_URL || '';
    if (!providerUrl) {
      throw new Error('SMS channel not configured (SMS_PROVIDER_URL)');
    }
    const res = await fetch(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    if (!res.ok) {
      throw new Error(`SMS provider responded ${res.status}`);
    }
  }

  /**
   * Send a notification to a single user.
   * @param {number} userId - Target user ID
   * @param {Object} notification
   * @param {string} notification.title
   * @param {string} notification.message
   * @param {string} [notification.type] - info, success, warning, error
   * @param {string} [notification.channel] - in_app, email, sms, both, all, or comma list
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
    const deliveries = {};

    if (wantsChannel(notification.channel, 'in_app')) {
      await this.logDelivery(record.id, 'in_app', 'sent');
      deliveries.in_app = 'sent';
    }

    if (wantsChannel(notification.channel, 'email')) {
      try {
        const to = await this.resolveEmail(userId, notification);
        if (!to) {
          throw new Error('No email address for user');
        }
        await emailService.sendEmail(
          to,
          notification.title,
          `<p>${notification.message}</p>${notification.actionUrl ? `<p><a href="${notification.actionUrl}">View Details</a></p>` : ''}`
        );
        await this.logDelivery(record.id, 'email', 'sent');
        deliveries.email = 'sent';
      } catch (error) {
        await this.logDelivery(record.id, 'email', 'failed', error.message);
        deliveries.email = 'failed';
      }
    }

    if (wantsChannel(notification.channel, 'sms')) {
      try {
        const to = notification.phone || notification.to;
        if (!to) {
          throw new Error('No phone number provided');
        }
        await this.sendSms(to, `${notification.title}: ${notification.message}`);
        await this.logDelivery(record.id, 'sms', 'sent');
        deliveries.sms = 'sent';
      } catch (error) {
        await this.logDelivery(record.id, 'sms', 'failed', error.message);
        deliveries.sms = 'failed';
      }
    }

    return { ...record, deliveries };
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
