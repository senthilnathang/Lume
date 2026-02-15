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

export class BaseService {
  /**
   * @param {BaseAdapter} adapter - An adapter instance (PrismaAdapter or DrizzleAdapter)
   * @param {Object} options
   * @param {boolean} options.softDelete - Enable soft deletes (default true)
   * @param {boolean} options.audit - Enable audit fields (default true)
   */
  constructor(adapter, options = {}) {
    if (!(adapter instanceof BaseAdapter)) {
      throw new Error('BaseService requires a BaseAdapter instance (PrismaAdapter or DrizzleAdapter)');
    }
    this.adapter = adapter;
    this.softDelete = options.softDelete !== false;
    this.auditEnabled = options.audit !== false;
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
    return this.adapter.create(vals);
  }

  /**
   * Update an existing record
   */
  async update(id, vals, context = {}) {
    if (this.auditEnabled && context.userId) {
      vals.updated_by = context.userId;
    }
    vals.updated_at = new Date();
    return this.adapter.update(id, vals);
  }

  /**
   * Delete a record (soft or hard depending on config)
   */
  async delete(id, context = {}) {
    if (this.softDelete) {
      const vals = { deleted_at: new Date() };
      if (this.auditEnabled && context.userId) {
        vals.deleted_by = context.userId;
      }
      return this.adapter.update(id, vals);
    }
    return this.adapter.destroy(id);
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
