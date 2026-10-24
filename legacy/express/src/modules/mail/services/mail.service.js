import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { mailServers, mailRoutingRules, mailMessages, mailQueue } from '../models/schema.js';

export function matchesFilter(pattern, value) {
  if (!pattern) {
    return true;
  }
  try {
    return new RegExp(pattern, 'i').test(String(value ?? ''));
  } catch {
    return String(value ?? '').toLowerCase().includes(String(pattern).toLowerCase());
  }
}

export function applyMappings(message, mappings = {}) {
  const out = {};
  for (const [source, target] of Object.entries(mappings || {})) {
    if (typeof target !== 'string') {
      continue;
    }
    if (source in (message || {})) {
      out[target] = message[source];
    }
  }
  return out;
}

export class MailService {
  static fetchLocks = new Set();

  constructor(overrides = {}, prismaClient = null) {
    this.servers = overrides.servers || new DrizzleAdapter(mailServers);
    this.rules = overrides.rules || new DrizzleAdapter(mailRoutingRules);
    this.messages = overrides.messages || new DrizzleAdapter(mailMessages);
    this.queue = overrides.queue || new DrizzleAdapter(mailQueue);
    this.prisma = prismaClient;
    this.emailSender = overrides.emailSender || null;
  }

  async listRules() {
    const result = await this.rules.findAll({ limit: 200, offset: 0, order: [['priority', 'ASC']] });
    return result.rows || result;
  }

  async createRule(data) {
    if (!data?.name) {
      throw new Error('Rule name is required');
    }
    return this.rules.create({
      name: data.name,
      isActive: data.isActive !== false,
      priority: data.priority ?? 10,
      fromFilter: data.fromFilter || data.from_filter || null,
      subjectFilter: data.subjectFilter || data.subject_filter || null,
      bodyFilter: data.bodyFilter || data.body_filter || null,
      toFilter: data.toFilter || data.to_filter || null,
      action: data.action || 'create_record',
      targetEntity: data.targetEntity || data.target_entity || null,
      fieldMappings: data.fieldMappings || data.field_mappings || {},
      replySubject: data.replySubject || data.reply_subject || null,
      replyBody: data.replyBody || data.reply_body || null,
      companyId: data.companyId || data.company_id || null,
    });
  }

  ruleMatches(rule, message) {
    return matchesFilter(rule.fromFilter, message.from)
      && matchesFilter(rule.subjectFilter, message.subject)
      && matchesFilter(rule.bodyFilter, message.body)
      && matchesFilter(rule.toFilter, message.to);
  }

  async routeMessage(message, companyId = null) {
    const rules = await this.listRules();
    const candidates = (Array.isArray(rules) ? rules : [])
      .filter((r) => r.isActive !== false)
      .filter((r) => !companyId || !r.companyId || Number(r.companyId) === Number(companyId))
      .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
    for (const rule of candidates) {
      if (this.ruleMatches(rule, message)) {
        return this.applyRule(rule, message, companyId);
      }
    }
    return { matched: false };
  }

  async applyRule(rule, message, companyId = null) {
    const stored = await this.messages.create({
      direction: 'inbound',
      fromAddress: message.from || null,
      toAddress: message.to || null,
      subject: message.subject || null,
      body: message.body || null,
      messageId: message.messageId || message.message_id || null,
      status: 'received',
      routedRuleId: rule.id,
      companyId,
    });
    let createdRecord = null;
    if (rule.action === 'create_record' && rule.targetEntity && this.prisma) {
      const entity = await this.prisma.entity.findFirst({ where: { name: rule.targetEntity } });
      if (entity) {
        createdRecord = await this.prisma.entityRecord.create({
          data: {
            entityId: entity.id,
            data: JSON.stringify(applyMappings(message, rule.fieldMappings)),
            companyId,
            visibility: 'private',
            createdBy: 1,
          },
        });
      }
    }
    if (rule.replySubject || rule.replyBody) {
      await this.enqueue({
        to: message.from,
        subject: rule.replySubject || `Re: ${message.subject || ''}`,
        bodyText: rule.replyBody || '',
      });
    }
    return { matched: true, ruleId: rule.id, messageId: stored.id, recordId: createdRecord?.id || null };
  }

  enqueue(data) {
    if (!data?.to || !data?.subject) {
      throw new Error('Queued mail requires a recipient and subject');
    }
    return this.queue.create({
      toAddress: data.to,
      subject: data.subject,
      bodyHtml: data.bodyHtml || data.body_html || null,
      bodyText: data.bodyText || data.body_text || null,
      status: 'pending',
      attempts: 0,
      maxAttempts: data.maxAttempts || data.max_attempts || 3,
    });
  }

  async processQueue(limit = 10) {
    const { rows } = await this.queue.findAll({ limit: 200, offset: 0 });
    const due = (rows || []).filter((m) => m.status === 'pending' && (m.attempts || 0) < (m.maxAttempts || 3)).slice(0, limit);
    const results = [];
    for (const item of due) {
      try {
        if (this.emailSender) {
          await this.emailSender(item);
        } else {
          const { EmailService } = await import('../../../core/services/email.service.js');
          await new EmailService().sendEmail(item.toAddress, item.subject, item.bodyHtml || `<p>${item.bodyText || ''}</p>`, item.bodyText);
        }
        await this.queue.update(item.id, { status: 'sent', sentAt: new Date(), errorMessage: null });
        results.push({ id: item.id, status: 'sent' });
      } catch (error) {
        const attempts = (item.attempts || 0) + 1;
        const exhausted = attempts >= (item.maxAttempts || 3);
        await this.queue.update(item.id, {
          status: exhausted ? 'failed' : 'pending',
          attempts,
          errorMessage: error.message,
        });
        results.push({ id: item.id, status: exhausted ? 'failed' : 'retry', error: error.message });
      }
    }
    return results;
  }

  async fetchServer(serverId, options = {}) {
    if (MailService.fetchLocks.has(Number(serverId))) {
      throw new Error('Fetch already in progress for this server');
    }
    MailService.fetchLocks.add(Number(serverId));
    try {
      return await this.runFetch(serverId, options);
    } finally {
      MailService.fetchLocks.delete(Number(serverId));
    }
  }

  async runFetch(serverId, options = {}) {
    const server = await this.servers.findById(serverId);
    if (!server) {
      throw new Error('Mail server not found');
    }
    const maxMessages = Math.min(Number(options.limit) || 100, 500);
    let client = null;
    try {
      if (options.clientFactory) {
        client = await options.clientFactory(server);
      } else {
        const { ImapFlow } = await import('imapflow');
        client = new ImapFlow({
          host: server.host,
          port: server.port || 993,
          secure: server.useTls !== false,
          auth: { user: server.username, pass: server.password },
          logger: false,
        });
        await client.connect();
      }
      const lock = await client.getMailboxLock('INBOX');
      const stored = [];
      let skipped = 0;
      try {
        const since = server.lastFetchAt ? new Date(server.lastFetchAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        for await (const msg of client.fetch({ since }, { envelope: true, bodyParts: ['text'] })) {
          if (stored.length + skipped >= maxMessages) {
            break;
          }
          const envelope = msg.envelope || {};
          const part = msg.bodyParts?.get('text');
          const body = part ? Buffer.from(part).toString('utf8').slice(0, 20000) : '';
          const message = {
            from: envelope.from?.[0]?.address || '',
            to: envelope.to?.[0]?.address || '',
            subject: envelope.subject || '',
            body,
            messageId: envelope.messageId || null,
          };
          if (message.messageId && await this.findMessageById(message.messageId)) {
            skipped += 1;
            continue;
          }
          const row = await this.messages.create({
            direction: 'inbound',
            serverId: server.id,
            fromAddress: message.from,
            toAddress: message.to,
            subject: message.subject,
            body: message.body,
            messageId: message.messageId,
            status: 'received',
            companyId: null,
          });
          stored.push(row.id);
          await this.routeMessage(message, null).catch(() => {});
        }
      } finally {
        await lock.release();
      }
      await this.servers.update(server.id, { lastFetchAt: new Date(), lastError: null });
      return { fetched: stored.length, skipped, messageIds: stored };
    } catch (error) {
      try {
        await this.servers.update(server.id, { lastError: String(error.message || error).slice(0, 500) });
      } catch {
        /* never fail status bookkeeping */
      }
      throw error;
    } finally {
      if (client && !options.clientFactory) {
        await client.logout().catch(() => {});
      }
    }
  }

  async findMessageById(messageId) {
    if (!messageId || !this.messages.findByMessageId) {
      if (!messageId) {
        return null;
      }
      try {
        const { rows } = await this.messages.findAll({ limit: 1000, offset: 0 });
        return (rows || []).find((m) => m.messageId === messageId) || null;
      } catch {
        return null;
      }
    }
    try {
      return await this.messages.findByMessageId(messageId);
    } catch {
      return null;
    }
  }
}

export default MailService;
