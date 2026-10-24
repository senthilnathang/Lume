# Deployment and migration cutover

Updated 2026-10-24. The existing local NestJS service is deployed; the latest
frontend contract and structural changes have not been deployed. Commit/push does
not constitute deployment or database migration.

The service currently runs from `backend/lume-nestjs`. Follow its
[operations guide](../backend/lume-nestjs/deploy/OPERATIONS.txt) and
[migration ledger instructions](../backend/lume-nestjs/migrations/README.md).
Do not move it to `backend/api` until working-directory, environment, build and
rollback references are prepared. Existing root Docker/PM2/CI paths need the audit
tracked by M14; they are not all certified NestJS deployment paths.

Before cutover: complete required contracts and data reconciliation, verify fresh
install/build, run regression and browser acceptance checks, create/restore-test a
backup, prepare rollback, and verify provider-disabled startup. Configure the admin
and website origins/proxy to reach NestJS. An Express fallback is not the selected
migration approach. Remove legacy runtime and compatibility links only after these
gates pass. External email, push and AI integrations remain disabled.

See [roadmap](MIGRATION_PRODUCTION_ROADMAP.md), [testing](TESTING.md), and
[the task list](nestjs-migration-tasks.txt).
