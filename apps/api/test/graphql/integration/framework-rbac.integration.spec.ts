import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';
import { RbacService } from '../../../src/core/services/rbac.service';
import { BaseRbacService } from '../../../src/modules/base_rbac/services/base-rbac.service';

jest.setTimeout(120000);
describe('framework permission parity', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness(); });
  beforeEach(async () => { await h.seed(); });
  afterAll(async () => { await h?.close(); });
  const get = (path: string, actor = 'member') => request(h.app.getHttpServer()).get(path).auth(h.token(actor as any), { type: 'bearer' });

  it('returns identical persisted permissions from both current-user APIs', async () => {
    const expected = await new RbacService(h.prisma).getUserPermissions(2);
    expect(expected).toContain('base.entity_records.read');
    for (const path of ['/base-rbac/me/permissions', '/api/base-rbac/me/permissions', '/account/permissions']) {
      const result = await get(`${path}?userId=1&roleId=1`);
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ success: true, data: expected });
    }
    expect((await get('/base-rbac/me/permissions', 'admin')).body.data).toEqual(['*']);
    expect((await get('/account/permissions', 'none')).body.data).toEqual([]);
  });
  it('requires authentication for current-user permission APIs', async () => {
    for (const path of ['/base-rbac/me/permissions', '/account/permissions']) {
      expect((await request(h.app.getHttpServer()).get(path)).status).toBe(401);
    }
  });
  it.each(['member', 'admin'])('rejects inactive users and roles before bypass: %s', async actor => {
    const id = actor === 'admin' ? 1 : 2;
    for (const target of ['user', 'role']) {
      await h.prisma[target].update({ where: { id }, data: { isActive: false } });
      const core = new RbacService(h.prisma), base = new BaseRbacService(h.prisma);
      for (const service of [core, base]) {
        expect(await service.hasPermission(id, 'base.entity_records.read')).toBe(false);
        expect(await service.getUserPermissions(id)).toEqual([]);
      }
      expect((await get('/base-rbac/me/permissions', actor)).status).toBe(401);
      expect((await get('/account/permissions', actor)).status).toBe(401);
      const response = await h.query('{ entityRecord(entityId:1,recordId:1) { id } }', h.token(actor as any));
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      await h.prisma[target].update({ where: { id }, data: { isActive: true } });
    }
  });
  it('revokes disabled permissions consistently in services, lists, REST and GraphQL', async () => {
    await h.prisma.permission.updateMany({ where: { name: 'base.entity_records.read' }, data: { isActive: false } });
    for (const service of [new RbacService(h.prisma), new BaseRbacService(h.prisma)]) {
      expect(await service.hasPermission(2, 'base.entity_records.read')).toBe(false);
      expect(await service.getUserPermissions(2)).not.toContain('base.entity_records.read');
      expect(await service.getRolePermissions(2)).not.toContain('base.entity_records.read');
    }
    expect((await get('/base-rbac/me/permissions')).body.data).not.toContain('base.entity_records.read');
    expect((await get('/account/permissions')).body.data).not.toContain('base.entity_records.read');
    const gql = await h.query('{ entityRecord(entityId:1,recordId:1) { id } }', h.token('member'));
    expect(gql.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });
});
