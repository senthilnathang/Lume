import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { createHarness, type Harness } from './harness';
jest.setTimeout(120000);

describe('GraphQL batching, complexity, and subscriptions (real MySQL)', () => {
  let h: Harness;
  const env = process.env.NODE_ENV;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  afterEach(() => { process.env.NODE_ENV = env; h.settings.slowQueries = false; jest.restoreAllMocks(); });
  it('batches fields for ten entities into one SQL query', async () => {
    h.queries.length = 0;
    const response = await h.query('{ entities(pagination:{limit:10}) { id fields { id name type } } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities).toHaveLength(10);
    expect(response.body.data.entities.every((entity: any) => entity.fields.length > 0)).toBe(true);
    expect(h.queries.filter(sql => sql.includes('FROM') && sql.includes('`entity_fields`'))).toHaveLength(1);
  });
  it('batches role resolution for multiple field permissions', async () => {
    // Authentication now checks the user's current role in the database.
    // Measure that fixed cost separately from the nested role loader.
    h.queries.length = 0;
    const baseline = await h.query('{ fieldPermissions(roleId:2,pagination:{limit:10}) { id } }');
    expect(baseline.body.errors).toBeUndefined();
    const authRoleQueries = h.queries.filter(sql => sql.includes('FROM') && sql.includes('`roles`')).length;
    h.queries.length = 0;
    const response = await h.query('{ fieldPermissions(roleId:2,pagination:{limit:10}) { id role { id name } } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.fieldPermissions).toHaveLength(3);
    expect(response.body.data.fieldPermissions.every((permission: any) => permission.role.name === 'member')).toBe(true);
    expect(h.queries.filter(sql => sql.includes('FROM') && sql.includes('`roles`'))).toHaveLength(authRoleQueries + 1);
  });
  it('executes unrelated entity and role queries separately', async () => {
    h.queries.length = 0;
    const response = await h.query('{ entities(pagination:{limit:1}) { id } roles { id } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities).toHaveLength(1);
    expect(response.body.data.roles).toHaveLength(3);
    expect(h.queries.some(sql => sql.includes('`entities`'))).toBe(true);
    expect(h.queries.some(sql => sql.includes('`roles`'))).toBe(true);
  });
  it('allows a simple production query and reports its cost', async () => {
    process.env.NODE_ENV = 'production';
    const response = await h.query('{ entities(pagination:{limit:5}) { id name } }');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.extensions.queryComplexity).toBeGreaterThan(0);
    expect(response.body.extensions.queryComplexity).toBeLessThanOrEqual(100);
  });
  const expensive = '{ entityRecords(entityId:1,pagination:{limit:50}) { items { id data } } }';
  it('rejects expensive JSON selections before database access', async () => {
    process.env.NODE_ENV = 'production';
    h.queries.length = 0;
    const response = await h.query(expensive);
    expect(response.body.errors[0].extensions.code).toBe('QUERY_COMPLEXITY_EXCEEDED');
    expect(response.body.errors[0].message).toMatch(/Query too complex: \d+\/100/);
    expect(h.queries).toHaveLength(0);
  });
  it('counts pagination variables, fragments, and aliases', async () => {
    process.env.NODE_ENV = 'production';
    const response = await h.query('query Cost($limit:Int!){ a:entities(pagination:{limit:$limit}) {...E} b:entities(pagination:{limit:$limit}) {...E} } fragment E on Entity { id name label }', undefined, { limit: 30 });
    expect(response.body.errors[0].extensions.code).toBe('QUERY_COMPLEXITY_EXCEEDED');
  });
  it('allows the same query within the higher development budget', async () => {
    process.env.NODE_ENV = 'development';
    const response = await h.query(expensive);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entityRecords.items).toHaveLength(3);
    expect(response.body.extensions.queryComplexity).toBeGreaterThan(100);
  });
  it('serves a warmed simple query within a one-second integration budget', async () => {
    const query = '{ entities(pagination:{limit:5}) { id name } }';
    await h.query(query);
    const start = performance.now();
    const response = await h.query(query);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities).toHaveLength(5);
    expect(performance.now() - start).toBeLessThan(1000);
  });
  it('logs a slow-query warning for a real delayed SQL operation', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');
    h.settings.slowQueries = true;
    const response = await h.query('{ entities(pagination:{limit:1}) { id } }');
    expect(response.body.errors).toBeUndefined();
    expect(warn.mock.calls.some(args => String(args[0]).includes('Slow GraphQL query:'))).toBe(true);
  });
  it('delivers a burst to five concurrent subscribers and releases their listeners', async () => {
    const clients = Array.from({ length: 5 }, () => createClient({ url: h.wsUrl, webSocketImpl: WebSocket, connectionParams: { authorization: `Bearer ${h.token()}` }, retryAttempts: 0 }));
    const disposers: Array<() => void> = [];
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    try {
      const deliveries = clients.map(client => new Promise<number[]>((resolve, reject) => {
        const ids: number[] = [];
        const timer = setTimeout(() => reject(new Error(`Received ${ids.length}/100 subscription events`)), 5000);
        timers.push(timer);
        disposers.push(client.subscribe({ query: 'subscription { flowExecuted { id } }' }, {
          next: value => { if (value.errors) return reject(value.errors); ids.push((value.data as any).flowExecuted.id); if (ids.length === 100) { clearTimeout(timer); resolve(ids); } },
          error: reject, complete: () => {},
        }));
      }));
      const start = Date.now();
      while ((h.pubsub as any).ee.listenerCount('flowExecuted') !== 5) {
        if (Date.now() - start > 3000) throw new Error('Subscribers did not register');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      for (let id = 0; id < 100; id++) await h.pubsub.publish('flowExecuted', { flowExecuted: { id, companyId: 1 } });
      for (const ids of await Promise.all(deliveries)) expect(ids).toEqual(Array.from({ length: 100 }, (_, i) => i));
    } finally {
      timers.forEach(clearTimeout);
      disposers.forEach(dispose => dispose());
      await Promise.all(clients.map(client => client.dispose()));
    }
    const start = Date.now();
    while ((h.pubsub as any).ee.listenerCount('flowExecuted') !== 0 && Date.now() - start < 2000) await new Promise(resolve => setTimeout(resolve, 10));
    expect((h.pubsub as any).ee.listenerCount('flowExecuted')).toBe(0);
  });
});
