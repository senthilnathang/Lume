# Code Quality — Baseline & Cleanup Roadmap

**Captured:** 2026-05-19 (baseline) → **Phase 1 closed same day**  
**Owner:** Engineering  
**Status:** Phase 1 complete. CI runs `lint` + `typecheck` in warn-only mode via `.github/workflows/code-quality.yml`.

## TL;DR

The v2.0 codebase shipped with 1671 ESLint problems and ~701 TypeScript errors. Phase 1 (config-only fixes) closed 264 lint problems and 698 TS errors with no source-code changes. Phase 2 (mechanical fixes) and Phase 3 (`any` triage) are still ahead.

| Phase | Lint problems | TS errors | Status |
|-------|--------------:|----------:|--------|
| Baseline (2026-05-19) | 1671 | 701 | — |
| **Phase 1 done** (2026-05-19) | **1407** | **3** | ✅ |
| Phase 2 target | ~900 | 0 | pending |
| Phase 3 target | < 200 | 0 | pending |
| Phase 4 — hard gate | 0 net new | 0 net new | pending |

## Baseline → Phase 1 (2026-05-19)

| Metric | Baseline | Post-Phase 1 | Delta |
|--------|---------:|-------------:|------:|
| ESLint problems | 1671 | **1407** | −264 (−15.8%) |
| ESLint `no-undef` | 267 | **3** | −264 (−98.9%) |
| TypeScript errors | ~701 | **3** | −698 (−99.6%) |

Phase 1 delivered ~16% of the lint debt and ~99.6% of the TS debt — almost all of the TS-error elimination was about telling `tsc` not to check files that were never compiled in the first place (frontend Vue files served as backend static assets, plus abandoned NestJS scaffolding).

### What Phase 1 actually changed

- **`packages/@lume/eslint-config/index.mjs`** — flat config now imports `globals` and applies node / browser / es2022 / jest globals per file-pattern (backend, frontend, tests). Previously every `process`, `Buffer`, `__dirname`, `window`, `document` triggered `no-undef`.
- **`backend/tsconfig.json`** — adds `baseUrl` + `paths` for `@/*`, `@modules/*`, `#/*` aliases (mirrors Vite); excludes `src/core/graphql/**` (orphan NestJS scaffolding, no deps installed, no callers) and `src/modules/*/static/**` (Vue frontend files compiled by `apps/web-lume`'s own tsconfig). Adds `ignoreDeprecations: "6.0"` to silence the TS7 `baseUrl` warning.

### ESLint — current top rules (post-Phase 1)

| Rank | Rule | Count | Disposition |
|------|------|------:|-------------|
| 1 | `@typescript-eslint/no-explicit-any` | 865 | Phase 3 |
| 2 | `@typescript-eslint/no-unused-vars` | 466 | Phase 2 autofix |
| 3 | `@typescript-eslint/no-var-requires` | 30 | Phase 2 manual (require → import) |
| 4 | `no-useless-escape` | 16 | Phase 2 autofix |
| 5 | `vue/no-v-html` | 13 | Phase 2 manual (XSS audit each) |
| 6 | `no-prototype-builtins` | 5 | Phase 2 autofix |
| 7 | `no-undef` | 3 | Phase 2 — genuine import bugs in 2 module files |
| 8 | `no-constant-condition` | 2 | Phase 2 one-off |
| 9+ | misc | ~7 | Phase 2 case-by-case |

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
