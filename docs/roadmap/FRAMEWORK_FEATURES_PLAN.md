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
- [ ] F2.4 **Webhook triggers** (outbound `POST` on record events with secret signing).

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

## Status (2026-09-05)
- [x] F1.1 Wildcard grants (`matchesPermission`: exact/`*`/`*.*`/`collection.*`/`*.action`; admin tiers carry `*`+`*.*`).
- [x] F1.2 Role-hierarchy inheritance (parent inherits active descendants via `Role.metadata.parentRoleId`; `invalidateAll()` registry wired into role create/update/delete/permission-assign).
- [x] F1.3 Group-based grants (`usergroups.<id>` + `groupgrants.<group>` settings unioned into effective permissions; interim until Group tables gain membership columns; 35 tests green across merge + hierarchy + security suites).
- [ ] F1.4–F1.6, F2–F7 pending, in order above.
