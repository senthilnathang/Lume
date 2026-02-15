# Lume Framework — Migration & Upgrade Guide

## Upgrading Lume

When a new version of Lume is available, follow these steps to upgrade your installation.

### Standard Upgrade Procedure

```bash
# 1. Pull the latest changes
cd /path/to/lume
git pull origin main

# 2. Install any new backend dependencies
cd backend
npm install

# 3. Regenerate the Prisma client (picks up schema changes)
npx prisma generate

# 4. Apply database schema changes
npx prisma db push

# 5. Install any new frontend dependencies
cd ../frontend/apps/web-lume
npm install

# 6. Restart both development servers
```

> **Tip:** Always read the release notes before upgrading. Breaking changes will be documented there.

### Upgrade Checklist

| Step | Command | Directory |
|------|---------|-----------|
| Pull latest code | `git pull origin main` | project root |
| Backend dependencies | `npm install` | `backend/` |
| Prisma client | `npx prisma generate` | `backend/` |
| Schema sync | `npx prisma db push` | `backend/` |
| Frontend dependencies | `npm install` | `frontend/apps/web-lume/` |
| Restart backend | `npm run dev` | `backend/` |
| Restart frontend | `npm run dev` | `frontend/apps/web-lume/` |

---

## Database Migrations

### Using Prisma Migrate

Prisma Migrate is the recommended approach for production environments where you need a versioned migration history.

#### Creating a Migration

After modifying `backend/prisma/schema.prisma`, generate a migration:

```bash
cd backend
npx prisma migrate dev --name describe_your_change
```

This will:
1. Generate a SQL migration file in `prisma/migrations/`.
2. Apply the migration to your development database.
3. Regenerate the Prisma client.

#### Applying Migrations in Production

```bash
cd backend
npx prisma migrate deploy
```

This applies all pending migrations without generating new ones. It is safe for production use.

#### Viewing Migration Status

```bash
npx prisma migrate status
```

#### Resetting the Database

To drop and recreate the database with all migrations applied:

```bash
npx prisma migrate reset
```

> **Warning:** This destroys all data. Only use in development.

### Using Prisma DB Push (Development)

For rapid development where you do not need migration history:

```bash
npx prisma db push
```

This synchronizes the database schema with `schema.prisma` directly, without creating migration files. It is suitable for development but not recommended for production.

### Using Drizzle Schema Sync

If your project uses Drizzle ORM alongside or instead of Prisma:

```bash
# Generate migrations from schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Push schema directly (development only)
npx drizzle-kit push
```

---

## Module Management

Lume uses a modular architecture. Modules can be installed and uninstalled at runtime. The Base module is always installed and cannot be removed.

### Install a Module

**Via API:**

```bash
curl -X POST http://localhost:3000/api/modules/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "moduleName": "donations" }'
```

**Via the Admin UI:**

1. Navigate to **Settings > Modules**.
2. Find the module you want to install.
3. Click **Install**.

### Uninstall a Module

**Via API:**

```bash
curl -X POST http://localhost:3000/api/modules/uninstall \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{ "moduleName": "donations" }'
```

**Via the Admin UI:**

1. Navigate to **Settings > Modules**.
2. Find the installed module.
3. Click **Uninstall**.

### Module Dependencies

Modules can declare dependencies on other modules in their `__manifest__.js`. The framework enforces these dependencies:

- A module cannot be installed if its dependencies are not installed first.
- A module cannot be uninstalled if other installed modules depend on it.

To check a module's dependencies, inspect its manifest:

```bash
cat backend/src/modules/<module_name>/__manifest__.js
```

### Module Lifecycle Hooks

Modules can define `installHook` and `uninstallHook` functions in their manifest for custom setup and teardown logic (e.g., seeding default data on install, cleaning up on uninstall).

---

## Backup Procedures

### Database Backup

#### MySQL

```bash
# Full database dump
mysqldump -u gawdesy -pgawdesy lume > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
mysqldump -u gawdesy -pgawdesy lume | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Specific tables only
mysqldump -u gawdesy -pgawdesy lume users roles permissions > backup_core_$(date +%Y%m%d_%H%M%S).sql
```

#### PostgreSQL

```bash
# Full database dump
pg_dump -U gawdesy -d lume > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup (custom format, supports selective restore)
pg_dump -U gawdesy -d lume -Fc > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Uploads Directory Backup

Module uploads and user-uploaded files are stored on disk. Back up the uploads directory:

```bash
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/uploads/
```

### Full Backup Script

A combined script for backing up both the database and uploads:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# Database
mysqldump -u gawdesy -pgawdesy lume | gzip > "${BACKUP_DIR}/database.sql.gz"

# Uploads
tar -czf "${BACKUP_DIR}/uploads.tar.gz" backend/uploads/

echo "Backup completed: ${BACKUP_DIR}"
```

### Automated Backups

Use cron to schedule regular backups:

```bash
# Edit crontab
crontab -e

# Add a daily backup at 2:00 AM
0 2 * * * /path/to/lume/scripts/backup.sh >> /var/log/lume-backup.log 2>&1
```

---

## Rollback Procedures

### Rolling Back Code Changes

If an upgrade introduces issues, revert to the previous version:

```bash
# View recent commits to find the version to roll back to
git log --oneline -10

# Revert to a specific commit
git checkout <commit-hash>

# Or revert the last commit while keeping the changes staged
git revert HEAD
```

After reverting code, re-sync dependencies and the database:

```bash
cd backend && npm install && npx prisma generate
cd ../frontend/apps/web-lume && npm install
```

### Rolling Back Database Migrations

#### Prisma Migrate

Prisma does not have a built-in "rollback last migration" command. To undo a migration:

1. Modify `schema.prisma` to reflect the previous state.
2. Create a new migration that reverses the changes:

```bash
npx prisma migrate dev --name revert_previous_change
```

Alternatively, if you have a backup, restore it:

```bash
# MySQL
mysql -u gawdesy -pgawdesy lume < backup_20260215_020000.sql

# PostgreSQL
psql -U gawdesy -d lume < backup_20260215_020000.sql
# or for custom format dumps:
pg_restore -U gawdesy -d lume backup_20260215_020000.dump
```

### Restoring from Backup

#### Database Restore

```bash
# MySQL — restore from SQL dump
mysql -u gawdesy -pgawdesy lume < backup_20260215_020000.sql

# MySQL — restore from compressed dump
gunzip < backup_20260215_020000.sql.gz | mysql -u gawdesy -pgawdesy lume

# PostgreSQL — restore from SQL dump
psql -U gawdesy -d lume < backup_20260215_020000.sql

# PostgreSQL — restore from custom format
pg_restore -U gawdesy -d lume --clean backup_20260215_020000.dump
```

#### Uploads Restore

```bash
# Extract the uploads backup
tar -xzf uploads_backup_20260215_020000.tar.gz -C /path/to/lume/
```

### Emergency Recovery

If the application is in a broken state after an upgrade:

1. **Stop all servers** (backend and frontend).
2. **Restore the database** from the most recent backup.
3. **Revert the code** to the last known working commit.
4. **Re-sync dependencies**: `npm install` in both `backend/` and `frontend/apps/web-lume/`.
5. **Regenerate Prisma client**: `npx prisma generate` in `backend/`.
6. **Restart servers** and verify functionality.

```bash
# Full emergency recovery sequence
cd /path/to/lume

# Stop servers (Ctrl+C in their terminals, or)
pkill -f "node.*backend"
pkill -f "vite"

# Restore database
gunzip < backups/latest/database.sql.gz | mysql -u gawdesy -pgawdesy lume

# Restore uploads
tar -xzf backups/latest/uploads.tar.gz -C .

# Revert code
git checkout <last-known-good-commit>

# Re-sync
cd backend && npm install && npx prisma generate
cd ../frontend/apps/web-lume && npm install

# Restart
cd ../../backend && npm run dev &
cd ../frontend/apps/web-lume && npm run dev &
```
