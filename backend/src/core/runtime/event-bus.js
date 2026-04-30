/**
 * EventBus Implementation
 * Provides pub/sub event communication with pattern matching support
 * Implements the EventBusInterface from types.js
 */

import { EventEmitter } from 'events';

/**
 * EventBus class implementing EventBusInterface
 * Manages event subscriptions and emissions with wildcard pattern matching
 */
export class EventBus {
  /**
   * Internal event emitter for managing subscriptions
   * @type {EventEmitter}
   * @private
   */
  #emitter;

  /**
   * Map of specific event types to their handlers
   * @type {Map<string, Set<Function>>}
   * @private
   */
  #handlers;

  /**
   * Map of pattern event types to their handlers
   * @type {Map<string, Set<Function>>}
   * @private
   */
  #patternHandlers;

  /**
   * Constructor - initializes the event bus
   * Sets up the internal event emitter and handler maps
   */
  constructor() {
    this.#emitter = new EventEmitter();
    this.#emitter.setMaxListeners(100);
    this.#handlers = new Map();
    this.#patternHandlers = new Map();
  }

  /**
   * Subscribe to events of a specific type
   * Supports both specific event types and wildcard patterns
   *
   * @param {string} eventType - The type of events to listen for (e.g., 'entity.created' or 'entity.*')
   * @param {Function} handler - Callback function when matching events occur
   * @returns {void}
   * @example
   * eventBus.on('entity.created', async (event) => {
   *   console.log('Entity created:', event.recordId);
   * });
   *
   * eventBus.on('entity:*', async (event) => {
   *   console.log('Entity event:', event.type);
   * });
   */
  on(eventType, handler) {
    if (typeof eventType !== 'string' || typeof handler !== 'function') {
      return;
    }

    // Determine if this is a pattern or specific handler
    const isPattern = eventType.includes('*');
    const handlerMap = isPattern ? this.#patternHandlers : this.#handlers;

    // Initialize handler set if needed
    if (!handlerMap.has(eventType)) {
      handlerMap.set(eventType, new Set());
    }

    // Add handler (Set automatically prevents duplicates)
    handlerMap.get(eventType).add(handler);
  }

  /**
   * Unsubscribe from events of a specific type
   * Removes the specified handler from both specific and pattern listeners
   *
   * @param {string} eventType - The type of events to stop listening for
   * @param {Function} handler - The handler function to remove
   * @returns {void}
   * @example
   * eventBus.off('entity.created', myHandler);
   */
  off(eventType, handler) {
    if (typeof eventType !== 'string' || typeof handler !== 'function') {
      return;
    }

    // Check if this is a pattern
    const isPattern = eventType.includes('*');
    const handlerMap = isPattern ? this.#patternHandlers : this.#handlers;

    // Remove from the appropriate map
    if (handlerMap.has(eventType)) {
      handlerMap.get(eventType).delete(handler);

      // Clean up empty handler sets
      if (handlerMap.get(eventType).size === 0) {
        handlerMap.delete(eventType);
      }
    }
  }

  /**
   * Check if an event type matches a pattern
   *
   * @param {string} eventType - The actual event type
   * @param {string} pattern - The pattern to match against (e.g., 'entity.*' or 'entity.user.*')
   * @returns {boolean} True if the event type matches the pattern
   * @private
   * @example
   * matches('entity.created', 'entity.*') // true
   * matches('entity.user.created', 'entity.user.*') // true
   * matches('workflow.triggered', 'entity.*') // false
   */
  #matches(eventType, pattern) {
    // Escape special regex characters except * and :
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');

    // Ensure full match (not partial)
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventType);
  }

  /**
   * Emit an event to all subscribers
   * Executes all matching handlers (both specific and pattern handlers) in parallel
   * Handles errors gracefully by logging and re-throwing
   *
   * @param {Object} event - The runtime event to emit
   * @param {string} event.id - Unique event identifier
   * @param {string} event.type - Event type (e.g., 'entity.created')
   * @param {string} event.entityName - Name of the entity
   * @param {string} event.action - Action that triggered the event
   * @param {string} event.recordId - ID of the affected record
   * @param {Object} event.data - Current data after the event
   * @param {Object} event.previousData - Previous data before the event (null for create)
   * @param {Object} event.context - Execution context
   * @param {string} event.timestamp - When the event occurred
   * @returns {Promise<void>}
   * @throws {Error} If any handler throws an error, it will be re-thrown after all handlers execute
   * @example
   * await eventBus.emit({
   *   id: 'evt-1',
   *   type: 'entity.created',
   *   entityName: 'User',
   *   action: 'create',
   *   recordId: '123',
   *   data: { name: 'John' },
   *   context: executionContext,
   *   timestamp: new Date().toISOString()
   * });
   */
  async emit(event) {
    if (!event || typeof event !== 'object') {
      return;
    }

    const eventType = event.type || '';
    const handlersToExecute = [];
    let firstError = null;

    // Collect all specific event handlers
    if (this.#handlers.has(eventType)) {
      const handlers = this.#handlers.get(eventType);
      for (const handler of handlers) {
        handlersToExecute.push(
          this.#executeHandler(handler, event).catch((error) => {
            if (!firstError) {
              firstError = error;
            }
          })
        );
      }
    }

    // Collect all matching pattern handlers
    for (const [pattern, handlers] of this.#patternHandlers.entries()) {
      if (this.#matches(eventType, pattern)) {
        for (const handler of handlers) {
          handlersToExecute.push(
            this.#executeHandler(handler, event).catch((error) => {
              if (!firstError) {
                firstError = error;
              }
            })
          );
        }
      }
    }

    // Execute all handlers in parallel
    if (handlersToExecute.length > 0) {
      await Promise.all(handlersToExecute);
    }

    // Re-throw the first error if any occurred
    if (firstError) {
      throw firstError;
    }
  }

  /**
   * Execute a single handler and handle its result
   * Converts sync handlers to async and logs errors
   *
   * @param {Function} handler - The handler function to execute
   * @param {Object} event - The event to pass to the handler
   * @returns {Promise<void>}
   * @private
   */
  async #executeHandler(handler, event) {
    try {
      // Call handler and await if it's a promise
      const result = handler(event);
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (error) {
      console.error('Error in event handler:', error);
      throw error;
    }
  }
}
