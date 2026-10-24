import { RecordService } from '../../src/modules/base/services/record.service.js';

function makePrisma() {
  const store = {
    entity: { id: 1, name: 'employee' },
    fields: [
      { id: 11, entityId: 1, name: 'name', label: 'Name', type: 'text', required: true },
      { id: 12, entityId: 1, name: 'salary', label: 'Salary', type: 'number', required: false },
      { id: 13, entityId: 1, name: 'bonus', label: 'Bonus', type: 'number', formulaExpression: '{salary} * 0.1' },
    ],
    records: [],
    permissions: [],
    seq: 100,
  };
  return {
    store,
    entity: {
      findUnique: async () => store.entity,
    },
    entityField: {
      findMany: async () => store.fields.filter((f) => !f.deletedAt),
    },
    entityFieldPermission: {
      findMany: async ({ where }) => store.permissions.filter(
        (p) => where.fieldId.in.includes(p.fieldId) && p.roleId === where.roleId
      ),
    },
    entityRecord: {
      create: async ({ data }) => {
        const rec = { id: store.seq++, ...data, deletedAt: null };
        store.records.push(rec);
        return rec;
      },
      findUnique: async ({ where }) => store.records.find((r) => r.id === where.id) || null,
      findMany: async ({ where }) => store.records.filter(
        (r) => r.entityId === where.entityId && r.companyId === where.companyId && !r.deletedAt
      ),
      update: async ({ where, data }) => {
        const rec = store.records.find((r) => r.id === where.id);
        Object.assign(rec, data);
        return rec;
      },
    },
  };
}

describe('entity record field policy (base record.service)', () => {
  test('computes formulas on create and allows all when no policy rows exist', async () => {
    const prisma = makePrisma();
    const svc = new RecordService(prisma);
    const rec = await svc.createRecord(1, { name: 'Ada', salary: 1000 }, 5, 9, { roleId: 9 });
    expect(rec.data.bonus).toBe(100);
    expect(rec.data.salary).toBe(1000);
  });

  test('strips unreadable fields on read and drops unwritable fields on update', async () => {
    const prisma = makePrisma();
    prisma.store.permissions = [
      { fieldId: 11, roleId: 7, canRead: true, canWrite: true },
      { fieldId: 12, roleId: 7, canRead: false, canWrite: false },
      { fieldId: 13, roleId: 7, canRead: true, canWrite: false },
    ];
    const svc = new RecordService(prisma);
    const created = await svc.createRecord(1, { name: 'Bob', salary: 2000 }, 5, 9);
    expect(created.data.salary).toBe(2000);

    const fetched = await svc.getRecord(created.id, 5, { roleId: 7 });
    expect(fetched.data.name).toBe('Bob');
    expect(fetched.data.salary).toBeUndefined();
    expect(fetched.data.bonus).toBe(200);

    const updated = await svc.updateRecord(created.id, { name: 'Bobby', salary: 9999 }, 5, { roleId: 7 });
    expect(updated.data.name).toBe('Bobby');
    expect(updated.data.salary).toBeUndefined();
    expect(updated.data.bonus).toBe(200);
    const stored = JSON.parse(prisma.store.records.find((r) => r.id === created.id).data);
    expect(stored.salary).toBe(2000);
    expect(stored.bonus).toBe(200);
  });

  test('full access when role has no policy rows (legacy default-allow)', async () => {
    const prisma = makePrisma();
    prisma.store.permissions = [{ fieldId: 11, roleId: 7, canRead: true, canWrite: true }];
    const svc = new RecordService(prisma);
    const created = await svc.createRecord(1, { name: 'Cy', salary: 500 }, 5, 9);
    const fetched = await svc.getRecord(created.id, 5, { roleId: 99 });
    expect(fetched.data.salary).toBe(500);
  });
});
