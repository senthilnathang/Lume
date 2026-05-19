# Code Quality — Baseline & Cleanup Roadmap

**Captured:** 2026-05-19, immediately post-v2.0 roadmap close-out.  
**Owner:** Engineering (no specific assignee yet).  
**Status:** Measurement only. CI runs `lint` + `typecheck` in warn-only mode via `.github/workflows/code-quality.yml`.

## TL;DR

The v2.0 codebase ships with significant accumulated code-quality debt — 1670 ESLint problems, 700+ TypeScript errors. None of these prevent runtime correctness (the test suite + setup-smoke gate guard that), but they do block:

- **Adding lint/typecheck as hard PR gates** — would block every PR
- **Onboarding new contributors** — `npm run lint` output is currently impossible to triage
- **IDE feedback** — autocompletion and quick-fixes get drowned in noise

The plan: stratify by violation type, knock out the cheap mass categories first, and only then introduce hard gates.

## Baseline Counts (2026-05-19, post-d59824d2)

### ESLint

```
✖ 1671 problems (1370 errors, 301 warnings)
```

Top rules (cleanup ROI ranked):

| Rank | Rule | Count | Disposition |
|------|------|-------|-------------|
| 1 | `@typescript-eslint/no-explicit-any` | 865 | **Mechanical** — replace with proper types or `unknown` |
| 2 | `@typescript-eslint/no-unused-vars` | 466 | **Mechanical** — autofix with `eslint --fix` |
| 3 | `no-undef` | 267 | **Config fix** — most are `process` / `Buffer` globals not declared for the lint environment. Fix once in `.eslintrc` (Node env) |
| 4 | `@typescript-eslint/no-var-requires` | 30 | **Manual** — convert `require()` to ESM `import` |
| 5 | `no-useless-escape` | 16 | **Mechanical** — autofix |
| 6 | `vue/no-v-html` | 13 | **Manual** — review each XSS risk |
| 7 | `no-prototype-builtins` | 5 | **Mechanical** — replace with `Object.prototype.hasOwnProperty.call(x, k)` |
| 8+ | Various (<5 each) | ~9 | **One-by-one** review |

**Quick-win projection:**
- Step 1 (fix the `.eslintrc` Node env): drops 267 `no-undef` → 1403 problems
- Step 2 (`eslint --fix` for autofixable rules): unused-vars + no-useless-escape + no-prototype-builtins drop ~487 → ~916 problems
- Step 3 (deal with `no-explicit-any` in service-layer files first): bulk replace `any` with `unknown` where safe, ~200 fixes/day

After steps 1+2 the count drops below 1000, mostly `any`-related. That's where the work becomes case-by-case judgment rather than mechanical.

### TypeScript (`tsc --noEmit --skipLibCheck`)

```
~701 errors
```

Most common patterns observed:

- **`error TS2307: Cannot find module '@/api/request'`** — Vite alias not resolvable by `tsc`. Fix: add a `paths` entry in `tsconfig.json` matching the Vite alias.
- **`error TS2339: Property 'X' does not exist on type 'PrismaClient<…>'`** — generated Prisma client out of sync. Fix: `npx prisma generate` is enough for the common case; verify scripts that use uncommon model names.
- **`error TS2345: Argument of type 'X' is not assignable…`** — generic ORM result types narrowing too aggressively. Often needs explicit annotations.

## Cleanup Plan (Estimated 2–3 weeks)

### Phase 1 — Config fixes (1 day)

1. `.eslintrc`: add `env: { node: true, es2022: true, browser: true }` for the dev paths that need it. Should drop `no-undef` from 267 → near zero.
2. `tsconfig.json`: add `paths` mapping for `@/*` and `@modules/*` that mirrors the Vite config. Drops the bulk of `TS2307`.
3. Run `npm run typecheck` again; should drop the error count by ~40%.

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
