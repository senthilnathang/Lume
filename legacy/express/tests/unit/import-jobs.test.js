import { FeaturesDataService } from '../../src/modules/base_features_data/services/index.js';

function collection(rows = [], seq = { n: 1 }) {
  return {
    getFields: () => [{ name: 'title', required: true }, { name: 'amount', required: false }],
    findAll: async () => ({ rows, total: rows.length }),
    findById: async (id) => rows.find((r) => r.id === Number(id)) || null,
    create: async (data) => {
      const row = { id: seq.n++, ...data };
      rows.push(row);
      return row;
    },
    update: async (id, data) => Object.assign(rows.find((r) => r.id === Number(id)), data),
  };
}

function makeService() {
  return new FeaturesDataService({
    deals: collection(),
    DataImport: collection(),
  });
}

describe('import job history (F4.1)', () => {
  test('execute persists a completed job with counters', async () => {
    const svc = makeService();
    const rows = [{ title: 'A', amount: '10' }, { title: 'B', amount: '20' }];
    const mappings = [{ source_column: 'title', target_field: 'title' }, { source_column: 'amount', target_field: 'amount' }];
    const res = await svc.executeImport('deals', rows, mappings, { job: { name: 'f.csv', importedBy: 9 } });
    expect(res.status).toBe('COMPLETED');
    expect(res.job_id).toBeTruthy();
    const job = await svc.getImportJob(res.job_id);
    expect(job.status).toBe('completed');
    expect(job.successRows).toBe(2);
    expect(job.totalRows).toBe(2);
  });

  test('failed imports persist partial counters', async () => {
    const svc = makeService();
    const failing = svc.models.deals;
    failing.create = async () => { throw new Error('db gone'); };
    const rows = [{ title: 'A' }];
    const res = await svc.executeImport('deals', rows, [{ source_column: 'title', target_field: 'title' }], {
      skipErrors: true,
      job: { name: 'bad.csv' },
    });
    expect(res.job_id).toBeTruthy();
    const job = await svc.getImportJob(res.job_id);
    expect(job.failedRows).toBe(1);
    expect(job.status).not.toBe('running');
  });

  test('lists job history newest first contract', async () => {
    const svc = makeService();
    await svc.executeImport('deals', [{ title: 'A' }], [{ source_column: 'title', target_field: 'title' }], { job: { name: 'a.csv' } });
    const history = await svc.listImportJobs({ limit: 10 });
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].name).toBe('a.csv');
  });

  test('works without a job store (jobs disabled)', async () => {
    const svc = new FeaturesDataService({ deals: collection() });
    const res = await svc.executeImport('deals', [{ title: 'A' }], [{ source_column: 'title', target_field: 'title' }]);
    expect(res.status).toBe('COMPLETED');
    expect(res.job_id).toBeNull();
  });
});
