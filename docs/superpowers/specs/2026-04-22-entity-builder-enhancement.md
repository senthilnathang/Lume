# Entity Builder Enhancement: Twenty Framework Patterns

**Date:** 2026-04-22  
**Status:** Design Approved  
**Scope:** Backend services + Vue 3 frontend components  
**Priority:** Core + relationships + advanced filtering

---

## Overview

Enhance Lume's Entity Builder with Twenty-inspired patterns for dynamic CRUD views (list, grid, form) with full relationship support, advanced filtering, and access control. The system allows users to create custom entities, define fields, create multiple views, and manage records all through a modular service architecture.

**Deliverables:**
- 6 backend services (RecordService, ViewRenderer, RelationshipService, FilterService, AccessControlService, + existing EntityBuilderService)
- 5 Vue 3 frontend components (list, grid, form, filter builder, relationship field)
- 3 new database tables (EntityRelationship, EntityRelationshipRecord, EntityFieldPermission)
- 80%+ test coverage for services, 60%+ for components

---

## Architecture

### Modular Service Design

Each service has a single responsibility and communicates through well-defined interfaces.

**EntityBuilderService** (existing, unchanged)
- Create/read/update/delete entities
- Add/update/delete fields
- Create/list views
- Responsibility: Entity metadata only

**RecordService** (NEW)
- Dynamic record CRUD for any entity
- Validates against entity schema
- Soft/hard delete support
- Calls: ViewRenderer, AccessControlService, RelationshipService
- Interface: `createRecord(entityId, data)`, `getRecord(recordId)`, `updateRecord(recordId, data)`, `deleteRecord(recordId)`, `listRecords(entityId, filters)`

**ViewRenderer** (NEW)
- Transforms view config into queryable format
- Handles view type specifics (list columns, grid layout, form fields)
- Returns metadata that frontend uses to render
- Called by: RecordService, API routes
- Interface: `renderView(viewId) → { type, fields, pagination, defaultSort }`

**RelationshipService** (NEW)
- Manages one-to-many and many-to-many relationships
- Creates/deletes relationship records
- Resolves linked entity data
- Prevents circular relationships
- Called by: RecordService, AccessControlService
- Interface: `linkRecords(sourceId, targetId, relationshipId)`, `resolveRelationships(records, entityId)`, `unlinkRecords(linkId)`

**FilterService** (NEW)
- Parses user filters into DB where-conditions
- Supports: eq, neq, gt, gte, lt, lte, in, contains, between, exists
- Applies sorting and grouping
- Called by: RecordService
- Interface: `applyFilters(query, filters) → modifiedQuery`, `applySorting(query, sortConfig)`, `applyGrouping(query, groupConfig)`

**AccessControlService** (NEW)
- Enforces company-scoped data isolation
- Filters records by company_id
- Enforces field-level read/write permissions
- Called by: RecordService, all other services
- Interface: `scopeQuery(query, userId, entityId)`, `enforceFieldPermissions(record, userId, fieldIds)`, `checkFieldWrite(userId, fieldId)`

---

## Data Models

### Existing Models (Extended)

**EntityRecord**
```prisma
model EntityRecord {
  id              Int      @id @default(autoincrement())
  entityId        Int      @map("entity_id")
  data            Json     // All field values as JSON
  createdBy       Int      @map("created_by")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at") // Soft delete
  companyId       Int?     @map("company_id") // NEW: For company scoping
  visibility      String   @default("private") // NEW: private/internal/public
  
  entity          Entity   @relation(fields: [entityId], references: [id])
  @@index([entityId])
  @@index([companyId])
  @@index([deletedAt])
  @@map("entity_records")
}
```

**EntityField** (add to existing)
```prisma
// In selectOptions JSON, add validation and relationship info:
{
  "validation": {
    "min": 0,
    "max": 100,
    "pattern": "^[a-z]+$",
    "customMessage": "Must be lowercase letters only"
  },
  "relationship": {
    "linkedEntityId": 5,
    "displayField": "name",
    "type": "many-to-one"
  }
}
```

### New Models

**EntityRelationship**
```prisma
model EntityRelationship {
  id                Int       @id @default(autoincrement())
  sourceEntityId    Int       @map("source_entity_id")
  targetEntityId    Int       @map("target_entity_id")
  type              String    // "one-to-many", "many-to-many"
  name              String    // Internal name (e.g., "orders")
  label             String    // Display label (e.g., "Customer Orders")
  reverseLabel      String?   @map("reverse_label") // For reverse direction
  cascadeDelete     Boolean   @default(false) @map("cascade_delete")
  createdAt         DateTime  @default(now()) @map("created_at")
  
  sourceEntity      Entity    @relation("source", fields: [sourceEntityId], references: [id])
  targetEntity      Entity    @relation("target", fields: [targetEntityId], references: [id])
  
  @@unique([sourceEntityId, targetEntityId, name], map: "entity_relationships_unique")
  @@index([targetEntityId])
  @@map("entity_relationships")
}
```

**EntityRelationshipRecord**
```prisma
model EntityRelationshipRecord {
  id               Int       @id @default(autoincrement())
  relationshipId   Int       @map("relationship_id")
  sourceRecordId   Int       @map("source_record_id")
  targetRecordId   Int       @map("target_record_id")
  createdAt        DateTime  @default(now()) @map("created_at")
  
  relationship     EntityRelationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  
  @@unique([relationshipId, sourceRecordId, targetRecordId], map: "entity_relationship_records_unique")
  @@index([targetRecordId])
  @@map("entity_relationship_records")
}
```

**EntityFieldPermission**
```prisma
model EntityFieldPermission {
  id        Int     @id @default(autoincrement())
  fieldId   Int     @map("field_id")
  roleId    Int     @map("role_id")
  canRead   Boolean @default(true) @map("can_read")
  canWrite  Boolean @default(true) @map("can_write")
  createdAt DateTime @default(now()) @map("created_at")
  
  field     EntityField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  role      Role    @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@unique([fieldId, roleId], map: "entity_field_permissions_unique")
  @@map("entity_field_permissions")
}
```

---

## API Endpoints

### Record CRUD

**POST /api/entities/:id/records** — Create record
```
Request body: { fieldName: value, ... }
Response: { success: true, data: { id, ...fields }, message: "..." }
         or { success: false, errors: { fieldName: "error" } }
Validation: Entity exists, fields valid, relationships exist, company scoped
```

**GET /api/entities/:id/records** — List records with filtering
```
Query params:
  - view: viewId (optional, determines columns/sorting)
  - page: 1
  - limit: 20
  - filters: JSON array of { field, operator, value }
  - sort: JSON { field, direction }

Response: { success: true, data: [...], pagination: { page, limit, total, hasMore } }
Access control: Only own company's records
```

**GET /api/entities/:id/records/:recordId** — Get single record
```
Response: { success: true, data: { id, ...fields with linked entity data } }
Access control: Company scoped, field-level permissions applied
```

**PUT /api/entities/:id/records/:recordId** — Update record
```
Request body: { fieldName: newValue, ... } (partial updates OK)
Response: { success: true, data: { id, ...updatedFields } }
Validation: Only changed fields validated, relationships checked
```

**DELETE /api/entities/:id/records/:recordId** — Delete record
```
Response: { success: true, message: "Record deleted" }
Behavior: Soft delete by default, hard delete if cascadeDelete=true
```

### View Rendering

**GET /api/entities/:id/views/:viewId/render** — Get view definition
```
Response: 
{
  success: true,
  data: {
    type: "list",
    columns: [
      { name: "id", label: "ID", type: "text", width: 80 },
      { name: "email", label: "Email", type: "text", width: 200 }
    ],
    pagination: { pageSize: 20, defaultPage: 1 },
    defaultSort: [{ field: "createdAt", direction: "desc" }],
    filters: [] (available filter options)
  }
}
Used by: Frontend to know what to render
```

### Relationships

**POST /api/entities/:id/records/:recordId/relationships** — Link records
```
Request body: { relationshipId, targetRecordId }
Response: { success: true, data: { id, sourceRecordId, targetRecordId } }
Validation: Both records exist, relationship exists, prevents cycles
```

**DELETE /api/entities/:id/records/:recordId/relationships/:relationshipId** — Unlink records
```
Response: { success: true }
```

---

## Frontend Components

### EntityListView.vue
Renders entity records in a table format with pagination, filtering, and inline actions.

**Props:**
- `entityId` (number, required) — Entity to display
- `viewId` (number, required) — View to use for columns/sorting
- `filters` (array, optional) — Initial filters to apply

**Features:**
- Fetch and render columns from view config
- Pagination controls (prev/next, page jump)
- Filter builder integration
- Inline edit or modal edit
- Bulk actions (delete, export)
- Sort by any column

**Internal State:**
- records: Array of displayed records
- page: Current page
- filters: Active filters
- sort: Current sort config

---

### EntityGridView.vue
Renders entity records as a card grid (gallery view).

**Props:**
- `entityId`, `viewId` — Same as EntityListView
- `gridConfig` — Grid size, card layout options

**Features:**
- Card layout with configurable image field
- Hover preview of related records
- Click to open record form
- Responsive grid

---

### EntityFormView.vue
Renders a form for creating/editing a single record.

**Props:**
- `entityId` — Entity being edited
- `recordId` (optional) — If editing existing record
- `mode` — "create" or "edit"

**Features:**
- Dynamic field rendering based on field types
- Relationship field with search/autocomplete
- Validation error display
- Save/cancel buttons
- Auto-save drafts (optional)

---

### FilterBuilder.vue
UI component for building complex filters.

**Props:**
- `entityId` — Entity to filter
- `filters` (array) — Current filters
- `onApply` (function) — Called when filters change

**Features:**
- Add/remove filter conditions
- AND/OR logic
- Field type-aware operators (number: gt/lt, text: contains, etc.)
- Date range picker for date fields

---

### RelationshipField.vue
Specialized field component for selecting linked entity records.

**Props:**
- `relationshipId` — Which relationship to use
- `value` — Currently selected record ID(s)
- `multiple` (boolean) — Allow multiple selections
- `onChange` (function)

**Features:**
- Search linked entity records
- Auto-complete dropdown
- Display selected with remove button
- Create new linked record (optional)

---

## Validation & Error Handling

### Field Validation Rules

For each field type:
- **text**: minLength, maxLength, pattern (regex), required
- **number**: min, max, required
- **select**: required, custom options validation
- **checkbox**: none
- **date**: minDate, maxDate, required
- **relationship**: record exists, user has access, prevents circular links

### Validation Flow

```
User submits record
  ↓
RecordService.createRecord(entityId, data)
  ↓
For each field in entity schema:
  1. Field exists? → Error if missing required
  2. Type matches? → Error if wrong type
  3. Custom validation? → Apply regex, min/max, etc.
  4. Relationship valid? → Check linked record exists
  ↓
Collect all errors
  ↓
If errors: return { success: false, errors: { field: "message" } }
If valid: create record, return { success: true, data: record }
```

### Error Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Must be a valid email address",
    "status": "Invalid option: must be one of 'active', 'inactive', 'pending'",
    "customerId": "Customer record does not exist"
  }
}
```

---

## Access Control

### Company Scoping
- All records have `companyId` field
- Users can only see/edit records from their company
- `AccessControlService.scopeQuery(query, userId, entityId)` automatically adds `WHERE company_id = user.company_id`

### Field-Level Permissions
- Optional per-field permissions via `EntityFieldPermission` table
- Admins can restrict read/write on sensitive fields
- `AccessControlService.enforceFieldPermissions(record, userId, fieldIds)` filters returned fields
- Attempting to write to restricted field throws 403

### Visibility Levels
- **private**: Only owner can see
- **internal**: Anyone in company can see
- **public**: Anyone can see (with company still enforcing at read level)

---

## Testing Strategy

### Unit Tests (80%+ coverage target)

**RecordService Tests**
- Create record with valid data → success
- Create record with missing required field → validation error
- Update field with wrong type → type error
- Soft delete and hard delete → both work
- Relationship validation → prevents invalid links
- Company scoping → user can't create record for other company

**FilterService Tests**
- Parse eq filter → correct SQL operator
- Parse between filter on dates → correct range
- Parse in operator → correct array handling
- Apply sorting → correct order
- Chain multiple filters with AND/OR → correct logic

**RelationshipService Tests**
- Create one-to-many link → record created
- Create many-to-many link → junction record created
- Prevent circular relationships → throws error
- Resolve relationships → populates linked entity data
- Cascade delete on delete → cleans up links

**AccessControlService Tests**
- Scope query by company → WHERE added
- Enforce field read permission → field filtered out
- Enforce field write permission → throws 403
- User from different company → no results

**ViewRenderer Tests**
- Render list view → columns match config
- Render grid view → gridSize applied
- Render form view → all fields present

### Integration Tests (60%+ coverage target)

**Workflow Tests**
- Create entity with 5 fields → entity created with all fields
- Add records to entity → records stored with values
- Filter records by field → correct subset returned
- Update record → changes persisted
- Delete record → soft-deleted (deletedAt set)
- Undelete record → restore record

**Relationship Tests**
- Create entity A → Create entity B → Link them → Create records in A → Link to B → Verify data populated
- Prevent circular links → throws error
- Cascade delete → all related records deleted

**Access Control Tests**
- User A creates record in company A → User B in company B can't see
- Admin restricts field → User can't read/write
- User tries to write restricted field → 403 error

**Frontend Component Tests**
- EntityListView renders data → table appears with correct columns
- Click filter → FilterBuilder opens
- Add filter → query updates, results filtered
- Click record → EntityFormView opens with data pre-filled
- Update field → save button enabled
- RelationshipField search → results appear

---

## Implementation Phases

**Phase 1: Backend Services** (RecordService, ViewRenderer, FilterService, AccessControlService, RelationshipService)
- Implement all 5 services with validation and error handling
- Create new database tables and Prisma migrations
- Write unit tests (80%+ coverage)
- Create API endpoints

**Phase 2: Frontend Components** (EntityListView, EntityGridView, EntityFormView, FilterBuilder, RelationshipField)
- Implement Vue 3 components
- Integrate with API
- Add form validation feedback
- Write component tests (60%+ coverage)

**Phase 3: Integration & Polish**
- End-to-end testing (create entity → add fields → create view → add records → filter)
- Performance optimization (caching, lazy loading)
- Documentation and examples
- Demo in admin panel

---

## Success Criteria

- ✅ All 5 backend services implemented with full CRUD
- ✅ Entity relationships (one-to-many, many-to-many) working
- ✅ Filtering, sorting, grouping on records
- ✅ Company scoping and field-level permissions enforced
- ✅ All Vue 3 components rendering and interactive
- ✅ 80%+ unit test coverage for services
- ✅ 60%+ test coverage for components
- ✅ No breaking changes to existing EntityBuilderService
- ✅ Documentation updated with examples
- ✅ Working demo in admin panel

---

## Dependencies & Constraints

- Maintain existing EntityBuilderService interface (no breaking changes)
- Use Prisma for new models (consistent with core DB)
- Vue 3 + TypeScript for components (per admin panel standards)
- Ant Design Vue for UI components
- Tailwind CSS for styling
- Jest for unit tests, Vitest for component tests
- All services follow Lume's existing patterns (DI, error handling, logging)

---
