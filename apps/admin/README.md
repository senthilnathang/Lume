# Vue administration application

Package: `@lume/admin`. Install dependencies at the repository root.

```bash
pnpm run dev:admin
pnpm --filter @lume/admin build
pnpm --filter @lume/admin typecheck
pnpm --filter @lume/admin test run --maxWorkers=1
```

Development uses port 3001 and proxies API requests to NestJS on port 3000.
Shared feature views and adapters live in `packages/@lume/module-ui`, resolved
through `@modules`. Configure `VITE_API_URL` for another API origin.
The container uses nginx and proxies `/api/` to `api:3000`.
See [development](../../docs/DEVELOPMENT.md) and [testing](../../docs/TESTING.md).

The manual workflow screen is routed at
`/automation/workflows/:workflowId/executions/:executionId`. It submits a transition
code and displayed version, shows persisted history, and disables unsupported actions.
Latest verification: 85 tests, type check and build; isolated Chromium completion
and reload passed. These assets have not been deployed. See
[acceptance cases](../../docs/UAT_TEST_CASES.md) for remaining browser coverage.
