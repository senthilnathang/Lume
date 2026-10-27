# Documentation index

Updated 2026-10-27. The active stack is NestJS, Vue 3 and Nuxt 3. The full
Express replacement remains in progress. The local API uses the canonical path;
built frontend assets are not yet deployed.

- [Installation](INSTALLATION.md)
- [Architecture and folder ownership](ARCHITECTURE.md)
- [Developer workflow](DEVELOPMENT.md)
- [API contracts](API_REFERENCE.md)
- [Testing](TESTING.md) and [acceptance cases](UAT_TEST_CASES.md)
- [Migration roadmap](MIGRATION_PRODUCTION_ROADMAP.md) and [task tracker](nestjs-migration-tasks.txt)
- [Deployment](DEPLOYMENT.md)

Shared browser assets live in `packages/@lume/module-ui`. The active backend
is at its canonical path, `apps/api`. Both clients also live under `apps/`.
External integrations remain disabled. Historical reports must not be used as
current completion or deployment certification.

## Reading order and current evidence

[Architecture](ARCHITECTURE.md) and [workspace structure](STRUCTURE.md) define
current ownership. [Development](DEVELOPMENT.md) and [installation](INSTALLATION.md)
contain supported commands. [Migration guide](MIGRATION_GUIDE.md) covers upgrades;
[deployment](DEPLOYMENT.md) separates local API changes from client release.

[Current migration status](MIGRATION_STATUS.md) summarizes implemented framework
services and the F01–F07 release gates. Migrations 019–023 are prepared, with the
last recorded local ledger through 018. The newest full and focused check results
are recorded in [testing](TESTING.md); older counts are historical milestones.

The [roadmap](MIGRATION_PRODUCTION_ROADMAP.md) and [acceptance cases](UAT_TEST_CASES.md)
track remaining release gates. Historical plans under `architecture/`, `roadmap/`,
`superpowers/` and `archived/` describe earlier designs or evidence; their completion
claims do not certify the current migration. External integrations remain disabled.
