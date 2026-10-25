# Testing and verification

Updated 2026-10-25. Test results certify the exercised behavior, not unfinished
handlers. See [acceptance cases](UAT_TEST_CASES.md) and
[the migration tracker](nestjs-migration-tasks.txt).

## Commands

```bash
pnpm --filter @lume/api test --runInBand --forceExit
pnpm --filter @lume/admin test run --maxWorkers=1
pnpm --filter @lume/website test run --maxWorkers=1
pnpm --filter @lume/api build
pnpm --filter @lume/admin build
pnpm --filter @lume/website build
pnpm --filter @lume/admin typecheck
pnpm --filter @lume/website typecheck
```

Backend tests live under `apps/api/test`, including GraphQL/HTTP integration
fixtures. `legacy/express/tests` contains legacy Express tests. All commands target application packages directly; there is no backend gateway.
Run `python3 scripts/check_layout.py` to validate workspace ownership and lockfiles.

## Database isolation

The integration harness creates uniquely named disposable MySQL databases, applies
its test schema and drops only databases it created. Supply
`GRAPHQL_TEST_DATABASE_URL` (or the configured DATABASE_URL fallback) using private
local configuration with permissions appropriate for creating disposable databases.
Do not print or commit credentials. Confirm test isolation before adding destructive
setup code; never reset the application database for tests.

## Browser checks

The administrator Playwright suite reads `LUME_E2E_API_URL`,
`LUME_TEST_ADMIN_EMAIL`, and `LUME_TEST_ADMIN_PASSWORD`. Provision an isolated API,
fixtures and account; do not use production data. Tenant-aware approval cases
require a real tenant claim. Test provider-disabled behavior without enabling
external deliveries. Browser availability and required system libraries vary by host.

```bash
pnpm --filter @lume/admin test:e2e
```

## Latest recorded evidence

- 2026-10-25 workflow-definition validation: backend 81 suites / 845 tests passed;
  admin 82 tests, types and build passed. API/admin lint have zero errors.
- 21 focused HTTP/database and JSON-persistence checks cover structural validation,
  management permissions, activation, partial updates, rollback and concurrent edits.
- Complete AppModule startup, health and GraphQL passed. The local API restarted
  successfully; the deployed validation endpoint rejects anonymous requests.
- No schema migration was required. Frontend assets remain built but undeployed.


- Global search migration: full backend 80 suites / 826 tests passed; final focused
  search/migration rerun passed 24 tests after the document-rule follow-up.
- Migration 017 preserves documents with or without a preexisting deleted_at column.
  Backup checksum and restore verified (141 tables, 16 previous migrations).
- Full isolated startup/health/GraphQL passed. Local migration 017 applied and API
  restarted; health passed and anonymous search returns 401.


- Canonical workspace: API 809 tests, admin 80 tests, website 6 tests passed.
- All three images build from the frozen lockfile. API AppModule, Prisma, Sharp and
  upload-directory permissions pass; admin and website startup/HTTP asset checks pass.
- Installed API restarted from apps/api; HTTP health and GraphQL passed.
- Isolated full AppModule startup, HTTP health and GraphQL passed from apps/api.
- Lint has zero errors; existing warning debt remains (API 1142, admin 147, website 25).

- Shared UI extraction: admin 80 tests, website 6 tests; both builds/types passed.
- Final pre-commit backend full run: 79 suites / 809 tests passed, including the sequence follow-up.
- Sequence follow-up: 10 targeted tests passed, including real MySQL allocation,
  authorization, persistence and rewind rejection; backend build/startup passed.
- Approval inbox: 24 HTTP/JWT/MySQL tests and 11 frontend adapter tests passed.
  Chromium verified approve, reject with reason, and terminal history including actor
  and timestamp. The installed Firefox/CLI versions were incompatible for this check.
- Earlier login/navigation browser checks covered five browser projects; that does
  not establish multi-browser coverage for every newly added feature.

The final full run completed on 2026-10-24; no suites failed.
Evidence counts overlap and must not be added together as distinct test totals.

## Required regression coverage

Validate both positive and negative paths: role/tenant/record access, session
revocation, unknown IDs, omitted versus false/empty fields, transaction rollback,
concurrent decisions/allocations, malformed JSON, and disabled integrations.
A mock returning the desired response is insufficient for a persistence contract;
use isolated HTTP/database checks for critical data flows. Replace tests asserting
placeholder success with tests for real state changes.

## Remaining release gates

Run a fresh-install/build verification, complete required API/data migration,
verify remaining browser workflows, test backup/restore and cutover rollback,
and verify the deployed clients contact NestJS only. Source inventory matches and
passing tests are not substitutes for these gates.

## Manual state execution — 2026-10-25

- Full backend: 82 suites / 861 tests passed. Focused execution tests: 15 passed
  after adding the production validation pipe to cover real startup behavior.
- Coverage includes tenant/private/record-rule denials, immutable snapshots,
  concurrent and stale decisions, atomic rollback when history persistence fails,
  completion, unsupported behavior and migration 018 replay/data preservation.
- Admin: 85 tests passed; execution component checks versioned payloads, disabled
  actions and numeric IDs. History rendering is covered by a focused regression.
- Local backup restored successfully: 141 tables and 17 prior migrations. Migration
  018 applied; restarted API health and missing-auth denial pass. Clients remain
  undeployed. External provider tests remain disabled by user choice.
- Chromium on isolated data: login, numeric execution ID, disabled approval action,
  new → review → done, visible actor/time history and persisted completion after
  reload passed. The initial history rendering issue was fixed and regression-tested.
  Browser fixture creation used the API; the designer Run button was not browser-tested.
- Final API/admin lint: zero errors (existing warning debt remains). API build,
  admin types/build, layout validation and local GraphQL probe passed.

## Documentation-only updates

For documentation-only commits, validate relative links in active guides and new
links in historical documents, run `python3 scripts/check_layout.py`, and check
`git diff --check`. Application suites need not be rerun when runtime code and
configuration are unchanged. Preserve the original dates and scope of application
test evidence rather than reporting those checks as newly executed.
