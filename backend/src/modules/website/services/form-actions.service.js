import { responseUtil } from '../../../shared/utils/index.js';

/**
 * Form Actions Service — Registry of action classes that execute after form submission.
 * Each action class has an execute(submission, config) method.
 */

// ─── Action Classes ───

class EmailAction {
  static type = 'email';
  static label = 'Send Email';
  static configSchema = [
    { key: 'to', label: 'To Email', type: 'text', required: true, placeholder: 'admin@example.com' },
    { key: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'New form submission: {{form_name}}' },
    { key: 'replyTo', label: 'Reply-To Field', type: 'text', placeholder: 'email (field name from form)' },
    { key: 'includeFields', label: 'Include All Fields', type: 'boolean', default: true },
  ];

  async execute(submission, config) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      });

      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      const subject = (config.subject || 'New form submission')
        .replace('{{form_name}}', submission.formName || 'Contact Form');

      // Build HTML body from submission data
      let htmlBody = `<h2>New Form Submission</h2>`;
      htmlBody += `<p><strong>Form:</strong> ${submission.formName || 'Unknown'}</p>`;
      htmlBody += `<p><strong>Submitted:</strong> ${new Date().toISOString()}</p>`;
      if (submission.ipAddress) {
        htmlBody += `<p><strong>IP:</strong> ${submission.ipAddress}</p>`;
      }
      htmlBody += `<hr><table style="border-collapse:collapse;width:100%">`;
      for (const [key, val] of Object.entries(data)) {
        if (key.startsWith('_')) continue; // skip meta fields
        htmlBody += `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">${key}</td><td style="padding:8px;border:1px solid #ddd">${val}</td></tr>`;
      }
      htmlBody += `</table>`;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@lume.dev',
        to: config.to,
        subject,
        html: htmlBody,
      };

      if (config.replyTo && data[config.replyTo]) {
        mailOptions.replyTo = data[config.replyTo];
      }

      await transporter.sendMail(mailOptions);
      return { success: true, action: 'email' };
    } catch (err) {
      console.error('[FormAction:Email] Error:', err.message);
      return { success: false, action: 'email', error: err.message };
    }
  }
}

class WebhookAction {
  static type = 'webhook';
  static label = 'Webhook (POST)';
  static configSchema = [
    { key: 'url', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://example.com/webhook' },
    { key: 'headers', label: 'Custom Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}' },
    { key: 'includeMetadata', label: 'Include IP/UserAgent', type: 'boolean', default: false },
  ];

  async execute(submission, config) {
    try {
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      const payload = {
        form_name: submission.formName || 'Unknown',
        submission_id: submission.id,
        submitted_at: new Date().toISOString(),
        fields: data,
      };

      if (config.includeMetadata) {
        payload.ip_address = submission.ipAddress;
        payload.user_agent = submission.userAgent;
      }

      let headers = { 'Content-Type': 'application/json' };
      if (config.headers) {
        try {
          const custom = typeof config.headers === 'string' ? JSON.parse(config.headers) : config.headers;
          headers = { ...headers, ...custom };
        } catch { /* ignore parse errors */ }
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      return { success: response.ok, action: 'webhook', status: response.status };
    } catch (err) {
      console.error('[FormAction:Webhook] Error:', err.message);
      return { success: false, action: 'webhook', error: err.message };
    }
  }
}

class SlackAction {
  static type = 'slack';
  static label = 'Slack Notification';
  static configSchema = [
    { key: 'webhookUrl', label: 'Slack Webhook URL', type: 'text', required: true, placeholder: 'https://hooks.slack.com/services/...' },
    { key: 'channel', label: 'Channel (optional)', type: 'text', placeholder: '#general' },
    { key: 'username', label: 'Bot Name', type: 'text', default: 'Lume Forms' },
  ];

  async execute(submission, config) {
    try {
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      const fields = Object.entries(data)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `*${k}:* ${v}`)
        .join('\n');

      const payload = {
        text: `:incoming_envelope: *New Form Submission* — ${submission.formName || 'Contact Form'}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:incoming_envelope: *New Form Submission*\n*Form:* ${submission.formName || 'Contact Form'}\n*Time:* ${new Date().toISOString()}`,
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: fields || '_No fields_' },
          },
        ],
      };

      if (config.channel) payload.channel = config.channel;
      if (config.username) payload.username = config.username;

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      return { success: response.ok, action: 'slack', status: response.status };
    } catch (err) {
      console.error('[FormAction:Slack] Error:', err.message);
      return { success: false, action: 'slack', error: err.message };
    }
  }
}

class DiscordAction {
  static type = 'discord';
  static label = 'Discord Notification';
  static configSchema = [
    { key: 'webhookUrl', label: 'Discord Webhook URL', type: 'text', required: true, placeholder: 'https://discord.com/api/webhooks/...' },
    { key: 'username', label: 'Bot Name', type: 'text', default: 'Lume Forms' },
  ];

  async execute(submission, config) {
    try {
      const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
      const fieldLines = Object.entries(data)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => ({ name: k, value: String(v), inline: true }));

      const payload = {
        username: config.username || 'Lume Forms',
        embeds: [{
          title: `New Submission — ${submission.formName || 'Contact Form'}`,
          color: 0x1677ff,
          fields: fieldLines.slice(0, 25), // Discord limit
          timestamp: new Date().toISOString(),
          footer: { text: `IP: ${submission.ipAddress || 'unknown'}` },
        }],
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      return { success: response.ok || response.status === 204, action: 'discord', status: response.status };
    } catch (err) {
      console.error('[FormAction:Discord] Error:', err.message);
      return { success: false, action: 'discord', error: err.message };
    }
  }
}

class RedirectAction {
  static type = 'redirect';
  static label = 'Redirect After Submit';
  static configSchema = [
    { key: 'url', label: 'Redirect URL', type: 'text', required: true, placeholder: 'https://example.com/thank-you' },
  ];

  async execute(submission, config) {
    // Redirect is handled client-side; the action returns the redirect URL in the response
    return { success: true, action: 'redirect', redirectUrl: config.url };
  }
}

// ─── Action Registry ───

const actionRegistry = new Map();
actionRegistry.set('email', EmailAction);
actionRegistry.set('webhook', WebhookAction);
actionRegistry.set('slack', SlackAction);
actionRegistry.set('discord', DiscordAction);
actionRegistry.set('redirect', RedirectAction);

/**
 * FormActionsService — manages action execution for form submissions.
 */
export class FormActionsService {
  /**
   * Get list of available action types with their config schemas.
   */
  getAvailableActions() {
    const actions = [];
    for (const [type, ActionClass] of actionRegistry) {
      actions.push({
        type,
        label: ActionClass.label,
        configSchema: ActionClass.configSchema,
      });
    }
    return responseUtil.success(actions);
  }

  /**
   * Execute all configured actions for a form submission.
   * @param {object} submission - { id, formId, data, ipAddress, userAgent, formName }
   * @param {Array} actions - Array of { type, config } objects from form settings
   * @returns {object} Results of all action executions
   */
  async executeActions(submission, actions = []) {
    if (!actions || !actions.length) return { results: [] };

    const results = [];
    for (const action of actions) {
      const ActionClass = actionRegistry.get(action.type);
      if (!ActionClass) {
        results.push({ success: false, action: action.type, error: 'Unknown action type' });
        continue;
      }
      const instance = new ActionClass();
      try {
        const result = await instance.execute(submission, action.config || {});
        results.push(result);
      } catch (err) {
        console.error(`[FormAction:${action.type}] Unhandled error:`, err.message);
        results.push({ success: false, action: action.type, error: err.message });
      }
    }

    return { results };
  }
}

export default FormActionsService;
