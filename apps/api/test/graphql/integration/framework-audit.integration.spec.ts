import { jest } from '@jest/globals';
import request from 'supertest';
import { createHarness, Harness } from './harness';
import { AuditService } from '../../../src/modules/audit/services/audit.service';

jest.setTimeout(120000);
describe('persisted framework audit queries', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness({ auditQueries: true }); });
  beforeEach(async () => { await h.prisma.auditLog.deleteMany(); await h.seed(); });
  afterAll(async () => { await h?.close(); });
  const row = (data: any = {}) => h.prisma.auditLog.create({ data: { action: 'update', model: 'ticket', recordId: '1', userId: 1, createdAt: new Date('2026-01-02T00:00:00Z'), ...data } });
  it('reads persisted snapshots and timestamps without inventing historical identity', async () => {
    const saved = await h.app.get(AuditService).log({ action: 'update', resource_type: 'ticket', record_id: 12, old_values: { a: { x: 1 }, b: 2 }, new_values: { a: { x: 1 }, b: 3 }, user_id: 1 });
    expect(saved).not.toBeNull();
    const result = await h.query(`{auditLog(id:"${saved.id}"){recordId changes changeCount userEmail userRole createdAt}}`);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.auditLog).toMatchObject({ recordId: '12', changeCount: 1, userEmail: null, userRole: null, changes: { oldValues: { a: { x: 1 }, b: 2 }, newValues: { a: { x: 1 }, b: 3 } } });
    expect(result.body.data.auditLog.createdAt).toBeTruthy();
    const rest = await request(h.app.getHttpServer()).get(`/audit/${saved.id}`).auth(h.token(), { type: 'bearer' });
    expect(rest.status).toBe(200);
    expect(JSON.parse(rest.body.data.newValues)).toEqual({ a: { x: 1 }, b: 3 });
  });
  it('filters before counting and paginates equal timestamps consistently across transports', async () => {
    const first = await row(); await row(); await row({ model: 'other' }); await row({ userId: 2 }); await row({ action: 'create' });
    const result = await h.query('{auditLogs(filter:{entity:"ticket",userId:"1",action:"update",fromDate:"2026-01-01T00:00:00Z",toDate:"2026-01-03T00:00:00Z"},pagination:{page:2,limit:1}){items{id} total totalPages hasNextPage hasPreviousPage}}');
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.auditLogs).toEqual({ items: [{ id: String(first.id) }], total: 2, totalPages: 2, hasNextPage: false, hasPreviousPage: true });
    const rest = await request(h.app.getHttpServer()).get('/audit?page=2&limit=1&resource_type=ticket&user_id=1&action=update').auth(h.token(), { type: 'bearer' });
    expect(rest.status).toBe(200); expect(rest.body.data[0].id).toBe(first.id); expect(rest.body.meta.total).toBe(2);
  });
  it('preserves nullable fields, arbitrary record IDs and malformed legacy snapshots', async () => {
    const saved = await row({ recordId: 'external-123', userId: null, createdAt: null, oldValues: 'legacy text' });
    const result = await h.query(`{auditLog(id:"${saved.id}"){recordId userId createdAt changes} missing:auditLog(id:"2147483647"){id}}`);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.auditLog).toEqual({ recordId: 'external-123', userId: null, createdAt: null, changes: { oldValues: 'legacy text', newValues: null } });
    expect(result.body.data.missing).toBeNull();
  });
  it('denies unscoped history and cleanup to tenant members with audit permissions', async () => {
    await row();
    expect((await h.query('{auditLogs{total}}', null)).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    for (const name of ['audit.read', 'audit.delete']) {
      const p = await h.prisma.permission.create({ data: { name, display_name: name } });
      await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: p.id } });
    }
    expect((await h.query('{auditLogs{total}}', h.token('member'), undefined, '2')).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await request(h.app.getHttpServer()).get('/audit').auth(h.token('member'), { type: 'bearer' })).status).toBe(403);
    expect((await request(h.app.getHttpServer()).post('/audit/cleanup').auth(h.token('member'), { type: 'bearer' }).send({ days: 1 })).status).toBe(403);
    expect(await h.prisma.auditLog.count()).toBe(1);
  });
  it.each(['{auditLogs(pagination:{page:0}){total}}', '{auditLogs(filter:{action:"invalid"}){total}}', '{auditLogs(filter:{userId:"-1"}){total}}', '{auditLogs(filter:{fromDate:"2026-02-01T00:00:00Z",toDate:"2026-01-01T00:00:00Z"}){total}}', '{auditLog(id:"bogus"){id}}'])('rejects invalid query %s', async query => {
    expect((await h.query(query)).body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });
  it('bounds record history and validates retention before deletion', async () => {
    await h.prisma.auditLog.createMany({ data: Array.from({ length: 105 }, () => ({ action: 'update' as const, model: 'ticket', recordId: '1' })) });
    await row({ recordId: '2' }); await row({ model: 'other' });
    const result = await h.query('{recordAuditHistory(entity:"ticket",recordId:1){entity recordId}}');
    expect(result.body.errors).toBeUndefined(); expect(result.body.data.recordAuditHistory).toHaveLength(100);
    expect(result.body.data.recordAuditHistory.every((r: any) => r.entity === 'ticket' && r.recordId === '1')).toBe(true);
    await expect(h.app.get(AuditService).cleanup(0, 1)).rejects.toThrow('Invalid audit retention');
    expect(await h.prisma.auditLog.count()).toBe(107);
  });
});
