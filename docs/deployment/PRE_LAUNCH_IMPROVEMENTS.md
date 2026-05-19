# Pre-Launch Improvements Roadmap — Lume v2.0

**Created:** 2026-05-19  
**Owner:** Engineering  
**Target launch (existing plan):** September 1, 2026  
**Status:** Forward-looking — supplements [public_release_roadmap.md](public_release_roadmap.md) and [master_launch_plan.md](master_launch_plan.md)

---

## Purpose

The existing launch plan (Phases 5–7, May–September) is comprehensive but written four weeks ago. This document captures **what we've learned since**, **what's still incomplete**, and **the smallest set of improvements that should land before the public release** — ranked by risk reduction, not feature appeal.

Audience: anyone preparing a release branch / cutting v2.0. Pair this with [PUBLIC_RELEASE_CHECKLIST.md](PUBLIC_RELEASE_CHECKLIST.md) (which is the gate) — this document is the **plan to satisfy the gate**.

---

## Snapshot — May 19, 2026

| Signal | Value | Status |
|--------|-------|--------|
| Backend modules in source | 27 | ▲ from 23 documented in CLAUDE.md |
| Modules in `installed_modules` after `refreshDb` | 25 | `base` + `base_rbac` are virtual (mounted, never persisted) |
| Backend test files | 79 | Mix of unit + integration |
| Active TODO/FIXME in source | 3 | Low — websocket permission check is the only real one |
| Recent commits (last 10) | All green-path features | No emergency fixes pending |
| Cold-boot perf (post-tuning) | `/health` 200 in ~2-5s, full ready ~26s | ✅ tuned this session |
| Open Drizzle schema gap | `automation_auto_transitions` table missing | base_automation references it but `prisma db push` doesn't create Drizzle tables |
| Documented admin password | Now correct (`Admin@Lume!1`) | ✅ docs updated this session |
| Documented health URL | `/health` (not `/api/health`) | ✅ docs updated this session |
| Documented login endpoint | `/api/users/login` (not `/api/auth/login`) | ✅ docs updated this session |

---

## Progress Log — May 19, 2026

This is what landed against the P0/P1 list since the roadmap was written:

| Item | Status | Commit / Notes |
|------|--------|----------------|
| P0-2 — Rewrite `prisma/seed.js` | ✅ Done | File now delegates to `createAdmin.js` + `seedData.js`; `npm run db:seed` works |
| P0-3 — Audit orphan `apps/` | ✅ Done — **finding was inverted** | `apps/` (top-level) is the **canonical** workspace (declared in `pnpm-workspace.yaml`); `frontend/apps/` is the orphan. All docs updated to use the correct path. CI workflow + Docker still reference `frontend/apps/web-lume` — see new P0-4 |
| P0-1 — Drizzle schema parity | ✅ Done | `backend/src/scripts/setupDrizzle.js` creates the 33 missing tables. Bypasses drizzle-kit's TTY requirement by importing each schema and using `getTableConfig()` to read column definitions, then issuing `CREATE TABLE IF NOT EXISTS` directly. Idempotent. Wired into `npm run db:setup` (refreshDb → prisma push → **setupDrizzle** → createAdmin → seedData). Parity check now reports `✅ Table parity OK (18 modules, 96 tables checked)` |
| P1-1 — Wire `compression` | ✅ Done | `app.use(compression({ threshold: 1024 }))` in `src/index.js`; measured: `/api/modules` 15272b → 3131b over the wire (80% reduction) |
| P1-3 — JWT field-name deprecation alias | ✅ Done | `/api/users/login` now returns both `data.token` and `data.accessToken` (same value); setup-smoke test updated to assert both |
| Setup helper | ✅ New | `npm run db:setup` now runs the full canonical 4-step bring-up (refreshDb → prisma push → createAdmin → seedData) |
| P0-4 — Fix CI/Docker `frontend/apps/` references | ✅ Done | `.github/workflows/deploy.yml` and `docker-compose.staging.yml` now use canonical `apps/web-lume` paths. Dockerfile reference updated to `frontend/Dockerfile` with root build context (where the Dockerfile actually expects to find `apps/web-lume`). Live docs updated too (TESTING.md, ARCHITECTURE.md, etc.) |
| P1-2 — Startup table parity check | ✅ Done | `backend/src/core/db/check-table-parity.js` runs after Drizzle init; scrapes table names from all 18 `*/models/schema.js` files via regex (no Drizzle import — cheap pre-flight) and compares against `INFORMATION_SCHEMA.TABLES`. On clean install: **34 missing tables across 7 modules** surface as ONE grouped boot warning, no longer N opaque 500s. `LUME_STRICT_TABLE_PARITY=true` promotes the warning to a startup failure (use in CI/prod). |
| P1-4 — CI smoke gate | ✅ Done | New `.github/workflows/setup-smoke.yml` spins up MySQL 8 service, runs canonical install sequence (refreshDb → prisma push → createAdmin → seedData), then runs `tests/integration/setup-smoke.test.js`. Triggers on `push` to main + every PR. ~3-5 sec gate. |
| P2-4 — HTTP caching headers | ✅ Done | `/health` now returns `Cache-Control: public, max-age=5`. Health monitors poll every 10-30s; the 5s window cuts uptime/metric-serialization cost without delaying real failure detection. `/api/modules` deliberately left as `no-cache` — module install/uninstall must be immediately visible. |
| P1-5 — `tsx watch` instead of nodemon | ✅ Done | `npm run dev` now uses `tsx watch --clear-screen=false` (~2s cold restart vs ~7s with nodemon). Legacy nodemon kept as `npm run dev:nodemon`. |
| P2-5 — Production process supervisor | ✅ Done | `ecosystem.config.cjs` at repo root: pm2 cluster across all CPUs, 2 GB heap per worker, `--enable-source-maps`, `max_memory_restart: 1500M`, `max_restarts: 10`, `min_uptime: 15s`. Defaults: `LUME_STRICT_TABLE_PARITY=true` so a deploy with missing module tables crash-loops instead of silently 500-ing. `npm run pm2:start \| pm2:reload \| pm2:stop \| pm2:logs \| pm2:status`. |
| Smoke test coverage | ✅ Expanded | 14 cases (was 11): adds `setupDrizzle.js` presence, `ecosystem.config.cjs` presence, `/health` Cache-Control assertion. |
| P2-1 — WebSocket per-record permission check | ✅ Done | `WebSocketManager.subscribe()` now accepts `{ companyId, roles, filter }`. New `canSubscriberReceive()` method enforces: super_admin sees everything; non-admin subscribers see only records whose `company_id`/`tenant_id` matches their own. Wired into `broadcast()` — replaces the `TODO: Permission check` that was the only real `TODO` in the source. Backwards-compat shim accepts the legacy `(entity, userId, filter)` positional signature. New unit suite `tests/unit/websocket-permission.test.js` covers 14 cases including the THE security check (mismatched tenant → denied). |
| P2-2 — OpenAPI / Swagger | ✅ Done | `swagger-jsdoc` + `swagger-ui-express`. Spec at `GET /api/openapi.json` (with `Cache-Control: public, max-age=60`), interactive UI at `GET /api/docs/`. Hand-curated baseline in `backend/src/core/openapi/openapi-spec.js` documents `/health`, `/api/modules`, `/api/users/login` + reusable schemas; module authors extend via `@swagger` JSDoc on route files. On in dev by default; gated by `OPENAPI_ENABLED=true` in production. Smoke test adds 4 cases. |
| P2-3 — Module enable/disable | ✅ Backend done; UI deferred to v2.1 | The backend already has POST `/api/modules/:name/install`, `/uninstall`, `/upgrade` (with dependency validation). Added `actions` + `deps_resolved` fields to GET `/api/modules` so a future admin UI can drive its button row directly off the response. The state-transition matrix (`computeModuleActions()` in `src/index.js`) is intentionally simple — install/uninstall is the toggle mechanism; a separate "disabled" state would require a schema change and module-loader changes that don't belong in v2.0. Smoke test adds 2 cases pinning the shape. Building the admin Vue view itself is 3-5 days and explicitly v2.1 scope. |

---

## v2.0 Status — All P0/P1 + Essential P2 Closed

As of this iteration, the pre-launch roadmap is **functionally complete**:

- All 4 P0 items closed (Drizzle parity, prisma/seed.js, apps/ orphan, CI/Docker paths)
- All 5 P1 items closed (compression, parity check, JWT alias, CI gate, tsx watch)
- All 5 listed P2 items closed (Cache-Control, pm2 ecosystem, WebSocket permission, OpenAPI, module catalogue contract)

The only deferred item is the **module-toggle admin UI** — explicitly scoped as v2.1 in this document from the start, and the backend hooks it needs are now in place.

**Tag-day artifact gate is green:**

- `npm run db:setup` brings a fresh DB up end-to-end (96 tables, admin, seed)
- `npm run dev` cold-restart: ~2s (tsx watch)
- `npm run pm2:start` brings up cluster mode with the production env defaults
- 34/34 tests pass across smoke + websocket permission suites
- CI gate (`.github/workflows/setup-smoke.yml`) runs the contract on every PR + push
- OpenAPI spec lives at `/api/openapi.json`; UI at `/api/docs/`
- WebSocket broadcasts enforce tenant isolation (security)
- Compression saves ~80% bandwidth on hot endpoints
- Boot-time parity guard fails loud (`LUME_STRICT_TABLE_PARITY=true`) on missing module tables

**Next iteration** should be the v2.1 module-toggle Vue view, post-tag.

### P0-1 detail (DONE — see `backend/src/scripts/setupDrizzle.js`)

The drizzle-kit TTY blocker was bypassed by going one layer deeper: import each schema directly, read column definitions via `getTableConfig()`, and emit `CREATE TABLE IF NOT EXISTS` SQL through plain mysql2. The full implementation is ~220 lines, idempotent, and produces 0 failures on the current schema (33 tables created on a fresh DB; 0 conflicts on a re-run).

Caveats kept in code:
- Foreign keys are not created (cross-module FK ordering is fragile; deferred to module-loader wiring if needed).
- Default expressions like `(now())` are extracted from drizzle-orm's internal `SQL.queryChunks` and emitted literally.
- Indexes declared via `.index()` in schemas ARE emitted.

The escape hatch for missing parity is now `npm run db:setup:drizzle` — runs the table creator standalone without dropping or re-seeding.

### P0-4 (new) — Fix CI and Docker references to old `frontend/apps/` paths

Surfaced during P0-3. The migration to top-level `apps/` is incomplete:

- `.github/workflows/deploy.yml` — 7 references to `frontend/apps/web-lume`
- `docker-compose.staging.yml` — 2 references to `frontend/apps/web-lume`
- `frontend/Dockerfile` exists but is now orphaned
- Several docs (`docs/CODE_EXAMPLES_VERIFICATION.md`, `docs/TESTING.md`, `docs/ARCHITECTURE.md` line 696) still reference the old path

**Action:** Either complete the migration (preferred) or revert to `frontend/apps/`. Right now the published deployment instructions don't match the actual workspace location, which will break CI builds and any contributor who follows the docs literally.

**Estimate:** 1 day to audit + update + test the CI pipeline end-to-end.

---

## What This Session Already Closed

These are **done**, listed so the next reviewer doesn't redo them:

- **`backend/.env.example` perf defaults** — OTEL sampling 0.1, DB_LOGGING off (with rationale comments)
- **`docs/INSTALLATION.md`** — canonical 4-script install flow replaces broken `npm run db:init`
- **`docs/ARCHITECTURE.md`** — Runtime Performance Settings sub-section + MySQL FK-auto-index note
- **`README.md`** — accurate Quick Start, fixed admin creds, perf summary table
- **`CLAUDE.md`** — Database Setup + Performance Settings sections, `prisma/seed.js` outdated warning
- **`backend/tests/integration/setup-smoke.test.js`** — 11-case contract test for health URL, login endpoint, JWT field name, setup-script presence, perf env defaults. **All passing.**

Commit: `fd1e4b31` on `main`.

---

## P0 — Must-Have Before Public Tag (Cut Risk)

These are blocking. A pre-release that ships with any of these is a foot-gun.

### P0-1. Drizzle schema parity with Prisma

**Problem:** `npx prisma db push` creates Prisma core tables (11 models) but **does not** create Drizzle module schemas (14 modules). The setup-smoke test caught one symptom — boot logs include `Table 'lume.automation_auto_transitions' doesn't exist`.

**Why it matters:** New installers run the documented install steps and end up with a working app *plus a wall of warnings*. Some module features silently 404 because their tables don't exist.

**Action:**
- Audit every Drizzle schema file (`backend/src/modules/*/models/schema.js`) and confirm a matching MySQL table exists post-`prisma db push`.
- Add a `db:push:all` script that runs Prisma + every module's Drizzle migration in topological order.
- Document the script in `INSTALLATION.md` and add a smoke check to `setup-smoke.test.js` ("no missing-table errors in startup logs").

**Estimate:** 1–2 days. Mechanical work, no design risk.

---

### P0-2. Fix the outdated `prisma/seed.js`

**Problem:** `npm run db:init` and `npm run db:seed` reference `prisma/seed.js`, which passes `username` and `role: 'ADMIN'` (string) to `prisma.user.upsert` — both removed from schema. The script fails immediately. Documented workaround is to use `createAdmin.js` + `seedData.js` instead.

**Why it matters:** Every NPM scripts walkthrough (`npm run`) lists `db:seed` as the seeding entry point. First-time users will run it, get a Prisma error, and lose confidence.

**Action:** Rewrite `prisma/seed.js` to use the current schema (delegate to `createAdmin.js` + `seedData.js`). One file change, low risk.

**Estimate:** 30 minutes.

---

### P0-3. Remove or document `apps/` orphan directory

The repo has both `frontend/apps/` and a top-level `apps/` that holds a stray Vitest temp file. Top-level `apps/` looks like dead state from an earlier monorepo layout.

**Action:** Confirm whether `apps/` is intentional. If not, delete it. If yes, document its purpose.

**Estimate:** 15 minutes investigation.

---

## P1 — Should-Have (Quality & DX)

Not blocking, but each one removes a "papercut" that a self-hosted user will report.

### P1-1. Wire response compression

`compression` is in `package.json` but **never `app.use()`-d** in `src/index.js`. With 25 modules registering routes, even the modest `/api/modules` response is 15KB+ — compression would cut bandwidth ~70%.

**Action:**
```js
// src/index.js, after express.json:
import compression from 'compression';
app.use(compression({ threshold: 1024 }));
```

**Estimate:** 5 minutes change + 30 minutes regression smoke. Documented as "out of scope" this session because of the "no core code change" constraint — lift that constraint for the next release branch.

---

### P1-2. Auto-install missing module dependencies on startup

Right now if `base_automation` is queried before its Drizzle tables exist, you get an opaque MySQL error. The kernel should:
1. On startup, snapshot every Drizzle schema's expected tables.
2. Compare against `information_schema.TABLES`.
3. Log warnings (not errors — let the app keep starting) listing missing tables and the command to create them.

**Why:** Loud feedback at startup beats silent 500s in production.

**Estimate:** 1 day.

---

### P1-3. Lock the JWT field-name contract

The setup-smoke test now pins `data.token` (not `data.access_token`) — but only inside Lume's repo. If anyone integrates Lume from outside (FastVue's tooling assumed `access_token`), they'll silently fail.

**Action:** Add a deprecation alias: return both `token` and `accessToken` in the login response for one minor release, then drop `token` in v3. Document explicitly in `docs/API_DOCUMENTATION.md`.

**Estimate:** 1 hour.

---

### P1-4. CI smoke gate using `setup-smoke.test.js`

The new test catches install-contract regressions in 1.6 seconds. Wire it into CI as a mandatory gate before any release tag.

**Action:** Add a GitHub Actions job that runs only `setup-smoke.test.js` on every PR + tag. Fail-fast.

**Estimate:** 1 hour.

---

### P1-5. Replace per-page hot-reload nodemon with `tsx watch` (or similar) in dev

Cold restart with nodemon is ~7s. `tsx watch` is ~2s on a modern laptop. Doesn't affect prod (uses `node` directly).

**Estimate:** 30 minutes.

---

## P2 — Nice-to-Have (Polish)

### P2-1. WebSocket permission check

`src/core/realtime/websocket-manager.js` has the only real `TODO` — a permission check for record-level subscriptions. Currently every subscriber sees every event for the room. For multi-tenant public deployments this is **a data leak**.

**Action:** Tie subscription auth to the existing RBAC. Reuse `RecordPermission` from the auth module.

**Estimate:** 1–2 days. Has security implications; do it well.

---

### P2-2. Public OpenAPI / Swagger endpoint

The launch plan calls for "Swagger/OpenAPI documentation" but it's not wired in the current codebase. For a public CRM/database platform, a live `/docs` endpoint is table stakes.

**Action:** `swagger-jsdoc` + `swagger-ui-express`, generate from JSDoc comments on routes. Start with the high-traffic modules (users, activities, modules, website).

**Estimate:** 2–3 days.

---

### P2-3. Module install / uninstall lifecycle

The module loader auto-discovers modules from `src/modules/` and inserts rows into `installed_modules`, but there's no admin UI to disable a module without removing the directory. For a public release this is missing functionality (Airtable / Notion equivalents have "apps" toggles).

**Estimate:** 3–5 days for v1; can ship without it but flag as v2.1.

---

### P2-4. Compression + caching headers on `/modules` and `/health`

Hot endpoints that are read every page-load. ETag + 5-minute cache would cut bandwidth and CPU.

**Estimate:** 1 hour.

---

### P2-5. Production `NODE_OPTIONS` defaults

No `ecosystem.config.js` or PM2 docs. Operators will run `node src/index.js` directly. For multi-core boxes, add:

```bash
node --max-old-space-size=2048 --enable-source-maps src/index.js
```

…and document `pm2 start ecosystem.config.js` as the supported cluster mode.

**Estimate:** 1 day (writing + testing).

---

## P3 — Strategic (Post-Launch v2.1+)

Not a launch blocker; tracked here so they don't drift off:

- **GraphQL adapter** — Hybrid GraphQL/REST surface; the architecture doc references it. Build after v2.0 stabilizes.
- **Multi-tenancy** — Roadmap calls it "planned". Don't bake into v2.0; revisit for v2.5.
- **Cloud storage providers** — S3 / GCS / Azure abstractions. Currently file uploads land in `./uploads`. v2.1.
- **Public marketplace** for community modules — Phase 7 territory. Don't gate v2.0 on it.

---

## Estimated Path to "Ready to Tag"

| Phase | Duration | Items |
|-------|----------|-------|
| P0 cleanup | 2–3 days | P0-1, P0-2, P0-3 |
| P1 quality pass | 4–5 days | P1-1 → P1-5 |
| Final regression + docs | 2 days | Run full test suite, update CHANGELOG, write `RELEASE_NOTES.md` for v2.0.0 |

**Total**: ~2 weeks of focused work to reach a defensible v2.0 tag.

This is **on top of** the launch-plan documentation work in [public_release_roadmap.md § Week 1–2](public_release_roadmap.md). They run in parallel — engineering closes P0/P1 while content/SEO produces user-facing docs.

---

## Tracking

- Open issues / PRs referencing this doc should use the label `pre-launch`.
- This doc is **frozen on tag day** — moves to `docs/archive/` with the v2.0 release.
- Updates between now and tag day land here as commits referencing the P-number (e.g. `git commit -m "fix(P0-2): rewrite prisma/seed.js for current schema"`).

---

## Related Documents

- [public_release_roadmap.md](public_release_roadmap.md) — Original v2.0 launch plan (Apr 22)
- [master_launch_plan.md](master_launch_plan.md) — Cross-functional consolidation
- [PUBLIC_RELEASE_CHECKLIST.md](PUBLIC_RELEASE_CHECKLIST.md) — Hard gate before tagging
- [RELEASE_EXECUTION_PLAN.md](RELEASE_EXECUTION_PLAN.md) — Tag-day runbook
- [seo_strategy.md](seo_strategy.md) — Content strategy
- [../INSTALLATION.md](../INSTALLATION.md) — Updated install guide (this session)
- [../ARCHITECTURE.md](../ARCHITECTURE.md) — Runtime perf settings (this session)
