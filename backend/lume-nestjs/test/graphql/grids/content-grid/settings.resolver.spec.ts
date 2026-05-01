import { Test, TestingModule } from '@nestjs/testing';
import { SettingsResolver } from '../../../../src/graphql/grids/content-grid/resolvers/settings.resolver';

describe('SettingsResolver', () => {
  let resolver: SettingsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<SettingsResolver>(SettingsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('websiteSettings', () => {
    it('should return default settings', async () => {
      const result = await resolver.websiteSettings(1);
      expect(result).toBeDefined();
      expect(result.siteName).toBeDefined();
      expect(result.siteDescription).toBeDefined();
      expect(result.seoSettings).toBeDefined();
    });
  });

  describe('updateWebsiteSettings', () => {
    it('should return updated settings', async () => {
      const result = await resolver.updateWebsiteSettings({ siteName: 'Test Site' }, 1);
      expect(result.siteName).toBe('Test Site');
      expect(result.seoSettings).toBeDefined();
    });
  });
});
