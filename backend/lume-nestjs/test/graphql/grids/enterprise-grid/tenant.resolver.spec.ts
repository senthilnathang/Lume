import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TenantResolver } from '../../../../src/graphql/grids/enterprise-grid/resolvers/tenant.resolver';

describe('TenantResolver', () => {
  let resolver: TenantResolver;
  const mockUser = { sub: '1', email: 'admin@test.com', role_id: 1, role_name: 'admin', company_id: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<TenantResolver>(TenantResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('tenants', () => {
    it('should return empty array', async () => {
      const result = await resolver.tenants(mockUser);
      expect(result).toEqual([]);
    });

    it('should throw without user', async () => {
      await expect(resolver.tenants(undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('tenant', () => {
    it('should return null for missing tenant', async () => {
      const result = await resolver.tenant('non-existent', mockUser);
      expect(result).toBeNull();
    });

    it('should throw without user', async () => {
      await expect(resolver.tenant('1', undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTenant', () => {
    it('should create tenant', async () => {
      const input = { id: 'tenant1', name: 'Tenant 1', domain: 'tenant1.com' };
      const result = await resolver.createTenant(input, mockUser);
      expect(result.id).toBe('tenant1');
      expect(result.name).toBe('Tenant 1');
      expect(result.active).toBe(true);
    });

    it('should throw without user', async () => {
      const input = { id: 'tenant1', name: 'Tenant 1', domain: 'tenant1.com' };
      await expect(resolver.createTenant(input, undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTenant', () => {
    it('should return null for non-existent tenant', async () => {
      const result = await resolver.updateTenant('non-existent', { name: 'Updated' }, mockUser);
      expect(result).toBeNull();
    });

    it('should throw without user', async () => {
      await expect(resolver.updateTenant('1', {}, undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTenant', () => {
    it('should return true', async () => {
      const result = await resolver.deleteTenant('tenant1', mockUser);
      expect(result).toBe(true);
    });

    it('should throw without user', async () => {
      await expect(resolver.deleteTenant('1', undefined)).rejects.toThrow(ForbiddenException);
    });
  });
});
