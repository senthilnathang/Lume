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
The screen now supports record-field conditions and version-bound approval gates:
request approval, complete it in the inbox, then submit an explicit transition.
Shared automation views also provide validated rules, scheduled workflows and
manual flow runs with conditional branches and actor-scoped history.

See [dated verification](../../docs/TESTING.md) and
[acceptance cases](../../docs/UAT_TEST_CASES.md) for current test/build results and
pending browser coverage. These assets remain undeployed. The combined API source
requires review of migrations 019–023; framework-first gates remain open before
further individual module/plugin expansion.
