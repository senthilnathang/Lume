/**
 * @fileoverview Unit tests for QueryFilterBuilder
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { QueryFilterBuilder } from '../../src/core/permissions/query-filter-builder.js';

describe('QueryFilterBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new QueryFilterBuilder();
  });

  describe('addFilter', () => {
    it('should add a single filter', () => {
      const filter = { field: 'status', operator: 'eq', value: 'active' };
      builder.addFilter(filter);

      const filters = builder.getFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual(filter);
    });

    it('should support multiple filters', () => {
      const filter1 = { field: 'status', operator: 'eq', value: 'active' };
      const filter2 = { field: 'priority', operator: 'gt', value: 2 };
      const filter3 = { field: 'assignedTo', operator: 'in', value: ['user1', 'user2'] };

      builder.addFilter(filter1);
      builder.addFilter(filter2);
      builder.addFilter(filter3);

      const filters = builder.getFilters();
      expect(filters).toHaveLength(3);
      expect(filters[0]).toEqual(filter1);
      expect(filters[1]).toEqual(filter2);
      expect(filters[2]).toEqual(filter3);
    });
  });

  describe('toQuery with eq operator', () => {
    it('should convert eq filter to Prisma format', () => {
      const filter = { field: 'status', operator: 'eq', value: 'active' };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ status: 'active' });
    });
  });

  describe('toQuery with in operator', () => {
    it('should convert in filter to Prisma format', () => {
      const filter = { field: 'status', operator: 'in', value: ['active', 'pending'] };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ status: { in: ['active', 'pending'] } });
    });
  });

  describe('toQuery with comparison operators', () => {
    it('should convert gt filter to Prisma format', () => {
      const filter = { field: 'priority', operator: 'gt', value: 2 };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ priority: { gt: 2 } });
    });

    it('should convert lt filter to Prisma format', () => {
      const filter = { field: 'priority', operator: 'lt', value: 5 };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ priority: { lt: 5 } });
    });

    it('should convert gte filter to Prisma format', () => {
      const filter = { field: 'priority', operator: 'gte', value: 2 };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ priority: { gte: 2 } });
    });

    it('should convert lte filter to Prisma format', () => {
      const filter = { field: 'priority', operator: 'lte', value: 5 };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ priority: { lte: 5 } });
    });
  });

  describe('toQuery with between operator', () => {
    it('should convert between filter to Prisma format', () => {
      const filter = { field: 'priority', operator: 'between', value: { min: 2, max: 5 } };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ priority: { gte: 2, lte: 5 } });
    });
  });

  describe('toQuery with contains operator', () => {
    it('should convert contains filter to Prisma format', () => {
      const filter = { field: 'title', operator: 'contains', value: 'urgent' };
      builder.addFilter(filter);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({ title: { contains: 'urgent' } });
    });
  });

  describe('toQuery with multiple filters', () => {
    it('should combine multiple filters with AND logic', () => {
      const filter1 = { field: 'status', operator: 'eq', value: 'active' };
      const filter2 = { field: 'priority', operator: 'gt', value: 2 };

      builder.addFilter(filter1);
      builder.addFilter(filter2);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({
        AND: [
          { status: 'active' },
          { priority: { gt: 2 } }
        ]
      });
    });

    it('should combine three filters with AND logic', () => {
      const filter1 = { field: 'status', operator: 'eq', value: 'active' };
      const filter2 = { field: 'priority', operator: 'gte', value: 2 };
      const filter3 = { field: 'assignedTo', operator: 'in', value: ['user1', 'user2'] };

      builder.addFilter(filter1);
      builder.addFilter(filter2);
      builder.addFilter(filter3);

      const query = builder.toQuery('prisma');
      expect(query).toEqual({
        AND: [
          { status: 'active' },
          { priority: { gte: 2 } },
          { assignedTo: { in: ['user1', 'user2'] } }
        ]
      });
    });
  });

  describe('clear', () => {
    it('should clear all filters', () => {
      const filter1 = { field: 'status', operator: 'eq', value: 'active' };
      const filter2 = { field: 'priority', operator: 'gt', value: 2 };

      builder.addFilter(filter1);
      builder.addFilter(filter2);

      expect(builder.getFilters()).toHaveLength(2);

      builder.clear();

      expect(builder.getFilters()).toHaveLength(0);
    });
  });

  describe('getFilters', () => {
    it('should return a copy of filters array', () => {
      const filter = { field: 'status', operator: 'eq', value: 'active' };
      builder.addFilter(filter);

      const filters1 = builder.getFilters();
      const filters2 = builder.getFilters();

      expect(filters1).toEqual(filters2);
      expect(filters1).not.toBe(filters2);
    });
  });

  describe('toQuery default ORM type', () => {
    it('should default to prisma format when no orm type is specified', () => {
      const filter = { field: 'status', operator: 'eq', value: 'active' };
      builder.addFilter(filter);

      const query = builder.toQuery();
      expect(query).toEqual({ status: 'active' });
    });
  });
});
