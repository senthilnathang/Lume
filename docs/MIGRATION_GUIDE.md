# NestJS migration and upgrade guide

Updated 2026-10-27. The active stack is NestJS, Vue 3 administration and Nuxt 3
public website. Required Express behavior and legacy data reconciliation remain
in progress; this guide does not certify a complete replacement.

## Canonical ownership

| Path | Owner |
|---|---|
| `apps/api` | NestJS business API, Prisma/Drizzle persistence and SQL migrations |
| `apps/admin` | Vue administration application |
| `apps/website` | Nuxt public website |
| `packages/@lume/module-ui` | Shared browser components and API adapters |
| `legacy` | Inactive Express application, old generators and tooling |

Use Node.js 22.12 or newer and the root-pinned pnpm 10.28.2. Install from the root
with the single active `pnpm-lock.yaml`; do not install the legacy applications.
NestJS's Express HTTP adapter is distinct from the standalone application being retired.

## Upgrade an existing installation

1. Record the deployed commit, service configuration, client API origins and SQL
   ledger. Review the [open tasks](nestjs-migration-tasks.txt) for required behavior.
2. Create a private consistent database backup and preserve uploads/configuration.
   Verify the checksum and restore into a disposable database before changing data.
3. Check out the reviewed revision, install the frozen lockfile and generate the
   Prisma client. Keep secrets in private environment files.
4. Review applicable SQL files and apply them with the canonical ledger runner.
   Do not use `prisma db push`, legacy refresh scripts or assumed startup schema
   synchronization to migrate existing data.
5. Build and test using [DEVELOPMENT.md](DEVELOPMENT.md) and [TESTING.md](TESTING.md).
   Backend integration tests require isolated data, not the deployed database.
6. Deploy the API using [DEPLOYMENT.md](DEPLOYMENT.md), check HTTP health and
   GraphQL, then verify the required authenticated browser flows.
7. Build/deploy each client with its intended NestJS API origin. Git publication
   and a local API restart do not deploy client assets.

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @lume/api db:generate
pnpm --filter @lume/api build
pnpm --filter @lume/admin build
pnpm --filter @lume/website build
```

See the [migration runner documentation](../apps/api/migrations/README.md) for
selection and ledger commands. A fresh installation still requires a reviewed
baseline schema; the additive SQL ledger is not a substitute for that baseline.

## Current database changes

Migration 017 aligns document soft deletion. Migration 018 adds
`workflow_state_executions` and `workflow_state_history`, preserving existing
legacy tables. Manual executions retain immutable definitions, tenant/record
bindings and versioned history. Neither migration imports old execution history.
The local API has applied both; other environments must inspect their own ledger.

Migrations 019–023 are prepared and remain unapplied to the application database:
019 adds schedules, 020 approval bindings, 021 field-mask columns, 022 tenant
registry and 023 module configuration. Review the target ledger and all five
requirements before deploying this combined source. Run the read-only
`pnpm --filter @lume/api verify:framework-db` preflight; discrepancies require
reconciliation rather than implicit startup repair.

Manual transitions now support record-field conditions and version-bound approval
gates. Approval completion is followed by an explicit transition with fresh access
and condition checks. Group, timer, webhook and other advanced behavior remain
pending. See the exact [API contract](API_REFERENCE.md) and
[current migration status](MIGRATION_STATUS.md).

## Rollback and retirement

Keep the previous application artifact and a verified backup. For additive
migration 018, an application rollback should preserve the new tables and history.
A database restore can discard writes made since the backup; plan recovery and
reconciliation before restoring a live database. Stop only the affected service,
not unrelated Node processes.

Retire legacy source only after required feature parity, data reconciliation,
client cutover and rollback acceptance pass. External email/push/AI integrations
remain disabled. [The roadmap](MIGRATION_PRODUCTION_ROADMAP.md) and
[acceptance cases](UAT_TEST_CASES.md) define the remaining work.
