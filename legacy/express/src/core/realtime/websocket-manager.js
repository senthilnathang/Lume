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
 * @property {number|null} companyId - Tenant scope; null means "no tenant filter" (admin)
 * @property {string[]} roles - Role names the user holds at subscribe time
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
   * Create a new subscription.
   *
   * P2-1 — the `companyId` and `roles` parameters were added so broadcasts
   * can enforce tenant isolation and role-based read access without an
   * extra DB roundtrip per event. Caller must pass the auth-context values
   * already resolved at WebSocket handshake time (req.user.companyId,
   * req.user.roles). Passing `companyId=null` means "subscriber sees every
   * tenant" — only safe for super_admin connections.
   *
   * @param {string} entity - Entity slug
   * @param {string} userId - User ID
   * @param {Object} [options]
   * @param {number|null} [options.companyId=null] - Tenant scope; null = no tenant filter
   * @param {string[]} [options.roles=[]] - Role names (used for super_admin bypass)
   * @param {Object} [options.filter=null] - Optional filter conditions
   * @returns {string} Subscription ID
   */
  subscribe(entity, userId, options = {}) {
    // Backwards-compat: legacy callers pass (entity, userId, filter) as
    // positional args. If `options` looks like a filter object (not the
    // new options bag), unwrap it.
    const opts =
      options &&
      typeof options === 'object' &&
      !('companyId' in options || 'roles' in options || 'filter' in options)
        ? { filter: options }
        : options || {};

    const id = `sub_${++this.idCounter}_${Date.now()}`;

    const subscription = {
      id,
      entity,
      userId,
      companyId: opts.companyId ?? null,
      roles: Array.isArray(opts.roles) ? opts.roles : [],
      filter: opts.filter ?? null,
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

    logger.debug(
      `[WebSocket] Subscription created: ${id} for user ${userId} on ${entity} (companyId=${subscription.companyId})`,
    );

    return id;
  }

  /**
   * Decide whether a given subscriber may receive a broadcast of a record.
   *
   * Current policy (v2.0):
   *   1. super_admin: always allowed (no tenant filter)
   *   2. Else: subscriber's companyId must match the record's company_id /
   *      companyId / tenant_id / tenantId. If the record has no tenant
   *      column at all, only allow when the subscriber has no tenant scope
   *      either (defensive — better to drop than leak across tenants).
   *
   * Future policy (v2.x): wire AccessControlService.canRead() for
   *   record-level row rules. The hook is here so adding it is one line.
   *
   * @param {Subscription} subscription
   * @param {Object} record
   * @returns {boolean}
   */
  canSubscriberReceive(subscription, record) {
    if (!subscription || !record || typeof record !== 'object') {
      return false;
    }

    // Bypass: super_admin sees everything. Match either the canonical role
    // name or the historical 'admin' alias.
    if (
      subscription.roles &&
      (subscription.roles.includes('super_admin') ||
        subscription.roles.includes('admin'))
    ) {
      return true;
    }

    // Tenant isolation. Records may carry the tenant key under any of these
    // names depending on which ORM produced them.
    const recordTenant =
      record.company_id ??
      record.companyId ??
      record.tenant_id ??
      record.tenantId ??
      null;

    // No tenant column on the record + no tenant scope on the subscriber
    // → ambient/global record (e.g. a public setting). Allow.
    if (recordTenant === null && subscription.companyId === null) {
      return true;
    }

    // Record has a tenant but subscriber has none (and isn't admin) → deny.
    // Subscriber has a tenant but record doesn't → deny (defensive).
    if (recordTenant === null || subscription.companyId === null) {
      return false;
    }

    // Strict tenant equality. Coerce because IDs cross JSON.parse boundaries
    // as numbers in some clients, strings in others.
    return String(recordTenant) === String(subscription.companyId);
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
  async broadcast(entity, action, record, _executionContext) {
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

    let delivered = 0;
    let denied = 0;

    for (const subscriptionId of subscribers) {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        continue;
      }

      // Check if record matches filter
      if (subscription.filter && !this.matchesFilter(record, subscription.filter)) {
        continue;
      }

      // P2-1: per-record permission check. Closes the data-leak risk where
      // multi-tenant subscribers received events from other tenants.
      // canSubscriberReceive enforces:
      //   - super_admin: allowed (no tenant filter)
      //   - else: subscriber.companyId must match record.company_id / tenant_id
      if (!this.canSubscriberReceive(subscription, record)) {
        denied++;
        logger.debug(
          `[WebSocket] Denied ${action} on ${entity} to subscriber ${subscriptionId} ` +
          `(user=${subscription.userId} companyId=${subscription.companyId})`,
        );
        continue;
      }

      this.sendToSubscriber(subscription, message);
      delivered++;
    }

    if (denied > 0) {
      logger.debug(
        `[WebSocket] Broadcast ${action} on ${entity}: ${delivered} delivered, ${denied} denied`,
      );
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
