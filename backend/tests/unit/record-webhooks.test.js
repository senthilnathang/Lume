import { RecordService } from '../../src/modules/base/services/record.service.js';

function makePrisma() {
  const store = {
    fields: [{ id: 1, entityId: 1, name: 'title', label: 'Title', type: 'text', deletedAt: null }],
    records: [],
    seq: 1,
  };
  return {
    entity: { findUnique: async () => ({ id: 1, name: 'task' }) },
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
      delete: async ({ where }) => {
        const i = store.records.findIndex((r) => r.id === where.id);
        return store.records.splice(i, 1)[0];
      },
    },
  };
}

describe('record webhook notifications (F2.4)', () => {
  test('create/update/delete succeed with webhook dispatch attached', async () => {
    const svc = new RecordService(makePrisma());
    const created = await svc.createRecord(1, { title: 'T' }, 5, 9, {});
    expect(created.data.title).toBe('T');
    const updated = await svc.updateRecord(created.id, { title: 'T2' }, 5, {});
    expect(updated.data.title).toBe('T2');
    expect(await svc.deleteRecord(created.id, true, 5, {})).toBe(true);
  });
});
