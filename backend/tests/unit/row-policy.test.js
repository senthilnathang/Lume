import { RecordService } from '../../src/modules/base/services/record.service.js';
import { AccessControlService } from '../../src/core/services/access-control.service.js';

function makePrisma() {
  const store = {
    fields: [{ id: 1, entityId: 1, name: 'title', label: 'Title', type: 'text', deletedAt: null }],
    records: [
      { id: 1, entityId: 1, companyId: 5, createdBy: 9, visibility: 'private', data: JSON.stringify({ title: 'A' }), deletedAt: null },
      { id: 2, entityId: 1, companyId: 5, createdBy: 8, visibility: 'company', data: JSON.stringify({ title: 'B' }), deletedAt: null },
      { id: 3, entityId: 1, companyId: 5, createdBy: 8, visibility: 'private', data: JSON.stringify({ title: 'C' }), deletedAt: null },
      { id: 4, entityId: 1, companyId: 6, createdBy: 9, visibility: 'private', data: JSON.stringify({ title: 'D' }), deletedAt: null },
    ],
  };
  const scalar = (rec, k, v) => {
    if (v === null) return rec[k] === null || rec[k] === undefined;
    if (typeof v === 'object' && v !== null) {
      if ('not' in v) return rec[k] !== v.not;
      if ('in' in v) return v.in.includes(rec[k]);
      return true;
    }
    return rec[k] === v;
  };
  const match = (rec, where = {}) => Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return v.some((clause) => match(rec, clause));
    if (k === 'AND') return v.every((clause) => match(rec, clause));
    return scalar(rec, k, v);
  });
  return {
    store,
    entity: { findUnique: async () => ({ id: 1 }) },
    entityField: { findMany: async () => store.fields },
    entityFieldPermission: { findMany: async () => [] },
    entityRecord: {
      findUnique: async ({ where }) => store.records.find((r) => r.id === where.id) || null,
      findMany: async ({ where }) => store.records.filter((r) => match(r, where)),
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

describe('row-level record visibility', () => {
  test('owner sees own private record, others do not', async () => {
    const svc = new RecordService(makePrisma());
    expect((await svc.getRecord(1, 5, { userId: 9 })).data.title).toBe('A');
    expect(await svc.getRecord(1, 5, { userId: 8 })).toBeNull();
  });

  test('company-visible records are readable company-wide but not cross-company', async () => {
    const svc = new RecordService(makePrisma());
    expect((await svc.getRecord(2, 5, { userId: 9 })).data.title).toBe('B');
    expect(await svc.getRecord(4, 5, { userId: 9 })).toBeNull();
  });

  test('privileged roles bypass visibility within their company', async () => {
    const svc = new RecordService(makePrisma());
    expect((await svc.getRecord(3, 5, { userId: 1, isPrivileged: true })).data.title).toBe('C');
    expect(await svc.getRecord(4, 5, { userId: 1, isPrivileged: true })).toBeNull();
  });

  test('list scopes to visible rows only', async () => {
    const svc = new RecordService(makePrisma());
    const mine = await svc.listRecords(1, 5, { userId: 9 });
    expect(mine.records.map((r) => r.data.title).sort()).toEqual(['A', 'B']);
    const admin = await svc.listRecords(1, 5, { userId: 1, isPrivileged: true });
    expect(admin.records).toHaveLength(3);
    const legacy = await svc.listRecords(1, 5, {});
    expect(legacy.records).toHaveLength(3);
  });

  test('update and delete respect visibility', async () => {
    const svc = new RecordService(makePrisma());
    expect(await svc.updateRecord(3, { title: 'C2' }, 5, { userId: 9 })).toBeNull();
    const ok = await svc.updateRecord(3, { title: 'C2' }, 5, { userId: 8 });
    expect(ok.data.title).toBe('C2');
    expect(await svc.deleteRecord(3, true, 5, { userId: 9 })).toBe(false);
    expect(await svc.deleteRecord(3, true, 5, { userId: 8 })).toBe(true);
  });

  test('buildRecordScope mirrors service semantics', () => {
    const ac = new AccessControlService(null);
    expect(ac.buildRecordScope({ companyId: 5, userId: 9 })).toEqual({
      companyId: 5,
      AND: [{ OR: [{ visibility: { not: 'private' } }, { visibility: null }, { createdBy: 9 }] }],
    });
    expect(ac.buildRecordScope({ companyId: 5, userId: 1, isPrivileged: true })).toEqual({ companyId: 5 });
  });
});
