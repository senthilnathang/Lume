import { cascadeDeleteRecords } from '../../src/core/services/cascade.service.js';
import { RecordService as BaseRecordService } from '../../src/modules/base/services/record.service.js';

function makePrisma() {
  const store = {
    fields: [
      { id: 1, entityId: 1, name: 'title', label: 'Title', type: 'text', deletedAt: null },
      { id: 2, entityId: 2, name: 'orderRef', label: 'Order', type: 'master-detail', lookupEntityId: 1, deletedAt: null },
      { id: 3, entityId: 2, name: 'note', label: 'Note', type: 'text', deletedAt: null },
    ],
    records: [
      { id: 10, entityId: 1, companyId: 5, data: JSON.stringify({ title: 'Order' }), deletedAt: null },
      { id: 20, entityId: 2, companyId: 5, data: JSON.stringify({ orderRef: 10, note: 'a' }), deletedAt: null },
      { id: 21, entityId: 2, companyId: 5, data: JSON.stringify({ orderRef: { id: 10 }, note: 'b' }), deletedAt: null },
      { id: 22, entityId: 2, companyId: 5, data: JSON.stringify({ orderRef: 99, note: 'c' }), deletedAt: null },
    ],
  };
  const match = (rec, where = {}) => Object.entries(where).every(([k, v]) => {
    if (v === null) return rec[k] === null || rec[k] === undefined;
    if (typeof v === 'object') return true;
    return rec[k] === v;
  });
  return {
    store,
    entityField: {
      findMany: async ({ where } = {}) => store.fields.filter((f) => match(f, where)),
    },
    entityRecord: {
      findUnique: async ({ where } = {}) => store.records.find((r) => r.id === where.id) || null,
      findMany: async ({ where } = {}) => store.records.filter((r) => match(r, where)),
      update: async ({ where, data }) => {
        const rec = store.records.find((r) => r.id === where.id);
        Object.assign(rec, data);
        return rec;
      },
      delete: async ({ where }) => {
        const i = store.records.findIndex((r) => r.id === where.id);
        return store.records.splice(i, 1)[0];
      },
    },
  };
}

describe('cascade.service (master-detail)', () => {
  test('soft-deletes owned detail records only', async () => {
    const prisma = makePrisma();
    const count = await cascadeDeleteRecords(prisma, 1, 10, { soft: true });
    expect(count).toBe(2);
    const byId = new Map(prisma.store.records.map((r) => [r.id, r]));
    expect(byId.get(20).deletedAt).not.toBeNull();
    expect(byId.get(21).deletedAt).not.toBeNull();
    expect(byId.get(22).deletedAt).toBeNull();
  });

  test('hard-deletes owned detail records', async () => {
    const prisma = makePrisma();
    const count = await cascadeDeleteRecords(prisma, 1, 10, { soft: false });
    expect(count).toBe(2);
    expect(prisma.store.records.map((r) => r.id).sort()).toEqual([10, 22]);
  });

  test('no master-detail fields means zero cascade', async () => {
    const prisma = makePrisma();
    prisma.store.fields = prisma.store.fields.filter((f) => f.type !== 'master-detail');
    expect(await cascadeDeleteRecords(prisma, 1, 10)).toBe(0);
  });

  test('base deleteRecord cascades to details', async () => {
    const prisma = makePrisma();
    prisma.entity = { findUnique: async () => ({ id: 1 }) };
    const svc = new BaseRecordService(prisma);
    const ok = await svc.deleteRecord(10, true, 5);
    expect(ok).toBe(true);
    const byId = new Map(prisma.store.records.map((r) => [r.id, r]));
    expect(byId.get(20).deletedAt).not.toBeNull();
    expect(byId.get(22).deletedAt).toBeNull();
  });

  test('self-referencing master-detail terminates', async () => {
    const prisma = makePrisma();
    prisma.store.fields.push({ id: 9, entityId: 1, name: 'parent', label: 'Parent', type: 'master-detail', lookupEntityId: 1, deletedAt: null });
    prisma.store.records.push({ id: 11, entityId: 1, companyId: 5, data: JSON.stringify({ parent: 10 }), deletedAt: null });
    const count = await cascadeDeleteRecords(prisma, 1, 10, { soft: true });
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
