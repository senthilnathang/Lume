/**
 * WebSocket Composable
 *
 * Provides real-time communication with automatic reconnection,
 * heartbeat, and event handling.
 *
 * Usage:
 * ```ts
 * import { useWebSocket } from '#/composables';
 *
 * const { connect, send, on, status } = useWebSocket('ws://api/ws');
 *
 * on('notification', (data) => {
 *   console.log('New notification:', data);
 * });
 *
 * connect();
 * send('subscribe', { channel: 'attendance' });
 * ```
 */

import { ref, computed, onUnmounted, type Ref } from 'vue';

export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface WebSocketOptions {
  /** Auto-connect on creation */
  autoConnect?: boolean;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in ms */
  reconnectInterval?: number;
  /** Max reconnect attempts (0 = unlimited) */
  maxReconnectAttempts?: number;
  /** Heartbeat interval in ms (0 = disabled) */
  heartbeatInterval?: number;
  /** Heartbeat message */
  heartbeatMessage?: string;
  /** Message serializer */
  serializer?: (data: any) => string;
  /** Message deserializer */
  deserializer?: (data: string) => any;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  timestamp?: number;
}

type MessageHandler = (payload: any, message: WebSocketMessage) => void;

/**
 * Create a WebSocket connection with utilities
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const {
    autoConnect = false,
    autoReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    heartbeatMessage = JSON.stringify({ type: 'ping' }),
    serializer = JSON.stringify,
    deserializer = JSON.parse,
  } = options;

  const status: Ref<WebSocketStatus> = ref('disconnected');
  const lastMessage: Ref<WebSocketMessage | null> = ref(null);
  const reconnectAttempts = ref(0);

  let socket: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const handlers = new Map<string, Set<MessageHandler>>();

  /**
   * Connect to WebSocket server
   */
  function connect(): void {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();
    status.value = 'connecting';

    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        status.value = 'connected';
        reconnectAttempts.value = 0;
        startHeartbeat();
        emit('_connected', {});
      };

      socket.onclose = (event) => {
        status.value = 'disconnected';
        stopHeartbeat();
        emit('_disconnected', { code: event.code, reason: event.reason });

        if (autoReconnect && !event.wasClean) {
          scheduleReconnect();
        }
      };

      socket.onerror = (error) => {
        status.value = 'error';
        emit('_error', { error });
      };

      socket.onmessage = (event) => {
        try {
          const message = deserializer(event.data) as WebSocketMessage;
          lastMessage.value = message;

          // Handle pong
          if (message.type === 'pong') {
            return;
          }

          // Emit to specific handlers
          emit(message.type, message.payload, message);

          // Emit to wildcard handlers
          emit('*', message.payload, message);
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };
    } catch (e) {
      status.value = 'error';
      console.error('[WebSocket] Connection error:', e);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  function disconnect(): void {
    cleanup();
    if (socket) {
      socket.close(1000, 'Client disconnected');
      socket = null;
    }
    status.value = 'disconnected';
  }

  /**
   * Send a message
   */
  function send(type: string, payload?: any): boolean {
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send - not connected');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: Date.now(),
      };
      socket.send(serializer(message));
      return true;
    } catch (e) {
      console.error('[WebSocket] Send error:', e);
      return false;
    }
  }

  /**
   * Send raw data
   */
  function sendRaw(data: string | ArrayBuffer | Blob): boolean {
    if (socket?.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      socket.send(data);
      return true;
    } catch (e) {
      console.error('[WebSocket] Send error:', e);
      return false;
    }
  }

  /**
   * Subscribe to a message type
   */
  function on(type: string, handler: MessageHandler): () => void {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => off(type, handler);
  }

  /**
   * Unsubscribe from a message type
   */
  function off(type: string, handler?: MessageHandler): void {
    if (handler) {
      handlers.get(type)?.delete(handler);
    } else {
      handlers.delete(type);
    }
  }

  /**
   * Subscribe to a message type (once)
   */
  function once(type: string, handler: MessageHandler): () => void {
    const wrapper: MessageHandler = (payload, message) => {
      off(type, wrapper);
      handler(payload, message);
    };
    return on(type, wrapper);
  }

  /**
   * Emit to handlers
   */
  function emit(type: string, payload: any, message?: WebSocketMessage): void {
    const typeHandlers = handlers.get(type);
    if (typeHandlers) {
      const msg = message || { type, payload, timestamp: Date.now() };
      typeHandlers.forEach((handler) => {
        try {
          handler(payload, msg);
        } catch (e) {
          console.error('[WebSocket] Handler error:', e);
        }
      });
    }
  }

  /**
   * Start heartbeat
   */
  function startHeartbeat(): void {
    if (heartbeatInterval <= 0) return;

    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(heartbeatMessage);
      }
    }, heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnect
   */
  function scheduleReconnect(): void {
    if (maxReconnectAttempts > 0 && reconnectAttempts.value >= maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached');
      emit('_maxReconnectReached', {});
      return;
    }

    status.value = 'reconnecting';
    reconnectAttempts.value++;

    reconnectTimer = setTimeout(() => {
      console.log(
        `[WebSocket] Reconnecting... (attempt ${reconnectAttempts.value})`,
      );
      connect();
    }, reconnectInterval);
  }

  /**
   * Cleanup timers
   */
  function cleanup(): void {
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  // Auto-connect if enabled
  if (autoConnect) {
    connect();
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    status: computed(() => status.value),
    lastMessage: computed(() => lastMessage.value),
    reconnectAttempts: computed(() => reconnectAttempts.value),
    isConnected: computed(() => status.value === 'connected'),

    // Methods
    connect,
    disconnect,
    send,
    sendRaw,
    on,
    off,
    once,
  };
}

/**
 * Create a typed WebSocket connection for specific message types
 */
export function createTypedWebSocket<T extends Record<string, any>>(
  url: string,
  options?: WebSocketOptions,
) {
  const ws = useWebSocket(url, options);

  return {
    ...ws,
    on<K extends keyof T>(type: K, handler: (payload: T[K]) => void) {
      return ws.on(type as string, handler as MessageHandler);
    },
    send<K extends keyof T>(type: K, payload: T[K]) {
      return ws.send(type as string, payload);
    },
  };
}

export default useWebSocket;
