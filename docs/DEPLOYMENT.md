# Deployment and migration cutover

Updated 2026-10-25. Canonical apps are `apps/api`, `apps/admin` and `apps/website`.
The installed API service now runs from `apps/api` and has passed HTTP health
and GraphQL checks after restart. Newly built client assets are not deployed.
Git publication is distinct from deployment.

## API service

Follow [operations](../apps/api/deploy/OPERATIONS.txt) and the
[migration ledger instructions](../apps/api/migrations/README.md). Install once at
the root with `pnpm install --frozen-lockfile`; build with
`pnpm --filter @lume/api build`. Render the service using
`node apps/api/scripts/render-service.cjs`; validate/install it and reload systemd
before restart. Keep private API configuration in `apps/api/.env`.

The root PM2 configuration also targets `apps/api/dist/main.js`. Use one process
manager per API instance. Container and PM2 templates disable workers by default;
the existing systemd service retains its configured internal worker settings.
External email, push and AI integrations remain disabled.

## Containers

Use the repository root as the build context:

```bash
docker build -f apps/api/Dockerfile -t lume-api .
docker build -f apps/admin/Dockerfile -t lume-admin .
docker build -f apps/website/Dockerfile -t lume-website .
```

Compose contains MariaDB, NestJS, Vue admin and Nuxt website. Copy `.env.example`
to a private root `.env` and supply credentials, DATABASE_URL, JWT secret and the
public website API URL. URL-encode database credentials; use hostname `db`.
No database port is exposed, and application ports bind to loopback by default.

NUXT_PUBLIC_API_BASE must be reachable by browsers and the SSR container. Use the
externally routed API URL ending in `/api/v2/website/public`; container localhost
is not the host API. Admin nginx proxies `/api/` to NestJS. Configure public TLS
and routing separately. `docker compose config --quiet` validates without printing
secrets.

Provision the reviewed schema and SQL ledger before starting the API. Compose
does not automatically reset, import or mutate existing data. Follow the migration
README using host API tooling with a secure database connection. The runtime image
contains production dependencies; Prisma generation happens during image build.
Image validation does not certify database bootstrap or full feature parity.

## CI and release gates

The active CI workflow installs the root frozen lockfile and verifies lint, types,
builds, isolated backend tests, frontend tests and workspace ownership. Historical
Express workflows under `legacy/ci` cannot run as active GitHub workflows.

Before full cutover, complete required contracts and data reconciliation, verify
critical browser flows, restore-test a backup, prepare rollback, and verify
provider-disabled startup. Deploy clients and confirm requests reach NestJS.
Remove retained legacy source only after these gates pass. See the
[roadmap](MIGRATION_PRODUCTION_ROADMAP.md) and [tasks](nestjs-migration-tasks.txt).

## Latest local rollout evidence

Implementation revision `6a96a881` includes manual state execution. Before applying
migration 018, a private backup was checksum-verified and restored successfully
(141 tables, 17 existing ledger entries). The additive migration was applied and
`lume-nestjs.service` restarted; HTTP health, GraphQL and missing-auth rejection
passed. No workflow fixtures were written to the deployed database.

The admin execution flow was checked against an isolated API/database. Its built
assets are not deployed. This evidence does not certify frontend production routing,
legacy data import, complete feature parity or a complete rollback exercise.
