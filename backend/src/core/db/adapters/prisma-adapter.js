/**
 * PrismaAdapter — Adapter for Prisma ORM.
 * Translates the domain filter API into Prisma query syntax.
 */

import { BaseAdapter } from './base-adapter.js';
import prisma from '../prisma.js';
import { Prisma } from '@prisma/client';

export class PrismaAdapter extends BaseAdapter {
  /**
   * @param {string} modelName - Prisma model name (e.g. 'user', 'role')
   * @param {Object} options
   * @param {Object} options.fieldMeta - Optional field metadata for getFields()
   */
  constructor(modelName, options = {}) {
    super();
    this.modelName = modelName;
    // Prisma client delegates are lowercase, e.g. prisma.user, prisma.role
    const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    this.delegate = prisma[delegateName];
    if (!this.delegate) {
      throw new Error(`Prisma model "${modelName}" not found. Available: ${Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).join(', ')}`);
    }
    this.fieldMeta = options.fieldMeta || {};
  }

  async findAll(options = {}) {
    const { where = [], order = [], limit = 20, offset = 0, include } = options;

    const prismaWhere = this._parseDomain(where);
    const prismaOrderBy = this._parseOrder(order);

    const queryOptions = {
      where: prismaWhere,
      orderBy: prismaOrderBy,
      take: limit,
      skip: offset,
    };
    if (include) queryOptions.include = include;

    const [rows, count] = await Promise.all([
      this.delegate.findMany(queryOptions),
      this.delegate.count({ where: prismaWhere }),
    ]);

    return { rows, count };
  }

  async findById(id, options = {}) {
    const queryOptions = { where: { id: Number(id) } };
    if (options.include) queryOptions.include = options.include;
    return this.delegate.findUnique(queryOptions);
  }

  async create(data) {
    const cleanData = this._stripUnknownFields(data);
    return this.delegate.create({ data: cleanData });
  }

  async update(id, data) {
    const cleanData = this._stripUnknownFields(data);
    return this.delegate.update({
      where: { id: Number(id) },
      data: cleanData,
    });
  }

  async destroy(id) {
    try {
      await this.delegate.delete({ where: { id: Number(id) } });
      return true;
    } catch (e) {
      if (e.code === 'P2025') return false; // Record not found
      throw e;
    }
  }

  async count(where = []) {
    const prismaWhere = this._parseDomain(where);
    return this.delegate.count({ where: prismaWhere });
  }

  async bulkCreate(records) {
    // Prisma createMany doesn't return records on MySQL, so we use a transaction
    return prisma.$transaction(
      records.map(data => this.delegate.create({ data: this._stripUnknownFields(data) }))
    );
  }

  async bulkDestroy(ids) {
    const result = await this.delegate.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
    return result.count;
  }

  getFields() {
    // Return manually-defined field metadata or Prisma DMMF fields
    if (Object.keys(this.fieldMeta).length > 0) return this.fieldMeta;

    // Use Prisma's static DMMF to extract field info
    try {
      const dmmf = Prisma.dmmf;
      if (!dmmf) return {};
      const model = dmmf.datamodel?.models?.find(m => m.name === this.modelName);
      if (!model) return {};
      const fields = {};
      for (const f of model.fields) {
        if (f.kind === 'object') continue; // skip relations
        fields[f.name] = {
          type: f.type,
          allowNull: !f.isRequired,
          primaryKey: f.isId || false,
          defaultValue: f.default?.value ?? f.default ?? undefined,
          field: f.dbName || f.name,
        };
      }
      return fields;
    } catch {
      return {};
    }
  }

  /**
   * Parse domain tuples [[field, op, value], ...] into Prisma where object
   */
  _parseDomain(domain) {
    if (!Array.isArray(domain) || domain.length === 0) return {};
    const where = {};

    for (const clause of domain) {
      if (!Array.isArray(clause) || clause.length < 3) continue;
      const [rawField, op, value] = clause;
      const field = this._toCamelCase(rawField);

      switch (op) {
        case '=':
          where[field] = value;
          break;
        case '!=':
          where[field] = { not: value };
          break;
        case '>':
          where[field] = { gt: value };
          break;
        case '>=':
          where[field] = { gte: value };
          break;
        case '<':
          where[field] = { lt: value };
          break;
        case '<=':
          where[field] = { lte: value };
          break;
        case 'like':
        case 'ilike':
          where[field] = { contains: value.replace(/%/g, '') };
          break;
        case 'in':
          where[field] = { in: Array.isArray(value) ? value : [value] };
          break;
        case 'not in':
          where[field] = { notIn: Array.isArray(value) ? value : [value] };
          break;
        case 'startsWith':
          where[field] = { startsWith: value };
          break;
        case 'endsWith':
          where[field] = { endsWith: value };
          break;
        default:
          where[field] = value;
      }
    }
    return where;
  }

  /**
   * Parse order array [[field, dir], ...] into Prisma orderBy
   */
  _parseOrder(order) {
    if (!Array.isArray(order) || order.length === 0) {
      return [{ createdAt: 'desc' }];
    }
    return order.map(([field, dir]) => ({ [this._toCamelCase(field)]: (dir || 'DESC').toLowerCase() }));
  }

  /**
   * Convert snake_case field name to camelCase for Prisma
   */
  _toCamelCase(field) {
    return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  /**
   * Strip fields that don't exist in the Prisma model to prevent validation errors.
   * Converts snake_case keys to camelCase and removes unknown fields.
   */
  _stripUnknownFields(data) {
    const knownFields = this.getFields();
    if (!knownFields || Object.keys(knownFields).length === 0) return data;

    const knownSet = new Set(Object.keys(knownFields));
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      const camelKey = this._toCamelCase(key);
      if (knownSet.has(key)) {
        cleaned[key] = value;
      } else if (knownSet.has(camelKey)) {
        cleaned[camelKey] = value;
      }
      // else: silently drop unknown fields
    }
    return cleaned;
  }
}

export default PrismaAdapter;
