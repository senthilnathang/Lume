# Lume

Lume is a modular application platform with a NestJS API, Vue 3 administration
client, and Nuxt 3 public website. Prisma and Drizzle share a MySQL database.

**Migration status — 2026-10-27:** NestJS is deployed locally, but the complete
standalone Express replacement is still in progress. The local API has restarted successfully from its canonical path; the built
frontend assets have not been deployed. Do not interpret historical completion
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
apps/
  api/                           NestJS API, schema, migrations and tests
  admin/                         Vue administration client
  website/                       Nuxt public website
packages/@lume/                   Shared UI and tooling configuration
scripts/                         Workspace validation and source audits
docker/                          Observability configuration
docs/                            Architecture, operations and migration evidence
legacy/                          Inactive Express, old frontend and obsolete tooling
```

All active applications use the root pnpm workspace and lockfile. Legacy sources
are excluded from workspace installation, builds, CI and container images.
Temporary legacy static-directory symlinks resolve into the shared UI package.
NestJS still uses its supported Express HTTP adapter; the old standalone Express
application is not an active workspace application.

## Development commands

Use Node.js 22.12+ and the repository-pinned pnpm 10.28.2. Install once at the root.

```bash
pnpm install --frozen-lockfile
pnpm --filter @lume/api db:generate
# Configure apps/api/.env using its .env.example before running.
pnpm run dev:admin
# In another terminal:
pnpm --filter @lume/website dev
```

Admin development uses port 3001; the website development command uses 3100.
NestJS defaults to port 3000. REST is `/api/v2`, GraphQL is `/api/v2/graphql`.
See installation instructions before initializing or migrating a database.

## Verified work and remaining scope

The current source includes shared identity/RBAC, persistent settings and audit
reads, tenant registry and membership enforcement, explicit production module
loading, dependency-safe lifecycle operations and opt-in configuration/reload.
Existing automation work includes scheduled workflows, manual flows, record
conditions and version-bound approval gates.

**Framework first:** F01–F07 remain open. Data ownership reconciliation,
backup/restore, remaining core contracts, browser acceptance and rollout must pass
before framework sign-off; individual module/plugin expansion follows that gate.
See [current migration status](docs/MIGRATION_STATUS.md) for the prioritized scope
and [testing](docs/TESTING.md) for current versus historical evidence.

The last recorded local database includes migration 018. Migrations **019–023**
are prepared and tested on disposable databases, but remain unapplied to the
application database. Publishing this code does not deploy the API or clients.

## License

[MIT](LICENSE). See [Code of Conduct](CODE_OF_CONDUCT.md) and [security reporting](SECURITY.md).

## Documentation status

The [documentation index](docs/README.md) links the current architecture, developer,
upgrade, deployment and testing guides. Historical completion reports are retained
as references; the current status and execution tracker govern release acceptance.
