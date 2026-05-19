# Lume Framework — Installation Guide

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Node.js | 18+ | LTS recommended |
| MySQL | 8.0+ | Default database |
| PostgreSQL | 14+ | Alternative database |
| pnpm | 8+ | Package manager (monorepo workspaces) |
| Git | 2.30+ | For cloning the repository |

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> && cd lume

# 2. Install backend dependencies
cd backend && npm install && npx prisma generate

# 3. Initialize the database (clean install — destroys existing data)
node src/scripts/refreshDb.js              # Drop all tables
npx prisma db push --accept-data-loss       # Recreate schema from prisma/schema.prisma
node src/scripts/createAdmin.js             # admin@lume.dev / Admin@Lume!1 (super_admin)
node src/scripts/seedData.js                # 5 activities, 6 team, 3 messages, 10 settings

# 4. Install admin panel dependencies
cd ../apps/web-lume && npm install

# 5. Install public site dependencies
cd ../riagri-website && npm install

# 6. Start all development servers (3 terminals)
# Terminal 1: backend on http://localhost:3000
cd backend && npm run dev

# Terminal 2: admin panel on http://localhost:5173
cd apps/web-lume && npm run dev

# Terminal 3: public site on http://localhost:3007
cd apps/riagri-website && npm run dev
```

> **Note:** `npm run db:init` and `npm run db:seed` reference `prisma/seed.js`, which is outdated (uses a removed `username` field). Use the four-script sequence above instead.

---

## Detailed Installation

### 1. Clone the Repository

```bash
git clone <repo-url>
cd lume
```

### 2. Backend Setup

```bash
cd backend
npm install
npx prisma generate
```

`npx prisma generate` creates the Prisma client from the schema. This step is required before the backend can connect to the database.

### 3. Admin Panel Setup (Vue 3 SPA)

```bash
cd apps/web-lume
npm install
```

The admin panel is a Vite + Vue 3 + TypeScript application with Ant Design Vue and Tailwind CSS.

### 4. Public Site Setup (Nuxt 3 SSR)

```bash
cd apps/riagri-website
npm install
```

The public site is a Nuxt 3 server-side rendered application that consumes the website module's public API. It uses TipTap's BlockRenderer to display page content built with the visual page builder.

### 5. Environment Configuration

**Backend** — Create `.env` in `backend/`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `DATABASE_URL` | Database connection string | `mysql://gawdesy:gawdesy@localhost:3306/lume` |
| `JWT_SECRET` | Secret key for access tokens | (generate a random string) |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | (generate a random string) |
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `SMTP_HOST` | SMTP mail server host | `smtp.example.com` |
| `SMTP_PORT` | SMTP mail server port | `587` |
| `SMTP_USER` | SMTP authentication username | `noreply@example.com` |
| `SMTP_PASSWORD` | SMTP authentication password | (your SMTP password) |
| `APP_NAME` | Application display name | `Lume` |

**Admin Panel** — Create `.env` in `apps/web-lume/`:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API base path (relative for proxy) | `/api` |
| `VITE_PUBLIC_SITE_URL` | Public site URL for preview iframe | `http://localhost:3007` |

### 6. Database Initialization

The canonical bring-up sequence uses four scripts in order. `prisma/seed.js` is outdated — do **not** run `npm run db:init` or `npm run db:seed` for fresh installs.

```bash
cd backend

# Step 1 (destructive): drop every table in the lume schema.
# Skip this for incremental schema changes; use only for fresh installs.
node src/scripts/refreshDb.js

# Step 2: regenerate the schema from prisma/schema.prisma.
# --accept-data-loss is required because refreshDb already dropped tables.
npx prisma db push --accept-data-loss

# Step 3: create the super_admin role + admin user.
# Defaults: admin@lume.dev / Admin@Lume!1 (override via ADMIN_EMAIL / ADMIN_PASSWORD env vars).
node src/scripts/createAdmin.js

# Step 4: seed sample content (5 activities, 6 team members, 3 messages, 10 settings).
node src/scripts/seedData.js
```

**What gets created:**

- `super_admin` role (system-protected)
- Admin user account: `admin@lume.dev` / `Admin@Lume!1`
- 5 activities, 6 team members, 3 messages, 10 settings entries
- Prisma client regenerated against the live schema

**Modules** are auto-discovered from `backend/src/modules/` on first backend boot — there is no separate "install modules" step. The `installed_modules` table is populated by the module loader.

**Override admin credentials:**

```bash
ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='YourStrongPass!1' node src/scripts/createAdmin.js
```

### 7. Running Development Servers

Open three terminal windows:

**Terminal 1 — Backend (port 3000):**

```bash
cd backend
npm run dev
```

**Terminal 2 — Admin Panel (port 5173):**

```bash
cd apps/web-lume
npm run dev
```

**Terminal 3 — Public Site (port 3007):**

```bash
cd apps/riagri-website
npm run dev
```

The admin panel's Vite dev proxy routes `/api` requests to `http://localhost:3000`. The Nuxt public site also proxies API requests to the backend.

---

## Database Configuration

### MySQL Setup (Default)

```sql
CREATE DATABASE lume CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gawdesy'@'localhost' IDENTIFIED BY 'gawdesy';
GRANT ALL PRIVILEGES ON lume.* TO 'gawdesy'@'localhost';
FLUSH PRIVILEGES;
```

```env
DATABASE_URL="mysql://gawdesy:gawdesy@localhost:3306/lume"
```

### PostgreSQL Setup (Alternative)

1. Update the provider in `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Create the database:

```sql
CREATE DATABASE lume;
CREATE USER gawdesy WITH PASSWORD 'gawdesy';
GRANT ALL PRIVILEGES ON DATABASE lume TO gawdesy;
```

3. Update `DATABASE_URL`:

```env
DATABASE_URL="postgresql://gawdesy:gawdesy@localhost:5432/lume"
```

4. Regenerate and push:

```bash
npx prisma generate
npx prisma db push
```

---

## Verify Installation

### Health Check

```bash
curl http://localhost:3000/health
# Expected: { "success": true, "message": "Lume Framework is running", "metrics": {...} }
```

> Health is at `/health` (top-level), not `/api/health`. The `/api/*` namespace is reserved for module-mounted resources (`/api/users`, `/api/activities`, `/api/modules`, etc.).

### Admin Login (API)

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"Admin@Lume!1"}'
# Expected: { "success": true, "data": { "user": {...}, "token": "eyJ...", "refreshToken": "eyJ..." } }
```

> Login endpoint is `/api/users/login` (handled by the `user` module). The `auth` module owns roles/permissions but not the login endpoint.

### Admin Login (UI)

Open `http://localhost:5173` and log in:

| Field | Value |
|-------|-------|
| Email | `admin@lume.dev` |
| Password | `Admin@Lume!1` |

### Public Site

Open `http://localhost:3007` to view the public website. Pages are rendered using TipTap content from the visual page builder.

### Website CMS

In the admin panel, navigate to **Website > Pages** to manage public site content:

- **Pages** — Visual page editor with 54 widget blocks, content scheduling, access control, page locking
- **Menus** — Drag-and-drop hierarchical menu management
- **Media** — Image and file upload library
- **Categories** — Hierarchical category taxonomy for pages
- **Tags** — Flat tag taxonomy for pages
- **Forms** — Form builder with submission tracking
- **Theme Builder** — Header, footer, and sidebar templates with live preview
- **Popups** — Popup builder with 5 trigger types
- **Settings** — Site name, logo, contact info, design tokens, SEO, robots.txt, code injection

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3000`

```bash
lsof -i :3000
kill -9 <PID>
```

### `ECONNREFUSED 127.0.0.1:3306`

MySQL is not running:

```bash
sudo systemctl start mysql     # Linux
brew services start mysql      # macOS
```

### Prisma Generate Errors

```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### ESM / Import Errors

The backend uses ES modules (`"type": "module"`):

- Use `import`/`export`, not `require`/`module.exports`
- Jest requires `NODE_OPTIONS='--experimental-vm-modules'`

### Frontend Module Views Not Loading

1. Verify Tailwind scans module directories in `tailwind.config.js`:
   ```js
   content: ['../../../backend/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}']
   ```
2. Verify the `@modules` alias in `vite.config.ts` and `tsconfig.json`

### Public Site Preview Not Working

If the page editor preview shows "localhost refused to connect":
- Check `VITE_PUBLIC_SITE_URL` in `apps/web-lume/.env`
- Ensure the Nuxt dev server is running on the configured port

---

## IDE Setup

### Recommended VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| Vue - Official (Volar) | Vue 3 + TypeScript support |
| ESLint | Linting |
| Tailwind CSS IntelliSense | Class autocompletion |
| Prisma | Schema syntax highlighting |
