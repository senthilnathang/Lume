/**
 * EventBus Test Suite
 * Tests pub/sub communication and event handling with pattern matching
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EventBus } from '../../src/core/runtime/event-bus.js';

describe('EventBus', () => {
  let eventBus;
  let mockEvent;

  beforeEach(() => {
    eventBus = new EventBus();
    mockEvent = {
      id: 'event-1',
      type: 'entity.created',
      entityName: 'User',
      action: 'create',
      recordId: '123',
      data: { name: 'John' },
      previousData: null,
      context: {
        userId: 'user-1',
        role: 'admin',
        permissions: ['read', 'write'],
        requestId: 'req-1',
        domain: 'default',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  });

  describe('subscription and emission', () => {
    it('should subscribe to events and emit them', async () => {
      const handler = jest.fn();
      eventBus.on('entity.created', handler);

      await eventBus.emit(mockEvent);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle multiple subscribers to same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('entity.created', handler1);
      eventBus.on('entity.created', handler2);

      await eventBus.emit(mockEvent);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not trigger handlers for unsubscribed events', async () => {
      const handler = jest.fn();
      eventBus.on('entity.updated', handler);

      await eventBus.emit(mockEvent);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('unsubscription', () => {
    it('should unsubscribe from events', async () => {
      const handler = jest.fn();
      eventBus.on('entity.created', handler);
      eventBus.off('entity.created', handler);

      await eventBus.emit(mockEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specified handler', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('entity.created', handler1);
      eventBus.on('entity.created', handler2);
      eventBus.off('entity.created', handler1);

      await eventBus.emit(mockEvent);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('async handler execution', () => {
    it('should handle async handlers', async () => {
      const handler = jest.fn(async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(), 10);
        });
      });

      eventBus.on('entity.created', handler);

      await eventBus.emit(mockEvent);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should await all handlers in parallel', async () => {
      const execution = [];

      const handler1 = jest.fn(async () => {
        execution.push(1);
        await new Promise((resolve) => setTimeout(() => resolve(), 20));
        execution.push(3);
      });

      const handler2 = jest.fn(async () => {
        execution.push(2);
        await new Promise((resolve) => setTimeout(() => resolve(), 10));
        execution.push(4);
      });

      eventBus.on('entity.created', handler1);
      eventBus.on('entity.created', handler2);

      await eventBus.emit(mockEvent);

      // Both should start before either completes (parallel execution)
      expect(execution[0]).toBeLessThan(execution[1]);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle synchronous handlers', async () => {
      const handler = jest.fn(() => {
        // synchronous handler
      });

      eventBus.on('entity.created', handler);

      await eventBus.emit(mockEvent);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in handlers gracefully', async () => {
      const error = new Error('Handler error');
      const handler = jest.fn(async () => {
        throw error;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('entity.created', handler);

      await expect(eventBus.emit(mockEvent)).rejects.toThrow();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should continue executing other handlers if one throws', async () => {
      const handler1 = jest.fn(async () => {
        throw new Error('Handler 1 error');
      });

      const handler2 = jest.fn(async () => {
        // This should still execute
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('entity.created', handler1);
      eventBus.on('entity.created', handler2);

      await expect(eventBus.emit(mockEvent)).rejects.toThrow();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });

    it('should re-throw the first error encountered', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const handler1 = jest.fn(async () => {
        throw error1;
      });

      const handler2 = jest.fn(async () => {
        throw error2;
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('entity.created', handler1);
      eventBus.on('entity.created', handler2);

      let caughtError;
      try {
        await eventBus.emit(mockEvent);
      } catch (e) {
        caughtError = e;
      }

      expect([error1, error2]).toContain(caughtError);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('pattern matching', () => {
    it('should support wildcard pattern matching with *', async () => {
      const handler = jest.fn();
      eventBus.on('entity:*', handler);

      await eventBus.emit({ ...mockEvent, type: 'entity:created' });
      await eventBus.emit({ ...mockEvent, type: 'entity:updated' });
      await eventBus.emit({ ...mockEvent, type: 'entity:deleted' });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should not match non-matching patterns', async () => {
      const handler = jest.fn();
      eventBus.on('entity:*', handler);

      await eventBus.emit({ ...mockEvent, type: 'workflow:triggered' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple pattern levels', async () => {
      const handler = jest.fn();
      eventBus.on('entity.user.*', handler);

      await eventBus.emit({ ...mockEvent, type: 'entity.user.created' });
      await eventBus.emit({ ...mockEvent, type: 'entity.user.updated' });
      await eventBus.emit({ ...mockEvent, type: 'entity.user.deleted' });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should handle both specific and pattern listeners for same event', async () => {
      const specificHandler = jest.fn();
      const patternHandler = jest.fn();

      eventBus.on('entity.created', specificHandler);
      eventBus.on('entity:*', patternHandler);

      await eventBus.emit({ ...mockEvent, type: 'entity.created' });

      expect(specificHandler).toHaveBeenCalledTimes(1);
      expect(patternHandler).not.toHaveBeenCalled(); // Different type format
    });

    it('should match patterns with different separators', async () => {
      const dotPatternHandler = jest.fn();
      const colonPatternHandler = jest.fn();

      eventBus.on('entity.*', dotPatternHandler);
      eventBus.on('workflow:*', colonPatternHandler);

      await eventBus.emit({ ...mockEvent, type: 'entity.created' });
      await eventBus.emit({ ...mockEvent, type: 'workflow:triggered' });

      expect(dotPatternHandler).toHaveBeenCalledTimes(1);
      expect(colonPatternHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('no handler duplication', () => {
    it('should not register the same handler twice', async () => {
      const handler = jest.fn();

      eventBus.on('entity.created', handler);
      eventBus.on('entity.created', handler);

      await eventBus.emit(mockEvent);

      // Handler should only be called once, not twice
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow different handler functions for the same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('entity.created', handler1);
      eventBus.on('entity.created', handler2);

      await eventBus.emit(mockEvent);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty event type', async () => {
      const handler = jest.fn();
      eventBus.on('', handler);

      await eventBus.emit({ ...mockEvent, type: '' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle events with special characters in type', async () => {
      const handler = jest.fn();
      eventBus.on('entity.user:profile-update', handler);

      await eventBus.emit({ ...mockEvent, type: 'entity.user:profile-update' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call removed handler even with pattern subscription', async () => {
      const handler = jest.fn();

      eventBus.on('entity.*', handler);
      eventBus.off('entity.*', handler);

      await eventBus.emit({ ...mockEvent, type: 'entity.created' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple emit calls', async () => {
      const handler = jest.fn();
      eventBus.on('entity.created', handler);

      await eventBus.emit(mockEvent);
      await eventBus.emit(mockEvent);
      await eventBus.emit(mockEvent);

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });
});
