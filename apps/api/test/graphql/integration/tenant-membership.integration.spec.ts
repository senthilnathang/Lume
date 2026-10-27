import { jest } from '@jest/globals';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { createHarness, Harness } from './harness';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { AuthService as TokenService } from '../../../src/core/services/jwt.service';
import { GraphQLContextFactory } from '../../../src/graphql/graphql.context';
import { DrizzleService } from '../../../src/core/services/drizzle.service';

jest.setTimeout(120000);
describe('managed single-company tenant membership', () => {
  let h: Harness;
  beforeAll(async () => { h = await createHarness({ tenants: true }); });
  beforeEach(async () => {
    await h.prisma.sessions.deleteMany(); await h.prisma.tenantRegistry.deleteMany(); await h.seed();
    await h.prisma.tenantRegistry.createMany({ data: [1, 2].map(id => ({ id, name: `Company ${id}`, domain: `company${id}.example`, config: '{}' })) });
  });
  afterAll(async () => { await h?.close(); });
  const assign = (tenantId: string | null, token = h.token('admin', null), userId = 2) => h.query(
    'mutation($userId:Int!,$tenantId:String){setUserTenant(userId:$userId,tenantId:$tenantId){userId companyId managed}}', token, { userId, tenantId });
  const session = () => h.prisma.sessions.create({ data: { user_id: 2, token: 'test-session', status: 'active', expires_at: new Date(Date.now() + 60000) } });
  const permissions = (token: string) => request(h.app.getHttpServer()).get('/account/permissions').auth(token, { type: 'bearer' });

  it('preserves metadata, revokes sessions, and rejects stale claims in both transports', async () => {
    await h.prisma.user.update({ where: { id: 2 }, data: { metadata: '{"theme":"dark","preferences":{"compact":true}}' } });
    await session();
    const result = await assign('2');
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.setUserTenant).toEqual({ userId: 2, companyId: 2, managed: true });
    expect(JSON.parse((await h.prisma.user.findUnique({ where: { id: 2 } })).metadata)).toEqual({ theme: 'dark', preferences: { compact: true }, company_id: 2 });
    expect((await h.prisma.sessions.findUnique({ where: { token: 'test-session' } })).status).toBe('revoked');
    expect((await permissions(h.token('member', 1))).status).toBe(401);
    expect((await h.query('{entities{id}}', h.token('member', 1))).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect((await permissions(h.token('member', 2))).status).toBe(200);
    expect((await h.query('{userTenantMembership(userId:2){userId companyId managed}}', h.token('admin', null))).body.data.userTenantMembership).toEqual({ userId: 2, companyId: 2, managed: true });
  });
  it('issues fresh login claims from managed metadata and revokes refresh on removal', async () => {
    const tokens = new TokenService(new JwtService({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '1h' } }));
    const auth = new AuthService(h.prisma, tokens);
    await h.prisma.user.update({ where: { id: 2 }, data: { password: await tokens.hashPassword('Membership-test-123!') } });
    await assign('2');
    const first = (await auth.login({ email: 'member@test.local', password: 'Membership-test-123!' })).data;
    expect(tokens.verifyToken(first.accessToken).company_id).toBe(2);
    expect((await permissions(first.accessToken)).status).toBe(200);
    expect((await assign(null)).body.data.setUserTenant).toEqual({ userId: 2, companyId: null, managed: true });
    expect((await permissions(first.accessToken)).status).toBe(401);
    await expect(auth.refresh(first.refreshToken)).rejects.toThrow('Session expired');
    expect((await permissions(h.token('member', 2))).status).toBe(401);
    const second = (await auth.login({ email: 'member@test.local', password: 'Membership-test-123!' })).data;
    expect(tokens.verifyToken(second.accessToken).company_id).toBeUndefined();
    expect((await permissions(second.accessToken)).status).toBe(200);
  });
  it('requires platform administration even with delegated management permission', async () => {
    const permission = await h.prisma.permission.create({ data: { name: 'base.tenants.manage', display_name: 'Tenant management' } });
    await h.prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
    expect((await assign('2', h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await h.query('{userTenantMembership(userId:1){companyId}}', h.token('member'))).body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect((await h.query('mutation{setUserTenant(userId:2,tenantId:"2"){userId}}', null)).body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect((await h.prisma.user.findUnique({ where: { id: 2 } })).metadata).toBeNull();
  });
  it('rejects invalid, missing and inactive targets without changing assignments or sessions', async () => {
    await session();
    for (const id of ['0', 'slug', '2147483648', '999']) expect((await assign(id)).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    await h.prisma.tenantRegistry.update({ where: { id: 2 }, data: { active: false } });
    expect((await assign('2')).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect((await assign('1', undefined, 999)).body.errors[0].extensions.code).toBe('NOT_FOUND');
    expect((await h.query('mutation{setUserTenant(userId:2){userId}}', h.token('admin', null))).body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect((await h.prisma.user.findUnique({ where: { id: 2 } })).metadata).toBeNull();
    expect((await h.prisma.sessions.findUnique({ where: { token: 'test-session' } })).status).toBe('active');
  });
  it('refuses to overwrite malformed metadata', async () => {
    await h.prisma.user.update({ where: { id: 2 }, data: { metadata: 'legacy malformed' } });
    expect((await assign('2')).body.errors[0].extensions.code).toBe('CONFLICT');
    expect((await h.prisma.user.findUnique({ where: { id: 2 } })).metadata).toBe('legacy malformed');
  });
  it('rolls back assignment when session revocation fails', async () => {
    await session();
    await h.prisma.$executeRawUnsafe("CREATE TRIGGER reject_membership_session BEFORE UPDATE ON sessions FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test revocation failure'");
    try {
      expect((await assign('2')).body.errors).toBeDefined();
      expect((await h.prisma.user.findUnique({ where: { id: 2 } })).metadata).toBeNull();
      expect((await h.prisma.sessions.findUnique({ where: { token: 'test-session' } })).status).toBe('active');
    } finally { await h.prisma.$executeRawUnsafe('DROP TRIGGER reject_membership_session'); }
  });
  it('rechecks current membership and role for an existing subscription context', async () => {
    const factory = new GraphQLContextFactory(h.prisma, h.app.get(DrizzleService));
    const context = factory.createContext({ req: { headers: {}, user: { sub: 2, company_id: 1, role_name: 'member' } } as any });
    expect(await context.canReceiveTenantEvent(1)).toBe(true);
    await assign('2');
    expect(await context.canReceiveTenantEvent(1)).toBe(false);
    expect(await context.canReceiveTenantEvent(2)).toBe(false);
    const fresh = factory.createContext({ req: { headers: {}, user: { sub: 2, company_id: 2, role_name: 'member' } } as any });
    expect(await fresh.canReceiveTenantEvent(2)).toBe(true);
    await h.prisma.role.update({ where: { id: 2 }, data: { isActive: false } });
    expect(await fresh.canReceiveTenantEvent(2)).toBe(false);
  });
});
