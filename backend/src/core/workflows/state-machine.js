/**
 * Workflow State Machine
 * Manages valid state transitions for workflow execution instances
 *
 * State flow:
 * pending -> running -> [success | failed | paused]
 * paused -> [running | cancelled]
 * running -> [cancelled]
 *
 * Terminal states (no further transitions): success, failed, cancelled
 *
 * @typedef {('start' | 'complete' | 'fail' | 'pause' | 'resume' | 'cancel')} Transition
 */

/**
 * WorkflowStateMachine manages valid state transitions for workflow executions
 * Implements a finite state machine with predefined valid transitions
 *
 * @example
 * const machine = new WorkflowStateMachine();
 * const newState = machine.transition('pending', 'start'); // Returns 'running'
 * const valid = machine.getValidTransitions('running'); // Returns ['complete', 'fail', 'pause', 'cancel']
 */
export class WorkflowStateMachine {
  /**
   * Initializes the state machine with predefined transition rules
   */
  constructor() {
    this.transitionMap = this.initializeTransitionMap();
    this.resultMap = this.initializeResultMap();
  }

  /**
   * Initialize the transition map with valid transitions from each state
   * @private
   * @returns {Map} Map of valid transitions for each state
   */
  initializeTransitionMap() {
    const map = new Map();

    // pending: can only start
    map.set('pending', new Set(['start']));

    // running: can complete, fail, pause, or cancel
    map.set('running', new Set(['complete', 'fail', 'pause', 'cancel']));

    // paused: can resume or cancel
    map.set('paused', new Set(['resume', 'cancel']));

    // success: terminal state, no transitions
    map.set('success', new Set());

    // failed: terminal state, no transitions
    map.set('failed', new Set());

    // cancelled: terminal state, no transitions
    map.set('cancelled', new Set());

    return map;
  }

  /**
   * Initialize the result map with state transition outcomes
   * @private
   * @returns {Map} Map of 'state:action' -> resulting state
   */
  initializeResultMap() {
    const map = new Map();

    // Transitions from pending
    map.set('pending:start', 'running');

    // Transitions from running
    map.set('running:complete', 'success');
    map.set('running:fail', 'failed');
    map.set('running:pause', 'paused');
    map.set('running:cancel', 'cancelled');

    // Transitions from paused
    map.set('paused:resume', 'running');
    map.set('paused:cancel', 'cancelled');

    return map;
  }

  /**
   * Perform a state transition
   *
   * Validates that the transition is allowed from the current state,
   * then returns the new state. Throws an error if the transition is invalid.
   *
   * @param {string} currentState - The current workflow status
   * @param {string} action - The transition action to perform
   * @returns {string} The resulting workflow status
   * @throws {Error} if the transition is not valid for the current state
   *
   * @example
   * const newState = machine.transition('pending', 'start');
   * // Returns 'running'
   */
  transition(currentState, action) {
    const validTransitions = this.transitionMap.get(currentState);

    if (!validTransitions || !validTransitions.has(action)) {
      throw new Error(
        `Invalid transition: cannot perform action '${action}' from state '${currentState}'. ` +
          `Valid actions are: ${Array.from(validTransitions || []).join(', ') || 'none (terminal state)'}`
      );
    }

    const key = `${currentState}:${action}`;
    const newState = this.resultMap.get(key);

    if (!newState) {
      throw new Error(
        `Internal error: no result mapped for valid transition '${key}'`
      );
    }

    return newState;
  }

  /**
   * Check if a state is terminal (no further transitions possible)
   *
   * Terminal states indicate the workflow execution has completed
   * and cannot transition to any other state.
   *
   * @param {string} state - The workflow status to check
   * @returns {boolean} true if the state is terminal, false otherwise
   *
   * @example
   * machine.isTerminal('success'); // true
   * machine.isTerminal('running'); // false
   */
  isTerminal(state) {
    const validTransitions = this.transitionMap.get(state);
    return validTransitions !== undefined && validTransitions.size === 0;
  }

  /**
   * Check if a workflow execution can be cancelled from the given state
   *
   * Only 'running' and 'paused' states can be cancelled.
   * Terminal states and pending cannot be cancelled.
   *
   * @param {string} state - The workflow status to check
   * @returns {boolean} true if the state can be cancelled, false otherwise
   *
   * @example
   * machine.canCancel('running'); // true
   * machine.canCancel('paused'); // true
   * machine.canCancel('success'); // false
   */
  canCancel(state) {
    const validTransitions = this.transitionMap.get(state);
    return validTransitions !== undefined && validTransitions.has('cancel');
  }

  /**
   * Get all valid transition actions from a given state
   *
   * Returns an array of actions that can be performed from the current state.
   * For terminal states, returns an empty array.
   *
   * @param {string} state - The workflow status to get valid transitions for
   * @returns {Array} Array of valid transition actions, or empty array for terminal states
   *
   * @example
   * machine.getValidTransitions('running');
   * // Returns ['complete', 'fail', 'pause', 'cancel']
   *
   * machine.getValidTransitions('success');
   * // Returns []
   */
  getValidTransitions(state) {
    const validTransitions = this.transitionMap.get(state);
    return validTransitions ? Array.from(validTransitions) : [];
  }
}
