/**
 * WebhookService — Dispatches webhook HTTP requests with retry and logging.
 * Finds matching webhooks by event/model, sends HTTP POST with HMAC signature,
 * retries on failure, and logs all attempts.
 */

import crypto from 'crypto';

export class WebhookService {
  /**
   * @param {Object} webhookAdapter - DrizzleAdapter for webhooks table
   * @param {Object} webhookLogAdapter - DrizzleAdapter for webhook_logs table
   */
  constructor(webhookAdapter, webhookLogAdapter) {
    this.webhooks = webhookAdapter;
    this.webhookLogs = webhookLogAdapter;
  }

  /**
   * Trigger all matching webhooks for an event.
   * @param {string} event - Event name e.g. 'record.created', 'record.updated', 'record.deleted'
   * @param {string} model - Model name e.g. 'activities', 'donations'
   * @param {Object} payload - Event data to send
   */
  async triggerWebhooks(event, model, payload) {
    const result = await this.webhooks.findAll({
      where: [['status', '=', 'active']],
      limit: 1000,
      offset: 0,
    });

    const matching = result.rows.filter(wh => {
      const events = typeof wh.events === 'string' ? JSON.parse(wh.events) : (wh.events || []);
      const matchesEvent = events.includes(event) || events.includes('*');
      const matchesModel = !wh.model || wh.model === model || wh.model === '*';
      return matchesEvent && matchesModel;
    });

    const results = [];
    for (const webhook of matching) {
      const result = await this._dispatch(webhook, event, payload);
      results.push(result);
    }
    return results;
  }

  /**
   * Send a test request to a specific webhook.
   */
  async testWebhook(webhookId) {
    const webhook = await this.webhooks.findById(webhookId);
    if (!webhook) return { error: 'Webhook not found' };

    const testPayload = {
      event: 'webhook.test',
      model: 'test',
      data: { message: 'This is a test webhook delivery', timestamp: new Date().toISOString() },
    };

    return this._dispatch(webhook, 'webhook.test', testPayload);
  }

  /**
   * Dispatch a single webhook with retry logic.
   */
  async _dispatch(webhook, event, payload) {
    const maxRetries = webhook.retryCount || 3;
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Lume-Webhook/1.0',
      'X-Webhook-Event': event,
      'X-Webhook-Delivery': crypto.randomUUID(),
    };

    // Add HMAC signature if webhook has a secret
    if (webhook.secret) {
      const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Merge custom headers
    const customHeaders = typeof webhook.headers === 'string'
      ? JSON.parse(webhook.headers || '{}')
      : (webhook.headers || {});
    Object.assign(headers, customHeaders);

    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        const responseBody = await response.text().catch(() => '');

        // Log the attempt
        await this.webhookLogs.create({
          webhookId: webhook.id,
          event,
          payload: body,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 2000),
          duration,
          status: response.ok ? 'success' : 'failed',
        });

        if (response.ok) {
          await this.webhooks.update(webhook.id, { lastTriggeredAt: new Date() });
          return { success: true, webhookId: webhook.id, status: response.status, duration };
        }

        lastError = `HTTP ${response.status}`;
      } catch (error) {
        const duration = Date.now() - startTime;
        lastError = error.message;

        await this.webhookLogs.create({
          webhookId: webhook.id,
          event,
          payload: body,
          responseStatus: 0,
          responseBody: error.message,
          duration,
          status: 'failed',
        });
      }

      // Exponential backoff: 1s, 5s, 25s
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(5, attempt) * 1000));
      }
    }

    return { success: false, webhookId: webhook.id, error: lastError };
  }
}

export default WebhookService;
