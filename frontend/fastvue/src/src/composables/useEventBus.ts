/**
 * Event Bus Composable
 *
 * Provides a global event bus for component communication.
 *
 * Usage:
 * ```ts
 * import { useEventBus } from '#/composables';
 *
 * // In component A
 * const bus = useEventBus();
 * bus.emit('user:updated', { id: 1, name: 'John' });
 *
 * // In component B
 * const bus = useEventBus();
 * bus.on('user:updated', (user) => {
 *   console.log('User updated:', user);
 * });
 * ```
 */

import { onUnmounted } from 'vue';

type EventHandler<T = any> = (payload: T) => void;

interface EventBusInstance {
  /** Emit an event */
  emit: <T = any>(event: string, payload?: T) => void;
  /** Subscribe to an event */
  on: <T = any>(event: string, handler: EventHandler<T>) => () => void;
  /** Subscribe to an event (once) */
  once: <T = any>(event: string, handler: EventHandler<T>) => () => void;
  /** Unsubscribe from an event */
  off: <T = any>(event: string, handler?: EventHandler<T>) => void;
  /** Clear all handlers for an event */
  clear: (event?: string) => void;
  /** Get all handlers for an event */
  getHandlers: (event: string) => Set<EventHandler> | undefined;
}

// Global event handlers
const handlers = new Map<string, Set<EventHandler>>();

// Event history for debugging
const eventHistory: Array<{ event: string; payload: any; timestamp: number }> = [];
const MAX_HISTORY = 100;

/**
 * Create the event bus
 */
function createEventBus(): EventBusInstance {
  /**
   * Emit an event
   */
  function emit<T = any>(event: string, payload?: T): void {
    // Add to history
    eventHistory.push({
      event,
      payload,
      timestamp: Date.now(),
    });

    // Trim history
    if (eventHistory.length > MAX_HISTORY) {
      eventHistory.shift();
    }

    // Get handlers
    const eventHandlers = handlers.get(event);
    if (!eventHandlers) return;

    // Call handlers
    eventHandlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
      }
    });
  }

  /**
   * Subscribe to an event
   */
  function on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!handlers.has(event)) {
      handlers.set(event, new Set());
    }
    handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => off(event, handler);
  }

  /**
   * Subscribe to an event (once)
   */
  function once<T = any>(event: string, handler: EventHandler<T>): () => void {
    const wrapper: EventHandler<T> = (payload) => {
      off(event, wrapper);
      handler(payload);
    };
    return on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   */
  function off<T = any>(event: string, handler?: EventHandler<T>): void {
    if (!handler) {
      handlers.delete(event);
      return;
    }

    const eventHandlers = handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler);
      if (eventHandlers.size === 0) {
        handlers.delete(event);
      }
    }
  }

  /**
   * Clear all handlers
   */
  function clear(event?: string): void {
    if (event) {
      handlers.delete(event);
    } else {
      handlers.clear();
    }
  }

  /**
   * Get handlers for an event
   */
  function getHandlers(event: string): Set<EventHandler> | undefined {
    return handlers.get(event);
  }

  return {
    emit,
    on,
    once,
    off,
    clear,
    getHandlers,
  };
}

// Singleton instance
const eventBus = createEventBus();

/**
 * Event bus composable with auto-cleanup
 */
export function useEventBus(): EventBusInstance & {
  /** Auto-cleaned subscriptions */
  subscribe: <T = any>(event: string, handler: EventHandler<T>) => void;
} {
  const subscriptions: Array<() => void> = [];

  /**
   * Subscribe with auto-cleanup on unmount
   */
  function subscribe<T = any>(event: string, handler: EventHandler<T>): void {
    const unsubscribe = eventBus.on(event, handler);
    subscriptions.push(unsubscribe);
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    subscriptions.forEach((unsub) => unsub());
  });

  return {
    ...eventBus,
    subscribe,
  };
}

/**
 * Get the raw event bus (no auto-cleanup)
 */
export function getEventBus(): EventBusInstance {
  return eventBus;
}

/**
 * Get event history (for debugging)
 */
export function getEventHistory(): typeof eventHistory {
  return [...eventHistory];
}

/**
 * Typed event bus factory
 */
export function createTypedEventBus<Events extends Record<string, any>>() {
  return {
    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
      eventBus.emit(event as string, payload);
    },
    on<K extends keyof Events>(
      event: K,
      handler: (payload: Events[K]) => void,
    ): () => void {
      return eventBus.on(event as string, handler);
    },
    once<K extends keyof Events>(
      event: K,
      handler: (payload: Events[K]) => void,
    ): () => void {
      return eventBus.once(event as string, handler);
    },
    off<K extends keyof Events>(
      event: K,
      handler?: (payload: Events[K]) => void,
    ): void {
      eventBus.off(event as string, handler);
    },
  };
}

// Backend notification structure (from Django)
export interface BackendNotification {
  id: number;
  level: 'success' | 'info' | 'warning' | 'error';
  verb: string;
  description?: string | null;
  unread: boolean;
  timestamp: string;
  deleted: boolean;
  data: Record<string, any> | null;
  actor?: {
    id: number;
    full_name: string;
    employee_profile: string | null;
  } | null;
  target_content_type?: string | null;
  target_object_id?: string | null;
  action_object_content_type?: string | null;
  action_object_object_id?: string | null;
}

// Common application events
export interface AppEvents {
  // Backend notification events
  'notification:new': BackendNotification;
  'notification:batch': BackendNotification[];
  'notification:read': { id: number };
  'notification:read-all': {};
  'notification:deleted': { id: number };
  'notification:count-updated': { count: number };

  // Inbox events
  'inbox:new': any;
  'inbox:count-updated': { count: number };
  'inbox:read': { id: number };
  'inbox:unread': { id: number };
  'inbox:archived': { id: number };
  'inbox:unarchived': { id: number };
  'inbox:starred': { id: number };
  'inbox:unstarred': { id: number };
  'inbox:bulk-read': { count: number };
  'inbox:bulk-archived': { count: number };
  'inbox:deleted': { id: number };

  // Session events
  'session:warning': { remainingTime: number };
  'session:expired': {};

  // System events
  'system:online': {};
  'system:offline': {};
  'system:error': { message: string; code?: string };

  // Generic module events (modules can add their own)
  [key: string]: any;
}

export const appEventBus = createTypedEventBus<AppEvents>();

export default useEventBus;
