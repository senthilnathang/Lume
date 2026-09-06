import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { smsProviders, smsTemplates, smsLogs } from '../models/schema.js';

export function renderTemplate(body, variables = {}) {
  return String(body || '').replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (match, key) => {
    const value = key.split('.').reduce((obj, part) => (obj == null ? obj : obj[part]), variables);
    return value === undefined || value === null ? match : String(value);
  });
}

export class SmsService {
  constructor(overrides = {}) {
    this.providers = overrides.providers || new DrizzleAdapter(smsProviders);
    this.templates = overrides.templates || new DrizzleAdapter(smsTemplates);
    this.logs = overrides.logs || new DrizzleAdapter(smsLogs);
  }

  async pickProvider(providerId = null) {
    if (providerId) {
      const provider = await this.providers.findById(providerId);
      if (!provider || provider.isActive === false) {
        throw new Error('SMS provider not available');
      }
      return provider;
    }
    const { rows } = await this.providers.findAll({ limit: 100, offset: 0 });
    const active = (rows || []).filter((p) => p.isActive !== false);
    if (!active.length) {
      throw new Error('No active SMS provider configured');
    }
    return active.find((p) => p.isDefault) || active[0];
  }

  async deliver(provider, to, body) {
    const config = typeof provider.config === 'string' ? JSON.parse(provider.config || '{}') : provider.config || {};
    if (provider.providerType === 'log') {
      return { provider: provider.name, logged: true };
    }
    const url = config.url || process.env.SMS_PROVIDER_URL || '';
    if (!url) {
      throw new Error('SMS provider has no URL configured');
    }
    const headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, message: body, ...(config.extraBody || {}) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(`SMS provider responded ${res.status}`);
    }
    return { provider: provider.name, status: res.status };
  }

  async send({ to, body, templateCode, variables = {}, providerId = null }) {
    if (!to) {
      throw new Error('Recipient number is required');
    }
    let text = body || '';
    if (templateCode) {
      const { rows } = await this.templates.findAll({ limit: 1000, offset: 0 });
      const template = (rows || []).find((t) => t.code === templateCode && t.isActive !== false);
      if (!template) {
        throw new Error(`SMS template not found: ${templateCode}`);
      }
      text = renderTemplate(template.body, variables);
    }
    if (!text) {
      throw new Error('Message body is required');
    }
    const provider = await this.pickProvider(providerId);
    let status = 'sent';
    let errorMessage = null;
    try {
      await this.deliver(provider, to, text);
    } catch (error) {
      status = 'failed';
      errorMessage = error.message;
    }
    const log = await this.logs.create({
      providerId: provider.id,
      toNumber: to,
      body: text,
      status,
      errorMessage,
      sentAt: status === 'sent' ? new Date() : null,
    });
    if (status === 'failed') {
      const error = new Error(errorMessage);
      error.logId = log.id;
      throw error;
    }
    return { logId: log.id, status, provider: provider.name };
  }

  async sendBulk(items) {
    const results = [];
    for (const item of items || []) {
      try {
        results.push({ to: item.to, ...(await this.send(item)) });
      } catch (error) {
        results.push({ to: item.to, status: 'failed', error: error.message, logId: error.logId || null });
      }
    }
    return results;
  }

  async retry(logId) {
    const log = await this.logs.findById(logId);
    if (!log) {
      throw new Error('SMS log not found');
    }
    return this.send({ to: log.toNumber || log.to, body: log.body, providerId: log.providerId });
  }

  async createProvider(data) {
    if (!data?.name) {
      throw new Error('Provider name is required');
    }
    if (data.isDefault) {
      const { rows } = await this.providers.findAll({ limit: 1000, offset: 0 });
      await Promise.all((rows || []).filter((p) => p.isDefault).map((p) => this.providers.update(p.id, { isDefault: false })));
    }
    return this.providers.create({
      name: data.name,
      providerType: data.providerType || data.provider_type || 'webhook',
      config: data.config || {},
      isDefault: !!data.isDefault,
      isActive: data.isActive !== false,
    });
  }

  createTemplate(data) {
    if (!data?.name || !data?.code || !data?.body) {
      throw new Error('Template name, code, and body are required');
    }
    return this.templates.create({
      name: data.name,
      code: data.code,
      body: data.body,
      locale: data.locale || 'en',
      isActive: data.isActive !== false,
    });
  }
}

export default SmsService;
