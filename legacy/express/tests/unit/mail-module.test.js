import { MailService, matchesFilter, applyMappings } from '../../src/modules/mail/services/mail.service.js';

function collection(rows, seq = { n: 1 }) {
  return {
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
  const rules = [
    { id: 1, name: 'support', isActive: true, priority: 5, subjectFilter: 'support|help', action: 'create_record', targetEntity: 'ticket', fieldMappings: { subject: 'title' }, companyId: null },
    { id: 2, name: 'catchall', isActive: true, priority: 99, action: 'create_record', targetEntity: null, fieldMappings: {}, companyId: null },
  ];
  const prisma = {
    entity: { findFirst: async () => ({ id: 7, name: 'ticket' }) },
    entityRecord: { create: async ({ data }) => ({ id: 42, ...data }) },
  };
  const svc = new MailService(
    { rules: collection(rules), messages: collection([]), queue: collection([]), servers: collection([]) },
    prisma
  );
  return svc;
}

function stubCollections(svc, { rules, messages, queue, servers }) {
  const collection = (rows) => ({
    findAll: async () => ({ rows, total: rows.length }),
    findById: async (id) => rows.find((r) => r.id === Number(id)) || null,
    create: async (data) => {
      const row = { id: rows.length + 1, ...data };
      rows.push(row);
      return row;
    },
    update: async (id, data) => Object.assign(rows.find((r) => r.id === Number(id)), data),
  });
  svc.rules = collection(rules);
  svc.messages = collection(messages);
  svc.queue = collection(queue);
  svc.servers = collection(servers);
}

describe('mail IMAP fetch hardening', () => {
  function fetchService(server, inbox, messages) {
    const svc = new MailService(
      {
        servers: {
          findById: async () => server,
          update: async (id, data) => Object.assign(server, data),
        },
        rules: { findAll: async () => ({ rows: [], total: 0 }) },
        messages: {
          create: async (data) => {
            const row = { id: messages.length + 1, ...data };
            messages.push(row);
            return row;
          },
          findAll: async () => ({ rows: messages, total: messages.length }),
        },
        queue: { create: async (data) => ({ id: 1, ...data }), findAll: async () => ({ rows: [], total: 0 }) },
      },
      null
    );
    const factory = async () => ({
      getMailboxLock: async () => ({ release: async () => {} }),
      fetch: async function* () {
        for (const m of inbox) {
          yield m;
        }
      },
    });
    return { svc, factory };
  }

  const inboxMsg = (id) => ({
    envelope: { from: [{ address: 'a@x.com' }], to: [{ address: 'b@x.com' }], subject: `S${id}`, messageId: `<${id}@x>` },
    bodyParts: new Map([['text', Buffer.from('hello')]]),
  });

  test('dedupes by message id and caps fetch size', async () => {
    const messages = [];
    const server = { id: 3, host: 'imap.x', username: 'u', password: 'p' };
    const { svc, factory } = fetchService(server, [inboxMsg(1), inboxMsg(1), inboxMsg(2)], messages);
    const first = await svc.fetchServer(3, { clientFactory: factory });
    expect(first.fetched).toBe(2);
    expect(first.skipped).toBe(1);
    const second = await svc.fetchServer(3, { clientFactory: factory });
    expect(second.fetched).toBe(0);
    expect(second.skipped).toBe(3);
    expect(server.lastFetchAt).toBeTruthy();
    expect(server.lastError).toBeNull();
  });

  test('concurrent fetches are rejected and errors recorded', async () => {
    const messages = [];
    const server = { id: 4, host: 'imap.x', username: 'u', password: 'p' };
    let release;
    const gate = new Promise((r) => { release = r; });
    const slowFactory = async () => ({
      getMailboxLock: async () => ({ release: async () => {} }),
      fetch: async function* () {
        await gate;
        yield inboxMsg(9);
      },
    });
    const { svc } = fetchService(server, [], messages);
    const running = svc.fetchServer(4, { clientFactory: slowFactory });
    await expect(svc.fetchServer(4, { clientFactory: slowFactory })).rejects.toThrow(/already in progress/);
    release();
    await running;
  });

  test('connection failures set lastError', async () => {
    const server = { id: 5, host: 'bad', username: 'u', password: 'p' };
    const { svc } = fetchService(server, [], []);
    await expect(svc.fetchServer(5, { clientFactory: async () => { throw new Error('conn refused'); } }))
      .rejects.toThrow(/conn refused/);
    expect(String(server.lastError)).toMatch(/conn refused/);
  });
});

describe('mail module (FastVue port)', () => {
  test('matches regex filters with fallback', () => {
    expect(matchesFilter('support|help', 'Need HELP')).toBe(true);
    expect(matchesFilter('', 'anything')).toBe(true);
    expect(matchesFilter('([invalid', '([invalid')).toBe(true);
    expect(matchesFilter('^hi$', 'hello')).toBe(false);
  });

  test('applies source-to-target field mappings', () => {
    expect(applyMappings({ subject: 'S', from: 'a@x' }, { subject: 'title', from: 'reporter' }))
      .toEqual({ title: 'S', reporter: 'a@x' });
    expect(applyMappings({ subject: 'S' }, {})).toEqual({});
  });

  test('routes to first matching rule and creates a record', async () => {
    const svc = makeService();
    stubCollections(svc, {
      rules: [
        { id: 1, name: 'support', isActive: true, priority: 5, subjectFilter: 'support', action: 'create_record', targetEntity: 'ticket', fieldMappings: { subject: 'title' }, companyId: null },
        { id: 2, name: 'catchall', isActive: true, priority: 99, action: 'create_record', targetEntity: null, fieldMappings: {}, companyId: null },
      ],
      messages: [],
      queue: [],
      servers: [],
    });
    const res = await svc.routeMessage({ from: 'u@x.com', subject: 'Support needed', body: 'x' }, 5);
    expect(res.matched).toBe(true);
    expect(res.ruleId).toBe(1);
    expect(res.recordId).toBe(42);
  });

  test('falls through to catchall and queues auto-replies', async () => {
    const svc = makeService();
    stubCollections(svc, {
      rules: [{ id: 9, name: 'catchall', isActive: true, priority: 99, action: 'create_record', targetEntity: null, fieldMappings: {}, replySubject: 'Thanks', replyBody: 'Got it', companyId: null }],
      messages: [],
      queue: [],
      servers: [],
    });
    const res = await svc.routeMessage({ from: 'u@x.com', subject: 'Hi', body: 'x' }, 5);
    expect(res.ruleId).toBe(9);
    const queued = await svc.queue.findAll();
    expect(queued.rows).toHaveLength(1);
    expect(queued.rows[0].toAddress).toBe('u@x.com');
  });

  test('queue processes with isolation and retry accounting', async () => {
    const svc = makeService();
    const sent = [];
    svc.emailSender = async (item) => {
      if (item.toAddress === 'bad@x') {
        throw new Error('SMTP down');
      }
      sent.push(item.toAddress);
    };
    stubCollections(svc, { rules: [], messages: [], servers: [], queue: [] });
    await svc.enqueue({ to: 'ok@x', subject: 'a' });
    await svc.enqueue({ to: 'bad@x', subject: 'b' });
    const results = await svc.processQueue(10);
    expect(results.find((r) => r.status === 'sent')).toBeTruthy();
    const failed = results.find((r) => r.status !== 'sent');
    expect(failed.error).toMatch(/SMTP down/);
    expect(sent).toEqual(['ok@x']);
  });
});
