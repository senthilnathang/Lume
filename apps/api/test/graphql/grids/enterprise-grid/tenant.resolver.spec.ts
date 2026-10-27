import { GqlRbacGuard } from '../../../../src/graphql/guards/gql-rbac.guard';
import { GqlJwtGuard } from '../../../../src/graphql/guards/gql-jwt.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TenantRegistryService } from '../../../../src/core/services/tenant-registry.service';
import { TenantResolver } from '../../../../src/graphql/grids/enterprise-grid/resolvers/tenant.resolver';

describe('TenantResolver', () => {
  let resolver: TenantResolver;
  const mockUser = { sub: 1, email: 'admin@test.com', role_id: 1, role_name: 'admin', company_id: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantResolver, { provide: TenantRegistryService, useValue: Object.fromEntries(['list', 'find', 'create', 'update', 'archive'].map(name => [name, async () => { throw new Error('store failure'); }])) }],
    })
      .overrideGuard(GqlJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<TenantResolver>(TenantResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('tenants', () => {
    it('does not present an unavailable registry as empty', async () => {
      await expect(resolver.tenants(mockUser)).rejects.toThrow('store failure');
    });

    it('should throw without user', async () => {
      await expect(resolver.tenants(undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('tenant', () => {
    it('does not pretend to look up a tenant', async () => {
      await expect(resolver.tenant('non-existent', mockUser)).rejects.toThrow('store failure');
    });

    it('should throw without user', async () => {
      await expect(resolver.tenant('1', undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTenant', () => {
    it('does not report creation without persistence', async () => {
      const input = { id: 'tenant1', name: 'Tenant 1', domain: 'tenant1.com' };
      await expect(resolver.createTenant(input, mockUser)).rejects.toThrow('store failure');
    });

    it('should throw without user', async () => {
      const input = { id: 'tenant1', name: 'Tenant 1', domain: 'tenant1.com' };
      await expect(resolver.createTenant(input, undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTenant', () => {
    it('does not report an update without persistence', async () => {
      await expect(resolver.updateTenant('non-existent', { name: 'Updated' }, mockUser)).rejects.toThrow('store failure');
    });

    it('should throw without user', async () => {
      await expect(resolver.updateTenant('1', {}, undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTenant', () => {
    it('does not report deletion without persistence', async () => {
      await expect(resolver.deleteTenant('tenant1', mockUser)).rejects.toThrow('store failure');
    });

    it('should throw without user', async () => {
      await expect(resolver.deleteTenant('1', undefined)).rejects.toThrow(ForbiddenException);
    });
  });
});
