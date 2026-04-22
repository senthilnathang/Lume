import { jest } from '@jest/globals';
import { RecordService } from '../../../src/core/services/record.service.js';
import { AccessControlService } from '../../../src/core/services/access-control.service.js';

describe('RecordService', () => {
  let recordService;
  let mockPrisma;
  let mockAccessControl;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      entity: {
        findUnique: jest.fn(),
      },
      entityField: {
        findMany: jest.fn(),
      },
      entityRecord: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    // Mock AccessControlService
    mockAccessControl = new AccessControlService(null);
    jest.spyOn(mockAccessControl, 'scopeQuery').mockImplementation((query, companyId) => {
      if (!query) query = {};
      if (!query.where) query.where = {};
      query.where.companyId = companyId;
      return query;
    });

    // Create service
    recordService = new RecordService(mockPrisma, mockAccessControl);
  });

  describe('constructor', () => {
    test('should throw error if prisma is null', () => {
      expect(() => {
        new RecordService(null, mockAccessControl);
      }).toThrow('RecordService requires a Prisma client instance');
    });

    test('should throw error if accessControlService is null', () => {
      expect(() => {
        new RecordService(mockPrisma, null);
      }).toThrow('RecordService requires an AccessControlService instance');
    });

    test('should initialize with prisma and accessControl services', () => {
      const service = new RecordService(mockPrisma, mockAccessControl);
      expect(service.prisma).toBe(mockPrisma);
      expect(service.accessControl).toBe(mockAccessControl);
    });
  });

  describe('getEntitySchema', () => {
    test('should return entity with fields', async () => {
      const mockEntity = {
        id: 1,
        name: 'Product',
        label: 'Product',
      };

      const mockFields = [
        {
          id: 1,
          entityId: 1,
          name: 'productName',
          label: 'Product Name',
          type: 'text',
          required: true,
          sequence: 0,
        },
        {
          id: 2,
          entityId: 1,
          name: 'price',
          label: 'Price',
          type: 'number',
          required: true,
          sequence: 1,
        },
      ];

      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);

      const result = await recordService.getEntitySchema(1);

      expect(result).toEqual({
        ...mockEntity,
        fields: mockFields,
      });
      expect(mockPrisma.entity.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrisma.entityField.findMany).toHaveBeenCalledWith({
        where: { entityId: 1, deletedAt: null },
        orderBy: { sequence: 'asc' },
      });
    });

    test('should throw error if entity not found', async () => {
      mockPrisma.entity.findUnique.mockResolvedValue(null);

      await expect(recordService.getEntitySchema(999)).rejects.toThrow('Entity with ID 999 not found');
    });
  });

  describe('validateRecord', () => {
    test('should validate required fields present', () => {
      const fields = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
      ];

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = recordService.validateRecord(fields, validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should fail if required field is missing', () => {
      const fields = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: false },
      ];

      const invalidData = {
        email: 'john@example.com',
      };

      const result = recordService.validateRecord(fields, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('is required');
    });

    test('should fail if required field is null', () => {
      const fields = [
        { name: 'name', label: 'Name', type: 'text', required: true },
      ];

      const invalidData = {
        name: null,
      };

      const result = recordService.validateRecord(fields, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('is required');
    });

    test('should fail if required field is empty string', () => {
      const fields = [
        { name: 'name', label: 'Name', type: 'text', required: true },
      ];

      const invalidData = {
        name: '',
      };

      const result = recordService.validateRecord(fields, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toContain('is required');
    });

    test('should validate text type', () => {
      const fields = [
        { name: 'name', label: 'Name', type: 'text', required: false },
      ];

      const result = recordService.validateRecord(fields, { name: 'John' });
      expect(result.valid).toBe(true);

      const invalidResult = recordService.validateRecord(fields, { name: 123 });
      expect(invalidResult.valid).toBe(false);
    });

    test('should validate email type', () => {
      const fields = [
        { name: 'email', label: 'Email', type: 'email', required: false },
      ];

      const validResult = recordService.validateRecord(fields, { email: 'john@example.com' });
      expect(validResult.valid).toBe(true);

      const invalidResult = recordService.validateRecord(fields, { email: 'invalid-email' });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.email).toContain('valid email');
    });

    test('should validate number type', () => {
      const fields = [
        { name: 'price', label: 'Price', type: 'number', required: false },
      ];

      const validResult = recordService.validateRecord(fields, { price: 99.99 });
      expect(validResult.valid).toBe(true);

      const invalidResult = recordService.validateRecord(fields, { price: 'ninety-nine' });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.price).toContain('must be a number');
    });

    test('should validate multiple fields with mixed results', () => {
      const fields = [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'price', label: 'Price', type: 'number', required: false },
      ];

      const invalidData = {
        email: 'invalid-email',
        price: 'not-a-number',
      };

      const result = recordService.validateRecord(fields, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.price).toBeDefined();
    });

    test('should skip validation for optional fields with null value', () => {
      const fields = [
        { name: 'email', label: 'Email', type: 'email', required: false },
      ];

      const result = recordService.validateRecord(fields, { email: null });
      expect(result.valid).toBe(true);
    });
  });

  describe('createRecord', () => {
    test('should create record with valid data', async () => {
      const mockEntity = {
        id: 1,
        name: 'Product',
      };

      const mockFields = [
        { name: 'productName', type: 'text', required: true, label: 'Product Name' },
      ];

      const mockCreatedRecord = {
        id: 1,
        entityId: 1,
        data: '{"productName":"Product A"}',
        companyId: 5,
        visibility: 'private',
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);
      mockPrisma.entityRecord.create.mockResolvedValue(mockCreatedRecord);

      const result = await recordService.createRecord(1, { productName: 'Product A' }, 5);

      expect(result).toEqual({
        ...mockCreatedRecord,
        data: { productName: 'Product A' },
      });
      expect(mockPrisma.entityRecord.create).toHaveBeenCalled();
    });

    test('should throw error if validation fails', async () => {
      const mockEntity = {
        id: 1,
        name: 'Product',
      };

      const mockFields = [
        { name: 'productName', type: 'text', required: true, label: 'Product Name' },
      ];

      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);

      await expect(
        recordService.createRecord(1, {}, 5)
      ).rejects.toThrow('Record validation failed');
    });

    test('should include validation errors in error object', async () => {
      const mockEntity = {
        id: 1,
        name: 'Product',
      };

      const mockFields = [
        { name: 'productName', type: 'text', required: true, label: 'Product Name' },
        { name: 'email', type: 'email', required: true, label: 'Email' },
      ];

      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);

      try {
        await recordService.createRecord(1, { productName: 'A' }, 5);
        fail('Should have thrown error');
      } catch (err) {
        expect(err.message).toContain('Record validation failed');
        expect(err.errors).toBeDefined();
        expect(err.errors.email).toBeDefined();
      }
    });
  });

  describe('getRecord', () => {
    test('should get record with company scoping', async () => {
      const mockRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A"}',
        companyId: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockRecord);

      const result = await recordService.getRecord(1, 5);

      expect(result).toEqual({
        ...mockRecord,
        data: { name: 'Product A' },
      });
      // Verify scopeQuery was called with id=1 and companyId=5
      expect(mockAccessControl.scopeQuery).toHaveBeenCalled();
      const callArgs = mockAccessControl.scopeQuery.mock.calls[0];
      expect(callArgs[0].where.id).toBe(1);
      expect(callArgs[1]).toBe(5);
    });

    test('should throw error if record not found', async () => {
      mockPrisma.entityRecord.findFirst.mockResolvedValue(null);

      await expect(recordService.getRecord(999, 5)).rejects.toThrow('Record not found or access denied');
    });

    test('should throw error if company mismatch', async () => {
      mockPrisma.entityRecord.findFirst.mockResolvedValue(null);

      await expect(recordService.getRecord(1, 999)).rejects.toThrow('Record not found or access denied');
    });
  });

  describe('listRecords', () => {
    test('should list records with pagination', async () => {
      const mockRecords = [
        {
          id: 1,
          entityId: 1,
          data: '{"name":"Product A"}',
          createdAt: new Date(),
        },
        {
          id: 2,
          entityId: 1,
          data: '{"name":"Product B"}',
          createdAt: new Date(),
        },
      ];

      mockPrisma.entityRecord.findMany.mockResolvedValue(mockRecords);
      mockPrisma.entityRecord.count.mockResolvedValue(25);

      const result = await recordService.listRecords(1, 5, { page: 1, limit: 20 });

      expect(result.records.length).toBe(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(true);
    });

    test('should calculate skip correctly for page 2', async () => {
      mockPrisma.entityRecord.findMany.mockResolvedValue([]);
      mockPrisma.entityRecord.count.mockResolvedValue(50);

      await recordService.listRecords(1, 5, { page: 2, limit: 20 });

      const callArgs = mockPrisma.entityRecord.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBe(20);
    });

    test('should parse record data', async () => {
      const mockRecords = [
        {
          id: 1,
          entityId: 1,
          data: '{"name":"Product A","price":99.99}',
        },
      ];

      mockPrisma.entityRecord.findMany.mockResolvedValue(mockRecords);
      mockPrisma.entityRecord.count.mockResolvedValue(1);

      const result = await recordService.listRecords(1, 5);

      expect(result.records[0].data).toEqual({ name: 'Product A', price: 99.99 });
    });

    test('should respect limit option', async () => {
      mockPrisma.entityRecord.findMany.mockResolvedValue([]);
      mockPrisma.entityRecord.count.mockResolvedValue(100);

      await recordService.listRecords(1, 5, { page: 1, limit: 50 });

      const callArgs = mockPrisma.entityRecord.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(50);
    });

    test('should apply default limit of 20', async () => {
      mockPrisma.entityRecord.findMany.mockResolvedValue([]);
      mockPrisma.entityRecord.count.mockResolvedValue(100);

      await recordService.listRecords(1, 5, {});

      const callArgs = mockPrisma.entityRecord.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(20);
    });

    test('should apply custom sort option', async () => {
      mockPrisma.entityRecord.findMany.mockResolvedValue([]);
      mockPrisma.entityRecord.count.mockResolvedValue(0);

      const sort = { updatedAt: 'asc' };
      await recordService.listRecords(1, 5, { sort });

      const callArgs = mockPrisma.entityRecord.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual(sort);
    });

    test('should set hasMore correctly', async () => {
      mockPrisma.entityRecord.findMany.mockResolvedValue([]);
      mockPrisma.entityRecord.count.mockResolvedValue(30);

      const result = await recordService.listRecords(1, 5, { page: 2, limit: 20 });

      expect(result.hasMore).toBe(false);
    });
  });

  describe('updateRecord', () => {
    test('should update record with valid data', async () => {
      const mockExistingRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A","price":99.99}',
        companyId: 5,
      };

      const mockEntity = {
        id: 1,
        name: 'Product',
      };

      const mockFields = [
        { name: 'name', type: 'text', required: true, label: 'Name' },
        { name: 'price', type: 'number', required: false, label: 'Price' },
      ];

      const mockUpdatedRecord = {
        ...mockExistingRecord,
        data: '{"name":"Product A","price":149.99}',
        updatedAt: new Date(),
      };

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockExistingRecord);
      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);
      mockPrisma.entityRecord.update.mockResolvedValue(mockUpdatedRecord);

      const result = await recordService.updateRecord(1, { price: 149.99 }, 5);

      expect(result.data).toEqual({ name: 'Product A', price: 149.99 });
      expect(mockPrisma.entityRecord.update).toHaveBeenCalled();
    });

    test('should merge existing data with new data', async () => {
      const mockExistingRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A","price":99.99}',
        companyId: 5,
      };

      const mockEntity = { id: 1, name: 'Product' };
      const mockFields = [
        { name: 'name', type: 'text', required: true, label: 'Name' },
        { name: 'price', type: 'number', required: false, label: 'Price' },
      ];

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockExistingRecord);
      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);
      mockPrisma.entityRecord.update.mockResolvedValue({
        ...mockExistingRecord,
        data: '{"name":"Product A","price":149.99}',
      });

      await recordService.updateRecord(1, { price: 149.99 }, 5);

      const callArgs = mockPrisma.entityRecord.update.mock.calls[0];
      const updateData = JSON.parse(callArgs[0].data.data);
      expect(updateData.name).toBe('Product A');
      expect(updateData.price).toBe(149.99);
    });

    test('should throw error if validation fails', async () => {
      const mockExistingRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A","email":"valid@example.com"}',
        companyId: 5,
      };

      const mockEntity = { id: 1, name: 'Product' };
      const mockFields = [
        { name: 'name', type: 'text', required: true, label: 'Name' },
        { name: 'email', type: 'email', required: true, label: 'Email' },
      ];

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockExistingRecord);
      mockPrisma.entity.findUnique.mockResolvedValue(mockEntity);
      mockPrisma.entityField.findMany.mockResolvedValue(mockFields);

      await expect(
        recordService.updateRecord(1, { email: 'invalid-email' }, 5)
      ).rejects.toThrow('Record validation failed');
    });

    test('should throw error if record not found', async () => {
      mockPrisma.entityRecord.findFirst.mockResolvedValue(null);

      await expect(recordService.updateRecord(999, { name: 'Updated' }, 5)).rejects.toThrow();
    });
  });

  describe('deleteRecord', () => {
    test('should soft delete record by default', async () => {
      const mockExistingRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A"}',
        companyId: 5,
      };

      const mockDeletedRecord = {
        ...mockExistingRecord,
        deletedAt: new Date(),
      };

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockExistingRecord);
      mockPrisma.entityRecord.update.mockResolvedValue(mockDeletedRecord);

      const result = await recordService.deleteRecord(1, true, 5);

      expect(result.deletedAt).toBeDefined();
      expect(mockPrisma.entityRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    test('should hard delete record when softDelete is false', async () => {
      const mockExistingRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A"}',
        companyId: 5,
      };

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockExistingRecord);
      mockPrisma.entityRecord.delete.mockResolvedValue(mockExistingRecord);

      const result = await recordService.deleteRecord(1, false, 5);

      expect(mockPrisma.entityRecord.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBeDefined();
    });

    test('should throw error if record not found', async () => {
      mockPrisma.entityRecord.findFirst.mockResolvedValue(null);

      await expect(recordService.deleteRecord(999, true, 5)).rejects.toThrow();
    });
  });

  describe('restoreRecord', () => {
    test('should restore soft-deleted record', async () => {
      const mockDeletedRecord = {
        id: 1,
        entityId: 1,
        data: '{"name":"Product A"}',
        deletedAt: new Date(),
        companyId: 5,
      };

      const mockRestoredRecord = {
        ...mockDeletedRecord,
        deletedAt: null,
      };

      mockPrisma.entityRecord.findFirst.mockResolvedValue(mockDeletedRecord);
      mockPrisma.entityRecord.update.mockResolvedValue(mockRestoredRecord);

      const result = await recordService.restoreRecord(1, 5);

      expect(result.deletedAt).toBeNull();
      expect(mockPrisma.entityRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { deletedAt: null },
        })
      );
    });

    test('should throw error if record not found', async () => {
      mockPrisma.entityRecord.findFirst.mockResolvedValue(null);

      await expect(recordService.restoreRecord(999, 5)).rejects.toThrow('Record not found or access denied');
    });

    test('should throw error on company mismatch', async () => {
      mockPrisma.entityRecord.findFirst.mockResolvedValue(null);

      await expect(recordService.restoreRecord(1, 999)).rejects.toThrow('Record not found or access denied');
    });
  });
});
