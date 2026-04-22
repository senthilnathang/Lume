/**
 * FilterService - Query filtering and sorting utilities
 * Converts filter configurations to Prisma where conditions and orderBy objects
 *
 * Usage:
 *   import { FilterService } from '../../core/services/filter.service.js';
 *   const filterService = new FilterService();
 *   const condition = filterService.buildWhereCondition({ field: 'age', operator: 'gt', value: 18 });
 *   const orderBy = filterService.applySort([{ field: 'name', direction: 'asc' }]);
 */

export class FilterService {
  /**
   * Supported filter operators
   */
  static OPERATORS = {
    eq: 'eq',                 // equals
    neq: 'not',               // not equals
    gt: 'gt',                 // greater than
    gte: 'gte',               // greater than or equal
    lt: 'lt',                 // less than
    lte: 'lte',               // less than or equal
    in: 'in',                 // in array
    contains: 'contains',     // string contains
    startsWith: 'startsWith', // string starts with
    endsWith: 'endsWith',     // string ends with
    between: 'between',       // between range (uses gte + lte)
    exists: 'not',            // field exists (not null) - maps to 'not' null
  };

  constructor() {}

  /**
   * Build a single Prisma where condition from a filter object
   *
   * @param {Object} filter - Filter object with field, operator, value
   * @param {string} filter.field - Field name
   * @param {string} filter.operator - Operator type
   * @param {any} filter.value - Filter value(s)
   * @returns {Object} Prisma where condition object
   *
   * @example
   * buildWhereCondition({ field: 'age', operator: 'gt', value: 18 })
   * // Returns: { age: { gt: 18 } }
   *
   * buildWhereCondition({ field: 'status', operator: 'eq', value: 'active' })
   * // Returns: { status: 'active' }
   *
   * buildWhereCondition({ field: 'tags', operator: 'in', value: ['a', 'b'] })
   * // Returns: { tags: { in: ['a', 'b'] } }
   */
  buildWhereCondition(filter) {
    const { field, operator, value } = filter;

    if (!field) {
      throw new Error('Filter must have a field');
    }

    if (!operator) {
      throw new Error('Filter must have an operator');
    }

    // Handle equality - simplest form
    if (operator === 'eq') {
      return { [field]: value };
    }

    // Handle 'exists' operator (check if field is not null)
    if (operator === 'exists') {
      return { [field]: { not: null } };
    }

    // Handle 'between' operator - combines gte and lte
    if (operator === 'between') {
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('between operator requires an array of two values [min, max]');
      }
      return {
        [field]: {
          gte: value[0],
          lte: value[1],
        },
      };
    }

    // Handle 'in' operator
    if (operator === 'in') {
      if (!Array.isArray(value)) {
        throw new Error('in operator requires an array value');
      }
      return { [field]: { in: value } };
    }

    // Handle string operators: contains, startsWith, endsWith
    if (['contains', 'startsWith', 'endsWith'].includes(operator)) {
      return {
        [field]: {
          [operator]: value,
        },
      };
    }

    // Handle numeric/comparison operators: gt, gte, lt, lte, neq
    if (['gt', 'gte', 'lt', 'lte'].includes(operator)) {
      return {
        [field]: {
          [operator]: value,
        },
      };
    }

    // Handle 'neq' (not equals)
    if (operator === 'neq') {
      return {
        [field]: {
          not: value,
        },
      };
    }

    throw new Error(`Unknown operator: ${operator}`);
  }

  /**
   * Build Prisma orderBy object from sort configuration
   *
   * @param {Array} sorts - Array of sort objects with field and direction
   * @param {string} sorts[].field - Field name to sort by
   * @param {string} sorts[].direction - 'asc' or 'desc'
   * @returns {Object} Prisma orderBy object
   *
   * @example
   * applySort([{ field: 'name', direction: 'asc' }])
   * // Returns: { name: 'asc' }
   *
   * applySort([
   *   { field: 'status', direction: 'asc' },
   *   { field: 'created_at', direction: 'desc' }
   * ])
   * // Returns: { status: 'asc', created_at: 'desc' }
   */
  applySort(sorts) {
    if (!sorts || !Array.isArray(sorts) || sorts.length === 0) {
      return {};
    }

    const orderBy = {};

    for (const sort of sorts) {
      const { field, direction } = sort;

      if (!field) {
        throw new Error('Sort must have a field');
      }

      const dir = direction?.toLowerCase() || 'asc';
      if (!['asc', 'desc'].includes(dir)) {
        throw new Error(`Invalid sort direction: ${direction}. Must be 'asc' or 'desc'`);
      }

      orderBy[field] = dir;
    }

    return orderBy;
  }

  /**
   * Combine multiple filters with AND logic
   *
   * @param {Array} filters - Array of filter condition objects
   * @returns {Object} Combined Prisma where condition
   *
   * @example
   * combineFilters([
   *   { age: { gt: 18 } },
   *   { status: 'active' }
   * ])
   * // Returns: { AND: [{ age: { gt: 18 } }, { status: 'active' }] }
   *
   * combineFilters([{ status: 'active' }])
   * // Returns: { status: 'active' }
   */
  combineFilters(filters) {
    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return {};
    }

    if (filters.length === 1) {
      return filters[0];
    }

    return {
      AND: filters,
    };
  }

  /**
   * Safely parse a JSON filter string
   *
   * @param {string} filterString - JSON string representing filters
   * @returns {Array} Parsed array of filter objects
   * @throws {Error} If JSON is invalid or format is wrong
   *
   * @example
   * parseFilterString('[{"field":"status","operator":"eq","value":"active"}]')
   * // Returns: [{ field: 'status', operator: 'eq', value: 'active' }]
   *
   * parseFilterString('')
   * // Returns: []
   *
   * parseFilterString('invalid json')
   * // Throws: Error: Failed to parse filter string: Unexpected token 'i'...
   */
  parseFilterString(filterString) {
    // Handle empty or whitespace-only strings
    if (!filterString || typeof filterString !== 'string' || filterString.trim() === '') {
      return [];
    }

    try {
      const parsed = JSON.parse(filterString);

      // Ensure result is an array
      if (!Array.isArray(parsed)) {
        throw new Error('Parsed filter must be an array');
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse filter string: ${error.message}`);
    }
  }
}

export default new FilterService();
