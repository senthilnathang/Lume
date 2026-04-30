/**
 * HookExecutor Test Suite
 * Tests entity lifecycle hooks (before/after operations)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HookExecutor } from '../../src/core/runtime/hooks.js';

describe('HookExecutor', () => {
  let hookExecutor;
  let mockContext;
  let mockEntity;

  beforeEach(() => {
    hookExecutor = new HookExecutor();
    mockContext = {
      userId: 'user-1',
      role: 'admin',
      permissions: ['read', 'write'],
      requestId: 'req-1',
      domain: 'default',
      timestamp: new Date().toISOString(),
    };

    mockEntity = {
      name: 'User',
      displayName: 'User',
      tableName: 'users',
      fields: [
        {
          name: 'id',
          type: 'string',
          required: true,
          readonly: true,
          entityName: 'User',
        },
        {
          name: 'name',
          type: 'string',
          required: true,
          readonly: false,
          entityName: 'User',
        },
        {
          name: 'email',
          type: 'string',
          required: true,
          readonly: false,
          entityName: 'User',
        },
      ],
      permissions: ['read', 'write', 'delete'],
    };
  });

  describe('executeBeforeHook - create', () => {
    it('should execute beforeCreate hook and return transformed data', async () => {
      const beforeCreateHook = jest.fn(async (context, data) => ({
        ...data,
        createdBy: context.userId,
      }));

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const inputData = { name: 'John Doe', email: 'john@example.com' };
      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        inputData,
        mockContext
      );

      expect(beforeCreateHook).toHaveBeenCalledWith(mockContext, inputData);
      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        createdBy: 'user-1',
      });
    });

    it('should return original data if beforeCreate hook does not return anything', async () => {
      const beforeCreateHook = jest.fn(async () => undefined);

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const inputData = { name: 'John Doe', email: 'john@example.com' };
      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        inputData,
        mockContext
      );

      expect(result).toEqual(inputData);
    });

    it('should throw if beforeCreate hook throws', async () => {
      const error = new Error('Validation failed');
      const beforeCreateHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const inputData = { name: 'John Doe', email: 'john@example.com' };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        hookExecutor.executeBeforeHook('create', mockEntity, inputData, mockContext)
      ).rejects.toThrow('Validation failed');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeBeforeHook - update', () => {
    it('should execute beforeUpdate hook and return transformed data', async () => {
      const beforeUpdateHook = jest.fn(async (context, data) => ({
        ...data,
        updatedBy: context.userId,
      }));

      mockEntity.hooks = {
        beforeUpdate: beforeUpdateHook,
      };

      const inputData = { name: 'Jane Doe', email: 'jane@example.com' };
      const result = await hookExecutor.executeBeforeHook(
        'update',
        mockEntity,
        inputData,
        mockContext,
        '123'
      );

      expect(beforeUpdateHook).toHaveBeenCalledWith(mockContext, inputData);
      expect(result).toEqual({
        name: 'Jane Doe',
        email: 'jane@example.com',
        updatedBy: 'user-1',
      });
    });

    it('should return original data if beforeUpdate hook does not return anything', async () => {
      const beforeUpdateHook = jest.fn(async () => undefined);

      mockEntity.hooks = {
        beforeUpdate: beforeUpdateHook,
      };

      const inputData = { name: 'Jane Doe' };
      const result = await hookExecutor.executeBeforeHook(
        'update',
        mockEntity,
        inputData,
        mockContext,
        '123'
      );

      expect(result).toEqual(inputData);
    });

    it('should throw if beforeUpdate hook throws', async () => {
      const error = new Error('Update validation failed');
      const beforeUpdateHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        beforeUpdate: beforeUpdateHook,
      };

      const inputData = { name: 'Jane Doe' };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        hookExecutor.executeBeforeHook('update', mockEntity, inputData, mockContext, '123')
      ).rejects.toThrow('Update validation failed');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeBeforeHook - delete', () => {
    it('should execute beforeDelete hook with record', async () => {
      const beforeDeleteHook = jest.fn(async (context, record) => true);

      mockEntity.hooks = {
        beforeDelete: beforeDeleteHook,
      };

      const inputData = { id: '123', name: 'John Doe' };
      await hookExecutor.executeBeforeHook(
        'delete',
        mockEntity,
        inputData,
        mockContext,
        '123'
      );

      expect(beforeDeleteHook).toHaveBeenCalledWith(mockContext, inputData);
    });

    it('should throw if beforeDelete hook throws (blocking delete)', async () => {
      const error = new Error('Cannot delete record');
      const beforeDeleteHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        beforeDelete: beforeDeleteHook,
      };

      const inputData = {};

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        hookExecutor.executeBeforeHook('delete', mockEntity, inputData, mockContext, '123')
      ).rejects.toThrow('Cannot delete record');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeBeforeHook - missing hooks', () => {
    it('should return original data if entity has no hooks', async () => {
      const inputData = { name: 'John Doe', email: 'john@example.com' };
      mockEntity.hooks = undefined;

      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        inputData,
        mockContext
      );

      expect(result).toEqual(inputData);
    });

    it('should return original data if beforeCreate hook does not exist', async () => {
      const inputData = { name: 'John Doe', email: 'john@example.com' };
      mockEntity.hooks = {
        afterCreate: jest.fn(),
      };

      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        inputData,
        mockContext
      );

      expect(result).toEqual(inputData);
    });

    it('should return original data if beforeUpdate hook does not exist', async () => {
      const inputData = { name: 'Jane Doe' };
      mockEntity.hooks = {
        afterUpdate: jest.fn(),
      };

      const result = await hookExecutor.executeBeforeHook(
        'update',
        mockEntity,
        inputData,
        mockContext,
        '123'
      );

      expect(result).toEqual(inputData);
    });

    it('should return original data if beforeDelete hook does not exist', async () => {
      const inputData = {};
      mockEntity.hooks = {
        afterDelete: jest.fn(),
      };

      const result = await hookExecutor.executeBeforeHook(
        'delete',
        mockEntity,
        inputData,
        mockContext,
        '123'
      );

      expect(result).toEqual(inputData);
    });
  });

  describe('executeAfterHook - create', () => {
    it('should execute afterCreate hook with record', async () => {
      const afterCreateHook = jest.fn(async () => {});

      mockEntity.hooks = {
        afterCreate: afterCreateHook,
      };

      const record = { id: '123', name: 'John Doe', email: 'john@example.com' };
      await hookExecutor.executeAfterHook('create', mockEntity, record, mockContext);

      expect(afterCreateHook).toHaveBeenCalledWith(mockContext, record);
    });

    it('should not fail operation if afterCreate hook throws', async () => {
      const error = new Error('Email notification failed');
      const afterCreateHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        afterCreate: afterCreateHook,
      };

      const record = { id: '123', name: 'John Doe', email: 'john@example.com' };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      await expect(
        hookExecutor.executeAfterHook('create', mockEntity, record, mockContext)
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeAfterHook - update', () => {
    it('should execute afterUpdate hook with record', async () => {
      const afterUpdateHook = jest.fn(async () => {});

      mockEntity.hooks = {
        afterUpdate: afterUpdateHook,
      };

      const record = { id: '123', name: 'Jane Doe', email: 'jane@example.com' };
      await hookExecutor.executeAfterHook('update', mockEntity, record, mockContext);

      expect(afterUpdateHook).toHaveBeenCalledWith(mockContext, record);
    });

    it('should not fail operation if afterUpdate hook throws', async () => {
      const error = new Error('Update notification failed');
      const afterUpdateHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        afterUpdate: afterUpdateHook,
      };

      const record = { id: '123', name: 'Jane Doe', email: 'jane@example.com' };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      await expect(
        hookExecutor.executeAfterHook('update', mockEntity, record, mockContext)
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeAfterHook - delete', () => {
    it('should execute afterDelete hook with record', async () => {
      const afterDeleteHook = jest.fn(async () => {});

      mockEntity.hooks = {
        afterDelete: afterDeleteHook,
      };

      const record = { id: '123', name: 'John Doe', email: 'john@example.com' };
      await hookExecutor.executeAfterHook('delete', mockEntity, record, mockContext);

      expect(afterDeleteHook).toHaveBeenCalledWith(mockContext, record);
    });

    it('should not fail operation if afterDelete hook throws', async () => {
      const error = new Error('Delete cleanup failed');
      const afterDeleteHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        afterDelete: afterDeleteHook,
      };

      const record = { id: '123', name: 'John Doe', email: 'john@example.com' };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      await expect(
        hookExecutor.executeAfterHook('delete', mockEntity, record, mockContext)
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('executeAfterHook - missing hooks', () => {
    it('should return void if entity has no hooks', async () => {
      const record = { id: '123', name: 'John Doe' };
      mockEntity.hooks = undefined;

      const result = await hookExecutor.executeAfterHook(
        'create',
        mockEntity,
        record,
        mockContext
      );

      expect(result).toBeUndefined();
    });

    it('should return void if afterCreate hook does not exist', async () => {
      const record = { id: '123', name: 'John Doe' };
      mockEntity.hooks = {
        beforeCreate: jest.fn(),
      };

      const result = await hookExecutor.executeAfterHook(
        'create',
        mockEntity,
        record,
        mockContext
      );

      expect(result).toBeUndefined();
    });

    it('should return void if afterUpdate hook does not exist', async () => {
      const record = { id: '123', name: 'Jane Doe' };
      mockEntity.hooks = {
        beforeUpdate: jest.fn(),
      };

      const result = await hookExecutor.executeAfterHook(
        'update',
        mockEntity,
        record,
        mockContext
      );

      expect(result).toBeUndefined();
    });

    it('should return void if afterDelete hook does not exist', async () => {
      const record = { id: '123', name: 'John Doe' };
      mockEntity.hooks = {
        beforeDelete: jest.fn(),
      };

      const result = await hookExecutor.executeAfterHook(
        'delete',
        mockEntity,
        record,
        mockContext
      );

      expect(result).toBeUndefined();
    });
  });

  describe('hook error logging', () => {
    it('should log errors from beforeCreate hook', async () => {
      const error = new Error('Validation error');
      const beforeCreateHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await hookExecutor.executeBeforeHook(
          'create',
          mockEntity,
          { name: 'John' },
          mockContext
        );
      } catch (e) {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook error for User:create'),
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log errors from afterCreate hook but not throw', async () => {
      const error = new Error('Email notification failed');
      const afterCreateHook = jest.fn(async () => {
        throw error;
      });

      mockEntity.hooks = {
        afterCreate: afterCreateHook,
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await hookExecutor.executeAfterHook(
        'create',
        mockEntity,
        { id: '123', name: 'John' },
        mockContext
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook error for User:create'),
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle hooks with undefined EntityHooks object', async () => {
      mockEntity.hooks = undefined;

      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        { name: 'John' },
        mockContext
      );

      expect(result).toEqual({ name: 'John' });
    });

    it('should handle empty data object', async () => {
      const beforeCreateHook = jest.fn(async (context, data) => data);

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        {},
        mockContext
      );

      expect(result).toEqual({});
    });

    it('should handle multiple sequential hook executions', async () => {
      const beforeCreateHook = jest.fn(async (context, data) => ({
        ...data,
        createdBy: context.userId,
      }));

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const data1 = { name: 'John' };
      const data2 = { name: 'Jane' };

      const result1 = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        data1,
        mockContext
      );
      const result2 = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        data2,
        mockContext
      );

      expect(beforeCreateHook).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ name: 'John', createdBy: 'user-1' });
      expect(result2).toEqual({ name: 'Jane', createdBy: 'user-1' });
    });

    it('should handle large data objects', async () => {
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`field${i}`] = `value${i}`;
      }

      const beforeCreateHook = jest.fn(async (context, data) => ({
        ...data,
        processed: true,
      }));

      mockEntity.hooks = {
        beforeCreate: beforeCreateHook,
      };

      const result = await hookExecutor.executeBeforeHook(
        'create',
        mockEntity,
        largeData,
        mockContext
      );

      expect(result).toHaveProperty('processed', true);
      expect(Object.keys(result).length).toBe(1001);
    });
  });
});
