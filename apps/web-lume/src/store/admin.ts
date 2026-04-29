import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import api from '@/api/request';

/**
 * Admin Store
 * Manages framework admin features: modules, workflows, policies, plugins
 */

export interface Module {
  id: number;
  name: string;
  displayName?: string;
  version: string;
  description?: string;
  depends?: string[];
  installed_at?: string;
  status: 'loaded' | 'error' | 'pending';
}

export interface Workflow {
  id: number;
  name: string;
  version: string;
  entity: string;
  trigger: {
    type: 'record.created' | 'record.updated' | 'record.deleted' | 'schedule' | 'manual' | 'field_changed';
    cron?: string;
  };
  steps: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface WorkflowRun {
  id: number;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface Policy {
  id: number;
  name: string;
  entity: string;
  actions: string[];
  conditions?: Array<{ field: string; operator: string; value: string }>;
  roles?: string[];
  deny: boolean;
  createdAt: string;
}

export interface Plugin {
  id: number;
  name: string;
  displayName: string;
  version: string;
  enabled: boolean;
  installedAt: string;
}

export const useAdminStore = defineStore('admin', () => {
  // State
  const modules = ref<Module[]>([]);
  const workflows = ref<Workflow[]>([]);
  const workflowRuns = ref<WorkflowRun[]>([]);
  const policies = ref<Policy[]>([]);
  const plugins = ref<Plugin[]>([]);

  const loadingModules = ref(false);
  const loadingWorkflows = ref(false);
  const loadingPolicies = ref(false);
  const loadingPlugins = ref(false);

  const selectedModule = reactive<Partial<Module>>({});
  const selectedWorkflow = reactive<Partial<Workflow>>({});
  const selectedPolicy = reactive<Partial<Policy>>({});
  const selectedPlugin = reactive<Partial<Plugin>>({});

  const error = ref<string | null>(null);

  // Module Actions
  async function fetchModules() {
    try {
      loadingModules.value = true;
      error.value = null;
      const data = await api.get('/api/admin/modules');
      modules.value = data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch modules';
      console.error('Fetch modules error:', err);
    } finally {
      loadingModules.value = false;
    }
  }

  async function getModule(name: string) {
    try {
      loadingModules.value = true;
      error.value = null;
      const data = await api.get(`/api/admin/modules/${name}`);
      Object.assign(selectedModule, data);
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch module';
      throw err;
    } finally {
      loadingModules.value = false;
    }
  }

  async function installModule(name: string) {
    try {
      loadingModules.value = true;
      error.value = null;
      const data = await api.post(`/api/admin/modules/${name}/install`, {});
      await fetchModules();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to install module';
      throw err;
    } finally {
      loadingModules.value = false;
    }
  }

  async function uninstallModule(name: string) {
    try {
      loadingModules.value = true;
      error.value = null;
      await api.delete(`/api/admin/modules/${name}`);
      await fetchModules();
    } catch (err: any) {
      error.value = err.message || 'Failed to uninstall module';
      throw err;
    } finally {
      loadingModules.value = false;
    }
  }

  async function reloadModules() {
    try {
      loadingModules.value = true;
      error.value = null;
      const data = await api.post('/api/admin/modules/reload', {});
      modules.value = data;
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to reload modules';
      throw err;
    } finally {
      loadingModules.value = false;
    }
  }

  // Workflow Actions
  async function fetchWorkflows() {
    try {
      loadingWorkflows.value = true;
      error.value = null;
      const data = await api.get('/api/admin/workflows');
      workflows.value = data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch workflows';
      console.error('Fetch workflows error:', err);
    } finally {
      loadingWorkflows.value = false;
    }
  }

  async function getWorkflow(name: string) {
    try {
      loadingWorkflows.value = true;
      error.value = null;
      const data = await api.get(`/api/admin/workflows/${name}`);
      Object.assign(selectedWorkflow, data);
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch workflow';
      throw err;
    } finally {
      loadingWorkflows.value = false;
    }
  }

  async function executeWorkflow(name: string, payload: any = {}) {
    try {
      loadingWorkflows.value = true;
      error.value = null;
      const data = await api.post(`/api/admin/workflows/${name}/execute`, payload);
      await fetchWorkflows();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to execute workflow';
      throw err;
    } finally {
      loadingWorkflows.value = false;
    }
  }

  async function testWorkflow(name: string, sampleData: any) {
    try {
      loadingWorkflows.value = true;
      error.value = null;
      const data = await api.post(`/api/admin/workflows/${name}/test`, { sampleData });
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to test workflow';
      throw err;
    } finally {
      loadingWorkflows.value = false;
    }
  }

  async function fetchWorkflowRuns(workflowName?: string) {
    try {
      loadingWorkflows.value = true;
      error.value = null;
      const url = workflowName
        ? `/api/admin/workflows/${workflowName}/runs`
        : '/api/admin/workflows/runs';
      const data = await api.get(url);
      workflowRuns.value = data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch workflow runs';
      console.error('Fetch workflow runs error:', err);
    } finally {
      loadingWorkflows.value = false;
    }
  }

  // Policy Actions
  async function fetchPolicies() {
    try {
      loadingPolicies.value = true;
      error.value = null;
      const data = await api.get('/api/admin/policies');
      policies.value = data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch policies';
      console.error('Fetch policies error:', err);
    } finally {
      loadingPolicies.value = false;
    }
  }

  async function getPolicy(name: string) {
    try {
      loadingPolicies.value = true;
      error.value = null;
      const data = await api.get(`/api/admin/policies/${name}`);
      Object.assign(selectedPolicy, data);
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch policy';
      throw err;
    } finally {
      loadingPolicies.value = false;
    }
  }

  async function createPolicy(policy: Partial<Policy>) {
    try {
      loadingPolicies.value = true;
      error.value = null;
      const data = await api.post('/api/admin/policies', policy);
      await fetchPolicies();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to create policy';
      throw err;
    } finally {
      loadingPolicies.value = false;
    }
  }

  async function updatePolicy(id: number, policy: Partial<Policy>) {
    try {
      loadingPolicies.value = true;
      error.value = null;
      const data = await api.put(`/api/admin/policies/${id}`, policy);
      await fetchPolicies();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to update policy';
      throw err;
    } finally {
      loadingPolicies.value = false;
    }
  }

  async function deletePolicy(id: number) {
    try {
      loadingPolicies.value = true;
      error.value = null;
      await api.delete(`/api/admin/policies/${id}`);
      await fetchPolicies();
    } catch (err: any) {
      error.value = err.message || 'Failed to delete policy';
      throw err;
    } finally {
      loadingPolicies.value = false;
    }
  }

  async function testPolicy(policyName: string, context: any) {
    try {
      loadingPolicies.value = true;
      error.value = null;
      const data = await api.post(`/api/admin/policies/${policyName}/test`, { context });
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to test policy';
      throw err;
    } finally {
      loadingPolicies.value = false;
    }
  }

  // Plugin Actions
  async function fetchPlugins() {
    try {
      loadingPlugins.value = true;
      error.value = null;
      const data = await api.get('/api/admin/plugins');
      plugins.value = data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch plugins';
      console.error('Fetch plugins error:', err);
    } finally {
      loadingPlugins.value = false;
    }
  }

  async function installPlugin(manifestPath: string) {
    try {
      loadingPlugins.value = true;
      error.value = null;
      const data = await api.post('/api/admin/plugins/install', { manifestPath });
      await fetchPlugins();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to install plugin';
      throw err;
    } finally {
      loadingPlugins.value = false;
    }
  }

  async function enablePlugin(name: string) {
    try {
      loadingPlugins.value = true;
      error.value = null;
      const data = await api.post(`/api/admin/plugins/${name}/enable`, {});
      await fetchPlugins();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to enable plugin';
      throw err;
    } finally {
      loadingPlugins.value = false;
    }
  }

  async function disablePlugin(name: string) {
    try {
      loadingPlugins.value = true;
      error.value = null;
      const data = await api.post(`/api/admin/plugins/${name}/disable`, {});
      await fetchPlugins();
      return data;
    } catch (err: any) {
      error.value = err.message || 'Failed to disable plugin';
      throw err;
    } finally {
      loadingPlugins.value = false;
    }
  }

  async function uninstallPlugin(name: string) {
    try {
      loadingPlugins.value = true;
      error.value = null;
      await api.delete(`/api/admin/plugins/${name}`);
      await fetchPlugins();
    } catch (err: any) {
      error.value = err.message || 'Failed to uninstall plugin';
      throw err;
    } finally {
      loadingPlugins.value = false;
    }
  }

  // Reset
  function reset() {
    modules.value = [];
    workflows.value = [];
    workflowRuns.value = [];
    policies.value = [];
    plugins.value = [];
    error.value = null;
    Object.assign(selectedModule, {});
    Object.assign(selectedWorkflow, {});
    Object.assign(selectedPolicy, {});
    Object.assign(selectedPlugin, {});
  }

  return {
    // State
    modules,
    workflows,
    workflowRuns,
    policies,
    plugins,
    loadingModules,
    loadingWorkflows,
    loadingPolicies,
    loadingPlugins,
    selectedModule,
    selectedWorkflow,
    selectedPolicy,
    selectedPlugin,
    error,
    // Module Actions
    fetchModules,
    getModule,
    installModule,
    uninstallModule,
    reloadModules,
    // Workflow Actions
    fetchWorkflows,
    getWorkflow,
    executeWorkflow,
    testWorkflow,
    fetchWorkflowRuns,
    // Policy Actions
    fetchPolicies,
    getPolicy,
    createPolicy,
    updatePolicy,
    deletePolicy,
    testPolicy,
    // Plugin Actions
    fetchPlugins,
    installPlugin,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
    // Utilities
    reset,
  };
});
