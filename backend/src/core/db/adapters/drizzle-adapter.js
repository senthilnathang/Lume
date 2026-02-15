/**
 * DrizzleAdapter — Adapter for Drizzle ORM.
 * Translates the domain filter API into Drizzle query syntax.
 */

import { BaseAdapter } from './base-adapter.js';
import { getDrizzle } from '../drizzle.js';
import { eq, ne, gt, gte, lt, lte, like, inArray, notInArray, and, asc, desc, sql, count as drizzleCount } from 'drizzle-orm';

export class DrizzleAdapter extends BaseAdapter {
  /**
   * @param {Object} table - Drizzle table definition (e.g. activities from schema.js)
   * @param {Object} options
   * @param {Object} options.fieldMeta - Optional field metadata for getFields()
   */
  constructor(table, options = {}) {
    super();
    this.table = table;
    this.fieldMeta = options.fieldMeta || {};
  }

  _db() {
    return getDrizzle();
  }

  async findAll(options = {}) {
    const { where = [], order = [], limit = 20, offset = 0 } = options;
    const db = this._db();

    const conditions = this._parseDomain(where);
    const orderClauses = this._parseOrder(order);

    let query = db.select().from(this.table);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    if (orderClauses.length > 0) {
      query = query.orderBy(...orderClauses);
    }
    query = query.limit(limit).offset(offset);

    const rows = await query;

    // Count query
    let countQuery = db.select({ value: drizzleCount() }).from(this.table);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const count = countResult?.value || 0;

    return { rows, count };
  }

  async findById(id, options = {}) {
    const db = this._db();
    const rows = await db.select().from(this.table).where(eq(this.table.id, Number(id))).limit(1);
    return rows[0] || null;
  }

  async create(data) {
    const db = this._db();
    const result = await db.insert(this.table).values(data);
    const insertId = result[0]?.insertId;
    if (insertId) {
      return this.findById(insertId);
    }
    return data;
  }

  async update(id, data) {
    const db = this._db();
    await db.update(this.table).set(data).where(eq(this.table.id, Number(id)));
    return this.findById(id);
  }

  async destroy(id) {
    const db = this._db();
    const result = await db.delete(this.table).where(eq(this.table.id, Number(id)));
    return (result[0]?.affectedRows || 0) > 0;
  }

  async count(where = []) {
    const db = this._db();
    const conditions = this._parseDomain(where);
    let query = db.select({ value: drizzleCount() }).from(this.table);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const [result] = await query;
    return result?.value || 0;
  }

  async bulkCreate(records) {
    const db = this._db();
    await db.insert(this.table).values(records);
    // Drizzle doesn't return inserted records on MySQL bulk insert,
    // so we return the input data enriched with timestamps
    return records;
  }

  async bulkDestroy(ids) {
    const db = this._db();
    const result = await db.delete(this.table).where(inArray(this.table.id, ids.map(Number)));
    return result[0]?.affectedRows || 0;
  }

  getFields() {
    if (Object.keys(this.fieldMeta).length > 0) return this.fieldMeta;

    // Derive field info from the Drizzle table columns
    const fields = {};
    const columns = this.table[Symbol.for('drizzle:Columns')] || {};
    for (const [name, col] of Object.entries(columns)) {
      fields[name] = {
        type: col.dataType || col.columnType || 'string',
        allowNull: !col.notNull,
        primaryKey: !!col.primary,
        defaultValue: col.default,
        field: col.name || name,
      };
    }
    return fields;
  }

  /**
   * Parse domain tuples into Drizzle condition array
   */
  _parseDomain(domain) {
    if (!Array.isArray(domain) || domain.length === 0) return [];
    const conditions = [];

    for (const clause of domain) {
      if (!Array.isArray(clause) || clause.length < 3) continue;
      const [field, op, value] = clause;
      const column = this.table[field];
      if (!column) continue;

      switch (op) {
        case '=':
          conditions.push(eq(column, value));
          break;
        case '!=':
          conditions.push(ne(column, value));
          break;
        case '>':
          conditions.push(gt(column, value));
          break;
        case '>=':
          conditions.push(gte(column, value));
          break;
        case '<':
          conditions.push(lt(column, value));
          break;
        case '<=':
          conditions.push(lte(column, value));
          break;
        case 'like':
        case 'ilike':
          conditions.push(like(column, value));
          break;
        case 'in':
          conditions.push(inArray(column, Array.isArray(value) ? value : [value]));
          break;
        case 'not in':
          conditions.push(notInArray(column, Array.isArray(value) ? value : [value]));
          break;
        case 'startsWith':
          conditions.push(like(column, `${value}%`));
          break;
        case 'endsWith':
          conditions.push(like(column, `%${value}`));
          break;
        case 'contains':
          conditions.push(like(column, `%${value}%`));
          break;
        default:
          conditions.push(eq(column, value));
      }
    }
    return conditions;
  }

  /**
   * Parse order array into Drizzle orderBy clauses
   */
  _parseOrder(order) {
    if (!Array.isArray(order) || order.length === 0) {
      const createdAtCol = this.table.createdAt;
      return createdAtCol ? [desc(createdAtCol)] : [];
    }
    return order.map(([field, dir]) => {
      const column = this.table[field];
      if (!column) return desc(this.table.createdAt || this.table.id);
      return (dir || 'DESC').toUpperCase() === 'ASC' ? asc(column) : desc(column);
    });
  }
}

export default DrizzleAdapter;
