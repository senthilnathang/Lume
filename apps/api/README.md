# NestJS API

Package: `@lume/api`. The only active business backend. REST: `/api/v2`.
GraphQL: `/api/v2/graphql`. Default port: 3000.

Install once at the root using `pnpm install --frozen-lockfile`. Configure this
app's `.env` from `.env.example`, then run these commands from the root:

```bash
pnpm --filter @lume/api db:generate
pnpm --filter @lume/api dev
pnpm --filter @lume/api build
pnpm --filter @lume/api test --runInBand
```

Tests need isolated database configuration: [testing](../../docs/TESTING.md).
External providers remain disabled. See [structure](../../docs/STRUCTURE.md),
[migrations](migrations/README.md), [operations](deploy/OPERATIONS.txt), and
[open tasks](../../docs/nestjs-migration-tasks.txt). Historical completion reports
are not current release sign-off.

Current framework services include shared identity/RBAC and database ownership,
persisted settings/audit APIs, tenant registry and single-company membership,
production module discovery and optimistic module configuration/reload.
Runtime definitions are explicitly supplied through `MODULE_ENTRYPOINTS`; examples
are disabled by default. Required load failures abort startup before worker polling.
See [development](../../docs/DEVELOPMENT.md) for the extension contract.

The last recorded application ledger is through 018; migrations 019–023 remain
prepared and unapplied. Review [migration instructions](migrations/README.md) before
deploying this source. `pnpm --filter @lume/api verify:framework-db` is read-only.
Framework sign-off, data reconciliation and client rollout remain open; see
[current status](../../docs/MIGRATION_STATUS.md) and
[dated test evidence](../../docs/TESTING.md). Default Jest discovery runs `.spec.ts`
files; historical `.test.ts` examples are not certified by this suite.
