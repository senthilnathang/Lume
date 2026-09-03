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

The module loader discovers new directories automatically. Then create tables:

```bash
cd backend && node src/scripts/setupDrizzle.js
```

Run the generator tests with `node --test packages/create-lume-app/test/generate.test.js`.
