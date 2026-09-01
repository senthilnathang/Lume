# Single-Command Application Setup

Lume Framework v2.0 provides streamlined one-command setup for the full application stack.

## Prerequisites

- Node.js >= 20.12.0
- pnpm >= 10.28.2
- MariaDB 10.11+ (or MySQL 8.0+)

## Quick Start

### 1. Install dependencies (root level)

```bash
cd /opt/Lume
pnpm install
```

### 2. Set up environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Admin panel
cp apps/web-lume/.env.example apps/web-lume/.env

# Public website
cp apps/riagri-website/.env.example apps/riagri-website/.env
```

### 3. Database setup (one command)

```bash
cd backend
npm run db:setup
```

This single command performs:

1. **`refreshDb.js`** - Drops all tables (destructive, fresh installs only)
2. **`npx prisma db push --accept-data-loss`** - Creates 11 Prisma core tables
3. **`setupDrizzle.js`** - Creates 33+ Drizzle module tables (96 tables across 18 modules)
4. **`createAdmin.js`** - Creates `admin@lume.dev / Admin@Lume!1` with super_admin role
5. **`seedData.js`** - Seeds sample content (5 activities, 6 team, 3 messages, 10 settings)

### 4. Start the development servers

```bash
# Start backend
cd backend
npm run dev

# Start admin panel (port 5173)
cd ../apps/web-lume
npm run dev

# Start public website (port 3100)
cd ../riagri-website
npm run dev
```

## Development Workflow

### Full Stack Reload

After making changes to the backend, restart the backend server:

```bash
# Backend
cd backend
npm run dev
```

After making changes to the frontend, the Vite/Nuxt dev servers hot-reload automatically.

### Database Migrations (incremental)

For adding new columns or tables:

```bash
# Prisma core tables
cd backend
npx prisma db push

# Module tables (Drizzle)
node src/scripts/setupDrizzle.js
```

### Adding a New Module

See `docs/DEVELOPMENT.md` for creating a new module from scratch. The process involves:

1. Define entities using `defineEntity()`
2. Define workflows using `defineWorkflow()`
3. Define module using `defineModule()`
4. Create Drizzle
</think>
<tool_call>
<function=bash>
<parameter=command>
cd /opt/Lume && grep -r "TODO\|FIXME\|TODO|OPTIMODULES
5. Create routes using `createCrudRouter()`
6. Register in bootstrap
7. Create frontend views in `backend/src/modules/{name}/static/views/`
8. Register in admin router

### npm Audit

Run security audits:

```bash
# Backend
cd backend
npm audit

# Admin panel
cd apps/web-lume
npm audit

# Public website
cd apps/riagri-website
npm audit
```

## Security Upgrades Applied

This session upgraded the following critical security packages:

### Backend
- `@opentelemetry/auto-instrumentations-node`: ^0.74.0 → ^0.80.0
- `@grpc/grpc-js`: ^1.14.3 → ^1.14.4 (crash fix)
- `@opentelemetry/core`: ^2.8.0 → ^2.11.0 (memory allocation fix)
- `@opentelemetry/configuration`: ^0.218.0 → ^0.222.0
- `axios`: Not in backend (handled in admin)
- `sharp`, `ws`, `drizzle-orm`, `nodemailer`: Updated to latest

### Admin Panel
- `axios`: ^1.15.0 → ^1.20.0 (prototype pollution fixes)
- `vite`: ^5.4.0 → ^8.2.2 (security patches)
- `vitest`: ^2.1.0 → ^4.1.11 (critical vulnerability fixes)
- `@vitest/mocker`: Removed (transitive dependency)
- `brace-expansion`: ^1.1.14 → ^5.0.9 (DoS fix)
- `xlsx`, `linkify-it`, `markdown-it`, `nanoid`: Updated

### Public Website
- `nuxt`: ^3.10.0 → ^3.21.11 (critical vulnerability fixes)
- `@nuxt/devtools`: Added ^3.3.1 (was critical CVE)
- `vite`: Upgraded to v8
- `vitest`: ^2.1.0 → ^4.1.11

## Verification

After setup, verify:

```bash
# Check all three audits pass
cd /opt/Lume
pnpm run check  # Runs lint + typecheck + smoke tests
```

Expected: 0 critical security vulnerabilities in `npm audit` across all three projects.