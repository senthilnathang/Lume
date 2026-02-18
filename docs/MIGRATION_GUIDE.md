# Lume Framework — Migration & Upgrade Guide

## Upgrading Lume

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

# 5. Install any new admin panel dependencies
cd ../frontend/apps/web-lume
npm install

# 6. Install any new public site dependencies
cd ../riagri-website
npm install

# 7. Restart all development servers
```

### Upgrade Checklist

| Step | Command | Directory |
|------|---------|-----------|
| Pull latest code | `git pull origin main` | project root |
| Backend dependencies | `npm install` | `backend/` |
| Prisma client | `npx prisma generate` | `backend/` |
| Schema sync | `npx prisma db push` | `backend/` |
| Admin panel dependencies | `npm install` | `frontend/apps/web-lume/` |
| Public site dependencies | `npm install` | `frontend/apps/riagri-website/` |
| Restart backend | `npm run dev` | `backend/` |
| Restart admin panel | `npm run dev` | `frontend/apps/web-lume/` |
| Restart public site | `npm run dev` | `frontend/apps/riagri-website/` |

---

## Database Migrations

### Prisma (Core Tables)

Prisma manages the 11 core tables (users, roles, permissions, etc.).

#### Development — Quick Sync

```bash
cd backend
npx prisma db push
```

Synchronizes the database directly from `schema.prisma` without migration files.

#### Production — Versioned Migrations

```bash
# Create a migration
npx prisma migrate dev --name describe_your_change

# Apply in production
npx prisma migrate deploy

# Check status
npx prisma migrate status
```

#### Introspection (DB → Schema)

Lume uses introspection to generate the Prisma schema from the database:

```bash
npx prisma db pull      # Updates schema.prisma from DB
npx prisma generate     # Regenerates client
```

### Drizzle (Module Tables)

Drizzle manages tables for 14 modules. Schemas are defined in `modules/{name}/models/schema.js`.

#### Runtime Sync

Module tables are automatically synced when the server starts. Adding a new column to a Drizzle schema will create it on the next restart.

#### Manual Migration

```bash
# Generate migrations from schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Push schema directly (development only)
npx drizzle-kit push
```

#### Adding a Column to a Module Table

1. Edit the schema file:
   ```javascript
   // modules/my_module/models/schema.js
   export const myTable = mysqlTable('my_table', {
     // ... existing columns
     newField: varchar('new_field', { length: 255 }),  // Add this
   });
   ```

2. Restart the backend — Drizzle will sync the new column.

3. Or apply via SQL directly:
   ```sql
   ALTER TABLE my_table ADD COLUMN new_field VARCHAR(255);
   ```

---

## Module Management

### Install a Module

**Via Admin UI:**
1. Navigate to **Settings > Modules**
2. Find the module → Click **Install**

**Via API:**
```bash
curl -X POST http://localhost:3000/api/modules/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "moduleName": "donations" }'
```

### Uninstall a Module

**Via Admin UI:**
1. Navigate to **Settings > Modules**
2. Find the module → Click **Uninstall**

**Via API:**
```bash
curl -X POST http://localhost:3000/api/modules/uninstall \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{ "moduleName": "donations" }'
```

### Module Dependencies

Modules declare dependencies in `__manifest__.js`. The framework enforces:

- A module cannot be installed if its dependencies are not installed
- A module cannot be uninstalled if other installed modules depend on it
- The `base` module cannot be uninstalled

Dependency chain example:
```
base ← editor ← website
base ← base_security
base ← base_automation
```

---

## Content Migration

### Migrating Page Content to Visual Page Builder

Pages using structured JSON content can be migrated to TipTap format for the visual page builder.

#### TipTap Content Format

The page builder stores content as TipTap JSON:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "sectionBlock",
      "attrs": { "backgroundColor": "#f8f9fa" },
      "content": [
        { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Title" }] },
        { "type": "paragraph", "content": [{ "type": "text", "text": "Body" }] }
      ]
    }
  ]
}
```

#### Detection Logic

The page editor detects the content format:

```javascript
function isTipTapJson(obj) {
  return obj && obj.type === 'doc' && Array.isArray(obj.content);
}
```

- TipTap format → shows visual PageBuilder (3-panel layout)
- Other JSON → shows form-based editor

#### Migration Approach

To migrate a page to the visual builder:

1. Build the equivalent TipTap JSON using available block types (sectionBlock, columnsBlock, infoBox, testimonial, etc.)
2. Update the page via `PUT /api/website/pages/:id` with the new content
3. The page will automatically show the visual builder on next edit

Available block types for migration: sectionBlock, columnsBlock, columnBlock, heading, paragraph, dualHeading, advancedHeading, infoBox, testimonial, teamMember, iconList, faq, contactForm, businessHours, calloutBlock, buttonBlock, marketingButton, spacerBlock, imageBlock, videoBlock, htmlBlock, priceTable, priceList, googleMap, socialShare, countdown, contentToggle, modalPopup, progressBar, postsGrid, imageGallery, carouselBlock, flipBoxBlock, animatedHeadlineBlock, hotspotBlock, tocBlock, offCanvasBlock, dynamicTagBlock, accordionBlock, audioBlock, beforeAfterBlock, blockquoteBlock, breadcrumbsBlock, chartBlock, codeHighlightBlock, counterBlock, floatingButtonsBlock, globalWidgetBlock, loopCarouselBlock, loopGridBlock, lottieBlock, navMenuBlock, progressTrackerBlock, searchFormBlock, slidesBlock, starRatingBlock, tabsBlock.

---

## Backup Procedures

### Database Backup

#### MySQL

```bash
# Full dump
mysqldump -u gawdesy -pgawdesy lume > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed
mysqldump -u gawdesy -pgawdesy lume | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

#### PostgreSQL

```bash
pg_dump -U gawdesy -d lume > backup_$(date +%Y%m%d_%H%M%S).sql
pg_dump -U gawdesy -d lume -Fc > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Uploads Backup

```bash
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/uploads/
```

### Full Backup Script

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

mysqldump -u gawdesy -pgawdesy lume | gzip > "${BACKUP_DIR}/database.sql.gz"
tar -czf "${BACKUP_DIR}/uploads.tar.gz" backend/uploads/

echo "Backup completed: ${BACKUP_DIR}"
```

---

## Rollback Procedures

### Rolling Back Code

```bash
git log --oneline -10     # Find the target commit
git checkout <commit>      # Revert to it

# Re-sync
cd backend && npm install && npx prisma generate
cd ../frontend/apps/web-lume && npm install
cd ../riagri-website && npm install
```

### Restoring Database

```bash
# MySQL
gunzip < backup.sql.gz | mysql -u gawdesy -pgawdesy lume

# PostgreSQL
psql -U gawdesy -d lume < backup.sql
pg_restore -U gawdesy -d lume --clean backup.dump
```

### Restoring Uploads

```bash
tar -xzf uploads_backup.tar.gz -C /path/to/lume/
```

### Emergency Recovery

```bash
# 1. Stop all servers
pkill -f "node.*backend"
pkill -f "vite"
pkill -f "nuxt"

# 2. Restore database
gunzip < backups/latest/database.sql.gz | mysql -u gawdesy -pgawdesy lume

# 3. Restore uploads
tar -xzf backups/latest/uploads.tar.gz -C .

# 4. Revert code
git checkout <last-known-good-commit>

# 5. Re-sync
cd backend && npm install && npx prisma generate
cd ../frontend/apps/web-lume && npm install
cd ../frontend/apps/riagri-website && npm install

# 6. Restart
cd backend && npm run dev &
cd ../frontend/apps/web-lume && npm run dev &
cd ../frontend/apps/riagri-website && npm run dev &
```
