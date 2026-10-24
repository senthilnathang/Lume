/**
 * Enhanced Notification Service
 * Manages notification templates, variable substitution, and multi-channel delivery tracking
 * Supports: email, slack, in_app, sms
 */

import serviceRegistry from '../../../core/services/service-registry.js';

const SUPPORTED_CHANNELS = ['email', 'slack', 'in_app', 'sms'];

export class EnhancedNotificationService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Send notification using a template with variable substitution
   * @param {number} templateId - ID of the notification template
   * @param {string} recipient - Recipient identifier (email, user ID, phone, etc.)
   * @param {Object} variables - Variables to substitute in template
   * @returns {Promise<Object>} Result with success flag and deliveryId
   */
  async sendFromTemplate(templateId, recipient, variables = {}) {
    // Fetch template
    const template = await this.models.NotificationTemplate.findById(templateId);
    if (!template) {
      throw new Error('Notification template not found');
    }

    if (!template.enabled) {
      throw new Error('Notification template is disabled');
    }

    if (!SUPPORTED_CHANNELS.includes(template.channel)) {
      throw new Error(`Unsupported notification channel: ${template.channel}`);
    }

    // Validate recipient format based on channel
    if (template.channel === 'email' && !this._isValidEmail(recipient)) {
      throw new Error(`Invalid email address: ${recipient}`);
    }
    if (template.channel === 'sms' && !this._isValidPhoneNumber(recipient)) {
      throw new Error(`Invalid phone number: ${recipient}`);
    }

    // Create delivery tracking record
    const delivery = await this.createDeliveryRecord(template, recipient, 'pending');

    try {
      // Substitute variables in subject and body
      const subject = template.subject
        ? this._substituteVariables(template.subject, variables)
        : '';
      const body = this._substituteVariables(template.body, variables);

      // Send by channel
      const result = await this._sendByChannel(
        template.channel,
        recipient,
        subject,
        body,
        delivery.id
      );

      if (result.success) {
        // Update delivery status to sent
        await this.updateDeliveryStatus(delivery.id, 'sent');
      } else {
        // Update delivery status to failed with reason
        await this.updateDeliveryStatus(delivery.id, 'failed', result.error);
      }

      return {
        success: result.success,
        deliveryId: delivery.id,
        error: result.error || null
      };
    } catch (error) {
      // Update delivery status to failed
      await this.updateDeliveryStatus(delivery.id, 'failed', error.message);

      return {
        success: false,
        deliveryId: delivery.id,
        error: error.message
      };
    }
  }

  /**
   * Create a delivery tracking record
   * @param {Object} template - Template object
   * @param {string} recipient - Recipient identifier
   * @param {string} status - Initial status (pending, sent, failed, bounce)
   * @returns {Promise<Object>} Created delivery record
   */
  async createDeliveryRecord(template, recipient, status = 'pending') {
    return this.models.NotificationDelivery.create({
      notificationId: template.id,
      channel: template.channel,
      recipient,
      status,
      metadata: {}
    });
  }

  /**
   * Update delivery status
   * @param {number} deliveryId - Delivery ID
   * @param {string} status - New status
   * @param {string} failureReason - Optional failure reason
   * @returns {Promise<Object>} Updated delivery record
   */
  async updateDeliveryStatus(deliveryId, status, failureReason = null) {
    const updates = { status };

    if (status === 'sent') {
      updates.sentAt = new Date();
    }

    if (status === 'failed' && failureReason) {
      updates.failureReason = failureReason;
    }

    return this.models.NotificationDelivery.update(deliveryId, updates);
  }

  /**
   * Get delivery history with optional filters
   * @param {Object} filters - Filter criteria (notificationId, status, recipient, etc.)
   * @returns {Promise<Object>} Result with rows and count
   */
  async getDeliveryHistory(filters = {}) {
    const where = [];

    if (filters.notificationId) {
      where.push(['notificationId', '=', filters.notificationId]);
    }

    if (filters.status) {
      where.push(['status', '=', filters.status]);
    }

    if (filters.channel) {
      where.push(['channel', '=', filters.channel]);
    }

    if (filters.recipient) {
      where.push(['recipient', '=', filters.recipient]);
    }

    return this.models.NotificationDelivery.findAll({
      where: where.length > 0 ? where : undefined,
      orderBy: [['createdAt', 'desc']]
    });
  }

  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone number format
   */
  _isValidPhoneNumber(phone) {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Substitute template variables with actual values
   * Replaces {{variable_name}} with corresponding values from variables object
   * @param {string} text - Text with template variables
   * @param {Object} variables - Variable values to substitute
   * @returns {string} Text with substituted variables
   */
  _substituteVariables(text, variables = {}) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    if (!variables || typeof variables !== 'object') {
      variables = {};
    }

    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] !== undefined ? variables[variable] : match;
    });
  }

  /**
   * Send notification by channel
   * @param {string} channel - Channel type (email, slack, in_app, sms)
   * @param {string} recipient - Recipient identifier
   * @param {string} subject - Message subject (for email)
   * @param {string} body - Message body
   * @param {number} deliveryId - Delivery tracking ID
   * @returns {Promise<Object>} Result with success flag
   */
  async _sendByChannel(channel, recipient, subject, body, _deliveryId) {
    switch (channel) {
      case 'email':
        return this._sendEmail(recipient, subject, body);
      case 'slack':
        return this._sendSlack(recipient, body);
      case 'in_app':
        return this._sendInApp(recipient, subject, body);
      case 'sms':
        return this._sendSMS(recipient, body);
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  /**
   * Send email notification
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @returns {Promise<Object>} Result with success flag
   */
  async _sendEmail(email, subject, body) {
    const emailService = serviceRegistry.get('emailService');
    if (!emailService) {
      throw new Error('Email service not available - notifications cannot be sent');
    }

    try {
      await emailService.send({
        to: email,
        subject,
        body,
        html: body
      });

      return { success: true };
    } catch (error) {
      console.error(`Email send failed for ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Slack notification
   * @param {string} userId - Slack user ID
   * @param {string} body - Message body
   * @returns {Promise<Object>} Result with success flag
   */
  async _sendSlack(userId, body) {
    const slackService = serviceRegistry.get('slackService');
    if (!slackService) {
      throw new Error('Slack service not available - notifications cannot be sent');
    }

    try {
      await slackService.sendDirectMessage(userId, body);

      return { success: true };
    } catch (error) {
      console.error(`Slack send failed for ${userId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send in-app notification
   * @param {string} userId - User ID
   * @param {string} subject - Notification subject
   * @param {string} body - Notification body
   * @returns {Promise<Object>} Result with success flag
   */
  async _sendInApp(userId, subject, body) {
    const notificationService = serviceRegistry.get('notificationService');
    if (!notificationService) {
      throw new Error('Notification service not available - notifications cannot be sent');
    }

    try {
      await notificationService.dispatch(userId, {
        title: subject,
        message: body,
        channel: 'in_app'
      });

      return { success: true };
    } catch (error) {
      console.error(`In-app send failed for ${userId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} body - Message body
   * @returns {Promise<Object>} Result with success flag
   */
  async _sendSMS(phoneNumber, body) {
    const smsService = serviceRegistry.get('smsService');
    if (!smsService) {
      throw new Error('SMS service not available - notifications cannot be sent');
    }

    try {
      await smsService.send(phoneNumber, body);

      return { success: true };
    } catch (error) {
      console.error(`SMS send failed for ${phoneNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new notification template
   * @param {Object} data - Template data
   * @returns {Promise<Object>} Created template
   */
  async createTemplate(data) {
    const { name, channel, subject, body, variables = {}, enabled = true, metadata = {} } = data;

    if (!name || !channel || !body) {
      throw new Error('Name, channel, and body are required');
    }

    if (!SUPPORTED_CHANNELS.includes(channel)) {
      throw new Error(`Unsupported channel: ${channel}`);
    }

    return this.models.NotificationTemplate.create({
      name,
      channel,
      subject,
      body,
      variables,
      enabled,
      metadata
    });
  }

  /**
   * Update a notification template
   * @param {number} templateId - Template ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated template
   */
  async updateTemplate(templateId, updates) {
    const template = await this.models.NotificationTemplate.findById(templateId);
    if (!template) {
      throw new Error('Notification template not found');
    }

    if (updates.channel && !SUPPORTED_CHANNELS.includes(updates.channel)) {
      throw new Error(`Unsupported channel: ${updates.channel}`);
    }

    return this.models.NotificationTemplate.update(templateId, updates);
  }

  /**
   * Get a notification template by ID
   * @param {number} templateId - Template ID
   * @returns {Promise<Object|null>} Template or null if not found
   */
  async getTemplate(templateId) {
    return this.models.NotificationTemplate.findById(templateId);
  }

  /**
   * List all notification templates
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Result with rows and count
   */
  async listTemplates(filters = {}) {
    const where = [];

    if (filters.channel) {
      where.push(['channel', '=', filters.channel]);
    }

    if (filters.enabled !== undefined) {
      where.push(['enabled', '=', filters.enabled]);
    }

    return this.models.NotificationTemplate.findAll({
      where: where.length > 0 ? where : undefined
    });
  }

  /**
   * Delete a notification template
   * @param {number} templateId - Template ID
   * @returns {Promise<void>}
   */
  async deleteTemplate(templateId) {
    return this.models.NotificationTemplate.delete(templateId);
  }

  /**
   * Get delivery stats for a template
   * @param {number} templateId - Template ID
   * @returns {Promise<Object>} Stats with sent, failed, pending counts
   */
  async getDeliveryStats(templateId) {
    const result = await this.models.NotificationDelivery.findAll({
      where: [['notificationId', '=', templateId]]
    });

    const rows = result.rows || [];
    const stats = {
      total: rows.length,
      sent: rows.filter(r => r.status === 'sent').length,
      failed: rows.filter(r => r.status === 'failed').length,
      pending: rows.filter(r => r.status === 'pending').length,
      bounce: rows.filter(r => r.status === 'bounce').length
    };

    return stats;
  }
}

export default EnhancedNotificationService;
