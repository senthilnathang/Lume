# Contributing to Lume

The active backend is NestJS with Prisma/Drizzle and MySQL. The administration
client uses Vue 3; the public site uses Nuxt 3. The standalone Express migration
is still in progress.

Read [installation](docs/INSTALLATION.md), [development](docs/DEVELOPMENT.md),
[architecture](docs/ARCHITECTURE.md), and [open migration tasks](docs/nestjs-migration-tasks.txt).
Follow the [Code of Conduct](CODE_OF_CONDUCT.md) and [security reporting policy](SECURITY.md).

## Workflow

1. Make focused changes with explicit behavior and acceptance criteria.
2. Put backend changes in `backend/lume-nestjs`, and shared browser assets in
   `packages/@lume/module-ui`. Do not create new legacy Express modules.
3. Apply authentication, role/permission checks, tenant boundaries and input
   validation. Use transactions and database regressions for critical writes.
4. Run checks appropriate to the change using [TESTING.md](docs/TESTING.md).
5. Update canonical docs and the migration tracker with actual evidence and limits.
6. Submit a change description explaining the behavior, validation and remaining risks.

Never commit secrets, private logs, database backups or browser authentication state.
Do not reset production data for tests. Existing `legacy:*` commands are migration
comparison tools, not the recommended setup path. The old generator and historical
Express examples are not current NestJS module templates.
