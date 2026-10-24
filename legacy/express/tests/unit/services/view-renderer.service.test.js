import { jest } from '@jest/globals';
import { ViewRendererService } from '../../../src/core/services/view-renderer.service.js';
import { DrizzleAdapter } from '../../../src/core/db/adapters/drizzle-adapter.js';
import { entityViews, entityFields } from '../../../src/modules/base/models/schema.js';

// Mock the getDrizzle function
jest.unstable_mockModule('../../../src/core/db/drizzle.js', () => ({
  getDrizzle: jest.fn(() => {
    // In-memory storage for testing
    const storage = {
      views: new Map(),
      fields: new Map(),
      viewIdCounter: 0,
      fieldIdCounter: 0,
    };

    return {
      select: jest.fn(() => ({
        from: jest.fn((table) => {
          return {
            where: jest.fn((condition) => ({
              limit: jest.fn(() => ({
                offset: jest.fn(async () => {
                  // Mock implementation for specific queries
                  return [];
                }),
              })),
              orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                  offset: jest.fn(async () => []),
                })),
              })),
            })),
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(async () => []),
              })),
            })),
            limit: jest.fn(() => ({
              offset: jest.fn(async () => []),
            })),
          };
        }),
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => Promise.resolve([{ insertId: 1 }])),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([{ affectedRows: 1 }])),
        })),
      })),
      delete: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([{ affectedRows: 1 }])),
      })),
    };
  }),
}));

describe('ViewRendererService', () => {
  let viewRendererService;
  let viewsAdapter;
  let fieldsAdapter;

  beforeEach(() => {
    // Create adapters with mocked getDrizzle
    viewsAdapter = new DrizzleAdapter(entityViews);
    fieldsAdapter = new DrizzleAdapter(entityFields);
    viewRendererService = new ViewRendererService(viewsAdapter, fieldsAdapter);
  });

  describe('renderView', () => {
    test('should render view with parsed config when found', async () => {
      const mockView = {
        id: 1,
        type: 'list',
        name: 'List View',
        config: '{"columns":["name","email"],"pageSize":20}',
        isDefault: true,
      };

      // Mock the findById method
      viewsAdapter.findById = jest.fn(async () => mockView);

      const result = await viewRendererService.renderView(1);

      expect(result).toEqual({
        id: 1,
        type: 'list',
        name: 'List View',
        config: { columns: ['name', 'email'], pageSize: 20 },
        isDefault: true,
      });
      expect(viewsAdapter.findById).toHaveBeenCalledWith(1);
    });

    test('should throw error when view not found', async () => {
      // Mock the findById method to return null
      viewsAdapter.findById = jest.fn(async () => null);

      await expect(viewRendererService.renderView(999)).rejects.toThrow('View not found');
      expect(viewsAdapter.findById).toHaveBeenCalledWith(999);
    });

    test('should handle config as object when already parsed', async () => {
      const mockView = {
        id: 2,
        type: 'grid',
        name: 'Grid View',
        config: { columns: ['title', 'description'], pageSize: 30 },
        isDefault: false,
      };

      viewsAdapter.findById = jest.fn(async () => mockView);

      const result = await viewRendererService.renderView(2);

      expect(result.config).toEqual({ columns: ['title', 'description'], pageSize: 30 });
    });
  });

  describe('getViewMetadata', () => {
    test('should get metadata for list view with configured columns', async () => {
      const view = {
        id: 1,
        type: 'list',
        name: 'List View',
        config: {
          columns: [
            { name: 'id', label: 'ID', width: 100 },
            { name: 'name', label: 'Name', width: 200 },
          ],
          pageSize: 25,
          defaultSort: [{ field: 'name', direction: 'asc' }],
          filters: [],
        },
      };

      const mockFields = [
        {
          id: 1,
          entityId: 1,
          name: 'id',
          label: 'ID',
          type: 'number',
          sequence: 0,
        },
        {
          id: 2,
          entityId: 1,
          name: 'name',
          label: 'Name',
          type: 'text',
          sequence: 1,
        },
      ];

      fieldsAdapter.findAll = jest.fn(async () => ({ rows: mockFields, count: 2 }));

      const result = await viewRendererService.getViewMetadata(view, 1);

      expect(result.type).toBe('list');
      expect(result.columns).toHaveLength(2);
      expect(result.columns[0]).toEqual({
        name: 'id',
        label: 'ID',
        type: 'number',
        width: 100,
      });
      expect(result.pageSize).toBe(25);
      expect(result.defaultSort).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    test('should get metadata for list view with default first 5 fields', async () => {
      const view = {
        id: 2,
        type: 'list',
        name: 'Default List View',
        config: {},
      };

      const mockFields = [
        { id: 1, name: 'id', label: 'ID', type: 'number', sequence: 0 },
        { id: 2, name: 'name', label: 'Name', type: 'text', sequence: 1 },
        { id: 3, name: 'email', label: 'Email', type: 'email', sequence: 2 },
        { id: 4, name: 'phone', label: 'Phone', type: 'phone', sequence: 3 },
        { id: 5, name: 'address', label: 'Address', type: 'text', sequence: 4 },
        { id: 6, name: 'city', label: 'City', type: 'text', sequence: 5 },
      ];

      fieldsAdapter.findAll = jest.fn(async () => ({ rows: mockFields, count: 6 }));

      const result = await viewRendererService.getViewMetadata(view, 1);

      expect(result.type).toBe('list');
      expect(result.columns).toHaveLength(5);
      expect(result.columns.map(c => c.name)).toEqual(['id', 'name', 'email', 'phone', 'address']);
    });

    test('should get metadata for grid view with all fields', async () => {
      const view = {
        id: 3,
        type: 'grid',
        name: 'Grid View',
        config: { pageSize: 30 },
      };

      const mockFields = [
        { id: 1, name: 'id', label: 'ID', type: 'number', sequence: 0 },
        { id: 2, name: 'title', label: 'Title', type: 'text', sequence: 1 },
        { id: 3, name: 'description', label: 'Description', type: 'rich-text', sequence: 2 },
      ];

      fieldsAdapter.findAll = jest.fn(async () => ({ rows: mockFields, count: 3 }));

      const result = await viewRendererService.getViewMetadata(view, 1);

      expect(result.type).toBe('grid');
      expect(result.columns).toHaveLength(3);
      expect(result.columns).toEqual([
        { name: 'id', label: 'ID', type: 'number' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'description', label: 'Description', type: 'rich-text' },
      ]);
      expect(result.pageSize).toBe(30);
    });

    test('should get metadata for form view with all fields and metadata', async () => {
      const view = {
        id: 4,
        type: 'form',
        name: 'Form View',
        config: { pageSize: 1, filters: [] },
      };

      const mockFields = [
        {
          id: 1,
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          helpText: 'Enter full name',
          sequence: 0,
        },
        {
          id: 2,
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          helpText: 'Enter valid email',
          sequence: 1,
        },
        {
          id: 3,
          name: 'phone',
          label: 'Phone',
          type: 'phone',
          required: false,
          helpText: null,
          sequence: 2,
        },
      ];

      fieldsAdapter.findAll = jest.fn(async () => ({ rows: mockFields, count: 3 }));

      const result = await viewRendererService.getViewMetadata(view, 1);

      expect(result.type).toBe('form');
      expect(result.columns).toHaveLength(3);
      expect(result.columns[0]).toEqual({
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        helpText: 'Enter full name',
      });
      expect(result.columns[2]).toEqual({
        name: 'phone',
        label: 'Phone',
        type: 'phone',
        required: false,
        helpText: '',
      });
    });
  });

  describe('getEntityViews', () => {
    test('should return all views for entity with parsed configs', async () => {
      const mockViews = [
        {
          id: 1,
          entityId: 5,
          type: 'list',
          name: 'Default List',
          config: '{"columns":["name","email"],"pageSize":20}',
          isDefault: true,
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 2,
          entityId: 5,
          type: 'grid',
          name: 'Card View',
          config: '{"columns":["title","image"]}',
          isDefault: false,
          createdAt: new Date('2026-01-02'),
        },
        {
          id: 3,
          entityId: 5,
          type: 'form',
          name: 'Entry Form',
          config: '{"layout":"vertical","pageSize":1}',
          isDefault: false,
          createdAt: new Date('2026-01-03'),
        },
      ];

      fieldsAdapter.findAll = jest.fn(async () => ({ rows: [], count: 0 }));
      viewsAdapter.findAll = jest.fn(async () => ({ rows: mockViews, count: 3 }));

      const result = await viewRendererService.getEntityViews(5);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 1,
        type: 'list',
        name: 'Default List',
        config: { columns: ['name', 'email'], pageSize: 20 },
        isDefault: true,
      });
      expect(result[1]).toEqual({
        id: 2,
        type: 'grid',
        name: 'Card View',
        config: { columns: ['title', 'image'] },
        isDefault: false,
      });
      expect(result[2]).toEqual({
        id: 3,
        type: 'form',
        name: 'Entry Form',
        config: { layout: 'vertical', pageSize: 1 },
        isDefault: false,
      });
      expect(viewsAdapter.findAll).toHaveBeenCalledWith({
        where: [['entityId', '=', 5]],
        order: [['createdAt', 'ASC']],
        limit: 1000,
        offset: 0,
      });
    });

    test('should return empty array when no views exist', async () => {
      viewsAdapter.findAll = jest.fn(async () => ({ rows: [], count: 0 }));

      const result = await viewRendererService.getEntityViews(999);

      expect(result).toEqual([]);
      expect(viewsAdapter.findAll).toHaveBeenCalledWith({
        where: [['entityId', '=', 999]],
        order: [['createdAt', 'ASC']],
        limit: 1000,
        offset: 0,
      });
    });

    test('should handle views with already parsed configs', async () => {
      const mockViews = [
        {
          id: 1,
          entityId: 6,
          type: 'list',
          name: 'View 1',
          config: { pageSize: 50 },
          isDefault: true,
          createdAt: new Date('2026-01-01'),
        },
      ];

      viewsAdapter.findAll = jest.fn(async () => ({ rows: mockViews, count: 1 }));

      const result = await viewRendererService.getEntityViews(6);

      expect(result[0].config).toEqual({ pageSize: 50 });
    });

    test('should handle views with null config', async () => {
      const mockViews = [
        {
          id: 1,
          entityId: 7,
          type: 'form',
          name: 'Empty Form',
          config: null,
          isDefault: false,
          createdAt: new Date('2026-01-01'),
        },
      ];

      viewsAdapter.findAll = jest.fn(async () => ({ rows: mockViews, count: 1 }));

      const result = await viewRendererService.getEntityViews(7);

      expect(result[0].config).toEqual({});
    });
  });
});
