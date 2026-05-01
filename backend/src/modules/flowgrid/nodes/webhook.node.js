import { AbstractWorkflowNode } from './base.node.js';

export class WebhookNode extends AbstractWorkflowNode {
  constructor() {
    super('webhook', {});
  }

  async validate(nodeConfig) {
    const errors = [];
    if (!nodeConfig.url) errors.push('url is required');
    if (nodeConfig.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(nodeConfig.method)) {
      errors.push('method must be GET, POST, PUT, DELETE, or PATCH');
    }
    return errors;
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

  async execute(nodeConfig, context) {
    const {
      url,
      method = 'GET',
      headers = {},
      body = null,
      auth = null,
      timeout = 30000,
      retries = 3
    } = nodeConfig;

    const response = await this.executeWithRetry(
      async () => {
        const fetchHeaders = { ...headers };

        if (auth) {
          if (auth.type === 'bearer' && auth.token) {
            fetchHeaders['Authorization'] = `Bearer ${auth.token}`;
          } else if (auth.type === 'basic' && auth.username && auth.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            fetchHeaders['Authorization'] = `Basic ${credentials}`;
          }
        }

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

          return {
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

    return response;
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      category: 'integration',
      description: 'Make HTTP requests to external APIs'
    };
  }
}
