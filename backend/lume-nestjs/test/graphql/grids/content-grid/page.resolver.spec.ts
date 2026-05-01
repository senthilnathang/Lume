import { Test, TestingModule } from '@nestjs/testing';
import { PageResolver } from '../../../../src/graphql/grids/content-grid/resolvers/page.resolver';

describe('PageResolver', () => {
  let resolver: PageResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PageResolver,
        { provide: 'PubSub', useValue: { asyncIterableIterator: jest.fn() } },
      ],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<PageResolver>(PageResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('pages', () => {
    it('should return paginated pages', async () => {
      const result = await resolver.pages(undefined, undefined, 1);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('page', () => {
    it('should return null for missing page', async () => {
      const result = await resolver.page('non-existent', 1);
      expect(result).toBeNull();
    });
  });

  describe('pageBySlug', () => {
    it('should return null for missing slug', async () => {
      const result = await resolver.pageBySlug('non-existent', 1);
      expect(result).toBeNull();
    });
  });

  describe('createPage', () => {
    it('should return null', async () => {
      const result = await resolver.createPage({ title: 'Test', slug: 'test' }, 1);
      expect(result).toBeNull();
    });
  });

  describe('publishPage', () => {
    it('should return null', async () => {
      const result = await resolver.publishPage('1', 1);
      expect(result).toBeNull();
    });
  });

  describe('pagePublished', () => {
    it('should subscribe to page events', () => {
      const pubSub = { asyncIterableIterator: jest.fn() };
      resolver['pubSub'] = pubSub;
      resolver.pagePublished(1);
      expect(pubSub.asyncIterableIterator).toHaveBeenCalledWith(['PAGE_PUBLISHED']);
    });
  });
});
