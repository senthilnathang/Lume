# Frontend Integration Guide

Complete guide for integrating the Lume framework admin dashboard into the Vue 3 frontend application.

## Overview

The frontend integration brings the admin dashboard into the main Vue 3 application with the following components:

- **AdminDashboard** — Hub interface with tabbed navigation
- **ModulesManagement** — Install, reload, uninstall modules
- **WorkflowsManagement** — View workflows, execute, test, see run history
- **PoliciesManagement** — Create/edit/delete ABAC+RBAC policies
- **PluginsManagement** — Install, enable, disable, uninstall plugins
- **Admin Store (Pinia)** — State management for all admin features

## Architecture

### Admin Routes

All admin routes are nested under `/admin`:

```typescript
GET  /admin                 → AdminDashboard (hub)
GET  /admin/modules         → ModulesManagement
GET  /admin/workflows       → WorkflowsManagement
GET  /admin/policies        → PoliciesManagement
GET  /admin/plugins         → PluginsManagement
```

### Store Structure

**Admin Store** (`src/store/admin.ts`) provides:

```typescript
// State
modules: Module[]                              // List of installed modules
workflows: Workflow[]                          // List of registered workflows
workflowRuns: WorkflowRun[]                   // Execution history
policies: Policy[]                             // ABAC+RBAC policies
plugins: Plugin[]                              // Installed plugins

// Module Actions
fetchModules()                                 // GET /api/admin/modules
getModule(name)                                // GET /api/admin/modules/:name
installModule(name)                            // POST /api/admin/modules/:name/install
uninstallModule(name)                          // DELETE /api/admin/modules/:name
reloadModules()                                // POST /api/admin/modules/reload

// Workflow Actions
fetchWorkflows()                               // GET /api/admin/workflows
getWorkflow(name)                              // GET /api/admin/workflows/:name
executeWorkflow(name, payload)                 // POST /api/admin/workflows/:name/execute
testWorkflow(name, sampleData)                 // POST /api/admin/workflows/:name/test
fetchWorkflowRuns(workflowName?)               // GET /api/admin/workflows/[runs]

// Policy Actions
fetchPolicies()                                // GET /api/admin/policies
getPolicy(name)                                // GET /api/admin/policies/:name
createPolicy(policy)                           // POST /api/admin/policies
updatePolicy(id, policy)                       // PUT /api/admin/policies/:id
deletePolicy(id)                               // DELETE /api/admin/policies/:id
testPolicy(name, context)                      // POST /api/admin/policies/:name/test

// Plugin Actions
fetchPlugins()                                 // GET /api/admin/plugins
installPlugin(manifestPath)                    // POST /api/admin/plugins/install
enablePlugin(name)                             // POST /api/admin/plugins/:name/enable
disablePlugin(name)                            // POST /api/admin/plugins/:name/disable
uninstallPlugin(name)                          // DELETE /api/admin/plugins/:name
```

## Setup Instructions

### 1. Router Configuration

Admin routes are automatically added to `src/router/index.ts`:

```typescript
// Admin dashboard routes
{
  path: 'admin',
  name: 'admin',
  component: () => import('@modules/base/static/views/admin/AdminDashboard.vue'),
  meta: { title: 'Admin Dashboard', requiresAuth: true, permission: 'admin.view' },
},
{
  path: 'admin/modules',
  name: 'admin-modules',
  component: () => import('@modules/base/static/views/admin/ModulesManagement.vue'),
  meta: { title: 'Module Management', requiresAuth: true, permission: 'admin.modules' },
},
// ... other admin routes
```

**Important**: Custom views mapping updated in `customViews` object to support admin paths.

### 2. Store Registration

Admin store is automatically available via Pinia:

```typescript
import { useAdminStore } from '@/store/admin';

export default {
  setup() {
    const adminStore = useAdminStore();
    // Use store...
  },
};
```

### 3. Permission Requirements

Admin dashboard requires specific permissions:

```typescript
'admin.view'       // Access admin dashboard
'admin.modules'    // Manage modules
'admin.workflows'  // Manage workflows
'admin.policies'   // Manage policies
'admin.plugins'    // Manage plugins
```

Set these permissions for admin users via the RBAC module.

## Component Usage

### AdminDashboard

Hub component with tabbed navigation:

```vue
<template>
  <div class="admin-dashboard">
    <a-tabs :items="tabs" v-model:activeKey="activeTab">
      <template #modules>
        <ModulesManagement />
      </template>
      <template #workflows>
        <WorkflowsManagement />
      </template>
      <template #policies>
        <PoliciesManagement />
      </template>
      <template #plugins>
        <PluginsManagement />
      </template>
    </a-tabs>
  </div>
</template>
```

**Usage**: `/admin` route automatically renders this hub.

### ModulesManagement

Module listing and installation:

```vue
<template>
  <div class="modules-management">
    <a-table :columns="columns" :data-source="adminStore.modules" :loading="adminStore.loadingModules">
      <template #name="{ text }">
        <strong>{{ text }}</strong>
      </template>
      <template #action="{ record }">
        <a-button @click="handleInstall(record)">Install</a-button>
        <a-button danger @click="handleUninstall(record)">Uninstall</a-button>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { useAdminStore } from '@/store/admin';

const adminStore = useAdminStore();

onMounted(() => {
  adminStore.fetchModules();
});

const handleInstall = async (module) => {
  await adminStore.installModule(module.name);
  message.success(`${module.name} installed`);
};

const handleUninstall = async (module) => {
  await adminStore.uninstallModule(module.name);
  message.success(`${module.name} uninstalled`);
};
</script>
```

**Features**:
- List all installed modules with version, description
- Install/uninstall modules
- View module dependencies
- Reload all modules at once
- Detailed module information in drawer

### WorkflowsManagement

Workflow management and execution:

```vue
<script setup lang="ts">
import { useAdminStore } from '@/store/admin';
import { message } from 'ant-design-vue';

const adminStore = useAdminStore();

onMounted(() => {
  adminStore.fetchWorkflows();
});

const executeWorkflow = async (workflowName: string) => {
  const result = await adminStore.executeWorkflow(workflowName, {});
  message.success(`Workflow ${workflowName} executed`);
};

const testWorkflow = async (workflowName: string, sampleData: any) => {
  const result = await adminStore.testWorkflow(workflowName, sampleData);
  message.success('Workflow test completed');
};

const viewRunHistory = async (workflowName: string) => {
  await adminStore.fetchWorkflowRuns(workflowName);
};
</script>
```

**Features**:
- List workflows with entity, trigger, step count
- Execute workflows manually
- Test workflows with sample data
- View workflow run history with status and errors
- Filter by entity or status
- Search workflows by name

### PoliciesManagement

ABAC+RBAC policy management:

```vue
<script setup lang="ts">
import { useAdminStore } from '@/store/admin';
import { reactive } from 'vue';

const adminStore = useAdminStore();
const form = reactive({
  name: '',
  entity: '',
  actions: [] as string[],
  conditions: [] as any[],
  roles: [] as string[],
});

onMounted(() => {
  adminStore.fetchPolicies();
});

const createPolicy = async () => {
  await adminStore.createPolicy(form);
  message.success('Policy created');
  form.name = '';
};

const testPolicy = async (policyName: string) => {
  const context = { userId: currentUserId, roleId: currentRoleId };
  const result = await adminStore.testPolicy(policyName, context);
  message.info(`Policy allowed: ${result.allowed}`);
};
</script>
```

**Features**:
- Create/edit/delete ABAC+RBAC policies
- Define conditions with field/operator/value
- Test policy evaluation with context
- Preview affected records
- Syntax highlighting for condition DSL
- Bulk policy import/export

### PluginsManagement

Plugin installation and lifecycle:

```vue
<script setup lang="ts">
import { useAdminStore } from '@/store/admin';

const adminStore = useAdminStore();

onMounted(() => {
  adminStore.fetchPlugins();
});

const installPlugin = async (manifestPath: string) => {
  await adminStore.installPlugin(manifestPath);
  message.success('Plugin installed');
};

const togglePlugin = async (plugin) => {
  if (plugin.enabled) {
    await adminStore.disablePlugin(plugin.name);
  } else {
    await adminStore.enablePlugin(plugin.name);
  }
};

const uninstallPlugin = async (plugin) => {
  await adminStore.uninstallPlugin(plugin.name);
  message.success('Plugin uninstalled');
};
</script>
```

**Features**:
- Grid of installed plugins with status
- Install plugins via manifest path
- Enable/disable plugins without reinstall
- Uninstall plugins with confirmation
- View plugin dependencies and compatibility
- Check plugin health status

## API Integration

### Backend Endpoints

Admin controllers provide REST endpoints:

#### Modules

```
GET    /api/admin/modules                    # List all modules
GET    /api/admin/modules/:name              # Get module details
POST   /api/admin/modules/:name/install      # Install module
DELETE /api/admin/modules/:name              # Uninstall module
POST   /api/admin/modules/reload             # Reload all modules
```

#### Workflows

```
GET    /api/admin/workflows                  # List all workflows
GET    /api/admin/workflows/:name            # Get workflow details
POST   /api/admin/workflows/:name/execute    # Execute workflow
POST   /api/admin/workflows/:name/test       # Test with sample data
GET    /api/admin/workflows/runs             # Get all runs
GET    /api/admin/workflows/:name/runs       # Get runs for specific workflow
```

#### Policies

```
GET    /api/admin/policies                   # List all policies
GET    /api/admin/policies/:name             # Get policy details
POST   /api/admin/policies                   # Create policy
PUT    /api/admin/policies/:id               # Update policy
DELETE /api/admin/policies/:id               # Delete policy
POST   /api/admin/policies/:name/test        # Test policy evaluation
```

#### Plugins

```
GET    /api/admin/plugins                    # List all plugins
POST   /api/admin/plugins/install            # Install plugin
POST   /api/admin/plugins/:name/enable       # Enable plugin
POST   /api/admin/plugins/:name/disable      # Disable plugin
DELETE /api/admin/plugins/:name              # Uninstall plugin
```

### Response Examples

**Module Response**:
```json
{
  "id": 1,
  "name": "crm",
  "displayName": "CRM Module",
  "version": "1.0.0",
  "description": "Complete CRM with leads, contacts, opportunities",
  "depends": ["base"],
  "status": "loaded",
  "installed_at": "2026-04-29T10:00:00Z"
}
```

**Workflow Response**:
```json
{
  "id": 1,
  "name": "lead-assignment",
  "version": "1.0.0",
  "entity": "Lead",
  "trigger": {
    "type": "record.created"
  },
  "steps": 3,
  "status": "active",
  "createdAt": "2026-04-29T10:00:00Z"
}
```

**Policy Response**:
```json
{
  "id": 1,
  "name": "lead-viewer-policy",
  "entity": "Lead",
  "actions": ["read"],
  "conditions": [
    {
      "field": "owner",
      "operator": "==",
      "value": "$userId"
    }
  ],
  "deny": false,
  "createdAt": "2026-04-29T10:00:00Z"
}
```

## Accessing Admin Dashboard

### Direct Navigation

From the frontend application:

```typescript
// Programmatic navigation
router.push({ name: 'admin' });
router.push({ name: 'admin-modules' });
router.push({ name: 'admin-workflows' });
router.push({ name: 'admin-policies' });
router.push({ name: 'admin-plugins' });
```

### URL Access

Direct URLs:

```
http://localhost:3000/admin                 # Hub
http://localhost:3000/admin/modules         # Modules
http://localhost:3000/admin/workflows       # Workflows
http://localhost:3000/admin/policies        # Policies
http://localhost:3000/admin/plugins         # Plugins
```

### Permissions

All admin routes require specific permissions. Assign to admin users:

```typescript
// Backend: grant permissions to admin role
const adminRole = await roleService.findByName('admin');
adminRole.permissions.push('admin.view', 'admin.modules', 'admin.workflows', 'admin.policies', 'admin.plugins');
await roleService.update(adminRole);
```

## Error Handling

Store provides error state accessible from components:

```typescript
const adminStore = useAdminStore();

watch(() => adminStore.error, (error) => {
  if (error) {
    message.error(error);
  }
});
```

Common errors:

| Error | Cause | Resolution |
|-------|-------|-----------|
| "Network error" | API unreachable | Check backend is running |
| "Not authorized" | Missing permission | Grant admin permissions |
| "Module not found" | Module doesn't exist | Check module name |
| "Circular dependency" | Module dependencies circular | Fix module definitions |
| "Invalid policy" | Malformed policy definition | Check conditions syntax |

## Performance Considerations

### Loading

Admin store lazy-loads data:

```typescript
// First fetch triggers API call
await adminStore.fetchModules();

// Subsequent accesses use cached data
const modules = adminStore.modules;
```

### Pagination

Large result sets support pagination:

```typescript
// In WorkflowsManagement
const getWorkflows = async (page = 1, limit = 25) => {
  const data = await api.get('/api/admin/workflows', { page, limit });
};
```

### Real-time Updates

Use polling for workflow run status:

```typescript
// Poll every 5 seconds
const pollInterval = setInterval(() => {
  adminStore.fetchWorkflowRuns();
}, 5000);

onBeforeUnmount(() => clearInterval(pollInterval));
```

## Testing

Integration tests verify admin store functionality:

```bash
npm run test -- src/__tests__/integration/admin-dashboard.integration.test.ts
```

Test coverage:

- Module CRUD operations
- Workflow execution and testing
- Policy CRUD and evaluation
- Plugin lifecycle
- Error handling
- Concurrent operations

## Migration from Backend-Only Admin

If you had backend-only admin endpoints, the frontend now provides:

1. **Unified Dashboard** — Single entry point for all admin features
2. **Rich UI** — Tables, forms, modals, drawers for better UX
3. **Store State** — Client-side caching and state management
4. **Real-time Feedback** — Loading states, error messages, success notifications
5. **Responsive Design** — Works on desktop and mobile

No backend changes needed — frontend simply consumes existing endpoints.

## Troubleshooting

### Admin routes not loading

**Problem**: Routes return 404 or show wrong component

**Solution**: Verify custom views mapping in router:

```typescript
const customViews: Record<string, () => Promise<any>> = {
  'admin': () => import('@modules/base/static/views/admin/AdminDashboard.vue'),
  'admin/modules': () => import('@modules/base/static/views/admin/ModulesManagement.vue'),
  // ... all admin views
};
```

### API calls fail with 403

**Problem**: "Not authorized" errors

**Solution**: Add required permissions to admin role:

```typescript
// Grant permissions
user.role.permissions = [
  'admin.view',
  'admin.modules',
  'admin.workflows',
  'admin.policies',
  'admin.plugins',
];
```

### Store not reactive

**Problem**: Component doesn't update when store changes

**Solution**: Use proper Pinia state access:

```typescript
// ✓ Correct
const { modules } = storeToRefs(adminStore);

// ✗ Incorrect
const modules = adminStore.modules;  // loses reactivity
```

### Slow performance on large datasets

**Problem**: Admin dashboard is slow with many modules/workflows

**Solution**: Implement pagination and filtering:

```typescript
// Filter before display
const filteredWorkflows = computed(() => {
  return adminStore.workflows.filter(w => w.entity === selectedEntity);
});

// Paginate results
const paginatedWorkflows = computed(() => {
  const start = (currentPage - 1) * pageSize;
  return filteredWorkflows.value.slice(start, start + pageSize);
});
```

## Next Steps

1. **Deploy** — Push frontend changes to production
2. **Verify** — Test all admin features work end-to-end
3. **Document** — Update internal docs with admin dashboard URLs
4. **Train** — Show admins how to use dashboard features
5. **Monitor** — Watch for errors in production admin usage

## Resources

- [Admin Dashboard OpenAPI Spec](../openapi/framework.openapi.yaml)
- [Backend Admin Controllers](../src/modules/base/controllers/)
- [Admin Store Source](./src/store/admin.ts)
- [Integration Tests](./src/__tests__/integration/admin-dashboard.integration.test.ts)
