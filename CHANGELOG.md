# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- OSS community-health files for public release: `LICENSE` (MIT), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue/PR templates, and Dependabot config.
- `docs/deployment/SEO_AUDIT.md` — prioritized SEO audit with live evidence and a
  remediation checklist.
- Site-wide SEO output on the public Nuxt site: `<html lang>`, canonical + `og:url`,
  `titleTemplate`, default Open Graph / Twitter Card tags, and WebSite + Organization
  JSON-LD on every route.

### Changed
- Backend sitemap now XML-escapes URLs and resolves a single `site_url` source;
  `robots.txt` hardened (Disallow `/admin` `/api` `/.env` `/.git` + `Sitemap:` line).
- Dynamic pages return real HTTP 404s instead of soft-404s; preview/unpublished/
  password-gated pages are `noindex`.

### Security
- Removed a hardcoded admin password literal from the e2e specs and the
  reset-admin script; admin password is now env-driven
  (`LUME_TEST_ADMIN_PASSWORD`). **Rotate that credential anywhere it was used.**
- Removed `frontend/lume-admin/test-credentials.mjs` (debug artifact).

## [2.0.1]

Security hardening and package upgrades (2026-09-01):
- `@opentelemetry/auto-instrumentations-node`: ^0.74.0 → ^0.80.0 (Prometheus exporter crash fix)
- `@grpc/grpc-js`: ^1.14.3 → ^1.14.4 (server crash vulnerability fix)
- `@opentelemetry/core`: ^2.8.0 → ^2.11.0 (unbounded memory allocation fix)
- `@opentelemetry/configuration`: ^0.218.0 → ^0.222.0
- `axios`: ^1.15.0 → ^1.20.0 (prototype pollution/auth bypass fixes)
- `vite`: ^5.4.0 → ^8.2.2 (security patches)
- `vitest`: ^2.1.0 → ^4.1.11 (critical vulnerability fixes)
- `nuxt`: ^3.10.0 → ^3.21.11 (critical CVE fixes)
- `@nuxt/devtools`: Added (was critical unauthenticated RCE CVE)
- `brace-expansion`: ^1.1.14 → ^5.0.9 (DoS fix)
- `xlsx`, `linkify-it`, `markdown-it`, `nanoid`: Updated to latest
- `sharp`, `ws`, `drizzle-orm`, `nodemailer`: Updated to latest
- Comprehensive `npm audit` across all 3 projects: 0 critical vulns (website), resolved 70+ moderate/high across backend/admin

### Added
- `docs/SINGLE_COMMAND_SETUP.md` — One-command application setup guide
- `README.md` security audit summary row in Tech Stack

### Changed
- Backend `@opentelemetry/*` packages upgraded to latest secure versions
- Admin panel `@vitejs/plugin-vue` and `@vueuse/*` updated for Vite 8 compatibility
- Website `@nuxt/jest-preset` and `@nuxt/test-utils` updated for Nuxt 3.21
- All `package.json` engine specifications aligned with Node 20.12+ requirements

## [2.0.0]

Production-ready v2.0: 23+ pluggable modules, hybrid Prisma + Drizzle ORM,
TipTap visual page builder, Vue 3 admin panel, Nuxt 3 SSR public site, rate
limiting, security hardening, OpenAPI/Swagger, WebSocket tenant isolation,
MariaDB standardization, and CI (setup-smoke + strict-zero code-quality gate).
See `docs/RELEASE_NOTES.md` and `docs/deployment/public_release_roadmap.md`.
