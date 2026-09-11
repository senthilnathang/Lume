import { searchRecords, searchDocuments, globalSearch } from '../../src/core/services/search.service.js';

function makePrisma() {
  return {
    entity: {
      findUnique: async ({ where }) => ({ id: where.id, name: `entity_${where.id}` }),
    },
    entityRecord: {
      findMany: async ({ where }) => [
        { id: 1, entityId: 1, companyId: 5, createdBy: 9, visibility: 'company', deletedAt: null, data: JSON.stringify({ title: 'Alpha Deal' }) },
        { id: 2, entityId: 1, companyId: 5, createdBy: 8, visibility: 'private', deletedAt: null, data: JSON.stringify({ title: 'Beta Secret' }) },
        { id: 3, entityId: 2, companyId: 5, createdBy: 8, visibility: 'company', deletedAt: null, data: JSON.stringify({ name: 'Alpha Corp' }) },
        { id: 4, entityId: 1, companyId: 6, createdBy: 9, visibility: 'company', deletedAt: null, data: JSON.stringify({ title: 'Alpha Other Co' }) },
      ].filter((r) => !where || Object.entries(where).every(([k, v]) => r[k] === v)),
    },
    documents: {
      findMany: async () => [
        { id: 10, title: 'Alpha Handbook', description: 'Onboarding guide' },
        { id: 11, title: 'Beta Notes', description: '' },
      ],
    },
  };
}

describe('global search (palette backend)', () => {
  test('matches titles and ranks exact/prefix first', async () => {
    const rows = await searchRecords(makePrisma(), { query: 'alpha', companyId: 5, userId: 9, isPrivileged: true, limit: 20 });
    expect(rows.map((r) => r.title)).toEqual(['Alpha Deal', 'Alpha Corp']);
    expect(rows[0]).toMatchObject({ model: 'entity_1', group: 'Records' });
  });

  test('enforces visibility for non-privileged users', async () => {
    const rows = await searchRecords(makePrisma(), { query: 'a', companyId: 5, userId: 9 });
    expect(rows.map((r) => r.title).sort()).toEqual(['Alpha Corp', 'Alpha Deal']);
  });

  test('returns empty for blank queries', async () => {
    expect(await searchRecords(makePrisma(), { query: '  ', companyId: 5 })).toEqual([]);
    expect(await searchDocuments(makePrisma(), { query: '' })).toEqual([]);
    expect(await globalSearch(makePrisma(), { query: '', companyId: 5 })).toEqual({ results: [], total: 0, query: '' });
  });

  test('merges documents and caps totals', async () => {
    const res = await globalSearch(makePrisma(), { query: 'alpha', companyId: 5, userId: 1, isPrivileged: true, limit: 2 });
    expect(res.total).toBe(2);
    expect(res.query).toBe('alpha');
  });
});
