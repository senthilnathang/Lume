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

Manual state workflows use migration 018 and `WorkflowStateEngineService`, separate
from durable metadata jobs. The supported contract includes immutable snapshots,
record authorization, version checks and atomic history. Advanced workflow effects
and legacy history import remain pending. See [API contracts](../../docs/API_REFERENCE.md).
Latest implementation verification: 82 suites / 861 tests, with 15 focused execution
tests rerun using the production validator. See the testing guide for scope.
