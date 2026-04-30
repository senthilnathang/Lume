# Phase 5: View System (Weeks 5-6)

## Overview

Phase 5 implements the view system that auto-generates rich UI views for any entity. From a single entity definition, five view types are automatically created: **Table** (data grid), **Form** (structured input), **Kanban** (status board), **Calendar** (date-based), and **Timeline** (date ranges).

## Completed Components

### 1. View Definition Structure

**File:** `backend/src/domains/view/view-definition.js`

Five view types with factory methods:

```javascript
// Table: Data grid with columns, sorting, filtering, inline edit
ViewDefinition.table(id, slug, {
  columns: ['title', 'status', 'priority'],
  pageSize: 25,
  allowInlineEdit: true,
  allowBulkSelect: true
})

// Form: Structured data entry with sections
ViewDefinition.form(id, slug, {
  sections: [
    { title: 'Basic Info', fields: [...] },
    { title: 'Details', fields: [...] }
  ],
  layout: { columns: 2 }
})

// Kanban: Status board with drag-to-update
ViewDefinition.kanban(id, slug, {
  groupBy: 'status',
  groupOrder: ['open', 'in_progress', 'closed'],
  groupColors: { open: '#FF6B6B', ... },
  allowDragDrop: true
})

// Calendar: Date-based event view
ViewDefinition.calendar(id, slug, {
  dateField: 'dueDate',
  titleField: 'title',
  colorField: 'priority',
  defaultView: 'month'
})

// Timeline: Date range with drag-to-resize
ViewDefinition.timeline(id, slug, {
  startDateField: 'startDate',
  endDateField: 'endDate',
  groupBy: 'assignedTo',
  allowDragResize: true
})
```

### 2. View Generator

**File:** `backend/src/domains/view/view-generator.js`

Auto-generates all applicable views from entity metadata:

- **generateDefaultViews(entity)** — Main entry point
  - Always generates: Table, Form
  - Conditional generation:
    - **Kanban**: If entity has `status` or `stage` select field
    - **Calendar**: If entity has `date` or `datetime` field
    - **Timeline**: If entity has both `startDate` and `endDate`

**Features:**
- Smart field selection (excludes computed, rich-text, readonly)
- Auto-detects field purposes (title, status, dates, colors)
- Humanizes field names for display (`assignedTo` → "Assigned To")
- Sensible defaults (pagination, sorting, grouping)
- Color mapping for standard status values

**Example:**
```javascript
const ticket = defineEntity({
  slug: 'ticket',
  fields: [
    defineField('title', 'text'),
    defineField('status', 'select', { 
      validation: [{ rule: 'enum', values: ['open', 'in_progress', 'closed'] }] 
    }),
    defineField('dueDate', 'date'),
    defineField('createdAt', 'date')
  ]
});

const views = ViewGenerator.generateDefaultViews(ticket);
// Returns: [table, form, kanban, calendar, timeline]
```

### 3. View Store

**File:** `backend/src/domains/view/view-store.js`

Central management of view definitions:

**Methods:**
- `register(slug, viewDef)` — Register view with validation
- `get(slug, id)` — Retrieve single view
- `getByEntity(slug)` — Get all views for entity
- `getByType(slug, type)` — Get views by type
- `getDefault(slug)` — Get default view for entity
- `update(slug, id, updates)` — Modify view definition
- `unregister(slug, id)` — Remove view
- `clear()` — Clear all views

**Validation rules:**
- Requires: id, slug, type, config
- Valid types: table, form, kanban, calendar, timeline
- Table: requires `columns` array
- Kanban: requires `groupBy` field
- Calendar: requires `dateField`
- Timeline: requires `startDateField` and `endDateField`

**Default views:**
- Views can be marked `default: true`
- Lookup returns first view if no default set
- Auto-removes default flag on deletion

### 4. View API Routes

**File:** `backend/src/api/view.routes.js`

REST endpoints for view management and data fetching:

**Endpoints:**

```
GET /api/{entity}/views
  → List all views for entity
  
GET /api/{entity}/views/{viewId}
  → Get view definition

POST /api/{entity}/views/{viewId}/data
  body: { filters, sort, page, pageSize }
  → Get data formatted for view type

POST /api/{entity}/views/{viewId}/export
  query: ?format=csv
  body: { filters }
  → Export view data (JSON or CSV)

PUT /api/{entity}/views/{viewId}
  body: { config updates }
  → Update view definition

DELETE /api/{entity}/views/{viewId}
  → Delete view
```

**Features:**
- Auto-includes view-specific fields in queries
- Formats data based on view type (groups for kanban, by-date for calendar)
- CSV export with proper escaping
- Pagination with sensible defaults
- Field projection (SELECT only needed columns)

### 5. Test Coverage

**Unit Tests:**

**`backend/tests/unit/view-generator.test.js`** (30+ tests)
- Default view generation for entity types
- Conditional view creation (kanban, calendar, timeline)
- Field filtering (excludes computed, rich-text, readonly)
- Table/Form/Kanban/Calendar/Timeline specific generation
- Field name humanization
- Error handling for invalid entities

**`backend/tests/unit/view-store.test.js`** (25+ tests)
- View registration and retrieval
- Get by type and by entity
- Default view management
- Update with re-validation
- Unregister and clear
- Comprehensive validation (required fields, type-specific rules)
- Multiple entities management

**Integration Tests:**

**`backend/tests/integration/view-system.test.js`** (15+ scenarios)
- End-to-end entity view generation and registration
- Project with timeline views
- User without kanban views
- Custom view registration and management
- Multiple views of same type
- View updates and migrations
- Field type filtering in different view types
- Complex CRM and supply chain view suites
- Full view lifecycle (register → update → unregister)

## Architecture

### View Generation Flow

```
EntityDefinition
    ↓
ViewGenerator.generateDefaultViews()
    ↓
Analyze fields:
  - Has status/stage select? → Add Kanban
  - Has date field? → Add Calendar
  - Has startDate + endDate? → Add Timeline
    ↓
For each view type:
  - Select appropriate fields
  - Set sensible defaults
  - Apply formatting rules
    ↓
Return [table, form, kanban?, calendar?, timeline?]
    ↓
ViewStore.register() for each view
    ↓
Central Registry
```

### Data Flow for View Requests

```
Client: GET /api/ticket/views/kanban/data
    ↓
ViewRoute: get(slug, viewId) from ViewStore
    ↓
Build OperationRequest:
  - action: 'list'
  - fields: view.config.displayFields + groupBy
  - filters/sort from request
    ↓
Runtime.execute() → PolicyEngine → QueryExecutor
    ↓
Get records with field permissions enforced
    ↓
ViewRoute: formatViewData(view, data)
  - For Kanban: group by status
  - For Calendar: group by date
  - For Timeline: add startDate/endDate
    ↓
Response: {
  success: true,
  data: formatted_data,
  metadata: { viewType, page, pageSize }
}
```

## Usage Example

```javascript
// Define entity once
const Ticket = defineEntity({
  slug: 'ticket',
  orm: 'drizzle',
  tableName: 'tickets',
  fields: [
    defineField('title', 'text', { required: true }),
    defineField('status', 'select', {
      validation: [{ rule: 'enum', values: ['open', 'in_progress', 'closed'] }]
    }),
    defineField('priority', 'select'),
    defineField('assignedTo', 'relation', { relation: 'User' }),
    defineField('dueDate', 'date'),
    defineField('createdAt', 'date'),
    defineField('description', 'text'),
  ]
});

// Auto-generate views
const views = ViewGenerator.generateDefaultViews(Ticket);

// Register all views
for (const view of views) {
  await viewStore.register(Ticket.slug, view);
}

// Now available automatically:
// GET /api/ticket/views → [
//   { id: "ticket_table", type: "table" },
//   { id: "ticket_form", type: "form" },
//   { id: "ticket_kanban", type: "kanban" },
//   { id: "ticket_calendar", type: "calendar" }
// ]

// Get table data
POST /api/ticket/views/ticket_table/data
  { filters: { status: 'open' }, page: 1, pageSize: 25 }
  → Returns paginated records

// Get kanban grouped by status
POST /api/ticket/views/ticket_kanban/data
  { }
  → Returns { open: [...], in_progress: [...], closed: [...] }

// Get calendar data
POST /api/ticket/views/ticket_calendar/data
  { }
  → Returns { "2026-05-01": [...], "2026-05-02": [...], ... }

// Export as CSV
POST /api/ticket/views/ticket_table/export?format=csv
  { filters: { status: 'closed' } }
  → Returns CSV file
```

## View Customization

Views can be customized after auto-generation:

```javascript
// Get generated kanban
const kanban = await viewStore.get('ticket', 'ticket_kanban');

// Customize
const customized = await viewStore.update('ticket', 'ticket_kanban', {
  config: {
    ...kanban.config,
    groupColors: {
      open: '#FF0000',
      'in_progress': '#FFFF00',
      closed: '#00FF00'
    },
    groupOrder: ['open', 'in_progress', 'closed'],
    displayFields: ['title', 'priority', 'assignedTo'],
  }
});
```

Multiple views can coexist:

```javascript
// Auto-generated default table
const allTickets = await viewStore.get('ticket', 'ticket_table');

// Custom views for specific workflows
const openTickets = ViewDefinition.table('open_tickets', 'ticket', {
  columns: ['title', 'priority', 'dueDate'],
  // Could add filters to view config for auto-filtering
});

const urgentTickets = ViewDefinition.table('urgent_tickets', 'ticket', {
  columns: ['title', 'assignedTo', 'dueDate'],
});

await viewStore.register('ticket', openTickets);
await viewStore.register('ticket', urgentTickets);
```

## Key Design Decisions

1. **Auto-generation**: Views created automatically from entity definition — zero configuration required
2. **Smart detection**: Kanban, Calendar, Timeline generated only if entity has appropriate fields
3. **Type-specific formatting**: Each view type receives pre-formatted data (grouped, sorted, etc.)
4. **Field filtering**: Computed, rich-text, and readonly fields excluded from appropriate views
5. **Multiple views per type**: Entities can have multiple table/form/kanban views for different use cases
6. **Default view**: Each entity has a default view returned if none specified
7. **Extensible**: Custom views can be created alongside auto-generated ones

## Next Phase (Phase 6: Agent System)

Phase 6 will implement reactive agents that automatically respond to entity changes:
- Trigger agents on onCreate/onUpdate/onDelete or via cron
- Agent actions: escalate (update fields), workflow trigger, mutate
- Cron scheduling for background execution
- Integration with event emitter for real-time triggering

## Testing Instructions

Run Phase 5 tests:
```bash
npm test -- view-generator.test.js
npm test -- view-store.test.js
npm test -- --testPathPattern=integration/view-system
```

Expected: 70+ passing tests covering:
- View generation logic
- View store operations
- Validation rules
- Integration scenarios
- Field type handling
- View lifecycle management

All tests should pass with >90% code coverage.
