# Testing and verification

## Combined migration publication checks — 2026-10-27

Final checks of the source included in this commit:

| Check | Result |
|---|---|
| Full API Jest regression (`--runInBand`, normal process exit) | 98 suites / 1,146 tests passed; 1,114.765 seconds |
| Admin Vitest (`run --maxWorkers=1`) | 20 files / 108 tests passed |
| Website Vitest (`run --maxWorkers=1`) | 2 files / 6 tests passed |
| API, admin and website production builds | All passed |
| Admin and website typechecks | Both passed |
| API lint | Zero errors; 1,174 warnings |
| Workspace layout and staged whitespace | Passed |
| Local file links in changed Markdown documents | Passed after repairing two historical README links |
| Regenerated source inventories | 69 frontend calls and 80 backend markers need review; 23 core models, seven requiring review |

The initial admin run used unrestricted workers and passed 107/108 tests; the
activity timeline test exceeded its five-second timeout under concurrent load.
The complete rerun with the documented single-worker setting passed all 108,
without changing assertions or application code. Focused and older results below
overlap this run; do not add their totals to it. Default API discovery covers
`test/**/*.spec.ts`, not historical `.test.ts` example suites.

Database integration checks use disposable MySQL databases. No application
migration, API/client deployment, new browser acceptance or live external-provider
exercise was performed for publication. Migrations 019–023 and F01–F07 release
acceptance remain open; passing these checks does not certify complete migration.

## Production runtime module discovery — 2026-10-27

- Eight focused suites / 97 tests passed: explicit local/package exports,
  dependency ordering, invalid/duplicate/cyclic inputs, startup failure propagation,
  real AppModule registration, module lifecycle/catalog behavior, polling workers
  and schedules. Build passed; lint has zero errors and 1,174 warnings.
- A separate Node smoke test loaded temporary CommonJS default/named exports
  through the compiled discovery service and real loader in dependency order.
- Initial run passed 34/35: a generated fixture contained an incorrectly escaped
  newline. Correcting the fixture passed in the expanded final regression.
- Worker/scheduler polling now starts at application bootstrap after successful
  module initialization. A failing module hook prevents bootstrap-worker startup.
  Import-time/hook side effects are not transactionally rolled back.
- No new schema, application database mutation or deployment. Existing migration
  and rollout prerequisites remain open. `git diff --check` passed.

## Persisted runtime module configuration — 2026-10-27

- Six focused suites / 51 tests passed: complete AppModule REST/GraphQL configuration
  flow, persistence after loader recreation, optimistic save conflicts, validation
  and storage failures, reload failure/retry, lifecycle guards, migration replay
  and framework preflight. API build passed; lint has zero errors and 1,175 warnings.
- Final module/schema contract run passed six suites / 53 tests, including a new
  save arriving during reload without falsely advancing the applied snapshot.
  `git diff --check` passed. These focused runs overlap and are not additive totals.
- Config saving leaves runtime state unchanged until load/reload; catalog revisions
  distinguish desired from process-local applied state. Uninstall retains config.
  A database trigger verifies failed writes leave the saved revision intact.
- Source reconciliation now covers 23 models: 16 unchanged and seven requiring
  review (five prior differences plus tenant/config tables). Read-only configured
  preflight still exits 2: migrations 021, 022 and 023 remain unapplied.
- No deployment or application-data mutation. Reload is opt-in configuration
  replacement in one process, not source-code reload or distributed rollout.

## Single-company membership management — 2026-10-27

- Final focused regression passed nine suites / 127 tests covering assignment
  persistence, auth, workers, schedules, existing subscription contexts, real
  WebSockets, full startup, performance and workflow adapters. The preflight suite
  separately passed four tests. API build passed; lint has zero errors and 1,175
  warnings; `git diff --check` passed.
- Administrator set/clear preserves other metadata and revokes active sessions
  atomically. A database trigger failure proves both operations roll back together.
  Invalid/inactive targets, delegated non-admins and malformed metadata are denied.
- Old company claims fail after assignment changes; fresh login uses current
  metadata. Member jobs/schedules/steps cannot use obsolete scope. Subscription
  delivery rereads current user/role and assignment. Missing metadata assignment
  remains legacy-compatible; explicit null is managed unassignment.
- No new schema or live database change. Migration 022 remains required before
  deployment. Multi-company support, provisioning and ownership reconciliation
  are not certified by these tests.

## Tenant status at background and subscription boundaries — 2026-10-27

- Nine focused suites / 124 tests passed: jobs, schedules, real WebSockets,
  subscription filters, workflow actions, service contracts, performance and full
  AppModule startup. API build passed; lint has zero errors and 1,175 warnings.
- Tests cover blocked workflow/delivery/event jobs without handler/provider calls,
  retry after reactivation, suspension between nested steps, archived due schedules
  without enqueue, and status changes on an already-open subscription.
- Initial run passed 76/77: the new nested-step fixture used an unsupported `eq`
  operator. Correcting its condition to the supported boolean form passed on rerun.
- Jobs retain bounded retries and schedules become inactive for review. Subscription
  connections remain open while events are suppressed. Already-running effects
  are not cancelled or rolled back. Migration 022 remains required and unapplied;
  no live providers, application data changes or deployment were performed.

## Persisted tenant registry — 2026-10-27

- Initial focused verification passed six suites / 60 tests: persisted registry,
  full AppModule REST/GraphQL access, migration replay, schema wiring and auth
  contracts. API build passed; lint has zero errors and 1,175 warnings.
- Full backend regression passed 96 suites / 1,109 tests. The final preflight
  reconciliation suite separately passed all four tests (including the ownership
  reporting case added after the full run began). `git diff --check` passed.
- Registry data survives service recreation. Duplicate IDs/domains fail;
  configuration is replaced atomically. Archive retains data/identity, and
  inactive/archived entries deny protected requests, including header overrides.
- Read-only configured-database preflight exits 2: migration 021 masking columns
  and the migration 022 registry table remain missing. It observed no non-null
  company IDs or invalid user assignments in the configured database. This is
  not certification of ownership, memberships, backups or deployment readiness.
- No application database mutation or deployment. Unregistered legacy companies
  still require reconciliation; background/stream follow-up is recorded above.

## Earlier tenant API availability contracts — superseded by registry above

- Three focused suites / 23 tests passed: tenant resolver contracts, complete
  AppModule authorization/error behavior and GraphQL runtime wiring.
  API build and lint passed; `git diff --check` passed.
- All five tenant operations enforce authentication and management permissions,
  then return `NOT_IMPLEMENTED` for valid authorized requests. Unsupported
  provisioning leaves existing company-scoped records intact. Invalid config
  input returns `BAD_REQUEST`.
- Initial run passed 22/23: missing validator metadata on tenant input classes
  caused valid mutation inputs to fail before the resolver. Added validators and
  verified the corrected behavior through the complete application.
- This removes false success responses, not the tenant provisioning backlog.
  Persisted identity/company mapping, membership and inactive-tenant enforcement
  remain required. No schema, live database or deployment change was made.

## Module lifecycle dependency and concurrency checks — 2026-10-27

- Six configured suites / 45 tests passed, covering module loader/cascade/admin
  contracts, GraphQL adapter behavior and complete AppModule startup. API build
  passed; lint reports zero errors and 1,173 warnings.
- Regressions exercise transitive DB-hook preflight through both API adapters,
  dependency-first hook order, concurrent-install deduplication, competing
  load/uninstall rejection, in-flight dependency protection and failed-hook retry.
- Runtime configuration/reload remains unsupported. Hook side effects are not
  transactionally rolled back. No migration, live DB change or deployment occurred.

## Persisted framework audit queries — 2026-10-27

- Four focused suites / 26 tests passed: disposable-MySQL audit queries, resolver
  tests, schema/runtime wiring and complete AppModule startup. API build passed;
  lint reports zero errors and 1,172 warnings. `git diff --check` passed.
- Coverage includes stored JSON snapshots, nullable legacy data, arbitrary record
  IDs, equal-timestamp pagination, REST/GraphQL parity, filters/counts, invalid
  input, capped record history and denied delegated read/cleanup permissions.
- Initial run passed 25/26: REST conversion failed because the harness added its
  validation pipe after startup. Registering it before startup fixed the test.
- No live database changes or deployment. Tenant attribution and durable audit
  event delivery remain outside this completed stored-query slice.

## Framework catalog and global transport guards — 2026-10-27

- Five focused suites / 26 tests passed, including full AppModule REST/GraphQL
  catalog parity, authentication/permission denial, real runtime install/uninstall,
  dependency/hook failures, builtin protections and reload bypass prevention.
- Complete-application testing exposed an HTTP-only global throttler crashing on
  GraphQL requests before authentication. The transport-aware guard now uses the
  same limiter/storage with real HTTP/GraphQL/subscription request contexts.
  Tests enforce limits, isolate client addresses, and preserve HTTP retry headers.
- API build passed; lint has zero errors and 1174 warnings; diff checks passed.
  This is focused follow-up evidence, not a new full-backend run.
- Module configuration persistence and runtime reload remain unsupported and
  return explicit failures. Runtime registrations are process-local; no historic
  installation timestamp or durable installation is fabricated. Nothing deployed.

## Framework-first verification — 2026-10-27

- Complete backend regression passed 92 suites / 1068 tests. The earlier run had
  1044 passes and eight failures in auth success fixtures that omitted active flags.
  Fixtures now specify active state; separate tests reject inactive users/roles.
- Later focused settings/persistence/full-startup checks passed 3 suites / 15 tests;
  database preflight passed 3 tests; migration runner with 021 replay passed 12.
  These follow-ups are separate from the full-suite count.
- Admin passed 20 files / 108 tests; website passed 2 files / 6 tests. API build
  passed. Full AppModule startup verifies shared database providers, health,
  GraphQL and unauthenticated rejection on disposable data with workers disabled.
- Both client typechecks passed. Final API lint reports zero errors and 1174
  warnings. The final module lifecycle follow-up passed 2 suites / 13 tests.
- Startup fixtures require both the Prisma schema and SQL-owned extension tables
  from migrations 008/016. The initial fixture omitted those tables; actual startup
  then passed after provisioning them. No seed errors are mocked or ignored.
- `verify:framework-db` is read-only. The configured database check found missing
  `entity_field_permissions.is_masked` and `mask_char`; activity-flag null counts
  were zero. Migration 021 adds those columns and preserves existing values on
  replay. It has not been applied to the application database.
- Source reconciliation covers 21 core models: 16 unchanged, five additive/default
  differences and no table renames. It does not certify live types/indexes, row
  parity, backups, browser acceptance or release completion.

Updated 2026-10-25. Test results certify the exercised behavior, not unfinished
handlers. See [acceptance cases](UAT_TEST_CASES.md) and
[the migration tracker](nestjs-migration-tasks.txt).

## Conditional flow branches — 2026-10-27

- Focused flow HTTP/database and executor checks: 2 suites / 87 tests passed.
  Graph-bound and shared predicate checks: 2 suites / 20 tests passed.
- Coverage includes both outcomes, merged paths, branch choice persistence after
  the deciding field changes, action retry deduplication, receipt failure before
  effects, private records, hidden/masked fields, revoked field access, invalid
  edges/predicates, nesting and expanded-graph limits.
- API and admin builds passed; API lint reports zero errors and 1175 warnings.
  These are focused checks, not a new full-suite run. Browser acceptance remains
  pending. No migration was added and nothing was deployed; branch receipts use
  the existing automation receipt table.

## Manual-flow source access — 2026-10-27

- Flow HTTP/MySQL and durable worker regressions: 2 suites / 92 tests passed.
  Eight new cases cover private-source queue denial, owner/admin access, revoked
  record-read permission, inactive actor/role, hidden run history, duplicate
  submission checks and access revoked between attempts after a committed action.
- Shared flow fixtures now explicitly use public records. Private cases set the
  owner/visibility deliberately. API build passed; no frontend behavior changed.
- API lint passed with zero errors and 1176 warnings; whitespace checks passed.
- Checks ran against disposable databases. No migration or deployment occurred.

## Commands

```bash
pnpm --filter @lume/api test --runInBand --testTimeout=30000
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

- 2026-10-27 in-app flow notifications: final focused run passed 3 API suites /
  84 tests (flow runs, durable workflow jobs and action adapters). API/admin builds
  passed; API lint reports zero errors and 1,172 warnings. Tests cover recipient
  configuration, pinned graphs, sender/recipient private-record access, field
  filtering/masking, atomic receipt rollback, retry deduplication and revoked
  access before queued email/push delivery. All external delivery was mocked.
  The initial run failed one existing polling scenario because its newly created
  private record was intentionally sent to a non-owner; making that shared-record
  fixture explicitly public resolved the failure. Browser acceptance remains open.

- 2026-10-27 multi-field flow updates: 2 focused API suites / 46 tests passed
  (flow-runs HTTP/MySQL and workflow action adapters). Covers typed values,
  expressions, refreshed data for subsequent actions, invalid node configurations,
  all-field rollback on denied/unknown/invalid fields or failed receipts, and no
  repeated update when a later action retries. API/admin builds passed; API lint
  reports zero errors and 1,171 warnings. This focused
  run does not replace full-suite or browser acceptance evidence.

- 2026-10-27 manual approval gates: full API run passed 87 suites / 974 tests with
  `--runInBand --forceExit --testTimeout=30000`; full admin run passed 20 files /
  108 tests. Final focused approval run passed 19 tests, including exact transition
  code isolation for case and trailing-space differences under MySQL collation.
  API/admin builds and admin typecheck passed. Lint: zero errors, 1,171 API and
  173 admin warnings. Migration 020 creation/replay preserves prior history.
  The first focused UI run had one select-option stub assertion failure; checking
  the rendered option fixed the test and the full rerun passed. New checks cover
  version binding, unrelated approvals, rejection/retry, concurrency, revoked
  access, changed conditions/chains and atomic request/binding/history rollback.
  Browser acceptance and application of migration 020 remain pending; no services,
  application databases or provider flags were changed.

- 2026-10-27 approval private-record access: 5 integration suites / 97 tests
  passed (approval HTTP, lifecycle, notifications, triggers and durable workflow
  jobs). Includes non-owner denial after visibility/ownership changes, owner/admin
  success, assignment enforcement, private notification filtering and automatic
  starts. Existing shared-record approval fixtures now explicitly use public
  visibility. API build passed; API lint has zero errors and 1,168 warnings.
  This focused run does not certify approval-backed state transitions or browser
  acceptance; no deployment or schema changes were made.

- 2026-10-27 condition editor: 2 focused component suites / 11 tests passed,
  covering create/edit/clear/cancel, malformed JSON/object input, server error
  display and execution refresh. Admin build and typecheck passed; admin lint
  reports zero errors and 170 warnings. The first run exposed a
  missing icon-package alias in Vitest; the alias was added and the rerun passed.
  Browser acceptance remains pending.

- 2026-10-27 conditional state transitions: focused API run passed 3 suites / 58
  tests (workflow-state HTTP, workflow-validation HTTP and predicate semantics).
  Covers current record data, saved conditions, blocked history, revoked field
  read access, masking, unknown fields and malformed definitions. API build passed;
  API lint reports zero errors and 1,168 warnings. This is focused evidence, not
  a fresh full-suite certification or browser acceptance.
  Admin typecheck and all 3 focused execution-screen tests passed. The refresh
  test initially failed because the shallow header stub omitted its extra slot;
  correcting the Ant Design component stub resolved the test setup failure.

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

## Business-rule field-update editor — 2026-10-26

- Final full API run: 83 suites / 881 tests passed using the disposable database
  harness. New HTTP tests use the production ValidatePipe and cover persistence,
  execution through the secured record service, permissions, malformed saves,
  immutable identities, partial updates, explicit scalar values and missing IDs.
- Final full admin run: 17 files / 90 tests passed. Adapter tests cover JSON
  decoding and explicit status writes; routed modal tests cover typed JSON saves
  and rejection of invalid condition input without persistence.
- API/admin builds and admin type checking passed. Lint has zero errors, with
  1152 API and 152 admin warnings remaining. Layout and diff checks passed.
- An initial backend run failed a new assertion that unknown DTO fields should
  return 400; the controller intentionally strips them. The final regression
  verifies the unchanged persisted identity. An admin run had an existing display
  test timeout under concurrent load; the complete subsequent run passed.
- No schema migration or deployment. Providers remain disabled. Browser acceptance,
  scheduled actions, flow execution and advanced state-machine behavior remain open.

## Manual linear flow execution — 2026-10-26

- Full API suite: 85 suites / 919 tests passed using `--runInBand --forceExit
  --testTimeout=30000` (the longer timeout accommodates this host).
- Full admin suite: 19 files / 96 tests passed. API/admin builds and admin
  typecheck passed. Lint reported zero errors, with 1,167 API and 160 admin warnings.
- HTTP/database checks cover graph validation, edge ordering, saved snapshots,
  concurrent duplicate submission, real record effects, receipt-based retries,
  rollback on receipt failure, actor/tenant history isolation and revoked access.
  Component checks cover malformed graph JSON, draft execution prevention and
  preserving a request UUID after a failed submission.
- Browser acceptance and advanced graph/state-machine parity remain pending.
  No deployment, provider enablement or application of migration 019 occurred.

## Scheduled registered workflows — 2026-10-26

- Final full API run: 84 suites / 903 tests passed with `--runInBand --forceExit
  --testTimeout=30000`. The first run passed 901 tests but an existing bcrypt test
  exceeded its default five-second timeout on the slow host. No assertions were
  removed or application behavior changed for that timeout.
- The 22 schedule HTTP/JWT/MySQL tests cover actor/tenant isolation, invalid timing,
  stale edits, concurrent dispatch, atomic queue rollback, real workflow effects,
  pinned definitions, revoked access, model changes, migration creation/replay and
  polling startup/shutdown. Databases were disposable; legacy rows survived replay.
- Full admin suite: 18 files / 93 tests passed, including the new schedule editor
  and adapter checks. API/admin builds and admin types passed. Lint has zero errors
  (1153 API and 156 admin warnings remain). Layout and diff checks passed.
- Migration 019 has not been applied to the deployed database. Scheduler polling
  and external providers remain disabled. Live browser acceptance and legacy-code
  schedule import remain pending; this does not close all M05 or release gates.
