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

  describe('Field Management', () => {
    let fieldsAdapter;

    beforeEach(() => {
      // Create a real fields adapter with mocked getDrizzle
      fieldsAdapter = new DrizzleAdapter(entityFields);
      entityService = new EntityService(adapter, fieldsAdapter);
    });

    describe('validateField', () => {
      test('should throw error when name is missing', () => {
        const field = {
          label: 'Test Field',
          type: 'text',
          slug: 'test-field',
        };

        expect(() => {
          entityService.validateField(field);
        }).toThrow();

        try {
          entityService.validateField(field);
        } catch (err) {
          expect(err.errors).toBeDefined();
          expect(err.errors.name).toBeDefined();
        }
      });

      test('should throw error when label is missing', () => {
        const field = {
          name: 'testField',
          type: 'text',
          slug: 'test-field',
        };

        expect(() => {
          entityService.validateField(field);
        }).toThrow();

        try {
          entityService.validateField(field);
        } catch (err) {
          expect(err.errors).toBeDefined();
          expect(err.errors.label).toBeDefined();
        }
      });

      test('should throw error when type is missing', () => {
        const field = {
          name: 'testField',
          label: 'Test Field',
          slug: 'test-field',
        };

        expect(() => {
          entityService.validateField(field);
        }).toThrow();

        try {
          entityService.validateField(field);
        } catch (err) {
          expect(err.errors).toBeDefined();
          expect(err.errors.type).toBeDefined();
        }
      });

      test('should throw error when type is invalid', () => {
        const field = {
          name: 'testField',
          label: 'Test Field',
          type: 'invalid-type',
          slug: 'test-field',
        };

        expect(() => {
          entityService.validateField(field);
        }).toThrow();

        try {
          entityService.validateField(field);
        } catch (err) {
          expect(err.errors).toBeDefined();
          expect(err.errors.type).toBeDefined();
          expect(err.errors.type).toContain('text');
        }
      });

      test('should accept valid field data', () => {
        const field = {
          name: 'testField',
          label: 'Test Field',
          type: 'text',
          slug: 'test-field',
          description: 'A test field',
          required: true,
          unique: false,
          position: 1,
        };

        expect(() => {
          entityService.validateField(field);
        }).not.toThrow();
      });

      test('should accept all valid field types', () => {
        const validTypes = [
          'text',
          'email',
          'phone',
          'number',
          'date',
          'datetime',
          'boolean',
          'select',
          'multi-select',
          'rich-text',
          'url',
          'color',
        ];

        validTypes.forEach(type => {
          const field = {
            name: 'testField',
            label: 'Test Field',
            type,
            slug: 'test-field',
          };

          expect(() => {
            entityService.validateField(field);
          }).not.toThrow();
        });
      });

      test('should throw error when slug has invalid format', () => {
        const field = {
          name: 'testField',
          label: 'Test Field',
          type: 'text',
          slug: 'Test Field!@#',
        };

        expect(() => {
          entityService.validateField(field);
        }).toThrow();

        try {
          entityService.validateField(field);
        } catch (err) {
          expect(err.errors).toBeDefined();
          expect(err.errors.slug).toBeDefined();
        }
      });
    });

    describe('createField', () => {
      test('should create field for entity with lowercase slug', async () => {
        const fieldData = {
          slug: 'PRODUCT-NAME',
          name: 'productName',
          type: 'text',
          label: 'Product Name',
          required: true,
          position: 1,
        };

        const createdField = {
          id: 1,
          entityId: 5,
          slug: 'product-name',
          name: 'productName',
          type: 'text',
          label: 'Product Name',
          required: true,
          unique: false,
          description: null,
          validation: null,
          position: 1,
          defaultValue: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        fieldsAdapter.create = jest.fn(() => Promise.resolve(createdField));

        const result = await entityService.createField(5, fieldData);

        expect(result).toBeDefined();
        expect(result.id).toBe(1);
        expect(result.entityId).toBe(5);
        expect(result.slug).toBe('product-name');
        expect(fieldsAdapter.create).toHaveBeenCalled();

        // Verify slug was lowercased
        const callArgs = fieldsAdapter.create.mock.calls[0];
        expect(callArgs[0].slug).toBe('product-name');
      });

      test('should throw validation error on invalid field', async () => {
        const fieldData = {
          slug: 'invalid-field',
          // Missing name and label
          type: 'text',
        };

        await expect(entityService.createField(5, fieldData)).rejects.toThrow();
      });

      test('should set default values for optional fields', async () => {
        const fieldData = {
          slug: 'test-field',
          name: 'testField',
          type: 'text',
          label: 'Test Field',
        };

        const createdField = {
          id: 1,
          entityId: 5,
          ...fieldData,
          required: false,
          unique: false,
          description: null,
          validation: null,
          position: 0,
          defaultValue: null,
        };

        fieldsAdapter.create = jest.fn(() => Promise.resolve(createdField));

        const result = await entityService.createField(5, fieldData);

        const callArgs = fieldsAdapter.create.mock.calls[0];
        expect(callArgs[0].required).toBe(false);
        expect(callArgs[0].unique).toBe(false);
        expect(callArgs[0].position).toBe(0);
        expect(result).toBeDefined();
      });
    });

    describe('getFieldsByEntity', () => {
      test('should get fields ordered by position', async () => {
        const mockFields = [
          {
            id: 1,
            entityId: 5,
            slug: 'field-1',
            name: 'field1',
            type: 'text',
            label: 'Field 1',
            position: 1,
            validation: null,
          },
          {
            id: 2,
            entityId: 5,
            slug: 'field-2',
            name: 'field2',
            type: 'email',
            label: 'Field 2',
            position: 2,
            validation: null,
          },
          {
            id: 3,
            entityId: 5,
            slug: 'field-3',
            name: 'field3',
            type: 'number',
            label: 'Field 3',
            position: 0,
            validation: null,
          },
        ];

        fieldsAdapter.findAll = jest.fn(() =>
          Promise.resolve({
            rows: mockFields,
            count: 3,
          })
        );

        const result = await entityService.getFieldsByEntity(5);

        expect(result).toBeDefined();
        expect(result).toHaveLength(3);
        expect(fieldsAdapter.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: [['entityId', '=', 5]],
            order: [['position', 'ASC']],
          })
        );
      });

      test('should parse validation JSON', async () => {
        const mockFields = [
          {
            id: 1,
            entityId: 5,
            slug: 'field-1',
            name: 'field1',
            type: 'text',
            label: 'Field 1',
            position: 1,
            validation: '{"minLength": 5, "maxLength": 100}',
          },
        ];

        fieldsAdapter.findAll = jest.fn(() =>
          Promise.resolve({
            rows: mockFields,
            count: 1,
          })
        );

        const result = await entityService.getFieldsByEntity(5);

        expect(result[0].validation).toEqual({ minLength: 5, maxLength: 100 });
      });

      test('should return empty array if no fields found', async () => {
        fieldsAdapter.findAll = jest.fn(() =>
          Promise.resolve({
            rows: [],
            count: 0,
          })
        );

        const result = await entityService.getFieldsByEntity(5);

        expect(result).toEqual([]);
      });
    });

    describe('updateField', () => {
      test('should update field metadata', async () => {
        const updateData = {
          label: 'Updated Label',
          description: 'Updated description',
          position: 2,
        };

        const updatedField = {
          id: 1,
          entityId: 5,
          slug: 'test-field',
          name: 'testField',
          type: 'text',
          ...updateData,
          validation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        fieldsAdapter.update = jest.fn(() => Promise.resolve(updatedField));

        const result = await entityService.updateField(1, updateData);

        expect(result).toBeDefined();
        expect(result.label).toBe('Updated Label');
        expect(result.description).toBe('Updated description');
        expect(fieldsAdapter.update).toHaveBeenCalledWith(1, updateData);
      });

      test('should handle validation JSON stringify', async () => {
        const updateData = {
          validation: { minLength: 10, maxLength: 50 },
        };

        const updatedField = {
          id: 1,
          entityId: 5,
          slug: 'test-field',
          name: 'testField',
          type: 'text',
          label: 'Test Field',
          validation: '{"minLength":10,"maxLength":50}',
        };

        fieldsAdapter.update = jest.fn(() => Promise.resolve(updatedField));

        const result = await entityService.updateField(1, updateData);

        expect(result).toBeDefined();
        expect(result.validation).toEqual({ minLength: 10, maxLength: 50 });

        const callArgs = fieldsAdapter.update.mock.calls[0];
        // Verify validation was stringified (exact format may vary)
        expect(typeof callArgs[1].validation).toBe('string');
        expect(JSON.parse(callArgs[1].validation)).toEqual({ minLength: 10, maxLength: 50 });
      });

      test('should return null if field not found', async () => {
        fieldsAdapter.update = jest.fn(() => Promise.resolve(null));

        const result = await entityService.updateField(999, { label: 'Test' });

        expect(result).toBeNull();
      });
    });

    describe('deleteField', () => {
      test('should delete field', async () => {
        fieldsAdapter.destroy = jest.fn(() => Promise.resolve(true));

        const result = await entityService.deleteField(1);

        expect(result).toBe(true);
        expect(fieldsAdapter.destroy).toHaveBeenCalledWith(1);
      });

      test('should return false if field not found', async () => {
        fieldsAdapter.destroy = jest.fn(() => Promise.resolve(false));

        const result = await entityService.deleteField(999);

        expect(result).toBe(false);
      });
    });
  });

  describe('publishEntity', () => {
    test('should publish publishable entity', async () => {
      const publishableEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        isPublishable: true,
        isPublished: false,
        deletedAt: null,
      };

      adapter.findById = jest.fn(() => Promise.resolve(publishableEntity));

      const publishedEntity = {
        ...publishableEntity,
        isPublished: true,
      };

      adapter.update = jest.fn(() => Promise.resolve(publishedEntity));

      const result = await entityService.publishEntity(1);

      expect(result).toBeDefined();
      expect(result.isPublished).toBe(true);
      expect(adapter.update).toHaveBeenCalledWith(1, { isPublished: true });
    });

    test('should throw error when trying to publish non-publishable entity', async () => {
      const nonPublishableEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        isPublishable: false,
        isPublished: false,
        deletedAt: null,
      };

      adapter.findById = jest.fn(() => Promise.resolve(nonPublishableEntity));

      await expect(entityService.publishEntity(1)).rejects.toThrow('Entity is not publishable');

      try {
        await entityService.publishEntity(1);
      } catch (err) {
        expect(err.code).toBe('NOT_PUBLISHABLE');
      }
    });

    test('should return null if entity not found', async () => {
      adapter.findById = jest.fn(() => Promise.resolve(null));

      const result = await entityService.publishEntity(999);

      expect(result).toBeNull();
    });
  });

  describe('unpublishEntity', () => {
    test('should unpublish entity', async () => {
      const unpublishedEntity = {
        id: 1,
        name: 'Test Entity',
        slug: 'test-entity',
        isPublished: false,
      };

      adapter.update = jest.fn(() => Promise.resolve(unpublishedEntity));

      const result = await entityService.unpublishEntity(1);

      expect(result).toBeDefined();
      expect(result.isPublished).toBe(false);
      expect(adapter.update).toHaveBeenCalledWith(1, { isPublished: false });
    });

    test('should return null if entity not found', async () => {
      adapter.update = jest.fn(() => Promise.resolve(null));

      const result = await entityService.unpublishEntity(999);

      expect(result).toBeNull();
    });
  });

  describe('getPublishedEntities', () => {
    test('should return only published entities', async () => {
      const mockEntities = [
        {
          id: 1,
          name: 'Published Entity 1',
          slug: 'published-1',
          isPublished: true,
          deletedAt: null,
        },
        {
          id: 3,
          name: 'Published Entity 2',
          slug: 'published-2',
          isPublished: true,
          deletedAt: null,
        },
      ];

      adapter.findAll = jest.fn(() =>
        Promise.resolve({
          rows: mockEntities,
          count: 2,
        })
      );

      const result = await entityService.getPublishedEntities();

      expect(result).toHaveLength(2);
      expect(result.every(e => e.isPublished === true)).toBe(true);
      expect(adapter.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            ['isPublished', '=', true],
            ['deletedAt', '=', null],
          ],
        })
      );
    });

    test('should return empty array if no published entities', async () => {
      adapter.findAll = jest.fn(() =>
        Promise.resolve({
          rows: [],
          count: 0,
        })
      );

      const result = await entityService.getPublishedEntities();

      expect(result).toEqual([]);
    });

    test('should exclude deleted entities from published list', async () => {
      // This test verifies the behavior through the findAll call
      // The actual filtering is done in the database query
      adapter.findAll = jest.fn(() =>
        Promise.resolve({
          rows: [],
          count: 0,
        })
      );

      await entityService.getPublishedEntities();

      // Verify deletedAt=null is in the query
      const callArgs = adapter.findAll.mock.calls[0][0];
      expect(callArgs.where).toContainEqual(['deletedAt', '=', null]);
    });
  });
});
