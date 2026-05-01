import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ModuleResolver } from '../../../../src/graphql/grids/meta-grid/resolvers/module.resolver';

describe('ModuleResolver', () => {
  let resolver: ModuleResolver;
  const mockUser = { sub: '1', email: 'admin@test.com', role_id: 1, role_name: 'admin', company_id: 1 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModuleResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<ModuleResolver>(ModuleResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('installedModules', () => {
    it('should return empty array', async () => {
      const result = await resolver.installedModules(mockUser);
      expect(result).toEqual([]);
    });

    it('should throw without user', async () => {
      await expect(resolver.installedModules(undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('installedModule', () => {
    it('should return null for missing module', async () => {
      const result = await resolver.installedModule('non-existent', mockUser);
      expect(result).toBeNull();
    });
  });

  describe('installModule', () => {
    it('should return true', async () => {
      const result = await resolver.installModule('test-module', mockUser);
      expect(result).toBe(true);
    });
  });

  describe('uninstallModule', () => {
    it('should return true', async () => {
      const result = await resolver.uninstallModule('test-module', mockUser);
      expect(result).toBe(true);
    });
  });
});
