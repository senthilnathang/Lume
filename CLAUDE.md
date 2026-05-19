# Lume Framework — Claude Code Instructions

## Project Overview

Lume is a modular NestJS framework with 23 pluggable modules, a hybrid ORM (Prisma + Drizzle), a TipTap-based visual page builder, and a Nuxt 3 public website. **Status: Production-ready v2.0** with rate limiting, security hardening, and SEO optimization. Two frontend apps: Vue 3 admin panel + Nuxt 3 SSR public site.

## Frontend Rules

### Ant Design Vue
- Ant Design Vue (`ant-design-vue`) MUST be registered as a global plugin in `main.ts` via `app.use(Antd)`.
- Never use `<a-*>` template components (e.g. `<a-config-provider>`, `<a-button>`) without ensuring Antd is registered globally.
- If adding new Ant Design components to templates, verify the import in `main.ts` first.

### Vue Router — Dynamic Routes
- When dynamically adding routes that use `ModuleView.vue`, ALWAYS pass `props: { moduleName }` in the route definition.
- `ModuleView` depends on `props.moduleName` to resolve its module config. Without it, the component crashes with `"props.moduleName is undefined"`.
- Both the access guard in `router/index.ts` and the `addDynamicRoutes()` export must pass `moduleName` consistently.

### Module Frontend Code Organization
- All module-specific frontend code (views, API clients, components) MUST live inside the backend module's directory under `static/`.
- Directory structure per module: `backend/src/modules/{name}/static/views/` for views, `backend/src/modules/{name}/static/api/` for API clients.
- Use the `@modules` Vite alias to import from module directories: `import { ... } from '@modules/{module}/static/api/index'`.
- Core/shared code (request.ts, auth API, stores, layouts, router) stays in the frontend `src/` directory.
- Never create new view or API files under `apps/web-lume/src/views/` or `src/api/` for module-specific functionality.

### API Client
- Axios interceptor unwraps `{success, data}` → returns `data` directly.
- Frontend handlers must NOT re-check `result.success` after await — resolved promise = success, rejected = error (caught in catch block).

### General
- The admin panel is a Vite + Vue 3 + TypeScript app at `apps/web-lume/`.
- The public site is a Nuxt 3 SSR app at `apps/riagri-website/`.
- API calls go through the Vite dev proxy (`/api` -> `http://localhost:3000`).
- Backend serves module static views from `/modules/{moduleName}/static/views/`.
- Icons use `lucide-vue-next` (NOT @ant-design/icons-vue).

## Backend Rules

### ES Modules
- The backend uses `"type": "module"` — all `.js` files are ESM. Never use `require()` or `module.exports`.
- Manifest files (`__manifest__.js`) must use `export default {}`, not `module.exports`.

### Hybrid ORM
- **Prisma**: 11 core models (User, Role, Permission, RolePermission, Setting, AuditLog, InstalledModule, Menu, Group, RecordRule, Sequence). Schema at `backend/prisma/schema.prisma`, client at `src/core/db/prisma.js`.
- **Drizzle**: 14 module schemas (activities, documents, donations, team, messages, media, editor, website, base_automation, base_security, base_customization, base_features_data, advanced_features, base_rbac). Schemas at `modules/{name}/models/schema.js`.
- Prisma schema is generated via `npx prisma db pull` (introspection), NOT hand-written.
- PrismaAdapter auto-converts snake_case fields to camelCase via `_toCamelCase()`.
- Core models use `{ softDelete: false }` — they lack `deleted_at` columns.

### Database
- DB type: MySQL. Credentials: `gawdesy`/`gawdesy`, database `lume`.
- Password hashing is automatic via Prisma middleware on create/update. Never manually hash in seed scripts.
- AuditLog model is owned by the Base module. Do not re-register it elsewhere.

### Testing
- Jest with ESM: requires `NODE_OPTIONS='--experimental-vm-modules'` and `transform: {}` in jest.config.cjs.
- Use `import { jest } from '@jest/globals'` for jest globals in test files.

### Security & Rate Limiting
- **ThrottlerGuard**: Enabled globally via `app.use(ThrottlerModule)` in main app setup. Configure limits per endpoint in route decorators: `@Throttle(limit, ttl_seconds)`.
- **Security Headers**: Automatically applied (CORS, CSP, X-Frame-Options, etc.). See `security/headers.config.js`.
- **Token Refresh**: `RefreshTokenDto` used for `/api/auth/refresh` endpoint. Clients send `refreshToken` in body, receive new `accessToken`.
- **Password Hashing**: Automatic via Prisma middleware — never manually hash in seed scripts.
- **WebSocket tenant isolation (P2-1)**: `WebSocketManager.broadcast()` calls `canSubscriberReceive()` for every (subscription, record) pair. Subscriptions MUST pass `{ companyId, roles }` from the authenticated request at subscribe time; non-`super_admin` subscribers only receive events whose record `company_id`/`tenant_id` matches their own. Defensive default = deny. See `backend/src/core/realtime/websocket-manager.js` and `backend/tests/unit/websocket-permission.test.js`.

## Module Catalogue (P2-3 backend)

`GET /api/modules` returns each module with two fields that drive the admin UI:

- `actions`: ordered list of lifecycle operations valid right now — `['install']` if uninstalled with deps resolved, `['uninstall', 'upgrade']` if installed, `['install', 'uninstall']` if errored, `[]` if uninstallable. Each value maps 1:1 to a `POST /api/modules/:name/<action>` endpoint.
- `deps_resolved`: boolean. `true` only if every non-`base` dependency is `state=installed`. UI should disable the Install button when `false`.

The state-transition matrix is `computeModuleActions(module, state, depsResolved)` in `backend/src/index.js`. There is no separate `disabled` state in v2.0 — install/uninstall is the toggle mechanism. A real disabled state would need a schema enum extension + module-loader changes; explicitly v2.1 scope.

## OpenAPI / Swagger (P2-2)

- Spec served at `GET /api/openapi.json`, interactive UI at `GET /api/docs/`.
- Mounted automatically in non-production environments. In production, gate behind `OPENAPI_ENABLED=true` — production docs typically live on `docs.lume.dev` rather than being part of the API surface.
- **Hand-curated baseline** in `backend/src/core/openapi/openapi-spec.js`: `/health`, `/api/modules`, `/api/users/login`, plus reusable schemas (`User`, `LoginRequest`, `LoginResponse`, `ApiSuccess`, `ApiError`, `HealthResponse`).
- **Module-level annotations** are scraped via `swagger-jsdoc` from `src/modules/*/api/*.js` and `src/modules/*/*.routes.js`. Add docs to a module route like:

```js
/**
 * @swagger
 * /api/activities:
 *   get:
 *     tags: [Activities]
 *     summary: List activities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of activities
 */
router.get('/', authenticate, async (req, res) => { ... });
```

- **Authentication for `/api/docs` UI**: when you "Authorize" in the UI, the token field is the JWT body of `data.accessToken` from `/api/users/login`. The Authorize button persists across page reloads (`persistAuthorization: true`).
- **Cache-Control on `/api/openapi.json`**: `public, max-age=60` — short enough for dev hot-reload of `@swagger` comments to surface quickly, long enough that SDK codegen tools don't hammer the endpoint.

## Editor Module (Visual Page Builder)

- **Path**: `backend/src/modules/editor/` — TipTap-based WYSIWYG + visual page builder.
- **30+ widget blocks** across 8 categories: Text, Layout, Content, Media, Interactive, Commercial, Utility, Social.
- **Block structure**: Extensions in `static/extensions/`, NodeView components in `static/components/blocks/`, render components in `static/widgets/renders/`.
- **PageBuilder**: 3-panel layout (widget palette | canvas | block settings) with Visual/Text toggle.
- **BlockRenderer**: Recursive Vue render function at `static/widgets/BlockRenderer.vue` — used by the public site to render TipTap JSON content.
- **TipTap packages**: 18 @tiptap/* packages, ALL need explicit Vite aliases in `vite.config.ts`.
- **Content format**: All page content stored as TipTap JSON (`{ type: "doc", content: [...] }`).

## Website Module (CMS)

- **Path**: `backend/src/modules/website/` — Pages, menus, media, settings.
- **Depends on**: `editor` module (uses PageBuilder for page editing).
- **Tables**: `website_pages`, `website_menus`, `website_menu_items`, `website_settings`.
- **Menu management**: WordPress/Drupal-style drag-and-drop tree with `vuedraggable`. Items support nesting via `parentId` + `sequence`. `MenuTreeNode.vue` is a recursive component.
- **Page editor**: `page-editor.vue` detects TipTap content via `isTipTapJson()` — shows PageBuilder for TipTap content, form editor for legacy JSON.
- **Public API**: `/api/website/public/pages/:slug`, `/api/website/public/menus/:location`, `/api/website/public/settings`.
- **Menu reorder**: `PUT /api/website/menus/:id/reorder` accepts `{ items: [{ id, parentId, sequence }] }`.
- **SEO Features**: Meta titles, descriptions, Open Graph tags (`og_image`, `og_title`), XML sitemap (`/sitemap.xml`), robots.txt, Schema.org JSON-LD. All editable in Settings > SEO tab.
- **SEO Analysis Panel**: Live per-page score (title length, keyword density, H1 count, content length, image alt text) shown in page editor sidebar.

## Public Website (Nuxt 3)

- **Path**: `apps/riagri-website/` — SSR public-facing site.
- **Pages**: `index.vue`, `products.vue`, `services.vue`, `about.vue`, `contact.vue`, `[...slug].vue` (catch-all for CMS pages).
- **Content rendering**: All pages use TipTap JSON rendered through `PageRenderer` → `BlockRenderer`.
- **Navigation**: Desktop dropdown menus (hover), mobile accordion (tap). Menu data from `GET /api/website/public/menus/header` with nested `children` arrays.
- **Composables**: `useWebsiteData()` for menus/settings, `usePageContent(slug)` for page content.

## Performance Settings (.env, config-only)

Safe defaults applied — no code changes needed. Flip the relevant flag back only when actively diagnosing a problem.

| Setting | Default | What it does |
|---------|---------|--------------|
| `DB_LOGGING` | `false` | When `true`, Prisma logs every SQL query (huge log volume + serialization cost). Flip on per-investigation only. |
| `LOG_LEVEL` | `info` | `debug`/`trace` add request-path overhead via serialization on every log call. Keep at `info`. |
| `OTEL_TRACES_SAMPLER_ARG` | `0.1` | Sampling ratio for distributed traces (0.0–1.0). `1.0` in dev is wasteful — every request carries trace-export overhead. `0.1` (10%) gives statistically useful traces at ~90% less overhead. Raise to `1.0` only when debugging a specific trace. |
| `METRICS_ENABLED` | `true` | Prometheus metrics endpoint; low overhead, keep on for observability. |
| `NODE_ENV` | `development` / `production` | Production unlocks helmet HSTS + tighter CORS; development is more permissive. Never set to `production` in dev (breaks hot reload). |

**Setup pre-checks (run once after `git pull`):**
1. `DB_LOGGING=false` — verify in `backend/.env`
2. `OTEL_TRACES_SAMPLER_ARG=0.1` — verify in `backend/.env` (was `1.0` historically)
3. MySQL auto-indexes every FK column — no equivalent of FastVue's "add partial index on nullable FK" work is needed for Lume.

**Doc references:** `docs/ARCHITECTURE.md` → Performance Considerations.

## Database Setup (clean install)

Single command (recommended):

```bash
cd backend
npm run db:setup     # refreshDb → prisma db push → setupDrizzle → createAdmin → seedData
npm run dev          # Start backend on :3000 (tsx watch — ~2s cold restart)
```

Step-by-step (when you need to skip a phase):

```bash
node src/scripts/refreshDb.js              # Drop all tables (destructive — fresh install only)
npx prisma db push --accept-data-loss      # Create Prisma core tables (User, Role, ...)
node src/scripts/setupDrizzle.js           # Create 33 Drizzle module tables (P0-1 fix)
node src/scripts/createAdmin.js            # admin@lume.dev / Admin@Lume!1 with super_admin role
node src/scripts/seedData.js               # Activities (5), team (6), messages (3), settings (10)
```

**Why setupDrizzle is needed:**
`prisma db push` only creates Prisma's 11 core tables. The 18 Drizzle module schemas (96 tables across 25 modules) need their own migration pass. `drizzle-kit push` requires a TTY for conflict resolution, so the project ships its own programmatic creator (`src/scripts/setupDrizzle.js`) that uses `getTableConfig()` from `drizzle-orm/mysql-core`. Idempotent — safe to re-run.

**Boot-time parity guard:** `src/core/db/check-table-parity.js` runs after Drizzle init and either prints `✅ Table parity OK (18 modules, 96 tables checked)` or a grouped warning listing missing tables. Set `LUME_STRICT_TABLE_PARITY=true` to escalate the warning into a startup failure (CI/prod).

**Notes:**
- `prisma/seed.js` is now a thin shim that delegates to `createAdmin.js` + `seedData.js`. `npm run db:seed` works.
- Login endpoint is `POST /api/users/login` (not `/api/auth/login`); auth module owns roles/permissions, user module owns login.
- Login response returns both `data.token` and `data.accessToken` (alias for v2.x SDK compat — `accessToken` becomes canonical in v3).

## Dev vs Production

| Mode | Command | Tooling | Restart speed |
|------|---------|---------|---------------|
| Dev (default) | `npm run dev` | tsx watch | ~2s |
| Dev (legacy) | `npm run dev:nodemon` | nodemon | ~7s |
| Production | `npm run pm2:start` | pm2 cluster, all CPUs, 2 GB heap each | zero-downtime via `npm run pm2:reload` |
| Production (raw) | `npm run start` | node, single process | n/a |

Production env defaults are baked into `ecosystem.config.cjs`:
- `NODE_ENV=production`, `DB_LOGGING=false`, `LOG_LEVEL=info`, `OTEL_TRACES_SAMPLER_ARG=0.1`
- `LUME_STRICT_TABLE_PARITY=true` — boot fails if module tables are missing (better than serving 500s)
- `--max-old-space-size=2048 --enable-source-maps`
- `max_memory_restart: 1500M` (preempt OOM)
- `max_restarts: 10`, `min_uptime: 15s` (crashloop protection)

`pm2 reload ecosystem.config.cjs --env production` does zero-downtime reloads worker-by-worker — use this after a deploy instead of `restart`.

## Documentation

- `docs/ARCHITECTURE.md` — System architecture, module system, ORM, page builder, CMS
- `docs/INSTALLATION.md` — Setup guide for all three servers
- `docs/DEVELOPMENT.md` — Developer guide: creating modules, views, blocks, testing
- `docs/TESTING.md` — Test configuration and patterns
- `docs/MIGRATION_GUIDE.md` — Upgrade procedures, database migrations, backups

### Public Release (v2.0)
- `docs/INDEX.md` — Documentation index and navigation guide
- `docs/deployment/seo_strategy.md` — SEO keyword targeting, on-page optimization, content marketing strategy
- `docs/deployment/public_release_roadmap.md` — Full v2.0 launch roadmap (Phases 5-7, July-Sept 2026) with documentation requirements
- **Status**: Production-ready. System stable with zero critical issues. All 23 modules functional. Performance P95 < 300ms.
