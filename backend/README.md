# Lume backend

The active application is [lume-nestjs](lume-nestjs/). This directory's package is
now a workspace task gateway; `dev`, `start`, `build`, `test`, `lint` and `typecheck`
delegate to NestJS. The standalone Express migration is not complete.

```bash
# From the repository root
pnpm --filter lume-backend setup
pnpm --filter lume-backend build
pnpm --filter lume-backend dev
```

Configure `lume-nestjs/.env` from its template before startup. Read
[installation](../docs/INSTALLATION.md) before initializing/migrating a database.
REST is `/api/v2`; GraphQL is `/api/v2/graphql`.

See [STRUCTURE.txt](STRUCTURE.txt), [architecture](../docs/ARCHITECTURE.md),
[developer guide](../docs/DEVELOPMENT.md), [tests](../docs/TESTING.md), and
[operations](lume-nestjs/deploy/OPERATIONS.txt).

`src`, `prisma`, `drizzle`, `tests` and explicit `legacy:*` scripts retain the old
Express implementation for migration comparison. Shared frontend files have moved
to `packages/@lume/module-ui` at repository root; legacy static paths are symlinks.
The final `backend/api` move and legacy removal remain tracked tasks.
