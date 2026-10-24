# Testing and verification

Updated 2026-10-24. Test results certify the exercised behavior, not unfinished
handlers. See [acceptance cases](UAT_TEST_CASES.md) and
[the migration tracker](nestjs-migration-tasks.txt).

## Commands

```bash
npm --prefix backend/lume-nestjs test -- --runInBand --forceExit
pnpm --filter @lume/web-lume test run --maxWorkers=1
pnpm --filter @lume/riagri-website test run --maxWorkers=1
pnpm --filter lume-backend build
pnpm --filter @lume/web-lume build
pnpm --filter @lume/riagri-website build
pnpm --filter @lume/web-lume typecheck
pnpm --filter @lume/riagri-website typecheck
```

Backend tests live under `backend/lume-nestjs/test`, including GraphQL/HTTP integration
fixtures. `backend/tests` contains legacy Express tests. The backend workspace
`test` command delegates to NestJS, but direct npm commands above simplify passing
Jest arguments through the task gateway.

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
pnpm --filter @lume/web-lume test:e2e
```

## Latest recorded evidence

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
