# Lume Framework Features Plan — FastVue / ServiceNow / Salesforce benchmarks

**Created:** 2026-09-04 | **Supersedes direction of:** `ENTERPRISE_PARITY_ROADMAP.md` (P0/P1/P2 complete)
**Benchmarks:** FastVue (`/opt/FastVue` — FastAPI+Vue, 4-layer access control, POER record rules, field masking, role-hierarchy inheritance, wildcard `*.*` seeding, audit/compliance, encryption, addon system), ServiceNow (App Engine Studio, Flow Designer, Performance Analytics, GRC, IntegrationHub, domain separation), Salesforce (Flow, reports/dashboards, Shield, permission-set groups, AppExchange packaging, territory management).

## Where Lume stands (2026-09-04)

Done: kanban/dynamic views, visual form/view/record-page builders, ERD + drag-to-relate, formulas, composite types, validation engine, field/row/OWD enforcement, permission-set merge, cascade deletes, MCP server, scaffolder + templates + prompt flow, refresh rotation + reuse detection, audit trail, WebSocket isolation.

## F1 — Permission model parity [high]
- [ ] F1.1 **Wildcard grants** (`*.*`, `*.read`): `SecurityService` matcher + admin-tier seeding (FastVue G-model; fixes the `'*'` frontend convention at the source).
- [ ] F1.2 **Role-hierarchy inheritance** (Salesforce-style): parent-role holders inherit child permissions; cache invalidation on role edit.
- [ ] F1.3 **Group-based grants**: `User→Group→Permission` union into `getEffectivePermissions` (FastVue Layer-1: company roles ∪ groups).
- [ ] F1.4 **Field masking** (not just strip): `MASKED` mode preserving last-N chars, enforced on the read path (FastVue G2).
- [ ] F1.5 **Fail-closed CRUD gate** for generic entity endpoints (`<entity>.<action>` codenames, superuser-exempt).
- [ ] F1.6 **IDOR audit**: company-scope every single-resource `/{id}` route (`assert_company_access` equivalent).

## F2 — Automation depth [high]
- [ ] F2.1 **Flow Designer parity**: visual node/edge canvas with record-change/schedule/manual/API triggers on top of existing workflow engine.
- [ ] F2.2 **Approval chains wired to data changes** (record transitions drive approvals, not just standalone chains).
- [ ] F2.3 **Scheduled actions runner** (cron inside backend, execution history already modeled).
- [x] F2.4 **Webhook triggers** (record `created/updated/deleted` fire-and-forget through HMAC + retry service; done 2026-09-05).

## F3 — Analytics & reporting [medium]
- [ ] F3.1 **Report builder**: filters/grouping/aggregations over entities, saved + scheduled, CSV/Excel export (FastVue Cat-3, SF reports).
- [ ] F3.2 **Dashboard KPI widgets**: WebSocket-live counts, sparklines, refresh intervals.
- [ ] F3.3 **Audit/compliance reports**: weekly access-change digest, DSAR export (collect user data as PDF), retention pipeline (soft→hard delete).

## F4 — Data & integration platform [medium]
- [ ] F4.1 **Import/export center**: CSV/XLSX bulk import with column mapping + dry-run (JobProcessors already queue-capable).
- [ ] F4.2 **REST API tokens per user** (PAT-style, scoped, expiring — the `pat_*` pattern) + OAuth2 client-credentials for integrations (IntegrationHub analogue).
- [ ] F4.3 **Field-level encryption at rest** for PII fields (AES-GCM via KMS/env key, transparent in adapters; FastVue Fernet analogue).
- [ ] F4.4 **GDPR erasure**: hard-delete/PII-scrub pipeline per user across entities + audit proof.

## F5 — Developer experience [medium]
- [ ] F5.1 **Addon/marketplace packaging**: versioned module bundles with dependency resolution + signature check (AppExchange-lite; FastVue addon system analogue).
- [ ] F5.2 **Migration framework**: declarative schema diffs per module instead of full `db push` (Alembic analogue for the Drizzle side).
- [ ] F5.3 **Fixture library + contract tests** for module APIs (FastVue test-fixture pattern).
- [ ] F5.4 **OpenAPI completeness**: every module route annotated; SDK codegen smoke test in CI.

## F6 — Performance & reliability [medium]
- [ ] F6.1 **N+1/slow-query watcher**: log queries >50ms, warn on per-request query count (FastVue Cat-1).
- [ ] F6.2 **Read-through cache** for permissions/menus/settings with write invalidation (permission TTL already exists — extend + measure).
- [ ] F6.3 **Rate-limit quotas per API key** (per-plan limits, headers already emitted).
- [ ] F6.4 **Standardized error envelope + correlation IDs** across all modules.

## F7 — Identity hardening [low-medium]
- [ ] F7.1 **2FA/TOTP** (both login paths) + backup codes.
- [ ] F7.2 **OAuth social login** (Google/GitHub/Microsoft) via Passport.
- [ ] F7.3 **SSO/SAML for enterprise orgs** (ServiceNow/Salesforce table-stakes).

## Execution order
F1 → F2 → F4.2/F4.1 → F3 → F5 → F6 → F4.3/F4.4 → F7. Each item ships with unit tests + docs updates, one by one, committed separately.

## Status (2026-09-05, FastVue migration track)
- [x] M1 Analytics Reports port (FastVue `advanced_features` → Lume `analytics_reports` table + service + CRUD/run routes; tabular + grouped aggregates; company/visibility scoping; verified live; 4 tests green).
- [x] M11 Mail IMAP hardening (per-server fetch locks, message-id dedup, 100-msg cap, lastError tracking, injectable client factory; 8 tests green across mail suite).
- [x] M10 ERD duplicate analysis (FastVue `erd_viewer`: Jaccard overlap on field sets, `/schema/duplicates` endpoint, warning panel in canvas; verified live; 5 tests green across graph suite).
- [x] M9 Mail module (FastVue `mail` → dedicated `mail` module: IMAP servers, priority regex routing, record creation + auto-reply queue, message store, retrying outbound queue, dry-run endpoint; verified live; 5 tests green).
- [x] M8 SMS gateway module (FastVue `sms_gateway` → dedicated `sms` module: providers/templates/logs tables, template variables, bulk, retry, delivery logging; auto-discovered by loader; verified live end to end; 5 tests green).
- [x] M7 Import XLSX UI (accept `.xlsx`/`.xls` in upload dragger + hint copy; backend already routed by extension).
- [x] M6 ERD table detail (FastVue `erd_viewer`: `buildSchemaGraph` helper with PK/FK flags + per-entity relationship trees; node badges in canvas; verified live; 3 tests green).
- [x] M5 Document faceted search port (FastVue `document_management`: `GET /documents/search` with `q`/`fq`/`facets`/pagination + Prisma groupBy facet counts; 3 tests green).
- [x] M4 Notification channels port (FastVue `notification`: in-app/email/sms fan-out, recipient email lookup, `notification_deliveries` log table, isolated failures, SMS provider webhook; 4 tests green).
- [x] M2 Dashboards port (FastVue `advanced_features` → `dashboards` + `dashboard_categories` tables + service; widget placements in layout JSON resolved against existing widgets; default/singleton semantics; verified live; 4 tests green).
- [x] M3 Import XLSX parity (FastVue `import_export` was otherwise already ported: preview/validate/execute/export/template + suggestMappings; added `xlsx` dep + first-sheet parsing routed by extension; 4 tests green).
- [x] F1.1 Wildcard grants (`matchesPermission`: exact/`*`/`*.*`/`collection.*`/`*.action`; admin tiers carry `*`+`*.*`).
- [x] F1.2 Role-hierarchy inheritance (parent inherits active descendants via `Role.metadata.parentRoleId`; `invalidateAll()` registry wired into role create/update/delete/permission-assign).
- [x] F1.3 Group-based grants (`usergroups.<id>` + `groupgrants.<group>` settings unioned into effective permissions; interim until Group tables gain membership columns).
- [x] F1.4 Field masking (`field-mask.service.js`: MASKED mode with tail preservation; `fieldmask.<field>.<role>` rules override strip on read, writes stay blocked; 7 tests green).
- [x] F1.5 CRUD gate (`checkEntityAccess`: `<entity>.<action>` codenames, gate activates when scoped permissions are seeded, legacy-allow otherwise, superuser-exempt via `*`; wired into all 5 record routes; 4 tests green).
- [x] F1.6 IDOR audit (relationship link/unlink now verify both records via company+visibility scoping; user `/:id` GET/PUT/DELETE restricted to self-or-admin via `denyCrossUser`; change-password already verifies old password).
- [x] F2.4 Record-event webhooks (lazy singleton, HMAC-signed, retried, logged; CRUD never breaks; 4 tests green).
- [x] F2.2 Approvals on data change (active chains with `condition.auto_start` matching the entity auto-submit on record create via lazy runtime; per-chain failures isolated; 1 test green).
- [x] F3.1 Report builder UI (`reports.vue`: list/create/run-results, menu + permission + router wiring; verified in browser end to end).
- [x] F3.2 Live KPI data (`GET /dashboards/:id/data`: counter/report/static resolution with per-widget isolation; verified live).
- [x] F6.1 Slow-query watcher (Prisma timing middleware + per-request ALS counters with warn thresholds; `SLOW_QUERY_MS`/`SLOW_QUERY_COUNT_WARN`; 4 tests green).
- [x] F6.2 Read-through cache (generic TTL cache with prefix invalidation + stats; website menu location reads cached, all 7 menu mutations invalidate; 4 tests green).
- [x] F6.3 API key quotas (per-prefix buckets via `lume_` header detection, `apiquota.<prefix>` settings overrides with 60s cache, JWT/IP traffic unchanged; 3 tests green).
- [x] F6.4 Error envelope (requestId + timestamp on handler errors, `X-Request-Id` header, backward-compatible meta merge; verified live; 3 tests green).
- [x] F5.2 Migration tracking (`migrate.js --status/--apply`: manifest vs `schema_migrations` drift with checksums; 26 modules baselined live; 3 tests green).
- [x] F5.1 Module packaging (`pack-module.js`: `.lume-pack` tarballs with sha256 descriptor sidecars, dependency checks, refuse-overwrite installs; smoke-tested on sms; 3 tests green).
- [x] F5.4 OpenAPI completeness (route-stack inventory merged per-request with 60s cache: 4 → 385 paths, auth flags, curated paths win; 3 tests green).
- [x] F5.3 Fixture library (`tests/helpers/fakes.js`: shared Prisma double with where-matchers, seed store, factories) + lifecycle contract test proving the pattern (2 tests green).
- [x] F7.1 2FA enrollment (self-contained RFC 6238 TOTP replacing broken otplib v13 usage; setup/confirm/disable/status endpoints; full cycle verified live; 4 tests green).
- [x] F7.2 OAuth social login (dependency-free code flow for GitHub/Google/Microsoft with state CSRF guard, profile normalization, find-or-create provisioning; 3 tests green).
- [x] F7.3 Enterprise SSO/SAML (SP metadata, redirect login, ACS validation → JWT provisioning; 3 tests green; live IdP exchange untested by design).
- [x] Theming (FastVue UX port: `useLumeTheme` presets/dark-auto/radius/font/compact/persistence, AntD-bound ConfigProvider, header ThemeSwitcher; 5 tests green; verified live including dark toggle).
- [x] FilterBuilder (FastVue port: AND/OR groups, per-type operators, select options; wired into EntityViewRenderer with override state + extended gt/lt/OR evaluation; 3 tests green).
- [x] TabBar (vben port: pinia store with pin/persistence/guard, scroll/middle-click/context menus, RouterView refresh; BasicLayout Header/MenuItem prop fixes; 6 tests green; verified live).

## Pre-existing debt burn-down (2026-09-07 → 2026-09-10: COMPLETE)
Full unit suite green: **109 suites, 2171 tests, 0 failures**.
- [x] view-store: `update()` deep-merges config; table views require non-empty columns (31/31).
- [x] entity-builder: `this.normalizeHooks` crash fixed; orm message aligned (24/24).
- [x] manifests: missing summary/description added to agentgrid + flowgrid (213/213).
- [x] registry unification: slug/name keys, dual-dialect validation, agent/permission APIs, invalidate/clear, scoped view lookup (entity-store + registry + runtime + runtime-registry + bootstrap green, 100/100).
- [x] view-generator: valid computed fixture; `readonly` persisted by defineField so forms exclude read-only fields (23/23 + entity-builder 24/24).
- [x] schema-generator: corrected omission assertion for computed fields (10/10).
- [x] workflow-executor: null guard before access; step-level `continueOnError` honored (10/10).
- [x] interceptor-pipeline: order rule reverted (55 slots between stages by design); test asserts integer >= 10 (11/11).
- [x] alerts: same-millisecond cleanup flake fixed with `>=` age comparison.
- [x] runtime suites green alongside (interceptor + runtime + alerts stable across runs).
- [x] agent-executor: null guard before access (11/11).
- [x] phase-10: paginator OOM guard, deterministic history ordering, offset-aware mocks, stable duration assertion (62/62).
- [x] workflow-automation-e2e: explicit transition trigger instead of interval timing (9/9).
- [x] metadata kernel: EntityEngine (hooks/computed/required/policies/auto-fire), step WorkflowExecutor (history + events), shared EventBusService, bare-identifier formula refs; metadata-framework integration green (23/23).
- [x] integration setup: dotenv in tests/setup.js (was 0/15 without DATABASE_URL); register role fallback; 404-not-500 expectation; test-env auth limiter (auth-workflow 7/7).
- [x] phase-7: redis mock converted to jest.fn spies (41/41).
- [x] view-system: timeline start/end inference extended (created/delivery/shipped/due); integration green (16/16).
- [x] F2.3 Scheduler verification (cron init, run-count/next-run tracking, graceful failures; 4 tests green).
- [x] F2.1 Flow runtime (`flow-runner.js`: trigger/condition(formula)/webhook/update_record/log nodes, branching, step cap, failure isolation; record.created/updated auto-fire; 4 tests green).
- [x] F4.1 Import job history (persisted jobs with counters/status on every execute, list/get endpoints; 4 tests green).
- [x] F4.2 API key scope enforcement (`requireScopes` with `resource:action` wildcards, legacy empty-scope keys pass through; wired into all 5 record routes; 4 tests green).
- [x] F4.3 Field encryption at rest (AES-256-GCM, `enc:v1` envelope, `validation: [{type:'encrypted'}]` marker, transparent encrypt/decrypt in record paths, unique skipped for encrypted fields, prod fail-closed key; 6 tests green).
- [x] F4.4 GDPR erasure (`GdprService`: DSAR collect without secrets, hard-delete user records, identity scrub with unique invalid email, audit proof; `DELETE /users/:id/erasure` self-or-admin gated; 4 tests green).
- [x] F3.3 DSAR export (`GET /users/:id/export` download without secrets + integration suite proving export → erase → login-blocked).
- [ ] F2.1, F3.2, F5–F7 pending, in order above.
