import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';

jest.setTimeout(120000);
describe('global search HTTP authorization and persistence', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();

  });
  afterAll(async () => { if (h) await h.close(); });
  beforeEach(async () => {
    await h.prisma.documents.deleteMany();
    await h.prisma.recordRule.deleteMany();
    await h.seed();
    for (const name of ['base.records.read', 'documents.read']) {
      const p = await h.prisma.permission.create({ data: { name, display_name: name } });
      await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: p.id } });
    }
    await h.prisma.entityRecord.updateMany({ data: { visibility: 'public' } });
  });
  const search = (q: unknown = 'Record', token?: string | null, extra = {}) => {
    let req = request(h.app.getHttpServer()).get('/search').query({ q, ...extra });
    if (token !== null) req = req.auth(token ?? h.token('member'), { type: 'bearer' });
    return req;
  };

  it('requires authentication and signed tenant; rejects a foreign tenant override', async () => {
    expect((await search('Record', null)).status).toBe(401);
    expect((await search('Record', h.token('member', null))).status).toBe(403);
    expect((await search().set('x-org-id', '2')).status).toBe(403);
  });
  it('returns real persisted records scoped to company, excluding deleted entities and records', async () => {
    await h.prisma.entityRecord.update({ where: { id: 2 }, data: { deletedAt: new Date() } });
    await h.prisma.entityRecord.create({ data: { entityId: 2, companyId: 1, createdBy: 2, visibility: 'public', data: '{"name":"Record removed entity"}' } });
    await h.prisma.entity.update({ where: { id: 2 }, data: { deletedAt: new Date() } });
    const response = await search();
    expect(response.status).toBe(200);
    expect(response.body.data.results.map((row: any) => row.id)).toEqual([1, 3]);
    expect(response.body.data.total).toBe(2);
  });
  it('enforces source permissions and private record ownership', async () => {
    expect((await search('Record', h.token('none'))).body.data.results).toEqual([]);
    await h.prisma.entityRecord.updateMany({ data: { visibility: 'private' } });
    await h.prisma.entityRecord.update({ where: { id: 2 }, data: { createdBy: 2 } });
    expect((await search()).body.data.results.map((row: any) => row.id)).toEqual([2]);
    expect((await search('Record', h.token())).body.data.results.map((row: any) => row.id)).toEqual([1, 2, 3]);
  });
  it('applies record rules before returning results or counts', async () => {
    await h.prisma.recordRule.create({ data: { name: 'Hide record', modelName: 'entity_1', action: 'read', domain: '{"name":{"ne":"Record 2"}}', isActive: true } });
    expect((await search()).body.data.results.map((row: any) => row.id)).toEqual([1, 3]);
  });
  it('does not match hidden fields or return hidden descriptions', async () => {
    await h.prisma.entityFieldPermission.create({ data: { fieldId: 1, roleId: 2, canRead: false, canWrite: false } });
    expect((await search()).body.data.results).toEqual([]);
    await h.prisma.entityFieldPermission.deleteMany({ where: { fieldId: 1 } });
    const field = await h.prisma.entityField.create({ data: { entityId: 1, name: 'description', slug: 'description', label: 'Description', type: 'string' } });
    await h.prisma.entityFieldPermission.create({ data: { fieldId: field.id, roleId: 2, canRead: false, canWrite: false } });
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { data: '{"name":"Record 1","description":"confidential"}' } });
    expect((await search('Record 1')).body.data.results[0].description).toBe('');
  });
  it('finds only public or owned nondeleted documents, including for administrators', async () => {
    await h.prisma.documents.createMany({ data: [
      { title: 'Document public', uploaded_by: 3, is_public: true },
      { title: 'Document owned', uploaded_by: 2, is_public: false },
      { title: 'Document private', uploaded_by: 3, is_public: false },
      { title: 'Document deleted', uploaded_by: 2, is_public: true, deleted_at: new Date() },
    ].map(row => ({ ...row, filename: 'test.txt', path: '/test.txt' })) });
    const response = await search('Document');
    expect(response.status).toBe(200);
    expect(response.body.data.results.map((row: any) => row.title)).toEqual(['Document owned', 'Document public']);
    expect((await search('Document', h.token())).body.data.results.map((row: any) => row.title)).toEqual(['Document public']);
  });
  it('ranks exact matches first and applies a bounded limit after filtering', async () => {
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { data: '{"name":"Record 2 extended"}' } });
    const response = await search('Record 2', undefined, { limit: 1 });
    expect(response.body.data.results).toMatchObject([{ id: 2, title: 'Record 2' }]);
    expect((await search('   ')).body.data).toEqual({ results: [], total: 0, query: '' });
  });
  it('continues past a batch of nonmatching records without limiting before authorization', async () => {
    await h.prisma.entityRecord.createMany({ data: Array.from({ length: 205 }, () => ({
      entityId: 1, companyId: 1, createdBy: 2, visibility: 'public', data: '{"name":"Unrelated"}',
    })) });
    const row = await h.prisma.entityRecord.create({ data: { entityId: 1, companyId: 1, createdBy: 2, visibility: 'public', data: '{"name":"Final match"}' } });
    expect((await search('Final match', undefined, { limit: 1 })).body.data.results.map((item: any) => item.id)).toEqual([row.id]);
  });
  it('requires document read permission and applies document record rules', async () => {
    await h.prisma.documents.create({ data: { title: 'Document public', category: 'restricted', filename: 'test.txt', path: '/test.txt', is_public: true } });
    expect((await search('Document', h.token('none'))).body.data.results).toEqual([]);
    await h.prisma.recordRule.create({ data: { name: 'Hide documents', modelName: 'documents', action: 'read', domain: '{"category":{"ne":"restricted"}}', isActive: true } });
    expect((await search('Document')).body.data.results).toEqual([]);
  });
  it.each([{ limit: 0 }, { limit: -1 }, { limit: 51 }, { limit: '1.5' }, { limit: 'bad' }])('rejects invalid limits %s', async extra => {
    expect((await search('Record', undefined, extra)).status).toBe(400);
  });
  it('rejects oversized search text and skips malformed stored JSON', async () => {
    expect((await search('x'.repeat(201))).status).toBe(400);
    await h.prisma.entityRecord.update({ where: { id: 1 }, data: { data: 'malformed' } });
    expect((await search()).body.data.results.map((row: any) => row.id)).toEqual([2, 3]);
  });
});
