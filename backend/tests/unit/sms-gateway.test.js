import { SmsService, renderTemplate } from '../../src/modules/sms/services/sms.service.js';

function makeService({ providers = [{ id: 1, name: 'stub', providerType: 'log', config: {}, isDefault: true, isActive: true }], templates = [] } = {}) {
  const store = { logs: [], seq: 1 };
  return {
    svc: new SmsService({
      providers: {
        findAll: async () => ({ rows: providers, total: providers.length }),
        findById: async (id) => providers.find((p) => p.id === Number(id)) || null,
        create: async (data) => ({ id: 99, ...data }),
        update: async (id, data) => Object.assign(providers.find((p) => p.id === Number(id)), data),
      },
      templates: {
        findAll: async () => ({ rows: templates, total: templates.length }),
      },
      logs: {
        create: async (data) => {
          const row = { id: store.seq++, ...data };
          store.logs.push(row);
          return row;
        },
        findById: async (id) => store.logs.find((l) => l.id === Number(id)) || null,
      },
    }),
    store,
  };
}

describe('sms gateway (FastVue port)', () => {
  test('renders template variables, keeping unknowns', () => {
    expect(renderTemplate('Hi {{name}}, code {{code}}!', { name: 'Ada' })).toBe('Hi Ada, code {{code}}!');
  });

  test('sends via default provider and logs delivery', async () => {
    const { svc, store } = makeService();
    const res = await svc.send({ to: '+10000000000', body: 'Hello' });
    expect(res.status).toBe('sent');
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0].toNumber).toBe('+10000000000');
  });

  test('sends from a template with variables', async () => {
    const { svc } = makeService({ templates: [{ code: 'otp', body: 'Code: {{code}}', isActive: true }] });
    const res = await svc.send({ to: '+1', templateCode: 'otp', variables: { code: '1234' } });
    expect(res.status).toBe('sent');
  });

  test('requires recipient and message, logs failures', async () => {
    const { svc, store } = makeService({ providers: [] });
    await expect(svc.send({ to: '', body: 'x' })).rejects.toThrow(/recipient/i);
    await expect(svc.send({ to: '+1', templateCode: 'missing' })).rejects.toThrow(/not found/);
    expect(store.logs).toHaveLength(0);
  });

  test('bulk send isolates per-recipient failures', async () => {
    const { svc } = makeService();
    const results = await svc.sendBulk([{ to: '+1', body: 'a' }, { to: '', body: 'b' }]);
    expect(results[0].status).toBe('sent');
    expect(results[1].status).toBe('failed');
  });
});
