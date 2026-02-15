# Lume Framework — Installation Guide

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Node.js | 18+ | LTS recommended |
| MySQL | 8.0+ | Default database |
| PostgreSQL | 14+ | Alternative database |
| npm | 9+ | Comes with Node.js |
| Git | 2.30+ | For cloning the repository |

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/lume.git && cd lume

# 2. Install backend dependencies
cd backend && npm install && npx prisma generate

# 3. Install frontend dependencies
cd ../frontend/apps/web-lume && npm install

# 4. Initialize the database
cd ../../../backend && npx prisma db push && npm run db:init

# 5. Start development servers
npm run dev          # backend on http://localhost:3000
cd ../frontend/apps/web-lume && npm run dev   # frontend on http://localhost:5173
```

---

## Detailed Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/lume.git
cd lume
```

### 2. Backend Setup

```bash
cd backend
npm install
npx prisma generate
```

`npx prisma generate` creates the Prisma client from the schema. This step is required before the backend can connect to the database.

### 3. Frontend Setup

```bash
cd frontend/apps/web-lume
npm install
```

The frontend is a Vite + Vue 3 + TypeScript application. All dependencies, including Ant Design Vue and Tailwind CSS, are installed via npm.

### 4. Environment Configuration

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Configure the following variables:

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `DATABASE_URL` | Database connection string | `mysql://gawdesy:gawdesy@localhost:3306/lume` |
| `JWT_SECRET` | Secret key for signing access tokens | (generate a random string) |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | (generate a random string) |
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `SMTP_HOST` | SMTP mail server host | `smtp.example.com` |
| `SMTP_PORT` | SMTP mail server port | `587` |
| `SMTP_USER` | SMTP authentication username | `noreply@example.com` |
| `SMTP_PASSWORD` | SMTP authentication password | (your SMTP password) |
| `APP_NAME` | Application display name | `Lume` |

Example `.env` file:

```env
DATABASE_URL="mysql://gawdesy:gawdesy@localhost:3306/lume"
JWT_SECRET="your-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="noreply@example.com"
SMTP_PASSWORD="your-smtp-password"
APP_NAME="Lume"
```

### 5. Database Initialization

```bash
cd backend

# Push the Prisma schema to the database (creates tables)
npx prisma db push

# Seed roles, permissions, admin user, and default settings
npm run db:init
```

The `db:init` script seeds the database with:

- Default roles (admin, super_admin, user)
- Permissions (109 permissions across all modules)
- Admin user account
- Default application settings

**The `--force` flag:** If you need to drop and recreate all tables (destroying existing data), use:

```bash
npm run db:init -- --force
```

> **Warning:** The `--force` flag will delete all existing data. Only use it during initial development or when you need a clean slate.

### 6. Running Development Servers

Open two terminal windows:

**Terminal 1 — Backend (port 3000):**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 5173):**

```bash
cd frontend/apps/web-lume
npm run dev
```

The frontend Vite dev server proxies `/api` requests to `http://localhost:3000`, so both servers must be running for the application to work.

---

## Database Configuration

### MySQL Setup (Default)

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create the database and user
CREATE DATABASE lume CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gawdesy'@'localhost' IDENTIFIED BY 'gawdesy';
GRANT ALL PRIVILEGES ON lume.* TO 'gawdesy'@'localhost';
FLUSH PRIVILEGES;
```

Set the `DATABASE_URL` in your `.env`:

```env
DATABASE_URL="mysql://gawdesy:gawdesy@localhost:3306/lume"
```

### PostgreSQL Setup (Alternative)

To use PostgreSQL instead of MySQL:

1. Update the provider in `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // change from "mysql" to "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Create the PostgreSQL database:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

CREATE DATABASE lume;
CREATE USER gawdesy WITH PASSWORD 'gawdesy';
GRANT ALL PRIVILEGES ON DATABASE lume TO gawdesy;
```

3. Update the `DATABASE_URL` in your `.env`:

```env
DATABASE_URL="postgresql://gawdesy:gawdesy@localhost:5432/lume"
```

4. Regenerate the Prisma client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

---

## Verify Installation

### Health Check

Once both servers are running, verify the backend is responding:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "success": true, "message": "OK" }
```

### Login

Open `http://localhost:5173` in your browser and log in with the default credentials:

| Field | Value |
|-------|-------|
| Email | `admin@lume.dev` |
| Password | `admin123` |

> **Important:** Change the default admin password immediately after your first login.

---

## Troubleshooting

### `EADDRINUSE: address already in use :::3000`

Another process is using port 3000. Find and kill it:

```bash
# Find the process
lsof -i :3000

# Kill it
kill -9 <PID>
```

Or change the `PORT` in your `.env` file.

### `ECONNREFUSED 127.0.0.1:3306`

MySQL is not running or not accessible. Start the MySQL service:

```bash
# Linux (systemd)
sudo systemctl start mysql

# macOS (Homebrew)
brew services start mysql
```

### Prisma Generate Errors

If `npx prisma generate` fails, ensure:

1. The `DATABASE_URL` in `.env` is correct and the database server is running.
2. You are running the command from the `backend/` directory.
3. Try clearing the Prisma cache:

```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### ESM / Import Errors

The backend uses ES modules (`"type": "module"` in `package.json`). Common issues:

- **`require is not defined`** — You are using CommonJS syntax. Use `import`/`export` instead.
- **`Cannot use import statement outside a module`** — Ensure the file has a `.js` extension and the nearest `package.json` has `"type": "module"`.
- **Jest tests failing** — Jest requires `NODE_OPTIONS='--experimental-vm-modules'` and `transform: {}` in `jest.config.cjs`.

### Frontend Not Loading Module Views

If module views show a blank page or crash:

- Ensure Tailwind CSS is scanning module directories. Check that `tailwind.config.js` includes:

```js
content: [
  // ...
  '../../../backend/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}'
]
```

- Verify the `@modules` alias is configured in both `vite.config.ts` and `tsconfig.json`.

---

## IDE Setup

### Recommended VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| [Vue - Official (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) | Vue 3 language support and TypeScript integration |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | JavaScript/TypeScript linting |
| [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) | Tailwind class autocompletion and hover preview |
| [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) | Prisma schema syntax highlighting and formatting |

### Recommended VS Code Settings

Add to your workspace `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript", "vue"],
  "tailwindCSS.experimental.classRegex": [
    ["class=\"([^\"]*)\"", "([a-zA-Z0-9\\-:]+)"]
  ]
}
```
