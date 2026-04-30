/**
 * @fileoverview QueryFilterBuilder - Convert permission filters to ORM queries
 * Transforms QueryFilter objects into Prisma and Drizzle-compatible query formats
 */

/**
 * Converts permission policy filters into ORM-specific query expressions
 */
export class QueryFilterBuilder {
  constructor() {
    this.filters = [];
  }

  /**
   * Add a filter to the builder
   * @param {QueryFilter} filter - Filter with field, operator, and value
   */
  addFilter(filter) {
    if (!filter || !filter.field || !filter.operator) {
      throw new Error('Filter must have field and operator');
    }
    this.filters.push(filter);
  }

  /**
   * Get a copy of all filters
   * @returns {QueryFilter[]} Copy of filters array
   */
  getFilters() {
    return [...this.filters];
  }

  /**
   * Clear all filters
   */
  clear() {
    this.filters = [];
  }

  /**
   * Convert filters to ORM query format
   * @param {('prisma' | 'drizzle')} ormType - Target ORM type
   * @returns {any} ORM-specific query object
   */
  toQuery(ormType = 'prisma') {
    if (ormType === 'drizzle') {
      return this.toDrizzleQuery();
    }
    return this.toPrismaQuery();
  }

  /**
   * Convert filters to Prisma WHERE clause format
   * @private
   * @returns {any} Prisma WHERE clause
   */
  toPrismaQuery() {
    if (this.filters.length === 0) {
      return {};
    }

    if (this.filters.length === 1) {
      return this.filterToPrisma(this.filters[0]);
    }

    // Multiple filters: use AND array
    const conditions = this.filters.map(f => this.filterToPrisma(f));
    return { AND: conditions };
  }

  /**
   * Convert filters to Drizzle format
   * @private
   * @returns {any[]} Array of filter objects for Drizzle
   */
  toDrizzleQuery() {
    return this.filters.map(filter => ({
      field: filter.field,
      operator: filter.operator,
      value: filter.value
    }));
  }

  /**
   * Convert a single filter to Prisma format
   * @private
   * @param {QueryFilter} filter
   * @returns {any} Prisma filter object
   */
  filterToPrisma(filter) {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return { [field]: value };

      case 'in':
        return { [field]: { in: value } };

      case 'between':
        return { [field]: { gte: value.min, lte: value.max } };

      case 'gt':
        return { [field]: { gt: value } };

      case 'lt':
        return { [field]: { lt: value } };

      case 'gte':
        return { [field]: { gte: value } };

      case 'lte':
        return { [field]: { lte: value } };

      case 'contains':
        return { [field]: { contains: value } };

      case 'exists':
        return { [field]: { not: null } };

      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }
}

export default QueryFilterBuilder;
