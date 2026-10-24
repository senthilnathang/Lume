# Deployment guide

Updated 2026-10-24. The active stack is NestJS, Vue 3 and Nuxt 3. The full
Express replacement remains in progress; recent changes are not yet deployed.

- [Installation](INSTALLATION.md)
- [Architecture and folder ownership](ARCHITECTURE.md)
- [Developer workflow](DEVELOPMENT.md)
- [API contracts](API_REFERENCE.md)
- [Testing](TESTING.md) and [acceptance cases](UAT_TEST_CASES.md)
- [Migration roadmap](MIGRATION_PRODUCTION_ROADMAP.md) and [task tracker](nestjs-migration-tasks.txt)
- [Deployment](DEPLOYMENT.md)

Shared browser assets live in `packages/@lume/module-ui`. The active backend
remains at `backend/lume-nestjs`; `backend/api` is the planned final path.
External integrations remain disabled. Historical reports must not be used as
current completion or deployment certification.
