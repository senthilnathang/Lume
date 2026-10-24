/**
 * AutoTransitionProcessor Unit Tests
 * Tests processor initialization, scheduling, error handling, and execution
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AutoTransitionProcessor } from '../../src/modules/base_automation/services/auto-transition-processor.js';

describe('AutoTransitionProcessor', () => {
  let processor;
  let mockAutomationService;

  beforeEach(() => {
    jest.useFakeTimers();

    mockAutomationService = {
      getPendingAutoTransitions: jest.fn(),
      executeAutoTransition: jest.fn()
    };

    processor = new AutoTransitionProcessor(mockAutomationService);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (processor.processingInterval) {
      processor.stopProcessor();
    }
  });

  describe('startProcessor', () => {
    it('should start the processor with default interval (60 seconds)', () => {
      processor.startProcessor();

      expect(processor.processingInterval).not.toBeNull();
    });

    it('should start the processor with custom interval', () => {
      processor.startProcessor(30);

      expect(processor.processingInterval).not.toBeNull();
    });

    it('should not start if already running', () => {
      processor.startProcessor(30);
      const firstInterval = processor.processingInterval;

      processor.startProcessor(30);
      const secondInterval = processor.processingInterval;

      expect(firstInterval).toBe(secondInterval);
    });

    it('should call processPending at interval', async () => {
      mockAutomationService.getPendingAutoTransitions.mockResolvedValue([]);

      processor.startProcessor(10);

      // Advance by one interval
      jest.advanceTimersByTime(10 * 1000);
      await Promise.resolve(); // Allow async to settle

      expect(mockAutomationService.getPendingAutoTransitions).toHaveBeenCalled();
    });
  });

  describe('stopProcessor', () => {
    it('should stop the processor', () => {
      processor.startProcessor(30);
      expect(processor.processingInterval).not.toBeNull();

      processor.stopProcessor();
      expect(processor.processingInterval).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      processor.startProcessor(30);
      processor.stopProcessor();
      processor.stopProcessor(); // Should not throw

      expect(processor.processingInterval).toBeNull();
    });
  });

  describe('processPending', () => {
    it('should fetch pending transitions and execute each one', async () => {
      const transitions = [
        { id: 1, fromState: 'draft', toState: 'review' },
        { id: 2, fromState: 'review', toState: 'approved' }
      ];

      mockAutomationService.getPendingAutoTransitions.mockResolvedValue(transitions);
      mockAutomationService.executeAutoTransition.mockResolvedValue({});

      await processor.processPending();

      expect(mockAutomationService.getPendingAutoTransitions).toHaveBeenCalled();
      expect(mockAutomationService.executeAutoTransition).toHaveBeenCalledWith(1);
      expect(mockAutomationService.executeAutoTransition).toHaveBeenCalledWith(2);
      expect(mockAutomationService.executeAutoTransition).toHaveBeenCalledTimes(2);
    });

    it('should handle empty pending list', async () => {
      mockAutomationService.getPendingAutoTransitions.mockResolvedValue([]);

      await processor.processPending();

      expect(mockAutomationService.executeAutoTransition).not.toHaveBeenCalled();
    });

    it('should catch and continue on individual transition failures', async () => {
      const transitions = [
        { id: 1, fromState: 'draft', toState: 'review' },
        { id: 2, fromState: 'review', toState: 'approved' },
        { id: 3, fromState: 'approved', toState: 'completed' }
      ];

      mockAutomationService.getPendingAutoTransitions.mockResolvedValue(transitions);
      mockAutomationService.executeAutoTransition
        .mockResolvedValueOnce({}) // id: 1 succeeds
        .mockRejectedValueOnce(new Error('State mismatch')) // id: 2 fails
        .mockResolvedValueOnce({}); // id: 3 succeeds despite id: 2 failing

      // Should not throw
      await processor.processPending();

      expect(mockAutomationService.executeAutoTransition).toHaveBeenCalledTimes(3);
    });

    it('should handle fetch error gracefully', async () => {
      mockAutomationService.getPendingAutoTransitions.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw
      await processor.processPending();

      expect(mockAutomationService.executeAutoTransition).not.toHaveBeenCalled();
    });
  });

  describe('processOne', () => {
    it('should delegate to executeAutoTransition', async () => {
      mockAutomationService.executeAutoTransition.mockResolvedValue({});

      const result = await processor.processOne(123);

      expect(mockAutomationService.executeAutoTransition).toHaveBeenCalledWith(123);
      expect(result).toBeDefined();
    });

    it('should propagate errors from executeAutoTransition', async () => {
      mockAutomationService.executeAutoTransition.mockRejectedValue(
        new Error('Transition failed')
      );

      await expect(processor.processOne(123)).rejects.toThrow('Transition failed');
    });
  });
});
