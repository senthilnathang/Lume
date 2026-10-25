# Local development

Updated 2026-10-25. The active stack is NestJS, Vue 3 and Nuxt 3. The full
Express replacement remains in progress. The local API includes migration 018;
updated admin assets are built but not deployed.

- [Installation](INSTALLATION.md)
- [Architecture and folder ownership](ARCHITECTURE.md)
- [Developer workflow](DEVELOPMENT.md)
- [API contracts](API_REFERENCE.md)
- [Testing](TESTING.md) and [acceptance cases](UAT_TEST_CASES.md)
- [Migration roadmap](MIGRATION_PRODUCTION_ROADMAP.md) and [task tracker](nestjs-migration-tasks.txt)
- [Deployment](DEPLOYMENT.md)

Shared browser assets live in `packages/@lume/module-ui`. The active backend
is at its canonical path, `apps/api`. Both clients also live under `apps/`;
no further backend folder move is planned.
External integrations remain disabled. Historical reports must not be used as
current completion or deployment certification.
