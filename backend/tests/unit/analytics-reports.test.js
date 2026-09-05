import { AnalyticsReportService } from '../../src/modules/advanced_features/services/analytics-reports.js';

function makeService() {
  const store = {
    reports: [],
    seq: 1,
    records: [
      { id: 1, entityId: 1, companyId: 5, createdBy: 9, visibility: 'company', deletedAt: null, data: JSON.stringify({ title: 'A', amount: 100, stage: 'won' }) },
      { id: 2, entityId: 1, companyId: 5, createdBy: 8, visibility: 'company', deletedAt: null, data: JSON.stringify({ title: 'B', amount: 200, stage: 'new' }) },
      { id: 3, entityId: 1, companyId: 5, createdBy: 8, visibility: 'private', deletedAt: null, data: JSON.stringify({ title: 'C', amount: 300, stage: 'won' }) },
    ],
  };
  const prisma = {
    entity: { findFirst: async () => ({ id: 1, name: 'deal' }) },
    entityRecord: { findMany: async () => store.records.filter((r) => !r.deletedAt) },
  };
  const svc = new AnalyticsReportService(prisma);
  svc.adapter = {
    create: async (data) => {
      const row = { id: store.seq++, ...data };
      store.reports.push(row);
      return row;
    },
    findById: async (id) => store.reports.find((r) => r.id === Number(id)) || null,
    update: async (id, data) => {
      const row = store.reports.find((r) => r.id === Number(id));
      Object.assign(row, data);
      return row;
    },
    delete: async (id) => {
      const i = store.reports.findIndex((r) => r.id === Number(id));
      store.reports.splice(i, 1);
      return true;
    },
    findAll: async () => ({ rows: store.reports, total: store.reports.length }),
  };
  return svc;
}

describe('analytics reports (FastVue port)', () => {
  test('validates definitions', async () => {
    const svc = makeService();
    await expect(svc.create({})).rejects.toMatchObject({ errors: expect.objectContaining({ name: expect.any(String) }) });
    await expect(svc.create({ name: 'R', code: 'r', baseEntity: 'deal', reportType: 'nope' }))
      .rejects.toMatchObject({ errors: expect.objectContaining({ reportType: expect.any(String) }) });
    const ok = await svc.create({ name: 'Deals', code: 'deals', baseEntity: 'deal' });
    expect(ok.reportType).toBe('tabular');
  });

  test('runs tabular reports with filters, scoping to visible rows', async () => {
    const svc = makeService();
    const report = await svc.create({
      name: 'Won', code: 'won', baseEntity: 'deal',
      queryConfig: { fields: [{ field: 'title' }, { field: 'amount' }], filters: [{ field: 'stage', operator: 'equals', value: 'won' }] },
    });
    const asOwner = await svc.run(report.id, { companyId: 5, userId: 9 });
    expect(asOwner.total).toBe(1);
    expect(asOwner.rows[0]).toEqual({ id: 1, title: 'A', amount: 100 });
    const asStranger = await svc.run(report.id, { companyId: 5, userId: 77 });
    expect(asStranger.total).toBe(1);
    expect(asStranger.rows[0].title).toBe('A');
  });

  test('runs grouped reports with aggregates', async () => {
    const svc = makeService();
    const report = await svc.create({
      name: 'By stage', code: 'by-stage', baseEntity: 'deal',
      groupingConfig: { groupBy: 'stage', aggregates: [{ field: 'amount', fn: 'sum' }] },
    });
    const result = await svc.run(report.id, { companyId: 5, userId: 9, isPrivileged: true });
    const won = result.rows.find((r) => r.stage === 'won');
    expect(won.count).toBe(2);
    expect(won.sum_amount).toBe(400);
  });

  test('returns null for unknown reports, errors for unknown entities', async () => {
    const svc = makeService();
    expect(await svc.run(999, { companyId: 5 })).toBeNull();
    const report = await svc.create({ name: 'X', code: 'x', baseEntity: 'ghost' });
    svc.prisma.entity.findFirst = async () => null;
    await expect(svc.run(report.id, { companyId: 5 })).rejects.toMatchObject({ code: 'ENTITY_NOT_FOUND' });
  });
});
