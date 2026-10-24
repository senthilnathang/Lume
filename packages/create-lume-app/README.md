> **Historical/reference document — status updated 2026-10-24.**
> Earlier architecture, commands, estimates and completion claims below are not
> current migration certification. Use the [active task list](../../docs/nestjs-migration-tasks.txt) and
> [developer guide](../../docs/DEVELOPMENT.md). NestJS is the active API; standalone Express retirement,
> remaining feature parity and final deployment are still pending. Shared UI is
> now in `packages/@lume/module-ui`; the API remains at `backend/lume-nestjs`.

# create-lume-app

Scaffold a new Lume entity module: manifest, Drizzle schema, service, authenticated
API routes, and an admin list view with an inline create form.

```bash
node packages/create-lume-app/bin/create-lume-app.js deals --template crm-pipeline

node packages/create-lume-app/bin/create-lume-app.js grants \
  --label Grants \
  --fields title:text,amount:currency,deadline:date \
  --dir backend/src/modules
```

Templates (`--list-templates`): `crm-pipeline` (Deal Pipeline),
`ats` (Applicant Tracking), `helpdesk` (Helpdesk). Field specs accept inline
select options: `priority:select:low|medium|high|urgent`.

Build Agent flow — describe what you want in plain language:

```bash
node packages/create-lume-app/bin/create-lume-app.js \
  --from-prompt "recruitment pipeline with candidates, interview stages and ratings"
```

The parser detects the template, fields, and module name, prints what it
understood, and scaffolds the module (explicit `--fields`/`--template`
flags always override the guess).

The module loader discovers new directories automatically. Then create tables:

```bash
cd backend && node src/scripts/setupDrizzle.js
```

Run the generator tests with `node --test packages/create-lume-app/test/generate.test.js`.
