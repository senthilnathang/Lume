# Troubleshooting

Common issues and fixes. See also [`INSTALLATION.md`](./INSTALLATION.md),
[`DEVELOPMENT.md`](./DEVELOPMENT.md), and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Install & dependencies

**`npm install` fails with `ERESOLVE` (peer dependency conflict).**
The repo is a **pnpm** workspace; some packages have peer ranges that plain npm
rejects (e.g. `eslint@8` vs `@nuxt/eslint` wanting `eslint@^9`). Use pnpm, or:
```bash
npm install --legacy-peer-deps
```

**`nuxi: not found` / Nuxt commands fail.** The public site deps aren't installed:
```bash
cd apps/riagri-website && npm install --legacy-peer-deps   # then npm run dev|build|typecheck
```

**Lint fails with `ERR_MODULE_NOT_FOUND: .../packages/@lume/eslint-config/index.mjs`.**
The root `eslint.config.mjs` imports the reusable base in `packages/@lume/eslint-config/`.
That package **must be present** (it is committed). If you see this, you're on an old
checkout/branch from before it was committed — rebase onto current `main`.

## Database

**Backend can't connect / `getaddrinfo … "None"`.** `DATABASE_URL` (or `DB_HOST`/
`DB_NAME`/`DB_USER`/`DB_PASSWORD`) isn't set. Copy `.env.example` → `backend/.env` and set:
```
DATABASE_URL="mysql://gawdesy:gawdesy@localhost:3306/lume"
```
The `mysql://` scheme + `mysql2` driver are **MariaDB-compatible** wire identifiers — keep them even though the DB is MariaDB 10.11.

**Boot warns about missing module tables / `Table parity` warning.** `prisma db push`
only creates the 11 Prisma core tables; the Drizzle module tables need a separate pass:
```bash
node src/scripts/setupDrizzle.js     # idempotent — creates the 96 module tables
```
`db:setup` runs this for you. In prod, `LUME_STRICT_TABLE_PARITY=true` makes a missing
table a hard boot failure instead of opaque 500s.

**Fresh install from scratch:**
```bash
cd backend && npm run db:setup       # refreshDb → prisma push → setupDrizzle → createAdmin → seedData
```
Seed admin: `admin@lume.dev` / `Admin@Lume!1` (rotate before any non-local deploy).

## Auth

**Login returns 401 / "not found".** The endpoint is **`POST /api/users/login`**, not
`/api/auth/login` (the user module owns login; the auth module owns roles/permissions).
The response returns both `data.token` and `data.accessToken`.

**Need to reset the admin password:**
```bash
LUME_TEST_ADMIN_PASSWORD='<new>' node backend/scripts/reset-admin-password.mjs
```
Never hard-code passwords in scripts/tests — they're env-driven for this reason.

## Frontend (admin panel + public site)

**`props.moduleName is undefined` (component crash).** Dynamic routes using
`ModuleView.vue` must pass `props: { moduleName }` in the route definition — both the
access guard in `router/index.ts` and `addDynamicRoutes()` must set it consistently.

**`<a-*>` Ant Design components don't render.** Ant Design Vue must be registered
globally in `main.ts` via `app.use(Antd)`. Verify imports there before adding new `<a-*>`
components. (Icons use `lucide-vue-next`, not `@ant-design/icons-vue`.)

**Public site shows localhost URLs in sitemap/canonical/JSON-LD.** Set the site origin:
```
NUXT_PUBLIC_SITE_URL=https://your-domain   # nuxt site
SITE_URL=https://your-domain               # backend sitemap/robots (or the site_url setting)
```
Defaults to `http://localhost:3100` when unset.

## Ports

| Service | Port | Start |
|---------|------|-------|
| Backend (Express) | 3000 | `cd backend && npm run dev` |
| Admin panel (Vue 3) | 5173 | `cd apps/web-lume && npm run dev` |
| Public site (Nuxt 3) | 3100 | `cd apps/riagri-website && npm run dev` |

## CI

**Dependabot PR CI is red but `main` is green.** If the failures are `Setup Node.js`
("paths were not resolved") or lint `ERR_MODULE_NOT_FOUND`, the PR is branched off an
**old `main`** (pre-reorg cache paths / before the eslint base was committed). Rebase the
PR onto current `main` (or let Dependabot recreate it). The deploy/build/publish jobs
correctly **skip** on PRs (`github.event_name == 'push'`).

**Tests fail in CI with ESM errors.** Jest needs `NODE_OPTIONS='--experimental-vm-modules'`
and `transform: {}` (see `jest.config.cjs`); use `import { jest } from '@jest/globals'`.
