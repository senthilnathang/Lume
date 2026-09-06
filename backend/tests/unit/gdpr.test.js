import { GdprService } from '../../src/core/services/gdpr.service.js';

function makePrisma() {
  const store = {
    user: {
      id: 9, email: 'a@x.com', firstName: 'Ada', lastName: 'L', phone: '123',
      avatar: 'x', password: 'hash', refresh_token: 'tok', isActive: true,
    },
    records: [
      { id: 1, entityId: 1, companyId: 5, createdBy: 9 },
      { id: 2, entityId: 2, companyId: 5, createdBy: 9 },
      { id: 3, entityId: 1, companyId: 5, createdBy: 8 },
    ],
    audits: [],
  };
  return {
    store,
    user: {
      findUnique: async () => ({ ...store.user }),
      update: async ({ data }) => Object.assign(store.user, data),
    },
    entityRecord: {
      findMany: async ({ where }) => store.records.filter((r) =>
        (where.createdBy === undefined || r.createdBy === where.createdBy)
        && (where.companyId === undefined || r.companyId === where.companyId)),
      deleteMany: async ({ where }) => {
        const before = store.records.length;
        store.records = store.records.filter((r) =>
          !((where.createdBy === undefined || r.createdBy === where.createdBy)
            && (where.companyId === undefined || r.companyId === where.companyId)));
        return { count: before - store.records.length };
      },
    },
  };
}

describe('GDPR erasure (F4.4)', () => {
  test('collects user data without secrets', async () => {
    const svc = new GdprService(makePrisma());
    const data = await svc.collectUserData(9, 5);
    expect(data.user.password).toBeUndefined();
    expect(data.user.refresh_token).toBeUndefined();
    expect(data.user.email).toBe('a@x.com');
    expect(data.totalRecords).toBe(2);
    expect(data.recordCounts).toEqual({ 1: 1, 2: 1 });
  });

  test('returns null for unknown users', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique = async () => null;
    const svc = new GdprService(prisma);
    expect(await svc.collectUserData(99, 5)).toBeNull();
    expect(await svc.eraseUserData(99, { companyId: 5 })).toBeNull();
  });

  test('erases records, scrubs identity, writes audit proof', async () => {
    const prisma = makePrisma();
    const audits = [];
    const svc = new GdprService(prisma, { log: async (entry) => { audits.push(entry); return entry; } });
    const res = await svc.eraseUserData(9, { companyId: 5, actorId: 1 });
    expect(res.recordsDeleted).toBe(2);
    expect(prisma.store.records).toHaveLength(1);
    expect(prisma.store.user.email).toMatch(/^erased-9-.*@invalid\.local$/);
    expect(prisma.store.user.isActive).toBe(false);
    expect(prisma.store.user.refresh_token).toBeNull();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'delete', model: 'User' });
  });

  test('requires a prisma client', () => {
    expect(() => new GdprService(null)).toThrow();
  });
});
