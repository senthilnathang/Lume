/**
 * @fileoverview Phase 10 Enterprise Features Tests
 * Tests for audit logging, multi-tenancy, analytics, custom middleware, view access, and import/export
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import AuditLogger from '../../src/core/audit/audit-logger.js';
import TenantManager from '../../src/core/multi-tenancy/tenant-manager.js';
import AnalyticsEngine from '../../src/core/analytics/analytics-engine.js';
import CustomMiddlewareSystem from '../../src/core/middleware/custom-middleware-system.js';
import ViewAccessControl from '../../src/core/rbac/view-access-control.js';
import DataImportExport from '../../src/core/import-export/data-import-export.js';

describe('Phase 10: Enterprise Features', () => {
  describe('Audit Logger', () => {
    let auditLogger;

    beforeEach(() => {
      auditLogger = new AuditLogger({ enabled: true, retentionDays: 365 });
    });

    it('should log entity changes', async () => {
      const entry = await auditLogger.log({
        entity: 'ticket',
        action: 'create',
        recordId: 1,
        changes: { title: { before: null, after: 'Test' } },
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      expect(entry).toBeDefined();
      expect(entry.entity).toBe('ticket');
      expect(entry.action).toBe('create');
      expect(entry.changeCount).toBe(1);
    });

    it('should filter audit logs by entity', async () => {
      await auditLogger.log({
        entity: 'ticket',
        action: 'create',
        recordId: 1,
        changes: {},
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      await auditLogger.log({
        entity: 'task',
        action: 'create',
        recordId: 2,
        changes: {},
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      const trail = await auditLogger.getAuditTrail({ entity: 'ticket' });
      expect(trail).toHaveLength(1);
      expect(trail[0].entity).toBe('ticket');
    });

    it('should filter audit logs by user', async () => {
      await auditLogger.log({
        entity: 'ticket',
        action: 'update',
        recordId: 1,
        changes: {},
        userId: 'user1',
        userEmail: 'alice@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      await auditLogger.log({
        entity: 'ticket',
        action: 'update',
        recordId: 2,
        changes: {},
        userId: 'user2',
        userEmail: 'bob@test.com',
        userRole: 'user',
        ipAddress: '127.0.0.1',
      });

      const trail = await auditLogger.getAuditTrail({ userId: 'user1' });
      expect(trail).toHaveLength(1);
      expect(trail[0].userId).toBe('user1');
    });

    it('should get record change history', async () => {
      await auditLogger.log({
        entity: 'ticket',
        action: 'create',
        recordId: 1,
        changes: { title: { before: null, after: 'New' } },
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      await auditLogger.log({
        entity: 'ticket',
        action: 'update',
        recordId: 1,
        changes: { status: { before: 'open', after: 'closed' } },
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      const history = await auditLogger.getRecordHistory('ticket', 1);
      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('update'); // Most recent first
      expect(history[1].action).toBe('create');
    });

    it('should detect suspicious activity', async () => {
      const now = Date.now();

      // Log 11 rapid deletions
      for (let i = 0; i < 11; i++) {
        await auditLogger.log({
          entity: 'ticket',
          action: 'delete',
          recordId: i,
          changes: {},
          userId: 'user1',
          userEmail: 'user@test.com',
          userRole: 'admin',
          ipAddress: '127.0.0.1',
        });
      }

      const suspicious = auditLogger.detectSuspiciousActivity();
      expect(suspicious.length).toBeGreaterThan(0);
      expect(suspicious.some(s => s.type === 'rapid-deletes')).toBe(true);
    });

    it('should export logs as JSON', async () => {
      await auditLogger.log({
        entity: 'ticket',
        action: 'create',
        recordId: 1,
        changes: {},
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      const json = await auditLogger.exportLogs();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should export logs as CSV', async () => {
      await auditLogger.log({
        entity: 'ticket',
        action: 'create',
        recordId: 1,
        changes: { title: { before: null, after: 'Test' } },
        userId: 'user1',
        userEmail: 'user@test.com',
        userRole: 'admin',
        ipAddress: '127.0.0.1',
      });

      const csv = await auditLogger.exportAsCSV();
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('Entity');
      expect(lines[0]).toContain('Action');
    });

    it('should get audit statistics', async () => {
      for (let i = 0; i < 5; i++) {
        await auditLogger.log({
          entity: 'ticket',
          action: 'create',
          recordId: i,
          changes: {},
          userId: 'user1',
          userEmail: 'user@test.com',
          userRole: 'admin',
          ipAddress: '127.0.0.1',
        });
      }

      const stats = auditLogger.getStatistics();
      expect(stats.totalLogs).toBe(5);
      expect(stats.byAction.create).toBe(5);
      expect(stats.byEntity.ticket).toBe(5);
    });

    it('should cleanup old logs', () => {
      const deleted = auditLogger.cleanup();
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tenant Manager', () => {
    let tenantManager;

    beforeEach(() => {
      tenantManager = new TenantManager({ isolationLevel: 'row' });
    });

    it('should create tenant', async () => {
      const tenant = await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
        config: { theme: 'light' },
      });

      expect(tenant.id).toBe('tenant1');
      expect(tenant.name).toBe('Tenant 1');
      expect(tenant.active).toBe(true);
    });

    it('should prevent duplicate tenant creation', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      await expect(
        tenantManager.createTenant({
          id: 'tenant1',
          name: 'Duplicate',
          domain: 'dup.example.com',
        })
      ).rejects.toThrow('Tenant already exists');
    });

    it('should get tenant by ID', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      const tenant = tenantManager.getTenant('tenant1');
      expect(tenant).toBeDefined();
      expect(tenant.id).toBe('tenant1');
    });

    it('should get tenant by domain', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      const tenant = tenantManager.getTenantByDomain('tenant1.example.com');
      expect(tenant).toBeDefined();
      expect(tenant.id).toBe('tenant1');
    });

    it('should list all tenants', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      await tenantManager.createTenant({
        id: 'tenant2',
        name: 'Tenant 2',
        domain: 'tenant2.example.com',
      });

      const tenants = tenantManager.listTenants();
      expect(tenants).toHaveLength(2);
    });

    it('should set active tenant', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      tenantManager.setActiveTenant('tenant1');
      expect(tenantManager.getActiveTenant()).toBe('tenant1');
    });

    it('should update tenant configuration', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
        config: { theme: 'light' },
      });

      const updated = await tenantManager.updateTenant('tenant1', {
        config: { theme: 'dark' },
      });

      expect(updated.config.theme).toBe('dark');
    });

    it('should delete tenant', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      await tenantManager.deleteTenant('tenant1');
      expect(tenantManager.getTenant('tenant1')).toBeUndefined();
    });

    it('should add tenant filter to query', () => {
      const query = { field: 'name', value: 'test' };
      const filtered = tenantManager.addTenantFilter(query, 'tenant1');

      expect(filtered.tenantFilter).toBeDefined();
      expect(filtered.tenantFilter.tenant_id).toBe('tenant1');
    });

    it('should get tenant statistics', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      const stats = tenantManager.getTenantStats('tenant1');
      expect(stats).toBeDefined();
      expect(stats.id).toBe('tenant1');
      expect(stats.metadata).toBeDefined();
    });

    it('should get combined statistics', async () => {
      await tenantManager.createTenant({
        id: 'tenant1',
        name: 'Tenant 1',
        domain: 'tenant1.example.com',
      });

      await tenantManager.createTenant({
        id: 'tenant2',
        name: 'Tenant 2',
        domain: 'tenant2.example.com',
      });

      const stats = tenantManager.getAllStatistics();
      expect(stats.totalTenants).toBe(2);
      expect(stats.activeTenants).toBe(2);
    });
  });

  describe('Analytics Engine', () => {
    let analytics;

    beforeEach(() => {
      analytics = new AnalyticsEngine();
    });

    it('should record metric', () => {
      analytics.recordMetric('response_time', 125, { endpoint: '/api/tickets' });

      const metrics = analytics.getPerformanceMetrics();
      expect(metrics.response_time).toBeDefined();
      expect(metrics.response_time.min).toBe(125);
    });

    it('should calculate metric statistics', () => {
      analytics.recordMetric('response_time', 100);
      analytics.recordMetric('response_time', 200);
      analytics.recordMetric('response_time', 300);

      const metrics = analytics.getPerformanceMetrics();
      expect(metrics.response_time.min).toBe(100);
      expect(metrics.response_time.max).toBe(300);
      expect(metrics.response_time.avg).toBe('200.00');
      expect(metrics.response_time.count).toBe(3);
    });

    it('should record event', () => {
      analytics.recordEvent('user_login', { userId: 'user1' });
      analytics.recordEvent('user_logout', { userId: 'user1' });

      expect(analytics.events).toHaveLength(2);
      expect(analytics.events[0].name).toBe('user_login');
    });

    it('should maintain event stream with max 10000 events', () => {
      for (let i = 0; i < 10100; i++) {
        analytics.recordEvent('event', { index: i });
      }

      expect(analytics.events.length).toBeLessThanOrEqual(10000);
    });

    it('should get trending metrics', () => {
      const now = Date.now();

      // Recent metrics
      for (let i = 0; i < 5; i++) {
        analytics.recordMetric('response_time', 100 + i);
      }

      const trends = analytics.getTrendingMetrics(60);
      expect(trends.response_time).toBeDefined();
      expect(trends.response_time.count).toBe(5);
    });

    it('should detect trend direction', () => {
      // Gradually increasing values
      for (let i = 0; i < 10; i++) {
        analytics.recordMetric('response_time', i * 10 + 100);
      }

      const trends = analytics.getTrendingMetrics(600);
      expect(trends.response_time.trend).toBe('up');
    });

    it('should get dashboard summary', () => {
      analytics.recordMetric('response_time', 150);
      analytics.recordEvent('api_call', {});

      const summary = analytics.getDashboardSummary();
      expect(summary.summary).toBeDefined();
      expect(summary.performance).toBeDefined();
    });

    it('should export analytics', () => {
      analytics.recordMetric('response_time', 125);
      analytics.recordEvent('event', {});

      const exported = analytics.exportAnalytics();
      expect(exported.summary).toBeDefined();
      expect(exported.trends).toBeDefined();
      expect(exported.events).toBeDefined();
      expect(exported.timestamp).toBeDefined();
    });
  });

  describe('Custom Middleware System', () => {
    let middleware;

    beforeEach(() => {
      middleware = new CustomMiddlewareSystem();
    });

    it('should register custom validator', () => {
      const validate = () => ({ valid: true });
      middleware.registerValidator('email', validate, 'Email validator');

      const validator = middleware.getValidator('email');
      expect(validator).toBeDefined();
      expect(validator.name).toBe('email');
    });

    it('should execute custom validator', async () => {
      const validate = async (value) => {
        return { valid: value.includes('@') };
      };

      middleware.registerValidator('email', validate);
      const result = await middleware.executeValidator('email', 'test@example.com', {}, {}, {});

      expect(result.valid).toBe(true);
    });

    it('should reject invalid email validator', async () => {
      const validate = async (value) => {
        return { valid: value.includes('@'), error: 'Invalid email' };
      };

      middleware.registerValidator('email', validate);
      const result = await middleware.executeValidator('email', 'invalid', {}, {}, {});

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email');
    });

    it('should register custom middleware', () => {
      const execute = async (data) => ({ ...data, processed: true });
      middleware.registerMiddleware('logger', execute, { order: 10, phase: 'pre' });

      const middlewares = middleware.getMiddleware('pre');
      expect(middlewares).toHaveLength(1);
      expect(middlewares[0].name).toBe('logger');
    });

    it('should execute middleware phase', async () => {
      const execute1 = async (data) => ({ ...data, step1: true });
      const execute2 = async (data) => ({ ...data, step2: true });

      middleware.registerMiddleware('step1', execute1, { order: 10 });
      middleware.registerMiddleware('step2', execute2, { order: 20 });

      const result = await middleware.executePhase('pre', {}, {});
      expect(result.step1).toBe(true);
      expect(result.step2).toBe(true);
    });

    it('should order middlewares correctly', () => {
      middleware.registerMiddleware('third', async (d) => d, { order: 30 });
      middleware.registerMiddleware('first', async (d) => d, { order: 10 });
      middleware.registerMiddleware('second', async (d) => d, { order: 20 });

      const middlewares = middleware.getMiddleware('pre');
      expect(middlewares[0].name).toBe('first');
      expect(middlewares[1].name).toBe('second');
      expect(middlewares[2].name).toBe('third');
    });

    it('should register entity lifecycle hooks', () => {
      const handler = async (record) => record;
      middleware.registerHook('ticket', 'onCreate', handler);

      const hooks = middleware.hooks.get('ticket:onCreate');
      expect(hooks).toHaveLength(1);
    });

    it('should execute entity lifecycle hooks', async () => {
      const handler = async (record) => ({ ...record, created: true });
      middleware.registerHook('ticket', 'onCreate', handler);

      const result = await middleware.executeHooks('ticket', 'onCreate', {}, {});
      expect(result.created).toBe(true);
    });

    it('should define reusable validator', () => {
      middleware.defineValidator('email', {
        type: 'string',
        pattern: '^[a-z0-9+]+@[a-z0-9]+\\.[a-z]+$',
        required: true,
      });

      expect(middleware.getValidator('email')).toBeDefined();
    });

    it('should get middleware statistics', () => {
      middleware.registerValidator('test', async () => ({ valid: true }));
      middleware.registerMiddleware('test', async (d) => d);

      const stats = middleware.getStats();
      expect(stats.validators).toBe(1);
      expect(stats.middlewares).toBe(1);
    });
  });

  describe('View Access Control', () => {
    let viewAccess;

    beforeEach(() => {
      viewAccess = new ViewAccessControl();
    });

    it('should define view access policy', () => {
      viewAccess.defineViewPolicy('ticket_table', {
        entity: 'ticket',
        allowedRoles: ['admin', 'manager'],
        canRead: true,
        canUpdate: true,
        canDelete: false,
      });

      const policy = viewAccess.getPolicy('ticket_table');
      expect(policy).toBeDefined();
      expect(policy.canDelete).toBe(false);
    });

    it('should check view access permission', () => {
      viewAccess.defineViewPolicy('ticket_table', {
        entity: 'ticket',
        allowedRoles: ['admin'],
      });

      const canAccess = viewAccess.canAccessView('ticket_table', { role: 'admin' });
      expect(canAccess).toBe(true);
    });

    it('should deny access for unauthorized role', () => {
      viewAccess.defineViewPolicy('ticket_table', {
        entity: 'ticket',
        allowedRoles: ['admin'],
      });

      const canAccess = viewAccess.canAccessView('ticket_table', { role: 'user' });
      expect(canAccess).toBe(false);
    });

    it('should check action permissions on view', () => {
      viewAccess.defineViewPolicy('ticket_table', {
        entity: 'ticket',
        allowedRoles: ['admin'],
        canCreate: true,
        canDelete: false,
      });

      expect(viewAccess.canPerformAction('ticket_table', 'create', { role: 'admin' })).toBe(true);
      expect(viewAccess.canPerformAction('ticket_table', 'delete', { role: 'admin' })).toBe(false);
    });

    it('should filter visible fields', () => {
      viewAccess.defineViewPolicy('ticket_table', {
        entity: 'ticket',
        allowedFields: ['id', 'title', 'status'],
      });

      const visible = viewAccess.getVisibleFields(
        'ticket_table',
        ['id', 'title', 'status', 'secret'],
        {}
      );

      expect(visible).toEqual(['id', 'title', 'status']);
    });

    it('should restrict field-level access', () => {
      viewAccess.defineViewPolicy('ticket_table', {
        entity: 'ticket',
        fieldRestrictions: {
          priority: { read: true, write: false },
          secret: { read: false, write: false },
        },
      });

      expect(viewAccess.canReadField('ticket_table', 'priority', {})).toBe(true);
      expect(viewAccess.canWriteField('ticket_table', 'priority', {})).toBe(false);
      expect(viewAccess.canReadField('ticket_table', 'secret', {})).toBe(false);
    });

    it('should define role hierarchy', () => {
      viewAccess.defineRoleHierarchy('admin', []);
      viewAccess.defineRoleHierarchy('manager', ['user']);
      viewAccess.defineRoleHierarchy('user', []);

      const roles = viewAccess.getEffectiveRoles('manager');
      expect(roles.has('manager')).toBe(true);
      expect(roles.has('user')).toBe(true);
    });

    it('should define view type permissions', () => {
      viewAccess.defineViewTypeAccess('kanban', ['admin', 'manager']);

      const canUse = viewAccess.canUseViewType('kanban', { role: 'admin' });
      expect(canUse).toBe(true);
    });

    it('should list accessible views for user', async () => {
      viewAccess.defineViewPolicy('view1', {
        entity: 'ticket',
        allowedRoles: ['admin'],
      });

      viewAccess.defineViewPolicy('view2', {
        entity: 'ticket',
        allowedRoles: ['user', 'admin'],
      });

      const accessible = viewAccess.getAccessibleViews('ticket', { role: 'user' });
      expect(accessible).toHaveLength(1);
      expect(accessible[0].viewId).toBe('view2');
    });

    it('should export and import policies', () => {
      viewAccess.defineViewPolicy('test_view', {
        entity: 'ticket',
        allowedRoles: ['admin'],
      });

      const exported = viewAccess.exportPolicies();
      const newAccess = new ViewAccessControl();
      newAccess.importPolicies(exported);

      expect(newAccess.getPolicy('test_view')).toBeDefined();
    });

    it('should get access control statistics', () => {
      viewAccess.defineViewPolicy('view1', { entity: 'ticket', allowedRoles: [] });
      viewAccess.defineViewTypeAccess('table', ['admin']);

      const stats = viewAccess.getStats();
      expect(stats.totalPolicies).toBe(1);
      expect(stats.viewTypePermissions).toBe(1);
    });
  });

  describe('Data Import/Export', () => {
    let importExport;
    let mockAdapter;

    beforeEach(() => {
      mockAdapter = {
        create: async (entity, record) => ({ id: Date.now(), ...record }),
        read: async (entity, id) => null,
        update: async (entity, id, data) => ({ id, ...data }),
        list: async (entity, options) => [],
      };

      importExport = new DataImportExport({ adapter: mockAdapter });
    });

    it('should import records from JSON', async () => {
      const records = [
        { title: 'Record 1', status: 'open' },
        { title: 'Record 2', status: 'closed' },
      ];

      const result = await importExport.importFromJSON('ticket', records);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle empty import', async () => {
      const result = await importExport.importFromJSON('ticket', []);

      expect(result.success).toBe(true);
      expect(result.total).toBe(0);
      expect(result.imported).toBe(0);
    });

    it('should register data transformer', () => {
      const transformer = (record) => ({
        ...record,
        title: record.title.toUpperCase(),
      });

      importExport.registerTransformer('ticket', transformer);

      const registered = importExport.transformers.get('ticket');
      expect(registered).toBeDefined();
    });

    it('should apply transformer during import', async () => {
      const transformer = (record) => ({
        ...record,
        title: `[${record.title}]`,
      });

      importExport.registerTransformer('ticket', transformer);

      const records = [{ title: 'Test' }];
      const result = await importExport.importFromJSON('ticket', records);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
    });

    it('should register validator', () => {
      const validator = (record) => ({
        valid: record.title && record.status,
        errors: !record.title ? ['Title required'] : [],
      });

      importExport.registerValidator('ticket', validator);

      const registered = importExport.validators.get('ticket');
      expect(registered).toBeDefined();
    });

    it('should validate records before import', async () => {
      const validator = (record) => ({
        valid: record.title && record.status,
        errors: [],
      });

      importExport.registerValidator('ticket', validator);

      const records = [
        { title: 'Valid', status: 'open' },
        { title: '', status: 'open' },
      ];

      const result = await importExport.validateRecords('ticket', records);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should export records to JSON', async () => {
      mockAdapter.list = async () => [
        { id: 1, title: 'Record 1' },
        { id: 2, title: 'Record 2' },
      ];

      const json = await importExport.exportToJSON('ticket');
      const records = JSON.parse(json);

      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(2);
    });

    it('should export records to CSV', async () => {
      mockAdapter.list = async () => [
        { id: 1, title: 'Record 1', status: 'open' },
        { id: 2, title: 'Record 2', status: 'closed' },
      ];

      const csv = await importExport.exportToCSV('ticket');
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('title');
    });

    it('should import from CSV', async () => {
      const csv = 'title,status\nRecord 1,open\nRecord 2,closed';

      const result = await importExport.importFromCSV('ticket', csv);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
    });

    it('should generate import template', () => {
      const template = importExport.generateTemplate('ticket', ['title', 'status'], 'json');
      const parsed = JSON.parse(template);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].title).toBe('<title>');
    });

    it('should track import history', async () => {
      const records = [{ title: 'Test', status: 'open' }];
      await importExport.importFromJSON('ticket', records);

      const history = importExport.getImportHistory();
      expect(history).toHaveLength(1);
      expect(history[0].entity).toBe('ticket');
    });

    it('should get import/export statistics', async () => {
      const records = [
        { title: 'Record 1', status: 'open' },
        { title: 'Record 2', status: 'closed' },
      ];

      await importExport.importFromJSON('ticket', records);

      const stats = importExport.getStats();
      expect(stats.totalImports).toBe(1);
      expect(stats.totalRecords).toBe(2);
      expect(stats.totalImported).toBe(2);
    });

    it('should batch import with progress', async () => {
      let progressCalls = 0;
      const onProgress = () => {
        progressCalls++;
      };

      const records = Array(150).fill({ title: 'Test', status: 'open' });

      const result = await importExport.batchImport('ticket', records, {
        batchSize: 50,
        onProgress,
      });

      expect(result.success).toBe(true);
      expect(progressCalls).toBeGreaterThan(0);
    });
  });
});
