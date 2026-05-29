# Contributing to Lume

Thanks for your interest in contributing! Lume is a modular NestJS-style
framework (Express backend + hybrid Prisma/Drizzle ORM) with a Vue 3 admin
panel and a Nuxt 3 public site. This guide gets you from clone to PR.

## Code of Conduct

This project adheres to the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating you are expected to uphold it. Report unacceptable behavior via
the contact in [SECURITY.md](./SECURITY.md).

## Getting started

Prerequisites: Node.js 20+, MariaDB 10.11 (the project standard), Git.

```bash
git clone https://github.com/senthilnathang/Lume.git
cd Lume/backend
cp ../.env.example .env        # then set DATABASE_URL etc.
npm install
npm run db:setup               # refreshDb → prisma push → drizzle → admin → seed
npm run dev                    # backend on :3000 (tsx watch)
```

Admin panel (`apps/web-lume`) and public site (`apps/riagri-website`) each have
their own `npm install` + `npm run dev`. See [`docs/INSTALLATION.md`](./docs/INSTALLATION.md)
and [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) for full details.

## Development workflow

1. Fork and create a branch: `git checkout -b feat/short-description` (or `fix/…`, `docs/…`).
2. Make focused changes. Keep PRs small and single-purpose.
3. Follow the conventions in [`CLAUDE.md`](./CLAUDE.md) (ES modules only, hybrid
   ORM rules, module code organization, security/rate-limiting patterns).
4. Run the checks below before pushing.
5. Open a PR using the template; link any related issue.

## Quality gates

```bash
cd backend
npm run check        # lint (warn) + typecheck (warn) + smoke + websocket-permission
npm test             # Jest (ESM: NODE_OPTIONS='--experimental-vm-modules')
npm run lint         # must be 0 problems — CI is a strict-zero gate
npm run typecheck    # must be 0 errors (LUME_TS_BUDGET=0)
```

- **CI is strict-zero**: `.github/workflows/code-quality.yml` fails on any lint
  problem or typecheck error. The hard test gate is `setup-smoke.test.js`.
- Frontend: `cd apps/<app> && npm run typecheck` (and `npm run build` for Nuxt).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
`fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `perf:`. Keep the subject
imperative and under ~72 chars.

## Adding a module / view / block

See [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md). Key rules: module frontend
code lives under `backend/src/modules/{name}/static/`; core/shared code stays in
the app `src/`; never use `require()` (ESM only); never re-register the AuditLog
model.

## Reporting bugs / requesting features

Use the GitHub issue templates. For **security vulnerabilities, do not open a
public issue** — follow [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](./LICENSE).
