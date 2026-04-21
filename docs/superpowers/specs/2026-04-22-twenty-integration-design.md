# Twenty Framework Integration Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan. Tasks use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Twenty's flexible views (list, grid, form, kanban, calendar, gallery) and entity builder capabilities into Lume, enabling admins to create custom entities with multiple visualization options and publish them to the public website.

**Architecture:** Pragmatic hybrid approach using Lume's existing BaseService and adapter patterns, with new ViewRegistry and EntityService abstractions only where needed. Code-first entity definitions (YAML/JS) synchronized bidirectionally with UI-created entities via sync tooling.

**Tech Stack:** Vue 3, Drizzle ORM, BaseService pattern, view adapter plugins, JSON-based entity configs, bidirectional sync service.

---

## 1. Scope and Timeline

### Phased Rollout

**Phase 1 (v2.1): Entity Builder Foundation + Sync**
- Entity CRUD API and service
- Field management with types and validation
- Code-first entity definitions (YAML format)
- Bidirectional sync (code ↔ DB)
- Admin UI for entity/field creation
- Access control (admin-only vs. publishable)

**Phase 2 (v2.2): Core Views (List, Grid, Form)**
- List view (sortable, filterable table)
- Grid view (card-based layout)
- Form view (inline/modal editor)
- Public API for publishable entities
- Public website display support

**Phase 3 (v2.3): Advanced Views (Kanban, Calendar, Gallery)**
- Kanban view (status column drag-drop)
- Calendar view (date-based timeline)
- Gallery view (image grid with lightbox)
- Performance optimizations

### Success Criteria
- Admins can create entities without code
- Entities can be published to public API
- All 6 view types render correctly in admin and public
- Code-first definitions stay in sync with UI changes
- Backward compatible with existing module system

---

## 2. Architecture

### Core Services

#### 2.1 EntityService (`backend/src/core/services/entity.service.js`)

Manages custom entity definitions, fields, and access control.

**Methods:**
- `createEntity(data)` — Create custom entity (name, slug, icon, description, isPublishable)
- `updateEntity(id, data)` — Update entity metadata
- `deleteEntity(id)` — Soft delete entity
- `listEntities(filters)` — Get all entities with optional filtering
- `getEntity(id)` — Fetch single entity with all fields
- `createField(entityId, field)` — Add field (name, type, label, validation, position)
- `updateField(fieldId, data)` — Update field metadata
- `deleteField(fieldId)` — Remove field (cascade to views)
- `getFieldsByEntity(entityId)` — Fetch all fields for entity
- `validateEntity(data)` — Validate entity structure
- `publishEntity(id)` — Mark entity as public, add to public API
- `unpublishEntity(id)` — Mark as admin-only

**Database Tables (Drizzle in base module):**

```javascript
export const customEntities = pgTable('custom_entities', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 7 }), // hex color
  isPublishable: boolean('is_publishable').default(false),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'), // soft delete
});

export const entityFields = pgTable('entity_fields', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => customEntities.id),
  slug: varchar('slug', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'text', 'number', 'date', 'select', 'rich-text', etc.
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  required: boolean('required').default(false),
  unique: boolean('unique').default(false),
  validation: text('validation'), // JSON: regex, min/max, enum options
  position: integer('position').default(0),
  defaultValue: text('default_value'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const entityViews = pgTable('entity_views', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => customEntities.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'list', 'grid', 'form', 'kanban', 'calendar', 'gallery'
  isDefault: boolean('is_default').default(false),
  config: text('config').notNull(), // JSON: fieldOrder, filters, sortBy, groupBy, etc.
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const entitySyncHistory = pgTable('entity_sync_history', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => customEntities.id),
  source: varchar('source', { length: 50 }).notNull(), // 'code' or 'ui'
  action: varchar('action', { length: 50 }).notNull(), // 'create', 'update', 'delete'
  changes: text('changes').notNull(), // JSON: old → new
  syncedAt: timestamp('synced_at').defaultNow(),
  status: varchar('status', { length: 20 }).default('synced'), // 'synced', 'conflict', 'pending'
});
```

#### 2.2 ViewRegistry (`backend/src/core/services/view-registry.js`)

Plugin system for view types. Each view implements a standard interface.

**Methods:**
- `register(type, ViewAdapter)` — Register view plugin (e.g., 'list' → ListViewAdapter)
- `resolve(type)` — Get view adapter by type
- `getAvailableTypes()` — List registered view types
- `createViewConfig(entityId, viewType, options)` — Create view with defaults
- `updateViewConfig(viewId, options)` — Update view settings

**ViewAdapter Interface:**

```javascript
// All view adapters extend BaseViewAdapter
export class BaseViewAdapter {
  constructor(entity, fields, config = {}) {
    this.entity = entity;
    this.fields = fields;
    this.config = config; // { fieldOrder, filters, sortBy, etc. }
  }

  /**
   * Render method for Vue components
   * @returns {Object} { component, props }
   */
  render() {
    throw new Error('render() must be implemented');
  }

  /**
   * Get schema for this view type
   * @returns {Object} { requiredFields, optionalFields, configSchema }
   */
  getSchema() {
    throw new Error('getSchema() must be implemented');
  }

  /**
   * Validate view config against entity
   * @returns {Array} Array of validation errors (empty if valid)
   */
  validate() {
    throw new Error('validate() must be implemented');
  }
}

// Example: ListViewAdapter
export class ListViewAdapter extends BaseViewAdapter {
  render() {
    return {
      component: 'EntityListView',
      props: {
        entity: this.entity,
        fields: this.fields,
        sortBy: this.config.sortBy,
        filters: this.config.filters,
      }
    };
  }

  getSchema() {
    return {
      requiredFields: [],
      optionalFields: ['sortBy', 'filters', 'pageSize'],
      configSchema: {
        sortBy: { type: 'object', properties: { field: 'string', order: 'asc|desc' } },
        filters: { type: 'array', items: { type: 'object' } },
        pageSize: { type: 'number', default: 20 },
      }
    };
  }

  validate() {
    const errors = [];
    if (this.config.sortBy && !this.fields.find(f => f.slug === this.config.sortBy.field)) {
      errors.push(`Sort field "${this.config.sortBy.field}" does not exist`);
    }
    return errors;
  }
}
```

#### 2.3 SyncService (`backend/src/core/services/sync.service.js`)

Bidirectional synchronization between code-first definitions and DB.

**Methods:**
- `loadCodeDefinitions(path)` — Read entity definitions from `/backend/src/entities/`
- `syncToDb(codeDefs)` — Merge code definitions into DB (create new, update existing, detect conflicts)
- `syncToCode(entityId)` — Export DB entity to code format
- `detectConflicts(codeVersion, dbVersion)` — Identify divergences
- `resolveConflict(entityId, strategy)` — Resolve using 'code-wins', 'db-wins', or 'merge'
- `getHistory(entityId)` — Get sync audit trail

**Code Definition Format** (YAML):

```yaml
# backend/src/entities/contact.entity.yaml
name: Contact
slug: contact
icon: user
color: '#3b82f6'
isPublishable: true
description: 'Customer contact information'
fields:
  - name: firstName
    type: text
    label: 'First Name'
    required: true
    position: 1
  - name: email
    type: email
    label: 'Email'
    required: true
    unique: true
    position: 2
  - name: phone
    type: phone
    label: 'Phone'
    position: 3
  - name: status
    type: select
    label: 'Status'
    validation: '{"enum": ["active", "inactive", "pending"]}'
    position: 4
views:
  - name: 'All Contacts'
    type: list
    isDefault: true
    config:
      fieldOrder: ['firstName', 'email', 'phone', 'status']
      sortBy: { field: 'firstName', order: 'asc' }
  - name: 'By Status'
    type: kanban
    config:
      groupBy: 'status'
      fieldOrder: ['firstName', 'email']
```

---

### 3. Data Layer

#### 3.1 Entity Storage

Custom entities stored in `custom_entities` and `entity_fields` tables (managed by EntityService). Each entity is independent; admins can:
- Create entity via UI (EntityService.createEntity)
- Create via code (SyncService.loadCodeDefinitions)
- Edit either way, sync keeps them aligned

#### 3.2 Field Types

Supported types (extensible):

| Type | Storage | Validation | Rendering |
|------|---------|-----------|-----------|
| `text` | VARCHAR | min/max length, regex | text input |
| `email` | VARCHAR | RFC 5322 | email input |
| `phone` | VARCHAR | regex pattern | tel input |
| `number` | DECIMAL | min/max, step | number input |
| `date` | DATE | min/max date | date picker |
| `datetime` | TIMESTAMP | min/max | datetime picker |
| `boolean` | TINYINT | — | checkbox |
| `select` | VARCHAR | enum options | dropdown |
| `multi-select` | JSON | enum options | multi-select |
| `rich-text` | LONGTEXT | — | rich editor (TipTap) |
| `url` | VARCHAR | URL pattern | URL input |
| `color` | VARCHAR | hex pattern | color picker |

---

### 4. Frontend Structure

#### 4.1 Admin Panel Views

Location: `backend/src/modules/base/static/views/` (entity management UI)

**Views:**
- `entities/` — Entity list and CRUD
- `entity-editor.vue` — Create/edit entity metadata
- `field-editor.vue` — Add/edit/reorder fields
- `view-configurator.vue` — Configure views per entity
- `entity-preview.vue` — Live preview of entity in each view type

**Components:** `backend/src/modules/base/static/components/`
- `EntityBuilder.vue` — Form for entity creation
- `FieldManager.vue` — Drag-to-reorder field editor
- `ViewTypeSelector.vue` — Choose and configure view type
- `FieldTypeSelect.vue` — Field type picker with validation config

#### 4.2 Entity Display Components

**Admin Views:** `apps/web-lume/src/components/views/`
- `EntityListView.vue` — Sortable, filterable table (uses BaseService)
- `EntityGridView.vue` — Card grid with images
- `EntityFormView.vue` — Inline/modal form editor
- `EntityKanbanView.vue` — Drag-drop columns
- `EntityCalendarView.vue` — Month/week/day calendar
- `EntityGalleryView.vue` — Image grid with lightbox

**Public Views:** `apps/riagri-website/components/entities/`
- Reusable view components (same as admin, styled for public)
- `EntityRenderer.vue` — Dynamic dispatcher to correct view type

#### 4.3 API Clients

**Admin:** `apps/web-lume/src/api/entity.ts`
```typescript
export const entityApi = {
  // Entities
  createEntity: (data) => post('/api/entities', data),
  getEntities: () => get('/api/entities'),
  getEntity: (id) => get(`/api/entities/${id}`),
  updateEntity: (id, data) => put(`/api/entities/${id}`, data),
  deleteEntity: (id) => del(`/api/entities/${id}`),
  publishEntity: (id) => post(`/api/entities/${id}/publish`),
  
  // Fields
  createField: (entityId, data) => post(`/api/entities/${entityId}/fields`, data),
  updateField: (fieldId, data) => put(`/api/entity-fields/${fieldId}`, data),
  deleteField: (fieldId) => del(`/api/entity-fields/${fieldId}`),
  
  // Views
  createView: (entityId, data) => post(`/api/entities/${entityId}/views`, data),
  updateView: (viewId, data) => put(`/api/entity-views/${viewId}`, data),
};
```

**Public:** `apps/riagri-website/api/publicEntity.ts`
```typescript
export const publicEntityApi = {
  listEntities: () => get('/api/public/entities'),
  getEntity: (slug) => get(`/api/public/entities/${slug}`),
  listRecords: (entitySlug, params) => get(`/api/public/entities/${entitySlug}/records`, { params }),
  getRecord: (entitySlug, id) => get(`/api/public/entities/${entitySlug}/records/${id}`),
};
```

---

### 5. API Routes

#### 5.1 Entity Management (Admin)

**Route:** `/api/entities`

```
POST /api/entities
  { name, slug, icon, color, isPublishable }
  → customEntities.create()

GET /api/entities
  → customEntities.find() with fields and views

GET /api/entities/:id
  → customEntities.findById() with full structure

PUT /api/entities/:id
  { name, icon, color, isPublishable }
  → customEntities.update()

DELETE /api/entities/:id
  → customEntities.softDelete()

POST /api/entities/:id/publish
  → mark isPublished = true, expose public API

POST /api/entities/:id/unpublish
  → mark isPublished = false, revoke public access
```

#### 5.2 Field Management (Admin)

**Route:** `/api/entities/:id/fields`

```
POST /api/entities/:id/fields
  { slug, name, type, label, validation, required, position }
  → entityFields.create()

PUT /api/entity-fields/:id
  → entityFields.update()

DELETE /api/entity-fields/:id
  → entityFields.delete() (cascade to views)
```

#### 5.3 View Management (Admin)

**Route:** `/api/entities/:id/views`

```
POST /api/entities/:id/views
  { name, type, config, isDefault }
  → entityViews.create()

PUT /api/entity-views/:id
  { config }
  → entityViews.update()

DELETE /api/entity-views/:id
  → entityViews.delete()
```

#### 5.4 Public API

**Route:** `/api/public/entities`

```
GET /api/public/entities
  → List all published entities (paginated)

GET /api/public/entities/:slug
  → Single entity with fields and default view config

GET /api/public/entities/:slug/records
  → List records for published entity (paginated, filterable)

GET /api/public/entities/:slug/records/:id
  → Single record details
```

---

### 6. Error Handling

All entity operations return consistent error envelope:

```json
{
  "success": false,
  "message": "Entity validation failed",
  "errors": {
    "slug": ["Slug must be unique", "Slug must be lowercase alphanumeric"],
    "fields": ["At least one field required"]
  }
}
```

Specific errors:
- **ValidationError**: Invalid entity/field/view structure
- **ConflictError**: Sync conflict (code vs. DB mismatch)
- **NotFoundError**: Entity/field/view does not exist
- **AccessError**: User lacks permission to publish entity

---

### 7. Testing Strategy

#### Unit Tests
- EntityService CRUD operations
- Field validation (type checking, required, unique)
- ViewRegistry plugin loading and resolution
- SyncService conflict detection and resolution
- Entity publish/unpublish access control

#### Integration Tests
- Admin creates entity → field → view config
- View renders correctly with sample data
- Entity sync (code → DB, DB → code)
- Public API exposure when published
- Cascade deletion (entity → fields → views)

#### E2E Tests (Playwright)
- Admin creates Contact entity, adds fields, configures views
- Views display correctly in admin
- Publish entity to public
- Public site fetches and renders entity via gallery view

---

### 8. Deployment and Migration

**v2.1 Rollout:**
1. Create Drizzle tables (custom_entities, entity_fields, entity_views, entity_sync_history)
2. Deploy EntityService and ViewRegistry
3. Deploy admin UI for entity builder
4. Deploy SyncService (watch `/backend/src/entities/`)
5. Seed example entity definitions (optional)

**Backward Compatibility:**
- Existing modules unaffected
- Module fields separate from custom entities
- No breaking changes to API

**Rollback:**
- Custom entity tables remain (no data loss)
- Remove route registrations for entity endpoints
- Admin UI becomes unavailable but data persists

---

### 9. Success Criteria (Acceptance Tests)

- ✅ Admin can create entity "Contact" with fields via UI
- ✅ Entity appears in code-first definitions file after sync
- ✅ Modifying code definition syncs back to DB without loss
- ✅ All 6 view types render correctly for test entity
- ✅ Publishing entity exposes public API
- ✅ Public website displays published entity
- ✅ Field validation (required, unique) enforced on create/update
- ✅ Soft delete entity hides from UI, public API
- ✅ Audit trail tracks all entity changes

---

## 10. File Manifest

**Create:**
- `/opt/Lume/backend/src/core/services/entity.service.js`
- `/opt/Lume/backend/src/core/services/view-registry.js`
- `/opt/Lume/backend/src/core/services/sync.service.js`
- `/opt/Lume/backend/src/core/adapters/views/base-view.adapter.js`
- `/opt/Lume/backend/src/entities/` (directory for code-first definitions)
- `/opt/Lume/backend/src/entities/contact.entity.yaml` (example)
- `/opt/Lume/backend/src/modules/base/static/views/entities/` (admin UI)
- `/opt/Lume/backend/src/modules/base/static/components/` (entity builder components)
- `/opt/Lume/apps/web-lume/src/components/views/` (admin view components)
- `/opt/Lume/apps/web-lume/src/api/entity.ts`
- `/opt/Lume/apps/riagri-website/components/entities/` (public view components)
- `/opt/Lume/apps/riagri-website/api/publicEntity.ts`

**Modify:**
- `/opt/Lume/backend/src/modules/base/models/schema.js` (add entity tables)
- `/opt/Lume/backend/src/modules/base/__init__.js` (register entity routes)
- `/opt/Lume/backend/src/index.js` (init SyncService on startup)
- `/opt/Lume/backend/src/core/middleware/entityAccess.js` (new middleware for public/admin filtering)

---

## 11. Assumptions and Dependencies

- Base module is always installed
- Drizzle ORM available in all environments
- EntityService follows existing BaseService patterns
- View adapters are loaded at startup (lazy-load in Phase 2)
- Sync runs on startup, can be triggered manually via admin UI

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Circular entity dependencies | Admin confusion | Document best practices; sync tool warns |
| Sync conflicts (code ↔ DB) | Data inconsistency | Conflict resolution strategy with audit trail |
| Performance with 1000+ custom fields | Slow admin UI | Pagination, lazy loading, caching |
| Public entity data exposure | Security issue | Field-level access control, role-based filtering |

