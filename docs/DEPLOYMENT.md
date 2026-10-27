# Deployment and migration cutover

Production runtime modules: package compiled CommonJS entrypoints with the release
and configure `MODULE_ENTRYPOINTS` explicitly. For example, with `apps/api` as the
working directory: `[{"specifier":"./dist/extensions/acme.module.js","export":"AcmeModule"}]`.
Already-installed package names are also supported. Deploy dependencies together;
the initializer orders them and treats framework `base` as supplied. Keep examples
disabled in production. Do not set `AUTO_MIGRATE_MODULES=true`; apply the reviewed
migration plan before startup. Startup now fails on required module errors instead
of serving a partial registry. Polling begins only after module initialization.
Restart is required to change entrypoints/source code; config reload is separate.

Module configuration follow-up: migration 023 must precede configurable module
adoption. Desired values are shared in MySQL; applied revisions are process-local.
After a save, reload each instance with a supported hook or restart and verify
`configPending=false` on each instance. Reload is not source-code replacement or
distributed rollout. Validation failures prevent application; hook authors must
preserve prior state on failure. This migration remains prepared and unapplied.

Tenant registry follow-up (2026-10-27): apply migration 022 before deploying the
current revision; company-scoped authentication reads `tenant_registry`. The
registry starts empty and does not backfill company ownership. Review preflight's
unregistered company IDs and user metadata assignments before enabling strict
tenant onboarding. Unregistered legacy company behavior remains compatible;
registered inactive/archived tenants are denied on protected requests. Retain a
company-unscoped platform administrator. Workers, schedules and subscription
delivery use registry checks at dispatch/action/event boundaries. Existing in-flight
effects are not cancelled. This migration is prepared, not deployed.

Membership follow-up: `setUserTenant` updates existing user metadata and revokes
active sessions atomically; no additional schema migration is required. Run the
read-only preflight before deploying: malformed metadata and noncanonical company
assignments now fail authentication instead of being silently ignored. Managed
users must sign in again after an assignment change. Explicit unassignment blocks
old company claims; absence of the metadata key retains legacy compatibility.
Review ownership before assigning users; the registry does not infer memberships.

Framework-first follow-up (2026-10-27): the read-only configured-database preflight
found missing field-mask columns. Review `021_align_framework_field_masking.sql`
alongside the target ledger and outstanding 019/020 requirements before deploying
the current combined source. Migration 021 has only been tested in disposable
databases. Core metadata/source checks do not replace a verified backup, restore
rehearsal, full schema reconciliation and rollback plan. No deployment or database
change occurred in this framework verification batch.

Updated 2026-10-27. Canonical apps are `apps/api`, `apps/admin` and `apps/website`.
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
## Scheduled workflows — migration 019

The later approval-gate revision also requires migration
`020_bind_workflow_state_approvals.sql` before deploying the API, because state
history reads/writes include the new nullable approval request column. Follow the
existing backup and ordered migration process, applying outstanding 019 and 020
as appropriate to the target ledger. Verify existing history preservation and
the new binding table on an isolated restore first. Migration 020 does not enable
any worker/provider or automatically advance workflow states. It has only been
exercised in disposable test databases; the recorded local deployment remains
through 018.

New scheduled-workflow code requires `019_create_workflow_schedules.sql` before
the scheduled-action API is used. Keep `AUTOMATION_SCHEDULER_ENABLED=false` during
deployment and migration review. Follow the existing backup/restore and migration
runner procedure; the new table does not replace or alter legacy schedule rows.

After verifying the registered workflows and their actors' access, enable
`AUTOMATION_SCHEDULER_ENABLED=true` together with the durable workflow worker.
Restart the service to start polling. Disabling scheduling prevents new dispatch;
disable individual schedules to prevent their queued jobs from starting. Work that
already started may finish. External provider settings remain separate and disabled.
Rollback leaves both schedule tables intact and disables the new scheduler.

This source change has not applied migration 019 to the local deployed database or
enabled polling there. The recorded local deployment remains through migration 018.
