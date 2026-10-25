# Installation and local setup

Updated 2026-10-25. The NestJS migration is in progress. Use an isolated development
database; these instructions do not authorize resetting an existing installation.

## Requirements

- Node.js 22.12 or newer; the repository pins pnpm 10.28.2.
- MySQL compatible with the active Prisma schema and SQL migrations.
- Redis only where required by enabled queue/cache features.
- Git and the platform build tools required by dependencies.

## Install dependencies

```bash
pnpm install --frozen-lockfile
pnpm --filter @lume/api db:generate
```

There is one active lockfile: `pnpm-lock.yaml`. The second command generates the
Prisma client. If installing with `--ignore-scripts`, also run
`pnpm --filter @lume/website exec nuxt prepare`.

## Configure the API

Copy `apps/api/.env.example` to `apps/api/.env` if that file
is absent. Set private database credentials and a strong JWT secret outside Git.
Keep external email/push/AI provider values empty. The template disables durable
workers/events for local setup; enable internal workers only after required schema
verification. The deployed local service has its own worker settings.

Inspect the active schema, ledger and [migration instructions](../apps/api/migrations/README.md)
before applying migrations. Existing production databases require backup/restore
verification. Do not run legacy `db:setup`, refresh scripts or destructive schema
push commands as a migration shortcut.

## Run the applications

```bash
pnpm run dev:admin
pnpm --filter @lume/website dev
```

Defaults: API 3000, admin 3001, website 3100. Admin Vite proxies `/api` to the API.
For another API origin, set `VITE_API_URL` before starting/building the admin.
The website's `NUXT_PUBLIC_API_BASE` defaults to
`http://localhost:3000/api/v2/website/public`.

## Verify

Build and typecheck both clients and the backend using [DEVELOPMENT.md](DEVELOPMENT.md).
`GET /api/v2/health` should report healthy startup. GraphQL is `/api/v2/graphql`.
Run tests with the isolated database procedure in [TESTING.md](TESTING.md).
A successful startup does not certify every migrated feature.

Manual workflow execution requires migration 018 and the generated Prisma client.
The local service's applied ledger does not imply a new database has a baseline
schema. Follow the [upgrade guide](MIGRATION_GUIDE.md) for existing installations.
