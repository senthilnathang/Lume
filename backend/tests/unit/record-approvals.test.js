import { RecordService } from '../../src/modules/base/services/record.service.js';

function makePrisma() {
  const store = {
    fields: [{ id: 1, entityId: 1, name: 'title', label: 'Title', type: 'text', deletedAt: null }],
    records: [],
    seq: 1,
  };
  return {
    entity: { findUnique: async () => ({ id: 1, name: 'expense' }) },
    entityField: { findMany: async () => store.fields },
    entityFieldPermission: { findMany: async () => [] },
    entityRecord: {
      create: async ({ data }) => {
        const rec = { id: store.seq++, ...data, deletedAt: null };
        store.records.push(rec);
        return rec;
      },
      findUnique: async ({ where }) => store.records.find((r) => r.id === where.id) || null,
      findMany: async () => store.records,
      update: async ({ where, data }) => {
        const rec = store.records.find((r) => r.id === where.id);
        Object.assign(rec, data);
        return rec;
      },
    },
  };
}

describe('approval auto-start on record create (F2.2)', () => {
  test('create succeeds whether or not approval tables exist', async () => {
    const svc = new RecordService(makePrisma());
    const rec = await svc.createRecord(1, { title: 'Trip' }, 5, 9, {});
    expect(rec.data.title).toBe('Trip');
    await new Promise((r) => setTimeout(r, 50));
  });
});
