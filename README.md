# Lume

Lume is a modular application platform with a NestJS API, Vue 3 administration
client, and Nuxt 3 public website. Prisma and Drizzle share a MySQL database.

**Migration status — 2026-10-24:** NestJS is deployed locally, but the complete
standalone Express replacement is still in progress. The latest frontend contract
and cleanup changes have not been deployed. Do not interpret historical completion
reports as release certification. Email, push and AI integrations remain disabled.

## Start here

- [Installation](docs/INSTALLATION.md) and [developer workflow](docs/DEVELOPMENT.md)
- [Current architecture](docs/ARCHITECTURE.md)
- [Migration task list](docs/nestjs-migration-tasks.txt) and [roadmap](docs/MIGRATION_PRODUCTION_ROADMAP.md)
- [Testing](docs/TESTING.md) and [acceptance cases](docs/UAT_TEST_CASES.md)
- [API contracts](docs/API_REFERENCE.md) and [deployment](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)

## Repository ownership

```text
apps/web-lume/                    Vue administration client
apps/riagri-website/              Nuxt public website
packages/@lume/module-ui/         Shared views, widgets, styles and browser adapters
backend/lume-nestjs/              Active NestJS application, schema, migrations, tests
backend/package.json             Workspace task gateway to NestJS
backend/src/                     Legacy Express source retained during migration
docs/                            Architecture, operations, evidence and open tasks
```

The final API directory is planned as `backend/api/`. It has **not** moved yet:
the running service and deployment scripts still use `backend/lume-nestjs`.
Temporary legacy static-directory symlinks resolve into the shared UI package.

## Development commands

Use Node.js 20.12+ and the repository-pinned pnpm 10.28.2. NestJS maintains its own
npm lockfile; the client workspace uses the root pnpm lockfile.

```bash
pnpm install --frozen-lockfile
pnpm --filter lume-backend setup
# Configure backend/lume-nestjs/.env using its .env.example before running.
pnpm run dev:admin
# In another terminal:
pnpm --filter @lume/riagri-website dev
```

Admin development uses port 3001; the website development command uses 3100.
NestJS defaults to port 3000. REST is `/api/v2`, GraphQL is `/api/v2/graphql`.
See installation instructions before initializing or migrating a database.

## Verified work and remaining scope

Recent work covers authentication/session contracts, users/RBAC, settings,
module catalog, workflow/flow definition CRUD, approval definitions and inbox,
shared JSON persistence, and transactional sequence allocation. It does not certify
all automation execution or module features. The current review inventory flags
74 frontend calls and 100 Nest implementation markers; these are review candidates,
not counts of proven defects. See the task list for data migration, feature parity,
CI/deployment and legacy retirement gates.

The final pre-commit backend run passed 79 suites / 809 tests, including the sequence
follow-up. Admin tests passed 80 tests and website tests passed 6; both builds and
type checks passed. Updated release evidence is recorded in the testing guide.

## License

[MIT](LICENSE). See [Code of Conduct](CODE_OF_CONDUCT.md) and [security reporting](SECURITY.md).
