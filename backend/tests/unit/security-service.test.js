import { SecurityService } from '../../src/modules/base/services/security.service.js';

describe('SecurityService', () => {
  let service;

  beforeEach(() => {
    service = new SecurityService({});
  });

  // ─── evaluateDomain ──────────────────────────────────────────────────────

  describe('evaluateDomain', () => {
    test('returns true for empty domain', () => {
      expect(service.evaluateDomain({}, { name: 'test' })).toBe(true);
    });

    test('returns true for null domain', () => {
      expect(service.evaluateDomain(null, { name: 'test' })).toBe(true);
    });

    test('matches simple equality', () => {
      expect(service.evaluateDomain(
        { status: 'active' },
        { status: 'active', name: 'test' }
      )).toBe(true);
    });

    test('rejects simple equality mismatch', () => {
      expect(service.evaluateDomain(
        { status: 'active' },
        { status: 'inactive', name: 'test' }
      )).toBe(false);
    });

    test('matches multiple fields (AND logic)', () => {
      expect(service.evaluateDomain(
        { status: 'active', role: 'admin' },
        { status: 'active', role: 'admin', name: 'test' }
      )).toBe(true);
    });

    test('rejects when one field mismatches', () => {
      expect(service.evaluateDomain(
        { status: 'active', role: 'admin' },
        { status: 'active', role: 'user' }
      )).toBe(false);
    });

    // Complex operators
    test('eq operator matches', () => {
      expect(service.evaluateDomain(
        { age: { eq: 25 } },
        { age: 25 }
      )).toBe(true);
    });

    test('eq operator rejects', () => {
      expect(service.evaluateDomain(
        { age: { eq: 25 } },
        { age: 30 }
      )).toBe(false);
    });

    test('ne operator matches', () => {
      expect(service.evaluateDomain(
        { status: { ne: 'deleted' } },
        { status: 'active' }
      )).toBe(true);
    });

    test('ne operator rejects', () => {
      expect(service.evaluateDomain(
        { status: { ne: 'deleted' } },
        { status: 'deleted' }
      )).toBe(false);
    });

    test('gt operator', () => {
      expect(service.evaluateDomain({ age: { gt: 18 } }, { age: 25 })).toBe(true);
      expect(service.evaluateDomain({ age: { gt: 18 } }, { age: 18 })).toBe(false);
      expect(service.evaluateDomain({ age: { gt: 18 } }, { age: 10 })).toBe(false);
    });

    test('gte operator', () => {
      expect(service.evaluateDomain({ age: { gte: 18 } }, { age: 18 })).toBe(true);
      expect(service.evaluateDomain({ age: { gte: 18 } }, { age: 25 })).toBe(true);
      expect(service.evaluateDomain({ age: { gte: 18 } }, { age: 17 })).toBe(false);
    });

    test('lt operator', () => {
      expect(service.evaluateDomain({ price: { lt: 100 } }, { price: 50 })).toBe(true);
      expect(service.evaluateDomain({ price: { lt: 100 } }, { price: 100 })).toBe(false);
    });

    test('lte operator', () => {
      expect(service.evaluateDomain({ price: { lte: 100 } }, { price: 100 })).toBe(true);
      expect(service.evaluateDomain({ price: { lte: 100 } }, { price: 101 })).toBe(false);
    });

    test('in operator', () => {
      expect(service.evaluateDomain(
        { role: { in: ['admin', 'manager'] } },
        { role: 'admin' }
      )).toBe(true);
      expect(service.evaluateDomain(
        { role: { in: ['admin', 'manager'] } },
        { role: 'user' }
      )).toBe(false);
    });

    test('nin operator', () => {
      expect(service.evaluateDomain(
        { status: { nin: ['deleted', 'banned'] } },
        { status: 'active' }
      )).toBe(true);
      expect(service.evaluateDomain(
        { status: { nin: ['deleted', 'banned'] } },
        { status: 'deleted' }
      )).toBe(false);
    });

    test('unknown operator returns false', () => {
      expect(service.evaluateDomain(
        { age: { unknown: 5 } },
        { age: 5 }
      )).toBe(false);
    });

    test('combined complex operators on same field', () => {
      expect(service.evaluateDomain(
        { age: { gte: 18, lte: 65 } },
        { age: 30 }
      )).toBe(true);
      expect(service.evaluateDomain(
        { age: { gte: 18, lte: 65 } },
        { age: 10 }
      )).toBe(false);
      expect(service.evaluateDomain(
        { age: { gte: 18, lte: 65 } },
        { age: 70 }
      )).toBe(false);
    });
  });

  // ─── combineDomains ──────────────────────────────────────────────────────

  describe('combineDomains', () => {
    test('returns empty object for no domains', () => {
      expect(service.combineDomains([])).toEqual({});
    });

    test('returns single domain as-is', () => {
      const domain = { status: 'active' };
      expect(service.combineDomains([domain])).toEqual(domain);
    });

    test('merges multiple domains', () => {
      const result = service.combineDomains([
        { status: 'active' },
        { role: 'admin' }
      ]);
      expect(result).toEqual({ status: 'active', role: 'admin' });
    });

    test('later domain overrides earlier on conflict', () => {
      const result = service.combineDomains([
        { status: 'active' },
        { status: 'inactive' }
      ]);
      expect(result.status).toBe('inactive');
    });
  });

  // ─── Cache ───────────────────────────────────────────────────────────────

  describe('clearCache', () => {
    test('clears permission and record rule caches', () => {
      service.permissionCache.set('test', true);
      service.recordRuleCache.set('test', true);
      service.clearCache();
      expect(service.permissionCache.size).toBe(0);
      expect(service.recordRuleCache.size).toBe(0);
    });
  });
});
