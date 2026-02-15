# Lume Frontend Development Guide

## Component Patterns

### Module View Location

All module-specific frontend code lives inside the backend module directory, not in the frontend `src/views/` directory.

```
# CORRECT - Module views in backend
backend/src/modules/activities/static/views/index.vue
backend/src/modules/activities/static/views/upcoming.vue
backend/src/modules/activities/static/api/index.ts

# WRONG - Do NOT put module views in frontend
frontend/apps/web-lume/src/views/activities/index.vue    # Never do this
```

Import module views using the `@modules` Vite alias:

```typescript
import ActivitiesIndex from '@modules/activities/static/views/index.vue'
import { fetchActivities } from '@modules/activities/static/api/index'
```

### What Stays in Frontend `src/`

Core shared code that is not module-specific:

| Directory         | Purpose                                     |
|-------------------|---------------------------------------------|
| `src/api/`        | Axios instance and `request.ts` helpers     |
| `src/store/`      | Pinia stores (auth, permission)             |
| `src/router/`     | Router config, guards, customViews registry |
| `src/layouts/`    | BasicLayout (Sidebar + Header + Content)    |
| `src/components/` | Shared components (DataTable, ModuleView)   |
| `src/composables/`| Reusable composition functions              |
| `src/views/_core/`| Login, 404, 403 pages                       |
| `src/views/dashboard/` | Dashboard view                         |

## View Pattern

All module views follow a consistent structure:

```
+----------------------------------------------------------+
| [Icon]  Page Title                    [+ New] [Export]    |  <-- Header
+----------------------------------------------------------+
| [Stat Card 1] [Stat Card 2] [Stat Card 3] [Stat Card 4] |  <-- Stats Row
+----------------------------------------------------------+
| [Search...]  [Status ▾]  [Date Range]  [Clear Filters]   |  <-- Filter Bar
+----------------------------------------------------------+
| # | Name        | Status   | Created    | Actions        |  <-- Table
| 1 | Item One    | Active   | 2024-01-15 | [Edit] [Del]   |
| 2 | Item Two    | Draft    | 2024-01-14 | [Edit] [Del]   |
|   ...                                                     |
|                    < 1 2 3 4 5 >                          |  <-- Pagination
+----------------------------------------------------------+
```

When a row action is triggered, a drawer or modal slides in for create/edit forms.

## Adding a New Module View

### Step 1: Create the Vue SFC

Create the view file inside the backend module's `static/views/` directory:

```
backend/src/modules/{module_name}/static/views/my-view.vue
```

```vue
<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <FileText class="w-6 h-6 text-primary" />
        <h1 class="text-2xl font-semibold">My View</h1>
      </div>
      <a-button type="primary" @click="showCreate">
        <Plus class="w-4 h-4 mr-1" /> New Item
      </a-button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <a-card v-for="stat in stats" :key="stat.label">
        <a-statistic :title="stat.label" :value="stat.value" />
      </a-card>
    </div>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
    />

    <!-- Create/Edit Drawer -->
    <a-drawer v-model:open="drawerOpen" title="Edit Item" width="500">
      <!-- form content -->
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FileText, Plus } from 'lucide-vue-next'
import { get, post, put, del } from '@/api/request'
import { useListView } from '@/composables'
</script>
```

### Step 2: Create the API Client

Create an API file at `backend/src/modules/{module_name}/static/api/index.ts`:

```typescript
import { get, post, put, del } from '@/api/request'

const BASE = '/module-name'

export interface MyItem {
  id: number
  name: string
  status: string
  created_at: string
}

export const fetchItems = (params?: Record<string, any>) =>
  get<MyItem[]>(BASE, params)

export const fetchItem = (id: number) =>
  get<MyItem>(`${BASE}/${id}`)

export const createItem = (data: Partial<MyItem>) =>
  post<MyItem>(BASE, data)

export const updateItem = (id: number, data: Partial<MyItem>) =>
  put<MyItem>(`${BASE}/${id}`, data)

export const deleteItem = (id: number) =>
  del(`${BASE}/${id}`)
```

### Step 3: Register in the Custom Views Map

Open `frontend/apps/web-lume/src/router/index.ts` and add an entry to the `customViews` object:

```typescript
const customViews: Record<string, () => Promise<any>> = {
  // ... existing entries ...

  // My Module
  'my-module': () => import('@modules/my_module/static/views/my-view.vue'),
  'my-module/sub-page': () => import('@modules/my_module/static/views/sub-page.vue'),
}
```

The key must match the route path as defined in the backend menu configuration (without the leading `/`).

### Step 4: Verify Tailwind Scanning

Confirm that `tailwind.config.js` includes the backend modules path in its `content` array:

```javascript
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    '../../../backend/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}',  // This line
  ],
  // ...
}
```

Without this entry, Tailwind utility classes used in module views will not be included in the CSS output.

## API Client Pattern

### Request Helpers

All API calls use the centralized helpers from `@/api/request`:

```typescript
import { get, post, put, del, patch, upload } from '@/api/request'
```

| Helper   | HTTP Method | Signature                                        |
|----------|-------------|--------------------------------------------------|
| `get`    | GET         | `get<T>(url, params?, config?): Promise<T>`      |
| `post`   | POST        | `post<T>(url, data?, config?): Promise<T>`       |
| `put`    | PUT         | `put<T>(url, data?, config?): Promise<T>`        |
| `patch`  | PATCH       | `patch<T>(url, data?, config?): Promise<T>`      |
| `del`    | DELETE      | `del<T>(url, config?): Promise<T>`               |
| `upload` | POST        | `upload<T>(url, formData, onProgress?): Promise<T>` |

### Response Unwrapping

The Axios response interceptor automatically unwraps the backend response format:

```
Backend returns:  { success: true, data: { id: 1, name: "Item" } }
Interceptor returns:  { id: 1, name: "Item" }

Backend returns:  { success: false, message: "Not found" }
Interceptor rejects:  Error("Not found")
```

**Critical rule**: A resolved promise means the request succeeded. A rejected promise means it failed. Never re-check `result.success` after awaiting a request:

```typescript
// CORRECT
try {
  const items = await get('/items')
  // items is the unwrapped data, use it directly
  dataSource.value = items
} catch (error) {
  message.error('Failed to load items')
}

// WRONG - do not do this
const result = await get('/items')
if (result.success) {     // result.success does not exist
  dataSource.value = result.data  // result.data does not exist
}
```

### Authentication

The request interceptor automatically injects the Bearer token from the auth store:

```
Authorization: Bearer <token from authStore>
```

On 401 responses, the interceptor attempts a token refresh. If that fails, the user is logged out and redirected to `/login`.

## Composables Reference

| Composable       | Purpose                                                    |
|------------------|------------------------------------------------------------|
| `useApi`         | Wraps an async function with `loading`, `error`, and `data` refs. Handles try/catch automatically. |
| `useApiCache`    | Like `useApi` but caches responses by key. `createCachedApi` factory. `clearAllApiCache` to reset. |
| `useCrud`        | Full CRUD operations with pagination. Returns `items`, `loading`, `fetch`, `create`, `update`, `remove`, `pagination`. |
| `useTable`       | Table state management: column definitions, sorting, filtering, pagination change handlers. |
| `useForm`        | Form state with validation rules. `createFormConfig` helper. `formRules` for common validators. `extractServerError` for backend validation errors. |
| `useListView`    | Combines table + search + CRUD into a single composable. Accepts `UseListViewOptions` for configuration. |
| `useExport`      | Export data to XLSX/CSV. `downloadBlob` helper for file downloads. |
| `usePermission`  | Check user permissions: `hasPermission(perm)`, `hasAnyPermission([...])`. |
| `useConfirm`     | Confirmation dialog wrapper using Ant Design Modal.confirm. |
| `useToast`       | Toast notification helper (success, error, info, warning). |
| `useModal`       | Modal state management: `open`, `close`, `visible`, `data`. |
| `useSearch`      | Search input state with debounce. `useFilters` for multi-field filtering. |
| `useIsMobile`    | Reactive boolean that tracks whether the viewport is below the mobile breakpoint. |
| `useScrollLock`  | Locks body scroll when a modal or drawer is open. |

### Usage Example

```typescript
import { useCrud, useConfirm, useToast } from '@/composables'

const { items, loading, pagination, fetch, remove } = useCrud('/api/items')
const { confirm } = useConfirm()
const { success, error } = useToast()

async function handleDelete(id: number) {
  const confirmed = await confirm('Delete this item?')
  if (!confirmed) return
  try {
    await remove(id)
    success('Item deleted')
    await fetch()
  } catch (e) {
    error('Delete failed')
  }
}
```

## Icons

Use `lucide-vue-next` for all icons. Do **not** use `@ant-design/icons-vue`.

```vue
<script setup>
import { FileText, Plus, Trash2, Edit, Search } from 'lucide-vue-next'
</script>

<template>
  <FileText class="w-5 h-5" />
  <Plus class="w-4 h-4" />
</template>
```

Note: While `@ant-design/icons-vue` is listed in `package.json` as a dependency (required by some Ant Design Vue internals), all application-level icons should use Lucide.

## Ant Design Vue

Ant Design Vue is registered globally in `main.ts` via `app.use(Antd)`. All `a-*` components are available in templates without individual imports:

```vue
<template>
  <a-card title="My Card">
    <a-table :columns="columns" :data-source="data" />
    <a-button type="primary">Submit</a-button>
    <a-drawer v-model:open="drawerOpen" title="Details" />
    <a-modal v-model:open="modalOpen" title="Confirm" />
    <a-statistic title="Total" :value="42" />
    <a-tag color="green">Active</a-tag>
    <a-segmented v-model:value="activeTab" :options="tabs" />
  </a-card>
</template>
```

## State Management

### Auth Store (`src/store/auth.ts`)

| Member            | Type       | Description                                   |
|-------------------|------------|-----------------------------------------------|
| `token`           | `ref`      | JWT token string (persisted in localStorage)  |
| `refreshToken`    | `ref`      | Refresh token (persisted in localStorage)     |
| `userInfo`        | `ref`      | User object: id, email, first_name, last_name, role, avatar |
| `loading`         | `ref`      | Login in progress flag                        |
| `isAuthenticated` | `computed` | `true` if token exists                        |
| `userName`        | `computed` | Display name from first/last name or email    |
| `userAvatar`      | `computed` | Avatar URL                                    |
| `login(params)`   | `action`   | POST `/users/login`, stores token + userInfo  |
| `logout()`        | `action`   | DELETE `/users/logout`, clears state, redirects to /login |
| `getUserInfo()`   | `action`   | GET `/users/me`, updates userInfo             |
| `doRefreshToken()`| `action`   | POST `/auth/refresh-token`                    |
| `initializeAuth()`| `action`   | Restores userInfo from localStorage on load   |

### Permission Store (`src/store/permission.ts`)

| Member              | Type       | Description                                   |
|---------------------|------------|-----------------------------------------------|
| `permissions`       | `ref`      | Array of permission strings                   |
| `menus`             | `ref`      | Array of MenuItem objects from backend        |
| `menusLoaded`       | `ref`      | Whether menus have been fetched               |
| `loading`           | `ref`      | Fetch in progress flag                        |
| `hasPermission`     | `computed` | `(perm: string) => boolean` - checks single permission |
| `hasAnyPermission`  | `computed` | `(perms: string[]) => boolean` - checks if user has any |
| `hasAllPermissions` | `computed` | `(perms: string[]) => boolean` - checks if user has all |
| `filteredMenus`     | `computed` | Menus filtered by user permissions            |
| `fetchPermissions()`| `action`   | GET `/permissions`                            |
| `fetchMenus()`      | `action`   | GET `/menus`, deduplicates by path            |
| `clearPermissions()`| `action`   | Resets all permission and menu state          |

Admin users (role `admin` or `role_id === 1`) automatically receive a wildcard `*` permission granting access to everything.

## Routing

### Custom Views Map

The `customViews` object in `router/index.ts` maps route paths to lazy-loaded Vue components:

```typescript
const customViews: Record<string, () => Promise<any>> = {
  'activities': () => import('@modules/activities/static/views/index.vue'),
  'activities/upcoming': () => import('@modules/activities/static/views/upcoming.vue'),
  'team': () => import('@modules/team/static/views/index.vue'),
  'team/leadership': () => import('@modules/team/static/views/leadership.vue'),
  // ... 50+ entries
}
```

Keys are route paths without the leading slash. They must match the `path` field from the backend menu configuration.

### Route Name Generation

Child routes derive their name from the path to avoid collisions:

```
Path: /settings/rbac/roles  -->  Name: settings-rbac-roles
Path: /donations/donors     -->  Name: donations-donors
```

This prevents name collisions when multiple modules have similarly named sub-pages (e.g., both RBAC and Settings could have a "Roles" page).

### Multi-Route Views

A single Vue component can serve multiple sub-routes by deriving its behavior from `useRoute().path`:

```vue
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const section = computed(() => {
  const path = route.path
  if (path.includes('/images')) return 'images'
  if (path.includes('/videos')) return 'videos'
  return 'all'
})
</script>
```

This pattern is used by documents (type filter), media (featured filter), settings (category tabs), security (section tabs), and automation (workflow type tabs).

### Tabbed Section Views

Security and Features views use `a-segmented` for section navigation:

```vue
<template>
  <a-segmented v-model:value="activeSection" :options="sections" @change="onSectionChange" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeSection = computed(() => {
  const parts = route.path.split('/')
  return parts[parts.length - 1]
})

function onSectionChange(value: string) {
  router.push(`/settings/security/${value}`)
}
</script>
```

## Tailwind CSS Configuration

The `tailwind.config.js` content array **must** include the backend modules path:

```javascript
content: [
  './index.html',
  './src/**/*.{vue,js,ts,jsx,tsx}',
  '../../../backend/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}',
],
```

Without the third entry, Tailwind will not scan module view files and utility classes used in those files will be missing from the generated CSS.

The Tailwind theme extends the default with custom CSS variable-based colors (`primary`, `secondary`, `destructive`, `background`, `foreground`, `border`, `ring`, `input`) and uses the Inter font family.
