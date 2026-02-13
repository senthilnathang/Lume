/**
 * WebSocket service for real-time updates
 *
 * Provides connection management, automatic reconnection,
 * and event handling for real-time inbox updates.
 */

import { ref, computed } from 'vue';
import { useAccessStore } from '@vben/stores';

export type WebSocketEventType =
  // Connection events
  | 'connection:established'
  | 'heartbeat'
  | 'pong'
  | 'error'
  // Inbox events
  | 'inbox:new'
  | 'inbox:updated'
  | 'inbox:deleted'
  | 'inbox:bulk_read'
  | 'inbox:bulk_archive'
  // Message events
  | 'message:new'
  | 'message:updated'
  | 'message:deleted'
  | 'message:reaction'
  // Typing events
  | 'typing:start'
  | 'typing:stop'
  // Read receipts
  | 'read:receipt'
  // User presence
  | 'user:online'
  | 'user:offline'
  // Label events
  | 'label:created'
  | 'label:updated'
  | 'label:deleted';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp?: string;
}

export type WebSocketEventHandler<T = unknown> = (
  data: T,
  message: WebSocketMessage<T>,
) => void;

export interface WebSocketOptions {
  /** Base URL for WebSocket connection (defaults to current host) */
  baseUrl?: string;
  /** Reconnection attempts before giving up (-1 for infinite) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms */
  maxReconnectDelay?: number;
  /** Ping interval in ms */
  pingInterval?: number;
  /** Debug mode for console logging */
  debug?: boolean;
}

const defaultOptions: Required<WebSocketOptions> = {
  baseUrl: '',
  maxReconnectAttempts: -1, // Infinite retries
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  pingInterval: 30000,
  debug: false,
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();

  // Reactive state
  private _isConnected = ref(false);
  private _isConnecting = ref(false);
  private _lastError = ref<string | null>(null);
  private _reconnecting = ref(false);

  constructor(options: WebSocketOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  // Public reactive getters
  get isConnected() {
    return computed(() => this._isConnected.value);
  }

  get isConnecting() {
    return computed(() => this._isConnecting.value);
  }

  get lastError() {
    return computed(() => this._lastError.value);
  }

  get isReconnecting() {
    return computed(() => this._reconnecting.value);
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    if (this._isConnecting.value) {
      this.log('Connection already in progress');
      return;
    }

    const accessStore = useAccessStore();
    const token = accessStore.accessToken;

    if (!token) {
      this._lastError.value = 'No access token available';
      throw new Error('No access token available');
    }

    this._isConnecting.value = true;
    this._lastError.value = null;

    try {
      const baseUrl =
        this.options.baseUrl || this.getDefaultBaseUrl();
      const wsUrl = `${baseUrl}/api/v1/ws?token=${encodeURIComponent(token)}`;

      this.log(`Connecting to ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        this.ws.onopen = () => {
          this._isConnected.value = true;
          this._isConnecting.value = false;
          this._reconnecting.value = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.log('Connected successfully');
          resolve();
        };

        this.ws.onerror = (event) => {
          this._lastError.value = 'Connection error';
          this.log('Connection error', event);
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          this._isConnected.value = false;
          this._isConnecting.value = false;
          this.stopPingInterval();
          this.log(`Connection closed: ${event.code} - ${event.reason}`);

          // Attempt reconnection if not a normal close
          if (event.code !== 1000 && event.code !== 1008) {
            this.scheduleReconnect();
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
      });
    } catch (error) {
      this._isConnecting.value = false;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this._isConnected.value = false;
    this._isConnecting.value = false;
    this._reconnecting.value = false;
    this.reconnectAttempts = 0;
    this.log('Disconnected');
  }

  /**
   * Send a message to the server
   */
  send<T = unknown>(type: string, data?: T): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send: not connected');
      return false;
    }

    const message = { type, data };
    this.ws.send(JSON.stringify(message));
    this.log('Sent message', message);
    return true;
  }

  /**
   * Send a ping to keep connection alive
   */
  ping(): boolean {
    return this.send('ping');
  }

  /**
   * Register an event handler
   */
  on<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    const handlers = this.eventHandlers.get(eventType)!;
    handlers.add(handler as WebSocketEventHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as WebSocketEventHandler);
    };
  }

  /**
   * Remove an event handler
   */
  off<T = unknown>(
    eventType: WebSocketEventType | '*',
    handler: WebSocketEventHandler<T>,
  ): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler as WebSocketEventHandler);
    }
  }

  /**
   * Send typing start indicator
   */
  sendTypingStart(recipientId: number, context?: string): boolean {
    return this.send('typing:start', { recipient_id: recipientId, context });
  }

  /**
   * Send typing stop indicator
   */
  sendTypingStop(recipientId: number): boolean {
    return this.send('typing:stop', { recipient_id: recipientId });
  }

  // Private methods

  private getDefaultBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.log('Received message', message);

      // Handle pong response
      if (message.type === 'pong' || message.type === 'heartbeat') {
        return;
      }

      // Emit to specific handlers
      this.emit(message.type, message.data, message);

      // Emit to wildcard handlers
      this.emit('*', message.data, message);
    } catch (error) {
      this.log('Failed to parse message', error);
    }
  }

  private emit<T = unknown>(
    eventType: string,
    data: T,
    message: WebSocketMessage<T>,
  ): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          (handler as WebSocketEventHandler<T>)(data, message);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${eventType}:`, error);
        }
      });
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingTimer = setInterval(() => {
      this.ping();
    }, this.options.pingInterval);
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.options.maxReconnectAttempts >= 0 &&
        this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this._lastError.value = 'Max reconnection attempts reached';
      this.log('Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay,
    );

    this._reconnecting.value = true;
    this.reconnectAttempts++;
    this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('Reconnect failed', error);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      if (data) {
        console.log(`[WebSocket] ${message}`, data);
      } else {
        console.log(`[WebSocket] ${message}`);
      }
    }
  }
}

// Create singleton instance
export const wsService = new WebSocketService({
  debug: import.meta.env.DEV,
});

// Export class for testing or creating additional instances
export { WebSocketService };
