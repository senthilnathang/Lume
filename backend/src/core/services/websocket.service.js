/**
 * WebSocketService — Real-time WebSocket server alongside Express.
 * Supports JWT authentication, per-user messaging, and broadcast.
 */

import { WebSocketServer } from 'ws';
import { jwtUtil } from '../../shared/utils/index.js';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set<ws>
  }

  /**
   * Initialize WebSocket server on an existing HTTP server.
   * @param {http.Server} server - The HTTP server from Express
   */
  initialize(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      // Extract token from query string: ws://host/ws?token=xxx
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      const decoded = jwtUtil.verifyToken(token);
      if (!decoded || !decoded.id) {
        ws.close(4001, 'Invalid token');
        return;
      }

      const userId = decoded.id;
      ws.userId = userId;
      ws.isAlive = true;

      // Register client
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Send welcome message
      ws.send(JSON.stringify({ type: 'connected', userId }));

      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('close', () => {
        const userClients = this.clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            this.clients.delete(userId);
          }
        }
      });

      ws.on('error', () => {
        ws.terminate();
      });
    });

    // Heartbeat every 30 seconds
    this._heartbeatInterval = setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach(ws => {
          if (!ws.isAlive) {
            ws.terminate();
            return;
          }
          ws.isAlive = false;
          ws.ping();
        });
      }
    }, 30000);

    console.log('✅ WebSocket server initialized on /ws');
  }

  /**
   * Send a message to a specific user (all their connections).
   */
  sendToUser(userId, data) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const message = JSON.stringify(data);
    for (const ws of userClients) {
      if (ws.readyState === 1) { // OPEN
        ws.send(message);
      }
    }
  }

  /**
   * Broadcast to all connected clients.
   */
  broadcast(data, excludeUserId) {
    if (!this.wss) return;
    const message = JSON.stringify(data);

    this.wss.clients.forEach(ws => {
      if (ws.readyState === 1 && ws.userId !== excludeUserId) {
        ws.send(message);
      }
    });
  }

  /**
   * Send a notification event to a user.
   */
  sendNotification(userId, notification) {
    this.sendToUser(userId, {
      type: 'notification',
      data: notification,
    });
  }

  /**
   * Send a data refresh event (e.g., when a record is created/updated).
   */
  sendRefresh(model, action, data, excludeUserId) {
    this.broadcast({
      type: 'refresh',
      model,
      action,
      data,
    }, excludeUserId);
  }

  /**
   * Get connection stats.
   */
  getStats() {
    return {
      totalConnections: this.wss?.clients?.size || 0,
      uniqueUsers: this.clients.size,
    };
  }

  /**
   * Graceful shutdown.
   */
  close() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Singleton
const wsService = new WebSocketService();
export { wsService };
export default wsService;
