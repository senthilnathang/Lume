/**
 * WebSocket Composable
 * Singleton WebSocket connection with auto-reconnect and event dispatching
 */

import { ref, readonly, onUnmounted, type Ref } from 'vue';

export interface WsMessage {
  type: string;
  payload?: any;
  [key: string]: any;
}

interface WebSocketState {
  isConnected: Ref<boolean>;
  messages: Ref<WsMessage[]>;
  lastMessage: Ref<WsMessage | null>;
  send: (data: WsMessage | string) => void;
  connect: () => void;
  disconnect: () => void;
}

// Singleton state shared across all component instances
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let intentionalClose = false;
let subscriberCount = 0;

const isConnected = ref(false);
const messages = ref<WsMessage[]>([]);
const lastMessage = ref<WsMessage | null>(null);

const MAX_RECONNECT_DELAY = 30000;
const MAX_MESSAGES = 200;

function getWsUrl(): string {
  const token = localStorage.getItem('token');
  const isDev = import.meta.env.DEV;

  if (isDev) {
    return `ws://localhost:3000/ws?token=${token || ''}`;
  }

  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}/ws?token=${token || ''}`;
}

function dispatchWsEvent(type: string, detail: any) {
  window.dispatchEvent(new CustomEvent(`ws:${type}`, { detail }));
}

function doConnect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = getWsUrl();
  intentionalClose = false;

  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error('[WebSocket] Failed to create connection:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    isConnected.value = true;
    reconnectDelay = 1000;
    console.log('[WebSocket] Connected');
  };

  ws.onmessage = (event: MessageEvent) => {
    let parsed: WsMessage;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      parsed = { type: 'raw', payload: event.data };
    }

    lastMessage.value = parsed;
    messages.value = [parsed, ...messages.value].slice(0, MAX_MESSAGES);

    // Dispatch custom events based on message type
    if (parsed.type === 'notification') {
      dispatchWsEvent('notification', parsed.payload ?? parsed);
    } else if (parsed.type === 'refresh') {
      dispatchWsEvent('refresh', parsed.payload ?? parsed);
    }

    // Generic event for any type
    dispatchWsEvent('message', parsed);
  };

  ws.onclose = (event: CloseEvent) => {
    isConnected.value = false;
    ws = null;
    console.log(`[WebSocket] Closed (code: ${event.code})`);

    if (!intentionalClose) {
      scheduleReconnect();
    }
  };

  ws.onerror = (event: Event) => {
    console.error('[WebSocket] Error:', event);
  };
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  console.log(`[WebSocket] Reconnecting in ${reconnectDelay / 1000}s...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    doConnect();
  }, reconnectDelay);

  // Exponential backoff capped at MAX_RECONNECT_DELAY
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

function doDisconnect() {
  intentionalClose = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  isConnected.value = false;
}

function send(data: WsMessage | string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[WebSocket] Cannot send - not connected');
    return;
  }

  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  ws.send(payload);
}

/**
 * WebSocket composable with singleton connection.
 * Automatically connects on first use and disconnects when all subscribers unmount.
 */
export function useWebSocket(): WebSocketState {
  subscriberCount++;

  // Auto-connect on first subscriber
  if (subscriberCount === 1 && !ws) {
    doConnect();
  }

  onUnmounted(() => {
    subscriberCount--;
    // Disconnect when no subscribers remain
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      doDisconnect();
    }
  });

  return {
    isConnected: readonly(isConnected),
    messages: readonly(messages) as Ref<WsMessage[]>,
    lastMessage: readonly(lastMessage) as Ref<WsMessage | null>,
    send,
    connect: doConnect,
    disconnect: doDisconnect,
  };
}
