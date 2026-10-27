import { jest } from '@jest/globals';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { createHarness, type Harness } from './harness';

jest.setTimeout(120000);
const read = '{ entities(pagination:{limit:1}) { id name } }';
const createRecord = 'mutation { createEntityRecord(entityId:1,input:{data:{name:"Created"}}) { id companyId createdBy } }';

describe('GraphQL authentication and tenant integration (real MySQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  beforeEach(async () => { await h.prisma.tenantRegistry.deleteMany(); });
  afterAll(async () => { await h?.close(); });
  it.each([null, 'invalid.token', 'expired'])('rejects missing, invalid, or expired credentials: %s', async credential => {
    const response = await h.query(read, credential === 'expired' ? h.token('admin', 1, -1) : credential);
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(response.body.data).toBeNull();
  });
  it('allows an administrator to query stored entities', async () => {
    const response = await h.query(read);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities).toHaveLength(1);
  });
  it('allows a non-admin with persisted read permission', async () => {
    const response = await h.query(read, h.token('member'));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.entities).toHaveLength(1);
  });
  it('rejects users without the requested read permission', async () => {
    const response = await h.query(read, h.token('none'));
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });
  it('enforces permissions separately for mutations', async () => {
    const response = await h.query('mutation { createEntity(input:{name:"forbidden",label:"Forbidden"}) { id } }', h.token('member'));
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(await h.prisma.entity.findFirst({ where: { name: 'forbidden' } })).toBeNull();
  });
  it('requires a tenant for record mutations', async () => {
    const response = await h.query(createRecord, h.token('admin', null));
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(response.body.errors[0].message).toContain('Company ID required');
  });
  it('allows an admin to select a tenant with the header', async () => {
    const response = await h.query(createRecord, h.token('admin', null), undefined, '2');
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.createEntityRecord.companyId).toBe(2);
  });
  it('uses the signed company claim without a header', async () => {
    const response = await h.query(createRecord, h.token('admin', 1));
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.createEntityRecord).toMatchObject({ companyId: 1, createdBy: 1 });
  });
  it.each(['2', '0', '-1', 'abc', '1.5'])('rejects unauthorized or invalid tenant header %s', async tenant => {
    const response = await h.query(createRecord, h.token('member', 1), undefined, tenant);
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });
  it('rejects WebSocket connections without a token', async () => {
    const client = createClient({ url: h.wsUrl, webSocketImpl: WebSocket, retryAttempts: 0 });
    try {
      await expect(new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Authentication was not rejected')), 3000);
        client.subscribe({ query: 'subscription { flowExecuted { id } }' }, {
          next: () => { clearTimeout(timer); reject(new Error('Unauthenticated event')); },
          error: error => { clearTimeout(timer); resolve(error); }, complete: () => {},
        });
      })).resolves.toBeDefined();
    } finally { await client.dispose(); }
  });
  it('authenticates subscriptions and filters events by signed tenant', async () => {
    const client = createClient({ url: h.wsUrl, webSocketImpl: WebSocket, connectionParams: { authorization: `Bearer ${h.token('member', 1)}` }, retryAttempts: 0 });
    const received: any[] = [];
    let dispose = () => {};
    try {
      const event = new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Subscription timed out')), 4000);
        dispose = client.subscribe({ query: 'subscription { flowExecuted { id companyId } }' }, {
          next: value => { received.push(value); clearTimeout(timer); resolve(value); }, error: error => { clearTimeout(timer); reject(error); }, complete: () => {},
        });
      });
      const start = Date.now();
      while (!(h.pubsub as any).ee.listenerCount('flowExecuted')) {
        if (Date.now() - start > 3000) throw new Error('Subscription was not registered');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      await h.pubsub.publish('flowExecuted', { flowExecuted: { id: 21, companyId: 2 } });
      await h.pubsub.publish('flowExecuted', { flowExecuted: { id: 22, companyId: 1 } });
      expect((await event).data.flowExecuted).toEqual({ id: 22, companyId: 1 });
      expect(received).toHaveLength(1);
    } finally { dispose(); await client.dispose(); }
  });
  it('rechecks an open subscription after suspension, reactivation and archive', async () => {
    await h.prisma.tenantRegistry.create({ data: { id: 1, name: 'One', domain: 'one.example', config: '{}' } });
    let deniedReads = 0;
    h.prisma.$use(async (params: any, next: any) => {
      const result = await next(params);
      if (params.model === 'TenantRegistry' && params.action === 'findUnique' && result && (!result.active || result.deletedAt)) deniedReads++;
      return result;
    });
    const client = createClient({ url: h.wsUrl, webSocketImpl: WebSocket, connectionParams: { authorization: `Bearer ${h.token('member', 1)}` }, retryAttempts: 0 });
    const received: any[] = [], errors: any[] = [];
    const dispose = client.subscribe({ query: 'subscription { flowExecuted { id companyId } }' }, { next: value => received.push(value), error: error => errors.push(error), complete: () => {} });
    const until = async (ready: () => boolean) => {
      const deadline = Date.now() + 4000;
      while (!ready()) { if (Date.now() > deadline) throw new Error('Subscription state timed out'); await new Promise(resolve => setTimeout(resolve, 10)); }
    };
    const publish = (id: number) => h.pubsub.publish('flowExecuted', { flowExecuted: { id, companyId: 1 } });
    try {
      await until(() => (h.pubsub as any).ee.listenerCount('flowExecuted') > 0);
      await publish(1); await until(() => received.length === 1);
      await h.prisma.tenantRegistry.update({ where: { id: 1 }, data: { active: false } });
      await publish(2); await until(() => deniedReads === 1);
      await h.prisma.tenantRegistry.update({ where: { id: 1 }, data: { active: true } });
      await publish(3); await until(() => received.length >= 2);
      await h.prisma.tenantRegistry.update({ where: { id: 1 }, data: { active: false, deletedAt: new Date() } });
      await publish(4); await until(() => deniedReads === 2);
      expect(received.map(value => value.data.flowExecuted.id)).toEqual([1, 3]);
      expect(errors).toEqual([]);
    } finally { dispose(); await client.dispose(); }
  });
});
