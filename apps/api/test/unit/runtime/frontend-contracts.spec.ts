import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { IsEmail } from 'class-validator';
import { ValidatePipe } from '../../../src/core/pipes/validation.pipe';
import { AuthService as Tokens } from '../../../src/core/services/jwt.service';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { JwtStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { AccountController } from '../../../src/modules/auth/controllers/account.controller';
import { UsersService } from '../../../src/modules/users/services/users.service';
import { UpdateUserDto } from '../../../src/modules/users/dtos';

class EmailDto { @IsEmail() email!: string; }

describe('frontend parameter validation', () => {
  const pipe = new ValidatePipe();
  it('preserves optional primitives and plain query objects', async () => {
    expect(await pipe.transform(undefined, { type: 'query', metatype: String })).toBeUndefined();
    expect(await pipe.transform('20', { type: 'query', metatype: Number })).toBe('20');
    expect(await pipe.transform({ page: '2' }, { type: 'query', metatype: Object })).toEqual({ page: '2' });
  });
  it('still validates DTO bodies, including absent bodies', async () => {
    await expect(pipe.transform(undefined, { type: 'body', metatype: EmailDto })).rejects.toThrow('Validation failed');
    await expect(pipe.transform({ email: 'invalid' }, { type: 'body', metatype: EmailDto })).rejects.toThrow('Validation failed');
    expect(await pipe.transform({ email: 'user@example.test' }, { type: 'body', metatype: EmailDto })).toBeInstanceOf(EmailDto);
  });
});

describe('NestJS browser sessions', () => {
  const previousSecret = process.env.JWT_SECRET;
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  let user: any;
  let session: any;
  let prisma: any;
  let tokens: Tokens;
  let service: AuthService;
  beforeEach(async () => {
    process.env.JWT_SECRET = 'frontend-contract-test-secret-with-sufficient-length';
    tokens = new Tokens(new JwtService({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '1h' } }));
    user = { id: 8, email: 'user@example.test', firstName: 'Test', lastName: 'User', role_id: 2,
      role: { name: 'user', isActive: true }, isActive: true, password: await tokens.hashPassword('TestPassword!') };
    prisma = {
      user: { findUnique: jest.fn(async () => user) },
      sessions: {
        create: jest.fn(async ({ data }: any) => session = { ...data }),
        findUnique: jest.fn(async ({ where }: any) => session?.token === where.token ? session : null),
        updateMany: jest.fn(async ({ data }: any) => { Object.assign(session, data); return { count: 1 }; }),
      },
    };
    service = new AuthService(prisma, tokens);
  });
  it('returns a safe profile, distinguishes token types, and revokes access and refresh on logout', async () => {
    const { data } = await service.login({ email: user.email, password: 'TestPassword!' });
    expect(data.user).toMatchObject({ firstName: 'Test', lastName: 'User' });
    expect(data.user).not.toHaveProperty('password');
    expect(session.token).not.toBe(data.refreshToken);
    await expect(service.refresh(data.accessToken)).rejects.toThrow('Invalid refresh token');
    const strategy = new JwtStrategy(prisma);
    await expect(strategy.validate(tokens.verifyToken(data.refreshToken))).rejects.toThrow('Access token required');
    const principal = await strategy.validate(tokens.verifyToken(data.accessToken));
    expect((await service.refresh(data.refreshToken)).data.accessToken).toBeTruthy();
    await service.logout(principal);
    await expect(strategy.validate(tokens.verifyToken(data.accessToken))).rejects.toThrow('Session expired');
    await expect(service.refresh(data.refreshToken)).rejects.toThrow('Session expired');
  });
  it('rejects inactive accounts and wrong passwords', async () => {
    await expect(service.login({ email: user.email, password: 'WrongPassword!' })).rejects.toThrow('Invalid credentials');
    user.isActive = false;
    await expect(service.login({ email: user.email, password: 'TestPassword!' })).rejects.toThrow('Invalid credentials');
    expect(prisma.sessions.create).not.toHaveBeenCalled();
  });
  it('confirms the current password without creating another session', async () => {
    await expect(service.confirmPassword(user.id, 'TestPassword!')).resolves.toMatchObject({ data: { confirmed: true } });
    await expect(service.confirmPassword(user.id, 'wrong')).rejects.toThrow('Invalid credentials');
    expect(prisma.sessions.create).not.toHaveBeenCalled();
  });
  it('enforces session owner and expiry on refresh', async () => {
    const { data } = await service.login({ email: user.email, password: 'TestPassword!' });
    session.user_id = 99;
    await expect(service.refresh(data.refreshToken)).rejects.toThrow('Session expired');
    session.user_id = user.id;
    session.expires_at = new Date(0);
    await expect(service.refresh(data.refreshToken)).rejects.toThrow('Session expired');
  });
});

describe('account navigation and notification isolation', () => {
  it('does not expose inaccessible configured navigation', async () => {
    const prisma: any = { menu: { findMany: async () => [
      { id: 1, parentId: null, path: '/allowed', permission: 'read.allowed' },
      { id: 2, parentId: null, path: '/secret', permission: 'read.secret' },
    ] } };
    const rbac: any = { isAdminRole: () => false, getRolePermissions: async () => ['read.allowed'] };
    const result = await new AccountController(prisma, rbac).menus({ user: { id: 1, role_id: 2 } });
    expect(result.data.map(row => row.path)).toContain('/allowed');
    expect(result.data.map(row => row.path)).not.toContain('/secret');
  });
  it('limits unscoped inboxes to the current user and global notifications', async () => {
    const findMany = jest.fn(async () => []);
    const controller = new AccountController({ notifications: { findMany } } as any, {} as any);
    await controller.notifications({ user: { id: 5 } }, '20');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      user_id: 5, OR: [{ company_id: null }],
    }) }));
    await expect(controller.notifications({ user: { id: 5, role_name: 'user' }, headers: { 'x-org-id': '2' } }, '20')).rejects.toThrow('Company ID is not authorized');
  });
});

describe('user-management frontend contracts', () => {
  it('returns paginated, searchable users without credential material', async () => {
    const findMany = jest.fn(async () => [{ id: 1, firstName: 'Test', lastName: 'User',
      password: 'hash', refresh_token: 'secret', password_reset_token: 'reset' }]);
    const service = new UsersService({ user: { findMany, count: async () => 12 } } as any, {} as any);
    const response = await service.findAll({ page: 2, limit: 5, search: 'Test' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5,
      where: { OR: expect.arrayContaining([{ firstName: { contains: 'Test' } }]) } }));
    expect(response.data).toMatchObject({ total: 12, data: [{ id: 1, first_name: 'Test' }] });
    expect((response.data as any).data[0]).not.toHaveProperty('password');
    expect((response.data as any).data[0]).not.toHaveProperty('refresh_token');
    await expect(service.findAll({ page: -1 })).rejects.toThrow('Invalid page');
  });
  it('persists false active status and hashes replacement passwords', async () => {
    const update = jest.fn(async ({ data }: any) => ({ id: 1, ...data }));
    const service = new UsersService({ user: { findUnique: async () => ({ id: 1 }), update } } as any,
      { hashPassword: async () => 'replacement-hash' } as any);
    const dto = await new ValidatePipe().transform({ isActive: false, password: 'Replacement!', phone: '' },
      { type: 'body', metatype: UpdateUserDto });
    await service.update(1, dto);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: {
      isActive: false, password: 'replacement-hash', phone: '',
    } }));
  });
});
