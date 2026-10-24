import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';

jest.setTimeout(120000);
describe('workflow definition validation and activation', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  afterAll(async () => { await h?.close(); });
  const definition = () => ({ name: 'Review', model: 'Ticket', initialState: 'new',
    states: [{ code: 'new', is_start: true }, { code: 'done', is_end: true }],
    transitions: [{ code: 'finish', from_state: 'new', to_state: 'done' }],
  });
  const validate = (data: unknown, token?: string | null) => {
    let req = request(h.app.getHttpServer()).post('/automation/workflows/validate');
    if (token !== null) req = req.auth(token ?? h.token(), { type: 'bearer' });
    return req.send(data);
  };
  const create = (data: unknown) => request(h.app.getHttpServer()).post('/automation/workflows').auth(h.token(), { type: 'bearer' }).send(data);
  const update = (id: number, data: unknown) => request(h.app.getHttpServer()).put(`/automation/workflows/${id}`).auth(h.token(), { type: 'bearer' }).send(data);

  it('validates without writing and requires authentication/manage permission', async () => {
    const before = await h.prisma.automation_workflows.count();
    expect((await validate(definition(), null)).status).toBe(401);
    expect((await validate(definition(), h.token('none'))).status).toBe(403);
    const response = await validate(definition());
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { errors: [] } });
    expect(await h.prisma.automation_workflows.count()).toBe(before);
  });
  it.each([
    { states: [] }, { states: [null] }, { transitions: [null] },
    { states: [{ code: 'same', is_start: true }, { code: 'same', is_end: true }] },
    { states: [{ code: 'new', is_start: true }, { code: 'done', is_start: true, is_end: true }] },
    { states: [{ code: 'new', is_start: 'yes' }, { code: 'done', is_end: true }] },
    { states: [{ code: 'new', is_start: true }] },
    { initialState: 'missing' }, { initialState: 'done' },
    { transitions: [{ code: 'bad', from_state: 'missing', to_state: 'done' }] },
    { transitions: [{ code: 'bad', from_state: 'new', to_state: 'missing' }] },
    { transitions: [{ code: 'dup', from_state: 'new', to_state: 'done' }, { code: 'dup', from_state: 'done', to_state: 'new' }] },
    { name: ' ' }, { model: ' ' }, { status: 'unexpected' },
  ])('rejects malformed definitions: %s', async changes => {
    expect((await validate({ ...definition(), ...changes })).status).toBe(400);
  });
  it('rejects invalid active creates but retains incomplete drafts', async () => {
    const before = await h.prisma.automation_workflows.count();
    expect((await create({ name: 'Invalid active', model: 'Ticket', status: 'active' })).status).toBe(400);
    expect(await h.prisma.automation_workflows.count()).toBe(before);
    expect((await create({ name: 'Draft', model: 'Ticket', status: 'draft' })).status).toBe(201);
  });
  it('validates merged partial updates and preserves the stored graph on rejection', async () => {
    const created = await create({ ...definition(), status: 'active' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await update(id, { description: 'Description only' })).status).toBe(200);
    expect((await update(id, { states: [] })).status).toBe(400);
    const row = await h.prisma.automation_workflows.findUnique({ where: { id } });
    expect(JSON.parse(row.states)).toEqual(definition().states);
    expect(row.status).toBe('active');
    expect((await update(id, { status: 'inactive', states: [] })).status).toBe(200);
    expect((await update(id, { status: 'active' })).status).toBe(400);
    expect((await update(999999, { status: 'active' })).status).toBe(404);
  });
  it('serializes concurrent graph edits so independently valid updates cannot combine into a broken active definition', async () => {
    const graph = definition();
    const created = await create({ ...graph, status: 'active', states: [...graph.states, { code: 'review' }] });
    const id = created.body.data.id;
    const responses = await Promise.all([
      update(id, { states: graph.states }),
      update(id, { transitions: [{ code: 'review', from_state: 'new', to_state: 'review' }] }),
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 400]);
    const saved = await request(h.app.getHttpServer()).get(`/automation/workflows/${id}`).auth(h.token(), { type: 'bearer' });
    expect((await validate(saved.body.data)).status).toBe(200);
  });
});
