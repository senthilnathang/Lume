import {
  queryContextMiddleware, currentQueryContext, slowQueryThresholdMs,
  queryLabel, noteQuery, queryCountWarnThreshold, checkQueryCount,
} from '../../src/core/db/query-monitor.js';

describe('query monitor (F6.1)', () => {
  test('labels model actions, defaulting missing parts', () => {
    expect(queryLabel({ model: 'User', action: 'findMany' })).toBe('User.findMany');
    expect(queryLabel({})).toBe('raw.query');
    expect(queryLabel(null)).toBe('raw.query');
  });

  test('threshold honors SLOW_QUERY_MS with safe parsing', () => {
    const prev = process.env.SLOW_QUERY_MS;
    process.env.SLOW_QUERY_MS = '5';
    expect(slowQueryThresholdMs()).toBe(5);
    process.env.SLOW_QUERY_MS = 'off';
    expect(slowQueryThresholdMs()).toBe(0);
    process.env.SLOW_QUERY_MS = '0';
    expect(slowQueryThresholdMs()).toBe(0);
    if (prev === undefined) {
      delete process.env.SLOW_QUERY_MS;
    } else {
      process.env.SLOW_QUERY_MS = prev;
    }
  });

  test('counts queries inside middleware context only', () => {
    expect(currentQueryContext()).toBeNull();
    expect(noteQuery(10)).toBeNull();
    return new Promise((resolve) => {
      queryContextMiddleware({}, {}, () => {
        noteQuery(10);
        noteQuery(200);
        const ctx = currentQueryContext();
        expect(ctx.queries).toBe(2);
        expect(ctx.slow).toBeGreaterThanOrEqual(0);
        resolve();
      });
    });
  });

  test('warns once past the per-request count threshold', () => {
    const warnings = [];
    const orig = console.warn;
    console.warn = (msg) => warnings.push(msg);
    try {
      queryContextMiddleware({}, {}, () => {
        const ctx = currentQueryContext();
        ctx.queries = 1000;
        checkQueryCount('/api/x');
        checkQueryCount('/api/x');
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toMatch(/1000 DB queries/);
      });
    } finally {
      console.warn = orig;
    }
    expect(queryCountWarnThreshold()).toBeGreaterThan(0);
  });
});
