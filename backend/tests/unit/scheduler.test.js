import { SchedulerService } from '../../src/core/services/scheduler.service.js';

const runningJobs = [];
afterEach(() => {
  while (runningJobs.length) {
    try {
      runningJobs.pop().stop();
    } catch { /* ignore */ }
  }
});

function makeService(actions = []) {
  const store = [...actions];
  const adapter = {
    findAll: async () => ({ rows: store, total: store.length }),
    update: async (id, data) => Object.assign(store.find((a) => a.id === Number(id)), data),
  };
  const svc = new SchedulerService(adapter);
  return { svc, store };
}

describe('scheduler service (F2.3)', () => {
  test('skips actions with invalid cron expressions', async () => {
    const { svc } = makeService([{ id: 1, cronExpression: 'not-a-cron', actionType: 'http_request', config: {} }]);
    await svc.initialize();
    for (const job of svc.jobs.values()) {
      runningJobs.push(job);
    }
    expect(svc.jobs.has(1)).toBe(false);
  });

  test('executes service-method actions and tracks runs', async () => {
    const { svc, store } = makeService([{
      id: 2, cronExpression: '* * * * *', actionType: 'run_service_method',
      config: { service: 'x', method: 'y' }, runCount: 3,
    }]);
    svc._executeServiceMethod = async () => ({ ok: true });
    const res = await svc._executeAction(store[0]);
    expect(res.success).toBe(true);
    expect(store[0].runCount).toBe(4);
    expect(store[0].lastRunAt).toBeTruthy();
  });

  test('unknown action types fail gracefully with tracking', async () => {
    const { svc, store } = makeService([{ id: 3, cronExpression: '* * * * *', actionType: 'nope', config: {} }]);
    const res = await svc._executeAction(store[0]);
    expect(res.success).toBe(true);
    expect(res.result.error).toMatch(/Unknown action type/);
    expect(store[0].lastRunAt).toBeTruthy();
  });

  test('execution errors are captured, not thrown', async () => {
    const { svc, store } = makeService([{ id: 4, cronExpression: '* * * * *', actionType: 'http_request', config: {} }]);
    svc._executeHttpRequest = async () => { throw new Error('conn refused'); };
    const res = await svc._executeAction(store[0]);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/conn refused/);
  });
});
