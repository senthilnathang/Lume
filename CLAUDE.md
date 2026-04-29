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
- Never create new view or API files under `frontend/apps/web-lume/src/views/` or `src/api/` for module-specific functionality.

### API Client
- Axios interceptor unwraps `{success, data}` → returns `data` directly.
- Frontend handlers must NOT re-check `result.success` after await — resolved promise = success, rejected = error (caught in catch block).

### General
- The admin panel is a Vite + Vue 3 + TypeScript app at `frontend/apps/web-lume/`.
- The public site is a Nuxt 3 SSR app at `frontend/apps/riagri-website/`.
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

- **Path**: `frontend/apps/riagri-website/` — SSR public-facing site.
- **Pages**: `index.vue`, `products.vue`, `services.vue`, `about.vue`, `contact.vue`, `[...slug].vue` (catch-all for CMS pages).
- **Content rendering**: All pages use TipTap JSON rendered through `PageRenderer` → `BlockRenderer`.
- **Navigation**: Desktop dropdown menus (hover), mobile accordion (tap). Menu data from `GET /api/website/public/menus/header` with nested `children` arrays.
- **Composables**: `useWebsiteData()` for menus/settings, `usePageContent(slug)` for page content.

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
