# Lume Framework Frontend

## Tech Stack

| Technology       | Version | Purpose                        |
|------------------|---------|--------------------------------|
| Vue 3            | 3.5+    | Reactive UI framework          |
| TypeScript       | 5.6+    | Type-safe JavaScript           |
| Vite             | 5.4+    | Build tool and dev server      |
| Ant Design Vue   | 4.2+    | UI component library           |
| Tailwind CSS     | 3.4+    | Utility-first CSS framework    |
| Pinia            | 2.2+    | State management               |
| Vue Router       | 4.4+    | Client-side routing            |
| Axios            | 1.7+    | HTTP client                    |
| ECharts          | 5.5+    | Data visualization             |
| Lucide Vue Next  | 0.460+  | Icon library                   |
| VueUse           | 11.0+   | Vue composition utilities      |

## Features

- **50+ custom views** covering all application modules (activities, team, donations, messages, documents, media, settings, audit, RBAC, automation, customization, and more)
- **Command palette** (Ctrl+K / Cmd+K) for quick navigation across the application
- **Responsive layout** with collapsible sidebar, header, and breadcrumb navigation
- **Module-based architecture** where views live alongside their backend modules under `backend/src/modules/{name}/static/views/`
- **Pinia stores** for authentication state, permissions, and menu management
- **15 composables** for common patterns: API calls, CRUD operations, tables, forms, exports, modals, permissions, and more
- **Dynamic routing** generated from backend menu configuration with permission-based access control
- **Custom view registry** mapping route paths to dedicated Vue components with multi-level fallback resolution
- **Axios interceptor layer** with automatic token injection, response unwrapping, and 401 refresh handling
- **ECharts integration** for dashboard charts and data visualizations
- **XLSX export support** for data tables
- **Gzip compression** via vite-plugin-compression for production builds
- **Code splitting** with manual chunks for Vue, Ant Design, and utility libraries

## Quick Start

```bash
# Navigate to the frontend app
cd frontend/apps/web-lume

# Install dependencies
npm install

# Start the dev server (port 3001)
npm run dev

# Open in browser
# http://localhost:3001
```

Default admin credentials: `admin@lume.dev` / `admin123`

## Project Structure

```
frontend/apps/web-lume/
├── src/
│   ├── api/
│   │   └── request.ts            # Axios instance, interceptors, get/post/put/del/upload helpers
│   ├── assets/                   # Static assets (images, fonts)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.vue       # Navigation sidebar (reads menus from permission store)
│   │   │   ├── Header.vue        # Top header bar (user info, sidebar toggle)
│   │   │   └── Breadcrumb.vue    # Route-based breadcrumb
│   │   ├── charts/               # ECharts wrapper components
│   │   ├── common/               # Shared UI components
│   │   ├── admin/                # Admin-specific components
│   │   ├── public/               # Public-facing components
│   │   ├── ModuleView.vue        # Generic fallback view for module routes
│   │   ├── DataTable.vue         # Reusable data table component
│   │   ├── DynamicView.vue       # Dynamic view loader
│   │   └── ExportMenu.vue        # Export dropdown menu
│   ├── composables/
│   │   ├── index.ts              # Barrel export for all composables
│   │   ├── useApi.ts             # Generic async API call wrapper
│   │   ├── useApiCache.ts        # Cached API responses
│   │   ├── useCrud.ts            # CRUD operations with pagination
│   │   ├── useTable.ts           # Table state management (sort, filter, pagination)
│   │   ├── useForm.ts            # Form state, validation, and submission
│   │   ├── useListView.ts        # Combined list view (table + search + pagination)
│   │   ├── useExport.ts          # XLSX/CSV export utilities
│   │   ├── usePermission.ts      # Permission checking helpers
│   │   ├── useConfirm.ts         # Confirmation dialog wrapper
│   │   ├── useToast.ts           # Toast notification helper
│   │   ├── useModal.ts           # Modal state management
│   │   ├── useSearch.ts          # Search and filter state
│   │   ├── useIsMobile.ts        # Responsive breakpoint detection
│   │   └── useScrollLock.ts      # Body scroll lock for overlays
│   ├── layouts/
│   │   └── BasicLayout.vue       # Main app layout (Sidebar + Header + RouterView + CommandPalette)
│   ├── router/
│   │   └── index.ts              # Router config, guards, dynamic route generation, customViews map
│   ├── store/
│   │   ├── index.ts              # Pinia store setup
│   │   ├── auth.ts               # Authentication state (token, userInfo, login, logout)
│   │   └── permission.ts         # Permissions and menu state
│   ├── styles/                   # Global CSS and Tailwind utilities
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── views/
│   │   ├── _core/
│   │   │   ├── authentication/   # Login page
│   │   │   └── fallback/         # 404 and 403 pages
│   │   ├── dashboard/            # Dashboard view
│   │   └── public/               # Public-facing pages
│   ├── app.vue                   # Root Vue component
│   ├── AppLayout.vue             # Alternate layout
│   ├── main.ts                   # App entry point (registers Pinia, Router, Ant Design Vue)
│   └── style.css                 # Global styles and Tailwind directives
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration (proxy, aliases, build)
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.node.json            # Node-specific TS config
└── package.json                  # Dependencies and scripts
```

Module-specific views are located outside this tree, in the backend:

```
backend/src/modules/
├── activities/static/views/      # Activities module views
├── audit/static/views/           # Audit module views
├── base/static/views/            # Base module views (modules, menus, system)
├── base_automation/static/views/ # Automation module views
├── base_customization/static/views/ # Customization module views
├── base_features_data/static/views/ # Data import/export views
├── base_security/static/views/   # Security module views
├── documents/static/views/       # Documents module views
├── donations/static/views/       # Donations module views
├── media/static/views/           # Media module views
├── messages/static/views/        # Messages module views
├── rbac/static/views/            # RBAC module views
├── settings/static/views/        # Settings module views
├── team/static/views/            # Team module views
├── user/static/views/            # User module views
├── advanced_features/static/views/ # Advanced features views
└── common/static/components/     # Shared components (CommandPalette)
```

## NPM Scripts

| Script              | Command                | Description                                |
|---------------------|------------------------|--------------------------------------------|
| `dev`               | `vite`                 | Start dev server on port 3001              |
| `build`             | `vite build`           | Production build to `dist/`                |
| `build:analyze`     | `vite build --mode analyze` | Build with bundle analysis            |
| `preview`           | `vite preview`         | Preview production build locally           |
| `typecheck`         | `vue-tsc --noEmit --skipLibCheck` | Run TypeScript type checking    |
| `lint`              | `eslint src/ --ext .vue,.ts,.js` | Lint source files               |
| `lint:fix`          | `eslint src/ --ext .vue,.ts,.js --fix` | Lint and auto-fix           |
| `test`              | `vitest`               | Run unit tests with Vitest                 |
| `test:e2e`          | `playwright test`      | Run end-to-end tests                       |
| `test:e2e:report`   | `playwright test --reporter=html` | E2E tests with HTML report    |
| `test:e2e:install`  | `playwright install --with-deps chromium` | Install Playwright browser |

## Environment Variables

| Variable       | Default                        | Description                              |
|----------------|--------------------------------|------------------------------------------|
| `VITE_API_URL` | `/api`                         | API base URL. Uses Vite proxy in dev mode to forward `/api/*` requests to `http://localhost:3000`. Set to a full URL for production if needed. |

The Vite dev server proxy configuration in `vite.config.ts`:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
},
```

This means all requests to `/api/*` from the browser are proxied to the Express backend running on port 3000, avoiding CORS issues during development.
