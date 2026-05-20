# Code Quality — Baseline & Cleanup Roadmap

**Captured:** 2026-05-19 (baseline) → **Phase 3 ongoing**  
**Owner:** Engineering  
**Status:** Phases 1–3.0 complete. CI runs `lint` + `typecheck` in warn-only mode via `.github/workflows/code-quality.yml`.

## TL;DR

The v2.0 codebase shipped with 1671 ESLint problems and ~701 TypeScript errors. After Phases 1 + 2 + 3.0, the count is **275 lint problems / 0 TS errors** — an 83.5% drop in the lint debt and 100% elimination of the TS noise. The remaining 275 are real backend code issues, no longer drowning in config or static-asset noise.

| Phase | Lint problems | TS errors | Status |
|-------|--------------:|----------:|--------|
| Baseline (2026-05-19) | 1671 | 701 | — |
| Phase 1 done | 1407 | 3 | ✅ 2026-05-19 |
| Phase 2 done | 1403 | 0 | ✅ 2026-05-20 |
| Phase 3.0 done | 275 | 0 | ✅ 2026-05-20 |
| **Phase 3.1 ongoing** | **243** | **0** | 🟡 2026-05-20 |
| Phase 3 (rest) target | < 100 | 0 | pending |
| Phase 4 — hard gate | 0 net new | 0 net new | pending |

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

Heaviest remaining files:

```
   7  src/core/modules/lume/index.js
   7  src/core/modules/gawdesy/index.js
   5  src/modules/flowgrid/nodes/base.node.js
   5  src/core/workflows/action-executor.js
   4  src/modules/website/website.routes.js
   4  src/modules/website/services/page.service.js
```

### TypeScript — current state (post-Phase 1)

```
3 errors
```

Remaining errors are real bugs (Phase 2 work):

- `src/scripts/seed.ts(79,20)`: Property `activity` does not exist on PrismaClient → should be `activities`
- `src/scripts/seed.ts(147,20)`: Property `team` → should be `team_members`
- `src/scripts/seed.ts(188,20)`: Property `message` → should be `messages` (TS even suggests the fix)

These are stale model names from an older Prisma schema. The file isn't on the canonical install path (`createAdmin.js` + `seedData.js` are — see `INSTALLATION.md`), but it's still committed and runnable. Either fix it or delete it.

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

- The CI workflow runs **warn-only** (`continue-on-error: true`). Build never fails on lint/typecheck regression. The action summary shows the counts for PR reviewers to spot trends.
- Local: `npm run lint` and `npm run typecheck` work as expected from `backend/`.
- VS Code: install the official ESLint and Volar extensions; the existing `.eslintrc` will surface issues inline.

## Related Documents

- [PRE_LAUNCH_IMPROVEMENTS.md](deployment/PRE_LAUNCH_IMPROVEMENTS.md) — completed v2.0 roadmap; this doc starts the next sprint
- [TESTING.md](TESTING.md) — test coverage status
- [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture
