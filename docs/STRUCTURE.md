# Workspace structure

Updated 2026-10-25. Applications live under `apps/`; shared code lives under
`packages/`. Do not recreate root backend, frontend or server applications.

```text
apps/
  api/
    src/core/             Infrastructure, database and security
    src/modules/          Nest feature modules, controllers, DTOs and services
    src/graphql/          GraphQL transport, context and guards
    prisma/               Canonical Prisma schema
    migrations/           SQL migrations and ledger runner
    test/                 Unit, HTTP and GraphQL tests
    scripts/              API maintenance and startup checks
    deploy/               Service templates and operations
  admin/
    src/                  Vue shell, routing and shared client services
    e2e/                  Browser tests
  website/
    pages/                Nuxt routes
    components/           Website components
    composables/          Data and interaction logic
    server/               Website-only server routes
packages/@lume/
  module-ui/              Feature browser views, widgets and API adapters
  eslint-config/          Shared lint configuration
  tsconfig/               Shared TypeScript configuration
  tailwind-config/        Shared styling configuration
  prettier-config/       Shared formatting configuration
scripts/                  Workspace audits and validation
docker/                   Observability configuration
docs/                     Documentation and historical evidence
legacy/                   Inactive apps, generators and deployment tooling
```

The API owns business behavior and persistence. Website server routes support
rendering, sitemap and robots responses; they do not form another business backend.
Shared browser code must not depend on backend source. Apps declare dependencies
explicitly and share the root pnpm workspace and lockfile.

Active packages are `@lume/api`, `@lume/admin` and `@lume/website`. Old npm lockfiles
are retained under legacy for reference. Legacy code is excluded from installation,
CI and container contexts. Its static symlinks point to shared UI. Required feature
and data migration must pass [the gates](nestjs-migration-tasks.txt) before removal.

Run `python3 scripts/check_layout.py` after moving applications or packages.
Build, test and type checks remain necessary to verify runtime behavior.
