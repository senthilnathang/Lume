import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { BusinessRuleEngineService } from '../../../src/modules/base_automation/services/business-rule-engine.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { RecordCreatedEvent } from '../../../src/modules/base/events/record.events';

jest.setTimeout(120000);
describe('business-rule editor contract (HTTP/JWT/MySQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); h.app.useGlobalPipes(new ValidatePipe()); });
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => { await h.prisma.automation_business_rules.deleteMany(); await h.seed(); });
  const rule = () => ({ name: 'Rename', model: 'entity_1', field: 'name', status: 'active', priority: 0,
    condition: { name: { $eq: 'Record 1' } }, action: { type: 'set_field', fieldName: 'name', value: 'Renamed' } });
  const call = (method: string, path = '', body?: any, token?: string | null) => {
    const req = request(h.app.getHttpServer())[method](`/automation/rules${path}`);
    if (token !== null) req.auth(token ?? h.token(), { type: 'bearer' });
    return body === undefined ? req : req.send(body);
  };
  it('requires authentication and management permission without writing', async () => {
    expect((await call('post', '', rule(), null)).status).toBe(401);
    expect((await call('post', '', rule(), h.token('none'))).status).toBe(403);
    expect((await call('get', '', undefined, h.token('none'))).status).toBe(403);
    expect(await h.prisma.automation_business_rules.count()).toBe(0);
  });
  it('round trips JSON, executes the saved rule with record permissions, and preserves partial deactivation', async () => {
    const created = await call('post', '', rule());
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data).toMatchObject(rule());
    const read = await call('get', `/${id}`);
    expect(read.body.data).toMatchObject(rule());
    const record = await h.prisma.entityRecord.findUnique({ where: { id: 1 } });
    const engine = new BusinessRuleEngineService(h.app.get(DrizzleService), h.prisma, h.app.get(RecordService));
    await engine.handleRecordCreated(new RecordCreatedEvent(1, { ...record, data: JSON.parse(record.data) }, 2));
    expect(JSON.parse((await h.prisma.entityRecord.findUnique({ where: { id: 1 } })).data).name).toBe('Renamed');
    expect((await call('put', `/${id}`, { status: 'inactive' })).body.data).toMatchObject({ ...rule(), status: 'inactive' });
    expect((await call('get', '?model=entity_1&status=inactive')).body.data).toHaveLength(1);
    expect((await call('get', '?model=other')).body.data).toHaveLength(0);
    expect((await call('delete', `/${id}`)).status).toBe(200);
    expect((await call('get', `/${id}`)).status).toBe(404);
    expect((await call('delete', `/${id}`)).status).toBe(404);
    expect((await call('put', `/${id}`, { status: 'active' })).status).toBe(404);
  });
  it.each([
    { name: ' ' }, { model: ' ' }, { field: '__proto__' }, { status: 'draft' }, { priority: -1 },
    { condition: [] }, { condition: { name: { $unknown: 'x' } } }, { condition: { name: { $in: 'x' } } },
    { action: {} }, { action: { type: 'set_field', fieldName: 'other', value: false } },
    { action: { type: 'set_field', fieldName: 'name' } }, { action: { type: 'DELETE' } },
  ])('rejects invalid definitions without persistence: %j', async changes => {
    expect((await call('post', '', { ...rule(), ...changes })).status).toBe(400);
    expect(await h.prisma.automation_business_rules.count()).toBe(0);
  });
  it('rejects the old editor payload and rolls back invalid partial edits', async () => {
    expect((await call('post', '', { name: 'Old', entity_type: 'entity_1', trigger_on: 'INSERT', actions: [] })).status).toBe(400);
    const id = (await call('post', '', rule())).body.data.id;
    expect((await call('put', `/${id}`, { name: 'Changed', condition: [] })).status).toBe(400);
    // The controller's whitelist strips unknown fields; identities must stay fixed.
    for (const change of [{ model: 'other' }, { field: 'other' }, { id: 99999 }, { trigger_on: 'DELETE' }]) {
      const response = await call('put', `/${id}`, change);
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ ...rule(), id });
    }
    expect((await call('put', `/${id}`, { status: null })).status).toBe(400);
    expect((await call('get', `/${id}`)).body.data).toMatchObject(rule());
  });
  it('allows disabling invalid legacy definitions but rejects reactivation until repaired', async () => {
    const saved = await h.prisma.automation_business_rules.create({ data: { name: 'Legacy', model: 'entity_1', field: 'name', action: '{}' } });
    expect((await call('put', `/${saved.id}`, { status: 'inactive' })).status).toBe(200);
    expect((await call('put', `/${saved.id}`, { status: 'active' })).status).toBe(400);
    expect((await call('get', `/${saved.id}`)).body.data.status).toBe('inactive');
  });
  it.each([false, 0, '', null])('preserves explicit field values: %j', async value => {
    const response = await call('post', '', { ...rule(), action: { type: 'set_field', fieldName: 'name', value } });
    expect(response.status).toBe(201);
    expect(response.body.data.action.value).toEqual(value);
  });
});
