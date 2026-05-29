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

## [2.0.0]

Production-ready v2.0: 23+ pluggable modules, hybrid Prisma + Drizzle ORM,
TipTap visual page builder, Vue 3 admin panel, Nuxt 3 SSR public site, rate
limiting, security hardening, OpenAPI/Swagger, WebSocket tenant isolation,
MariaDB standardization, and CI (setup-smoke + strict-zero code-quality gate).
See `docs/RELEASE_NOTES.md` and `docs/deployment/public_release_roadmap.md`.
