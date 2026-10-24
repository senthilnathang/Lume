# Lume development instructions

The active stack is NestJS (`apps/api`), Vue 3 (`apps/admin`) and Nuxt 3
(`apps/website`). Use Node 22.12+ and pnpm 10.28.2 with the root lockfile.
Read [architecture](docs/ARCHITECTURE.md), [development](docs/DEVELOPMENT.md),
[testing](docs/TESTING.md), and [open tasks](docs/nestjs-migration-tasks.txt).
The migration remains incomplete; historical completion reports are not certification.

## Ownership

- Backend code belongs in apps/api/src/modules/<feature>, shared infrastructure in core.
- Shared browser views, widgets and API clients belong in packages/@lume/module-ui.
- Use the admin @modules alias and website @widgets alias; never import legacy code.
- NestJS compiles to CommonJS with decorators; clients use ES modules.
- Active Prisma schema and ordered migrations live in apps/api. Prisma and Drizzle
  share a MySQL-compatible database. Do not run old schema reset/setup commands.
- Legacy apps, generators and deployment templates under legacy/ are excluded from
  workspace builds and CI. They remain for parity comparison, not new development.

## Behavior and security

- Validate DTOs and enforce authentication, permissions, tenant and record access.
- Derive identity/tenant from authenticated context; deny access by default.
- Preserve tenant isolation in subscriptions and event delivery, checking each record.
- Use transactions for critical writes. Mutations, not queries, allocate sequence IDs.
- Password hashing must occur once through the active credential service.
- External email, push and AI integrations remain disabled.
- Preserve TipTap JSON document content and publish/private visibility rules.
- Keep Ant Design Vue registered globally before using a-* components.
- Dynamic ModuleView routes must pass moduleName in props.
- Browser request adapters unwrap envelopes; inspect the adapter contract before
  adding another success/data check in a view.

## Verification

Use package scripts and the isolated database harness in docs/TESTING.md.
Run python3 scripts/check_layout.py after changes to workspace ownership.
CI enforces lint errors, types, builds and all app tests; existing lint warnings
remain visible and must not be presented as zero lint debt. Do not disable checks
to hide failures. Do not commit secrets, dumps, private logs or browser session state.
Update current documents and open tasks with actual evidence and limitations.
Historical Express-specific instructions are preserved in legacy/CLAUDE.md.
