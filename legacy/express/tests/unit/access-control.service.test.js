import { jest } from '@jest/globals';
import { AccessControlService } from '../../src/core/services/access-control.service.js';

describe('AccessControlService', () => {
  let service;
  let mockPrisma;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      entityFieldPermission: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
  });

  describe('scopeQuery', () => {
    it('should add companyId to where clause when where exists', () => {
      service = new AccessControlService();
      const query = { where: { status: 'active' } };

      const result = service.scopeQuery(query, 5);

      expect(result.where.companyId).toBe(5);
      expect(result.where.status).toBe('active');
    });

    it('should create where clause with companyId when where does not exist', () => {
      service = new AccessControlService();
      const query = {};

      const result = service.scopeQuery(query, 10);

      expect(result.where.companyId).toBe(10);
    });

    it('should create where object if query is null', () => {
      service = new AccessControlService();

      const result = service.scopeQuery(null, 7);

      expect(result.where.companyId).toBe(7);
    });

    it('should preserve existing where conditions when adding companyId', () => {
      service = new AccessControlService();
      const query = {
        where: { status: 'active', type: 'user', priority: 'high' },
        limit: 10,
      };

      const result = service.scopeQuery(query, 3);

      expect(result.where.companyId).toBe(3);
      expect(result.where.status).toBe('active');
      expect(result.where.type).toBe('user');
      expect(result.where.priority).toBe('high');
      expect(result.limit).toBe(10);
    });
  });

  describe('enforceFieldPermissions', () => {
    it('should filter record to only allowed fields', () => {
      service = new AccessControlService();
      const record = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        salary: 50000,
        ssn: '123-45-6789',
      };
      const allowedFields = ['id', 'name', 'email'];

      const result = service.enforceFieldPermissions(record, allowedFields);

      expect(result).toEqual({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result.salary).toBeUndefined();
      expect(result.ssn).toBeUndefined();
    });

    it('should handle missing fields gracefully', () => {
      service = new AccessControlService();
      const record = { name: 'John', email: 'john@example.com' };
      const allowedFields = ['name', 'email', 'phone', 'address'];

      const result = service.enforceFieldPermissions(record, allowedFields);

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should return empty object if record is null', () => {
      service = new AccessControlService();

      const result = service.enforceFieldPermissions(null, ['name', 'email']);

      expect(result).toEqual({});
    });

    it('should return empty object if record is not an object', () => {
      service = new AccessControlService();

      const result = service.enforceFieldPermissions('not an object', ['name']);

      expect(result).toEqual({});
    });

    it('should return empty object if allowedFields is not an array', () => {
      service = new AccessControlService();
      const record = { name: 'John', email: 'john@example.com' };

      const result = service.enforceFieldPermissions(record, 'not an array');

      expect(result).toEqual({});
    });

    it('should return empty object if allowedFields is empty', () => {
      service = new AccessControlService();
      const record = { name: 'John', email: 'john@example.com' };

      const result = service.enforceFieldPermissions(record, []);

      expect(result).toEqual({});
    });

    it('should handle nested object values', () => {
      service = new AccessControlService();
      const record = {
        name: 'John',
        address: { street: '123 Main St', city: 'NYC' },
        email: 'john@example.com',
      };
      const allowedFields = ['name', 'address'];

      const result = service.enforceFieldPermissions(record, allowedFields);

      expect(result.address).toEqual({ street: '123 Main St', city: 'NYC' });
    });
  });

  describe('canReadField', () => {
    it('should return true when permission exists and canRead is true', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockResolvedValue({
        fieldId: 10,
        roleId: 5,
        canRead: true,
        canWrite: false,
      });

      const result = await service.canReadField(10, 5);

      expect(result).toBe(true);
      expect(mockPrisma.entityFieldPermission.findUnique).toHaveBeenCalledWith({
        where: {
          entity_field_permissions_field_id_role_id: {
            fieldId: 10,
            roleId: 5,
          },
        },
      });
    });

    it('should return false when permission exists but canRead is false', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockResolvedValue({
        fieldId: 10,
        roleId: 5,
        canRead: false,
        canWrite: true,
      });

      const result = await service.canReadField(10, 5);

      expect(result).toBe(false);
    });

    it('should return false when no permission exists', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockResolvedValue(null);

      const result = await service.canReadField(10, 5);

      expect(result).toBe(false);
    });

    it('should return true when no prisma client (testing mode)', async () => {
      service = new AccessControlService(null);

      const result = await service.canReadField(10, 5);

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.canReadField(10, 5);

      expect(result).toBe(false);
    });
  });

  describe('canWriteField', () => {
    it('should return true when permission exists and canWrite is true', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockResolvedValue({
        fieldId: 15,
        roleId: 3,
        canRead: true,
        canWrite: true,
      });

      const result = await service.canWriteField(15, 3);

      expect(result).toBe(true);
      expect(mockPrisma.entityFieldPermission.findUnique).toHaveBeenCalledWith({
        where: {
          entity_field_permissions_field_id_role_id: {
            fieldId: 15,
            roleId: 3,
          },
        },
      });
    });

    it('should return false when permission exists but canWrite is false', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockResolvedValue({
        fieldId: 15,
        roleId: 3,
        canRead: true,
        canWrite: false,
      });

      const result = await service.canWriteField(15, 3);

      expect(result).toBe(false);
    });

    it('should return false when no permission exists', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockResolvedValue(null);

      const result = await service.canWriteField(15, 3);

      expect(result).toBe(false);
    });

    it('should return true when no prisma client (testing mode)', async () => {
      service = new AccessControlService(null);

      const result = await service.canWriteField(15, 3);

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.canWriteField(15, 3);

      expect(result).toBe(false);
    });
  });

  describe('getReadableFields', () => {
    it('should return array of readable field IDs', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findMany.mockResolvedValue([
        { fieldId: 1 },
        { fieldId: 3 },
        { fieldId: 4 },
      ]);

      const result = await service.getReadableFields([1, 2, 3, 4, 5], 7);

      expect(result).toEqual([1, 3, 4]);
      expect(mockPrisma.entityFieldPermission.findMany).toHaveBeenCalledWith({
        where: {
          fieldId: {
            in: [1, 2, 3, 4, 5],
          },
          roleId: 7,
          canRead: true,
        },
        select: {
          fieldId: true,
        },
      });
    });

    it('should return empty array when no readable fields', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findMany.mockResolvedValue([]);

      const result = await service.getReadableFields([1, 2, 3], 7);

      expect(result).toEqual([]);
    });

    it('should return all fields when no prisma client (testing mode)', async () => {
      service = new AccessControlService(null);

      const result = await service.getReadableFields([1, 2, 3, 4, 5], 7);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return empty array when fieldIds is empty', async () => {
      service = new AccessControlService(mockPrisma);

      const result = await service.getReadableFields([], 7);

      expect(result).toEqual([]);
    });

    it('should return empty array when fieldIds is null', async () => {
      service = new AccessControlService(mockPrisma);

      const result = await service.getReadableFields(null, 7);

      expect(result).toEqual([]);
    });

    it('should return empty array when fieldIds is not an array', async () => {
      service = new AccessControlService(mockPrisma);

      const result = await service.getReadableFields('not an array', 7);

      expect(result).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findMany.mockRejectedValue(
        new Error('Database query failed')
      );

      const result = await service.getReadableFields([1, 2, 3], 7);

      expect(result).toEqual([]);
    });

    it('should handle multiple readable fields correctly', async () => {
      service = new AccessControlService(mockPrisma);
      mockPrisma.entityFieldPermission.findMany.mockResolvedValue([
        { fieldId: 10 },
        { fieldId: 20 },
        { fieldId: 30 },
        { fieldId: 40 },
      ]);

      const result = await service.getReadableFields(
        [10, 20, 30, 40, 50],
        15
      );

      expect(result).toEqual([10, 20, 30, 40]);
    });
  });
});
