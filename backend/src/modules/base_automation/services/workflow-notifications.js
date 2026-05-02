/**
 * Workflow Notification Service
 * Sends notifications on workflow state changes via multiple channels
 */

import serviceRegistry from '../../../core/services/service-registry.js';

export class WorkflowNotificationService {
  constructor(models) {
    this.models = models;
  }

  async notifyStateChange(executionId, workflowId, fromState, toState, context = {}) {
    const result = await this.models.WorkflowNotificationSetting.findAll({
      where: [
        ['workflowId', '=', workflowId],
        ['event', '=', 'state_changed'],
        ['status', '=', 'active']
      ]
    });

    if (!result.rows.length) return;

    const notifSvc = serviceRegistry.get('notificationService');
    const emailSvc = serviceRegistry.get('emailService');

    for (const setting of result.rows) {
      const recipient = this._resolveRecipient(setting.recipients, context);
      if (!recipient) continue;

      if (['in_app', 'all'].includes(setting.channel) && notifSvc) {
        notifSvc.dispatch(recipient.userId, {
          title: `Workflow: ${toState}`,
          message: `Transitioned from ${fromState} to ${toState}`,
          channel: 'in_app'
        }).catch(() => {});
      }

      if (['email', 'all'].includes(setting.channel) && emailSvc && recipient.email) {
        emailSvc.sendFromTemplate(recipient.email, setting.emailTemplate, {
          workflowName: context.workflowName || `Workflow #${workflowId}`,
          fromState,
          toState,
          recordId: context.recordId || '',
          timestamp: new Date().toLocaleString(),
          actionUrl: `${process.env.FRONTEND_URL || ''}/workflows/${workflowId}`,
          appName: process.env.APP_NAME || 'Lume'
        }).catch(() => {});
      }

      if (['slack', 'all'].includes(setting.channel) && setting.slackWebhookUrl) {
        this._sendSlack(setting.slackWebhookUrl, { workflowId, fromState, toState }).catch(() => {});
      }
    }
  }

  async _sendSlack(webhookUrl, { workflowId, fromState, toState }) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Workflow #${workflowId}: ${fromState} → ${toState}`,
        attachments: [{
          color: 'good',
          fields: [
            { title: 'Workflow', value: String(workflowId), short: true },
            { title: 'Transition', value: `${fromState} → ${toState}`, short: true }
          ]
        }]
      })
    });
  }

  _resolveRecipient(recipients, context) {
    if (recipients === 'submitter' && context.submitter) {
      return { userId: context.submitter.id, email: context.submitter.email };
    }
    return null;
  }
}

export default WorkflowNotificationService;
