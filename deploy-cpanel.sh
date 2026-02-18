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
# Lume — cPanel Deployment Guide

Domain: **ri-agri.in**

| Path | App | Type |
|------|-----|------|
| `ri-agri.in/demo` | Public Website | Nuxt 3 SSR (Node.js) |
| `ri-agri.in/frontend` | Admin Panel | Vue 3 SPA (static) |
| `ri-agri.in/backend` | Backend API | Express.js (Node.js) |

---

## Prerequisites

- cPanel with **Node.js Selector** (Node.js 18+)
- MySQL 8.0+ database created
- SSH access (recommended) or cPanel File Manager

---

## Step 1: Deploy Backend API

The backend powers both the admin panel and the public site.

### 1.1 Upload files

Upload the contents of the `backend/` folder to:
```
~/ri-agri.in/backend/
```

### 1.2 Create Node.js application in cPanel

1. Go to **cPanel → Setup Node.js App → Create Application**
2. Configure:
   - **Node.js version**: 18+ (LTS)
   - **Application mode**: Production
   - **Application root**: `ri-agri.in/backend`
   - **Application URL**: `ri-agri.in/backend`
   - **Application startup file**: `src/index.js`
3. Click **Create**

### 1.3 Install dependencies

Via SSH or cPanel Terminal:
```bash
cd ~/ri-agri.in/backend
source /home/<cpanel-user>/nodevenv/ri-agri.in/backend/18/bin/activate
npm install --production
npx prisma generate
```

### 1.4 Configure environment

Create/edit `.env` in `~/ri-agri.in/backend/`:
```env
NODE_ENV=production
PORT=3000

# Database — use your cPanel MySQL credentials
DATABASE_URL="mysql://cpanel_user:password@localhost:3306/cpanel_lume"
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cpanel_lume
DB_USER=cpanel_user
DB_PASSWORD=password

# JWT secrets — generate random strings
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
JWT_EXPIRES_IN=7d

# CORS — allow admin panel and public site
CORS_ORIGIN=https://ri-agri.in
FRONTEND_URL=https://ri-agri.in/frontend
PUBLIC_WEBSITE_URL=https://ri-agri.in/demo

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@ri-agri.in

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
SESSION_SECRET=your-production-session-secret
```

### 1.5 Initialize the database

```bash
cd ~/ri-agri.in/backend
npx prisma db push
npm run db:init
```

This creates tables and seeds:
- Admin user: `admin@lume.dev` / `admin123`
- 6 roles, 147+ permissions, default settings

### 1.6 Restart the application

In cPanel → Node.js Apps → click **Restart** on the backend app.

### 1.7 Verify

```bash
curl https://ri-agri.in/backend/api/health
# Expected: {"success":true,"message":"OK"}
```

---

## Step 2: Deploy Admin Panel (Vue 3 SPA)

The admin panel is a static SPA — only the `dist/` folder needs to be served.

### 2.1 Upload built files

Upload the contents of `frontend/dist/` (NOT the `frontend/` folder itself) to:
```
~/ri-agri.in/frontend/
```

The `.htaccess` file inside `dist/` handles SPA routing — make sure it's uploaded too.

### 2.2 Configure API URL

Before building (if you need to rebuild), set in `.env.production`:
```env
VITE_API_URL=https://ri-agri.in/backend/api
VITE_PUBLIC_SITE_URL=https://ri-agri.in/demo
```

If uploading the pre-built `dist/`, the API URL is baked into the build.
To change it, rebuild locally with the correct `.env.production` values.

### 2.3 Verify

Open `https://ri-agri.in/frontend` in a browser.
Log in with: `admin@lume.dev` / `admin123`

### 2.4 Rebuilding on server (optional)

If you need to rebuild on the server instead of uploading pre-built dist:
```bash
cd ~/ri-agri.in/frontend
npm install
npm run build
# Then copy dist/* to the served directory
```

The `frontend/` folder contains both source code and `dist/` for this purpose.

---

## Step 3: Deploy Public Site (Nuxt 3 SSR)

The public site is a server-side rendered app — it needs Node.js to run.

### 3.1 Upload files

Upload the contents of the `demo/` folder to:
```
~/ri-agri.in/demo/
```

### 3.2 Create Node.js application in cPanel

1. Go to **cPanel → Setup Node.js App → Create Application**
2. Configure:
   - **Node.js version**: 18+ (LTS)
   - **Application mode**: Production
   - **Application root**: `ri-agri.in/demo`
   - **Application URL**: `ri-agri.in/demo`
   - **Application startup file**: `app.js`
3. Click **Create**

### 3.3 Install dependencies (if rebuilding)

```bash
cd ~/ri-agri.in/demo
source /home/<cpanel-user>/nodevenv/ri-agri.in/demo/18/bin/activate
npm install --production
```

The `.output/` directory contains the pre-built SSR app. If it's present, `npm install` is not required for running — only for rebuilding.

### 3.4 Configure environment

Create `.env` in `~/ri-agri.in/demo/`:
```env
NUXT_PUBLIC_API_URL=https://ri-agri.in/backend/api
```

### 3.5 Restart the application

In cPanel → Node.js Apps → click **Restart** on the demo app.

### 3.6 Verify

Open `https://ri-agri.in/demo` in a browser. The public website should load with all pages.

---

## Folder Structure on Server

```
~/ri-agri.in/
├── backend/              ← Node.js app (Express API)
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── .env
│   ├── uploads/
│   └── logs/
│
├── frontend/             ← Static files (Vue 3 SPA dist/)
│   ├── index.html
│   ├── assets/
│   └── .htaccess
│
└── demo/                 ← Node.js app (Nuxt 3 SSR)
    ├── .output/
    ├── app.js
    ├── package.json
    └── (source code for rebuilds)
```

---

## Post-Deployment Checklist

- [ ] Backend `/api/health` returns OK
- [ ] Admin panel loads at `/frontend`
- [ ] Admin login works (`admin@lume.dev` / `admin123`)
- [ ] Change admin password after first login
- [ ] Public site loads at `/demo`
- [ ] Pages render correctly (Home, Products, Services, About, Contact)
- [ ] Menu navigation works on public site
- [ ] Image uploads work in admin panel
- [ ] SSL certificate is active (HTTPS)

---

## Troubleshooting

### API returns 502/503
- Check Node.js app is running in cPanel → Node.js Apps
- Check `~/ri-agri.in/backend/logs/` for error logs
- Verify `.env` DATABASE_URL is correct

### Admin panel shows blank page
- Ensure `.htaccess` is uploaded (may be hidden)
- Verify `RewriteBase` matches the subpath (`/frontend/`)
- Check browser console for API connection errors

### Public site shows "Cannot connect"
- Verify Node.js app is running for demo
- Check `app.js` exists and `.output/` directory is present
- Verify `NUXT_PUBLIC_API_URL` points to the backend

### CORS errors
- Update `CORS_ORIGIN` in backend `.env` to include the exact domain
- Restart the backend Node.js app after changes

### Database connection refused
- Verify MySQL credentials in cPanel → MySQL Databases
- cPanel MySQL users are usually prefixed: `cpaneluser_dbuser`
- Database names are also prefixed: `cpaneluser_dbname`
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
