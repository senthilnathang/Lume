# Lume — cPanel Deployment Guide

This guide deploys a complete Lume stack (backend API + admin panel + public
website) on a shared/managed cPanel host. Two Node.js apps + one static SPA
under a single domain.

> **One-line version:** Backend → admin SPA → public Nuxt site. Each section
> below is an independent unit; you can deploy them in stages.

---

## 1. Stack overview

| # | Application | URL example | Type | cPanel App? | Startup file |
|---|------------|-----|------|-------------|--------------|
| 1 | Backend API | `ri-agri.in/backend` | Node.js (Express, hybrid Prisma + Drizzle) | Yes — Node.js App | `src/index.js` |
| 2 | Admin Panel | `ri-agri.in/frontend` | Vue 3 SPA (static, Vite build) | No — static HTML | n/a |
| 3 | Public Site | `ri-agri.in/demo` | Nuxt 3 SSR | Yes — Node.js App | `app.js` (auto-generated) |

**Deploy order: Backend → Admin → Public.** The backend must be reachable
before the admin SPA can authenticate or the Nuxt site can fetch page content.

A separate **NestJS migration target** exists at `backend/lume-nestjs/`. It is
not the production backend yet. If you're deploying the NestJS rewrite, see
[Section 6](#6-optional-deploy-the-nestjs-backend) at the end of this doc —
the rest of the guide deploys the current Express backend.

---

## 2. Prerequisites

- **Node.js 20.12.0+** in cPanel's Node.js Selector (the repo's `engines`
  field requires `>= 20.12.0` — Node 18 will fail to install some
  transitive dependencies). Pick the **highest LTS** the host offers in
  the 20.x or 22.x range.
- **MariaDB 10.6+** (or MySQL 8.0+). The project standardizes on
  MariaDB; cPanel labels its DB feature "MySQL Databases" but on most
  shared hosts the underlying engine is MariaDB. Either works — the
  schema is portable as of 2026-05-22.
- **cPanel Terminal** or SSH access (needed for `npm install` /
  `npx prisma db push` / `node src/scripts/setupDrizzle.js`).
- **Free disk: ~600 MB** (backend node_modules ~300 MB, Nuxt output
  ~80 MB, admin dist ~30 MB, headroom for uploads/logs).
- **SSL/HTTPS active** on the domain — strongly recommended. The
  Vue admin and Nuxt site both call the backend over the wire; CORS +
  cookie behavior is much smoother on a single HTTPS origin.
- The deploy ZIP produced by `./deploy-cpanel.sh` from a local checkout
  with Node 20 + pnpm 10 installed.

### Generate the deployment package

On your local machine:

```bash
cd /path/to/lume
./deploy-cpanel.sh
```

The script:
- Builds the Vue admin (`apps/web-lume`) to `dist/`.
- Builds the Nuxt public site (`apps/riagri-website`) to `.output/`.
- Generates `demo/app.js` — a small ESM-to-startup shim that
  Passenger (cPanel's app server) launches; it does
  `import('./.output/server/index.mjs')` with `NITRO_PORT` set from
  Passenger's `PORT` env.
- Produces `lume-deploy.zip` with:

```
lume-deploy.zip
├── backend/          # Express source + prisma/ + package.json
├── frontend/         # Built admin SPA (dist/ contents + sources for rebuild)
└── demo/             # Built Nuxt SSR (.output/ + sources + app.js shim)
```

If the build fails locally, see the **build prerequisites** note in
[Section 5.5](#55-rebuilding-the-public-site).

---

## 3. Step 1 — Create the database

In **cPanel → MySQL Databases**:

1. Create a database, e.g. `riagri_lume`.
2. Create a user, e.g. `riagri_admin`, with a strong password.
3. Add the user to the database with **ALL PRIVILEGES**.

cPanel automatically prefixes both names with your account name. If your
cPanel username is `riagri`, the actual identifiers become
`riagri_lume` / `riagri_admin`.

Note your connection details — you'll paste them into the backend `.env`
in step 2:

```
Database host: localhost
Database port: 3306
Database name: riagri_lume
Database user: riagri_admin
Database pass: (the password you chose)
```

> The cPanel UI says "MySQL". The actual engine is almost always MariaDB
> 10.x. The Prisma schema in this repo is designed for both and uses the
> `mysql://...` URL scheme (MariaDB's wire protocol identifier).

---

## 4. Step 2 — Deploy the backend (Node.js App #1)

### 4.1 Upload files

Unzip `lume-deploy.zip` locally, then upload the `backend/` folder to the
server (cPanel File Manager or SFTP):

```
~/ri-agri.in/backend/
├── src/             # Application source
├── prisma/          # schema.prisma
├── package.json
├── package-lock.json
├── uploads/         # (will be created if missing)
└── logs/            # (will be created if missing)
```

### 4.2 Register the Node.js app

**cPanel → Setup Node.js App → Create Application**:

| Field | Value |
|-------|-------|
| Node.js version | **20.x** (or latest LTS available; not 18) |
| Application mode | `Production` |
| Application root | `ri-agri.in/backend` |
| Application URL | `ri-agri.in/backend` |
| Application startup file | `src/index.js` |

Click **Create**. The screen now shows a virtual-environment activation
command that looks like:

```bash
source /home/<cpanel-user>/nodevenv/ri-agri.in/backend/20/bin/activate
```

Copy this — every backend command from here on assumes the venv is
active. Each Node.js app gets its own venv.

### 4.3 Install dependencies and generate the Prisma client

In **cPanel → Terminal** (or SSH):

```bash
source /home/<cpanel-user>/nodevenv/ri-agri.in/backend/20/bin/activate
cd ~/ri-agri.in/backend
npm install --omit=dev       # production deps only; `--production` is deprecated
npx prisma generate
```

> If `npm install` fails on the `@oxc-parser/binding-linux-x64-gnu`
> native binding (an issue with optional-deps installation on some
> hosts), retry with `npm install --omit=dev --include=optional`.

### 4.4 Configure `.env`

Create `~/ri-agri.in/backend/.env`:

```env
# Server
NODE_ENV=production
PORT=3000                          # cPanel/Passenger overrides this anyway
API_VERSION=v1

# Domain
BACKEND_URL=https://ri-agri.in/backend
FRONTEND_URL=https://ri-agri.in/frontend
PUBLIC_WEBSITE_URL=https://ri-agri.in/demo

# Database (from Step 1)
DATABASE_URL="mysql://riagri_admin:YOUR_PASSWORD@localhost:3306/riagri_lume"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=riagri_lume
DB_USER=riagri_admin
DB_PASSWORD=YOUR_PASSWORD
DB_POOL_SIZE=10
DB_LOGGING=false                   # noisy in prod logs

# Performance (see docs/ARCHITECTURE.md → Performance Considerations)
LOG_LEVEL=info
OTEL_TRACES_SAMPLER_ARG=0.1        # 10% sample; raise temporarily when debugging

# Secrets — generate with: openssl rand -hex 32
JWT_SECRET=GENERATE_64_CHAR_HEX
JWT_REFRESH_SECRET=GENERATE_ANOTHER_64_CHAR_HEX
SESSION_SECRET=GENERATE_ANOTHER_64_CHAR_HEX
JWT_EXPIRES_IN=7d

# CORS (exact match — no trailing slash)
CORS_ORIGIN=https://ri-agri.in

# File uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760             # 10 MB

# Email (your SMTP provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@ri-agri.in
```

> **Do not set `PORT` to a fixed value and expect it to be honored.**
> Passenger (cPanel's app server) injects `PORT` into the env when it
> launches your app. The `src/index.js` entry point uses `process.env.PORT`,
> so you don't need to manage ports yourself. The line above is left as
> a documented default for local testing.

### 4.5 Initialize the schema (critical — both ORMs)

Lume is a hybrid ORM: 11 core tables are owned by Prisma, **96 module
tables are owned by Drizzle**. `prisma db push` alone leaves the
Drizzle tables un-created and the app crashes at runtime with
`ER_NO_SUCH_TABLE`. The full sequence is:

```bash
cd ~/ri-agri.in/backend

# 1. Create Prisma core tables (11 tables).
npx prisma db push --accept-data-loss

# 2. Create Drizzle module tables (96 tables across 25 modules).
node src/scripts/setupDrizzle.js

# 3. Create the admin user and seed reference data.
node src/scripts/createAdmin.js
node src/scripts/seedData.js
```

After this you have:
- 6 roles (`super_admin`, `admin`, `manager`, `staff`, `user`, `guest`)
- 164+ permissions across 25 modules
- A default super-admin login: **`admin@lume.dev` / `Admin@Lume!1`**
- 10 default settings, 3 sample messages, etc.

> **Change the default admin password immediately after first login.**

> ⚠️ Never run `prisma db push` against a live database that has user
> data — Prisma sees Drizzle's tables as "drift" and will drop them if
> you accept `--accept-data-loss`. On a brand-new empty database this is
> fine; on an existing one, it is catastrophic. See the memory
> `prisma-db-push-destroys-drizzle` in the repo's own notes.

### 4.6 Start the app

**cPanel → Setup Node.js App** → backend row → **Restart**.

Logs land in two places worth knowing:
- `~/ri-agri.in/backend/logs/` (the app's structured logs)
- `~/logs/passenger.log` or the per-app Passenger log shown in the
  cPanel "Setup Node.js App" panel ("Errors" link).

### 4.7 Verify

```bash
curl -s https://ri-agri.in/backend/health | head -c 200
```

Expected — JSON with `success: true` and `framework: "Lume"`:

```json
{"success":true,"message":"Lume Framework is running","timestamp":"...","version":"2.0.0","framework":"Lume",...}
```

> The health endpoint lives at `/health` (top-level), **not**
> `/api/health`. The doc previously said `/api/base/health` — that was
> wrong; ignore old references.

Then the login contract:

```bash
curl -sS -X POST https://ri-agri.in/backend/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"Admin@Lume!1"}'
```

You should get `success: true` and `data.accessToken` (plus a `data.token`
alias for v2.x compat).

---

## 5. Step 3 — Deploy the admin panel (static files, no Node.js app)

The admin panel is a pre-built Vite SPA. Plain HTML + JS + CSS — no
server runtime needed.

### 5.1 Upload the build

Upload the **contents** of `frontend/dist/` (not the `dist/` directory
itself) to `~/ri-agri.in/frontend/`:

```
~/ri-agri.in/frontend/
├── index.html
├── assets/             # hashed JS/CSS bundles
└── .htaccess           # SPA rewrite rules (HIDDEN FILE)
```

In cPanel File Manager, enable **Settings → Show Hidden Files** to
confirm `.htaccess` made it across — it's the most common upload-miss
that causes 404-on-refresh.

### 5.2 Required `.htaccess`

```apache
RewriteEngine On
RewriteBase /frontend/

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -l [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteRule ^ /frontend/index.html [L]
```

### 5.3 The API URL is baked at build time

The Vite build inlines `import.meta.env.VITE_API_URL` into the JS bundle.
If the SPA can't reach the API, your build had the wrong URL. Fix locally:

```bash
# In apps/web-lume/
cat > .env.production <<EOF
VITE_API_URL=https://ri-agri.in/backend/api
VITE_PUBLIC_SITE_URL=https://ri-agri.in/demo
EOF
npm run build
# Re-upload dist/* to the server
```

> **Don't try to rebuild on a cPanel host.** The admin panel's build
> requires the full monorepo (root `package.json`, `pnpm-workspace.yaml`,
> `packages/@lume/*` configs). Shared hosts rarely have pnpm and never
> have the workspace context.

### 5.4 Verify

Visit `https://ri-agri.in/frontend` and log in:

| Field | Value |
|-------|-------|
| Email | `admin@lume.dev` |
| Password | `Admin@Lume!1` |

**Change the password immediately**, then create real users from the
admin UI.

---

## 6. Step 4 — Deploy the Nuxt public site (Node.js App #2)

The public website is a Nuxt 3 SSR app served by Nitro. The deploy ZIP
contains the pre-built `.output/` and a generated `app.js` shim that
launches it under Passenger.

### 6.1 Upload files

Upload `demo/` to `~/ri-agri.in/demo/`:

```
~/ri-agri.in/demo/
├── .output/
│   ├── server/index.mjs    # Nitro entry (the real app)
│   └── public/             # static assets — favicons, robots, etc.
├── app.js                  # cPanel startup shim (see below)
├── package.json
├── nuxt.config.ts          # source — needed only for rebuilds
└── pages/, components/, composables/, layouts/, assets/   # source
```

### 6.2 What `app.js` does (the cPanel shim)

cPanel's Passenger app server launches `app.js` as the startup file. The
shim is tiny:

```js
// Lume Public Site — Nuxt 3 SSR Entry Point for cPanel
process.env.NITRO_PORT = process.env.PORT || 3007;
process.env.NITRO_HOST = '0.0.0.0';
import('./.output/server/index.mjs');
```

**Why a shim is needed:** Passenger picks a port for you and exports it
via `PORT`. Nuxt/Nitro reads `NITRO_PORT` (not `PORT`) by default —
the shim bridges the two. `0.0.0.0` ensures Nitro binds an interface
Passenger can reverse-proxy to.

If your cPanel host runs a newer Passenger (≥ 6) and supports ESM
startup files directly, you can skip `app.js` and use `.output/server/
index.mjs` as the startup file directly — but the shim works everywhere
and lets you control `NITRO_PORT`/`NITRO_HOST`, so it's the recommended
path.

### 6.3 Register the Node.js app

**cPanel → Setup Node.js App → Create Application**:

| Field | Value |
|-------|-------|
| Node.js version | **20.x** (Nuxt 3 requires ≥ 18.x; 20 LTS recommended) |
| Application mode | `Production` |
| Application root | `ri-agri.in/demo` |
| Application URL | `ri-agri.in/demo` |
| Application startup file | `app.js` |

Click **Create** and copy the venv activation command.

### 6.4 Configure `.env`

Create `~/ri-agri.in/demo/.env`:

```env
# Where the public Nuxt site fetches data from (the Lume backend API)
NUXT_PUBLIC_API_URL=https://ri-agri.in/backend
NUXT_PUBLIC_API_BASE=https://ri-agri.in/backend/api/website/public

# Site metadata (used by Nuxt's <head> + structured data)
NUXT_PUBLIC_SITE_NAME=Ri-Agri
NUXT_PUBLIC_SITE_TITLE=Ri-Agri — Sustainable Farming
NUXT_PUBLIC_SITE_DESCRIPTION=Welcome to Ri-Agri
NUXT_PUBLIC_SITE_URL=https://ri-agri.in/demo
NUXT_PUBLIC_THEME_COLOR=#3B82F6

# Optional: only set NITRO_PORT yourself if you're NOT using the app.js
# shim — Passenger injects PORT, the shim copies it to NITRO_PORT.
```

> **Important:** the Nuxt site's `nuxt.config.ts` proxies
> `/robots.txt` and `/sitemap.xml` to the backend's
> `/api/website/public/robots.txt` and `/api/website/public/sitemap.xml`.
> If `NUXT_PUBLIC_API_URL` is wrong, you'll get 404s on those two
> paths even when the rest of the site loads. Verify with:
>
> ```bash
> curl -I https://ri-agri.in/demo/robots.txt
> curl -I https://ri-agri.in/demo/sitemap.xml
> ```

### 6.5 Rebuilding the public site (optional)

If you uploaded the `.output/` from the deploy ZIP and it works, **don't
install dependencies** — Nuxt SSR runs entirely from `.output/server/`
with no node_modules needed. `npm install` will pull ~700 MB and may
trip the @oxc-parser native-binding issue on Linux.

Only run the rebuild path if you've changed source files on the server:

```bash
source /home/<cpanel-user>/nodevenv/ri-agri.in/demo/20/bin/activate
cd ~/ri-agri.in/demo
npm install --include=optional   # native bindings need optional deps
npm run build                    # writes .output/
# Restart the Node.js app
```

Build prerequisites that often bite on shared hosts:
- **Node 20+** in the venv (Nuxt 3 + Nitro require modern Node).
- **Network access from the server** to npmjs.org (some hosts firewall
  outbound npm; you may need to vendor `node_modules/` from a local
  build).
- **glibc 2.31+** on the runner host for the `@oxc-parser` native
  binding. Most modern shared hosts (CloudLinux 8/9, AlmaLinux 9) are
  fine; older CentOS 7 hosts will fail to load the binding.

### 6.6 Start and verify

**cPanel → Setup Node.js App** → demo app → **Restart**.

```bash
curl -sI https://ri-agri.in/demo | head -3
curl -s  https://ri-agri.in/demo | head -c 400
```

You should see `HTTP/2 200`, `content-type: text/html`, and the home
page HTML. The first request after a cold start may take 2–4 seconds
while Nitro warms; subsequent requests should be < 200 ms.

### 6.7 Nuxt-specific operational tips

- **Memory footprint:** A Nuxt SSR worker typically uses 80–150 MB
  RES. cPanel hosts often cap Node.js app memory at 256–512 MB per
  app — Nuxt fits, but watch for memory-limit kills in
  `~/logs/passenger.log` if you see frequent restarts.
- **Restart on .env change:** Passenger does NOT auto-reload env vars.
  Every time you edit `~/ri-agri.in/demo/.env` you must Restart the
  app from the cPanel Node.js panel.
- **Static assets are served by Nitro**, not by Apache — they go
  through your Node process. If you have heavy image traffic, put
  Cloudflare or another CDN in front; serving 2 MB images through
  Passenger + Nitro is wasteful.
- **Tailwind v4:** the public site's `tailwind.config.ts` / postcss
  setup uses `@nuxtjs/tailwindcss` and is independent of the admin
  panel's setup. If you see "Cannot find @tailwindcss/postcss" during
  a server-side rebuild, the rebuild lacks the dev dependencies — run
  `npm install` (not `--omit=dev`) before `npm run build`.

---

## 7. Updating an existing deployment

### Backend-only changes

```bash
# Local
./deploy-cpanel.sh --skip-admin --skip-public
# Upload new backend/* to the server, then on the server:
source /home/<user>/nodevenv/ri-agri.in/backend/20/bin/activate
cd ~/ri-agri.in/backend
npm install --omit=dev
npx prisma generate
npx prisma db push --accept-data-loss   # only if schema changed
node src/scripts/setupDrizzle.js        # only if Drizzle schemas changed
# Restart the Node.js app
```

### Admin panel only

```bash
# Local
cd apps/web-lume && npm run build
# Upload dist/* to ~/ri-agri.in/frontend/
# No restart needed — static files apply on the next request.
```

### Public site only

```bash
# Local
./deploy-cpanel.sh --skip-admin --skip-backend
# Upload new demo/* (or just .output/* if no app.js/.env changes)
# Restart the Node.js app
```

---

## 8. Post-deployment checklist

- [ ] `GET /health` returns 200 with `success: true`
- [ ] `POST /api/users/login` with default admin returns an `accessToken`
- [ ] Default admin password changed
- [ ] Admin panel loads at `/frontend` and survives a hard refresh
- [ ] Public site loads at `/demo` and renders SSR HTML (view source
      should show real content, not a JS shell)
- [ ] `/demo/robots.txt` and `/demo/sitemap.xml` proxy back to the
      backend successfully
- [ ] Navigation menus on the public site (desktop dropdowns + mobile
      accordion) populate from the backend
- [ ] Image uploads work in the admin panel (`uploads/` is writable)
- [ ] HTTPS/SSL active on the apex + any subdomains
- [ ] CORS errors absent from the browser console on both apps

---

## 9. Troubleshooting

### Backend returns 502 / 503

- The Node.js app isn't running. Check **cPanel → Setup Node.js App**.
- The app crashed at boot. Inspect `~/ri-agri.in/backend/logs/error.log`
  and the per-app Passenger log.
- Run manually to surface the error directly:
  ```bash
  source /home/<user>/nodevenv/ri-agri.in/backend/20/bin/activate
  cd ~/ri-agri.in/backend
  node src/index.js
  ```

### `ER_NO_SUCH_TABLE` errors at runtime

You skipped `node src/scripts/setupDrizzle.js` after `prisma db push`.
Re-run it — it's idempotent (`CREATE TABLE IF NOT EXISTS`), so safe.

### Admin panel shows a blank page

- `.htaccess` is missing or wasn't uploaded (toggle "Show Hidden Files"
  in File Manager).
- The Vite build was made with the wrong `VITE_API_URL`. Open browser
  devtools → Network — if XHR requests are going to the wrong host,
  rebuild with the right `.env.production`.

### Admin panel 404 on page refresh

`.htaccess` exists but `RewriteBase` is wrong. Should be `/frontend/`
matching your URL path exactly.

### Public site shows "Internal Server Error"

- `app.js` is missing or `.output/` is missing.
- `NUXT_PUBLIC_API_URL` is wrong → Nuxt can't fetch page content during
  SSR. Confirm with `curl -s https://ri-agri.in/demo | head -c 400` and
  look for a long stack trace in the Passenger log.
- The Nuxt app was built against a different Node major version. Rebuild
  on the same Node 20.x as the venv.

### CORS errors in the browser console

- `CORS_ORIGIN` in `backend/.env` must exactly match the browser's
  origin: `https://ri-agri.in` (no trailing slash, correct scheme).
- Multiple origins? Comma-separate: `CORS_ORIGIN=https://ri-agri.in,https://www.ri-agri.in`.
- Restart the backend Node.js app after changing `.env`. Passenger
  doesn't pick up env changes automatically.

### Database connection refused

- Test from the cPanel Terminal:
  `mysql -u riagri_admin -p -h localhost riagri_lume`
- Remember cPanel's username prefix on both db name and user name.
- The DB engine is MariaDB on most cPanel hosts even though the menu
  says "MySQL" — the wire protocol is identical, no special handling
  needed.

### "Permission denied" on uploads

`chmod 755 ~/ri-agri.in/backend/uploads` (and any nested folders).
Files inside should be `644`.

### Node.js app won't start

- Startup file path is case-sensitive: `src/index.js` (not
  `src/Index.js`).
- The venv Node version is < 20 — change it in the cPanel Node.js App
  config.
- `@opentelemetry/resources` or another transitive dep is missing
  because `npm install --omit=dev` skipped optional deps. Re-install
  with `npm install --omit=dev --include=optional`.

---

## 10. Optional — deploy the NestJS backend

The repo carries a migration target at `backend/lume-nestjs/`. It's not
the production backend yet — the Express backend in `backend/src/` is
what the deploy script bundles and what this guide assumes. Use the
NestJS path only if you've intentionally chosen to deploy it.

### 10.1 Build locally

```bash
cd backend/lume-nestjs
npm install
npm run build       # writes dist/
```

The output is `backend/lume-nestjs/dist/main.js`.

### 10.2 cPanel Node.js App

| Field | Value |
|-------|-------|
| Node.js version | 20.x |
| Application mode | `Production` |
| Application root | `ri-agri.in/backend-nest` |
| Application URL | `ri-agri.in/backend-nest` |
| Application startup file | `dist/main.js` |

### 10.3 Upload only what runs

NestJS production deployment needs:

```
~/ri-agri.in/backend-nest/
├── dist/                # compiled output (main.js + module files)
├── prisma/              # schema + migrations
├── package.json
├── package-lock.json
├── .env                 # same env shape as the Express backend
└── node_modules/        # OR install on the server
```

If the server has Node 20 + reliable npm access, upload everything
except `node_modules/` and run:

```bash
source /home/<user>/nodevenv/ri-agri.in/backend-nest/20/bin/activate
cd ~/ri-agri.in/backend-nest
npm install --omit=dev
npx prisma generate
```

Otherwise vendor `node_modules/` from a local build with the same Node
version and zip it alongside.

### 10.4 Database initialization

Same hybrid-ORM setup as the Express path — Prisma push + Drizzle
table creation + seeds. The NestJS backend uses the same schema files
in `backend/prisma/schema.prisma` and the same Drizzle module schemas,
so the setup scripts at `backend/src/scripts/*.js` apply unchanged.

> If you're running both backends in parallel during migration, point
> them at **different databases**. Two backends owning the same DB will
> race on Drizzle table creation and schema drift detection.

### 10.5 Differences from the Express path worth knowing

- Port: NestJS reads `process.env.PORT` natively — no shim needed.
- Logging: NestJS uses its own logger; pipe to file or rely on
  Passenger's stdout capture (`~/logs/passenger.log`).
- Health endpoint: `/health` (same as Express). The two backends are
  contract-compatible so the admin SPA and Nuxt site don't need
  changes when you switch.
- Module loader: the NestJS target uses dynamic module registration —
  see `backend/lume-nestjs/docs/` for the per-module deployment story
  if any modules ship with their own assets.

---

## Appendix — Server directory layout (final)

```
~/ri-agri.in/
├── backend/                    # Node.js App #1 (Express, src/index.js)
│   ├── src/                    # — source
│   ├── prisma/                 # — schema.prisma
│   ├── package.json
│   ├── .env                    # — secrets + DB
│   ├── uploads/                # — chmod 755
│   └── logs/                   # — app logs
│
├── frontend/                   # Static files (no Node.js app)
│   ├── index.html
│   ├── assets/                 # hashed JS/CSS
│   └── .htaccess               # SPA rewrites
│
└── demo/                       # Node.js App #2 (Nuxt, app.js)
    ├── .output/                # — pre-built Nitro server
    │   ├── server/index.mjs
    │   └── public/
    ├── app.js                  # — Passenger shim
    ├── package.json
    └── .env                    # — NUXT_PUBLIC_* config
```
