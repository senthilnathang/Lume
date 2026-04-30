# Zero-Code App Generation Pipeline

**Status:** Design Specification  
**Version:** 2.0  
**Date:** 2026-04-30  
**Builds on:** [01-core-runtime-architecture.md](01-core-runtime-architecture.md)

## Overview

The zero-code generation pipeline automates the creation of complete CRUD applications from a single entity definition. When you register an entity with `defineEntity()` and add it to the `RuntimeRegistry`, the system automatically generates:

- **REST API** — Full CRUD endpoints with built-in filtering, sorting, pagination
- **GraphQL Schema** — Optional type definitions and resolvers
- **Form Views** — Dynamic forms rendered from field types
- **Table Views** — Sortable, filterable grids with inline editing
- **Workflows** — Standard CRUD lifecycle hooks (on-create, before-update, on-delete, etc.)

This document specifies *how* an entity definition flows through the generation system to produce these artifacts, following convention-over-configuration principles. Custom handlers are provided for teams that need to override default behavior.

---

## 1. Generation Pipeline Architecture

### 1.1 Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Entity Registration                                          │
│    defineEntity(name, fields, options)                          │
│    ↓                                                             │
│    RuntimeRegistry.register(entity)                             │
│    ↓                                                             │
│ 2. Validation & Analysis                                        │
│    ├─ Validate field definitions                                │
│    ├─ Detect relationships (FK, many-to-many)                   │
│    ├─ Infer permissions from fields                             │
│    └─ Check custom overrides                                    │
│    ↓                                                             │
│ 3. Generator Execution (parallel)                               │
│    ├─ API Generator                                             │
│    │  ├─ REST routes                                            │
│    │  └─ GraphQL schema (if enabled)                            │
│    │  ↓                                                          │
│    │  ApiEndpoints {                                            │
│    │    restRoutes: [{method, path, handler}]                   │
│    │    graphqlSchema: string                                   │
│    │  }                                                          │
│    │                                                             │
│    ├─ View Generator                                            │
│    │  ├─ Form template                                          │
│    │  └─ Table template                                         │
│    │  ↓                                                          │
│    │  ViewDefinitions {                                         │
│    │    form: {fields: [], layout, validation}                  │
│    │    table: {columns: [], sorting, filtering}                │
│    │  }                                                          │
│    │                                                             │
│    └─ Workflow Generator                                        │
│       ├─ on-create hooks                                        │
│       ├─ before-update hooks                                    │
│       ├─ after-update hooks                                     │
│       └─ on-delete hooks                                        │
│       ↓                                                          │
│       WorkflowDefinitions {                                     │
│         hooks: {onCreate, onBeforeUpdate, ...}                  │
│       }                                                          │
│    ↓                                                             │
│ 4. Registration & Activation                                    │
│    ├─ Register REST routes in router                            │
│    ├─ Register GraphQL resolvers (if enabled)                   │
│    ├─ Store view definitions in ViewRegistry                    │
│    ├─ Activate workflow hooks                                   │
│    └─ Create default RBAC permissions                           │
│    ↓                                                             │
│ 5. Output                                                       │
│    ├─ REST API ready at /api/{entity}                           │
│    ├─ Form view available for UI binding                        │
│    ├─ Table view available for UI binding                       │
│    └─ Workflows active in runtime                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Generators

| Generator | Input | Output | Triggers |
|-----------|-------|--------|----------|
| **ApiGenerator** | EntityDef, customRoutes | REST routes, GraphQL schema | On registration |
| **ViewGenerator** | EntityDef, field types, customViews | Form template, Table template | On registration |
| **WorkflowGenerator** | EntityDef, hooks | Workflow definitions | On registration |
| **PermissionGenerator** | EntityDef, fields | RBAC permissions | On registration |

### 1.3 Timing & Lifecycle

```
Registration Time (synchronous):
  - Entity definition parsed
  - Generators run in parallel
  - Routes registered in router
  - Views stored in registry
  - Permissions created

Runtime (asynchronous):
  - API endpoints respond to requests
  - Views render in UI
  - Workflows fire on entity events
  - Permissions enforced by middleware
```

---

## 2. Convention-Over-Configuration Rules

The system applies a set of predictable rules that make entity definitions minimal. Overrides are available but not required.

### 2.1 Field Naming & Mapping

**Convention:** Entity fields map 1:1 to API parameters, form fields, and table columns.

```typescript
// Entity definition
defineEntity('ticket', {
  title: { type: 'string', required: true },
  description: { type: 'text', required: false },
  status: { type: 'select', options: ['open', 'in-progress', 'closed'] },
  createdAt: { type: 'date', required: false, readOnly: true },
  priority: { type: 'number', min: 1, max: 5 },
});

// Auto-generated behavior:
// - All fields become form inputs and table columns
// - Field names stay in camelCase (converted to snake_case in DB)
// - Field order in definition determines form order (unless customized)
// - readOnly fields are form disabled + table only
```

### 2.2 Type Mapping Rules

**Convention:** Field types automatically map to form inputs, table column renderers, and API validation.

| Field Type | Form Component | Table Column | API Validation | DB Type |
|------------|----------------|--------------|-----------------|---------|
| `string` | Text input | Text (truncate) | length, format | VARCHAR(255) |
| `text` | Textarea | Text preview (200 chars) | length | LONGTEXT |
| `number` | Number input | Right-aligned | min, max, step | DECIMAL(10,2) |
| `date` | Date picker | Formatted date | ISO 8601 | DATE |
| `datetime` | DateTime picker | Formatted datetime | ISO 8601 | TIMESTAMP |
| `boolean` | Checkbox | Yes/No badge | - | TINYINT(1) |
| `select` | Select dropdown | Badge with color | options enum | VARCHAR(50) |
| `multi-select` | Checkbox group | Comma-separated tags | array of options | JSON |
| `email` | Email input | Email link | RFC 5322 | VARCHAR(255) |
| `url` | URL input | Link button | URL format | VARCHAR(500) |
| `color` | Color picker | Color swatch | Hex format | VARCHAR(7) |
| `currency` | Currency input | Formatted amount | Currency format | DECIMAL(12,2) |
| `textarea` | Textarea | Text preview | length | LONGTEXT |
| `json` | JSON editor | JSON preview | Valid JSON | JSON |
| `relationship` | Select / Multi-select | Link + badge | FK validation | INT (FK) |
| `file` | File upload | Download link | MIME type | VARCHAR(500) |

**Example mapping:**

```typescript
defineEntity('product', {
  sku: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'text' },
  price: { type: 'currency', min: 0 },
  inStock: { type: 'boolean', default: true },
  category: { type: 'select', options: ['electronics', 'clothing', 'food'] },
  tags: { type: 'multi-select', options: ['sale', 'featured', 'new'] },
  color: { type: 'color' },
  manufacturerWebsite: { type: 'url' },
  technicalSpecs: { type: 'json' },
});

// Auto-generated form:
// - sku, name: Text inputs (required)
// - description: Textarea
// - price: Number input (formatted as currency)
// - inStock: Checkbox
// - category: Select dropdown
// - tags: Checkbox group
// - color: Color picker
// - manufacturerWebsite: URL input
// - technicalSpecs: JSON editor

// Auto-generated table:
// - sku, name: Text columns
// - description: Preview (first 200 chars)
// - price: Right-aligned, formatted as currency
// - inStock: Yes/No badge
// - category: Badge
// - tags: Multiple badges
// - color: Color swatch
// - manufacturerWebsite: Link button
// - technicalSpecs: "View" button to modal
```

### 2.3 API Route Convention

**Convention:** Entity name determines REST endpoints and GraphQL schema name.

```typescript
defineEntity('ticket', { /* fields */ });

// Auto-generated API:
GET    /api/tickets              // List with pagination, filtering, sorting
GET    /api/tickets/:id          // Get single
POST   /api/tickets              // Create
PUT    /api/tickets/:id          // Update
DELETE /api/tickets/:id          // Delete

// Query parameters (standard):
?page=1&limit=20&sort=createdAt:desc&filter[status]=open

// GraphQL (if enabled):
Query {
  tickets(page: Int, limit: Int, filter: JSON, sort: JSON): TicketConnection
  ticket(id: ID!): Ticket
}
Mutation {
  createTicket(input: CreateTicketInput!): Ticket
  updateTicket(id: ID!, input: UpdateTicketInput!): Ticket
  deleteTicket(id: ID!): Boolean
}
```

### 2.4 Permission Convention

**Convention:** Each entity generates four base permissions. Administrators can grant subsets.

```typescript
defineEntity('ticket', { /* fields */ });

// Auto-generated permissions:
ticket:create   // Ability to create new tickets
ticket:read     // Ability to read tickets
ticket:update   // Ability to update tickets
ticket:delete   // Ability to delete tickets

// Field-level permissions (optional, custom):
ticket:read:sensitive   // Override to restrict which fields are visible
ticket:update:status    // Override to allow status updates only
```

**Implementation:** Permissions are created in the `permissions` table and assigned to roles via `role_permissions` junction table.

### 2.5 Error Handling Convention

**Convention:** All generated endpoints follow a consistent error response format.

```json
// Success
{
  "success": true,
  "data": { /* entity or array */ },
  "meta": { "total": 150, "page": 1, "limit": 20 }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "title", "message": "Required field" }
    ]
  }
}
```

---

## 3. Default Templates

### 3.1 Form Template

The form generator creates a Vue 3 / Ant Design form with validation, error handling, and auto-submit.

**Template Structure:**

```vue
<template>
  <a-form :model="form" :rules="rules" layout="vertical" @finish="handleSubmit">
    <!-- Fields rendered in definition order -->
    <a-form-item label="Title" name="title">
      <a-input v-model:value="form.title" placeholder="Enter title" />
    </a-form-item>

    <a-form-item label="Status" name="status">
      <a-select v-model:value="form.status" :options="statusOptions" />
    </a-form-item>

    <a-form-item label="Created At" name="createdAt">
      <a-date-picker v-model:value="form.createdAt" disabled />
    </a-form-item>

    <!-- Hidden fields or readOnly fields are excluded from form display -->

    <a-form-item>
      <a-button type="primary" html-type="submit">Save</a-button>
      <a-button @click="handleCancel">Cancel</a-button>
    </a-form-item>
  </a-form>
</template>
```

**Form Generation Rules:**

| Attribute | Rule |
|-----------|------|
| **visibility** | Skip fields with `hidden: true` or `readOnly: true` |
| **label** | Use field name (title-cased); use `label` if provided |
| **placeholder** | Generate from type (e.g., "Enter title") or use provided value |
| **required** | Add asterisk and validation rule if `required: true` |
| **validation** | Apply type-specific rules (length, min/max, pattern, etc.) |
| **disabled** | Disable if `readOnly: true` or in `view` mode (not `edit` mode) |
| **default** | Pre-fill from entity schema or prior state |
| **layout** | Use `vertical` layout (label above input) by default |

**Validation Rules Generation:**

```typescript
// From field definitions:
{ type: 'string', required: true, min: 3, max: 100 }
↓
rules: {
  title: [
    { required: true, message: 'Title is required' },
    { min: 3, message: 'Must be at least 3 characters' },
    { max: 100, message: 'Must be at most 100 characters' }
  ]
}
```

**Example Generated Form:**

```vue
<!-- Generated for Ticket entity -->
<template>
  <a-form :model="form" :rules="rules" layout="vertical" @finish="handleSubmit">
    <a-form-item label="Title" name="title">
      <a-input v-model:value="form.title" placeholder="Enter title" />
    </a-form-item>

    <a-form-item label="Description" name="description">
      <a-textarea v-model:value="form.description" :rows="4" />
    </a-form-item>

    <a-form-item label="Status" name="status">
      <a-select v-model:value="form.status" 
        :options="[
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in-progress' },
          { label: 'Closed', value: 'closed' }
        ]" />
    </a-form-item>

    <a-form-item label="Priority" name="priority">
      <a-input-number v-model:value="form.priority" :min="1" :max="5" />
    </a-form-item>

    <a-form-item>
      <a-button type="primary" html-type="submit">Save Ticket</a-button>
      <a-button @click="handleCancel">Cancel</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';

const form = ref({
  title: '',
  description: '',
  status: 'open',
  priority: 1
});

const rules = {
  title: [
    { required: true, message: 'Title is required' },
    { min: 3, message: 'Title must be at least 3 characters' }
  ],
  description: [
    { max: 5000, message: 'Description must be at most 5000 characters' }
  ],
  status: [
    { required: true, message: 'Status is required' }
  ],
  priority: [
    { required: true, message: 'Priority is required' }
  ]
};

const handleSubmit = async (values) => {
  try {
    // POST to /api/tickets or PUT to /api/tickets/{id}
    const response = await api.post('/tickets', values);
    message.success('Ticket saved');
  } catch (error) {
    message.error(error.message);
  }
};

const handleCancel = () => {
  // Navigate back or close modal
};
</script>
```

### 3.2 Table Template

The table generator creates a sortable, filterable grid with inline editing and bulk actions.

**Template Structure:**

```vue
<template>
  <div class="table-wrapper">
    <!-- Filter bar -->
    <a-space class="mb-4">
      <a-input-search
        v-model:value="searchText"
        placeholder="Search..."
        @search="handleSearch"
      />
      <a-select v-model:value="filterStatus" placeholder="Status" />
      <a-button type="primary" @click="handleRefresh">Refresh</a-button>
      <a-button type="primary" @click="handleCreate">Create</a-button>
    </a-space>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="pagination"
      :row-key="record => record.id"
      @change="handleTableChange"
    >
      <!-- Column templates (auto-generated based on field types) -->
      <template #bodyCell="{ column, record }">
        <!-- Text columns -->
        <template v-if="column.key === 'title'">
          {{ record.title }}
        </template>

        <!-- Select/enum columns with badge -->
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColors[record.status]">
            {{ record.status }}
          </a-tag>
        </template>

        <!-- Date columns with formatting -->
        <template v-if="column.key === 'createdAt'">
          {{ formatDate(record.createdAt) }}
        </template>

        <!-- Action column -->
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleEdit(record)">
              Edit
            </a-button>
            <a-button type="link" size="small" danger @click="handleDelete(record)">
              Delete
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- Edit modal -->
    <a-modal v-model:visible="editModalVisible" title="Edit Ticket" @ok="handleSave">
      <ticket-form :record="editingRecord" />
    </a-modal>
  </div>
</template>
```

**Table Generation Rules:**

| Aspect | Rule |
|--------|------|
| **Columns** | One per visible field (exclude hidden, readOnly if configured) |
| **Sortable** | Enable for string, number, date fields |
| **Filterable** | Enable for select, boolean, date fields |
| **Inline editing** | Allow for non-readOnly fields (optional) |
| **Row actions** | Always include Edit, Delete buttons |
| **Pagination** | Default 20 rows per page, configurable |
| **Bulk actions** | Auto-generate delete selected (if permitted) |

**Column Definition Generation:**

```typescript
// From entity field:
{ type: 'string', title: 'Title' }
↓
{
  title: 'Title',
  dataIndex: 'title',
  key: 'title',
  sortable: true,
  filterable: false,
  width: 200
}

// From entity field:
{ type: 'select', options: ['open', 'in-progress', 'closed'], title: 'Status' }
↓
{
  title: 'Status',
  dataIndex: 'status',
  key: 'status',
  sortable: true,
  filterable: true,
  filters: [
    { text: 'Open', value: 'open' },
    { text: 'In Progress', value: 'in-progress' },
    { text: 'Closed', value: 'closed' }
  ]
}
```

**Example Generated Table:**

```vue
<template>
  <div class="ticket-list">
    <!-- Filter bar -->
    <a-space class="mb-4">
      <a-input-search
        v-model:value="searchText"
        placeholder="Search tickets..."
        @search="handleSearch"
      />
      <a-select
        v-model:value="filterStatus"
        placeholder="Filter by status"
        :options="[
          { label: 'All', value: '' },
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in-progress' },
          { label: 'Closed', value: 'closed' }
        ]"
        @change="handleFilterChange"
      />
      <a-button type="primary" @click="handleCreate">Create Ticket</a-button>
    </a-space>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="pagination"
      :row-key="record => record.id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- Title -->
        <span v-if="column.key === 'title'">{{ record.title }}</span>

        <!-- Status badge -->
        <a-tag v-if="column.key === 'status'" :color="getStatusColor(record.status)">
          {{ record.status }}
        </a-tag>

        <!-- Priority number -->
        <span v-if="column.key === 'priority'">{{ record.priority }}</span>

        <!-- Created at (formatted) -->
        <span v-if="column.key === 'createdAt'">
          {{ new Date(record.createdAt).toLocaleDateString() }}
        </span>

        <!-- Actions -->
        <a-space v-if="column.key === 'action'" size="small">
          <a-button type="link" size="small" @click="handleEdit(record)">
            Edit
          </a-button>
          <a-popconfirm
            title="Delete this ticket?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="handleDelete(record)"
          >
            <a-button type="link" size="small" danger>Delete</a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { api } from '@/api/request';

const items = ref([]);
const loading = ref(false);
const searchText = ref('');
const filterStatus = ref('');
const editingRecord = ref(null);
const editModalVisible = ref(false);

const columns = [
  { title: 'Title', dataIndex: 'title', key: 'title', width: 200, sorter: true },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120, filterable: true },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100, sorter: true },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 150, sorter: true },
  { title: 'Actions', key: 'action', width: 150, fixed: 'right' }
];

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => `Total ${total} tickets`
});

const getStatusColor = (status) => {
  const colors = { open: 'blue', 'in-progress': 'orange', closed: 'green' };
  return colors[status] || 'default';
};

const handleTableChange = async (pag, filters, sorter) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  await loadItems();
};

const handleSearch = async () => {
  pagination.value.current = 1;
  await loadItems();
};

const loadItems = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: searchText.value,
      status: filterStatus.value
    };
    const response = await api.get('/tickets', { params });
    items.value = response.data;
    pagination.value.total = response.meta.total;
  } catch (error) {
    message.error('Failed to load tickets');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  editingRecord.value = null;
  editModalVisible.value = true;
};

const handleEdit = (record) => {
  editingRecord.value = { ...record };
  editModalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    await api.delete(`/tickets/${record.id}`);
    message.success('Ticket deleted');
    await loadItems();
  } catch (error) {
    message.error('Failed to delete ticket');
  }
};

const handleSave = async () => {
  // Form submission handled by child form component
  await loadItems();
  editModalVisible.value = false;
};

onMounted(loadItems);
</script>
```

### 3.3 Workflow Template

The workflow generator creates standard CRUD lifecycle hooks.

**Template Structure:**

```typescript
// On-create workflow
const onCreateWorkflow = {
  trigger: 'entity.create',
  steps: [
    { action: 'validate', schema: entitySchema },
    { action: 'set-defaults', values: { status: 'open', createdBy: userId } },
    { action: 'save', table: 'tickets' },
    { action: 'emit', event: 'ticket:created', data: newTicket }
  ]
};

// Before-update workflow
const beforeUpdateWorkflow = {
  trigger: 'entity.update',
  steps: [
    { action: 'validate', schema: entitySchema },
    { action: 'check-permissions', permission: 'ticket:update' },
    { action: 'set-field', field: 'updatedAt', value: now() }
  ]
};

// On-delete workflow
const onDeleteWorkflow = {
  trigger: 'entity.delete',
  steps: [
    { action: 'check-permissions', permission: 'ticket:delete' },
    { action: 'soft-delete', table: 'tickets', field: 'deletedAt' },
    { action: 'emit', event: 'ticket:deleted', data: deletedTicket }
  ]
};
```

**Workflow Generation Rules:**

| Hook | Default Behavior | Trigger |
|------|------------------|---------|
| **onCreate** | Set defaults, validate, save, emit event | Before insert |
| **onBeforeUpdate** | Validate, check permissions, update timestamp | Before update |
| **onAfterUpdate** | Emit event, trigger notifications | After update |
| **onDelete** | Check permissions, soft-delete, emit event | Before delete |
| **onRestore** | Restore soft-deleted record, emit event | On explicit restore |

**Example Generated Workflows:**

```typescript
// Auto-generated for Ticket entity
const ticketWorkflows = {
  onCreate: {
    name: 'Create Ticket',
    trigger: 'ticket.create',
    steps: [
      {
        id: 'validate',
        type: 'validation',
        schema: ticketSchema,
        onFailure: 'stop'
      },
      {
        id: 'set-defaults',
        type: 'field-assignment',
        assignments: {
          status: 'open',
          createdAt: now(),
          createdBy: context.userId
        }
      },
      {
        id: 'save',
        type: 'database',
        operation: 'insert',
        table: 'tickets'
      },
      {
        id: 'notify',
        type: 'event-emit',
        event: 'ticket:created',
        payload: '{{ $result }}'
      }
    ]
  },

  onBeforeUpdate: {
    name: 'Before Update Ticket',
    trigger: 'ticket.update',
    steps: [
      {
        id: 'validate',
        type: 'validation',
        schema: ticketSchema,
        onFailure: 'stop'
      },
      {
        id: 'check-permission',
        type: 'rbac',
        permission: 'ticket:update',
        onFailure: 'reject'
      },
      {
        id: 'update-timestamp',
        type: 'field-assignment',
        assignments: {
          updatedAt: now(),
          updatedBy: context.userId
        }
      }
    ]
  },

  onAfterUpdate: {
    name: 'After Update Ticket',
    trigger: 'ticket.update.complete',
    steps: [
      {
        id: 'emit-event',
        type: 'event-emit',
        event: 'ticket:updated',
        payload: '{{ $result }}'
      },
      {
        id: 'notify-subscribers',
        type: 'notification',
        channel: 'websocket',
        message: 'Ticket {{ $data.title }} was updated'
      }
    ]
  },

  onDelete: {
    name: 'Delete Ticket',
    trigger: 'ticket.delete',
    steps: [
      {
        id: 'check-permission',
        type: 'rbac',
        permission: 'ticket:delete',
        onFailure: 'reject'
      },
      {
        id: 'soft-delete',
        type: 'database',
        operation: 'soft-delete',
        table: 'tickets',
        field: 'deletedAt'
      },
      {
        id: 'notify',
        type: 'event-emit',
        event: 'ticket:deleted',
        payload: '{{ $data }}'
      }
    ]
  }
};
```

---

## 4. Override Mechanism

While the generator provides sensible defaults for 90% of use cases, teams can customize every aspect: API behavior, form layout, table rendering, and workflows.

### 4.1 Custom API Routes

**Override pattern:** Provide custom handlers for specific endpoints while using generated handlers for others.

```typescript
defineEntity('ticket', {
  fields: { /* ... */ },
  customRoutes: [
    {
      method: 'GET',
      path: '/api/tickets/active',
      handler: async (req, res) => {
        // Custom logic: return only open and in-progress tickets
        const tickets = await db.tickets.findAll({
          where: { status: { in: ['open', 'in-progress'] } }
        });
        res.json({ success: true, data: tickets });
      }
    },
    {
      method: 'POST',
      path: '/api/tickets/:id/resolve',
      handler: async (req, res) => {
        // Custom logic: transition ticket to closed
        const ticket = await db.tickets.update(req.params.id, {
          status: 'closed',
          resolvedAt: new Date()
        });
        res.json({ success: true, data: ticket });
      }
    }
  ]
});

// Generated routes still work:
// GET /api/tickets
// GET /api/tickets/:id
// POST /api/tickets
// PUT /api/tickets/:id
// DELETE /api/tickets/:id

// Custom routes added:
// GET /api/tickets/active
// POST /api/tickets/:id/resolve
```

### 4.2 Custom Views

**Override pattern:** Provide custom form/table components for specific use cases.

```typescript
defineEntity('ticket', {
  fields: { /* ... */ },
  customViews: {
    form: {
      // Override default form
      path: 'modules/ticket/static/views/TicketForm.vue',
      layout: 'modal', // or 'page' or 'drawer'
      width: 800
    },
    table: {
      // Override default table
      path: 'modules/ticket/static/views/TicketTable.vue',
      layout: 'full-width',
      defaultSort: 'createdAt:desc'
    },
    details: {
      // Add custom view not in defaults
      path: 'modules/ticket/static/views/TicketDetails.vue',
      layout: 'sidebar'
    }
  }
});

// Behavior:
// - If customViews.form exists, use it instead of generated form
// - If customViews.table exists, use it instead of generated table
// - Additional views (details, kanban, etc.) are user-defined
// - If override not provided, use generated default
```

### 4.3 Custom Workflows

**Override pattern:** Replace or enhance default hooks with custom logic.

```typescript
defineEntity('ticket', {
  fields: { /* ... */ },
  hooks: {
    onCreate: async (context, data) => {
      // Custom: Send email to team lead
      if (data.priority >= 4) {
        await notificationService.send({
          to: 'lead@company.com',
          subject: `High-priority ticket created: ${data.title}`,
          body: `Priority: ${data.priority}`
        });
      }
      // Continue with default workflow
      return true;
    },
    onBeforeUpdate: async (context, oldData, newData) => {
      // Custom: Prevent closing tickets without resolution notes
      if (oldData.status !== 'closed' && newData.status === 'closed') {
        if (!newData.resolutionNotes) {
          throw new Error('Resolution notes required before closing');
        }
      }
      return true;
    },
    onDelete: async (context, data) => {
      // Custom: Archive to audit log
      await auditService.archive('ticket', data);
      return true;
    }
  }
});

// Behavior:
// - If hook defined, run custom logic
// - Return true to continue with default logic
// - Return false to skip default logic
// - Throw error to abort operation
```

### 4.4 Field Overrides

**Override pattern:** Customize field rendering without redefining the entire form.

```typescript
defineEntity('ticket', {
  fields: {
    title: { type: 'string', required: true },
    status: { type: 'select', options: ['open', 'in-progress', 'closed'] },
    description: { type: 'text' },
    priority: { type: 'number', min: 1, max: 5 }
  },
  fieldOverrides: {
    // Override description field rendering
    description: {
      formComponent: 'RichTextEditor', // Instead of textarea
      formProps: { maxChars: 5000, allowFormatting: true },
      tableColumnWidth: 300,
      tableRenderer: 'truncate-with-tooltip'
    },
    // Override priority to use custom component
    priority: {
      formComponent: 'PriorityPicker', // Custom Vue component
      formProps: { showEmoji: true },
      tableRenderer: 'priority-badge'
    }
  }
});

// Result:
// - Description uses RichTextEditor in form, custom truncate in table
// - Priority uses PriorityPicker in form, custom badge in table
// - Title and status use default components
```

### 4.5 Global Convention Overrides

**Override pattern:** Change naming, routing, or permission conventions globally.

```typescript
// In runtime configuration
const runtimeConfig = {
  generation: {
    // Naming convention
    apiBasePath: '/api/v1', // Default: /api
    entityNamingCase: 'plural', // Default: plural (tickets)
    fieldNamingCase: 'camelCase', // Default: camelCase

    // Permission naming
    permissionPrefix: 'resource', // Default: entity name
    // Result: resource:create, resource:read instead of ticket:create

    // View naming
    viewNamingPattern: '{entity}-{view}.vue', // Default: {entity}-{view}

    // Workflow naming
    workflowPrefix: 'auto', // Default: no prefix
    // Result: auto.onCreate, auto.onBeforeUpdate
  }
};
```

---

## 5. Complete Example: Ticket Entity

This section demonstrates a complete entity definition flowing through the entire generation pipeline, showing inputs, outputs, and how conventions apply.

### 5.1 Entity Definition

```typescript
// backend/src/modules/ticket/entity.ts

import { defineEntity } from '@runtime/registry';

export const ticketEntity = defineEntity('ticket', {
  fields: {
    title: {
      type: 'string',
      required: true,
      min: 3,
      max: 200,
      title: 'Title',
      description: 'Brief summary of the ticket'
    },
    description: {
      type: 'text',
      required: false,
      max: 5000,
      title: 'Description',
      description: 'Detailed ticket information'
    },
    status: {
      type: 'select',
      required: true,
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in-progress', label: 'In Progress' },
        { value: 'closed', label: 'Closed' }
      ],
      default: 'open',
      title: 'Status'
    },
    priority: {
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      default: 2,
      title: 'Priority',
      description: '1=Low, 5=Critical'
    },
    assignedTo: {
      type: 'relationship',
      entity: 'user',
      required: false,
      title: 'Assigned To',
      displayField: 'name'
    },
    tags: {
      type: 'multi-select',
      options: [
        { value: 'bug', label: 'Bug' },
        { value: 'feature', label: 'Feature' },
        { value: 'enhancement', label: 'Enhancement' }
      ],
      required: false,
      title: 'Tags'
    },
    createdAt: {
      type: 'datetime',
      readOnly: true,
      hidden: true
    },
    updatedAt: {
      type: 'datetime',
      readOnly: true,
      hidden: true
    }
  },

  // Optional: Custom API routes
  customRoutes: [
    {
      method: 'GET',
      path: '/api/tickets/my-tickets',
      handler: async (req, res) => {
        const userId = req.user.id;
        const tickets = await ticketService.findByAssignee(userId);
        res.json({ success: true, data: tickets });
      }
    },
    {
      method: 'POST',
      path: '/api/tickets/:id/close',
      handler: async (req, res) => {
        const ticket = await ticketService.update(req.params.id, {
          status: 'closed',
          closedAt: new Date()
        });
        res.json({ success: true, data: ticket });
      }
    }
  ],

  // Optional: Custom views
  customViews: {
    form: {
      path: '@modules/ticket/static/views/TicketForm.vue'
    },
    table: {
      path: '@modules/ticket/static/views/TicketList.vue'
    },
    kanban: {
      path: '@modules/ticket/static/views/TicketKanban.vue'
    }
  },

  // Optional: Custom workflows
  hooks: {
    onCreate: async (context, data) => {
      // Send notification if high priority
      if (data.priority >= 4) {
        await notificationService.notifyTeam(
          `High-priority ticket created: ${data.title}`
        );
      }
      return true;
    },
    onBeforeUpdate: async (context, oldData, newData) => {
      // Validate status transitions
      const validTransitions = {
        open: ['in-progress', 'closed'],
        'in-progress': ['open', 'closed'],
        closed: ['open', 'in-progress']
      };
      const allowed = validTransitions[oldData.status];
      if (!allowed?.includes(newData.status)) {
        throw new Error(
          `Cannot transition from ${oldData.status} to ${newData.status}`
        );
      }
      return true;
    }
  }
});
```

### 5.2 Generated API Routes

```typescript
// Auto-generated routes (registered at runtime)

// GET /api/tickets
// List tickets with pagination, filtering, sorting
GET /api/tickets?page=1&limit=20&sort=createdAt:desc&filter[status]=open
Response: {
  success: true,
  data: [
    {
      id: 1,
      title: "Fix login bug",
      description: "Users cannot log in with Google OAuth",
      status: "open",
      priority: 5,
      assignedTo: { id: 2, name: "Alice" },
      tags: ["bug"],
      createdAt: "2026-04-20T10:30:00Z",
      updatedAt: "2026-04-25T14:45:00Z"
    },
    // ...more tickets
  ],
  meta: {
    total: 42,
    page: 1,
    limit: 20,
    pages: 3
  }
}

// GET /api/tickets/:id
// Get single ticket
GET /api/tickets/1
Response: {
  success: true,
  data: {
    id: 1,
    title: "Fix login bug",
    description: "Users cannot log in with Google OAuth",
    status: "open",
    priority: 5,
    assignedTo: { id: 2, name: "Alice" },
    tags: ["bug"],
    createdAt: "2026-04-20T10:30:00Z",
    updatedAt: "2026-04-25T14:45:00Z"
  }
}

// POST /api/tickets
// Create new ticket
POST /api/tickets
Body: {
  title: "Add dark mode",
  description: "Users want a dark theme",
  status: "open",
  priority: 2,
  assignedTo: 3,
  tags: ["feature"]
}
Response: {
  success: true,
  data: {
    id: 43,
    title: "Add dark mode",
    description: "Users want a dark theme",
    status: "open",
    priority: 2,
    assignedTo: { id: 3, name: "Bob" },
    tags: ["feature"],
    createdAt: "2026-04-30T09:15:00Z",
    updatedAt: "2026-04-30T09:15:00Z"
  }
}

// PUT /api/tickets/:id
// Update ticket
PUT /api/tickets/1
Body: {
  status: "in-progress",
  assignedTo: 2
}
Response: {
  success: true,
  data: {
    id: 1,
    title: "Fix login bug",
    description: "Users cannot log in with Google OAuth",
    status: "in-progress",
    priority: 5,
    assignedTo: { id: 2, name: "Alice" },
    tags: ["bug"],
    createdAt: "2026-04-20T10:30:00Z",
    updatedAt: "2026-04-30T09:15:00Z"
  }
}

// DELETE /api/tickets/:id
// Delete ticket
DELETE /api/tickets/1
Response: {
  success: true,
  data: { id: 1 }
}

// Custom route: GET /api/tickets/my-tickets
GET /api/tickets/my-tickets
Response: {
  success: true,
  data: [
    { id: 1, title: "Fix login bug", status: "open", ... },
    { id: 5, title: "Design dashboard", status: "in-progress", ... }
  ]
}

// Custom route: POST /api/tickets/:id/close
POST /api/tickets/1/close
Response: {
  success: true,
  data: {
    id: 1,
    title: "Fix login bug",
    status: "closed",
    closedAt: "2026-04-30T09:30:00Z",
    ...
  }
}
```

### 5.3 Generated Form View

```vue
<!-- backend/src/modules/ticket/static/views/TicketForm.vue -->
<!-- This is the custom form if customViews.form is used -->
<!-- If no custom form provided, a default would be generated -->

<template>
  <a-form :model="form" :rules="rules" layout="vertical" @finish="handleSubmit">
    <!-- Title field -->
    <a-form-item label="Title" name="title" required>
      <a-input
        v-model:value="form.title"
        placeholder="Enter ticket title"
        :max-length="200"
        show-count
      />
    </a-form-item>

    <!-- Description field -->
    <a-form-item label="Description" name="description">
      <a-textarea
        v-model:value="form.description"
        placeholder="Detailed information..."
        :rows="4"
        :max-length="5000"
        show-count
      />
    </a-form-item>

    <!-- Status field -->
    <a-form-item label="Status" name="status" required>
      <a-select v-model:value="form.status" :options="statusOptions" />
    </a-form-item>

    <!-- Priority field -->
    <a-form-item label="Priority" name="priority" required>
      <a-slider v-model:value="form.priority" :min="1" :max="5" :marks="marks" />
      <span class="text-gray-500">{{ priorityLabel }}</span>
    </a-form-item>

    <!-- Assigned To field -->
    <a-form-item label="Assigned To" name="assignedTo">
      <a-select
        v-model:value="form.assignedTo"
        placeholder="Select a user"
        :options="userOptions"
        allow-clear
      />
    </a-form-item>

    <!-- Tags field -->
    <a-form-item label="Tags" name="tags">
      <a-select
        v-model:value="form.tags"
        mode="multiple"
        placeholder="Select tags"
        :options="tagOptions"
      />
    </a-form-item>

    <!-- Submit button -->
    <a-form-item>
      <a-button type="primary" html-type="submit" :loading="submitting">
        {{ isEdit ? 'Update' : 'Create' }} Ticket
      </a-button>
      <a-button @click="handleCancel">Cancel</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { api } from '@/api/request';

const props = defineProps({
  ticketId: [String, Number],
  onSubmit: Function,
  onCancel: Function
});

const form = ref({
  title: '',
  description: '',
  status: 'open',
  priority: 2,
  assignedTo: null,
  tags: []
});

const rules = {
  title: [
    { required: true, message: 'Title is required' },
    { min: 3, message: 'Title must be at least 3 characters' },
    { max: 200, message: 'Title must be at most 200 characters' }
  ],
  description: [
    { max: 5000, message: 'Description must be at most 5000 characters' }
  ],
  status: [
    { required: true, message: 'Status is required' }
  ],
  priority: [
    { required: true, message: 'Priority is required' }
  ]
};

const isEdit = computed(() => !!props.ticketId);
const submitting = ref(false);

const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Closed', value: 'closed' }
];

const tagOptions = [
  { label: 'Bug', value: 'bug' },
  { label: 'Feature', value: 'feature' },
  { label: 'Enhancement', value: 'enhancement' }
];

const userOptions = ref([]);

const marks = {
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Urgent',
  5: 'Critical'
};

const priorityLabel = computed(() => {
  return marks[form.value.priority] || '';
});

const loadUsers = async () => {
  try {
    const response = await api.get('/users', { params: { limit: 100 } });
    userOptions.value = response.data.map(u => ({
      label: u.name,
      value: u.id
    }));
  } catch (error) {
    message.error('Failed to load users');
  }
};

const loadTicket = async () => {
  if (!props.ticketId) return;
  try {
    const response = await api.get(`/tickets/${props.ticketId}`);
    Object.assign(form.value, response.data);
  } catch (error) {
    message.error('Failed to load ticket');
  }
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    const url = isEdit.value ? `/tickets/${props.ticketId}` : '/tickets';
    const method = isEdit.value ? 'put' : 'post';

    const response = await api[method](url, form.value);
    message.success(isEdit.value ? 'Ticket updated' : 'Ticket created');

    if (props.onSubmit) {
      props.onSubmit(response.data);
    }
  } catch (error) {
    message.error(error.message);
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  if (props.onCancel) {
    props.onCancel();
  }
};

onMounted(() => {
  loadUsers();
  loadTicket();
});
</script>
```

### 5.4 Generated Table View

```vue
<!-- backend/src/modules/ticket/static/views/TicketList.vue -->

<template>
  <div class="ticket-list">
    <!-- Filter bar -->
    <a-space class="mb-4">
      <a-input-search
        v-model:value="searchText"
        placeholder="Search tickets..."
        style="width: 200px"
        @search="handleSearch"
      />
      <a-select
        v-model:value="filterStatus"
        placeholder="Status"
        style="width: 150px"
        :options="statusOptions"
        allow-clear
        @change="handleFilterChange"
      />
      <a-select
        v-model:value="filterPriority"
        placeholder="Priority"
        style="width: 150px"
        :options="priorityOptions"
        allow-clear
        @change="handleFilterChange"
      />
      <a-button type="primary" @click="handleCreate">Create Ticket</a-button>
      <a-button @click="handleRefresh">Refresh</a-button>
    </a-space>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="pagination"
      :row-key="record => record.id"
      @change="handleTableChange"
    >
      <!-- Title column -->
      <template #bodyCell="{ column, record }">
        <span v-if="column.key === 'title'">
          <a @click="handleEdit(record)">{{ record.title }}</a>
        </span>

        <!-- Status badge -->
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColors[record.status]">
            {{ getStatusLabel(record.status) }}
          </a-tag>
        </template>

        <!-- Priority display -->
        <template v-if="column.key === 'priority'">
          <a-rate v-model:value="record.priority" disabled />
        </template>

        <!-- Assigned to -->
        <template v-if="column.key === 'assignedTo'">
          <span v-if="record.assignedTo">{{ record.assignedTo.name }}</span>
          <span v-else class="text-gray-400">Unassigned</span>
        </template>

        <!-- Tags -->
        <template v-if="column.key === 'tags'">
          <a-tag v-for="tag in record.tags" :key="tag" color="blue">
            {{ tag }}
          </a-tag>
        </template>

        <!-- Created at -->
        <template v-if="column.key === 'createdAt'">
          {{ formatDate(record.createdAt) }}
        </template>

        <!-- Actions -->
        <template v-if="column.key === 'action'">
          <a-space size="small">
            <a-button type="link" size="small" @click="handleEdit(record)">
              Edit
            </a-button>
            <a-popconfirm
              title="Delete this ticket?"
              description="This action cannot be undone."
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" size="small" danger>Delete</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- Edit modal -->
    <a-modal
      v-model:visible="editModalVisible"
      :title="editingRecord ? 'Edit Ticket' : 'Create Ticket'"
      width="800px"
      @ok="handleSaveForm"
      @cancel="editModalVisible = false"
    >
      <ticket-form
        ref="formRef"
        :ticket-id="editingRecord?.id"
        @submit="handleSaveForm"
        @cancel="editModalVisible = false"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { api } from '@/api/request';
import TicketForm from './TicketForm.vue';

const items = ref([]);
const loading = ref(false);
const searchText = ref('');
const filterStatus = ref('');
const filterPriority = ref('');
const editingRecord = ref(null);
const editModalVisible = ref(false);
const formRef = ref(null);

const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Closed', value: 'closed' }
];

const priorityOptions = [
  { label: '1 - Low', value: 1 },
  { label: '2 - Normal', value: 2 },
  { label: '3 - High', value: 3 },
  { label: '4 - Urgent', value: 4 },
  { label: '5 - Critical', value: 5 }
];

const statusColors = {
  open: 'blue',
  'in-progress': 'orange',
  closed: 'green'
};

const columns = [
  {
    title: 'Title',
    dataIndex: 'title',
    key: 'title',
    width: 250,
    sorter: true
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    filterable: true,
    filters: statusOptions.map(s => ({ text: s.label, value: s.value }))
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    key: 'priority',
    width: 120,
    sorter: true
  },
  {
    title: 'Assigned To',
    dataIndex: ['assignedTo', 'name'],
    key: 'assignedTo',
    width: 150
  },
  {
    title: 'Tags',
    dataIndex: 'tags',
    key: 'tags',
    width: 150
  },
  {
    title: 'Created',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 150,
    sorter: true
  },
  {
    title: 'Actions',
    key: 'action',
    width: 120,
    fixed: 'right'
  }
];

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => `Total ${total} tickets`
});

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const getStatusLabel = (status) => {
  return statusOptions.find(s => s.value === status)?.label || status;
};

const loadItems = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: searchText.value
    };
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterPriority.value) params.priority = filterPriority.value;

    const response = await api.get('/tickets', { params });
    items.value = response.data;
    pagination.value.total = response.meta.total;
  } catch (error) {
    message.error('Failed to load tickets');
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  loadItems();
};

const handleSearch = () => {
  pagination.value.current = 1;
  loadItems();
};

const handleFilterChange = () => {
  pagination.value.current = 1;
  loadItems();
};

const handleRefresh = () => {
  loadItems();
};

const handleCreate = () => {
  editingRecord.value = null;
  editModalVisible.value = true;
};

const handleEdit = (record) => {
  editingRecord.value = record;
  editModalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    await api.delete(`/tickets/${record.id}`);
    message.success('Ticket deleted');
    await loadItems();
  } catch (error) {
    message.error(error.message);
  }
};

const handleSaveForm = async () => {
  // Form submission is handled by the form component
  await loadItems();
  editModalVisible.value = false;
};

onMounted(loadItems);
</script>
```

### 5.5 Generated Workflows (Active at Runtime)

```typescript
// Workflows automatically fire when entity lifecycle events occur

// Example 1: User creates a ticket
POST /api/tickets
Body: { title: "Bug in checkout", priority: 5, assignedTo: 2 }

// Workflow execution:
1. onCreate hook triggers
2. Custom logic: Check priority >= 4
3. If true: Send notification to team
4. Continue with default workflow:
   - Validate fields against schema
   - Set createdAt, createdBy
   - Insert into database
   - Emit event: ticket:created
5. UI receives response, shows created ticket


// Example 2: User updates ticket status
PUT /api/tickets/1
Body: { status: "closed" }

// Workflow execution:
1. onBeforeUpdate hook triggers
2. Custom logic: Validate status transition
3. If invalid: Throw error, abort operation
4. If valid: Continue with default workflow:
   - Validate fields
   - Check permissions (ticket:update)
   - Set updatedAt, updatedBy
   - Update in database
5. onAfterUpdate hook triggers:
   - Emit event: ticket:updated
   - Notify subscribers via WebSocket
6. UI receives response, shows updated ticket


// Example 3: User deletes a ticket
DELETE /api/tickets/1

// Workflow execution:
1. onDelete hook triggers
2. Custom logic: None (hypothetical)
3. Continue with default workflow:
   - Check permissions (ticket:delete)
   - Soft-delete record (set deletedAt)
   - Emit event: ticket:deleted
4. UI receives response, removes from list
```

### 5.6 Generated Permissions

```typescript
// Auto-created in permissions table

INSERT INTO permissions (name, resource, action, description) VALUES
('ticket:create', 'ticket', 'create', 'Create new tickets'),
('ticket:read', 'ticket', 'read', 'View tickets'),
('ticket:update', 'ticket', 'update', 'Update tickets'),
('ticket:delete', 'ticket', 'delete', 'Delete tickets');

// Assigned to roles (example: assign to "Support" role)

INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1), -- support can create
(3, 2), -- support can read
(3, 3), -- support can update
(3, 4); -- support can delete

// In middleware, these are checked:

@Authorize(['ticket:read'])
GET /api/tickets { /* ... */ }

@Authorize(['ticket:create'])
POST /api/tickets { /* ... */ }

@Authorize(['ticket:update'])
PUT /api/tickets/:id { /* ... */ }

@Authorize(['ticket:delete'])
DELETE /api/tickets/:id { /* ... */ }
```

---

## 6. Generator Integration Points

### 6.1 How the System Discovers Generators

Generators are registered in a central registry. When an entity is added to RuntimeRegistry, the system looks up registered generators and executes them in the correct order.

```typescript
// src/core/runtime/generators/generator-registry.ts

class GeneratorRegistry {
  private generators = new Map();

  register(name, generator) {
    this.generators.set(name, generator);
  }

  async executeAll(entity) {
    const results = {};
    for (const [name, generator] of this.generators) {
      results[name] = await generator.generate(entity);
    }
    return results;
  }
}

// Register generators
const generatorRegistry = new GeneratorRegistry();
generatorRegistry.register('api', apiGenerator);
generatorRegistry.register('view', viewGenerator);
generatorRegistry.register('workflow', workflowGenerator);
generatorRegistry.register('permission', permissionGenerator);

// Execute all generators for an entity
const entity = defineEntity('ticket', { /* ... */ });
const outputs = await generatorRegistry.executeAll(entity);
// outputs = {
//   api: { routes: [...] },
//   view: { form: {...}, table: {...} },
//   workflow: { onCreate: {...}, ... },
//   permission: { permissions: [...] }
// }
```

### 6.2 Integration with Router

Generated API routes are registered in the main Express/NestJS router.

```typescript
// src/core/router/route-registration.js

class RouteRegistrar {
  registerRoutes(router, apiEndpoints) {
    for (const endpoint of apiEndpoints.restRoutes) {
      const { method, path, handler } = endpoint;
      router[method](path, handler);
    }
  }
}

// In app setup:
const entity = defineEntity('ticket', { /* ... */ });
const { apiEndpoints } = await runtimeRegistry.generateAll(entity);
routeRegistrar.registerRoutes(app, apiEndpoints);

// Result: /api/tickets endpoints are live
```

### 6.3 Integration with View Registry

Generated views are stored and retrieved by name.

```typescript
// src/core/views/view-registry.ts

class ViewRegistry {
  private views = new Map();

  register(entityName, viewType, definition) {
    const key = `${entityName}:${viewType}`;
    this.views.set(key, definition);
  }

  get(entityName, viewType) {
    return this.views.get(`${entityName}:${viewType}`);
  }
}

// During generation:
const entity = defineEntity('ticket', { /* ... */ });
const { viewDefinitions } = await runtimeRegistry.generateAll(entity);

viewRegistry.register('ticket', 'form', viewDefinitions.form);
viewRegistry.register('ticket', 'table', viewDefinitions.table);

// In UI code:
const ticketFormDef = viewRegistry.get('ticket', 'form');
// Use ticketFormDef.fields, ticketFormDef.layout, etc.
```

### 6.4 Integration with Workflow Engine

Generated workflows are activated in the workflow/event system.

```typescript
// src/core/workflow/workflow-engine.ts

class WorkflowEngine {
  private workflows = new Map();

  activate(entityName, hookName, workflow) {
    const key = `${entityName}:${hookName}`;
    this.workflows.set(key, workflow);
  }

  async execute(entityName, hookName, context, data) {
    const workflow = this.workflows.get(`${entityName}:${hookName}`);
    if (!workflow) return data; // No workflow, pass through
    return await workflow.execute(context, data);
  }
}

// During generation:
const entity = defineEntity('ticket', { /* ... */ });
const { workflowDefinitions } = await runtimeRegistry.generateAll(entity);

workflowEngine.activate('ticket', 'onCreate', workflowDefinitions.onCreate);
workflowEngine.activate('ticket', 'onBeforeUpdate', workflowDefinitions.onBeforeUpdate);
workflowEngine.activate('ticket', 'onAfterUpdate', workflowDefinitions.onAfterUpdate);
workflowEngine.activate('ticket', 'onDelete', workflowDefinitions.onDelete);

// When a ticket is created:
const newTicket = { /* ... */ };
await workflowEngine.execute('ticket', 'onCreate', context, newTicket);
```

---

## 7. Performance & Optimization

### 7.1 Generation Timing

**Synchronous (Registration Time):**
- Entity validation
- Generator execution
- Route registration
- View definition storage
- Permission creation

**Asynchronous (Runtime):**
- API requests processed
- Views rendered in UI
- Workflows fire on events
- Permissions checked in middleware

**Why split?** Registration happens once at startup; runtime operations happen thousands of times and must be fast.

### 7.2 Caching Strategy

```typescript
// Cache generated artifacts to avoid regeneration

class ArtifactCache {
  private cache = new Map();

  set(key, artifact) {
    this.cache.set(key, artifact);
  }

  get(key) {
    return this.cache.get(key);
  }

  invalidate(pattern) {
    // Clear cache entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.match(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage:
const cache = new ArtifactCache();
cache.set('ticket:apiEndpoints', apiEndpoints);
cache.set('ticket:viewDefinitions', viewDefinitions);
cache.set('ticket:workflowDefinitions', workflowDefinitions);

// On update, invalidate:
cache.invalidate(/^ticket:/);
```

### 7.3 Lazy Loading (Optional)

For large projects with many entities, generators can be lazy-loaded.

```typescript
// Don't generate all artifacts immediately; generate on-demand

class LazyGenerator {
  async getApiEndpoints(entityName) {
    if (cache.has(`${entityName}:api`)) {
      return cache.get(`${entityName}:api`);
    }
    const endpoints = await apiGenerator.generate(entity);
    cache.set(`${entityName}:api`, endpoints);
    return endpoints;
  }

  async getViewDefinitions(entityName) {
    if (cache.has(`${entityName}:view`)) {
      return cache.get(`${entityName}:view`);
    }
    const views = await viewGenerator.generate(entity);
    cache.set(`${entityName}:view`, views);
    return views;
  }
}
```

---

## 8. Conventions Summary Table

Quick reference of all convention-over-configuration rules.

| Aspect | Convention | Example | Override |
|--------|-----------|---------|----------|
| **API Base Path** | `/api` | `/api/tickets` | `customRoutes` |
| **Entity Plural** | Auto-pluralize | `ticket` → `tickets` | `customRoutes` |
| **Field → Form** | Type mapping | `select` → dropdown | `fieldOverrides` |
| **Field → Table** | Type mapping | `date` → formatted date | `fieldOverrides` |
| **Field Visibility** | Show all, hide readOnly | `createdAt` hidden | `hidden: true` |
| **Permissions** | `{entity}:{action}` | `ticket:create` | `permissionPrefix` |
| **Workflows** | `on{Action}` | `onCreate` | `hooks` |
| **Form Layout** | Vertical, top-to-bottom | Fields in definition order | `customViews` |
| **Table Sorting** | Enable for numeric/date | Priority sortable | `columns.sorter` |
| **Table Filtering** | Enable for select/boolean | Status filterable | `columns.filters` |
| **Validation** | From field rules | `min`, `max`, `required` | Custom validator |
| **Error Handling** | Standard format | `{ success, error }` | Custom middleware |

---

## 9. Next Steps & Migration Path

This specification assumes:
1. **Core Runtime Architecture** (Task 1) is implemented — entities register in RuntimeRegistry
2. **Generators are pluggable** — new generators can be added without changing core
3. **Conventions are discoverable** — developers understand when defaults apply vs. overrides needed

**Upcoming tasks build on this:**
- Task 3: **Workflow Engine & Automation** — Detail execution model for workflows, hooks, event system
- Task 4: **Multi-Tenancy & Data Isolation** — How generated APIs respect tenant boundaries
- Task 5: **Performance & Scaling** — Query optimization, caching, pagination strategies

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **EntityDef** | Object returned by `defineEntity()`, contains field definitions and options |
| **RuntimeRegistry** | Central registry of all defined entities, generators, and configurations |
| **Generator** | Module that transforms EntityDef into API routes, views, or workflows |
| **Artifact** | Output from a generator (routes, views, workflows, permissions) |
| **Convention** | Default behavior applied when no custom override provided |
| **Override** | Custom logic that replaces or enhances a convention |
| **Hook** | Lifecycle event (onCreate, onBeforeUpdate, onDelete, etc.) |
| **Workflow** | Sequence of steps executed in response to a trigger |
| **ViewDefinition** | Template describing form layout, fields, and validation |
| **ApiEndpoint** | REST route with method, path, and handler function |

---

## Appendix B: References

- [01-core-runtime-architecture.md](01-core-runtime-architecture.md) — Runtime and entity definitions
- [DEVELOPMENT.md](/docs/DEVELOPMENT.md) — Developer guide for creating modules
- [ARCHITECTURE.md](/docs/ARCHITECTURE.md) — Overall system architecture

