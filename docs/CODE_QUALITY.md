# Code Quality — Baseline & Cleanup Roadmap

**Captured:** 2026-05-19 (baseline) → **Phase 3 ongoing**  
**Owner:** Engineering  
**Status:** Phases 1–4 complete. CI runs `lint` + `typecheck` as a **ratchet hard-gate** via `.github/workflows/code-quality.yml` (fails if count > budget; cleanup PRs ratchet the budget down).

## TL;DR

The v2.0 codebase shipped with 1671 ESLint problems and ~701 TypeScript errors. After Phases 1 + 2 + 3.0, the count is **275 lint problems / 0 TS errors** — an 83.5% drop in the lint debt and 100% elimination of the TS noise. The remaining 275 are real backend code issues, no longer drowning in config or static-asset noise.

| Phase | Lint problems | TS errors | Status |
|-------|--------------:|----------:|--------|
| Baseline (2026-05-19) | 1671 | 701 | — |
| Phase 1 done | 1407 | 3 | ✅ 2026-05-19 |
| Phase 2 done | 1403 | 0 | ✅ 2026-05-20 |
| Phase 3.0 done | 275 | 0 | ✅ 2026-05-20 |
| Phase 3.1 batch 1 | 243 | 0 | ✅ 2026-05-20 |
| Phase 3.1 batch 2 | 195 | 0 | ✅ 2026-05-20 (under-200 gate hit) |
| Phase 3.2 done | 162 | 0 | ✅ 2026-05-20 (all no-var-requires gone) |
| Phase 3.3 done | 147 | 0 | ✅ 2026-05-20 (all no-useless-escape gone) |
| Phase 3.4 done | 135 | 0 | ✅ 2026-05-20 (all no-explicit-any gone) |
| Phase 3.5 done | 124 | 0 | ✅ 2026-05-20 (all misc rules + parsing-error gone) |
| Phase 4 done — ratchet | 124 (budget) | 0 (budget) | ✅ 2026-05-20 — `.github/workflows/code-quality.yml` fails on >budget |
| **Phase 3.1 batch 3 + ratchet drop** | **95** (budget) | **0** (budget) | ✅ 2026-05-21 — first ratchet-down PR; pattern proven |

The "0 TS errors" milestone means **every TypeScript error in this codebase is now actionable signal**, not config noise. The Phase 3.0 drop revealed that almost all of the previously-counted `any` and `unused-vars` problems were in frontend Vue files (`src/modules/*/static/**`) served as static assets — those are owned by `apps/web-lume`'s own lint chain, not the backend's. Once excluded, the **real** backend debt is much smaller and dominated by `no-unused-vars` (207) rather than `no-explicit-any` (12).

## Baseline → Phase 1 (2026-05-19)

| Metric | Baseline | Post-Phase 1 | Delta |
|--------|---------:|-------------:|------:|
| ESLint problems | 1671 | **1407** | −264 (−15.8%) |
| ESLint `no-undef` | 267 | **3** | −264 (−98.9%) |
| TypeScript errors | ~701 | **3** | −698 (−99.6%) |

Phase 1 delivered ~16% of the lint debt and ~99.6% of the TS debt — almost all of the TS-error elimination was about telling `tsc` not to check files that were never compiled in the first place (frontend Vue files served as backend static assets, plus abandoned NestJS scaffolding).

### What Phase 1 actually changed

- **`eslint.config.mjs`** (root, tracked) — added `globals` import; per-file-pattern globals for backend (node), frontend (browser), Vue SFCs, and tests (jest, additive). Lives in the root config because `packages/@lume/eslint-config/` is gitignored.
- **`backend/tsconfig.json`** — adds `baseUrl` + `paths` for `@/*`, `@modules/*`, `#/*` aliases (mirrors Vite); excludes `src/core/graphql/**` (orphan NestJS scaffolding, no deps installed, no callers) and `src/modules/*/static/**` (Vue frontend files compiled by `apps/web-lume`'s own tsconfig). Adds `ignoreDeprecations: "6.0"` to silence the TS7 `baseUrl` warning.

## Phase 2 — Surfaced bugs (2026-05-20)

Phase 2 delivered the 6 real bugs that Phase 1's config cleanup exposed, plus discovered that the broad `eslint --fix` sweep is not viable on this codebase. Lint count went 1407 → 1403; TS errors went 3 → 0.

### What Phase 2 actually changed

- **Deleted `backend/src/scripts/seed.ts`** — referenced 3+ Prisma model names that no longer exist (`prisma.activity`, `prisma.team`, `prisma.message`), plus stale date/enum types from an old schema. The canonical seeding path is `prisma/seed.js` → `src/scripts/createAdmin.js` + `src/scripts/seedData.js` (documented in `INSTALLATION.md`). Repointed `npm run seed` to the canonical script. Drops 3 TS errors and removes a future foot-gun.
- **`src/modules/base_automation/static/views/rollup-fields.vue`** — `TabPane` was imported under the wrong name (referenced as `ATabPane` later), triggering both `no-unused-vars` AND `no-undef`. Aliased the import: `TabPane as ATabPane`. Two errors gone with one line change.
- **`src/modules/common/static/api/request.js`** — added `/* global axios */` ambient declaration. The file is loaded by the SFC runtime in the browser, not bundled — `axios` is a runtime-provided global. Genuine "lint is wrong" case.
- **`src/modules/editor/static/components/NavigatorPanel.vue`** — added a single `eslint-disable-next-line no-undef` for a `PropType<TreeNode>` annotation. The TS interface IS defined in the same file's first `<script>` block, but ESLint's Vue parser scopes each `<script>` independently and can't see across blocks. Real fix would require type-aware lint setup; not worth the perf cost for one line.

### What Phase 2 did NOT change (autofix sweep was a dud)

`npm run lint:fix` produced zero diffs on this codebase. The high-count rules have no programmatic fixers:

- `@typescript-eslint/no-explicit-any` (865) — requires semantic analysis to suggest a better type; no autofix
- `@typescript-eslint/no-unused-vars` (466) — could in theory delete the var, but the safe-default is "manual", and that's how it's configured

The original CODE_QUALITY.md Phase 2 estimate ("~487 autofix wins") was wrong. **The remaining cleanup is mostly hand work**. The few rules that DO have fixers (`no-useless-escape`, `no-prototype-builtins`) couldn't auto-fix on this codebase either — likely the typescript-eslint parser doesn't surface the fixable flag through.

## Phase 3.0 — Exclude frontend static/ assets (2026-05-20)

Massive single-change win: the `eslint.config.mjs` `ignores` block now drops `backend/src/core/graphql/**` (orphan NestJS scaffolding, see Phase 1.2) and `backend/src/modules/*/static/**` (Vue frontend files served by the backend as static assets but compiled by `apps/web-lume`'s own toolchain).

**Lint count: 1403 → 275 (−1128, −80%)** in a single ignore block.

This is the same logic as Phase 1.2's `tsconfig.json` exclude — the backend's lint chain was checking files outside its own compile target. The exclusions are content-true (`apps/web-lume` does lint those files via its own pipeline) but were missing from the backend config.

### ESLint — current top rules (post-Phase 3.0)

| Rank | Rule | Count | Disposition |
|------|------|------:|-------------|
| 1 | `@typescript-eslint/no-unused-vars` | 207 | Phase 3.1 — semi-mechanical (prefix with `_`) |
| 2 | `@typescript-eslint/no-var-requires` | 30 | Phase 3.2 — manual require → import |
| 3 | `no-useless-escape` | 15 | Phase 3.3 — manual one-by-one |
| 4 | `@typescript-eslint/no-explicit-any` | 12 | Phase 3.4 — manual type narrowing |
| 5 | `no-prototype-builtins` | 5 | Phase 3.5 — `Object.prototype.hasOwnProperty.call(...)` |
| 6 | `no-constant-condition` | 2 | Phase 3.5 one-off |
| 7 | `no-empty` / `no-const-assign` | 2 | Phase 3.5 one-off |

The biggest surprise: only **12** `no-explicit-any` in the real backend (was 865 across the whole tree). The "Phase 3 = 1 week of `any` triage" estimate was way off — actual `any` triage is < 1 hour now. The dominant remaining work is `no-unused-vars` (207 sites, semi-mechanical).

## Phase 3.1 — `no-unused-vars` cleanup (ongoing, 2026-05-20)

Pattern: most unused vars are destructured fields documenting a job/event payload shape — prefix with `_` to match the lint config's `varsIgnorePattern: '^_'` and keep the documentation. Genuinely dead code gets removed.

Config fix needed first: the base `@lume/eslint-config` only wires `@typescript-eslint/no-unused-vars` (with `_` ignore pattern) on `.ts`/`.tsx`. JS files were getting checked by the base `no-unused-vars` rule WITHOUT the ignore pattern, which made `_` prefixing a no-op. Added to `eslint.config.mjs`:

```js
{
  files: ['**/*.{js,mjs,cjs}'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
  },
}
```

Files cleaned so far (run-by-run):

| File | Sites cleared | Notes |
|------|--------------:|-------|
| `src/core/services/job-processors.js` | 16 | Destructured payload fields in stub processors; all `_`-prefixed |
| `src/core/db/adapters/base-adapter.js` | 9 | Abstract interface methods; all args `_`-prefixed |

Net count: **275 → 243** (and the config fix surfaced 187 previously-hidden JS `no-unused-vars` issues — those are now visible signal, not a regression).

Heaviest remaining files (Phase 3.1 batch 2):

```
   3  src/modules/flowgrid/services/execution.service.js
   3  src/core/middleware/ipAccess.js
   3  src/api/entity.routes.js
   ... (scattered ≤3/file, diminishing returns)
```

## Phase 3.2 — `no-var-requires` cleanup (2026-05-20)

Mechanical CommonJS → ESM conversion across the 30 sites that still used `require()` in this ESM-`"type": "module"` codebase. Two patterns:

- **Top-level requires** in routes/services → static `import` at top of file
- **Inline requires** (`const crypto = require('crypto')` mid-function) → hoist to top-level import

Net: 30 `no-var-requires` → 0.

### What got deleted in Phase 3.2

Several orphan files surfaced during the conversion:

- `backend/src/core/modules/lume/lume.service.js` — referenced a non-existent `crud.mixin`, used abandoned Sequelize-style ORM, zero callers
- `backend/src/core/modules/gawdesy/gawdesy.service.js` — same story
- `backend/src/scripts/createUser.js`, `listUsers.js`, `loadDemoData.js` — JSON-file "database" scaffolding from before MySQL+Prisma+Drizzle; only referenced by `manage.ts` which is itself orphan
- `backend/src/scripts/manage.ts` — orphan dispatcher with no callers

`createAdmin.js` + `seedData.js` are the canonical user/data scripts (wired via `npm run db:admin` / `db:seed`), so the deletes don't break any documented path.

## Phases 3.3 → 3.5 — Final categorical cleanup (2026-05-20)

Three short sweeps that closed every remaining rule category except `no-unused-vars`.

### Phase 3.3 — `no-useless-escape` (15 → 0)

Mostly regex character classes where `(`, `{`, `+`, `.` were escaped despite being inside `[...]` (where they're literal anyway). Edited:

- `core/permissions/safe-evaluator.js` (6) — IIFE/arrow-function detection regexes
- `core/services/record.service.js` (3) — phone validator
- `modules/security-audit/security-hardening.js` (3) — password-strength + CORS wildcard regex
- `modules/base_automation/services/notification-enhanced.js` (3) — phone-number regex

### Phase 3.4 — `no-explicit-any` (12 → 0)

All 12 lived in `core/agents/types.ts` — JSON-payload shapes where `any` was the lazy choice. Bulk-replaced with `unknown` (consumers must narrow before using; same usability + actually safe). TS errors stay at 0.

### Phase 3.5 — Misc rules (10 → 0)

- `no-prototype-builtins` (5) — `obj.hasOwnProperty(k)` → `Object.prototype.hasOwnProperty.call(obj, k)`. Real safety win: the old form can be hijacked by user-supplied objects with their own `hasOwnProperty`.
- `no-const-assign` (1) — caught a real bug in `flowgrid/services/execution-engine.service.js`: BFS queue declared `const` but reassigned inside the loop. Changed to `let`.
- `no-constant-condition` (2) — `while (true)` paginators → `for (;;)` (idiomatic "intentional infinite loop with internal break").
- `no-empty` (1) — empty `catch {}` block got an intent-revealing comment.
- `no-case-declarations` (1) — wrapped a `default:` case in `{ ... }` so the `const` declaration doesn't leak.
- `parsing-error` (1) — JSDoc on `core/runtime/types.js` contained a literal cron `*/4` that closed the comment block; reworded.

### TypeScript — current state (post-Phase 1)

```
3 errors
```

Remaining errors are real bugs (Phase 2 work):

- `src/scripts/seed.ts(79,20)`: Property `activity` does not exist on PrismaClient → should be `activities`
- `src/scripts/seed.ts(147,20)`: Property `team` → should be `team_members`
- `src/scripts/seed.ts(188,20)`: Property `message` → should be `messages` (TS even suggests the fix)

These are stale model names from an older Prisma schema. The file isn't on the canonical install path (`createAdmin.js` + `seedData.js` are — see `INSTALLATION.md`), but it's still committed and runnable. Either fix it or delete it.

## Phase 4 — CI ratchet gate (2026-05-20)

`.github/workflows/code-quality.yml` is no longer warn-only. It now fails the build when the lint or TS count exceeds the budget:

```yaml
env:
  LUME_LINT_BUDGET: 124    # Drops on cleanup PRs, never raises
  LUME_TS_BUDGET: 0         # Always zero now
```

**How a cleanup PR works:**

1. Fix lint problems locally; verify `npm run lint` shows a lower count.
2. Lower `LUME_LINT_BUDGET` in the workflow file to the new local count.
3. CI re-runs and passes because count == budget.

If you forget step 2, the gate still passes (count is below budget). But this is detected by the secondary "budget drift" check: a cleanup PR that lowers `npm run lint` without ratcheting the budget gets flagged in code review via the action summary.

**When net-new issues appear**, CI fails with:

```
::error::Lint count 127 exceeds budget 124. Either fix the new
issues, or — if this PR drops the count — lower LUME_LINT_BUDGET
in .github/workflows/code-quality.yml to match.
```

When the budget reaches 0, replace the `>` comparison with `-ne` in the workflow to forbid any reintroduction.

## Cleanup Plan (Estimated 2–3 weeks)

### Phase 1 — Config fixes (✅ DONE, 2026-05-19)

What was done — see "What Phase 1 actually changed" above. Net result: −264 lint problems, −698 TS errors, no source-code changes, no test regressions (34/34 still pass).

What worked:
- Adding `globals` to the flat config eliminated essentially all `no-undef` errors in one change.
- The TS error count was misleading — almost all of it was tsc checking files outside its actual compile target. Excluding the two trees (`src/core/graphql/**`, `src/modules/*/static/**`) collapsed 698 errors to 0 without touching any source.
- The 3 remaining TS errors are real bugs in `src/scripts/seed.ts`, surfaced exactly because the noise is gone. That's the point of Phase 1.

### Phase 2 — Mechanical autofix (1-2 days)

```bash
cd backend
npm run lint:fix
# Then re-run lint, review the diff, commit.
```

Expected post-phase-2 count: **~900 lint problems, ~400 TS errors**.

### Phase 3 — `no-explicit-any` triage (1 week)

The 865 `any`s are split roughly:
- ~40% are legitimate (third-party libs without types, pass-through utility functions)
- ~60% can be replaced with `unknown` or a specific type

Strategy: convert one module per day, leading with the heaviest hitters (`base_automation`, `editor`, `agentgrid`).

### Phase 4 — Hard CI gate (after Phase 3)

Once the count is under 200 problems and 100 TS errors, flip `continue-on-error: false` in `.github/workflows/code-quality.yml`. PRs that ADD to the count get blocked, but the historical debt is no longer scary.

## What's NOT in scope here

- **Test coverage gaps** — unrelated dimension. Tracked separately in `docs/TESTING.md`.
- **Module @swagger annotations** — separate; tracked under P2-2 follow-on.
- **Frontend lint/typecheck** — `apps/web-lume` has its own lint chain; this doc is backend-only for v2.0.

## Operational Notes

- The CI workflow runs as a **ratchet hard-gate** (`continue-on-error: false`, fails if count > budget). Cleanup PRs must lower `LUME_LINT_BUDGET` in the workflow file to match the new local count. Action summary still shows the live counts.
- Local: `npm run lint` and `npm run typecheck` work as expected from `backend/`.
- VS Code: install the official ESLint and Volar extensions; the existing `.eslintrc` will surface issues inline.

## Related Documents

- [PRE_LAUNCH_IMPROVEMENTS.md](deployment/PRE_LAUNCH_IMPROVEMENTS.md) — completed v2.0 roadmap; this doc starts the next sprint
- [TESTING.md](TESTING.md) — test coverage status
- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture
