import { Test, TestingModule } from '@nestjs/testing';
import { MenuResolver } from '../../../../src/graphql/grids/content-grid/resolvers/menu.resolver';

describe('MenuResolver', () => {
  let resolver: MenuResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuResolver],
    })
      .overrideGuard('GqlJwtGuard')
      .useValue({ canActivate: () => true })
      .overrideGuard('GqlRbacGuard')
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<MenuResolver>(MenuResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('menus', () => {
    it('should return empty array', async () => {
      const result = await resolver.menus(1);
      expect(result).toEqual([]);
    });
  });

  describe('menu', () => {
    it('should return null for missing menu', async () => {
      const result = await resolver.menu('non-existent', 1);
      expect(result).toBeNull();
    });
  });

  describe('menuByLocation', () => {
    it('should return null for missing location', async () => {
      const result = await resolver.menuByLocation('header', 1);
      expect(result).toBeNull();
    });
  });

  describe('createMenu', () => {
    it('should return null', async () => {
      const result = await resolver.createMenu({ name: 'Menu', location: 'header' }, 1);
      expect(result).toBeNull();
    });
  });

  describe('reorderMenu', () => {
    it('should return null', async () => {
      const result = await resolver.reorderMenu('1', { items: [] }, 1);
      expect(result).toBeNull();
    });
  });

  describe('deleteMenu', () => {
    it('should return true', async () => {
      const result = await resolver.deleteMenu('1', 1);
      expect(result).toBe(true);
    });
  });
});
