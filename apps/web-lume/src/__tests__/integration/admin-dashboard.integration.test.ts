/**
 * Admin Dashboard Integration Tests
 * Tests admin store, API interactions, and admin routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAdminStore } from '@/store/admin';
import api from '@/api/request';

// Mock API
vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = api as any;

describe('Admin Dashboard Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Module Management', () => {
    it('should fetch all modules', async () => {
      const adminStore = useAdminStore();
      const mockModules = [
        { id: 1, name: 'crm', displayName: 'CRM', version: '1.0.0', status: 'loaded' },
        { id: 2, name: 'ecommerce', displayName: 'E-Commerce', version: '1.0.0', status: 'loaded' },
        { id: 3, name: 'project-management', displayName: 'Project Management', version: '1.0.0', status: 'loaded' },
      ];

      mockApi.get.mockResolvedValueOnce(mockModules);

      await adminStore.fetchModules();

      expect(mockApi.get).toHaveBeenCalledWith('/api/admin/modules');
      expect(adminStore.modules).toEqual(mockModules);
    });

    it('should get specific module details', async () => {
      const adminStore = useAdminStore();
      const mockModule = {
        id: 1,
        name: 'crm',
        displayName: 'CRM',
        version: '1.0.0',
        description: 'Complete CRM module',
        depends: ['base'],
        status: 'loaded',
        installed_at: new Date().toISOString(),
      };

      mockApi.get.mockResolvedValueOnce(mockModule);

      const result = await adminStore.getModule('crm');

      expect(mockApi.get).toHaveBeenCalledWith('/api/admin/modules/crm');
      expect(adminStore.selectedModule).toEqual(mockModule);
      expect(result).toEqual(mockModule);
    });

    it('should install a module', async () => {
      const adminStore = useAdminStore();
      const mockModules = [
        { id: 1, name: 'custom-plugin', version: '1.0.0', status: 'loaded' },
      ];

      mockApi.post.mockResolvedValueOnce({ status: 'installed' });
      mockApi.get.mockResolvedValueOnce(mockModules);

      const result = await adminStore.installModule('custom-plugin');

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/modules/custom-plugin/install', {});
      expect(result).toEqual({ status: 'installed' });
    });

    it('should uninstall a module', async () => {
      const adminStore = useAdminStore();
      const mockModules = [];

      mockApi.delete.mockResolvedValueOnce(undefined);
      mockApi.get.mockResolvedValueOnce(mockModules);

      await adminStore.uninstallModule('custom-plugin');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/admin/modules/custom-plugin');
    });

    it('should reload all modules', async () => {
      const adminStore = useAdminStore();
      const mockModules = [
        { id: 1, name: 'crm', version: '1.0.0', status: 'loaded' },
      ];

      mockApi.post.mockResolvedValueOnce(mockModules);

      const result = await adminStore.reloadModules();

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/modules/reload', {});
      expect(adminStore.modules).toEqual(mockModules);
    });
  });

  describe('Workflow Management', () => {
    it('should fetch all workflows', async () => {
      const adminStore = useAdminStore();
      const mockWorkflows = [
        {
          id: 1,
          name: 'lead-assignment',
          version: '1.0.0',
          entity: 'Lead',
          trigger: { type: 'record.created' as const },
          steps: 3,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'lead-scoring',
          version: '1.0.0',
          entity: 'Lead',
          trigger: { type: 'field_changed' as const },
          steps: 2,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
        },
      ];

      mockApi.get.mockResolvedValueOnce(mockWorkflows);

      await adminStore.fetchWorkflows();

      expect(mockApi.get).toHaveBeenCalledWith('/api/admin/workflows');
      expect(adminStore.workflows).toEqual(mockWorkflows);
    });

    it('should execute a workflow', async () => {
      const adminStore = useAdminStore();
      const mockWorkflows = [{ id: 1, name: 'lead-assignment', version: '1.0.0', entity: 'Lead', trigger: { type: 'record.created' as const }, steps: 3, status: 'active' as const, createdAt: new Date().toISOString() }];

      mockApi.post.mockResolvedValueOnce({ status: 'completed' });
      mockApi.get.mockResolvedValueOnce(mockWorkflows);

      const result = await adminStore.executeWorkflow('lead-assignment', { recordId: 1 });

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/workflows/lead-assignment/execute', { recordId: 1 });
      expect(result).toEqual({ status: 'completed' });
    });

    it('should test a workflow with sample data', async () => {
      const adminStore = useAdminStore();
      const sampleData = { status: 'interested', leadScore: 50 };

      mockApi.post.mockResolvedValueOnce({ success: true, output: { leadScore: 75 } });

      const result = await adminStore.testWorkflow('lead-scoring', sampleData);

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/workflows/lead-scoring/test', { sampleData });
      expect(result).toEqual({ success: true, output: { leadScore: 75 } });
    });

    it('should fetch workflow run history', async () => {
      const adminStore = useAdminStore();
      const mockRuns = [
        {
          id: 1,
          workflowName: 'lead-assignment',
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        {
          id: 2,
          workflowName: 'lead-assignment',
          status: 'failed' as const,
          startedAt: new Date().toISOString(),
          errorMessage: 'Workflow timeout',
        },
      ];

      mockApi.get.mockResolvedValueOnce(mockRuns);

      await adminStore.fetchWorkflowRuns('lead-assignment');

      expect(mockApi.get).toHaveBeenCalledWith('/api/admin/workflows/lead-assignment/runs');
      expect(adminStore.workflowRuns).toEqual(mockRuns);
    });
  });

  describe('Policy Management', () => {
    it('should fetch all policies', async () => {
      const adminStore = useAdminStore();
      const mockPolicies = [
        {
          id: 1,
          name: 'lead-viewer-policy',
          entity: 'Lead',
          actions: ['read'],
          conditions: [{ field: 'owner', operator: '==', value: '$userId' }],
          deny: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'admin-all-access',
          entity: '*',
          actions: ['*'],
          roles: ['admin'],
          deny: false,
          createdAt: new Date().toISOString(),
        },
      ];

      mockApi.get.mockResolvedValueOnce(mockPolicies);

      await adminStore.fetchPolicies();

      expect(mockApi.get).toHaveBeenCalledWith('/api/admin/policies');
      expect(adminStore.policies).toEqual(mockPolicies);
    });

    it('should create a new policy', async () => {
      const adminStore = useAdminStore();
      const newPolicy = {
        name: 'custom-policy',
        entity: 'Opportunity',
        actions: ['read', 'write'],
        conditions: [{ field: 'status', operator: '!=', value: 'closed' }],
        deny: false,
      };

      mockApi.post.mockResolvedValueOnce({ id: 3, ...newPolicy, createdAt: new Date().toISOString() });
      mockApi.get.mockResolvedValueOnce([]);

      const result = await adminStore.createPolicy(newPolicy);

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/policies', newPolicy);
      expect(result).toHaveProperty('id');
    });

    it('should update an existing policy', async () => {
      const adminStore = useAdminStore();
      const updatedPolicy = {
        actions: ['read', 'write', 'delete'],
      };

      mockApi.put.mockResolvedValueOnce({ id: 1, ...updatedPolicy });
      mockApi.get.mockResolvedValueOnce([]);

      const result = await adminStore.updatePolicy(1, updatedPolicy);

      expect(mockApi.put).toHaveBeenCalledWith('/api/admin/policies/1', updatedPolicy);
      expect(result).toHaveProperty('actions');
    });

    it('should delete a policy', async () => {
      const adminStore = useAdminStore();

      mockApi.delete.mockResolvedValueOnce(undefined);
      mockApi.get.mockResolvedValueOnce([]);

      await adminStore.deletePolicy(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/api/admin/policies/1');
    });

    it('should test policy evaluation with context', async () => {
      const adminStore = useAdminStore();
      const testContext = {
        userId: 123,
        roleId: 1,
        companyId: 456,
      };

      mockApi.post.mockResolvedValueOnce({ allowed: true, reason: 'User is owner' });

      const result = await adminStore.testPolicy('lead-viewer-policy', testContext);

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/policies/lead-viewer-policy/test', { context: testContext });
      expect(result).toEqual({ allowed: true, reason: 'User is owner' });
    });
  });

  describe('Plugin Management', () => {
    it('should fetch all installed plugins', async () => {
      const adminStore = useAdminStore();
      const mockPlugins = [
        { id: 1, name: 'plugin-crm-pro', displayName: 'CRM Pro', version: '2.0.0', enabled: true, installedAt: new Date().toISOString() },
        { id: 2, name: 'plugin-analytics', displayName: 'Analytics', version: '1.5.0', enabled: false, installedAt: new Date().toISOString() },
      ];

      mockApi.get.mockResolvedValueOnce(mockPlugins);

      await adminStore.fetchPlugins();

      expect(mockApi.get).toHaveBeenCalledWith('/api/admin/plugins');
      expect(adminStore.plugins).toEqual(mockPlugins);
    });

    it('should install a plugin', async () => {
      const adminStore = useAdminStore();
      const mockPlugins = [{ id: 1, name: 'new-plugin', displayName: 'New Plugin', version: '1.0.0', enabled: true, installedAt: new Date().toISOString() }];

      mockApi.post.mockResolvedValueOnce({ status: 'installed' });
      mockApi.get.mockResolvedValueOnce(mockPlugins);

      const result = await adminStore.installPlugin('/path/to/plugin-manifest.json');

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/plugins/install', { manifestPath: '/path/to/plugin-manifest.json' });
      expect(result).toEqual({ status: 'installed' });
    });

    it('should enable a plugin', async () => {
      const adminStore = useAdminStore();
      const mockPlugins = [{ id: 1, name: 'plugin-analytics', displayName: 'Analytics', version: '1.5.0', enabled: true, installedAt: new Date().toISOString() }];

      mockApi.post.mockResolvedValueOnce({ status: 'enabled' });
      mockApi.get.mockResolvedValueOnce(mockPlugins);

      const result = await adminStore.enablePlugin('plugin-analytics');

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/plugins/plugin-analytics/enable', {});
      expect(result).toEqual({ status: 'enabled' });
    });

    it('should disable a plugin', async () => {
      const adminStore = useAdminStore();
      const mockPlugins = [{ id: 1, name: 'plugin-analytics', displayName: 'Analytics', version: '1.5.0', enabled: false, installedAt: new Date().toISOString() }];

      mockApi.post.mockResolvedValueOnce({ status: 'disabled' });
      mockApi.get.mockResolvedValueOnce(mockPlugins);

      const result = await adminStore.disablePlugin('plugin-analytics');

      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/plugins/plugin-analytics/disable', {});
      expect(result).toEqual({ status: 'disabled' });
    });

    it('should uninstall a plugin', async () => {
      const adminStore = useAdminStore();
      const mockPlugins = [];

      mockApi.delete.mockResolvedValueOnce(undefined);
      mockApi.get.mockResolvedValueOnce(mockPlugins);

      await adminStore.uninstallPlugin('plugin-analytics');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/admin/plugins/plugin-analytics');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch modules error', async () => {
      const adminStore = useAdminStore();
      const error = new Error('Network error');

      mockApi.get.mockRejectedValueOnce(error);

      await adminStore.fetchModules();

      expect(adminStore.error).toBe('Network error');
      expect(adminStore.modules).toEqual([]);
    });

    it('should handle policy creation error', async () => {
      const adminStore = useAdminStore();
      const error = new Error('Invalid policy definition');

      mockApi.post.mockRejectedValueOnce(error);

      try {
        await adminStore.createPolicy({ name: 'invalid', entity: '', actions: [] });
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(adminStore.error).toBe('Invalid policy definition');
    });

    it('should handle workflow test error', async () => {
      const adminStore = useAdminStore();
      const error = new Error('Workflow not found');

      mockApi.post.mockRejectedValueOnce(error);

      try {
        await adminStore.testWorkflow('nonexistent-workflow', {});
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(adminStore.error).toBe('Workflow not found');
    });
  });

  describe('Store Reset', () => {
    it('should reset all state', async () => {
      const adminStore = useAdminStore();

      mockApi.get.mockResolvedValueOnce([{ id: 1, name: 'test-module', version: '1.0.0', status: 'loaded' }]);
      await adminStore.fetchModules();

      expect(adminStore.modules.length).toBeGreaterThan(0);

      adminStore.reset();

      expect(adminStore.modules).toEqual([]);
      expect(adminStore.workflows).toEqual([]);
      expect(adminStore.policies).toEqual([]);
      expect(adminStore.plugins).toEqual([]);
      expect(adminStore.error).toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent fetch operations', async () => {
      const adminStore = useAdminStore();

      mockApi.get.mockResolvedValueOnce([{ id: 1, name: 'test-module', version: '1.0.0', status: 'loaded' }]);
      mockApi.get.mockResolvedValueOnce([{ id: 1, name: 'test-workflow', version: '1.0.0', entity: 'Test', trigger: { type: 'record.created' as const }, steps: 1, status: 'active' as const, createdAt: new Date().toISOString() }]);
      mockApi.get.mockResolvedValueOnce([{ id: 1, name: 'test-policy', entity: 'Test', actions: ['read'], deny: false, createdAt: new Date().toISOString() }]);

      await Promise.all([
        adminStore.fetchModules(),
        adminStore.fetchWorkflows(),
        adminStore.fetchPolicies(),
      ]);

      expect(adminStore.modules.length).toBeGreaterThan(0);
      expect(adminStore.workflows.length).toBeGreaterThan(0);
      expect(adminStore.policies.length).toBeGreaterThan(0);
    });
  });
});
