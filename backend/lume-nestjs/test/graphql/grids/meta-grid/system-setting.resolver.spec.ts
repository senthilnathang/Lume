import { Test, TestingModule } from '@nestjs/testing';
import { SystemSettingResolver } from '../../../../src/graphql/grids/meta-grid/resolvers/system-setting.resolver';

describe('SystemSettingResolver', () => {
  let resolver: SystemSettingResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemSettingResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<SystemSettingResolver>(SystemSettingResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('systemSettings', () => {
    it('should return empty array', async () => {
      const result = await resolver.systemSettings(undefined);
      expect(result).toEqual([]);
    });

    it('should return settings for group', async () => {
      const result = await resolver.systemSettings('email');
      expect(result).toEqual([]);
    });
  });

  describe('systemSetting', () => {
    it('should return null for missing setting', async () => {
      const result = await resolver.systemSetting('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('upsertSystemSetting', () => {
    it('should upsert setting', async () => {
      const result = await resolver.upsertSystemSetting({
        key: 'test_key',
        value: { test: true },
      });
      expect(result.key).toBe('test_key');
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('bulkUpsertSettings', () => {
    it('should upsert multiple settings', async () => {
      const result = await resolver.bulkUpsertSettings([
        { key: 'key1', value: { val: 1 } },
        { key: 'key2', value: { val: 2 } },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('key1');
    });
  });
});
