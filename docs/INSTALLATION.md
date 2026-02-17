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

# 3. Initialize the database
npx prisma db push && npm run db:init

# 4. Install admin panel dependencies
cd ../frontend/apps/web-lume && npm install

# 5. Install public site dependencies
cd ../riagri-website && npm install

# 6. Start all development servers (3 terminals)
# Terminal 1: backend on http://localhost:3000
cd backend && npm run dev

# Terminal 2: admin panel on http://localhost:5173
cd frontend/apps/web-lume && npm run dev

# Terminal 3: public site on http://localhost:3007
cd frontend/apps/riagri-website && npm run dev
```

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
cd frontend/apps/web-lume
npm install
```

The admin panel is a Vite + Vue 3 + TypeScript application with Ant Design Vue and Tailwind CSS.

### 4. Public Site Setup (Nuxt 3 SSR)

```bash
cd frontend/apps/riagri-website
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

**Admin Panel** — Create `.env` in `frontend/apps/web-lume/`:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API base path (relative for proxy) | `/api` |
| `VITE_PUBLIC_SITE_URL` | Public site URL for preview iframe | `http://localhost:3007` |

### 6. Database Initialization

```bash
cd backend

# Push the Prisma schema to the database (creates core tables)
npx prisma db push

# Seed roles, permissions, admin user, and default settings
npm run db:init
```

The `db:init` script seeds:

- 6 default roles (super_admin, admin, manager, staff, user, guest)
- 147+ permissions across all 23 modules
- Admin user account (`admin@lume.dev` / `admin123`)
- Default application settings
- Editor templates (6 page templates)

**The `--force` flag:** Drops and recreates all tables (destroys existing data):

```bash
npm run db:init -- --force
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
cd frontend/apps/web-lume
npm run dev
```

**Terminal 3 — Public Site (port 3007):**

```bash
cd frontend/apps/riagri-website
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
curl http://localhost:3000/api/health
# Expected: { "success": true, "message": "OK" }
```

### Admin Login

Open `http://localhost:5173` and log in:

| Field | Value |
|-------|-------|
| Email | `admin@lume.dev` |
| Password | `admin123` |

### Public Site

Open `http://localhost:3007` to view the public website. Pages are rendered using TipTap content from the visual page builder.

### Website CMS

In the admin panel, navigate to **Website > Pages** to manage public site content:

- **Pages** — Visual page editor with 30+ widget blocks
- **Menus** — Drag-and-drop hierarchical menu management
- **Media** — Image and file upload library
- **Settings** — Site name, logo, contact info, social links

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
- Check `VITE_PUBLIC_SITE_URL` in `frontend/apps/web-lume/.env`
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
