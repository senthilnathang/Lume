/**
 * useWebSocket — Composable for WebSocket connection with auto-reconnect.
 * Provides real-time notification events and data refresh signals.
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/store/auth'

interface WsMessage {
  type: string
  data?: any
  model?: string
  action?: string
  userId?: number
}

type MessageHandler = (msg: WsMessage) => void

const handlers: Set<MessageHandler> = new Set()
let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_BASE_DELAY = 1000

const connected = ref(false)
const unreadCount = ref(0)

function getWsUrl(): string {
  const authStore = useAuthStore()
  const token = authStore.token
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  const port = '3000' // Backend port
  return `${protocol}//${host}:${port}/ws?token=${token}`
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const authStore = useAuthStore()
  if (!authStore.token) return

  try {
    ws = new WebSocket(getWsUrl())

    ws.onopen = () => {
      connected.value = true
      reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data)

        // Update unread count on notification events
        if (msg.type === 'notification') {
          unreadCount.value++
        }

        // Dispatch to all registered handlers
        for (const handler of handlers) {
          handler(msg)
        }
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      connected.value = false
      ws = null
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  } catch {
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return

  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts)
  reconnectAttempts++

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
  connected.value = false
}

export function useWebSocket() {
  const onMessage = (handler: MessageHandler) => {
    handlers.add(handler)
  }

  const removeHandler = (handler: MessageHandler) => {
    handlers.delete(handler)
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    // Don't disconnect — other components may still need it
    // Handlers are cleaned up per-component
  })

  return {
    connected,
    unreadCount,
    onMessage,
    removeHandler,
    connect,
    disconnect,
  }
}

export default useWebSocket
