import { jest } from '@jest/globals';

const rows = [
  { id: 1, title: 'Q1 Report', category: 'finance', type: 'document', mimeType: 'application/pdf' },
  { id: 2, title: 'Logo', category: 'brand', type: 'image', mimeType: 'image/png' },
  { id: 3, title: 'Q2 Report', category: 'finance', type: 'document', mimeType: 'application/pdf' },
];

jest.unstable_mockModule('../../src/core/db/prisma.js', () => ({
  default: {
    documents: {
      findMany: jest.fn(async ({ where }) => rows.filter((r) => {
        if (where?.category && r.category !== where.category) return false;
        if (where?.type && r.type !== where.type) return false;
        if (where?.OR) {
          const q = where.OR[0]?.title?.contains || '';
          if (!r.title.includes(q) && !(r.description || '').includes(q)) return false;
        }
        return true;
      })),
      count: jest.fn(async () => rows.length),
      groupBy: jest.fn(async ({ by }) => {
        const counts = {};
        for (const r of rows) {
          const key = by.map((f) => String(r[f] ?? '—')).join('|');
          counts[key] = (counts[key] || 0) + 1;
        }
        return Object.entries(counts).map(([key, _all]) => {
          const out = { _count: { _all } };
          by.forEach((f, i) => { out[f] = key.split('|')[i]; });
          return out;
        });
      }),
    },
  },
}));

const { DocumentService } = await import('../../src/modules/documents/document.service.js');

describe('document faceted search (FastVue port)', () => {
  const svc = new DocumentService();

  test('parses fq filter queries and rejects bad fields', () => {
    expect(svc.parseFilterQuery(['category:finance', 'type:document'])).toEqual({ category: 'finance', type: 'document' });
    expect(() => svc.parseFilterQuery(['nope'])).toThrow(/Invalid fq/);
    expect(() => svc.parseFilterQuery(['secret:x'])).toThrow(/not allowed/);
  });

  test('searches with filters and returns facet counts', async () => {
    const res = await svc.search({ q: 'Report', fq: ['category:finance'], facets: ['category', 'type'], page: 1, limit: 10 });
    expect(res.success).toBe(true);
    expect(res.data.rows).toHaveLength(2);
    expect(res.data.facets.category).toEqual({ finance: 2, brand: 1 });
    expect(res.meta.pagination.total).toBe(3);
  });

  test('ignores disallowed facet fields', async () => {
    const res = await svc.search({ facets: ['category', 'password'] });
    expect(Object.keys(res.data.facets)).toEqual(['category']);
  });
});
