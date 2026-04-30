/**
 * @fileoverview Unit tests for WorkflowStateMachine
 * Tests state transitions, terminal states, cancellation, and valid transitions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { WorkflowStateMachine } from '../../src/core/workflows/state-machine.js';

describe('WorkflowStateMachine', () => {
  let stateMachine;

  beforeEach(() => {
    stateMachine = new WorkflowStateMachine();
  });

  // ============================================================================
  // TRANSITION TESTS
  // ============================================================================

  describe('State Transitions', () => {
    it('should transition from pending to running with start action', () => {
      const newState = stateMachine.transition('pending', 'start');
      expect(newState).toBe('running');
    });

    it('should transition from running to success with complete action', () => {
      const newState = stateMachine.transition('running', 'complete');
      expect(newState).toBe('success');
    });

    it('should transition from running to failed with fail action', () => {
      const newState = stateMachine.transition('running', 'fail');
      expect(newState).toBe('failed');
    });

    it('should transition from running to paused with pause action', () => {
      const newState = stateMachine.transition('running', 'pause');
      expect(newState).toBe('paused');
    });

    it('should transition from paused to running with resume action', () => {
      const newState = stateMachine.transition('paused', 'resume');
      expect(newState).toBe('running');
    });

    it('should throw error for invalid transitions', () => {
      expect(() => {
        stateMachine.transition('success', 'start');
      }).toThrow();

      expect(() => {
        stateMachine.transition('pending', 'complete');
      }).toThrow();

      expect(() => {
        stateMachine.transition('failed', 'resume');
      }).toThrow();
    });
  });

  // ============================================================================
  // CANCEL FUNCTIONALITY TESTS
  // ============================================================================

  describe('Cancel Functionality', () => {
    it('should allow cancelling from running state', () => {
      const newState = stateMachine.transition('running', 'cancel');
      expect(newState).toBe('cancelled');
    });

    it('should allow cancelling from paused state', () => {
      const newState = stateMachine.transition('paused', 'cancel');
      expect(newState).toBe('cancelled');
    });

    it('should return true for canCancel on running state', () => {
      expect(stateMachine.canCancel('running')).toBe(true);
    });

    it('should return true for canCancel on paused state', () => {
      expect(stateMachine.canCancel('paused')).toBe(true);
    });

    it('should return false for canCancel on terminal states', () => {
      expect(stateMachine.canCancel('success')).toBe(false);
      expect(stateMachine.canCancel('failed')).toBe(false);
      expect(stateMachine.canCancel('cancelled')).toBe(false);
    });

    it('should return false for canCancel on pending state', () => {
      expect(stateMachine.canCancel('pending')).toBe(false);
    });
  });

  // ============================================================================
  // TERMINAL STATE TESTS
  // ============================================================================

  describe('Terminal States', () => {
    it('should identify success as terminal state', () => {
      expect(stateMachine.isTerminal('success')).toBe(true);
    });

    it('should identify failed as terminal state', () => {
      expect(stateMachine.isTerminal('failed')).toBe(true);
    });

    it('should identify cancelled as terminal state', () => {
      expect(stateMachine.isTerminal('cancelled')).toBe(true);
    });

    it('should identify pending as non-terminal state', () => {
      expect(stateMachine.isTerminal('pending')).toBe(false);
    });

    it('should identify running as non-terminal state', () => {
      expect(stateMachine.isTerminal('running')).toBe(false);
    });

    it('should identify paused as non-terminal state', () => {
      expect(stateMachine.isTerminal('paused')).toBe(false);
    });
  });

  // ============================================================================
  // VALID TRANSITIONS TESTS
  // ============================================================================

  describe('Valid Transitions', () => {
    it('should return valid transitions from pending state', () => {
      const transitions = stateMachine.getValidTransitions('pending');
      expect(transitions).toContain('start');
      expect(transitions.length).toBe(1);
    });

    it('should return valid transitions from running state', () => {
      const transitions = stateMachine.getValidTransitions('running');
      expect(transitions).toContain('complete');
      expect(transitions).toContain('fail');
      expect(transitions).toContain('pause');
      expect(transitions).toContain('cancel');
      expect(transitions.length).toBe(4);
    });

    it('should return valid transitions from paused state', () => {
      const transitions = stateMachine.getValidTransitions('paused');
      expect(transitions).toContain('resume');
      expect(transitions).toContain('cancel');
      expect(transitions.length).toBe(2);
    });

    it('should return empty array for terminal states', () => {
      expect(stateMachine.getValidTransitions('success')).toEqual([]);
      expect(stateMachine.getValidTransitions('failed')).toEqual([]);
      expect(stateMachine.getValidTransitions('cancelled')).toEqual([]);
    });
  });

  // ============================================================================
  // EDGE CASES AND COMPREHENSIVE SCENARIOS
  // ============================================================================

  describe('Edge Cases and Scenarios', () => {
    it('should handle multiple cancel transitions correctly', () => {
      // Start a workflow
      let state = 'pending';
      state = stateMachine.transition(state, 'start');
      expect(state).toBe('running');

      // Cancel from running
      state = stateMachine.transition(state, 'cancel');
      expect(state).toBe('cancelled');

      // Terminal state - no transitions allowed
      expect(() => {
        stateMachine.transition(state, 'start');
      }).toThrow();
    });

    it('should handle pause and resume cycle', () => {
      let state = 'pending';
      state = stateMachine.transition(state, 'start');
      expect(state).toBe('running');

      state = stateMachine.transition(state, 'pause');
      expect(state).toBe('paused');

      state = stateMachine.transition(state, 'resume');
      expect(state).toBe('running');

      state = stateMachine.transition(state, 'complete');
      expect(state).toBe('success');
    });

    it('should allow transition to failure from running', () => {
      let state = 'pending';
      state = stateMachine.transition(state, 'start');
      state = stateMachine.transition(state, 'fail');
      expect(state).toBe('failed');
      expect(stateMachine.isTerminal(state)).toBe(true);
    });

    it('should throw error with descriptive message for invalid transitions', () => {
      expect(() => {
        stateMachine.transition('success', 'start');
      }).toThrow(/Invalid transition/);
    });
  });
});
