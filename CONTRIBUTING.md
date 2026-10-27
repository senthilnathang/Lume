# Contributing to Lume

The active backend is NestJS with Prisma/Drizzle and MySQL. The administration
client uses Vue 3; the public site uses Nuxt 3. The standalone Express migration
is still in progress.

Read [installation](docs/INSTALLATION.md), [development](docs/DEVELOPMENT.md),
[architecture](docs/ARCHITECTURE.md), and [open migration tasks](docs/nestjs-migration-tasks.txt).
Follow the [Code of Conduct](CODE_OF_CONDUCT.md) and [security reporting policy](SECURITY.md).

## Workflow

1. Make focused changes with explicit behavior and acceptance criteria.
2. Put backend changes in `apps/api`, and shared browser assets in
   `packages/@lume/module-ui`. Do not create new legacy Express modules.
3. Apply authentication, role/permission checks, tenant boundaries and input
   validation. Use transactions and database regressions for critical writes.
4. Run checks appropriate to the change using [TESTING.md](docs/TESTING.md).
5. Update canonical docs and the migration tracker with actual evidence and limits.
6. Submit a change description explaining the behavior, validation and remaining risks.

Never commit secrets, private logs, database backups or browser authentication state.
Do not reset production data for tests. Applications under `legacy/` are migration comparison references, not workspace
packages or setup entry points. The old generator and historical
Express examples are not current NestJS module templates.

## Migration contribution requirements

Framework-first priorities F01–F07 govern the current work; preserve completed
module work while deferring feature expansion. Use [current status](docs/MIGRATION_STATUS.md)
and the tracker to distinguish implemented behavior, automated evidence and
remaining rollout gates. Update README, architecture, developer/API guidance,
roadmap and acceptance cases when their contracts change.

Runtime modules must follow the [extension contract](docs/DEVELOPMENT.md#framework-extension-contract).
Reuse shared providers, validate tenant/actor access at deferred execution boundaries,
and test denial, concurrency and rollback behavior. Never infer executable module
entrypoints or company ownership from unreviewed database rows. SQL changes need
isolated replay/data-preservation evidence and a reviewed rollout plan. A successful
commit or push does not authorize or perform application database migration.
