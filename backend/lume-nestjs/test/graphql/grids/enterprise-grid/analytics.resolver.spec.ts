import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsResolver } from '../../../../src/graphql/grids/enterprise-grid/resolvers/analytics.resolver';

describe('AnalyticsResolver', () => {
  let resolver: AnalyticsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<AnalyticsResolver>(AnalyticsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('analyticsMetrics', () => {
    it('should return empty array', async () => {
      const result = await resolver.analyticsMetrics(undefined, 1);
      expect(result).toEqual([]);
    });

    it('should return metrics for window', async () => {
      const result = await resolver.analyticsMetrics(60, 1);
      expect(result).toEqual([]);
    });
  });

  describe('analyticsDashboard', () => {
    it('should return dashboard data', async () => {
      const result = await resolver.analyticsDashboard(1);
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.events).toBeDefined();
    });
  });

  describe('recordAnalyticsEvent', () => {
    it('should record event', async () => {
      const result = await resolver.recordAnalyticsEvent('test_event', undefined, 1);
      expect(result).toBe(true);
    });

    it('should record event with properties', async () => {
      const result = await resolver.recordAnalyticsEvent('test_event', { prop: 'value' }, 1);
      expect(result).toBe(true);
    });
  });
});
