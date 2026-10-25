# Nuxt public website

Package: `@lume/website`. Install dependencies at the repository root.

```bash
pnpm --filter @lume/website dev
pnpm --filter @lume/website build
pnpm --filter @lume/website typecheck
pnpm --filter @lume/website test run --maxWorkers=1
```

Development uses port 3100. `NUXT_PUBLIC_API_BASE` defaults to
`http://localhost:3000/api/v2/website/public`. Containers need a URL reachable by
browsers and SSR; localhost inside the container does not address the host API.
Shared widgets come from `packages/@lume/module-ui`. Start production `.output/`
with `node .output/server/index.mjs`. See [deployment](../../docs/DEPLOYMENT.md).

This application remains the Nuxt public website; administration belongs to
`apps/admin`, and business persistence belongs to `apps/api`. The manual workflow
batch did not change this application. Its previously recorded verification is
6 tests plus build/type checks, not a new run. Full release acceptance remains in
[the migration roadmap](../../docs/MIGRATION_PRODUCTION_ROADMAP.md).
