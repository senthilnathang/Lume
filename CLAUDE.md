# Lume Framework — Claude Code Instructions

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

### General
- The frontend is a Vite + Vue 3 + TypeScript app at `frontend/apps/web-lume/`.
- API calls go through the Vite dev proxy (`/api` -> `http://localhost:3000`).
- Backend serves module static views from `/modules/{moduleName}/static/views/`.

## Backend Rules

### ES Modules
- The backend uses `"type": "module"` — all `.js` files are ESM. Never use `require()` or `module.exports`.
- Manifest files (`__manifest__.js`) must use `export default {}`, not `module.exports`.

### BaseModel softDelete
- When passing options to `new BaseModel()`, use `softDelete: false` to disable soft deletes — NOT `paranoid: false`. BaseModel overrides `paranoid` with its own `softDelete` check.

### Database
- DB type: MySQL. Credentials: `gawdesy`/`gawdesy`, database `lume`.
- User model has a `beforeCreate` hook that hashes passwords automatically. Never double-hash in seed scripts.
- AuditLog model is owned by the Base module. Do not re-register it in `database/models/index.js`.

### Testing
- Jest with ESM: requires `NODE_OPTIONS='--experimental-vm-modules'` and `transform: {}` in jest.config.cjs.
- Use `import { jest } from '@jest/globals'` for jest globals in test files.
