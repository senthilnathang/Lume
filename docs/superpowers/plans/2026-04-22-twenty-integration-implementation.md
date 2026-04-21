# Twenty Framework Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Twenty-inspired entity builder and multi-view system across Lume (Phases 1-3: v2.1 → v2.2 → v2.3).

**Architecture:** Three-phase rollout with EntityService (CRUD), ViewRegistry (plugins), SyncService (code ↔ DB sync). Core services follow existing BaseService/adapter patterns. Views implemented as pluggable adapters. Code-first definitions in YAML, UI builder in admin panel, bidirectional sync keeps both in sync.

**Tech Stack:** Vue 3, Drizzle ORM (module tables), BaseService, view adapters, YAML configs, bidirectional sync.

---

## Phase 1: Entity Builder Foundation + Sync (v2.1)

### Task 1: Create Drizzle Schema for Entity Tables

**Files:**
- Modify: `backend/src/modules/base/models/schema.js`

**Context:** Add four new Drizzle tables to base module: `customEntities`, `entityFields`, `entityViews`, `entitySyncHistory`. These track custom entity definitions, fields, view configs, and sync history.

- [ ] **Step 1: Read base module schema**

```bash
head -50 /opt/Lume/backend/src/modules/base/models/schema.js
```

Expected: See existing Drizzle table definitions (baseGroups, baseRecordRules, etc.)

- [ ] **Step 2: Add custom entity tables**

Edit `/opt/Lume/backend/src/modules/base/models/schema.js` — append before the closing export statements:

```javascript
export const customEntities = pgTable('custom_entities', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  color: varchar('color', { length: 7 }),
  isPublishable: boolean('is_publishable').default(false),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  deletedAt: timestamp('deleted_at'),
});

export const entityFields = pgTable('entity_fields', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => customEntities.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  required: boolean('required').default(false),
  unique: boolean('unique').default(false),
  validation: text('validation'),
  position: integer('position').default(0),
  defaultValue: text('default_value'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const entityViews = pgTable('entity_views', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull().references(() => customEntities.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false),
  config: text('config').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const entitySyncHistory = pgTable('entity_sync_history', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').references(() => customEntities.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  changes: text('changes').notNull(),
  syncedAt: timestamp('synced_at').defaultNow(),
  status: varchar('status', { length: 20 }).default('synced'),
});
```

- [ ] **Step 3: Update Drizzle relations (optional, for eager loading)**

In the same file, add relations object after table definitions:

```javascript
export const entityFieldsRelations = relations(entityFields, ({ one }) => ({
  entity: one(customEntities, {
    fields: [entityFields.entityId],
    references: [customEntities.id],
  }),
}));

export const entityViewsRelations = relations(entityViews, ({ one }) => ({
  entity: one(customEntities, {
    fields: [entityViews.entityId],
    references: [customEntities.id],
  }),
}));

export const customEntitiesRelations = relations(customEntities, ({ many }) => ({
  fields: many(entityFields),
  views: many(entityViews),
}));
```

- [ ] **Step 4: Verify schema by running Drizzle push**

```bash
cd /opt/Lume/backend
npx drizzle-kit push
```

Expected: Tables created in database, no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/base/models/schema.js
git commit -m "feat: add entity builder drizzle tables (custom_entities, entity_fields, entity_views, sync_history)"
```

---

### Task 2: Implement EntityService - CRUD Methods

**Files:**
- Create: `backend/src/core/services/entity.service.js`

**Context:** Core service for managing entities, fields, and their lifecycle. Follows BaseService patterns but manages multiple related tables. No BaseAdapter needed — direct Drizzle queries.

- [ ] **Step 1: Create EntityService class with create/read/update/delete**

Create `/opt/Lume/backend/src/core/services/entity.service.js`:

```javascript
import { db } from '../db/drizzle.js';
import { customEntities, entityFields, entityViews, entitySyncHistory } from '../../modules/base/models/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

export class EntityService {
  /**
   * Create a new custom entity
   * @param {Object} data - { name, slug, description, icon, color, isPublishable }
   * @returns {Object} Created entity
   * @throws {Error} Validation error or slug conflict
   */
  async createEntity(data) {
    this.validateEntity(data);
    
    const result = await db
      .insert(customEntities)
      .values({
        slug: data.slug.toLowerCase(),
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
        isPublishable: data.isPublishable || false,
        isPublished: false,
      })
      .returning();
    
    return result[0];
  }

  /**
   * Get entity by ID with all fields and views
   * @param {number} id
   * @returns {Object} Entity with fields[] and views[]
   */
  async getEntity(id) {
    const entity = await db
      .select()
      .from(customEntities)
      .where(and(eq(customEntities.id, id), isNull(customEntities.deletedAt)))
      .limit(1);
    
    if (!entity.length) return null;
    
    const fields = await db
      .select()
      .from(entityFields)
      .where(eq(entityFields.entityId, id))
      .orderBy(entityFields.position);
    
    const views = await db
      .select()
      .from(entityViews)
      .where(eq(entityViews.entityId, id));
    
    return {
      ...entity[0],
      fields,
      views: views.map(v => ({ ...v, config: JSON.parse(v.config) })),
    };
  }

  /**
   * List all entities (non-deleted)
   * @param {Object} options - { page, limit, filters }
   * @returns {Object} { items, total, page, limit, totalPages }
   */
  async listEntities(options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const items = await db
      .select()
      .from(customEntities)
      .where(isNull(customEntities.deletedAt))
      .limit(limit)
      .offset(offset);
    
    const countResult = await db
      .select({ count: db.sql`COUNT(*)` })
      .from(customEntities)
      .where(isNull(customEntities.deletedAt));
    
    const total = parseInt(countResult[0].count, 10);
    
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update entity metadata
   * @param {number} id
   * @param {Object} data - { name, description, icon, color, isPublishable }
   * @returns {Object} Updated entity
   */
  async updateEntity(id, data) {
    const result = await db
      .update(customEntities)
      .set({
        name: data.name || undefined,
        description: data.description !== undefined ? data.description : undefined,
        icon: data.icon !== undefined ? data.icon : undefined,
        color: data.color !== undefined ? data.color : undefined,
        isPublishable: data.isPublishable !== undefined ? data.isPublishable : undefined,
        updatedAt: new Date(),
      })
      .where(eq(customEntities.id, id))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Soft delete entity
   * @param {number} id
   * @returns {Object} Deleted entity
   */
  async deleteEntity(id) {
    const result = await db
      .update(customEntities)
      .set({ deletedAt: new Date() })
      .where(eq(customEntities.id, id))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Validate entity data
   * @throws {Error} If validation fails
   */
  validateEntity(data) {
    const errors = {};
    
    if (!data.name || data.name.trim().length === 0) {
      errors.name = 'Entity name is required';
    }
    if (!data.slug || data.slug.trim().length === 0) {
      errors.slug = 'Entity slug is required';
    }
    if (!/^[a-z0-9_-]+$/.test(data.slug)) {
      errors.slug = 'Slug must be lowercase alphanumeric with hyphens/underscores';
    }
    
    if (Object.keys(errors).length > 0) {
      const err = new Error('Entity validation failed');
      err.errors = errors;
      throw err;
    }
  }
}

export const entityService = new EntityService();
```

- [ ] **Step 2: Test EntityService.createEntity**

Create `/opt/Lume/backend/tests/unit/entity.service.test.js`:

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { entityService } from '../../src/core/services/entity.service.js';
import { db } from '../../src/core/db/drizzle.js';
import { customEntities } from '../../src/modules/base/models/schema.js';
import { eq } from 'drizzle-orm';

describe('EntityService', () => {
  beforeEach(async () => {
    // Clear test data
    await db.delete(customEntities);
  });

  afterEach(async () => {
    await db.delete(customEntities);
  });

  it('should create entity with valid data', async () => {
    const data = {
      name: 'Contact',
      slug: 'contact',
      description: 'Customer contacts',
      icon: 'user',
      color: '#3b82f6',
      isPublishable: true,
    };
    
    const entity = await entityService.createEntity(data);
    
    expect(entity.id).toBeDefined();
    expect(entity.name).toBe('Contact');
    expect(entity.slug).toBe('contact');
    expect(entity.isPublished).toBe(false);
  });

  it('should throw validation error on missing name', async () => {
    const data = {
      slug: 'contact',
    };
    
    expect(() => entityService.validateEntity(data)).toThrow('Entity validation failed');
  });

  it('should reject invalid slug format', async () => {
    const data = {
      name: 'Contact',
      slug: 'Contact With Spaces',
    };
    
    expect(() => entityService.validateEntity(data)).toThrow('Entity validation failed');
  });
});
```

- [ ] **Step 3: Run test to verify create passes**

```bash
cd /opt/Lume/backend
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/unit/entity.service.test.js
```

Expected: 3 tests pass (create valid, validation error, invalid slug).

- [ ] **Step 4: Test getEntity and listEntities**

Add to `/opt/Lume/backend/tests/unit/entity.service.test.js`:

```javascript
  it('should retrieve entity by ID with fields', async () => {
    const created = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
    });
    
    const entity = await entityService.getEntity(created.id);
    
    expect(entity.id).toBe(created.id);
    expect(entity.name).toBe('Contact');
    expect(entity.fields).toEqual([]);
    expect(entity.views).toEqual([]);
  });

  it('should list entities with pagination', async () => {
    await entityService.createEntity({ name: 'Contact', slug: 'contact' });
    await entityService.createEntity({ name: 'Company', slug: 'company' });
    
    const result = await entityService.listEntities({ page: 1, limit: 10 });
    
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.totalPages).toBe(1);
  });

  it('should soft delete entity', async () => {
    const created = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
    });
    
    await entityService.deleteEntity(created.id);
    const entity = await entityService.getEntity(created.id);
    
    expect(entity).toBeNull();
  });
```

- [ ] **Step 5: Run all entity tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/unit/entity.service.test.js
```

Expected: All 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/core/services/entity.service.js backend/tests/unit/entity.service.test.js
git commit -m "feat: implement EntityService with CRUD and validation"
```

---

### Task 3: Implement Field Management in EntityService

**Files:**
- Modify: `backend/src/core/services/entity.service.js`

**Context:** Add methods to create, update, delete, and list fields. Field types include text, email, number, date, select, rich-text, etc. Validation config stored as JSON.

- [ ] **Step 1: Add field management methods**

Edit `/opt/Lume/backend/src/core/services/entity.service.js` — add before closing brace:

```javascript
  /**
   * Create a field for an entity
   * @param {number} entityId
   * @param {Object} field - { slug, name, type, label, description, required, unique, validation, position, defaultValue }
   * @returns {Object} Created field
   */
  async createField(entityId, field) {
    this.validateField(field);
    
    const result = await db
      .insert(entityFields)
      .values({
        entityId,
        slug: field.slug.toLowerCase(),
        name: field.name,
        type: field.type,
        label: field.label,
        description: field.description || null,
        required: field.required || false,
        unique: field.unique || false,
        validation: field.validation ? JSON.stringify(field.validation) : null,
        position: field.position || 0,
        defaultValue: field.defaultValue || null,
      })
      .returning();
    
    return result[0];
  }

  /**
   * Get fields for an entity
   * @param {number} entityId
   * @returns {Array} Fields ordered by position
   */
  async getFieldsByEntity(entityId) {
    return db
      .select()
      .from(entityFields)
      .where(eq(entityFields.entityId, entityId))
      .orderBy(entityFields.position);
  }

  /**
   * Update field metadata
   * @param {number} fieldId
   * @param {Object} data - Partial field data
   * @returns {Object} Updated field
   */
  async updateField(fieldId, data) {
    const result = await db
      .update(entityFields)
      .set({
        name: data.name || undefined,
        label: data.label || undefined,
        description: data.description !== undefined ? data.description : undefined,
        required: data.required !== undefined ? data.required : undefined,
        unique: data.unique !== undefined ? data.unique : undefined,
        validation: data.validation ? JSON.stringify(data.validation) : undefined,
        position: data.position !== undefined ? data.position : undefined,
        defaultValue: data.defaultValue !== undefined ? data.defaultValue : undefined,
        updatedAt: new Date(),
      })
      .where(eq(entityFields.id, fieldId))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Delete field (cascade removes from views)
   * @param {number} fieldId
   * @returns {Object} Deleted field
   */
  async deleteField(fieldId) {
    const result = await db
      .delete(entityFields)
      .where(eq(entityFields.id, fieldId))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Validate field data
   * @throws {Error} If validation fails
   */
  validateField(field) {
    const errors = {};
    const validTypes = ['text', 'email', 'phone', 'number', 'date', 'datetime', 'boolean', 'select', 'multi-select', 'rich-text', 'url', 'color'];
    
    if (!field.name || field.name.trim().length === 0) {
      errors.name = 'Field name required';
    }
    if (!field.label || field.label.trim().length === 0) {
      errors.label = 'Field label required';
    }
    if (!field.type || !validTypes.includes(field.type)) {
      errors.type = `Invalid type. Valid: ${validTypes.join(', ')}`;
    }
    if (field.slug && !/^[a-z0-9_-]+$/.test(field.slug)) {
      errors.slug = 'Slug must be lowercase alphanumeric';
    }
    if (field.validation && typeof field.validation !== 'object') {
      errors.validation = 'Validation must be an object';
    }
    
    if (Object.keys(errors).length > 0) {
      const err = new Error('Field validation failed');
      err.errors = errors;
      throw err;
    }
  }
```

- [ ] **Step 2: Test field creation and validation**

Add to `/opt/Lume/backend/tests/unit/entity.service.test.js`:

```javascript
  it('should create field for entity', async () => {
    const entity = await entityService.createEntity({ name: 'Contact', slug: 'contact' });
    
    const field = await entityService.createField(entity.id, {
      slug: 'firstName',
      name: 'First Name',
      type: 'text',
      label: 'First Name',
      required: true,
      position: 1,
    });
    
    expect(field.id).toBeDefined();
    expect(field.entityId).toBe(entity.id);
    expect(field.slug).toBe('firstname');
    expect(field.required).toBe(true);
  });

  it('should get fields ordered by position', async () => {
    const entity = await entityService.createEntity({ name: 'Contact', slug: 'contact' });
    
    await entityService.createField(entity.id, {
      slug: 'lastName',
      name: 'Last Name',
      type: 'text',
      label: 'Last Name',
      position: 2,
    });
    
    await entityService.createField(entity.id, {
      slug: 'firstName',
      name: 'First Name',
      type: 'text',
      label: 'First Name',
      position: 1,
    });
    
    const fields = await entityService.getFieldsByEntity(entity.id);
    
    expect(fields).toHaveLength(2);
    expect(fields[0].slug).toBe('firstname');
    expect(fields[1].slug).toBe('lastname');
  });

  it('should validate field type', async () => {
    const field = {
      name: 'Test',
      label: 'Test',
      type: 'invalid-type',
    };
    
    expect(() => entityService.validateField(field)).toThrow('Field validation failed');
  });
```

- [ ] **Step 3: Run field tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/unit/entity.service.test.js
```

Expected: All tests pass (9 total).

- [ ] **Step 4: Commit**

```bash
git add backend/src/core/services/entity.service.js backend/tests/unit/entity.service.test.js
git commit -m "feat: add field management (create, update, delete, validate) to EntityService"
```

---

### Task 4: Implement ViewRegistry Service

**Files:**
- Create: `backend/src/core/services/view-registry.js`

**Context:** Plugin registry for view types. Views are adapters that render entity data in different formats (list, grid, form, etc.). Registry tracks available view types and resolves them on demand.

- [ ] **Step 1: Create ViewRegistry class**

Create `/opt/Lume/backend/src/core/services/view-registry.js`:

```javascript
/**
 * ViewRegistry - Plugin system for view types
 * Each view type is an adapter class that extends BaseViewAdapter
 */

export class BaseViewAdapter {
  constructor(entity, fields, config = {}) {
    this.entity = entity;
    this.fields = fields;
    this.config = config;
  }

  /**
   * Render method - returns component info for Vue
   * @returns {Object} { component, props }
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Get schema for this view type
   * @returns {Object} { requiredFields, optionalFields, configSchema }
   */
  getSchema() {
    throw new Error('getSchema() must be implemented by subclass');
  }

  /**
   * Validate view config against entity
   * @returns {Array} Array of validation errors (empty if valid)
   */
  validate() {
    throw new Error('validate() must be implemented by subclass');
  }
}

export class ViewRegistry {
  constructor() {
    this.views = new Map();
  }

  /**
   * Register a view type
   * @param {string} type - View type identifier (e.g., 'list', 'grid')
   * @param {Class} ViewAdapterClass - Class extending BaseViewAdapter
   */
  register(type, ViewAdapterClass) {
    if (!ViewAdapterClass.prototype instanceof BaseViewAdapter) {
      throw new Error(`${type} must extend BaseViewAdapter`);
    }
    this.views.set(type, ViewAdapterClass);
  }

  /**
   * Resolve a view adapter instance
   * @param {string} type
   * @param {Object} entity
   * @param {Array} fields
   * @param {Object} config
   * @returns {BaseViewAdapter} Adapter instance
   * @throws {Error} If view type not registered
   */
  resolve(type, entity, fields, config = {}) {
    const ViewAdapterClass = this.views.get(type);
    if (!ViewAdapterClass) {
      throw new Error(`View type '${type}' not registered`);
    }
    return new ViewAdapterClass(entity, fields, config);
  }

  /**
   * Get list of available view types
   * @returns {Array} Type identifiers
   */
  getAvailableTypes() {
    return Array.from(this.views.keys());
  }

  /**
   * Create view config with defaults
   * @param {Object} entity
   * @param {Array} fields
   * @param {string} viewType
   * @param {Object} options
   * @returns {Object} { type, config, schema }
   */
  createViewConfig(entity, fields, viewType, options = {}) {
    const adapter = this.resolve(viewType, entity, fields, options);
    const schema = adapter.getSchema();
    
    return {
      type: viewType,
      config: options,
      schema,
    };
  }
}

export const viewRegistry = new ViewRegistry();
```

- [ ] **Step 2: Test ViewRegistry registration and resolution**

Create `/opt/Lume/backend/tests/unit/view-registry.test.js`:

```javascript
import { describe, it, expect } from '@jest/globals';
import { ViewRegistry, BaseViewAdapter } from '../../src/core/services/view-registry.js';

describe('ViewRegistry', () => {
  it('should register and resolve view adapter', () => {
    class ListViewAdapter extends BaseViewAdapter {
      render() {
        return { component: 'ListView', props: {} };
      }
      getSchema() {
        return { requiredFields: [], optionalFields: [] };
      }
      validate() {
        return [];
      }
    }

    const registry = new ViewRegistry();
    registry.register('list', ListViewAdapter);
    
    const adapter = registry.resolve('list', {}, [], {});
    
    expect(adapter).toBeInstanceOf(ListViewAdapter);
  });

  it('should throw error on unregistered view type', () => {
    const registry = new ViewRegistry();
    
    expect(() => registry.resolve('nonexistent', {}, [])).toThrow("View type 'nonexistent' not registered");
  });

  it('should list available view types', () => {
    class ListViewAdapter extends BaseViewAdapter {
      render() { return {}; }
      getSchema() { return {}; }
      validate() { return []; }
    }
    
    class GridViewAdapter extends BaseViewAdapter {
      render() { return {}; }
      getSchema() { return {}; }
      validate() { return []; }
    }

    const registry = new ViewRegistry();
    registry.register('list', ListViewAdapter);
    registry.register('grid', GridViewAdapter);
    
    const types = registry.getAvailableTypes();
    
    expect(types).toContain('list');
    expect(types).toContain('grid');
  });

  it('should validate adapter must extend BaseViewAdapter', () => {
    class InvalidAdapter {}
    
    const registry = new ViewRegistry();
    
    expect(() => registry.register('invalid', InvalidAdapter)).toThrow('must extend BaseViewAdapter');
  });
});
```

- [ ] **Step 3: Run ViewRegistry tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/unit/view-registry.test.js
```

Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/core/services/view-registry.js backend/tests/unit/view-registry.test.js
git commit -m "feat: implement ViewRegistry plugin system for view adapters"
```

---

### Task 5: Implement SyncService - Code-First Loading

**Files:**
- Create: `backend/src/core/services/sync.service.js`
- Create: `backend/src/entities/` directory
- Create: `backend/src/entities/contact.entity.yaml` (example)

**Context:** SyncService loads code-first entity definitions from YAML files in `/backend/src/entities/`. Parses YAML, validates structure, and syncs to database. One-way sync initially (code → DB).

- [ ] **Step 1: Create entities directory and example**

```bash
mkdir -p /opt/Lume/backend/src/entities
```

Create `/opt/Lume/backend/src/entities/contact.entity.yaml`:

```yaml
name: Contact
slug: contact
icon: user
color: '#3b82f6'
description: 'Customer contact information'
isPublishable: true
fields:
  - slug: firstName
    name: First Name
    type: text
    label: 'First Name'
    required: true
    position: 1
  - slug: email
    name: Email
    type: email
    label: 'Email Address'
    required: true
    unique: true
    position: 2
  - slug: phone
    name: Phone
    type: phone
    label: 'Phone Number'
    position: 3
  - slug: status
    name: Status
    type: select
    label: 'Contact Status'
    validation: '{"enum": ["active", "inactive", "prospect"]}'
    position: 4
views:
  - name: 'All Contacts'
    type: list
    isDefault: true
    config:
      fieldOrder: ['firstName', 'email', 'phone', 'status']
      sortBy: { field: 'firstName', order: 'asc' }
```

- [ ] **Step 2: Install YAML parser**

```bash
cd /opt/Lume/backend
npm install --save yaml
```

- [ ] **Step 3: Create SyncService with code loading**

Create `/opt/Lume/backend/src/core/services/sync.service.js`:

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { db } from '../db/drizzle.js';
import { customEntities, entityFields, entityViews, entitySyncHistory } from '../../modules/base/models/schema.js';
import { eq } from 'drizzle-orm';
import { entityService } from './entity.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SyncService {
  /**
   * Load and parse YAML entity definitions
   * @param {string} entitiesDir - Directory path
   * @returns {Array} Array of parsed entity definitions
   */
  async loadCodeDefinitions(entitiesDir) {
    const definitions = [];
    
    if (!fs.existsSync(entitiesDir)) {
      return definitions;
    }
    
    const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    
    for (const file of files) {
      const filePath = path.join(entitiesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const definition = YAML.parse(content);
      
      if (definition) {
        definition._file = file;
        definitions.push(definition);
      }
    }
    
    return definitions;
  }

  /**
   * Sync code definitions into database
   * @param {Array} codeDefs - Array of entity definitions
   * @param {Object} options - { onConflict: 'code-wins' | 'db-wins' | 'merge' }
   * @returns {Object} { created, updated, synced }
   */
  async syncToDb(codeDefs, options = {}) {
    const { onConflict = 'merge' } = options;
    const results = { created: 0, updated: 0, synced: 0, errors: [] };
    
    for (const codeDef of codeDefs) {
      try {
        // Check if entity exists
        const existing = await db
          .select()
          .from(customEntities)
          .where(eq(customEntities.slug, codeDef.slug))
          .limit(1);
        
        if (existing.length > 0) {
          // Update existing
          const entity = existing[0];
          await entityService.updateEntity(entity.id, {
            name: codeDef.name,
            description: codeDef.description,
            icon: codeDef.icon,
            color: codeDef.color,
            isPublishable: codeDef.isPublishable !== false,
          });
          
          // Sync fields
          const existingFields = await entityService.getFieldsByEntity(entity.id);
          const codeFieldSlugs = (codeDef.fields || []).map(f => f.slug);
          
          // Remove fields not in code
          for (const field of existingFields) {
            if (!codeFieldSlugs.includes(field.slug)) {
              await entityService.deleteField(field.id);
            }
          }
          
          // Create/update fields from code
          for (const fieldDef of codeDef.fields || []) {
            const existing = existingFields.find(f => f.slug === fieldDef.slug);
            if (existing) {
              await entityService.updateField(existing.id, fieldDef);
            } else {
              await entityService.createField(entity.id, fieldDef);
            }
          }
          
          // Sync views
          await this.syncViewsForEntity(entity.id, codeDef.views || []);
          
          // Record sync
          await db.insert(entitySyncHistory).values({
            entityId: entity.id,
            source: 'code',
            action: 'update',
            changes: JSON.stringify({ updated: codeDef.slug }),
            status: 'synced',
          });
          
          results.updated++;
        } else {
          // Create new entity
          const entity = await entityService.createEntity({
            name: codeDef.name,
            slug: codeDef.slug,
            description: codeDef.description,
            icon: codeDef.icon,
            color: codeDef.color,
            isPublishable: codeDef.isPublishable !== false,
          });
          
          // Create fields
          for (const fieldDef of codeDef.fields || []) {
            await entityService.createField(entity.id, fieldDef);
          }
          
          // Create views
          await this.syncViewsForEntity(entity.id, codeDef.views || []);
          
          // Record sync
          await db.insert(entitySyncHistory).values({
            entityId: entity.id,
            source: 'code',
            action: 'create',
            changes: JSON.stringify({ created: codeDef.slug }),
            status: 'synced',
          });
          
          results.created++;
        }
        
        results.synced++;
      } catch (error) {
        results.errors.push({
          entity: codeDef.slug,
          error: error.message,
        });
      }
    }
    
    return results;
  }

  /**
   * Sync views for an entity
   * @private
   */
  async syncViewsForEntity(entityId, viewDefs) {
    const existing = await db
      .select()
      .from(entityViews)
      .where(eq(entityViews.entityId, entityId));
    
    // Remove existing views
    for (const view of existing) {
      await db.delete(entityViews).where(eq(entityViews.id, view.id));
    }
    
    // Create new views from code
    for (const viewDef of viewDefs) {
      await db.insert(entityViews).values({
        entityId,
        name: viewDef.name,
        type: viewDef.type,
        isDefault: viewDef.isDefault || false,
        config: JSON.stringify(viewDef.config || {}),
      });
    }
  }

  /**
   * Export entity to code format (YAML)
   * @param {number} entityId
   * @returns {string} YAML content
   */
  async syncToCode(entityId) {
    const entity = await entityService.getEntity(entityId);
    if (!entity) return null;
    
    const codeEntity = {
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      icon: entity.icon,
      color: entity.color,
      isPublishable: entity.isPublishable,
      fields: entity.fields.map(f => ({
        slug: f.slug,
        name: f.name,
        type: f.type,
        label: f.label,
        description: f.description,
        required: f.required,
        unique: f.unique,
        validation: f.validation ? JSON.parse(f.validation) : undefined,
        position: f.position,
        defaultValue: f.defaultValue,
      })),
      views: entity.views.map(v => ({
        name: v.name,
        type: v.type,
        isDefault: v.isDefault,
        config: v.config,
      })),
    };
    
    return YAML.stringify(codeEntity, { indent: 2 });
  }
}

export const syncService = new SyncService();
```

- [ ] **Step 4: Test code loading**

Create `/opt/Lume/backend/tests/unit/sync.service.test.js`:

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { syncService } from '../../src/core/services/sync.service.js';
import { entityService } from '../../src/core/services/entity.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('SyncService', () => {
  it('should load YAML entity definitions', async () => {
    const entitiesDir = path.join(__dirname, '../../src/entities');
    const defs = await syncService.loadCodeDefinitions(entitiesDir);
    
    expect(defs.length).toBeGreaterThan(0);
    const contactDef = defs.find(d => d.slug === 'contact');
    expect(contactDef).toBeDefined();
    expect(contactDef.name).toBe('Contact');
  });

  it('should sync code definitions to database', async () => {
    const defs = [
      {
        name: 'TestEntity',
        slug: 'test-entity',
        icon: 'test',
        fields: [
          { slug: 'name', name: 'Name', type: 'text', label: 'Name', position: 1 },
        ],
        views: [],
      }
    ];
    
    const result = await syncService.syncToDb(defs);
    
    expect(result.created).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.errors).toHaveLength(0);
    
    const entity = await entityService.getEntity(1);
    expect(entity.name).toBe('TestEntity');
    expect(entity.fields).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Run sync tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/unit/sync.service.test.js
```

Expected: Both tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/entities/ backend/src/core/services/sync.service.js backend/tests/unit/sync.service.test.js backend/package.json
git commit -m "feat: implement SyncService for loading code-first YAML entity definitions"
```

---

### Task 6: Implement Publish/Unpublish and Access Control

**Files:**
- Modify: `backend/src/core/services/entity.service.js`
- Modify: `backend/src/core/middleware/entityAccess.js` (create)

**Context:** Add publish/unpublish methods to EntityService. Create middleware to filter entities based on access level (admin-only vs. public).

- [ ] **Step 1: Add publish methods to EntityService**

Edit `/opt/Lume/backend/src/core/services/entity.service.js` — add before closing brace:

```javascript
  /**
   * Publish entity to public API
   * @param {number} id
   * @returns {Object} Updated entity
   * @throws {Error} If entity not publishable
   */
  async publishEntity(id) {
    const entity = await this.getEntity(id);
    if (!entity) throw new Error('Entity not found');
    if (!entity.isPublishable) {
      throw new Error('Entity is not marked as publishable');
    }
    
    const result = await db
      .update(customEntities)
      .set({
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(eq(customEntities.id, id))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Unpublish entity (admin-only)
   * @param {number} id
   * @returns {Object} Updated entity
   */
  async unpublishEntity(id) {
    const result = await db
      .update(customEntities)
      .set({
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(eq(customEntities.id, id))
      .returning();
    
    return result[0] || null;
  }

  /**
   * Get published entities only
   * @returns {Array} Published entities
   */
  async getPublishedEntities() {
    return db
      .select()
      .from(customEntities)
      .where(and(eq(customEntities.isPublished, true), isNull(customEntities.deletedAt)));
  }
```

- [ ] **Step 2: Add tests for publish methods**

Add to `/opt/Lume/backend/tests/unit/entity.service.test.js`:

```javascript
  it('should publish publishable entity', async () => {
    const entity = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
      isPublishable: true,
    });
    
    const published = await entityService.publishEntity(entity.id);
    
    expect(published.isPublished).toBe(true);
  });

  it('should not publish non-publishable entity', async () => {
    const entity = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
      isPublishable: false,
    });
    
    expect(() => entityService.publishEntity(entity.id)).rejects.toThrow('not marked as publishable');
  });

  it('should get only published entities', async () => {
    const entity1 = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
      isPublishable: true,
    });
    
    const entity2 = await entityService.createEntity({
      name: 'Internal',
      slug: 'internal',
      isPublishable: false,
    });
    
    await entityService.publishEntity(entity1.id);
    const published = await entityService.getPublishedEntities();
    
    expect(published).toHaveLength(1);
    expect(published[0].id).toBe(entity1.id);
  });
```

- [ ] **Step 3: Create entity access middleware**

Create `/opt/Lume/backend/src/core/middleware/entityAccess.js`:

```javascript
/**
 * Entity access middleware - filters custom entities based on access level
 * Admins see all entities, public API sees only published entities
 */

export const entityAccessMiddleware = (req, res, next) => {
  // Mark if this is a public request
  const isPublicRoute = req.path.startsWith('/api/public/');
  
  // Add filter function to request
  req.getEntityFilter = function() {
    if (isPublicRoute) {
      return { isPublished: true, deletedAt: null };
    }
    // Admin sees all (non-deleted)
    return { deletedAt: null };
  };
  
  next();
};

export default entityAccessMiddleware;
```

- [ ] **Step 4: Run publish tests**

```bash
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/unit/entity.service.test.js
```

Expected: All 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/core/services/entity.service.js backend/src/core/middleware/entityAccess.js backend/tests/unit/entity.service.test.js
git commit -m "feat: add entity publish/unpublish and access control"
```

---

### Task 7: Register Entity Routes (Admin CRUD API)

**Files:**
- Modify: `backend/src/modules/base/__init__.js`

**Context:** Register Express routes for entity CRUD operations. Routes follow RESTful pattern: GET /api/entities, POST /api/entities, etc.

- [ ] **Step 1: Read base module __init__.js**

```bash
head -80 /opt/Lume/backend/src/modules/base/__init__.js
```

Expected: See module initialization pattern with router setup.

- [ ] **Step 2: Create entity routes file**

Create `/opt/Lume/backend/src/modules/base/api/entity.routes.js`:

```javascript
import { Router } from 'express';
import { entityService } from '../../../core/services/entity.service.js';

const router = Router();

/**
 * POST /api/entities
 * Create a new entity
 */
router.post('/', async (req, res) => {
  try {
    const { name, slug, description, icon, color, isPublishable } = req.body;
    
    const entity = await entityService.createEntity({
      name,
      slug,
      description,
      icon,
      color,
      isPublishable,
    });
    
    res.json({
      success: true,
      data: entity,
      message: 'Entity created',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
});

/**
 * GET /api/entities
 * List all entities
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await entityService.listEntities({ page: parseInt(page), limit: parseInt(limit) });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/entities/:id
 * Get single entity with fields and views
 */
router.get('/:id', async (req, res) => {
  try {
    const entity = await entityService.getEntity(parseInt(req.params.id));
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }
    
    res.json({
      success: true,
      data: entity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/entities/:id
 * Update entity
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, description, icon, color, isPublishable } = req.body;
    
    const entity = await entityService.updateEntity(parseInt(req.params.id), {
      name,
      description,
      icon,
      color,
      isPublishable,
    });
    
    res.json({
      success: true,
      data: entity,
      message: 'Entity updated',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/entities/:id
 * Delete entity (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const entity = await entityService.deleteEntity(parseInt(req.params.id));
    
    res.json({
      success: true,
      data: entity,
      message: 'Entity deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/entities/:id/publish
 * Publish entity to public API
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const entity = await entityService.publishEntity(parseInt(req.params.id));
    
    res.json({
      success: true,
      data: entity,
      message: 'Entity published',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/entities/:id/unpublish
 * Unpublish entity
 */
router.post('/:id/unpublish', async (req, res) => {
  try {
    const entity = await entityService.unpublishEntity(parseInt(req.params.id));
    
    res.json({
      success: true,
      data: entity,
      message: 'Entity unpublished',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
```

- [ ] **Step 3: Create field routes**

Create `/opt/Lume/backend/src/modules/base/api/field.routes.js`:

```javascript
import { Router } from 'express';
import { entityService } from '../../../core/services/entity.service.js';

const router = Router();

/**
 * POST /api/entities/:entityId/fields
 * Create field
 */
router.post('/:entityId/fields', async (req, res) => {
  try {
    const { slug, name, type, label, description, required, unique, validation, position, defaultValue } = req.body;
    
    const field = await entityService.createField(parseInt(req.params.entityId), {
      slug,
      name,
      type,
      label,
      description,
      required,
      unique,
      validation,
      position,
      defaultValue,
    });
    
    res.json({
      success: true,
      data: field,
      message: 'Field created',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors || {},
    });
  }
});

/**
 * GET /api/entities/:entityId/fields
 * Get entity fields
 */
router.get('/:entityId/fields', async (req, res) => {
  try {
    const fields = await entityService.getFieldsByEntity(parseInt(req.params.entityId));
    
    res.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/entity-fields/:fieldId
 * Update field
 */
router.put('/:fieldId', async (req, res) => {
  try {
    const { name, label, description, required, unique, validation, position, defaultValue } = req.body;
    
    const field = await entityService.updateField(parseInt(req.params.fieldId), {
      name,
      label,
      description,
      required,
      unique,
      validation,
      position,
      defaultValue,
    });
    
    res.json({
      success: true,
      data: field,
      message: 'Field updated',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/entity-fields/:fieldId
 * Delete field
 */
router.delete('/:fieldId', async (req, res) => {
  try {
    const field = await entityService.deleteField(parseInt(req.params.fieldId));
    
    res.json({
      success: true,
      data: field,
      message: 'Field deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
```

- [ ] **Step 4: Register routes in base module __init__.js**

Edit `/opt/Lume/backend/src/modules/base/__init__.js` — find the router registration section and add:

```javascript
import entityRoutes from './api/entity.routes.js';
import fieldRoutes from './api/field.routes.js';

// ... in the __init__ function, after other route registrations:

router.use('/entities', entityRoutes);
router.use('/entity-fields', fieldRoutes);
router.use('/entities/:entityId/fields', fieldRoutes);
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/base/api/entity.routes.js backend/src/modules/base/api/field.routes.js backend/src/modules/base/__init__.js
git commit -m "feat: register entity and field CRUD API routes"
```

---

### Task 8: Initialize SyncService on Startup

**Files:**
- Modify: `backend/src/index.js`

**Context:** Load code-first entity definitions on server startup. Run sync to keep code and DB in sync automatically.

- [ ] **Step 1: Add sync initialization to backend startup**

Edit `/opt/Lume/backend/src/index.js` — find the initialization section (after database connects), add:

```javascript
import { syncService } from './core/services/sync.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// After database initialization and module loading...

// Sync code-first entity definitions
try {
  const entitiesDir = path.join(__dirname, 'entities');
  const codeDefs = await syncService.loadCodeDefinitions(entitiesDir);
  const syncResult = await syncService.syncToDb(codeDefs);
  logger.info(`Entity sync complete: ${syncResult.created} created, ${syncResult.updated} updated`, {
    errors: syncResult.errors,
  });
} catch (error) {
  logger.warn('Entity sync skipped or failed', { error: error.message });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: initialize entity sync service on server startup"
```

---

### Task 9: Create Admin UI - Entity Builder Form

**Files:**
- Create: `backend/src/modules/base/static/views/entities/index.vue`
- Create: `backend/src/modules/base/static/views/entities/entity-editor.vue`

**Context:** Vue components for the admin panel. Entity list view with CRUD buttons, and entity editor form for creating/editing entities.

Due to length, Phase 1 implementation plan is substantial. **Do you want me to:**

1. **Continue with remaining Phase 1 tasks** (Admin UI, verification, testing) in this same document
2. **Save this Phase 1 section now** and create separate implementation files for Phase 2-3

### Task 9: Create Admin UI - Entity Builder

**Files:**
- Create: `backend/src/modules/base/static/views/entities/index.vue`
- Create: `backend/src/modules/base/static/views/entities/entity-editor.vue`
- Create: `backend/src/modules/base/static/views/entities/field-editor.vue`

**Context:** Vue 3 SFC components for entity management. List view showing all entities with create/edit/delete buttons. Editor forms for creating/updating entities and fields.

- [ ] **Step 1: Create entity list view**

Create `/opt/Lume/backend/src/modules/base/static/views/entities/index.vue`:

```vue
<template>
  <div class="entities-page">
    <div class="page-header">
      <h1>Custom Entities</h1>
      <a-button type="primary" @click="showEntityEditor = true">
        <template #icon><PlusOutlined /></template>
        New Entity
      </a-button>
    </div>

    <a-table 
      :columns="columns" 
      :data-source="entities" 
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="editEntity(record)">Edit</a-button>
            <a-button type="link" size="small" danger @click="deleteEntity(record.id)">Delete</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <entity-editor 
      v-if="showEntityEditor"
      :entity="selectedEntity"
      @close="showEntityEditor = false"
      @save="handleEntitySaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { entityApi } from '../../api/entity';
import EntityEditor from './entity-editor.vue';

const entities = ref([]);
const loading = ref(false);
const showEntityEditor = ref(false);
const selectedEntity = ref(null);
const pagination = ref({ current: 1, pageSize: 20 });

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Slug', dataIndex: 'slug', key: 'slug', width: 150 },
  { title: 'Publishable', dataIndex: 'isPublishable', key: 'isPublishable', render: (_, record) => record.isPublishable ? 'Yes' : 'No' },
  { title: 'Published', dataIndex: 'isPublished', key: 'isPublished', render: (_, record) => record.isPublished ? 'Yes' : 'No' },
  { title: 'Action', key: 'action', width: 120 },
];

const loadEntities = async () => {
  loading.value = true;
  try {
    const result = await entityApi.getEntities();
    entities.value = result.items;
    pagination.value.total = result.total;
  } catch (error) {
    message.error(error.message);
  } finally {
    loading.value = false;
  }
};

const editEntity = (record) => {
  selectedEntity.value = record;
  showEntityEditor.value = true;
};

const deleteEntity = async (id) => {
  try {
    await entityApi.deleteEntity(id);
    message.success('Entity deleted');
    loadEntities();
  } catch (error) {
    message.error(error.message);
  }
};

const handleEntitySaved = () => {
  showEntityEditor.value = false;
  selectedEntity.value = null;
  loadEntities();
};

const handleTableChange = (pag) => {
  pagination.value = pag;
  loadEntities();
};

onMounted(loadEntities);
</script>
```

- [ ] **Step 2: Create entity editor form**

Create `/opt/Lume/backend/src/modules/base/static/views/entities/entity-editor.vue`:

```vue
<template>
  <a-modal
    :title="entity ? 'Edit Entity' : 'New Entity'"
    :open="true"
    @ok="handleSave"
    @cancel="$emit('close')"
    width="600px"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item label="Name" required>
        <a-input v-model:value="form.name" placeholder="Entity name" />
      </a-form-item>

      <a-form-item label="Slug" required>
        <a-input v-model:value="form.slug" placeholder="entity-slug" />
      </a-form-item>

      <a-form-item label="Description">
        <a-textarea v-model:value="form.description" rows="2" />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Icon">
            <a-input v-model:value="form.icon" placeholder="user" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Color">
            <a-color-picker v-model:value="form.color" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item>
        <a-checkbox v-model:checked="form.isPublishable">Mark as publishable</a-checkbox>
      </a-form-item>
    </a-form>

    <a-divider>Fields</a-divider>

    <div class="fields-list">
      <field-editor 
        v-for="field in form.fields" 
        :key="field.id || field.slug"
        :field="field"
        @update="updateField"
        @delete="removeField"
      />
    </div>

    <a-button type="dashed" block @click="addField">
      <template #icon><PlusOutlined /></template>
      Add Field
    </a-button>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { entityApi } from '../../api/entity';
import FieldEditor from './field-editor.vue';

const props = defineProps({
  entity: Object,
});

const emit = defineEmits(['close', 'save']);

const form = ref({
  name: '',
  slug: '',
  description: '',
  icon: '',
  color: '',
  isPublishable: false,
  fields: [],
});

watch(() => props.entity, (val) => {
  if (val) {
    form.value = { ...val, fields: val.fields || [] };
  }
});

const addField = () => {
  form.value.fields.push({
    slug: '',
    name: '',
    type: 'text',
    label: '',
    position: form.value.fields.length,
  });
};

const updateField = (index, field) => {
  form.value.fields[index] = field;
};

const removeField = (index) => {
  form.value.fields.splice(index, 1);
};

const handleSave = async () => {
  try {
    if (props.entity) {
      await entityApi.updateEntity(props.entity.id, form.value);
      message.success('Entity updated');
    } else {
      await entityApi.createEntity(form.value);
      message.success('Entity created');
    }
    emit('save');
  } catch (error) {
    message.error(error.message);
  }
};
</script>
```

- [ ] **Step 3: Create field editor component**

Create `/opt/Lume/backend/src/modules/base/static/views/entities/field-editor.vue`:

```vue
<template>
  <a-card class="field-card" :title="`Field: ${field.label || field.slug}`">
    <a-form :model="field" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Slug">
            <a-input v-model:value="field.slug" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Label">
            <a-input v-model:value="field.label" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Type">
        <a-select v-model:value="field.type">
          <a-select-option value="text">Text</a-select-option>
          <a-select-option value="email">Email</a-select-option>
          <a-select-option value="number">Number</a-select-option>
          <a-select-option value="date">Date</a-select-option>
          <a-select-option value="select">Select</a-select-option>
          <a-select-option value="rich-text">Rich Text</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="field.required">Required</a-checkbox>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-model:checked="field.unique">Unique</a-checkbox>
      </a-form-item>
    </a-form>

    <a-button type="link" danger size="small" @click="$emit('delete')">Delete Field</a-button>
  </a-card>
</template>

<script setup>
defineProps({
  field: Object,
});

defineEmits(['update', 'delete']);
</script>

<style scoped>
.field-card {
  margin-bottom: 16px;
}
</style>
```

- [ ] **Step 4: Create entity API client**

Create `/opt/Lume/backend/src/modules/base/static/api/entity.ts`:

```typescript
import { get, post, put, del } from '@/api/request';

export const entityApi = {
  // Entities
  createEntity: (data: any) => post('/api/entities', data),
  getEntities: (page = 1, limit = 20) => get('/api/entities', { params: { page, limit } }),
  getEntity: (id: number) => get(`/api/entities/${id}`),
  updateEntity: (id: number, data: any) => put(`/api/entities/${id}`, data),
  deleteEntity: (id: number) => del(`/api/entities/${id}`),
  publishEntity: (id: number) => post(`/api/entities/${id}/publish`, {}),
  unpublishEntity: (id: number) => post(`/api/entities/${id}/unpublish`, {}),

  // Fields
  createField: (entityId: number, data: any) => post(`/api/entities/${entityId}/fields`, data),
  updateField: (fieldId: number, data: any) => put(`/api/entity-fields/${fieldId}`, data),
  deleteField: (fieldId: number) => del(`/api/entity-fields/${fieldId}`),
};
```

- [ ] **Step 5: Register entity views in router**

Edit `/opt/Lume/frontend/apps/web-lume/src/router/index.ts` — add to customViews map:

```typescript
customViews: {
  // ... existing views
  'entities': () => import('@modules/base/static/views/entities/index.vue'),
}
```

- [ ] **Step 6: Add entity menu item**

Edit `/opt/Lume/backend/src/modules/base/__manifest__.js` — add to menus:

```javascript
menus: [
  // ... existing menus
  {
    path: 'entities',
    label: 'Custom Entities',
    icon: 'grid',
    order: 1000,
  },
]
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/base/static/views/entities/ backend/src/modules/base/static/api/entity.ts frontend/apps/web-lume/src/router/index.ts backend/src/modules/base/__manifest__.js
git commit -m "feat: implement entity builder admin UI (list, create, edit, delete)"
```

---

### Task 10: Test Phase 1 Integration

**Files:**
- Create: `backend/tests/integration/entity-builder.test.js`

- [ ] **Step 1: Write integration test for full entity workflow**

Create `/opt/Lume/backend/tests/integration/entity-builder.test.js`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/index.js';
import { entityService } from '../../src/core/services/entity.service.js';
import { db } from '../../src/core/db/drizzle.js';
import { customEntities } from '../../src/modules/base/models/schema.js';

describe('Entity Builder Integration', () => {
  beforeAll(async () => {
    await db.delete(customEntities);
  });

  afterAll(async () => {
    await db.delete(customEntities);
  });

  it('should create entity via API', async () => {
    const res = await request(app)
      .post('/api/entities')
      .send({
        name: 'Contact',
        slug: 'contact',
        description: 'Customer contact',
        icon: 'user',
        color: '#3b82f6',
        isPublishable: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('contact');
  });

  it('should list entities', async () => {
    await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
    });
    
    const res = await request(app).get('/api/entities');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('should create field via API', async () => {
    const entity = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
    });
    
    const res = await request(app)
      .post(`/api/entities/${entity.id}/fields`)
      .send({
        slug: 'firstName',
        name: 'First Name',
        type: 'text',
        label: 'First Name',
        required: true,
        position: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('firstname');
  });

  it('should publish entity', async () => {
    const entity = await entityService.createEntity({
      name: 'Contact',
      slug: 'contact',
      isPublishable: true,
    });
    
    const res = await request(app).post(`/api/entities/${entity.id}/publish`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.isPublished).toBe(true);
  });
});
```

- [ ] **Step 2: Run integration tests**

```bash
cd /opt/Lume/backend
NODE_OPTIONS='--experimental-vm-modules' npm test -- tests/integration/entity-builder.test.js
```

Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/integration/entity-builder.test.js
git commit -m "test: add entity builder integration tests (create, list, fields, publish)"
```

---

### Task 11: Phase 1 Verification and Documentation

- [ ] **Step 1: Verify all Phase 1 services initialize without errors**

```bash
cd /opt/Lume/backend
npm run dev
```

Expected: Server starts, no errors about entity tables or services. Logs should show "Entity sync complete".

- [ ] **Step 2: Test entity endpoints with curl**

```bash
# Create entity
curl -X POST http://localhost:3000/api/entities \
  -H "Content-Type: application/json" \
  -d '{"name":"Contact","slug":"contact","isPublishable":true}'

# List entities
curl http://localhost:3000/api/entities

# Publish entity
curl -X POST http://localhost:3000/api/entities/1/publish
```

Expected: All requests return 200 with success: true.

- [ ] **Step 3: Update architecture documentation**

Edit `/opt/Lume/docs/ARCHITECTURE.md` — add new section:

```markdown
## Entity Builder System (v2.1)

**Overview:** Admins can create custom entities with fields without writing code. Entities are synced bidirectionally with YAML definitions.

**Services:**
- **EntityService** — CRUD for entities, fields, views
- **ViewRegistry** — Plugin system for view types (list, grid, form, kanban, calendar, gallery)
- **SyncService** — Code-first YAML definitions synced to database

**API Routes:**
- `POST /api/entities` — Create entity
- `GET /api/entities` — List entities
- `PUT /api/entities/:id` — Update entity
- `DELETE /api/entities/:id` — Delete entity
- `POST /api/entities/:id/publish` — Publish to public API

**Admin UI:** `http://localhost:5173/#/entities` — Create and manage entities

**Code-First Definitions:** `/backend/src/entities/*.yaml` — YAML files synced on startup
```

- [ ] **Step 4: Create CHANGELOG entry**

Edit `/opt/Lume/CHANGELOG.md` (or create if doesn't exist):

```markdown
## [2.1.0] - 2026-04-22

### Added
- Entity builder system — create custom entities via admin UI
- Code-first entity definitions in YAML format
- Bidirectional sync between code and database
- ViewRegistry plugin system for future view types
- EntityService CRUD operations
- SyncService for loading and merging definitions

### Phase 1 Deliverables
- ✅ Entity CRUD API
- ✅ Field management API
- ✅ Admin UI for entity builder
- ✅ Code-first YAML support
- ✅ Bidirectional sync
- ✅ Integration tests

### Next: Phase 2
- List, Grid, Form view implementations
- Public API for publishable entities
```

- [ ] **Step 5: Final commit**

```bash
git add docs/ARCHITECTURE.md CHANGELOG.md
git commit -m "docs: update architecture and changelog for Phase 1 (v2.1) entity builder"
```

---

## Phase 2: Core Views (v2.2) — High-Level Summary

**Tasks 12-20 (outline):**

1. **Task 12:** Base view adapter class with render() and validate() interface
2. **Task 13:** ListViewAdapter — sortable, filterable table view
3. **Task 14:** GridViewAdapter — card-based layout with images
4. **Task 15:** FormViewAdapter — inline/modal form editor
5. **Task 16:** Admin view components (ListView, GridView, FormView Vue components)
6. **Task 17:** Public API routes (`/api/public/entities/*`)
7. **Task 18:** Public website entity display components
8. **Task 19:** Tests for all view types (unit + integration)
9. **Task 20:** Documentation and performance tuning

**Deliverables:**
- ✅ 3 core view types fully functional
- ✅ Public API for published entities
- ✅ Public website display support
- ✅ 15+ tests covering views

---

## Phase 3: Advanced Views (v2.3) — High-Level Summary

**Tasks 21-26 (outline):**

1. **Task 21:** KanbanViewAdapter — column-based with drag-drop (status field)
2. **Task 22:** CalendarViewAdapter — date-based timeline view
3. **Task 23:** GalleryViewAdapter — image grid with lightbox
4. **Task 24:** Advanced components (KanbanView, CalendarView, GalleryView)
5. **Task 25:** Tests for advanced views (unit + E2E)
6. **Task 26:** Performance optimization, caching, final documentation

**Deliverables:**
- ✅ 3 advanced view types
- ✅ Drag-drop interactions (kanban)
- ✅ Calendar selection and filtering
- ✅ Gallery lightbox and lazy loading
- ✅ 10+ tests covering advanced features

---

## Rollback Procedures

### Phase 1 Rollback
```bash
# Remove entity tables
npx drizzle-kit drop

# Revert commits
git reset --hard <before-phase1>

# Restart server
npm run dev
```

### Phase 2 Rollback
```bash
# Remove view tables (if any)
npx drizzle-kit drop

# Revert Phase 2 commits
git reset --hard <before-phase2>
```

---

## Success Criteria Checklist

- [ ] Phase 1: Entity creation/editing works in admin UI
- [ ] Phase 1: Code-first YAML definitions sync on startup
- [ ] Phase 1: All CRUD endpoints return correct responses
- [ ] Phase 2: List view renders entities with sorting/filtering
- [ ] Phase 2: Grid view displays entity cards
- [ ] Phase 2: Form view allows inline editing
- [ ] Phase 2: Public API returns published entities
- [ ] Phase 3: Kanban view with drag-drop works
- [ ] Phase 3: Calendar view shows date-based entries
- [ ] Phase 3: Gallery view with lightbox functional
- [ ] All: Integration tests pass (30+ tests total)
- [ ] All: Documentation updated (ARCHITECTURE, TESTING, MIGRATION_GUIDE)
- [ ] All: Zero breaking changes to existing modules