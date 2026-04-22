import { jest } from '@jest/globals';
import { EntityService } from '../../src/core/services/entity.service.js';
import { DrizzleAdapter } from '../../src/core/db/adapters/drizzle-adapter.js';
import { customEntities, entityFields, entityViews } from '../../src/modules/base/models/schema.js';

// Mock the getDrizzle function
jest.unstable_mockModule('../../src/core/db/drizzle.js', () => ({
  getDrizzle: jest.fn(() => {
    // Return a mock database with basic in-memory storage for testing
    const storage = {
      entities: new Map(),
      fields: new Map(),
      views: new Map(),
    };

    return {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => {
              return Promise.resolve([]);
            }),
          })),
          limit: jest.fn(() => ({
            offset: jest.fn(() => Promise.resolve([])),
          })),
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              offset: jest.fn(() => Promise.resolve([])),
            })),
          })),
        })),
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

describe('EntityService', () => {
  let entityService;
  let adapter;

  beforeEach(() => {
    // Create a real adapter with mocked getDrizzle
    adapter = new DrizzleAdapter(customEntities);
    entityService = new EntityService(adapter);
  });

  describe('validateEntity', () => {
    test('should throw error when name is missing', () => {
      const data = {
        slug: 'test-entity',
        description: 'Test',
      };

      expect(() => {
        entityService.validateEntity(data);
      }).toThrow();

      try {
        entityService.validateEntity(data);
      } catch (err) {
        expect(err.errors).toBeDefined();
        expect(err.errors.name).toBeDefined();
      }
    });

    test('should throw error when slug is missing', () => {
      const data = {
        name: 'Test Entity',
        description: 'Test',
      };

      expect(() => {
        entityService.validateEntity(data);
      }).toThrow();

      try {
        entityService.validateEntity(data);
      } catch (err) {
        expect(err.errors).toBeDefined();
        expect(err.errors.slug).toBeDefined();
      }
    });

    test('should throw error when slug has invalid format', () => {
      const data = {
        name: 'Test Entity',
        slug: 'Test Entity!@#',
        description: 'Test',
      };

      expect(() => {
        entityService.validateEntity(data);
      }).toThrow();

      try {
        entityService.validateEntity(data);
      } catch (err) {
        expect(err.errors).toBeDefined();
        expect(err.errors.slug).toBeDefined();
      }
    });

    test('should accept valid entity data', () => {
      const data = {
        name: 'Test Entity',
        slug: 'test-entity',
        description: 'Test entity description',
        icon: 'users',
        color: '#FF5733',
        isPublishable: true,
      };

      // Should not throw
      expect(() => {
        entityService.validateEntity(data);
      }).not.toThrow();
    });

    test('should accept slug with hyphens, underscores, and numbers', () => {
      const validSlugs = ['test_entity', 'test-entity', 'test123', 'test_entity-123'];

      validSlugs.forEach(slug => {
        const data = {
          name: 'Test Entity',
          slug,
        };

        expect(() => {
          entityService.validateEntity(data);
        }).not.toThrow();
      });
    });

    test('should reject slug with uppercase letters', () => {
      const data = {
        name: 'Test Entity',
        slug: 'TestEntity',
      };

      expect(() => {
        entityService.validateEntity(data);
      }).toThrow();
    });

    test('should reject slug with spaces', () => {
      const data = {
        name: 'Test Entity',
        slug: 'test entity',
      };

      expect(() => {
        entityService.validateEntity(data);
      }).toThrow();
    });
  });

  describe('createEntity', () => {
    test('should create entity with valid data', async () => {
      const data = {
        name: 'Test Entity',
        slug: 'test-entity',
        description: 'Test description',
        icon: 'box',
        color: '#FF5733',
        isPublishable: true,
      };

      // Mock the adapter's create method
      adapter.create = jest.fn(() =>
        Promise.resolve({
          id: 1,
          ...data,
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })
      );

      const result = await entityService.createEntity(data);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Entity');
      expect(result.slug).toBe('test-entity');
      expect(result.isPublished).toBe(false);
      expect(adapter.create).toHaveBeenCalled();
    });

    test('should throw validation error on invalid data', async () => {
      const data = {
        slug: 'test-entity',
        // Missing name
      };

      await expect(entityService.createEntity(data)).rejects.toThrow();
    });
  });

  describe('getEntity', () => {
    test('should retrieve entity by ID with fields and views', async () => {
      const mockEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        description: 'Test',
        icon: 'box',
        color: '#FF5733',
        isPublishable: true,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      adapter.findById = jest.fn(() => Promise.resolve(mockEntity));

      const result = await entityService.getEntity(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Entity');
      expect(adapter.findById).toHaveBeenCalledWith(1);
    });

    test('should return null for non-existent entity', async () => {
      adapter.findById = jest.fn(() => Promise.resolve(null));

      const result = await entityService.getEntity(999);

      expect(result).toBeNull();
    });

    test('should return null for deleted entity', async () => {
      const deletedEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        deletedAt: new Date(),
      };

      adapter.findById = jest.fn(() => Promise.resolve(deletedEntity));

      const result = await entityService.getEntity(1);

      // Service should filter out deleted entities
      expect(result).toBeNull();
    });
  });

  describe('listEntities', () => {
    test('should list all non-deleted entities with pagination', async () => {
      const mockEntities = [
        {
          id: 1,
          name: 'Entity 1',
          slug: 'entity-1',
          deletedAt: null,
        },
        {
          id: 2,
          name: 'Entity 2',
          slug: 'entity-2',
          deletedAt: null,
        },
      ];

      adapter.findAll = jest.fn(() =>
        Promise.resolve({
          rows: mockEntities,
          count: 2,
        })
      );

      const result = await entityService.listEntities({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(adapter.findAll).toHaveBeenCalled();
    });

    test('should use default pagination values', async () => {
      adapter.findAll = jest.fn(() =>
        Promise.resolve({
          rows: [],
          count: 0,
        })
      );

      await entityService.listEntities();

      expect(adapter.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0,
        })
      );
    });

    test('should calculate correct pagination values', async () => {
      adapter.findAll = jest.fn(() =>
        Promise.resolve({
          rows: [],
          count: 50,
        })
      );

      const result = await entityService.listEntities({ page: 2, limit: 10 });

      expect(result.totalPages).toBe(5);
      expect(result.page).toBe(2);
      expect(adapter.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 10,
        })
      );
    });
  });

  describe('updateEntity', () => {
    test('should update entity metadata', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        color: '#00FF00',
      };

      const updatedEntity = {
        id: 1,
        ...updateData,
        slug: 'test-entity',
        isPublishable: true,
        isPublished: false,
        updatedAt: new Date(),
      };

      adapter.update = jest.fn(() => Promise.resolve(updatedEntity));

      const result = await entityService.updateEntity(1, updateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(adapter.update).toHaveBeenCalledWith(1, updateData);
    });

    test('should return null if entity not found', async () => {
      adapter.update = jest.fn(() => Promise.resolve(null));

      const result = await entityService.updateEntity(999, { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteEntity', () => {
    test('should soft delete entity (set deletedAt)', async () => {
      const deletedEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        deletedAt: new Date(),
      };

      adapter.update = jest.fn(() => Promise.resolve(deletedEntity));

      const result = await entityService.deleteEntity(1);

      expect(result).toBeDefined();
      expect(result.deletedAt).not.toBeNull();
      expect(adapter.update).toHaveBeenCalled();

      // Check that update was called with deletedAt
      const callArgs = adapter.update.mock.calls[0];
      expect(callArgs[0]).toBe(1);
      expect(callArgs[1].deletedAt).toBeDefined();
    });

    test('should return deleted entity data', async () => {
      const deletedEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        deletedAt: new Date(),
      };

      adapter.update = jest.fn(() => Promise.resolve(deletedEntity));

      const result = await entityService.deleteEntity(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test Entity');
    });
  });
});
