# Lume API Reference

**Base URL (dev):** `http://localhost:3000`
**Interactive docs:** Swagger UI at [`/api/docs`](http://localhost:3000/api/docs) · raw spec at [`/api/openapi.json`](http://localhost:3000/api/openapi.json)

> The OpenAPI document is a **hand-curated baseline** (the platform endpoints below)
> plus module routes that opt in via `@swagger` JSDoc. The interactive Swagger UI
> is the always-current source of truth; this file documents the stable contract.

## Conventions

**Response envelope.** Every endpoint returns:
```jsonc
{ "success": true,  "data": <payload>,  "message": "..." }   // success
{ "success": false, "error": "...",      "code": 123 }        // error
```
The admin-panel axios interceptor unwraps `{success, data}` → returns `data` directly
(so frontend handlers don't re-check `result.success`).

**Auth.** Obtain a JWT via `POST /api/users/login`, then send it as a bearer token:
```
Authorization: Bearer <data.accessToken>
```
The login response returns both `data.token` and `data.accessToken` (alias for SDK
compatibility; `accessToken` becomes canonical in v3). Refresh via `POST /api/auth/refresh`
with `{ "refreshToken": "..." }`.

## Platform endpoints (curated)

### `GET /health`
Liveness + observability metrics. No auth. `Cache-Control: public, max-age=5`.
Returns a `HealthResponse` (status, uptime, etc.).

### `GET /api/modules`
List all installed modules. No auth. Each module includes:
- `actions` — valid lifecycle ops right now: `['install']`, `['uninstall','upgrade']`, `['install','uninstall']` (errored), or `[]`. Each maps to `POST /api/modules/:name/<action>`.
- `deps_resolved` — boolean; `true` only when every non-`base` dependency is installed.

### `POST /api/users/login`
Exchange credentials for a JWT. No auth. (Note: login lives under the **user** module — it is `/api/users/login`, **not** `/api/auth/login`.)
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@lume.dev","password":"<password>"}'
# → { "success": true, "data": { "user": {...}, "token": "...", "accessToken": "..." } }
```

## Website (CMS) public endpoints

No auth; used by the Nuxt public site.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/website/public/pages/:slug` | Page content + SEO fields (meta/OG/canonical/noindex) |
| GET | `/api/website/public/menus/:location` | Menu tree for a location (e.g. `header`) with nested `children` |
| GET | `/api/website/public/settings` | Site settings (key/value) |
| GET | `/api/website/public/categories/:slug` · `/tags/:slug` | Taxonomy archives |
| GET | `/api/website/public/sitemap.xml` | XML sitemap (published, non-noindex pages) |
| GET | `/api/website/public/robots.txt` | robots.txt (hardened default + `Sitemap:`) |

Authenticated CMS management (admin): `POST/PUT/DELETE /api/website/pages`, `/api/website/menus/:id/reorder`, etc.

## Discovering the full API

The platform exposes 24 modules' routes (auth, users, roles, permissions, activities,
documents, donations, team, messages, media, editor, website, webhooks, …). To explore:

1. Open **Swagger UI** at `/api/docs` (in dev, or `OPENAPI_ENABLED=true` in prod) and **Authorize** with the JWT body from `/api/users/login`.
2. Module routes are documented inline via `@swagger` JSDoc in `backend/src/modules/*/api/*.js` and `*.routes.js`.

To add your module's endpoints to this spec, annotate the route:
```js
/**
 * @swagger
 * /api/activities:
 *   get:
 *     tags: [Activities]
 *     summary: List activities
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Array of activities } }
 */
router.get('/', authenticate, async (req, res) => { ... });
```
