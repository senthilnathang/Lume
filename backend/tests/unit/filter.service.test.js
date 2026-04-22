import { FilterService } from '../../src/core/services/filter.service.js';

describe('FilterService', () => {
  let service;

  beforeEach(() => {
    service = new FilterService();
  });

  // ─── buildWhereCondition ────────────────────────────────────────────────

  describe('buildWhereCondition', () => {
    test('throws error if field is missing', () => {
      expect(() => {
        service.buildWhereCondition({ operator: 'eq', value: 'test' });
      }).toThrow('Filter must have a field');
    });

    test('throws error if operator is missing', () => {
      expect(() => {
        service.buildWhereCondition({ field: 'status', value: 'test' });
      }).toThrow('Filter must have an operator');
    });

    // ─── Equality operator ─────────────────────────────────────────────────

    test('eq operator with string value', () => {
      const result = service.buildWhereCondition({
        field: 'status',
        operator: 'eq',
        value: 'active',
      });
      expect(result).toEqual({ status: 'active' });
    });

    test('eq operator with number value', () => {
      const result = service.buildWhereCondition({
        field: 'age',
        operator: 'eq',
        value: 25,
      });
      expect(result).toEqual({ age: 25 });
    });

    test('eq operator with null value', () => {
      const result = service.buildWhereCondition({
        field: 'deleted_at',
        operator: 'eq',
        value: null,
      });
      expect(result).toEqual({ deleted_at: null });
    });

    // ─── Comparison operators ──────────────────────────────────────────────

    test('gt operator returns greater than condition', () => {
      const result = service.buildWhereCondition({
        field: 'age',
        operator: 'gt',
        value: 18,
      });
      expect(result).toEqual({ age: { gt: 18 } });
    });

    test('gte operator returns greater than or equal condition', () => {
      const result = service.buildWhereCondition({
        field: 'age',
        operator: 'gte',
        value: 18,
      });
      expect(result).toEqual({ age: { gte: 18 } });
    });

    test('lt operator returns less than condition', () => {
      const result = service.buildWhereCondition({
        field: 'price',
        operator: 'lt',
        value: 100,
      });
      expect(result).toEqual({ price: { lt: 100 } });
    });

    test('lte operator returns less than or equal condition', () => {
      const result = service.buildWhereCondition({
        field: 'price',
        operator: 'lte',
        value: 100,
      });
      expect(result).toEqual({ price: { lte: 100 } });
    });

    // ─── Not equals operator ──────────────────────────────────────────────

    test('neq operator returns not equals condition', () => {
      const result = service.buildWhereCondition({
        field: 'status',
        operator: 'neq',
        value: 'deleted',
      });
      expect(result).toEqual({ status: { not: 'deleted' } });
    });

    test('neq operator with number', () => {
      const result = service.buildWhereCondition({
        field: 'role_id',
        operator: 'neq',
        value: 0,
      });
      expect(result).toEqual({ role_id: { not: 0 } });
    });

    // ─── In operator ───────────────────────────────────────────────────────

    test('in operator with array value', () => {
      const result = service.buildWhereCondition({
        field: 'status',
        operator: 'in',
        value: ['active', 'pending'],
      });
      expect(result).toEqual({ status: { in: ['active', 'pending'] } });
    });

    test('in operator throws if value is not array', () => {
      expect(() => {
        service.buildWhereCondition({
          field: 'status',
          operator: 'in',
          value: 'active',
        });
      }).toThrow('in operator requires an array value');
    });

    test('in operator with single element array', () => {
      const result = service.buildWhereCondition({
        field: 'id',
        operator: 'in',
        value: [1],
      });
      expect(result).toEqual({ id: { in: [1] } });
    });

    // ─── String operators ──────────────────────────────────────────────────

    test('contains operator returns contains condition', () => {
      const result = service.buildWhereCondition({
        field: 'description',
        operator: 'contains',
        value: 'test',
      });
      expect(result).toEqual({ description: { contains: 'test' } });
    });

    test('startsWith operator returns startsWith condition', () => {
      const result = service.buildWhereCondition({
        field: 'name',
        operator: 'startsWith',
        value: 'John',
      });
      expect(result).toEqual({ name: { startsWith: 'John' } });
    });

    test('endsWith operator returns endsWith condition', () => {
      const result = service.buildWhereCondition({
        field: 'email',
        operator: 'endsWith',
        value: '@example.com',
      });
      expect(result).toEqual({ email: { endsWith: '@example.com' } });
    });

    // ─── Between operator ──────────────────────────────────────────────────

    test('between operator with two values', () => {
      const result = service.buildWhereCondition({
        field: 'age',
        operator: 'between',
        value: [18, 65],
      });
      expect(result).toEqual({ age: { gte: 18, lte: 65 } });
    });

    test('between operator throws if value is not array', () => {
      expect(() => {
        service.buildWhereCondition({
          field: 'age',
          operator: 'between',
          value: 25,
        });
      }).toThrow('between operator requires an array of two values [min, max]');
    });

    test('between operator throws if array does not have exactly 2 elements', () => {
      expect(() => {
        service.buildWhereCondition({
          field: 'age',
          operator: 'between',
          value: [18],
        });
      }).toThrow('between operator requires an array of two values [min, max]');
    });

    test('between operator throws if array has more than 2 elements', () => {
      expect(() => {
        service.buildWhereCondition({
          field: 'age',
          operator: 'between',
          value: [18, 30, 65],
        });
      }).toThrow('between operator requires an array of two values [min, max]');
    });

    // ─── Exists operator ───────────────────────────────────────────────────

    test('exists operator returns not null condition', () => {
      const result = service.buildWhereCondition({
        field: 'deleted_at',
        operator: 'exists',
      });
      expect(result).toEqual({ deleted_at: { not: null } });
    });

    // ─── Unknown operator ──────────────────────────────────────────────────

    test('unknown operator throws error', () => {
      expect(() => {
        service.buildWhereCondition({
          field: 'status',
          operator: 'unknown',
          value: 'test',
        });
      }).toThrow('Unknown operator: unknown');
    });
  });

  // ─── applySort ──────────────────────────────────────────────────────────

  describe('applySort', () => {
    test('returns empty object for empty sorts', () => {
      expect(service.applySort([])).toEqual({});
    });

    test('returns empty object for null sorts', () => {
      expect(service.applySort(null)).toEqual({});
    });

    test('returns empty object for undefined sorts', () => {
      expect(service.applySort(undefined)).toEqual({});
    });

    test('single sort field with asc direction', () => {
      const result = service.applySort([
        { field: 'name', direction: 'asc' },
      ]);
      expect(result).toEqual({ name: 'asc' });
    });

    test('single sort field with desc direction', () => {
      const result = service.applySort([
        { field: 'created_at', direction: 'desc' },
      ]);
      expect(result).toEqual({ created_at: 'desc' });
    });

    test('defaults to asc if direction is not provided', () => {
      const result = service.applySort([{ field: 'name' }]);
      expect(result).toEqual({ name: 'asc' });
    });

    test('case-insensitive direction handling', () => {
      const result = service.applySort([
        { field: 'name', direction: 'ASC' },
        { field: 'created_at', direction: 'DESC' },
      ]);
      expect(result).toEqual({ name: 'asc', created_at: 'desc' });
    });

    test('multiple sort fields', () => {
      const result = service.applySort([
        { field: 'status', direction: 'asc' },
        { field: 'created_at', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ]);
      expect(result).toEqual({
        status: 'asc',
        created_at: 'desc',
        name: 'asc',
      });
    });

    test('throws error if sort has no field', () => {
      expect(() => {
        service.applySort([{ direction: 'asc' }]);
      }).toThrow('Sort must have a field');
    });

    test('throws error for invalid direction', () => {
      expect(() => {
        service.applySort([{ field: 'name', direction: 'invalid' }]);
      }).toThrow("Invalid sort direction: invalid. Must be 'asc' or 'desc'");
    });
  });

  // ─── combineFilters ─────────────────────────────────────────────────────

  describe('combineFilters', () => {
    test('returns empty object for empty filters array', () => {
      expect(service.combineFilters([])).toEqual({});
    });

    test('returns empty object for null filters', () => {
      expect(service.combineFilters(null)).toEqual({});
    });

    test('returns empty object for undefined filters', () => {
      expect(service.combineFilters(undefined)).toEqual({});
    });

    test('returns single filter as-is', () => {
      const filter = { status: 'active' };
      expect(service.combineFilters([filter])).toEqual(filter);
    });

    test('combines multiple filters with AND', () => {
      const filters = [
        { status: 'active' },
        { age: { gt: 18 } },
      ];
      const result = service.combineFilters(filters);
      expect(result).toEqual({
        AND: [{ status: 'active' }, { age: { gt: 18 } }],
      });
    });

    test('combines three or more filters with AND', () => {
      const filters = [
        { status: 'active' },
        { age: { gt: 18 } },
        { role: 'admin' },
      ];
      const result = service.combineFilters(filters);
      expect(result).toEqual({
        AND: [
          { status: 'active' },
          { age: { gt: 18 } },
          { role: 'admin' },
        ],
      });
    });
  });

  // ─── parseFilterString ──────────────────────────────────────────────────

  describe('parseFilterString', () => {
    test('returns empty array for empty string', () => {
      expect(service.parseFilterString('')).toEqual([]);
    });

    test('returns empty array for whitespace-only string', () => {
      expect(service.parseFilterString('   ')).toEqual([]);
    });

    test('returns empty array for null', () => {
      expect(service.parseFilterString(null)).toEqual([]);
    });

    test('returns empty array for undefined', () => {
      expect(service.parseFilterString(undefined)).toEqual([]);
    });

    test('parses valid JSON filter string', () => {
      const filterString = '[{"field":"status","operator":"eq","value":"active"}]';
      const result = service.parseFilterString(filterString);
      expect(result).toEqual([
        { field: 'status', operator: 'eq', value: 'active' },
      ]);
    });

    test('parses multiple filter objects', () => {
      const filterString = '[{"field":"status","operator":"eq","value":"active"},{"field":"age","operator":"gt","value":18}]';
      const result = service.parseFilterString(filterString);
      expect(result).toEqual([
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'age', operator: 'gt', value: 18 },
      ]);
    });

    test('throws error for invalid JSON', () => {
      expect(() => {
        service.parseFilterString('not valid json');
      }).toThrow('Failed to parse filter string');
    });

    test('throws error for malformed JSON', () => {
      expect(() => {
        service.parseFilterString('[{"field":"status"');
      }).toThrow('Failed to parse filter string');
    });

    test('throws error if parsed result is not an array', () => {
      expect(() => {
        service.parseFilterString('{"field":"status"}');
      }).toThrow('Parsed filter must be an array');
    });

    test('handles JSON with complex values', () => {
      const filterString = '[{"field":"tags","operator":"in","value":["tag1","tag2"]},{"field":"range","operator":"between","value":[10,20]}]';
      const result = service.parseFilterString(filterString);
      expect(result).toEqual([
        { field: 'tags', operator: 'in', value: ['tag1', 'tag2'] },
        { field: 'range', operator: 'between', value: [10, 20] },
      ]);
    });

    test('handles JSON with null values', () => {
      const filterString = '[{"field":"deleted_at","operator":"eq","value":null}]';
      const result = service.parseFilterString(filterString);
      expect(result).toEqual([
        { field: 'deleted_at', operator: 'eq', value: null },
      ]);
    });
  });

  // ─── Integration tests ──────────────────────────────────────────────────

  describe('integration scenarios', () => {
    test('build and combine filters together', () => {
      const filter1 = service.buildWhereCondition({
        field: 'status',
        operator: 'eq',
        value: 'active',
      });
      const filter2 = service.buildWhereCondition({
        field: 'age',
        operator: 'gt',
        value: 18,
      });

      const combined = service.combineFilters([filter1, filter2]);

      expect(combined).toEqual({
        AND: [
          { status: 'active' },
          { age: { gt: 18 } },
        ],
      });
    });

    test('parse, build, and combine filters', () => {
      const filterString = '[{"field":"status","operator":"eq","value":"active"},{"field":"age","operator":"gte","value":18}]';
      const filters = service.parseFilterString(filterString);
      const conditions = filters.map(f => service.buildWhereCondition(f));
      const combined = service.combineFilters(conditions);

      expect(combined).toEqual({
        AND: [
          { status: 'active' },
          { age: { gte: 18 } },
        ],
      });
    });

    test('use filters with sort configuration', () => {
      const filterString = '[{"field":"status","operator":"eq","value":"active"}]';
      const sortString = JSON.stringify([
        { field: 'created_at', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ]);

      const filters = service.parseFilterString(filterString);
      const condition = service.buildWhereCondition(filters[0]);

      const sorts = JSON.parse(sortString);
      const orderBy = service.applySort(sorts);

      expect(condition).toEqual({ status: 'active' });
      expect(orderBy).toEqual({
        created_at: 'desc',
        name: 'asc',
      });
    });
  });
});
