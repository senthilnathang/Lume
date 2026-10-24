# NestJS API

Package: `@lume/api`. The only active business backend. REST: `/api/v2`.
GraphQL: `/api/v2/graphql`. Default port: 3000.

Install once at the root using `pnpm install --frozen-lockfile`. Configure this
app's `.env` from `.env.example`, then run these commands from the root:

```bash
pnpm --filter @lume/api db:generate
pnpm --filter @lume/api dev
pnpm --filter @lume/api build
pnpm --filter @lume/api test --runInBand --forceExit
```

Tests need isolated database configuration: [testing](../../docs/TESTING.md).
External providers remain disabled. See [structure](../../docs/STRUCTURE.md),
[migrations](migrations/README.md), [operations](deploy/OPERATIONS.txt), and
[open tasks](../../docs/nestjs-migration-tasks.txt). Historical completion reports
are not current release sign-off.
