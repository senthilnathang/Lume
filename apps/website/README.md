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
