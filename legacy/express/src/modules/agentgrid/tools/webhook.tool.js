import { AbstractTool } from './base.tool.js';

export class WebhookTool extends AbstractTool {
  constructor() {
    super('call_webhook', {});
  }

  async executeWithRetry(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  async execute(args, context) {
    const { url, method = 'GET', headers = {}, body = null, timeout = 30000, retries = 3 } = args;

    return await this.executeWithRetry(
      async () => {
        const fetchHeaders = { ...headers };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const fetchOptions = {
            method,
            headers: fetchHeaders,
            signal: controller.signal
          };

          if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
            if (typeof body === 'object' && !headers['Content-Type']) {
              fetchOptions.headers['Content-Type'] = 'application/json';
            }
          }

          const res = await fetch(url, fetchOptions);
          const data = await res.text();

          context?.logger?.('info', `Webhook ${url} returned ${res.status}`, { url, status: res.status });

          return {
            success: res.ok,
            status: res.status,
            statusText: res.statusText,
            data: data.startsWith('{') || data.startsWith('[') ? JSON.parse(data) : data,
            headers: Object.fromEntries(res.headers.entries())
          };
        } finally {
          clearTimeout(timeoutId);
        }
      },
      retries
    );
  }

  getSchema() {
    return {
      type: 'function',
      function: {
        name: 'call_webhook',
        description: 'Call an HTTP webhook with optional retry and timeout',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The HTTP URL to call' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method' },
            headers: { type: 'object', description: 'Request headers' },
            body: { type: 'object', description: 'Request body' },
            timeout: { type: 'number', description: 'Request timeout in ms (default 30000)' },
            retries: { type: 'number', description: 'Max retries (default 3)' }
          },
          required: ['url']
        }
      }
    };
  }
}
