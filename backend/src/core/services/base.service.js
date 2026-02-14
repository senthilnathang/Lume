/**
 * BaseService - Generic CRUD service class
 * Provides standard create/read/update/delete operations for any Sequelize model.
 * Modules can extend this class to add custom business logic.
 *
 * Usage:
 *   import { BaseService } from '../../core/services/base.service.js';
 *   const activityService = new BaseService(Activity, { softDelete: true });
 *   const results = await activityService.search({ page: 1, limit: 20, domain: [['status', '=', 'active']] });
 */

import { Op } from 'sequelize';

export class BaseService {
  constructor(model, options = {}) {
    this.model = model;
    this.softDelete = options.softDelete !== false;
    this.auditEnabled = options.audit !== false;
  }

  /**
   * Search records with pagination and domain filtering
   * @param {Object} options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Records per page
   * @param {Array} options.domain - Array of [field, operator, value] tuples
   * @param {Array} options.order - Sequelize order array
   * @param {Array} options.include - Sequelize include for eager loading
   */
  async search(options = {}) {
    const {
      page = 1,
      limit = 20,
      domain = [],
      order = [['created_at', 'DESC']],
      include,
    } = options;

    const where = this._parseDomain(domain);
    if (this.softDelete) {
      where.deleted_at = null;
    }

    const findOptions = {
      where,
      limit,
      offset: (page - 1) * limit,
      order,
    };
    if (include) findOptions.include = include;

    const { count, rows } = await this.model.findAndCountAll(findOptions);
    return {
      data: rows,
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
    const where = this._parseDomain(domain);
    if (this.softDelete) {
      where.deleted_at = null;
    }
    return this.model.count({ where });
  }

  /**
   * Read a single record by ID
   */
  async read(id, options = {}) {
    const findOptions = { where: { id } };
    if (options.include) findOptions.include = options.include;
    return this.model.findOne(findOptions);
  }

  /**
   * Create a new record
   * @param {Object} vals - Field values
   * @param {Object} context - Request context (userId, etc.)
   */
  async create(vals, context = {}) {
    if (this.auditEnabled && context.userId) {
      vals.created_by = context.userId;
      vals.updated_by = context.userId;
    }
    return this.model.create(vals);
  }

  /**
   * Update an existing record
   */
  async update(id, vals, context = {}) {
    if (this.auditEnabled && context.userId) {
      vals.updated_by = context.userId;
    }
    vals.updated_at = new Date();
    await this.model.update(vals, { where: { id } });
    return this.model.findByPk(id);
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
      await this.model.update(vals, { where: { id } });
      return true;
    }
    const count = await this.model.destroy({ where: { id } });
    return count > 0;
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
    return this.model.bulkCreate(records);
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
      return this.model.update(vals, { where: { id: { [Op.in]: ids } } });
    }
    return this.model.destroy({ where: { id: { [Op.in]: ids } } });
  }

  /**
   * Get model field definitions (for frontend schema introspection)
   */
  fieldsGet() {
    const attributes = this.model.rawAttributes;
    const fields = {};
    for (const [name, attr] of Object.entries(attributes)) {
      fields[name] = {
        type: attr.type?.key || attr.type?.constructor?.name || 'STRING',
        allowNull: attr.allowNull !== false,
        primaryKey: !!attr.primaryKey,
        defaultValue: attr.defaultValue,
        field: attr.field || name,
      };
    }
    return fields;
  }

  /**
   * Parse Odoo-style domain tuples into Sequelize where clause
   * Domain: [[field, operator, value], ...]
   */
  _parseDomain(domain) {
    const where = {};
    if (!Array.isArray(domain)) return where;

    for (const clause of domain) {
      if (!Array.isArray(clause) || clause.length < 3) continue;
      const [field, op, value] = clause;
      where[field] = { [this._getOp(op)]: value };
    }
    return where;
  }

  /**
   * Map string operator to Sequelize Op
   */
  _getOp(op) {
    const map = {
      '=': Op.eq,
      '!=': Op.ne,
      '>': Op.gt,
      '>=': Op.gte,
      '<': Op.lt,
      '<=': Op.lte,
      'like': Op.like,
      'ilike': Op.like,
      'in': Op.in,
      'not in': Op.notIn,
      'contains': Op.contains,
      'startsWith': Op.startsWith,
      'endsWith': Op.endsWith,
    };
    return map[op] || Op.eq;
  }
}

export default BaseService;
