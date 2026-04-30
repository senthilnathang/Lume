/**
 * @fileoverview WebSocket Manager - Real-time subscriptions
 * Manages WebSocket connections and broadcasts entity changes
 */

import logger from '../services/logger.js';

/**
 * @typedef {Object} Subscription
 * @property {string} id - Subscription ID
 * @property {string} entity - Entity slug
 * @property {string} userId - User ID
 * @property {Object} filter - Optional filter conditions
 * @property {Function} onUpdate - Update callback
 * @property {number} createdAt - Creation timestamp
 */

class WebSocketManager {
  constructor() {
    this.subscriptions = new Map(); // subscriptionId -> Subscription
    this.userConnections = new Map(); // userId -> Set of subscriptionIds
    this.entitySubscribers = new Map(); // entity -> Set of subscriptionIds
    this.idCounter = 0;
  }

  /**
   * Create a new subscription
   * @param {string} entity - Entity slug
   * @param {string} userId - User ID
   * @param {Object} filter - Optional filter conditions
   * @returns {string} Subscription ID
   */
  subscribe(entity, userId, filter = null) {
    const id = `sub_${++this.idCounter}_${Date.now()}`;

    const subscription = {
      id,
      entity,
      userId,
      filter,
      createdAt: Date.now(),
    };

    this.subscriptions.set(id, subscription);

    // Index by user
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(id);

    // Index by entity
    if (!this.entitySubscribers.has(entity)) {
      this.entitySubscribers.set(entity, new Set());
    }
    this.entitySubscribers.get(entity).add(id);

    logger.debug(`[WebSocket] Subscription created: ${id} for user ${userId} on ${entity}`);

    return id;
  }

  /**
   * Unsubscribe from entity changes
   * @param {string} subscriptionId - Subscription ID
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    this.subscriptions.delete(subscriptionId);

    // Remove from user index
    const userSubs = this.userConnections.get(subscription.userId);
    if (userSubs) {
      userSubs.delete(subscriptionId);
    }

    // Remove from entity index
    const entitySubs = this.entitySubscribers.get(subscription.entity);
    if (entitySubs) {
      entitySubs.delete(subscriptionId);
    }

    logger.debug(`[WebSocket] Subscription removed: ${subscriptionId}`);
  }

  /**
   * Broadcast entity change to all subscribers
   * @param {string} entity - Entity slug
   * @param {string} action - Action (create, update, delete)
   * @param {Object} record - Changed record
   * @param {Object} executionContext - User context for permission checking
   */
  async broadcast(entity, action, record, executionContext) {
    const subscribers = this.entitySubscribers.get(entity);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    logger.debug(
      `[WebSocket] Broadcasting ${action} on ${entity} to ${subscribers.size} subscribers`
    );

    const message = {
      type: 'entity-change',
      entity,
      action,
      record,
      timestamp: Date.now(),
    };

    for (const subscriptionId of subscribers) {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        continue;
      }

      // Check if record matches filter
      if (subscription.filter && !this.matchesFilter(record, subscription.filter)) {
        continue;
      }

      // TODO: Permission check - ensure user can see this record
      // For now, assuming permission already checked at operation level

      this.sendToSubscriber(subscription, message);
    }
  }

  /**
   * Send message to specific subscriber
   * @private
   * @param {Subscription} subscription - Subscription object
   * @param {Object} message - Message to send
   */
  sendToSubscriber(subscription, message) {
    // In real implementation, would send via WebSocket connection
    logger.debug(
      `[WebSocket] Sending to subscriber ${subscription.id}: ${message.entity} ${message.action}`
    );

    // This would be:
    // socket.emit('entity-change', message);
  }

  /**
   * Check if record matches filter conditions
   * @private
   * @param {Object} record - Record to check
   * @param {Object} filter - Filter conditions
   * @returns {boolean}
   */
  matchesFilter(record, filter) {
    if (!filter || Object.keys(filter).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (record[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all subscriptions for a user
   * @param {string} userId - User ID
   * @returns {Subscription[]}
   */
  getUserSubscriptions(userId) {
    const subIds = this.userConnections.get(userId) || new Set();
    return Array.from(subIds).map(id => this.subscriptions.get(id));
  }

  /**
   * Get all subscriptions for an entity
   * @param {string} entity - Entity slug
   * @returns {Subscription[]}
   */
  getEntitySubscriptions(entity) {
    const subIds = this.entitySubscribers.get(entity) || new Set();
    return Array.from(subIds).map(id => this.subscriptions.get(id));
  }

  /**
   * Clear all subscriptions (cleanup)
   */
  clear() {
    this.subscriptions.clear();
    this.userConnections.clear();
    this.entitySubscribers.clear();
    logger.info('[WebSocket] All subscriptions cleared');
  }

  /**
   * Get connection statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      uniqueUsers: this.userConnections.size,
      uniqueEntities: this.entitySubscribers.size,
      subscriptionsByEntity: Object.fromEntries(
        Array.from(this.entitySubscribers.entries()).map(([entity, subs]) => [
          entity,
          subs.size,
        ])
      ),
    };
  }
}

export default WebSocketManager;
