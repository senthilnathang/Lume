/**
 * Unit tests for WebSocketManager per-record permission check (P2-1).
 *
 * These cases pin the security policy documented in
 * docs/deployment/PRE_LAUNCH_IMPROVEMENTS.md → P2-1:
 *   - super_admin sees everything
 *   - non-admin subscribers see only records in their own tenant
 *   - tenant key may be company_id / companyId / tenant_id / tenantId
 *   - subscriber with no tenant ↔ record with no tenant: allowed (global)
 *   - subscriber with tenant + record with no tenant: denied (defensive)
 *   - subscriber with no tenant + record with tenant: denied (defensive)
 *
 * If any of these change, the deployment cookbook for multi-tenant
 * Lume installs needs updating too.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import WebSocketManager from '../../src/core/realtime/websocket-manager.js';

describe('WebSocketManager — per-record permission (P2-1)', () => {
  let ws;
  beforeEach(() => {
    ws = new WebSocketManager();
  });

  describe('subscribe() backwards-compat shim', () => {
    it('accepts legacy positional filter as 3rd arg', () => {
      const id = ws.subscribe('user', 42, { status: 'active' });
      const sub = ws.subscriptions.get(id);
      expect(sub.filter).toEqual({ status: 'active' });
      expect(sub.companyId).toBeNull();
      expect(sub.roles).toEqual([]);
    });

    it('accepts new options bag with companyId + roles', () => {
      const id = ws.subscribe('user', 42, {
        companyId: 7,
        roles: ['super_admin'],
        filter: { status: 'active' },
      });
      const sub = ws.subscriptions.get(id);
      expect(sub.companyId).toBe(7);
      expect(sub.roles).toEqual(['super_admin']);
      expect(sub.filter).toEqual({ status: 'active' });
    });
  });

  describe('canSubscriberReceive() — super_admin bypass', () => {
    it('super_admin sees records from any tenant', () => {
      const id = ws.subscribe('order', 1, { companyId: 7, roles: ['super_admin'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, company_id: 999 })).toBe(true);
    });

    it("legacy 'admin' role also bypasses", () => {
      const id = ws.subscribe('order', 1, { companyId: 7, roles: ['admin'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, tenant_id: 999 })).toBe(true);
    });
  });

  describe('canSubscriberReceive() — tenant isolation', () => {
    it('matching tenant: allowed', () => {
      const id = ws.subscribe('order', 1, { companyId: 7, roles: ['user'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, company_id: 7 })).toBe(true);
      expect(ws.canSubscriberReceive(sub, { id: 100, companyId: 7 })).toBe(true);
      expect(ws.canSubscriberReceive(sub, { id: 100, tenant_id: 7 })).toBe(true);
      expect(ws.canSubscriberReceive(sub, { id: 100, tenantId: 7 })).toBe(true);
    });

    it('mismatched tenant: denied (THE security check)', () => {
      const id = ws.subscribe('order', 1, { companyId: 7, roles: ['user'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, company_id: 999 })).toBe(false);
      expect(ws.canSubscriberReceive(sub, { id: 100, tenant_id: 999 })).toBe(false);
    });

    it('subscriber tenant + record without tenant: denied (defensive)', () => {
      const id = ws.subscribe('order', 1, { companyId: 7, roles: ['user'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, payload: 'x' })).toBe(false);
    });

    it('no tenant + no tenant: allowed (global record)', () => {
      const id = ws.subscribe('order', 1, { companyId: null, roles: ['user'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, payload: 'x' })).toBe(true);
    });

    it('no subscriber tenant + record with tenant: denied (non-admin)', () => {
      const id = ws.subscribe('order', 1, { companyId: null, roles: ['user'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, company_id: 5 })).toBe(false);
    });

    it('numeric vs string tenant id: equal by value', () => {
      const id = ws.subscribe('order', 1, { companyId: 7, roles: ['user'] });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, { id: 100, company_id: '7' })).toBe(true);
    });
  });

  describe('canSubscriberReceive() — invalid input', () => {
    it('null subscription denied', () => {
      expect(ws.canSubscriberReceive(null, { id: 1 })).toBe(false);
    });
    it('null record denied', () => {
      const id = ws.subscribe('order', 1, { companyId: 7 });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, null)).toBe(false);
    });
    it('non-object record denied', () => {
      const id = ws.subscribe('order', 1, { companyId: 7 });
      const sub = ws.subscriptions.get(id);
      expect(ws.canSubscriberReceive(sub, 'oops')).toBe(false);
    });
  });

  describe('broadcast() — end-to-end filtering', () => {
    it('only delivers to matching-tenant subscribers', async () => {
      const messages = [];
      const subA = ws.subscribe('order', 'u1', { companyId: 1, roles: ['user'] });
      const subB = ws.subscribe('order', 'u2', { companyId: 2, roles: ['user'] });
      const subAdmin = ws.subscribe('order', 'u3', { companyId: 99, roles: ['super_admin'] });

      // Override sendToSubscriber to capture without touching websockets
      ws.sendToSubscriber = (subscription, message) => {
        messages.push({ subId: subscription.id, message });
      };

      await ws.broadcast('order', 'create', { id: 100, company_id: 1 }, {});

      const deliveredTo = messages.map((m) => m.subId).sort();
      expect(deliveredTo).toEqual([subA, subAdmin].sort());
      // subB explicitly NOT in the list — that's the leak we'd otherwise have
      expect(deliveredTo).not.toContain(subB);
    });
  });
});
