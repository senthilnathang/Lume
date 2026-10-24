# Developer guide

Updated 2026-10-24. Start with [installation](INSTALLATION.md) and
[current architecture](ARCHITECTURE.md). Track remaining work in
[nestjs-migration-tasks.txt](nestjs-migration-tasks.txt).

## Commands

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @lume/api db:generate
pnpm run dev:admin                       # NestJS + Vue admin
pnpm --filter @lume/website dev
pnpm --filter @lume/api build
pnpm --filter @lume/admin build
pnpm --filter @lume/website build
pnpm --filter @lume/api typecheck
pnpm --filter @lume/admin typecheck
pnpm --filter @lume/website typecheck
```

The three active packages are `@lume/api`, `@lume/admin`, and `@lume/website`.
The root scripts and `lume.sh` use these packages. Legacy applications and tooling
are under `legacy/` and excluded from the workspace. Lint is read-only; `lint:fix`
modifies files. Do not run legacy database setup commands on the active database.

## Implementing a backend feature

1. Add or extend `apps/api/src/modules/<feature>` with a module,
   controller, DTOs and service. Register it in the application/module graph.
2. Validate inputs and apply explicit authentication/authorization. Propagate the
   authenticated actor and tenant; never trust caller-supplied identity fields.
3. Implement persistence and transaction boundaries in the service. Map errors to
   actual failure responses; do not return success from placeholders.
4. Add GraphQL transport adapters only when they delegate to implemented services.
   Allocations and other writes belong in mutations, not queries.
5. Add regression tests for meaningful behavior: denial paths, missing records,
   partial updates, concurrent writes, rollback, and JSON response shapes.
6. Update the matching browser adapter and verify the actual routed screen.

NestJS TypeScript compiles to CommonJS with decorators. Frontend packages use
ES modules. Do not apply legacy Express module conventions to the Nest application.
The generator in `legacy/packages/create-lume-app` still targets legacy modules
and requires migration before reuse.

## Shared UI

Put browser code in `packages/@lume/module-ui/src/modules/<feature>/static`.
The admin's `@modules` alias and website's `@widgets` alias resolve there.
Application configs supply frontend dependencies explicitly. Preserve relative
imports and verify both consumers when changing shared widgets. Temporary symlinks
under `legacy/express/src/modules` are compatibility paths; do not create a second copy.

## Database changes

Use the active Prisma schema and ordered SQL migrations under `apps/api`.
Review the schema and migration ledger, back up existing data, test changes on a
disposable database, and verify restore before production changes. The migration
runner supports `--status` and explicit `--apply <filenames...>`; review the migration README before applying changes.
Generated clients are rebuilt by the backend build/typecheck pre-scripts.

## Testing and documentation

Follow [TESTING.md](TESTING.md) and update [UAT_TEST_CASES.md](UAT_TEST_CASES.md).
Regenerate both source inventories when contracts change:

```bash
python3 scripts/audit_frontend_contracts.py
python3 scripts/audit_backend_migration.py
```

These scans do not establish runtime reachability, authorization, payload compatibility
or feature completeness. Record actual evidence in the migration tracker. Never
commit credentials, database dumps, raw browser sessions or private logs.
