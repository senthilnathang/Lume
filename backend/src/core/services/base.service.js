/**
 * BaseService - Generic CRUD service class
 * Works with any ORM adapter (Prisma or Drizzle).
 *
 * Usage:
 *   import { BaseService } from '../../core/services/base.service.js';
 *   import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
 *   import { activities } from './models/schema.js';
 *   const adapter = new DrizzleAdapter(activities);
 *   const service = new BaseService(adapter, { softDelete: true });
 */

import { BaseAdapter } from '../db/adapters/base-adapter.js';
import serviceRegistry from './service-registry.js';

export class BaseService {
  /**
   * @param {BaseAdapter} adapter - An adapter instance (PrismaAdapter or DrizzleAdapter)
   * @param {Object} options
   * @param {boolean} options.softDelete - Enable soft deletes (default true)
   * @param {boolean} options.audit - Enable audit fields (default true)
   * @param {string} options.modelName - Model name for hooks (webhooks, rules)
   */
  constructor(adapter, options = {}) {
    if (!(adapter instanceof BaseAdapter)) {
      throw new Error('BaseService requires a BaseAdapter instance (PrismaAdapter or DrizzleAdapter)');
    }
    this.adapter = adapter;
    this.softDelete = options.softDelete !== false;
    this.auditEnabled = options.audit !== false;
    this.modelName = options.modelName || null;
  }

  /**
   * Search records with pagination and domain filtering
   */
  async search(options = {}) {
    const {
      page = 1,
      limit = 20,
      domain = [],
      order = [['created_at', 'DESC']],
      include,
    } = options;

    // Add soft-delete filter
    const effectiveDomain = [...domain];
    if (this.softDelete) {
      effectiveDomain.push(['deleted_at', '=', null]);
    }

    const { rows, count } = await this.adapter.findAll({
      where: effectiveDomain,
      order,
      limit,
      offset: (page - 1) * limit,
      include,
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Count records matching a domain
   */
  async searchCount(domain = []) {
    const effectiveDomain = [...domain];
    if (this.softDelete) {
      effectiveDomain.push(['deleted_at', '=', null]);
    }
    return this.adapter.count(effectiveDomain);
  }

  /**
   * Read a single record by ID
   */
  async read(id, options = {}) {
    return this.adapter.findById(id, options);
  }

  /**
   * Create a new record
   */
  async create(vals, context = {}) {
    if (this.auditEnabled && context.userId) {
      vals.created_by = context.userId;
      vals.updated_by = context.userId;
    }

    // Evaluate business rules before create
    const ruleUpdates = await this._evaluateRules('create', vals, context);
    if (ruleUpdates) Object.assign(vals, ruleUpdates);

    const record = await this.adapter.create(vals);

    // Fire post-create hooks (non-blocking)
    this._fireWebhook('record.created', record).catch(() => {});

    return record;
  }

  /**
   * Update an existing record
   */
  async update(id, vals, context = {}) {
    if (this.auditEnabled && context.userId) {
      vals.updated_by = context.userId;
    }
    vals.updated_at = new Date();

    // Evaluate business rules before update
    const ruleUpdates = await this._evaluateRules('update', vals, context);
    if (ruleUpdates) Object.assign(vals, ruleUpdates);

    const record = await this.adapter.update(id, vals);

    // Fire post-update hooks (non-blocking)
    this._fireWebhook('record.updated', { id, ...vals }).catch(() => {});

    return record;
  }

  /**
   * Delete a record (soft or hard depending on config)
   */
  async delete(id, context = {}) {
    let result;
    if (this.softDelete) {
      const vals = { deleted_at: new Date() };
      if (this.auditEnabled && context.userId) {
        vals.deleted_by = context.userId;
      }
      result = await this.adapter.update(id, vals);
    } else {
      result = await this.adapter.destroy(id);
    }

    // Fire post-delete hooks (non-blocking)
    this._fireWebhook('record.deleted', { id }).catch(() => {});

    return result;
  }

  // ─── Hook Helpers ───────────────────────────────────────────

  /**
   * Fire webhook for CRUD events (non-blocking).
   */
  async _fireWebhook(event, data) {
    if (!this.modelName) return;
    const webhookService = serviceRegistry.get('webhookService');
    if (!webhookService) return;

    try {
      await webhookService.triggerWebhooks(event, this.modelName, data);
    } catch (err) {
      console.warn(`[Webhook] Error triggering ${event} for ${this.modelName}:`, err.message);
    }
  }

  /**
   * Evaluate business rules and return field updates to apply.
   */
  async _evaluateRules(event, record, context) {
    if (!this.modelName) return null;
    const ruleEngine = serviceRegistry.get('ruleEngineService');
    if (!ruleEngine) return null;

    try {
      const matched = await ruleEngine.evaluate(this.modelName, event, record, context);
      if (matched.length === 0) return null;

      const { fieldUpdates, sideEffects } = ruleEngine.executeActions(matched);

      // Process side effects (non-blocking)
      for (const effect of sideEffects) {
        if (effect.type === 'notification') {
          const notifService = serviceRegistry.get('notificationService');
          if (notifService && effect.data.userId) {
            notifService.dispatch(effect.data.userId, effect.data).catch(() => {});
          }
        } else if (effect.type === 'webhook') {
          const webhookService = serviceRegistry.get('webhookService');
          if (webhookService) {
            webhookService.triggerWebhooks(
              effect.data.event || 'rule.triggered',
              effect.data.model || this.modelName,
              record
            ).catch(() => {});
          }
        }
      }

      return Object.keys(fieldUpdates).length > 0 ? fieldUpdates : null;
    } catch (err) {
      console.warn(`[RuleEngine] Error evaluating rules for ${this.modelName}:`, err.message);
      return null;
    }
  }

  /**
   * Bulk create records
   */
  async bulkCreate(records, context = {}) {
    if (this.auditEnabled && context.userId) {
      records = records.map(r => ({
        ...r,
        created_by: context.userId,
        updated_by: context.userId,
      }));
    }
    return this.adapter.bulkCreate(records);
  }

  /**
   * Bulk delete records by IDs
   */
  async bulkDelete(ids, context = {}) {
    if (this.softDelete) {
      const vals = { deleted_at: new Date() };
      if (this.auditEnabled && context.userId) {
        vals.deleted_by = context.userId;
      }
      const promises = ids.map(id => this.adapter.update(id, { ...vals }));
      return Promise.all(promises);
    }
    return this.adapter.bulkDestroy(ids);
  }

  /**
   * Get model field definitions (for frontend schema introspection)
   */
  fieldsGet() {
    return this.adapter.getFields();
  }
}

export default BaseService;
