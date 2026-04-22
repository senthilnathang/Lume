import { jest } from '@jest/globals';
import { SyncService } from '../../src/core/services/sync.service.js';
import { parse as parseYAML } from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock the getDrizzle function
jest.unstable_mockModule('../../src/core/db/drizzle.js', () => ({
  getDrizzle: jest.fn(() => {
    // Mock database instance
    return {
      insert: jest.fn(() => ({
        values: jest.fn(() => Promise.resolve({})),
      })),
      delete: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve({})),
      })),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    };
  }),
}));

// Mock the DrizzleAdapter
jest.unstable_mockModule('../../src/core/db/adapters/drizzle-adapter.js', () => ({
  DrizzleAdapter: class DrizzleAdapter {
    constructor(table) {
      this.table = table;
    }

    async findOne(where) {
      return null; // No existing entity
    }

    async findAll(options) {
      return { rows: [], count: 0 };
    }

    async findById(id) {
      return null;
    }

    async create(data) {
      return { id: 1, ...data, createdAt: new Date(), updatedAt: new Date() };
    }

    async update(id, data) {
      return { id, ...data, updatedAt: new Date() };
    }

    async destroy(id) {
      return true;
    }
  },
}));

describe('SyncService', () => {
  let syncService;
  let mockEntityService;
  let mockDb;
  let mockViewsTable;
  let mockSyncHistoryTable;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock EntityService
    mockEntityService = {
      adapter: {
        findOne: jest.fn(async () => null),
      },
      createEntity: jest.fn(async (data) => ({
        id: 1,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      updateEntity: jest.fn(async (id, data) => ({
        id,
        ...data,
        updatedAt: new Date(),
      })),
      createField: jest.fn(async (entityId, field) => ({
        id: 1,
        entityId,
        ...field,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      getFieldsByEntity: jest.fn(async () => []),
      getEntity: jest.fn(async () => null),
      deleteField: jest.fn(async () => true),
    };

    // Mock database
    mockDb = {
      insert: jest.fn(() => ({
        values: jest.fn(() => Promise.resolve({})),
      })),
      delete: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve({})),
      })),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    };

    mockViewsTable = {
      entityId: {},
    };

    mockSyncHistoryTable = {
      entityId: {},
    };

    syncService = new SyncService(
      mockEntityService,
      mockDb,
      mockViewsTable,
      mockSyncHistoryTable
    );
  });

  describe('loadCodeDefinitions', () => {
    test('should load YAML definitions from directory', async () => {
      // Use the test entities directory
      const entitiesDir = path.join(__dirname, '../../src/entities');

      // Ensure the directory exists
      if (!fs.existsSync(entitiesDir)) {
        fs.mkdirSync(entitiesDir, { recursive: true });
      }

      const definitions = await syncService.loadCodeDefinitions(entitiesDir);

      // Should load contact.entity.yaml
      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);

      // Check contact entity
      const contactDef = definitions.find(d => d.slug === 'contact');
      expect(contactDef).toBeDefined();
      expect(contactDef.name).toBe('Contact');
      expect(contactDef.slug).toBe('contact');
      expect(contactDef.icon).toBe('user');
      expect(contactDef.color).toBe('#3b82f6');
      expect(contactDef.description).toBe('Customer contact information');
      expect(contactDef.isPublishable).toBe(true);
      expect(contactDef._file).toBe('contact.entity.yaml');
    });

    test('should return empty array for missing directory', async () => {
      const definitions = await syncService.loadCodeDefinitions('/nonexistent/path');
      expect(definitions).toEqual([]);
    });

    test('should filter for .yaml and .yml files only', async () => {
      // This would require creating a temp directory with mixed files
      // For now, we verify the behavior with the real entities directory
      const entitiesDir = path.join(__dirname, '../../src/entities');
      const definitions = await syncService.loadCodeDefinitions(entitiesDir);

      // All loaded definitions should have _file property
      definitions.forEach(def => {
        expect(def._file).toBeDefined();
        expect(def._file).toMatch(/\.(yaml|yml)$/);
      });
    });
  });

  describe('syncToDb', () => {
    test('should create new entity with fields and views', async () => {
      const codeDefs = [
        {
          name: 'Contact',
          slug: 'contact',
          icon: 'user',
          color: '#3b82f6',
          description: 'Customer contact',
          isPublishable: true,
          _file: 'contact.entity.yaml',
          fields: [
            {
              slug: 'firstName',
              name: 'First Name',
              type: 'text',
              label: 'First Name',
              required: true,
              position: 1,
            },
            {
              slug: 'email',
              name: 'Email',
              type: 'email',
              label: 'Email Address',
              required: true,
              unique: true,
              position: 2,
            },
          ],
          views: [
            {
              name: 'All Contacts',
              type: 'list',
              isDefault: true,
              config: {
                fieldOrder: ['firstName', 'email'],
              },
            },
          ],
        },
      ];

      const result = await syncService.syncToDb(codeDefs);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.synced).toBe(1);
      expect(result.errors.length).toBe(0);

      // Verify createEntity was called
      expect(mockEntityService.createEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Contact',
          slug: 'contact',
          icon: 'user',
          color: '#3b82f6',
          description: 'Customer contact',
          isPublishable: true,
        })
      );

      // Verify createField was called for each field
      expect(mockEntityService.createField).toHaveBeenCalledTimes(2);
    });

    test('should update existing entity with same slug', async () => {
      // Mock finding existing entity
      mockEntityService.adapter.findOne.mockResolvedValue({
        id: 1,
        slug: 'contact',
        name: 'Contact',
      });

      const codeDefs = [
        {
          name: 'Updated Contact',
          slug: 'contact',
          icon: 'users',
          description: 'Updated description',
          fields: [
            {
              slug: 'firstName',
              name: 'First Name',
              type: 'text',
              label: 'First Name',
            },
          ],
        },
      ];

      const result = await syncService.syncToDb(codeDefs);

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.synced).toBe(1);

      // Verify updateEntity was called
      expect(mockEntityService.updateEntity).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Updated Contact',
        icon: 'users',
        description: 'Updated description',
      }));
    });

    test('should handle errors gracefully', async () => {
      // Mock entity creation to throw error
      mockEntityService.createEntity.mockRejectedValue(
        new Error('Database error')
      );

      const codeDefs = [
        {
          name: 'Test',
          slug: 'test',
        },
      ];

      const result = await syncService.syncToDb(codeDefs);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].entity).toBe('test');
      expect(result.errors[0].error).toContain('Database error');
    });

    test('should parse string validation as JSON', async () => {
      const codeDefs = [
        {
          name: 'Contact',
          slug: 'contact',
          fields: [
            {
              slug: 'status',
              name: 'Status',
              type: 'select',
              label: 'Status',
              validation: '{"enum": ["active", "inactive"]}', // String format
            },
          ],
        },
      ];

      await syncService.syncToDb(codeDefs);

      expect(mockEntityService.createField).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          validation: { enum: ['active', 'inactive'] }, // Should be parsed
        })
      );
    });
  });

  describe('syncToCode', () => {
    test('should export entity to YAML format', async () => {
      const mockEntity = {
        id: 1,
        name: 'Contact',
        slug: 'contact',
        icon: 'user',
        color: '#3b82f6',
        description: 'Customer contact',
        isPublishable: true,
      };

      const mockFields = [
        {
          id: 1,
          slug: 'firstName',
          name: 'First Name',
          type: 'text',
          label: 'First Name',
          required: true,
          unique: false,
          position: 1,
          validation: null,
          description: null,
          defaultValue: null,
        },
      ];

      mockEntityService.getEntity.mockResolvedValue(mockEntity);
      mockEntityService.getFieldsByEntity.mockResolvedValue(mockFields);

      const yaml = await syncService.syncToCode(1);

      expect(typeof yaml).toBe('string');
      expect(yaml).toContain('name: Contact');
      expect(yaml).toContain('slug: contact');
      expect(yaml).toContain('icon: user');
      expect(yaml).toContain('fields:');
      expect(yaml).toContain('firstName');
    });

    test('should throw error for non-existent entity', async () => {
      mockEntityService.getEntity.mockResolvedValue(null);

      await expect(syncService.syncToCode(999)).rejects.toThrow('Entity 999 not found');
    });

    test('should parse YAML and verify structure', async () => {
      const mockEntity = {
        id: 1,
        name: 'Contact',
        slug: 'contact',
        icon: 'user',
        color: '#3b82f6',
        description: 'Customer contact',
        isPublishable: true,
      };

      const mockFields = [
        {
          id: 1,
          slug: 'email',
          name: 'Email',
          type: 'email',
          label: 'Email Address',
          required: true,
          unique: true,
          position: 1,
          validation: { required: true },
          description: null,
          defaultValue: null,
        },
      ];

      mockEntityService.getEntity.mockResolvedValue(mockEntity);
      mockEntityService.getFieldsByEntity.mockResolvedValue(mockFields);

      const yaml = await syncService.syncToCode(1);
      const parsed = parseYAML(yaml);

      expect(parsed.name).toBe('Contact');
      expect(parsed.slug).toBe('contact');
      expect(parsed.fields).toBeDefined();
      expect(parsed.fields.length).toBeGreaterThan(0);
      expect(parsed.fields[0].slug).toBe('email');
    });
  });

  describe('_syncViewsForEntity', () => {
    test('should delete existing views and create new ones', async () => {
      const viewDefs = [
        {
          name: 'List View',
          type: 'list',
          isDefault: true,
          config: { sortBy: 'name' },
        },
      ];

      await syncService._syncViewsForEntity(1, viewDefs);

      // Verify delete was called
      expect(mockDb.delete).toHaveBeenCalled();

      // Verify insert was called
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('_recordSyncHistory', () => {
    test('should record sync history', async () => {
      await syncService._recordSyncHistory(1, 'code', 'create', { test: true }, 'synced');

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
