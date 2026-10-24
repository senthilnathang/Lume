# Legacy migration sources

These directories are excluded from pnpm workspaces and active CI/deployment.
`express/` contains the old standalone API, schema, uploads and reference tests.
`frontend/` contains superseded clients and design/reference material.
`locks/` retains the old API npm lock for migration comparison.

Do not run these as the production application or use their reset/setup scripts
against the active database. Required behavior/data must be reconciled before
removal; remaining feature parity is tracked in `docs/nestjs-migration-tasks.txt`.
The only active applications are `apps/api`, `apps/admin` and `apps/website`.
