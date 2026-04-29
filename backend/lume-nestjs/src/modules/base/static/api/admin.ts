import { get, post, put, del } from '@/api/request';

// Modules API
export const adminModulesApi = {
  list: () => get('/api/admin/modules'),
  get: (moduleName: string) => get(`/api/admin/modules/${moduleName}`),
  install: (moduleName: string, manifestPath: string) =>
    post(`/api/admin/modules/${moduleName}/install`, { manifestPath }),
  uninstall: (moduleName: string) => del(`/api/admin/modules/${moduleName}`),
  reload: (moduleName: string) => post(`/api/admin/modules/${moduleName}/reload`, {}),
};

// Workflows API
export const adminWorkflowsApi = {
  list: () => get('/api/admin/workflows'),
  get: (workflowName: string) => get(`/api/admin/workflows/${workflowName}`),
  execute: (workflowName: string, recordId: number, data?: Record<string, any>) =>
    post(`/api/admin/workflows/${workflowName}/execute`, { recordId, data }),
  test: (workflowName: string, sampleData: Record<string, any>) =>
    get(`/api/admin/workflows/test/${workflowName}`, { sampleData }),
  listRuns: (workflowName: string) => get(`/api/admin/workflows/runs/${workflowName}`),
  saveVersion: (workflowName: string, note?: string) =>
    post(`/api/admin/workflows/versions/${workflowName}`, { note }),
};

// Policies API
export const adminPoliciesApi = {
  list: () => get('/api/admin/policies'),
  get: (policyName: string) => get(`/api/admin/policies/${policyName}`),
  create: (policy: Record<string, any>) => post('/api/admin/policies', policy),
  update: (policyName: string, updates: Record<string, any>) =>
    put(`/api/admin/policies/${policyName}`, updates),
  delete: (policyName: string) => del(`/api/admin/policies/${policyName}`),
  test: (policyName: string, userId: number, roleId: number, action: string, companyId?: number) =>
    post('/api/admin/policies/test', { policyName, userId, roleId, companyId, action }),
  getForEntity: (entityName: string) => get(`/api/admin/policies/entity/${entityName}`),
};

// Plugins API
export const adminPluginsApi = {
  list: () => get('/api/admin/plugins'),
  get: (pluginName: string) => get(`/api/admin/plugins/${pluginName}`),
  install: (manifestPath: string) => post('/api/admin/plugins/install', { manifestPath }),
  enable: (pluginName: string) => post(`/api/admin/plugins/${pluginName}/enable`, {}),
  disable: (pluginName: string) => post(`/api/admin/plugins/${pluginName}/disable`, {}),
  uninstall: (pluginName: string) => del(`/api/admin/plugins/${pluginName}`),
  checkCompatibility: (pluginName: string) =>
    post('/api/admin/plugins/check-compatibility', { pluginName }),
  getAvailable: () => get('/api/admin/plugins/marketplace/available'),
};

export default {
  modules: adminModulesApi,
  workflows: adminWorkflowsApi,
  policies: adminPoliciesApi,
  plugins: adminPluginsApi,
};
