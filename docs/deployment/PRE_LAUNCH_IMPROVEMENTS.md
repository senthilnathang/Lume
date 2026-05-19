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
