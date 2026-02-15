# Lume Frontend Architecture

## Application Structure

```
                            +------------------+
                            |     Browser      |
                            +--------+---------+
                                     |
                            +--------v---------+
                            |    index.html     |
                            |    main.ts        |
                            |  (Vue + Pinia +   |
                            |   Router + Antd)  |
                            +--------+---------+
                                     |
                    +----------------+----------------+
                    |                                 |
           +--------v---------+             +--------v---------+
           |   Vue Router     |             |   Pinia Stores   |
           |  (Guards +       |             |  (auth +         |
           |   Dynamic Routes)|             |   permission)    |
           +--------+---------+             +--------+---------+
                    |                                 |
           +--------v-----------------------------------------+
           |                  App.vue                          |
           +--------+-----------------------------------------+
                    |
     +--------------+-----+----------------------------+
     |              |                                  |
     | /login       | /                                | /*
     v              v                                  v
+----+----+  +------+------+                    +------+------+
|  Login  |  | BasicLayout |                    |   404/403   |
|  View   |  +------+------+                    +-------------+
+---------+         |
         +----------+----------+------------------+
         |          |          |                   |
    +----v----+ +---v---+ +---v--------+  +-------v--------+
    | Sidebar | | Header| | RouterView |  | CommandPalette |
    | (menus) | | (user)| |            |  | (Ctrl+K)       |
    +---------+ +-------+ +-----+------+  +----------------+
                                |
                    +-----------+-----------+
                    |                       |
              +-----v------+        +------v------+
              |  Dashboard  |        | CustomView  |
              |  (static)   |        | or          |
              +-------------+        | ModuleView  |
                                     | (dynamic)   |
                                     +-------------+
```

## Layout System

The `BasicLayout` component (`src/layouts/BasicLayout.vue`) provides the application shell for all authenticated routes.

```
+-------+------------------------------------------------------+
|       |  Header                                [User] [Logout]|
|       +------------------------------------------------------+
|  S    |                                                       |
|  i    |                                                       |
|  d    |               RouterView                              |
|  e    |          (Page Content Area)                          |
|  b    |                                                       |
|  a    |                                                       |
|  r    |                                                       |
|       |                                                       |
+-------+-------------------------------------------------------+
                    CommandPalette (overlay, Ctrl+K)
```

### Components

| Component        | File                                  | Responsibility                          |
|------------------|---------------------------------------|-----------------------------------------|
| `BasicLayout`    | `src/layouts/BasicLayout.vue`         | Orchestrates sidebar, header, content, and command palette |
| `Sidebar`        | `src/components/layout/Sidebar.vue`   | Renders navigation menus from permission store. Supports collapse. |
| `Header`         | `src/components/layout/Header.vue`    | User info display, sidebar toggle, logout action |
| `Breadcrumb`     | `src/components/layout/Breadcrumb.vue`| Route-based breadcrumb navigation       |
| `CommandPalette` | `backend/src/modules/common/static/components/CommandPalette.vue` | Global search and navigation overlay (Ctrl+K / Cmd+K) |

### Data Flow in BasicLayout

```
BasicLayout.vue
  |
  +-- useAuthStore()
  |     +-- isAuthenticated  -->  conditionally render Sidebar, Header, CommandPalette
  |     +-- userInfo         -->  passed to Header as :user prop
  |     +-- logout()         -->  bound to Header @logout event
  |
  +-- usePermissionStore()
  |     +-- menus            -->  passed to Sidebar as :menus prop
  |     +-- fetchPermissions()  -->  called on mount if token exists
  |     +-- fetchMenus()        -->  called on mount if token exists
  |
  +-- sidebarCollapsed (ref)  -->  toggled via Header/Sidebar @toggle events
  +-- commandPaletteOpen (ref) -->  toggled via Ctrl+K keydown listener
```

## Router Architecture

### Route Types

```
Static Routes (defined in router/index.ts)
  /login           -->  Login view (public)
  /dashboard       -->  Dashboard view (authenticated, child of BasicLayout)
  /403             -->  Forbidden page
  /:pathMatch(.*)  -->  404 catch-all

Dynamic Routes (generated from backend /api/menus response)
  /activities          -->  Activities index
  /activities/upcoming -->  Upcoming activities
  /team                -->  Team index
  /donations           -->  Donations index
  /settings/modules    -->  Module management
  /settings/rbac/roles -->  Role management
  ... (50+ routes)
```

### Dynamic Route Generation Flow

```
User navigates to authenticated route
          |
          v
  setupAccessGuard (beforeEach)
          |
          v
  Is user authenticated?
     NO ---> Redirect to /login
     YES
          |
          v
  Are menus loaded?
     YES ---> Skip to permission check
     NO
          |
          v
  Fetch permissions + menus from backend
  (GET /api/permissions + GET /api/menus)
          |
          v
  Iterate over menu items
          |
          v
  For each menu item:
    +-- Has route been registered? (router.hasRoute)
    |     YES ---> Skip
    |     NO
    |       |
    |       v
    +-- router.addRoute('App', {
          path: menu.path,
          name: routeName,
          component: () => loadModuleView(moduleName, routeName, fullPath),
          props: { moduleName },
          meta: { title, icon, permission, module }
        })
          |
          v
  For each child menu item:
    +-- router.addRoute('App', { ... })  (same pattern, path-based name)
          |
          v
  If navigating to a catch-all route, re-resolve
  to check if dynamic routes now match
          |
          v
  setupPermissionGuard (beforeEach)
    +-- Check route.meta.permission against permissionStore
    +-- Redirect to /403 if lacking permission
```

### Custom View Resolution

The `loadModuleView` function resolves which component to render for a given route:

```
loadModuleView(moduleName, routeName, fullPath)
          |
          v
  Step 1: Check customViews by exact fullPath match
          |  (e.g., fullPath="/activities" matches key "activities")
          |
     FOUND ---> Return the component
     NOT FOUND
          |
          v
  Step 2: Check customViews by module/routeName combination
          |  (e.g., "activities/upcoming")
          |
     FOUND ---> Return the component
     NOT FOUND
          |
          v
  Step 3: Try fetching backend static view files
          |  GET /modules/{moduleName}/static/views/{routeName}.vue
          |  GET /modules/{moduleName}/static/views/list.vue
          |  GET /modules/{moduleName}/static/views/index.vue
          |
     FOUND ---> Return generic ModuleView.vue
     NOT FOUND
          |
          v
  Step 4: Fallback to generic ModuleView.vue
```

Currently, all routes have custom view entries, so steps 3 and 4 are not reached in normal operation.

## Store Architecture

### Auth Store Flow

```
                   +-------------------+
                   |    localStorage   |
                   | token, userInfo,  |
                   | refreshToken      |
                   +--------+----------+
                            |
                   initializeAuth()
                            |
                   +--------v----------+
                   |    Auth Store     |
                   |                   |
    login() ------>| token (ref)       |
                   | refreshToken (ref)|
                   | userInfo (ref)    |
                   | loading (ref)     |
                   |                   |
                   | isAuthenticated   |----> Router guards
                   |   (computed)      |      Sidebar visibility
                   |                   |      Header visibility
                   | userName          |----> Header display
                   |   (computed)      |
                   +---+--------+------+
                       |        |
              logout() |        | doRefreshToken()
                       v        v
              Clear state    POST /auth/refresh-token
              Redirect to    Update token
              /login         Retry failed request
```

### Permission Store Flow

```
                   +------------------------+
                   |   Backend API          |
                   | GET /api/permissions   |
                   | GET /api/menus         |
                   +--------+---------------+
                            |
               fetchPermissions() / fetchMenus()
                            |
                   +--------v---------------+
                   |   Permission Store     |
                   |                        |
                   | permissions (ref)      |----> Route permission guards
                   |   ['module.read',      |      usePermission composable
                   |    'module.write', *]   |
                   |                        |
                   | menus (ref)            |----> Sidebar navigation
                   |   [{ name, path,      |      Dynamic route generation
                   |     icon, children }]  |
                   |                        |
                   | menusLoaded (ref)      |----> Guard skips fetch if true
                   |                        |
                   | hasPermission()        |----> Template v-if checks
                   | hasAnyPermission()     |      Component-level access
                   | hasAllPermissions()    |
                   | filteredMenus          |----> Sidebar (filtered by perms)
                   +------------------------+

  On auth change (watch):
    isAuthenticated becomes true --> auto-fetch menus if not loaded
```

## API Layer

### Axios Instance Configuration

```typescript
// Base URL: VITE_API_URL (default: '/api')
// Timeout: 30,000ms
// Content-Type: application/json
```

### Request Interceptor

```
Outgoing Request
      |
      v
  Auth store has token?
    YES --> Add header: Authorization: Bearer <token>
    NO  --> Send without auth header
      |
      v
  Send to backend
```

### Response Interceptor

```
Backend Response
      |
      v
  HTTP 2xx?
    NO ---+
          |
          v
    HTTP 401? --> Try refresh token
                    Success --> Retry original request
                    Failure --> Logout, redirect to /login
    HTTP 403? --> Pass through (caller handles)
    HTTP 404? --> Pass through (caller handles)
    HTTP 500? --> Log error, reject promise
    Other?    --> Reject promise
          |
    YES --+
          |
          v
  Response has { code } field?
    YES --> code 200 or 0? Return data : Reject with message
    NO
          |
          v
  Response has { success } field?
    YES --> success true? Return data : Reject with message
    NO  --> Return response.data as-is
```

### Module API Client Pattern

Each backend module can provide its own API client:

```
backend/src/modules/{name}/static/api/index.ts
```

```typescript
import { get, post, put, del } from '@/api/request'

const BASE = '/{module-endpoint}'

export const list   = (params?) => get(BASE, params)
export const detail = (id: number) => get(`${BASE}/${id}`)
export const create = (data) => post(BASE, data)
export const update = (id: number, data) => put(`${BASE}/${id}`, data)
export const remove = (id: number) => del(`${BASE}/${id}`)
```

These API clients are imported in module views via the `@modules` alias:

```typescript
import { list, create } from '@modules/activities/static/api/index'
```

## Build Configuration

### Vite Config (`vite.config.ts`)

```
Plugins:
  - vue()              Vue 3 SFC support
  - vueJsx()           JSX/TSX support
  - compression()      Gzip output for production

Resolve Aliases:
  @             --> src/
  @modules      --> ../../../backend/src/modules/
  (+ explicit aliases for ant-design-vue, echarts, lucide-vue-next, dayjs
   so that backend module imports resolve from frontend node_modules)

Dedupe:
  vue, vue-router, pinia  (prevent duplicate instances)

Dev Server:
  Port: 3001
  Host: true (accessible on LAN)
  FS Allow: parent dir + backend modules dir
  Proxy: /api --> http://localhost:3000

Build:
  Target: ES2015
  Output: dist/
  Sourcemaps: disabled
  Manual Chunks:
    vue    --> vue, vue-router, pinia
    antdv  --> ant-design-vue, @ant-design/icons-vue
    utils  --> axios, dayjs, date-fns
```

### TypeScript Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "paths": {
      "@/*": ["src/*"],
      "@modules/*": ["../../../backend/src/modules/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "../../../backend/src/modules/**/static/**/*.vue"
  ]
}
```

The `include` array ensures that module view `.vue` files in the backend are type-checked alongside the frontend source.

### Tailwind Config (`tailwind.config.js`)

```javascript
content: [
  './index.html',
  './src/**/*.{vue,js,ts,jsx,tsx}',
  '../../../backend/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}',
]
```

Three content paths ensure Tailwind scans:
1. The HTML entry point
2. All frontend source files
3. All module static files in the backend

## Component Hierarchy

```
App.vue
  |
  +-- <RouterView>
        |
        +-- LoginView (public, /login)
        |
        +-- BasicLayout (authenticated, /)
        |     |
        |     +-- Sidebar
        |     |     +-- Reads menus from usePermissionStore().menus
        |     |     +-- Renders nested menu items with icons
        |     |     +-- Highlights active route
        |     |     +-- Supports collapsed state
        |     |
        |     +-- Header
        |     |     +-- Reads user from useAuthStore().userInfo
        |     |     +-- Sidebar toggle button
        |     |     +-- User avatar and dropdown
        |     |     +-- Logout action
        |     |
        |     +-- <RouterView> (content area)
        |     |     |
        |     |     +-- Dashboard (/dashboard)
        |     |     |     +-- Stats cards
        |     |     |     +-- Charts (ECharts)
        |     |     |
        |     |     +-- CustomView (dynamic routes)
        |     |     |     +-- Module-specific SFC loaded from
        |     |     |         backend/src/modules/{name}/static/views/
        |     |     |     +-- Typically contains:
        |     |     |         +-- Page header (icon + title + actions)
        |     |     |         +-- Stats row (a-card + a-statistic)
        |     |     |         +-- Filter bar (search + dropdowns)
        |     |     |         +-- Data table (a-table)
        |     |     |         +-- Drawer/Modal for CRUD forms
        |     |     |
        |     |     +-- ModuleView (fallback, currently unused)
        |     |           +-- Generic CRUD interface
        |     |           +-- Requires props.moduleName
        |     |
        |     +-- CommandPalette (overlay)
        |           +-- Ctrl+K / Cmd+K to toggle
        |           +-- Search across menus and actions
        |           +-- Quick navigation
        |
        +-- ForbiddenPage (/403)
        +-- NotFoundPage (catch-all)
```

## Key Design Decisions

### Module Views in Backend

Module views live in `backend/src/modules/{name}/static/views/` rather than in the frontend `src/views/` directory. This keeps each module self-contained: its models, services, API routes, and frontend views are all co-located. The Vite `@modules` alias and `fs.allow` configuration bridge the gap at build time.

### Dynamic Route Generation

Routes are not statically defined for each module. Instead, the backend provides a menu configuration via `GET /api/menus`, and the router guard dynamically registers routes on first navigation. This means adding a new module with menus on the backend automatically makes those routes available on the frontend, provided custom views are registered in the `customViews` map.

### Response Interceptor Unwrapping

The Axios response interceptor strips the `{ success, data }` wrapper from all API responses. This simplifies every API call site but requires developers to understand that `await get('/items')` returns the data directly, not a wrapper object. Error handling is done exclusively through try/catch.

### Permission-Based Rendering

The permission store provides `hasPermission`, `hasAnyPermission`, and `hasAllPermissions` computed getters. These can be used in templates with `v-if` or in script setup for conditional logic. Admin users bypass all permission checks via the wildcard `*` permission.
