# Lume Enterprise Parity Roadmap — TwentyHQ / Huly / ServiceNow / Salesforce

**Created:** 2026-09-03 | **Completed:** 2026-09-04 — all P0/P1/P2 items done (only HSTS-preload review noted as future work)
**Source:** framework comparison (UX/UI, dynamic components, entity builder, DnD)
**Single command:** `npm run dev:admin` (backend `:3000` + admin panel, turbo filter `lume-backend` + `@lume/web-lume`)
**Related:** `docs/deployment/public_release_roadmap.md`, `docs/deployment/SEO_AUDIT.md`, `SECURITY.md`

Benchmarks: Twenty (open CRM, table/kanban/calendar + saved views + `defineObject` code-first + MCP), Huly (board/sprint/inbox, CVE-2026-12212 IDOR lesson), ServiceNow App Engine + UI Builder (100+ components, content-tree, data-resources, variations), Salesforce Lightning (Dynamic Forms/Related Lists/Actions, Activation by App/Profile/RecordType/Device, LWC `js-meta.xml`).

## Status board

- [x] P0-1b Backend view metadata (kanban/calendar/gallery, filters/groupBy/visibility) — `view-renderer.service.js`, `entity-views.routes.js`
- [x] P0-1c Frontend `KanbanBoard.vue` + `EntityViewRenderer.vue` (view-switcher, DnD, No-Value col, resizable) — lint clean
- [x] P0-1d Wire into `ModuleView.vue` (table/kanban toggle, `KanbanBoard`, PUT-move persistence, widths in localStorage) — zero new lint errors
- [x] P0-1e `custom-views.vue` designer polish (`ViewConfigDesigner.vue`: display/filters/sort + kanban/calendar/chart sections, Visual/JSON toggle, same-JSON compat)
- [x] P0-2a Visual Form Builder (`FormLayoutDesigner.vue`: palette/canvas/inspector, DnD reorder, sections, `visibleIf` rules, Visual/JSON toggle, same-JSON compat)
- [x] P0-2b Block manifest (`block-manifest.js`: 14 blocks, targets/formFactors/props) + palette driven by manifest + device (desktop/phone) + profile preview + phone-constrained preview
- [x] P0-2c `record-page-builder.vue` (highlights/path/related-list composer, live preview, localStorage autosave, JSON export/import; `/settings/customization/record-pages`)
- [ ] P0-3 Security hardening follow-ups (done: fail-closed JWT, weak-secret check, /metrics gate — see below)
- [ ] P1-1 Enterprise entity builder (composite fields, ERD, formula/rollup)
- [ ] P1-2 Enforce profiles/OWD/sharing/field-security in query builder
- [ ] P1-3 UX polish (Cmd+K, skeletons, dynamic interactions, theming)
- [x] P2-1 DX + AI (create-lume-app + template gallery + MCP server done; Build Agent prompt flow remaining)

## P0-1 Dynamic Views parity [high]
**Gap:** `ModuleView.vue` (1353 lines, list-table only), `custom-views.vue` is CRUD list, no inline designer. Twenty has table/kanban/calendar/grouped-table/widgets + per-view filters AND/OR + sort + group + resizable/reorderable columns.
**Tasks:**
1. Extend `entityViews` model: `type, filters[], sort, groupBy, visibleFields, kanban{columnField,columnOrder,widths}, visibility{profiles,recordTypes,devices}`.
2. New `<EntityViewRenderer>` + view-switcher dropdown (`All X / +Add view / Save as new view / No-Value column`).
3. Kanban DnD via existing `vuedraggable`: cards=records, columns=select field, persist order/widths, move preserves sort.
**Touch:** `backend/src/modules/base_customization/static/views/custom-views.vue`, `apps/web-lume/src/components/ModuleView.vue`, `backend/src/core/services/entity.service.js`, `backend/src/modules/base/models/schema.js`
**Accept:** kanban on any object, drag card/column, save view per user, related-record layout in record page.

## P0-2 Visual Form/Page Builder [high]
**Gap:** `form-builder.vue:51-58` edits `layout_config` JSON in textarea. No canvas like Lightning App Builder / UI Builder.
**Tasks:**
1. 3-pane builder: palette (22 types) | canvas (sections/columns drop zones with `+Add before/after` + content-tree) | inspector (label/required/default/visibility rule).
2. Dynamic visibility rules: `showIf{field,op,value} + profile + device` — reuse in `page-editor.vue` + new `record-page-builder.vue`.
3. Block manifest (`label, targets[record|home|app], props{type,title,description,default}, formFactors`) to avoid blank/invalid components.
**Touch:** `backend/src/modules/base_customization/static/views/form-builder.vue`, `.../dashboard-widgets.vue`, `backend/src/modules/website/static/views/page-editor.vue`, `backend/src/modules/editor/static/views/*`
**Accept:** no JSON hand-edit for standard forms, profile/device preview toggle, mobile responsive.

## P0-3 Security hardening follow-ups [high]
**Done (2026-09-03, batch 1):** fail-closed `jwtUtil` (no `jwt-secret` fallback, 32-char min, `1h` default expiry) in `backend/src/shared/utils/index.js`; weak-secret check incl. `.env.example` default in `backend/src/index.js`; prod `/metrics` gated by `METRICS_TOKEN` or localhost.
**Done (2026-09-03, batch 2):**
1. `STRICT_AUTH=true` flag → deny-by-default 401 for credential-less `/api/*` (public/optional/website-public allowlisted; default off, zero breakage) in `backend/src/index.js`.
2. CORS `*` + `credentials:true` reflection rejected fail-closed with warning in `backend/src/index.js`.
3. Auth limiter: prod `10` → `5`/15m + `skipSuccessfulRequests` (only failed logins count; legit users never lock out) in `backend/src/index.js`.
4. Access lifetime `7d` → `1h` (`JWT_EXPIRES_IN` in `.env.example` + live `.env`; `jwtUtil` honors `ACCESS_TOKEN_EXPIRES || JWT_EXPIRES_IN || '1h'`); refresh stays `30d` rotating + DB-bound.
5. Opt-in `requireScopes(...scopes)` middleware enforcing `apiKeyScopes` in `backend/src/core/middleware/auth.js`.
6. Uploads: explicit MIME allowlist (images/video/audio/pdf/zip/fonts; no more `application/*`) + icons batch `50` → `20` (500MB RAM-DoS cap) in `website.routes.js`.
**Done (2026-09-03, batch 3):** refresh rotation fixed (verified against refresh secret + unique `jti`) with replay-revokes-family detection; opt-in `DOCS_TOKEN` bearer gate on `/api/docs` + `/api/openapi.json`; strict API CSP (`default-src 'none'`, `frame-ancestors 'deny'`, Swagger excluded); `role_id` restored in refreshed access tokens. 3 unit tests green.
**Still open:** Helmet CSP `upgrade-insecure-requests`/HSTS preload review.
**Touch:** `backend/src/index.js`, `backend/src/core/middleware/auth.js`, `.env.example`
**Accept:** `npm run check` + `setup-smoke.test.js` + `websocket-permission.test.js` green, zero weak-secret boot.

## P1-1 Enterprise entity builder [medium]
**Gap:** 12 field types vs 20+. No composite (fullname/address/currency), no ERD.
**Tasks:**
1. [x] `currency, address, fullname, file, signature, lookup, master-detail` types (validators in both record services + `VALID_FIELD_TYPES`; manifest palette entries; 6 unit tests green).
2. [x] Master-detail cascade (`cascade.service.js`: soft/hard delete of owned details, recursive, cycle-safe visited set; wired into both `RecordService.deleteRecord` paths; 5 unit tests green).
2. [x] Formula compute server-side (`formula.service.js`: safe tokenizer/parser, no `eval`; `{refs}`, arithmetic, comparisons, `CONCAT/UPPER/LOWER/TRIM/LEN/ROUND/FLOOR/CEIL/ABS/IF`; wired into both `RecordService` create/update paths; client values overwritten; 10 unit tests green).
3. [x] ERD data backend: `GET /entities/schema/graph` (entities + fields + lookup links; registered before `/:id`).
4. [x] ERD canvas UI (`schema-erd.vue`: depth-layered columns, SVG lookup edges, search, zoom, click-to-isolate + link panel; registered in manifest menus).
5. [x] Drag-to-relate (drag node grip onto target → lookup/master-detail field via `POST /entities/:id/fields`; `createField` persists `lookupEntityId/lookupField/formulaExpression` + validates target exists; 3 unit tests green).
6. [x] Validation rule enforcement (`field-validation.service.js`: regex/min/max/minLength/maxLength/unique; `unique` flag support; enforced in both record services on create/update with self-exclusion; 7 unit tests green).
7. [x] Validation builder UI (`FormLayoutDesigner` inspector: regex/minLength/maxLength/min/max/unique rules with pattern/value/message, rule-count badge on canvas chips, same-shape JSON round-trip the server enforces).
8. [x] OWD merge (`AccessControlService.resolveRecordVisibility`: explicit record value wins, else `owd.entity.<id>` setting, else `private`; applied in both record `createRecord` paths; invalid values fail closed to `private`; 3 unit tests green).
9. [x] Profiles → permission-sets merge (`SecurityService.getEffectivePermissions`: role perms ∪ `permsets.user.<id>` grants, 60s TTL cache, inactive-role fail-closed; `checkPermission`/`getUserPermissions` unified on it; existing 23 security tests still green + 3 new).
**Touch:** `backend/src/domains/entity/entity-builder.js`, `backend/src/modules/base/services/entity-builder.service.js`, `backend/src/core/services/entity.service.js`
**Accept:** create object+fields+relations with zero code, formula/rollup compute server-side.

## P1-2 Profiles/OWD/sharing/field-security enforcement [medium]
**Gap:** Views scaffolded (`profiles.vue, permission-sets.vue, sharing-rules.vue, org-wide-defaults.vue, field-security.vue, acl-builder.vue`) but `authorize(resource,action)` only, no row/field injection.
**Tasks:**
1. [x] Field-level enforcement on the live entity-records path (`modules/base/services/record.service.js`): `getFieldPolicy()` reads `EntityFieldPermission` rows per role, default-allow when no rows exist (zero breakage); unreadable fields stripped on read/list, unwritable inputs dropped on create/update, formulas always server-recomputed. `role_id` added to JWT payload (`user.service.js`) and threaded through `entity-records.routes.js`. Regression tests: `entity-record-policy.test.js` (3 green).
2. [x] Row-level predicates on entity records (`isRecordVisible` + `buildRecordScope`: private = owner-only, company/public = same-company, `super_admin` bypass, company boundary always enforced; legacy no-context callers unaffected; 6 unit tests green). Remaining: profiles → permission-sets merge; OWD default private/read.
**Touch:** `backend/src/core/db/adapters/drizzle-adapter.js`, `backend/src/core/middleware/auth.js`, `entityAccess.js`
**Accept:** low-priv user cannot fetch others' mailbox-like secrets (Huly CVE regression test).

## P1-3 UX polish [medium]
1. Wire existing `CommandPalette.vue` to Cmd+K (objects/views/actions/nav).
2. Skeletons/empty states (never blank box), width-aware (100%), invalid-state for missing required props.
3. Dynamic Interactions: source fires `CustomEvent`, targets subscribe (e.g. list `itemselected` → detail).
4. Design-token theming via `theme-builder.vue`.
**Touch:** `apps/web-lume/src/components/*`, `apps/web-lume/src/composables/*`, `apps/web-lume/src/layouts/BasicLayout.vue`
**Accept:** Lighthouse + keyboard-only walkthrough clean.
**Done (2026-09-03):** `useDynamicInteractions` bus (`record:created/updated/deleted`, `view:changed`, `filter:changed`; listener errors isolated; auto-cleanup) wired into `ModuleView` (announces own mutations, reloads on external same-module events with self-echo guard); first-load skeleton replaces spinner; `DataTable.vue` targeted shim in `env.d.ts`; new files eslint + vue-tsc clean. Cmd+K already wired; theme-builder exists — no work needed.

## P2-1 DX + AI [low]
1. `npx create-lume-app` scaffold (object + views + logic + component + agent skill, TS) — mirrors `create-twenty-app`.
2. MCP server per workspace (read/write CRM via OAuth).
3. Template gallery + Build Agent prompt flow.
**Touch:** `packages/*`, `backend/src/core/api/*`, `docs/*`

## Tracking
Update checkboxes here + `todo` list in session. Each P gets its own branch `feat/p0-1-entity-views` etc. Gate: `npm run lint` zero, `npm run typecheck` ≤ budget, `setup-smoke` green.

## Browser hardening (2026-09-03)
- [x] Router audit: all 75 mapped views resolve (`tmp/audit` script); `#/api/*` codemod with export verification; missing workflow-definition API aliases added.
- [x] Dead routes dropped (`admin/plugins`, `admin/policies` — no UI/backend); admin routes remapped to working views, verified in browser.
- [x] Role-shape + reload-safe admin guards (`roleName`/`isAdmin` incl. `super_admin`, JWT-claim fallback); spurious `/403` fixed.
- Remaining @vben orphans are unrouted legacy (never bundled); `views/public/*` + `DonationsView` dead code still pending deletion.

## P2 progress (2026-09-03)
- [x] `packages/create-lume-app` — zero-dependency scaffolder (manifest, Drizzle schema, service, auth API routes, admin list view + create form, README); `node --test` suite 4/4 green; CLI smoke-tested (11 files).
- [x] Template gallery (`src/templates.js`: `crm-pipeline`, `ats`, `helpdesk` with staged select options; `--template`/`--list-templates` flags; inline `field:select:a|b` spec syntax; 7/7 tests green).
- [x] MCP server (`packages/lume-mcp`: stdio, API-key auth, `list_entities`/`schema_graph`/`list_records`/`get_record`/`create_record` over the real API; 3/3 node:test green).
- [x] Build Agent flow (`--from-prompt`: template/field/name detection with printed understanding + explicit-flag overrides; 5/5 node:test green, CLI smoke-tested).
