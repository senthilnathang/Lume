# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | ✅ |
| < 2.0   | ❌ |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, use **GitHub's private vulnerability reporting**:
[Security → Report a vulnerability](https://github.com/senthilnathang/Lume/security/advisories/new),
or email the maintainers (see the repository profile).

Please include:
- A description of the vulnerability and its impact.
- Steps to reproduce (PoC if possible).
- Affected version/commit and component (backend module, admin panel, public site).

You can expect an initial acknowledgement within **72 hours** and a remediation
plan or status update within **7 days**. Please give us reasonable time to fix
and release a patch before any public disclosure.

## Scope & hardening notes

Lume ships with several built-in protections (see [`CLAUDE.md`](./CLAUDE.md) and
`docs/deployment/nestjs_security_hardening.md`):

- Global rate limiting (`ThrottlerGuard`) and security headers (CORS, CSP,
  X-Frame-Options).
- JWT auth with refresh tokens; password hashing via Prisma middleware.
- WebSocket tenant isolation (deny-by-default; `company_id`/`tenant_id` checks).
- Short-lived access tokens (`JWT_EXPIRES_IN=1h` + 30d rotating refresh);
  weak/`example` JWT secrets are rejected at boot (fail-closed in production).
- `STRICT_AUTH=true` flips `/api/*` to deny-by-default for credential-less
  requests (public paths stay allowlisted; default off for compatibility).
- Auth rate limiter counts failed attempts only (5/15min in prod); CORS `*`
  with credentials is rejected fail-closed; `/metrics` requires
  `METRICS_TOKEN` (or localhost) in production.
- Uploads enforce an explicit MIME allowlist with per-file size caps and
  reduced batch counts; scoped API keys via `requireScopes(...)` middleware.
- Refresh rotation with reuse detection (replayed tokens revoke the whole
  session family); refresh JWTs verified against the refresh secret with
  unique `jti` per rotation. `/api/docs` + `/api/openapi.json` support an
  opt-in `DOCS_TOKEN` bearer gate. JSON API responses carry a strict
  `Content-Security-Policy` (`default-src 'none'`, no framing); Swagger UI
  is excluded since it needs inline assets.
- Entity records enforce field-level policies (`EntityFieldPermission`),
  row visibility (private/company/public + OWD defaults), master-detail
  cascade deletes, and server-computed formulas (client values untrusted).
- Authorization merges role permissions, hierarchy inheritance (active
  descendants), group grants, and per-user permission sets with wildcard
  (`*`, `collection.*`, `*.action`) matching; role edits invalidate all
  permission caches; inactive roles deny everything.

### Operator responsibilities

- **Never commit real secrets.** `.env*` files are gitignored; use the
  `.env.example` templates and supply real values via your secret manager.
- **Rotate default/test credentials** before any non-local deployment (the seed
  admin and any sample passwords in test scripts are for local dev only).
- Run behind TLS; set strong `JWT_SECRET`, DB, and Redis passwords.
