import { Test, TestingModule } from '@nestjs/testing';
import { MediaResolver } from '../../../../src/graphql/grids/content-grid/resolvers/media.resolver';

describe('MediaResolver', () => {
  let resolver: MediaResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<MediaResolver>(MediaResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('mediaLibrary', () => {
    it('should return paginated media', async () => {
      const result = await resolver.mediaLibrary(undefined, 1);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('mediaItem', () => {
    it('should return null for missing media', async () => {
      const result = await resolver.mediaItem('non-existent', 1);
      expect(result).toBeNull();
    });
  });

  describe('addMedia', () => {
    it('should return null', async () => {
      const input = { name: 'test.jpg', url: 'http://example.com/test.jpg', mimeType: 'image/jpeg', size: 1024 };
      const result = await resolver.addMedia(input, 1);
      expect(result).toBeNull();
    });
  });

  describe('deleteMedia', () => {
    it('should return true', async () => {
      const result = await resolver.deleteMedia('1', 1);
      expect(result).toBe(true);
    });
  });
});
