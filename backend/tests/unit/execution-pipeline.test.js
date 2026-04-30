/**
 * @fileoverview Unit tests for ExecutionPipeline
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExecutionPipeline } from '../../src/core/runtime/execution-pipeline.js';

/**
 * Test suite for the 7-step execution pipeline orchestrator
 */
describe('ExecutionPipeline', () => {
  let pipeline;
  let mockEventBus;
  let mockPermissionEngine;
  let mockHookExecutor;
  let mockDataStore;

  const createMockEventBus = () => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn().mockResolvedValue(undefined),
  });

  const createMockContext = () => ({
    userId: 'user-123',
    role: 'editor',
    permissions: ['ticket:create', 'ticket:update', 'ticket:delete'],
    requestId: 'req-456',
    domain: 'default',
    timestamp: new Date().toISOString(),
    correlationId: 'corr-789',
  });

  const createMockEntity = () => ({
    name: 'ticket',
    displayName: 'Ticket',
    tableName: 'tickets',
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        readonly: true,
        entityName: 'ticket',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        readonly: false,
        entityName: 'ticket',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        readonly: false,
        entityName: 'ticket',
      },
    ],
    permissions: ['ticket:read', 'ticket:create', 'ticket:update', 'ticket:delete'],
  });

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    pipeline = new ExecutionPipeline(mockEventBus);

    // Setup default mock implementations
    mockPermissionEngine = {
      check: jest.fn().mockResolvedValue({ allowed: true, reason: 'Allowed', denialReasons: [] }),
    };

    mockHookExecutor = {
      execute: jest.fn(),
    };

    mockDataStore = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    pipeline.injectDependencies({
      permissionEngine: mockPermissionEngine,
      hookExecutor: mockHookExecutor,
      dataStore: mockDataStore,
    });
  });

  describe('Step 1: Permission Check', () => {
    it('should reject operation if permission check fails', async () => {
      mockPermissionEngine.check.mockResolvedValue({
        allowed: false,
        reason: 'Permission denied',
        denialReasons: ['ticket:create not granted'],
      });

      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('PERMISSION_DENIED');
    });

    it('should auto-approve for admin role', async () => {
      const context = createMockContext();
      context.role = 'admin';
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue({
        id: 'tick-001',
        title: 'New Ticket',
        status: 'open',
      });

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(true);
      expect(mockPermissionEngine.check).not.toHaveBeenCalled();
    });

    it('should check permission for non-admin roles', async () => {
      const context = createMockContext();
      context.role = 'editor';
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue({
        id: 'tick-001',
        title: 'New Ticket',
        status: 'open',
      });

      await pipeline.execute('create', entity, data, context);

      expect(mockPermissionEngine.check).toHaveBeenCalledWith('ticket:create', context);
    });
  });

  describe('Step 2: Before-Hooks', () => {
    it('should execute before-hooks and use their output', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      entity.hooks = {
        beforeCreate: jest.fn().mockResolvedValue({
          title: 'Modified Ticket',
          status: 'open',
          createdBy: 'user-123',
        }),
      };

      const data = { title: 'New Ticket', status: 'open' };
      const modifiedData = { title: 'Modified Ticket', status: 'open', createdBy: 'user-123' };

      mockDataStore.create.mockResolvedValue({
        id: 'tick-001',
        ...modifiedData,
      });

      await pipeline.execute('create', entity, data, context);

      expect(entity.hooks.beforeCreate).toHaveBeenCalledWith(context, data);
      expect(mockDataStore.create).toHaveBeenCalledWith(entity, modifiedData);
    });

    it('should reject operation if before-hook throws', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      entity.hooks = {
        beforeCreate: jest.fn().mockRejectedValue(new Error('Validation failed')),
      };

      const data = { title: 'New Ticket', status: 'open' };

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Validation failed');
    });
  });

  describe('Step 3: Mutation', () => {
    it('should execute create mutation with transformed data', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      const result = await pipeline.execute('create', entity, data, context);

      expect(mockDataStore.create).toHaveBeenCalledWith(entity, data);
      expect(result.recordId).toBe('tick-001');
    });

    it('should execute update mutation with recordId and data', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const recordId = 'tick-001';
      const data = { title: 'Updated Title', status: 'in-progress' };
      const previousData = { title: 'Old Title', status: 'open' };
      const updatedRecord = { id: recordId, ...data };

      mockDataStore.update.mockResolvedValue(updatedRecord);

      const result = await pipeline.executeUpdate(recordId, entity, data, previousData, context);

      expect(mockDataStore.update).toHaveBeenCalledWith(entity, recordId, data);
      expect(result.recordId).toBe(recordId);
    });

    it('should execute delete mutation with recordId', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const recordId = 'tick-001';

      mockDataStore.delete.mockResolvedValue({ id: recordId });

      const result = await pipeline.execute('delete', entity, {}, context, recordId);

      expect(mockDataStore.delete).toHaveBeenCalledWith(entity, recordId);
      expect(result.recordId).toBe(recordId);
    });

    it('should return error result if mutation fails', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const dbError = new Error('Database constraint violation');

      mockDataStore.create.mockRejectedValue(dbError);

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toContain('Database constraint violation');
    });
  });

  describe('Step 4: After-Hooks', () => {
    it('should execute after-hooks after successful create', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      entity.hooks = {
        afterCreate: jest.fn().mockResolvedValue(undefined),
      };

      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      await pipeline.execute('create', entity, data, context);

      expect(entity.hooks.afterCreate).toHaveBeenCalledWith(context, createdRecord);
    });

    it('should not fail operation if after-hook fails', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      entity.hooks = {
        afterCreate: jest.fn().mockRejectedValue(new Error('Post-create notification failed')),
      };

      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(true);
      expect(entity.hooks.afterCreate).toHaveBeenCalled();
    });

    it('should execute after-hooks for update operations', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const recordId = 'tick-001';
      const data = { title: 'Updated Title', status: 'in-progress' };
      const previousData = { title: 'Old Title', status: 'open' };
      const updatedRecord = { id: recordId, ...data };

      entity.hooks = {
        afterUpdate: jest.fn().mockResolvedValue(undefined),
      };

      mockDataStore.update.mockResolvedValue(updatedRecord);

      await pipeline.executeUpdate(recordId, entity, data, previousData, context);

      expect(entity.hooks.afterUpdate).toHaveBeenCalledWith(context, updatedRecord, previousData);
    });
  });

  describe('Step 5: Event Emission', () => {
    it('should emit entity:created event after successful create', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      await pipeline.execute('create', entity, data, context);

      expect(mockEventBus.emit).toHaveBeenCalled();
      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.type).toBe('entity:created');
      expect(emittedEvent.entityName).toBe('ticket');
      expect(emittedEvent.action).toBe('create');
      expect(emittedEvent.recordId).toBe('tick-001');
    });

    it('should emit entity:updated event after successful update', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const recordId = 'tick-001';
      const data = { title: 'Updated Title', status: 'in-progress' };
      const previousData = { title: 'Old Title', status: 'open' };
      const updatedRecord = { id: recordId, ...data };

      mockDataStore.update.mockResolvedValue(updatedRecord);

      await pipeline.executeUpdate(recordId, entity, data, previousData, context);

      expect(mockEventBus.emit).toHaveBeenCalled();
      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.type).toBe('entity:updated');
      expect(emittedEvent.action).toBe('update');
      expect(emittedEvent.previousData).toEqual(previousData);
    });

    it('should emit entity:deleted event after successful delete', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const recordId = 'tick-001';

      mockDataStore.delete.mockResolvedValue({ id: recordId });

      await pipeline.execute('delete', entity, {}, context, recordId);

      expect(mockEventBus.emit).toHaveBeenCalled();
      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.type).toBe('entity:deleted');
      expect(emittedEvent.action).toBe('delete');
    });

    it('should include context in emitted events', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      await pipeline.execute('create', entity, data, context);

      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.context).toEqual(context);
    });

    it('should include correlationId in emitted events', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      await pipeline.execute('create', entity, data, context);

      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.correlationId).toBeDefined();
    });
  });

  describe('Step 6 & 7: Result Return', () => {
    it('should track execution time', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      const startTime = Date.now();
      const result = await pipeline.execute('create', entity, data, context);
      const endTime = Date.now();

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(endTime - startTime + 100);
    });

    it('should return success result with recordId and data', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(true);
      expect(result.recordId).toBe('tick-001');
      expect(result.data).toEqual(createdRecord);
      expect(result.error).toBeUndefined();
    });

    it('should return error result with proper error structure', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const error = new Error('Database constraint');

      mockDataStore.create.mockRejectedValue(error);

      const result = await pipeline.execute('create', entity, data, context);

      expect(result.success).toBe(false);
      expect(result.recordId).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Complete Pipeline Flow', () => {
    it('should execute create operation through 7-step pipeline', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      entity.hooks = {
        beforeCreate: jest.fn().mockResolvedValue({ title: 'New Ticket', status: 'open' }),
        afterCreate: jest.fn().mockResolvedValue(undefined),
      };

      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      const result = await pipeline.execute('create', entity, data, context);

      // Verify all steps were executed
      expect(mockPermissionEngine.check).toHaveBeenCalled(); // Step 1
      expect(entity.hooks.beforeCreate).toHaveBeenCalled(); // Step 2
      expect(mockDataStore.create).toHaveBeenCalled(); // Step 3
      expect(entity.hooks.afterCreate).toHaveBeenCalled(); // Step 4
      expect(mockEventBus.emit).toHaveBeenCalled(); // Step 5
      expect(result.success).toBe(true); // Step 6 & 7
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle update operations with previous data', async () => {
      const context = createMockContext();
      const entity = createMockEntity();
      const recordId = 'tick-001';
      const data = { title: 'Updated Title', status: 'in-progress' };
      const previousData = { title: 'Old Title', status: 'open', id: recordId };
      const updatedRecord = { id: recordId, ...data };

      entity.hooks = {
        beforeUpdate: jest.fn().mockResolvedValue(data),
        afterUpdate: jest.fn().mockResolvedValue(undefined),
      };

      mockDataStore.update.mockResolvedValue(updatedRecord);

      const result = await pipeline.executeUpdate(recordId, entity, data, previousData, context);

      expect(entity.hooks.beforeUpdate).toHaveBeenCalledWith(context, data, previousData);
      expect(result.success).toBe(true);

      const emittedEvent = mockEventBus.emit.mock.calls[0][0];
      expect(emittedEvent.previousData).toEqual(previousData);
    });
  });

  describe('Dependency Injection', () => {
    it('should allow partial dependency injection', async () => {
      const pipeline2 = new ExecutionPipeline(mockEventBus);
      pipeline2.injectDependencies({
        permissionEngine: mockPermissionEngine,
        dataStore: mockDataStore,
      });

      const context = createMockContext();
      const entity = createMockEntity();
      const data = { title: 'New Ticket', status: 'open' };
      const createdRecord = { id: 'tick-001', title: 'New Ticket', status: 'open' };

      mockDataStore.create.mockResolvedValue(createdRecord);

      const result = await pipeline2.execute('create', entity, data, context);

      expect(result.success).toBe(true);
    });
  });
});
