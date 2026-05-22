#!/bin/bash

# LUME CPANEL Deployment Script
# Domain: ri-agri.in
#   /demo     — Public website (Nuxt 3 SSR)
#   /frontend — Admin panel (Vue 3 SPA)
#   /backend  — Backend API (Express.js)
#
# Produces: lume-deploy.zip with demo/, frontend/, backend/, README.md
# Usage: ./deploy-cpanel.sh [--skip-admin] [--skip-public] [--skip-backend]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
ADMIN_DIR="$SCRIPT_DIR/frontend/apps/web-lume"
PUBLIC_DIR="$SCRIPT_DIR/frontend/apps/riagri-website"
DEPLOY_DIR="$SCRIPT_DIR/cpanel-deploy"

SKIP_ADMIN=false
SKIP_PUBLIC=false
SKIP_BACKEND=false

for arg in "$@"; do
    case $arg in
        --skip-admin) SKIP_ADMIN=true ;;
        --skip-public) SKIP_PUBLIC=true ;;
        --skip-backend) SKIP_BACKEND=true ;;
    esac
done

print_status() { echo -e "${YELLOW}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     LUME CPANEL DEPLOYMENT           ║"
echo "║     Domain: ri-agri.in               ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Clean previous deploy
print_status "Cleaning previous deploy..."
rm -rf "$DEPLOY_DIR"
rm -f "$SCRIPT_DIR/lume-deploy.zip"
mkdir -p "$DEPLOY_DIR/frontend"
mkdir -p "$DEPLOY_DIR/demo"
mkdir -p "$DEPLOY_DIR/backend"

# ─────────────────────────────────────────
# 1. BACKEND API (Express.js)
#    → ri-agri.in/backend
# ─────────────────────────────────────────
if [ "$SKIP_BACKEND" = false ]; then
    print_section "Backend API → ri-agri.in/backend"

    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    print_status "Preparing backend..."
    cd "$BACKEND_DIR"

    # Source code
    cp -r src "$DEPLOY_DIR/backend/"
    cp package.json "$DEPLOY_DIR/backend/"
    cp package-lock.json "$DEPLOY_DIR/backend/" 2>/dev/null || true

    # Prisma schema
    if [ -d "prisma" ]; then
        cp -r prisma "$DEPLOY_DIR/backend/"
    fi

    # Environment
    if [ -f ".env.production" ]; then
        cp .env.production "$DEPLOY_DIR/backend/.env"
    elif [ -f ".env.example" ]; then
        cp .env.example "$DEPLOY_DIR/backend/.env.example"
    fi

    # Directories
    mkdir -p "$DEPLOY_DIR/backend/uploads"
    mkdir -p "$DEPLOY_DIR/backend/logs"

    print_success "Backend prepared"
else
    print_status "Skipping backend (--skip-backend)"
fi

# ─────────────────────────────────────────
# 2. ADMIN PANEL (Vue 3 SPA)
#    → ri-agri.in/frontend
# ─────────────────────────────────────────
if [ "$SKIP_ADMIN" = false ]; then
    print_section "Admin Panel → ri-agri.in/frontend"

    if [ ! -d "$ADMIN_DIR" ]; then
        print_error "Admin panel directory not found: $ADMIN_DIR"
        exit 1
    fi

    print_status "Building admin panel..."
    cd "$ADMIN_DIR"

    if command_exists pnpm; then
        pnpm build
    else
        npm run build
    fi

    if [ ! -d "dist" ]; then
        print_error "Admin build output not found (dist/ directory missing)"
        exit 1
    fi

    # Source code & config
    print_status "Staging admin panel (code + dist)..."
    cp package.json "$DEPLOY_DIR/frontend/"
    cp package-lock.json "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp index.html "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp vite.config.ts "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp vite.config.mts "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp tsconfig.json "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp tsconfig.app.json "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp tsconfig.node.json "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp tailwind.config.js "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp postcss.config.js "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp .env "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp .env.production "$DEPLOY_DIR/frontend/" 2>/dev/null || true
    cp -r src "$DEPLOY_DIR/frontend/"
    cp -r public "$DEPLOY_DIR/frontend/" 2>/dev/null || true

    # Build output
    cp -r dist "$DEPLOY_DIR/frontend/"

    # .htaccess for SPA routing (goes inside dist/)
    cat > "$DEPLOY_DIR/frontend/dist/.htaccess" << 'HTACCESS'
RewriteEngine On
RewriteBase /frontend/

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
</IfModule>

<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresDefault "access plus 2 days"
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
</IfModule>

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -l [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteRule ^ /frontend/index.html [L]
HTACCESS

    print_success "Admin panel built and staged"
else
    print_status "Skipping admin panel (--skip-admin)"
fi

# ─────────────────────────────────────────
# 3. PUBLIC SITE (Nuxt 3 SSR)
#    → ri-agri.in/demo
# ─────────────────────────────────────────
if [ "$SKIP_PUBLIC" = false ]; then
    print_section "Public Site → ri-agri.in/demo"

    if [ ! -d "$PUBLIC_DIR" ]; then
        print_error "Public site directory not found: $PUBLIC_DIR"
        exit 1
    fi

    print_status "Building public site..."
    cd "$PUBLIC_DIR"

    if command_exists pnpm; then
        pnpm build
    else
        npm run build
    fi

    # Source code & config
    print_status "Staging public site (code + build)..."
    cp package.json "$DEPLOY_DIR/demo/"
    cp package-lock.json "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp nuxt.config.ts "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp tsconfig.json "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp tailwind.config.js "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp .env "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp .env.production "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp app.vue "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r pages "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r components "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r composables "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r layouts "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r plugins "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r server "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r assets "$DEPLOY_DIR/demo/" 2>/dev/null || true
    cp -r public "$DEPLOY_DIR/demo/" 2>/dev/null || true

    # Build output
    if [ -d ".output" ]; then
        cp -r .output "$DEPLOY_DIR/demo/"
    fi

    if [ ! -d "$DEPLOY_DIR/demo/.output" ]; then
        print_error "Nuxt build output not found (.output/ directory missing)"
        exit 1
    fi

    # Node.js entry point for cPanel
    cat > "$DEPLOY_DIR/demo/app.js" << 'APPJS'
// Lume Public Site - Nuxt 3 SSR Entry Point for cPanel
process.env.NITRO_PORT = process.env.PORT || 3007;
process.env.NITRO_HOST = '0.0.0.0';
import('./.output/server/index.mjs');
APPJS

    print_success "Public site built and staged"
else
    print_status "Skipping public site (--skip-public)"
fi

# ─────────────────────────────────────────
# 4. GENERATE README.md
# ─────────────────────────────────────────
print_section "Generating README.md"

cat > "$DEPLOY_DIR/README.md" << 'README'
# Lume — cPanel Deployment (quick-start)

Domain: **ri-agri.in**

| Path | App | Runtime | Startup |
|------|-----|---------|---------|
| `ri-agri.in/backend` | Backend API | Node.js (Express) | `src/index.js` |
| `ri-agri.in/frontend` | Admin Panel | Static SPA | (none — static) |
| `ri-agri.in/demo` | Public Site | Nuxt 3 SSR | `app.js` |

> **Canonical guide:** the full, up-to-date instructions are in
> `docs/CPANEL_DEPLOYMENT.md` in the source repository. This README is a
> quick-start; if you hit anything subtle, defer to that doc.

---

## Prerequisites

- cPanel with **Node.js Selector**, version **20.x** (the repo's
  `engines` field requires `>= 20.12.0`; Node 18 fails on transitive
  native deps).
- A database (MariaDB on most cPanel hosts; cPanel labels the menu
  "MySQL Databases" regardless of the underlying engine).
- SSH or cPanel Terminal.
- SSL/HTTPS active on the domain.

---

## 1. Database

In **cPanel → MySQL Databases**, create:
- Database (e.g. `riagri_lume`)
- User (e.g. `riagri_admin`) with a strong password
- Add the user to the database with **ALL PRIVILEGES**

cPanel auto-prefixes both names with your account name.

---

## 2. Backend (Node.js App)

```bash
# After uploading backend/ to ~/ri-agri.in/backend/ and creating the
# Node.js App in cPanel (Node 20, startup file `src/index.js`):
source /home/<user>/nodevenv/ri-agri.in/backend/20/bin/activate
cd ~/ri-agri.in/backend
npm install --omit=dev
npx prisma generate
```

### Create `.env`

```env
NODE_ENV=production
DATABASE_URL="mysql://riagri_admin:PASSWORD@localhost:3306/riagri_lume"
DB_HOST=localhost
DB_PORT=3306
DB_NAME=riagri_lume
DB_USER=riagri_admin
DB_PASSWORD=PASSWORD
DB_POOL_SIZE=10
DB_LOGGING=false

LOG_LEVEL=info
OTEL_TRACES_SAMPLER_ARG=0.1

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://ri-agri.in
FRONTEND_URL=https://ri-agri.in/frontend
PUBLIC_WEBSITE_URL=https://ri-agri.in/demo

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### Initialize the schema (BOTH ORMs — critical)

Lume is hybrid Prisma + Drizzle. Skipping `setupDrizzle.js` leaves 96
module tables un-created — the app crashes at runtime with
`ER_NO_SUCH_TABLE`.

```bash
npx prisma db push --accept-data-loss
node src/scripts/setupDrizzle.js
node src/scripts/createAdmin.js
node src/scripts/seedData.js
```

### Restart and verify

```bash
# In cPanel → Setup Node.js App → backend → Restart, then:
curl -s https://ri-agri.in/backend/health | head -c 200
# Expected JSON: success:true, framework:"Lume"
```

Default super-admin: `admin@lume.dev` / `Admin@Lume!1` — **change it
immediately after first login.**

---

## 3. Admin Panel (static)

Upload `frontend/dist/*` to `~/ri-agri.in/frontend/`. Include the hidden
`.htaccess` (toggle "Show Hidden Files" in File Manager).

`VITE_API_URL` is baked at build time. If the SPA can't reach the API,
rebuild locally with the right `.env.production`:

```env
VITE_API_URL=https://ri-agri.in/backend/api
VITE_PUBLIC_SITE_URL=https://ri-agri.in/demo
```

---

## 4. Public Site (Nuxt 3 SSR — Node.js App)

```bash
# After uploading demo/ to ~/ri-agri.in/demo/ and creating the Node.js
# App in cPanel (Node 20, startup file `app.js`):
```

### Create `.env`

```env
NUXT_PUBLIC_API_URL=https://ri-agri.in/backend
NUXT_PUBLIC_API_BASE=https://ri-agri.in/backend/api/website/public
NUXT_PUBLIC_SITE_NAME=Ri-Agri
NUXT_PUBLIC_SITE_TITLE=Ri-Agri
NUXT_PUBLIC_SITE_DESCRIPTION=Welcome to Ri-Agri
NUXT_PUBLIC_SITE_URL=https://ri-agri.in/demo
NUXT_PUBLIC_THEME_COLOR=#3B82F6
```

### How `app.js` works

`app.js` is auto-generated by this deploy script. It does:

```js
process.env.NITRO_PORT = process.env.PORT || 3007;
process.env.NITRO_HOST = '0.0.0.0';
import('./.output/server/index.mjs');
```

Passenger (cPanel's app server) injects `PORT`; the shim copies it to
`NITRO_PORT` (Nitro doesn't read `PORT` directly).

### Don't `npm install` unless you're rebuilding

`.output/` is self-contained — Nuxt SSR runs without `node_modules`.
Only run `npm install` if you change source files on the server.

### Verify

```bash
curl -sI https://ri-agri.in/demo | head -3
# HTTP/2 200, content-type: text/html

curl -I https://ri-agri.in/demo/robots.txt
curl -I https://ri-agri.in/demo/sitemap.xml
# Both should 200; they proxy to backend /api/website/public/*
```

---

## Folder layout on server

```
~/ri-agri.in/
├── backend/              # Node.js App: Express, src/index.js
│   ├── src/, prisma/, .env, uploads/, logs/
├── frontend/             # Static SPA (no Node.js app)
│   ├── index.html, assets/, .htaccess
└── demo/                 # Node.js App: Nuxt 3 SSR, app.js
    ├── .output/, app.js, .env
```

---

## Troubleshooting

### Backend 502 / 503
- Node.js app stopped — check **cPanel → Setup Node.js App**.
- Crash at boot — see `~/ri-agri.in/backend/logs/` and the per-app
  Passenger log.
- Run manually to surface the error:
  ```bash
  source /home/<user>/nodevenv/ri-agri.in/backend/20/bin/activate
  cd ~/ri-agri.in/backend && node src/index.js
  ```

### `ER_NO_SUCH_TABLE` at runtime
You skipped `node src/scripts/setupDrizzle.js`. It's idempotent — re-run.

### Admin panel blank / 404 on refresh
`.htaccess` missing or `RewriteBase` doesn't match the URL path.

### Public site 500 / `Cannot find module './.output/server/index.mjs'`
- `app.js` or `.output/` missing in the upload.
- Re-upload `demo/` and Restart the Node.js app.

### CORS errors
- `CORS_ORIGIN` must exactly match the browser's origin (no trailing
  slash). Restart the backend app after editing `.env`.

### Default password change
After first login: admin profile → Change password. The default
`Admin@Lume!1` is widely documented and must not stay.

### Missing native binding (`@oxc-parser/binding-linux-x64-gnu`)
Re-install with `npm install --omit=dev --include=optional` (npm
sometimes skips optional native deps).

---

For the full guide including a NestJS deployment path, rebuild flows,
performance tips, and exhaustive troubleshooting, see
`docs/CPANEL_DEPLOYMENT.md` in the source repository.
README

print_success "README.md generated"

# ─────────────────────────────────────────
# 5. CREATE UNIFIED ZIP
# ─────────────────────────────────────────
print_section "Creating Unified Deployment Package"

cd "$DEPLOY_DIR"
zip -qr "$SCRIPT_DIR/lume-deploy.zip" .
print_success "Created lume-deploy.zip"

# Clean up staging
rm -rf "$DEPLOY_DIR"

# ─────────────────────────────────────────
# 6. SUMMARY
# ─────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║     DEPLOYMENT PACKAGE READY         ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Package:${NC} $SCRIPT_DIR/lume-deploy.zip"
echo ""
echo "  Contents:"
echo "    backend/   → ri-agri.in/backend   (Express API + Prisma)"
echo "    frontend/  → ri-agri.in/frontend  (Vue 3 SPA: code + dist/)"
echo "    demo/      → ri-agri.in/demo      (Nuxt 3 SSR: code + .output/)"
echo "    README.md  → Step-by-step deployment instructions"
echo ""
echo -e "${YELLOW}Deploy order:${NC}"
echo "  1. Backend  — Node.js app, entry: src/index.js"
echo "  2. Frontend — Upload dist/ contents, static SPA"
echo "  3. Demo     — Node.js app, entry: app.js"
echo ""
echo "  See README.md inside the zip for detailed instructions."
echo ""
