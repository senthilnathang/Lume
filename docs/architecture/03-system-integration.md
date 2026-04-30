# System Integration Model

## Overview

The Lume runtime integrates five core systems—Entities, Workflows, Views, Permissions, and Permissions—into a unified metadata-driven platform. This document describes how each system communicates, the data flows between them, and the lifecycle of operations across the entire stack.

**Key Principle**: All integration happens through a publish-subscribe event system. Entities emit events, Workflows and Views react to events, Permissions guard all operations.

---

## 1. Entity ↔ Workflow Integration

### Event-Driven Workflow Triggers

Entities emit structured lifecycle events that Workflows subscribe to. When an entity operation completes (create, update, delete), the runtime publishes events to all registered Workflow listeners.

#### Entity Lifecycle Events

Every entity emits four lifecycle events:

```
entity:{action} = action ∈ { created, updated, deleted, read }
```

**Fully Qualified Event Name**:
```
{domainName}:{entityName}:{action}
```

**Event Payload Structure**:
```javascript
{
  entity: EntityInstance,          // The entity record after operation
  previousEntity: EntityInstance,  // Before-state (for updates)
  userId: string,                  // Who triggered the operation
  timestamp: ISO8601,              // When the operation occurred
  source: 'api' | 'ui' | 'batch',  // Origin of the event
  metadata: {
    ipAddress: string,
    userAgent: string,
    correlationId: string          // Trace across systems
  }
}
```

#### Workflow Event Subscription

Workflows declare triggers via the `on()` method:

```javascript
workflow('auto-assign-ticket', {
  on: [
    'support:ticket:created'       // Listen to ticket creation
  ],
  
  steps: [
    {
      id: 'find-available-agent',
      type: 'condition',
      condition: {
        field: 'status',
        operator: 'equals',
        value: 'open'
      }
    },
    {
      id: 'assign-to-first-agent',
      type: 'action',
      action: {
        type: 'entity-mutate',
        entity: 'support:agent',
        query: { available: true, sort: { joinedAt: 'asc' } },
        mutation: (agent, ticket) => ({
          assignedTickets: [...agent.assignedTickets, ticket.id]
        }),
        limit: 1  // Assign to first available
      }
    },
    {
      id: 'update-ticket-assignment',
      type: 'action',
      action: {
        type: 'entity-mutate',
        entity: 'support:ticket',
        id: '$event.entity.id',
        mutation: {
          assignedTo: '$step.assign-to-first-agent.result.agent.id',
          status: 'assigned'
        }
      }
    },
    {
      id: 'send-notification',
      type: 'action',
      action: {
        type: 'notify',
        template: 'ticket-assigned',
        recipient: '$step.assign-to-first-agent.result.agent.id',
        data: {
          ticketId: '$event.entity.id',
          ticketTitle: '$event.entity.title'
        }
      }
    }
  ],
  
  // Error handling
  onError: {
    type: 'log',
    level: 'error'
  }
})
```

### Workflow Actions Mutating Entity Data

Workflows can modify entity data through `entity-mutate` actions. The runtime ensures:

1. **Permission Check**: Action only executes if user has permission
2. **Hook Execution**: Before-hooks run before mutation, after-hooks after
3. **Event Emission**: Mutation triggers a new event (preventing infinite loops via correlation IDs)
4. **Transaction Safety**: Multiple mutations in single workflow are atomic

**Mutation Action Structure**:
```javascript
{
  type: 'entity-mutate',
  entity: 'domain:entityName',
  id: 'entity-id-or-$reference',
  mutation: {
    field1: newValue,
    field2: { $inc: 1 },  // Increment operator
    field3: { $push: value },  // Array append
    nested: { subfield: value }
  }
}
```

### Example: Complete Auto-Assign Flow

```
USER ACTION (API POST /tickets)
    ↓
    [API Handler]
    ├─ Parse request body
    ├─ Validate against EntityDef
    └─ Call entityService.create(ticketData)
    ↓
    [Permission Check]
    ├─ Check: user has 'ticket:create' permission
    └─ If denied → Return 403, stop
    ↓
    [Before Hooks]
    ├─ Hook: Generate ticket number
    ├─ Hook: Set default status = 'open'
    └─ Hook: Record creator user ID
    ↓
    [Database Write]
    ├─ INSERT into tickets table
    └─ Return created ticket record
    ↓
    [Event Emission]
    ├─ Emit event: 'support:ticket:created'
    ├─ Payload: { entity: ticket, userId, timestamp, source: 'api' }
    └─ Store in event log for audit
    ↓
    [Workflow System]
    ├─ Find all workflows subscribed to 'support:ticket:created'
    ├─ Filter: check if conditions match (e.g., status === 'open')
    └─ For each matching workflow, execute steps:
    │
    ├─ Step 1: Query for available agents
    │  ├─ WHERE available = true ORDER BY joinedAt ASC LIMIT 1
    │  └─ Result: agent = { id: 'agent-001', name: 'Alice' }
    │
    ├─ Step 2: Mutate ticket entity
    │  ├─ UPDATE tickets SET assignedTo = 'agent-001', status = 'assigned'
    │  ├─ Permission check: workflow user (system) has permission
    │  ├─ Before-hooks run (if any)
    │  ├─ After-hooks run (if any)
    │  └─ Emit new event: 'support:ticket:updated'
    │
    ├─ Step 3: Send notification
    │  ├─ Resolve template: 'ticket-assigned'
    │  ├─ Render: "New ticket #TKT-001: Customer Issue (from Agent Alice)"
    │  └─ Send via configured channel (email/Slack/in-app)
    │
    └─ Workflow completes successfully
    ↓
    [Response to Client]
    ├─ Return: { success: true, data: { id: 'tkt-001', ... } }
    └─ Client updates local state
    ↓
    [Grid Subscription Update]
    ├─ Grid subscribed to 'support:ticket:created' + 'support:ticket:updated'
    ├─ Receives event with new ticket state
    └─ Adds row to grid + re-renders
```

---

## 2. Entity ↔ View Integration

### Auto-Generated Views from EntityDef

Views are generated from EntityDef field metadata. The runtime inspects the entity definition and creates appropriate UI components for each field.

#### Field Type → Component Mapping

```javascript
// EntityDef field configuration
{
  name: 'ticket',
  fields: {
    
    // TEXT field → Text Input
    title: {
      type: 'text',
      label: 'Ticket Title',
      required: true,
      validation: { maxLength: 255 }
    },
    
    // TEXTAREA field → Text Area
    description: {
      type: 'textarea',
      label: 'Description',
      required: false,
      rows: 6
    },
    
    // SELECT field → Dropdown
    status: {
      type: 'select',
      label: 'Status',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'closed', label: 'Closed' }
      ],
      default: 'open'
    },
    
    // REFERENCE field → Lookup Picker
    assignedTo: {
      type: 'reference',
      entity: 'support:agent',
      label: 'Assigned Agent',
      displayField: 'name',
      allowNull: true
    },
    
    // DATETIME field → Date/Time Picker
    createdAt: {
      type: 'datetime',
      label: 'Created',
      readOnly: true
    },
    
    // BOOLEAN field → Toggle
    isUrgent: {
      type: 'boolean',
      label: 'Urgent?',
      default: false
    },
    
    // ARRAY field → Multi-Select
    tags: {
      type: 'array',
      itemType: 'text',
      label: 'Tags',
      max: 10
    },
    
    // JSON field → Code Editor (advanced)
    metadata: {
      type: 'json',
      label: 'Metadata',
      editorMode: 'json'
    }
  }
}
```

#### Generated Component Lookup Table

| Field Type | Form Component | Grid Column | Display |
|---|---|---|---|
| `text` | `<a-input />` | Text (truncate 50ch) | Plain text |
| `textarea` | `<a-textarea />` | Text (truncate 30ch) | Plain text |
| `select` | `<a-select />` | Badge with option label | Colored badge |
| `reference` | Lookup picker + modal | Link to referenced record | `displayField` value |
| `datetime` | Date/time picker | Formatted datetime | `YYYY-MM-DD HH:mm` |
| `boolean` | Toggle | Check icon | ✓ or empty |
| `array` | Multi-select | Tag list | Tags separated by comma |
| `number` | Number input | Number formatted | Aligned right |
| `json` | Code editor | JSON preview (truncate) | `{ ... }` |

### View Binding Architecture

Views maintain reactive subscriptions to entity lifecycle events:

```javascript
// TicketGrid.vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { entityService } from '@/services'
import { eventBus } from '@/core/events'

const route = useRoute()
const moduleName = route.params.moduleName  // 'support'
const entityName = 'ticket'

// Local state
const tickets = ref([])
const loading = ref(false)

// Load initial data
onMounted(async () => {
  loading.value = true
  tickets.value = await entityService.list(moduleName, entityName)
  loading.value = false
  
  // Subscribe to entity lifecycle events
  const createdHandler = (event) => {
    tickets.value.push(event.entity)
  }
  
  const updatedHandler = (event) => {
    const index = tickets.value.findIndex(t => t.id === event.entity.id)
    if (index >= 0) {
      tickets.value[index] = event.entity
    }
  }
  
  const deletedHandler = (event) => {
    tickets.value = tickets.value.filter(t => t.id !== event.entity.id)
  }
  
  // Subscribe via fully qualified event names
  eventBus.on(`${moduleName}:${entityName}:created`, createdHandler)
  eventBus.on(`${moduleName}:${entityName}:updated`, updatedHandler)
  eventBus.on(`${moduleName}:${entityName}:deleted`, deletedHandler)
  
  // Store unsubscribe functions
  onUnmounted(() => {
    eventBus.off(`${moduleName}:${entityName}:created`, createdHandler)
    eventBus.off(`${moduleName}:${entityName}:updated`, updatedHandler)
    eventBus.off(`${moduleName}:${entityName}:deleted`, deletedHandler)
  })
})

// Columns auto-generated from EntityDef
const columns = computed(() => {
  return entityService.getEntityDef(moduleName, entityName)
    .fields
    .filter(f => !f.hidden)
    .map(field => ({
      key: field.name,
      title: field.label,
      dataIndex: field.name,
      width: field.columnWidth || 150,
      align: field.align || 'left',
      
      // Custom render based on field type
      customRender: ({ record, column }) => {
        return renderField(field, record[field.name], record)
      },
      
      // Sorting
      sorter: field.sortable !== false 
        ? (a, b) => compare(a[field.name], b[field.name])
        : false,
      
      // Filtering
      filters: field.filterOptions || undefined,
      onFilter: field.filterable !== false 
        ? (value, record) => filter(record[field.name], value)
        : undefined
    }))
})

// Helper: Render field based on type
const renderField = (field, value, record) => {
  switch (field.type) {
    case 'reference':
      return `<a href="/modules/${moduleName}/${field.entity}/${value}">
                ${record[field.displayField]}
              </a>`
    case 'select':
      const option = field.options.find(o => o.value === value)
      return `<a-tag color="blue">${option?.label || value}</a-tag>`
    case 'datetime':
      return new Date(value).toLocaleString()
    case 'boolean':
      return value ? '✓' : ''
    case 'array':
      return value?.map(v => `<a-tag>${v}</a-tag>`).join('')
    default:
      return value
  }
}
</script>

<template>
  <div class="ticket-grid">
    <a-table
      :columns="columns"
      :data-source="tickets"
      :loading="loading"
      :pagination="{ pageSize: 20 }"
      row-key="id"
    >
      <!-- Custom row expansion for detail view -->
      <template #expandedRowRender="{ record }">
        <TicketDetailPanel :ticket="record" />
      </template>
    </a-table>
  </div>
</template>
```

### Two-Way Binding: Form ↔ Entity

The form component binds directly to entity data. When the form submits, changes flow to the entity:

```javascript
// TicketForm.vue - Two-way binding example

<script setup>
import { ref, watch } from 'vue'
import { entityService } from '@/services'

const props = defineProps({
  moduleName: String,
  entityName: String,
  id: String  // null = create mode, else = edit mode
})

const form = ref({
  title: '',
  description: '',
  status: 'open',
  assignedTo: null,
  isUrgent: false,
  tags: []
})

const originalData = ref({})
const loading = ref(false)
const errors = ref({})

// Load existing entity if editing
onMounted(async () => {
  if (props.id) {
    loading.value = true
    const entity = await entityService.get(props.moduleName, props.entityName, props.id)
    form.value = { ...entity }
    originalData.value = { ...entity }
    loading.value = false
  }
})

// Watch for changes
watch(form, (newForm) => {
  // Mark dirty fields
  dirtyFields.value = Object.keys(newForm)
    .filter(key => newForm[key] !== originalData.value[key])
}, { deep: true })

// Submit handler
const handleSubmit = async () => {
  loading.value = true
  errors.value = {}
  
  try {
    // Determine operation: create or update
    if (props.id) {
      // UPDATE: Only send changed fields
      const updates = Object.keys(form.value)
        .filter(key => form.value[key] !== originalData.value[key])
        .reduce((obj, key) => {
          obj[key] = form.value[key]
          return obj
        }, {})
      
      const result = await entityService.update(
        props.moduleName,
        props.entityName,
        props.id,
        updates
      )
      
      // Update local state with server response
      form.value = { ...result }
      originalData.value = { ...result }
      
    } else {
      // CREATE: Send all fields
      const result = await entityService.create(
        props.moduleName,
        props.entityName,
        form.value
      )
      
      // Store new entity ID
      form.value.id = result.id
      originalData.value = { ...result }
      
      // Emit creation event to parent
      emit('created', result)
    }
    
    emit('submitted', form.value)
    
  } catch (error) {
    // Map validation errors to fields
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors
    } else {
      errors.value.general = error.message
    }
  } finally {
    loading.value = false
  }
}

// Field change handler (triggers validation)
const handleFieldChange = (fieldName, value) => {
  form.value[fieldName] = value
  
  // Clear field error on change
  if (errors.value[fieldName]) {
    delete errors.value[fieldName]
  }
}
</script>

<template>
  <a-form
    :model="form"
    :layout="'vertical'"
    @finish="handleSubmit"
  >
    <template v-for="field in entityFields" :key="field.name">
      <a-form-item
        :label="field.label"
        :name="field.name"
        :required="field.required"
        :validate-status="errors[field.name] ? 'error' : ''"
        :help="errors[field.name]"
      >
        <!-- TEXT field -->
        <a-input
          v-if="field.type === 'text'"
          v-model:value="form[field.name]"
          :placeholder="field.placeholder"
          :max-length="field.validation?.maxLength"
          @change="handleFieldChange(field.name, $event.target.value)"
        />
        
        <!-- TEXTAREA field -->
        <a-textarea
          v-else-if="field.type === 'textarea'"
          v-model:value="form[field.name]"
          :rows="field.rows || 4"
          @change="handleFieldChange(field.name, $event.target.value)"
        />
        
        <!-- SELECT field -->
        <a-select
          v-else-if="field.type === 'select'"
          v-model:value="form[field.name]"
          :options="field.options"
          @change="handleFieldChange(field.name, $event)"
        />
        
        <!-- REFERENCE field (Lookup) -->
        <ReferencePicker
          v-else-if="field.type === 'reference'"
          v-model:value="form[field.name]"
          :entity="field.entity"
          :display-field="field.displayField"
          @change="handleFieldChange(field.name, $event)"
        />
        
        <!-- BOOLEAN field -->
        <a-switch
          v-else-if="field.type === 'boolean'"
          v-model:checked="form[field.name]"
          @change="handleFieldChange(field.name, $event)"
        />
        
        <!-- ARRAY field -->
        <a-select
          v-else-if="field.type === 'array'"
          v-model:value="form[field.name]"
          mode="multiple"
          :options="field.options"
          @change="handleFieldChange(field.name, $event)"
        />
      </a-form-item>
    </template>
    
    <a-button type="primary" html-type="submit" :loading="loading">
      {{ props.id ? 'Update' : 'Create' }}
    </a-button>
  </a-form>
</template>
```

---

## 3. Entity ↔ Permission Integration

### Permission Model

All entity operations require permissions. The permission system checks both entity-level and field-level access.

#### Permission Structure

```
entity:{action}:{field?}
```

**Actions**: `create`, `read`, `update`, `delete`, `list`, `export`

**Examples**:
- `ticket:create` — Can create tickets
- `ticket:read` — Can read all ticket fields
- `ticket:read:description` — Can read ticket description field only
- `ticket:update:status` — Can update only status field
- `ticket:delete` — Can delete tickets

### Permission Enforcement in API

Every entity operation checks permissions:

```javascript
// EntityService.create()
async create(moduleName, entityName, data, { userId, userRole }) {
  const entityDef = registry.getEntity(moduleName, entityName)
  
  // 1. Check entity-level create permission
  const hasCreatePerm = permissionService.check(
    userId,
    `${entityName}:create`
  )
  
  if (!hasCreatePerm) {
    throw new ForbiddenError(`User cannot create ${entityName}`)
  }
  
  // 2. Check field-level permissions
  const allowedFields = entityDef.fields
    .filter(field => permissionService.check(userId, `${entityName}:create:${field.name}`))
    .map(f => f.name)
  
  // 3. Filter input data to allowed fields
  const sanitizedData = Object.keys(data)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = data[key]
      return obj
    }, {})
  
  // 4. Run before-hooks
  const processedData = await this.runBeforeHooks(
    entityDef,
    'create',
    sanitizedData,
    { userId, userRole }
  )
  
  // 5. Write to database
  const created = await adapter.create(entityName, processedData)
  
  // 6. Run after-hooks
  await this.runAfterHooks(entityDef, 'create', created, { userId, userRole })
  
  // 7. Emit event
  eventBus.emit(`${moduleName}:${entityName}:created`, {
    entity: created,
    userId,
    timestamp: new Date(),
    source: 'api'
  })
  
  return created
}

// EntityService.read()
async read(moduleName, entityName, id, { userId, userRole }) {
  // 1. Check entity-level read permission
  if (!permissionService.check(userId, `${entityName}:read`)) {
    throw new ForbiddenError(`User cannot read ${entityName}`)
  }
  
  // 2. Get entity from database
  const entity = await adapter.read(entityName, id)
  
  // 3. Filter fields based on field-level permissions
  const readableFields = entityDef.fields
    .filter(field => permissionService.check(userId, `${entityName}:read:${field.name}`))
    .map(f => f.name)
  
  // 4. Remove unreadable fields
  const filtered = {
    id: entity.id,
    ...Object.keys(entity)
      .filter(key => readableFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = entity[key]
        return obj
      }, {})
  }
  
  return filtered
}

// EntityService.update()
async update(moduleName, entityName, id, updates, { userId, userRole }) {
  // 1. Check entity-level update permission
  if (!permissionService.check(userId, `${entityName}:update`)) {
    throw new ForbiddenError(`User cannot update ${entityName}`)
  }
  
  // 2. Check field-level permissions for each updated field
  const updatable = {}
  for (const [field, value] of Object.entries(updates)) {
    if (permissionService.check(userId, `${entityName}:update:${field}`)) {
      updatable[field] = value
    }
  }
  
  // 3. If no fields are updatable, reject
  if (Object.keys(updatable).length === 0) {
    throw new ForbiddenError(`User cannot update any fields`)
  }
  
  // 4. Get current entity
  const current = await adapter.read(entityName, id)
  
  // 5. Run before-hooks
  const processedData = await this.runBeforeHooks(
    entityDef,
    'update',
    updatable,
    { userId, userRole, previousEntity: current }
  )
  
  // 6. Update database
  const updated = await adapter.update(entityName, id, processedData)
  
  // 7. Run after-hooks
  await this.runAfterHooks(
    entityDef,
    'update',
    updated,
    { userId, userRole, previousEntity: current }
  )
  
  // 8. Emit event with before/after states
  eventBus.emit(`${moduleName}:${entityName}:updated`, {
    entity: updated,
    previousEntity: current,
    userId,
    timestamp: new Date(),
    source: 'api'
  })
  
  return updated
}
```

### Field-Level Permission Guards in Views

Views respect field-level permissions:

```javascript
// TicketGrid.vue - Permission-aware column rendering

<script setup>
import { computed } from 'vue'
import { permissionService } from '@/services'

const entityName = 'ticket'

// Only show columns user can read
const columns = computed(() => {
  return entityDef.fields
    .filter(field => {
      // Check if user has field-level read permission
      return permissionService.check(
        authStore.userId,
        `${entityName}:read:${field.name}`
      )
    })
    .map(field => ({
      key: field.name,
      title: field.label,
      // ...
    }))
})

// Only allow editing fields user can update
const isFieldEditable = (fieldName) => {
  return permissionService.check(
    authStore.userId,
    `${entityName}:update:${fieldName}`
  )
}

// In template:
// <a-input v-if="isFieldEditable('status')" v-model:value="form.status" />
// <span v-else>{{ record.status }}</span>
</script>
```

### Permission Example: Ticket Description

```javascript
// Admin can read and update ticket description
admin_user: {
  permissions: ['ticket:read:description', 'ticket:update:description']
}

// Support agent can read but not update description
support_agent: {
  permissions: ['ticket:read:description']  // NO update permission
}

// Customer can't read description at all
customer_user: {
  permissions: []  // NO description permissions
}

// API behavior:
entityService.read('support', 'ticket', 'tkt-001', { userId: 'agent-001' })
// Returns: { id, title, status, assignedTo, ... }
// Field 'description' is ABSENT due to missing 'ticket:read:description'

entityService.update('support', 'ticket', 'tkt-001', 
  { description: 'Updated...' }, 
  { userId: 'agent-001' }
)
// Throws: ForbiddenError - "User cannot update field: description"
```

---

## 4. Workflow ↔ Permission Integration

### Permission Checks in Workflow Execution

Workflows execute with implicit permissions. Before each action, the system checks if the workflow user can perform that action.

#### Workflow Execution Context

Workflows run as a system user with elevated permissions, UNLESS they're triggered by a user action. In that case, the workflow runs with that user's permissions.

```javascript
// Workflow execution context
{
  workflowId: 'auto-assign-ticket',
  triggeredBy: 'support:ticket:created',  // The event that triggered this
  executionId: 'exec-abc123',
  userId: 'system' | 'user-id',  // System if internal, user if user-triggered
  userRole: 'admin' | 'agent' | 'user',
  timestamp: ISO8601,
  
  // Trace
  correlationId: 'corr-xyz789',
  parentExecutionId: null | 'exec-parent'
}
```

#### Permission Checks in Actions

Each workflow action checks permissions:

```javascript
workflow('escalate-ticket', {
  on: ['support:ticket:updated'],
  
  conditions: [
    {
      id: 'check-user-is-admin',
      type: 'permission',
      permission: 'ticket:escalate',
      
      // If permission check fails:
      onFailure: 'skip'  // Skip this step but continue workflow
      // onFailure: 'halt'  // Stop workflow entirely
      // onFailure: 'error' // Emit error event (default)
    }
  ],
  
  steps: [
    {
      id: 'update-priority',
      type: 'action',
      action: {
        type: 'entity-mutate',
        entity: 'support:ticket',
        id: '$event.entity.id',
        mutation: { priority: 'high' },
        
        // Check permission before executing mutation
        requiresPermission: 'ticket:update:priority',
        onPermissionDenied: 'error'  // Throw error if denied
      }
    },
    
    {
      id: 'notify-manager',
      type: 'action',
      action: {
        type: 'notify',
        recipient: '$context.userId',
        template: 'ticket-escalated',
        
        // This action doesn't require special permission
        // (notify is a built-in action)
      }
    }
  ]
})
```

### Conditional Execution Based on User Role

Workflows can branch based on the triggering user's role:

```javascript
workflow('handle-ticket-resolution', {
  on: ['support:ticket:updated'],
  
  conditions: [
    {
      field: '$event.entity.status',
      operator: 'equals',
      value: 'resolved'
    }
  ],
  
  steps: [
    {
      id: 'check-if-admin',
      type: 'condition',
      condition: {
        field: '$context.userRole',
        operator: 'in',
        value: ['admin', 'manager']
      },
      
      // Branch execution
      then: [
        {
          id: 'admin-close-ticket',
          type: 'action',
          action: {
            type: 'entity-mutate',
            entity: 'support:ticket',
            id: '$event.entity.id',
            mutation: { status: 'closed', closedAt: '$now' }
          }
        }
      ],
      
      else: [
        {
          id: 'user-needs-approval',
          type: 'action',
          action: {
            type: 'notify',
            recipient: 'managers',
            template: 'ticket-needs-approval',
            data: { ticketId: '$event.entity.id' }
          }
        }
      ]
    }
  ]
})
```

### Example: Only Admins Can Escalate

```javascript
// Register permission in manifest
export default {
  permissions: [
    {
      id: 'ticket:escalate',
      name: 'Escalate Tickets',
      description: 'Permission to escalate tickets to high priority'
    }
  ]
}

// Workflow
workflow('escalate-on-timeout', {
  on: ['support:ticket:updated'],
  
  conditions: [
    {
      field: '$event.entity.waitingTime',
      operator: 'greaterThan',
      value: 86400  // 24 hours in seconds
    }
  ],
  
  steps: [
    {
      id: 'check-escalate-permission',
      type: 'condition',
      condition: {
        type: 'permission',
        permission: 'ticket:escalate'
      },
      
      then: [
        {
          id: 'escalate-ticket',
          type: 'action',
          action: {
            type: 'entity-mutate',
            entity: 'support:ticket',
            id: '$event.entity.id',
            mutation: {
              priority: 'urgent',
              escalatedAt: '$now',
              escalatedBy: '$context.userId'
            }
          }
        }
      ],
      
      else: [
        {
          id: 'log-permission-denied',
          type: 'action',
          action: {
            type: 'log',
            level: 'warn',
            message: `Ticket escalation blocked: user ${$context.userId} lacks 'ticket:escalate' permission`
          }
        }
      ]
    }
  ]
})

// At runtime:
// Admin user (has 'ticket:escalate'): Ticket escalated ✓
// Agent user (no 'ticket:escalate'): Ticket NOT escalated, logged ✓
```

---

## 5. Data Flow Diagrams

### 5.1 Create Ticket Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                                         │
│                                                                          │
│  Form Component:                                                        │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │ Title:  "Can't login"                                      │         │
│  │ Desc:   "Getting 401 error..."                            │         │
│  │ Status: [Open]                                             │         │
│  │ [Create Button]                                            │         │
│  └────────────────────────────────────────────────────────────┘         │
│                          │                                               │
│                          │ form.submit()                                │
│                          ↓                                               │
│  API Client:                                                            │
│  POST /api/support/tickets                                             │
│  Body: {                                                                │
│    title: "Can't login",                                               │
│    description: "Getting 401 error..."                                │
│  }                                                                      │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           │ HTTP Request
                           ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ SERVER (NestJS)                                                          │
│                                                                          │
│  Ticket Controller                                                      │
│  POST /api/support/tickets                                             │
│  @Post()                                                                │
│  @UseGuards(AuthGuard)                                                 │
│  create(@Body() dto: CreateTicketDto, @Req() req) {                   │
│    return this.ticketService.create(dto, req.user)                   │
│  }                                                                      │
│                          │                                               │
│                          ↓                                               │
│  ┌─ VALIDATION ────────────────────────────────────────────┐            │
│  │ Parse request body:                                      │            │
│  │ {                                                        │            │
│  │   title: "Can't login",                                │            │
│  │   description: "Getting 401 error..."                 │            │
│  │ }                                                        │            │
│  │                                                          │            │
│  │ Validate against EntityDef:                            │            │
│  │ ✓ title: required, maxLength=255 ✓                   │            │
│  │ ✓ description: optional ✓                             │            │
│  │ → Validation passes                                    │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ PERMISSION CHECK ──────────────────────────────────────┐            │
│  │ User: userId='user-123', role='agent'                  │            │
│  │                                                          │            │
│  │ Check: user has 'ticket:create' permission             │            │
│  │   → permissionService.check('user-123', 'ticket:create')           │            │
│  │   → Query permissions_v2 table                          │            │
│  │   → Found: [ticket:create, ticket:read, ...]           │            │
│  │   → ✓ ALLOWED                                           │            │
│  │                                                          │            │
│  │ For each field, check field-level permission:           │            │
│  │   title: has 'ticket:create:title' ✓                  │            │
│  │   description: has 'ticket:create:description' ✓      │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ BEFORE-HOOKS ──────────────────────────────────────────┐            │
│  │ Execute registered before-hooks for entity:create      │            │
│  │                                                          │            │
│  │ Hook 1: Generate ticket number                         │            │
│  │   ticketNumber = generateSequence('ticket')            │            │
│  │   data.number = 'TKT-00127'                            │            │
│  │                                                          │            │
│  │ Hook 2: Set defaults                                   │            │
│  │   data.status = 'open'                                 │            │
│  │   data.createdAt = new Date()                          │            │
│  │   data.createdBy = 'user-123'                          │            │
│  │                                                          │            │
│  │ Processed data:                                         │            │
│  │ {                                                        │            │
│  │   number: 'TKT-00127',                                │            │
│  │   title: "Can't login",                               │            │
│  │   description: "Getting 401 error...",                │            │
│  │   status: 'open',                                      │            │
│  │   createdAt: 2026-04-30T10:45:00Z,                    │            │
│  │   createdBy: 'user-123'                               │            │
│  │ }                                                        │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ DATABASE WRITE ────────────────────────────────────────┐            │
│  │ Adapter (Drizzle): insert into 'support_tickets'       │            │
│  │                                                          │            │
│  │ INSERT INTO support_tickets                             │            │
│  │   (number, title, description, status, created_at, created_by)      │            │
│  │ VALUES                                                   │            │
│  │   ('TKT-00127', "Can't login", "Getting 401 error...", 'open',     │            │
│  │    '2026-04-30 10:45:00', 'user-123')                 │            │
│  │                                                          │            │
│  │ Created ticket:                                         │            │
│  │ {                                                        │            │
│  │   id: 'tkt-abc123def456',                             │            │
│  │   number: 'TKT-00127',                                │            │
│  │   title: "Can't login",                               │            │
│  │   description: "Getting 401 error...",                │            │
│  │   status: 'open',                                      │            │
│  │   createdAt: '2026-04-30T10:45:00Z',                 │            │
│  │   createdBy: 'user-123'                               │            │
│  │ }                                                        │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ AFTER-HOOKS ───────────────────────────────────────────┐            │
│  │ Execute registered after-hooks                          │            │
│  │                                                          │            │
│  │ Hook 1: Audit logging                                  │            │
│  │   auditService.log({                                   │            │
│  │     action: 'create',                                  │            │
│  │     entity: 'ticket',                                  │            │
│  │     recordId: 'tkt-abc123def456',                     │            │
│  │     userId: 'user-123',                                │            │
│  │     changes: { ... }                                    │            │
│  │   })                                                     │            │
│  │                                                          │            │
│  │ Hook 2: Webhooks                                       │            │
│  │   webhookService.trigger('ticket:created', ticket)    │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ EVENT EMISSION ────────────────────────────────────────┐            │
│  │ Emit event to event bus                                 │            │
│  │                                                          │            │
│  │ eventBus.emit('support:ticket:created', {              │            │
│  │   entity: {                                             │            │
│  │     id: 'tkt-abc123def456',                           │            │
│  │     number: 'TKT-00127',                              │            │
│  │     title: "Can't login",                             │            │
│  │     description: "Getting 401 error...",              │            │
│  │     status: 'open',                                    │            │
│  │     createdAt: '2026-04-30T10:45:00Z',               │            │
│  │     createdBy: 'user-123'                             │            │
│  │   },                                                    │            │
│  │   userId: 'user-123',                                  │            │
│  │   timestamp: '2026-04-30T10:45:00Z',                 │            │
│  │   source: 'api',                                       │            │
│  │   metadata: {                                           │            │
│  │     correlationId: 'corr-xyz789',                     │            │
│  │     ipAddress: '192.168.1.100'                        │            │
│  │   }                                                      │            │
│  │ })                                                       │            │
│  │                                                          │            │
│  │ Event stored in audit log for tracing                  │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ WORKFLOW TRIGGER ──────────────────────────────────────┐            │
│  │ Find all workflows subscribed to 'support:ticket:created'           │            │
│  │   → 'auto-assign-ticket'                                │            │
│  │   → 'notify-customer'                                  │            │
│  │   → 'track-sla'                                        │            │
│  │                                                          │            │
│  │ For each workflow:                                      │            │
│  │                                                          │            │
│  │   ┌─ Workflow: auto-assign-ticket ─────────────────┐   │            │
│  │   │ Step 1: Check condition (status === 'open')    │   │            │
│  │   │   ticket.status = 'open' ✓                     │   │            │
│  │   │                                                  │   │            │
│  │   │ Step 2: Query available agents                 │   │            │
│  │   │   SELECT * FROM support_agents                 │   │            │
│  │   │   WHERE available = true                        │   │            │
│  │   │   ORDER BY joined_at ASC LIMIT 1               │   │            │
│  │   │   → Found: { id: 'agent-001', name: 'Alice' }  │   │            │
│  │   │                                                  │   │            │
│  │   │ Step 3: Mutate ticket (assign to agent)        │   │            │
│  │   │   Permission check: 'ticket:update' ✓          │   │            │
│  │   │   UPDATE support_tickets                        │   │            │
│  │   │   SET assigned_to = 'agent-001',               │   │            │
│  │   │       status = 'assigned'                       │   │            │
│  │   │   WHERE id = 'tkt-abc123def456'                │   │            │
│  │   │                                                  │   │            │
│  │   │   → Mutation triggers 'support:ticket:updated'   │   │            │
│  │   │   → [circular: but correlationId prevents loop] │   │            │
│  │   │                                                  │   │            │
│  │   │ Step 4: Send notification                      │   │            │
│  │   │   notificationService.send({                    │   │            │
│  │   │     to: 'agent-001',                            │   │            │
│  │   │     template: 'ticket-assigned',                │   │            │
│  │   │     data: {                                      │   │            │
│  │   │       ticketId: 'tkt-abc123def456',            │   │            │
│  │   │       ticketTitle: "Can't login"               │   │            │
│  │   │     }                                            │   │            │
│  │   │   })                                             │   │            │
│  │   │                                                  │   │            │
│  │   │ ✓ Workflow completed                            │   │            │
│  │   └──────────────────────────────────────────────────┘   │            │
│  │                                                          │            │
│  │   ┌─ Workflow: notify-customer ──────────────────────┐   │            │
│  │   │ Send email to customer                           │   │            │
│  │   │ "Your ticket #TKT-00127 has been created"      │   │            │
│  │   │ ✓ Workflow completed                            │   │            │
│  │   └──────────────────────────────────────────────────┘   │            │
│  │                                                          │            │
│  │   ┌─ Workflow: track-sla ─────────────────────────────┐   │            │
│  │   │ Start SLA clock (24 hours)                       │   │            │
│  │   │ ✓ Workflow completed                            │   │            │
│  │   └──────────────────────────────────────────────────┘   │            │
│  │                                                          │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  HTTP Response (200 OK)                                                 │
│  {                                                                      │
│    success: true,                                                       │
│    data: {                                                              │
│      id: 'tkt-abc123def456',                                          │
│      number: 'TKT-00127',                                             │
│      title: "Can't login",                                            │
│      status: 'assigned',          ← Updated by workflow!              │
│      assignedTo: 'agent-001',      ← Assigned by workflow!            │
│      createdAt: '2026-04-30T10:45:00Z',                              │
│      createdBy: 'user-123'                                            │
│    }                                                                    │
│  }                                                                      │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ HTTP Response
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                                         │
│                                                                          │
│  API Client resolves promise:                                          │
│  const ticket = await createTicket({...})                             │
│                                                                          │
│  Form Component:                                                        │
│  1. Clear form inputs                                                  │
│  2. Emit 'created' event                                               │
│  3. Close modal / redirect to detail view                             │
│                                                                          │
│  Grid Component:                                                        │
│  1. Subscribed to 'support:ticket:created' event                      │
│  2. Receives event payload with new ticket                            │
│  3. Adds new row to grid                                              │
│  4. Re-renders with animation                                         │
│                                                                          │
│  Live Indicators:                                                       │
│  ✓ Ticket created                                                      │
│  ✓ Automatically assigned to Alice                                    │
│  ✓ SLA tracking started                                               │
│  ✓ Customer notified                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Update Ticket Flow (Grid Edit)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser) - Grid View                                            │
│                                                                          │
│  Ticket Grid:                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ ID      │ Number  │ Title          │ Status    │ Assigned To    │    │
│  ├─────────┼─────────┼────────────────┼───────────┼────────────────┤    │
│  │ tkt-001 │ TKT-001 │ Login Issue    │ [assigned]│ Alice          │    │
│  │ tkt-002 │ TKT-002 │ Can't login    │ [open▼] ← Click to edit  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Inline Editor (Editable cell):                                        │
│  <a-select v-model:value="record.status">                             │
│    <a-select-option value="open">Open</a-select-option>              │
│    <a-select-option value="assigned">Assigned</a-select-option>      │
│    <a-select-option value="resolved">Resolved</a-select-option>      │
│  </a-select>                                                            │
│                                                                          │
│  User selects "resolved":                                              │
│  1. v-model:value updates to "resolved"                               │
│  2. @change event fires                                                │
│  3. Auto-save handler:                                                 │
│     await entityService.update('support', 'ticket', 'tkt-abc123',     │
│       { status: 'resolved' }                                           │
│     )                                                                    │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       │ HTTP PATCH /api/support/tickets/tkt-abc123
                       │ { status: "resolved" }
                       ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ SERVER (NestJS)                                                          │
│                                                                          │
│  Ticket Controller                                                      │
│  PATCH /api/support/tickets/:id                                        │
│  @Patch(':id')                                                         │
│  @UseGuards(AuthGuard)                                                 │
│  update(@Param('id') id, @Body() updates, @Req() req) {              │
│    return this.ticketService.update(id, updates, req.user)          │
│  }                                                                      │
│                          │                                               │
│                          ↓                                               │
│  ┌─ PERMISSION CHECK ──────────────────────────────────────┐            │
│  │ User: userId='user-123', role='agent'                  │            │
│  │ Updates: { status: 'resolved' }                         │            │
│  │                                                          │            │
│  │ Check: user has 'ticket:update' ✓                      │            │
│  │ Check: user has 'ticket:update:status' ✓               │            │
│  │                                                          │            │
│  │ → Permission granted, sanitize to allowed fields       │            │
│  │ → Sanitized updates: { status: 'resolved' }            │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ FETCH CURRENT STATE ───────────────────────────────────┐            │
│  │ SELECT * FROM support_tickets WHERE id = 'tkt-abc123'   │            │
│  │                                                          │            │
│  │ Current state (before update):                          │            │
│  │ {                                                        │            │
│  │   id: 'tkt-abc123',                                    │            │
│  │   number: 'TKT-00127',                                 │            │
│  │   title: "Can't login",                                │            │
│  │   status: 'assigned',              ← Will change       │            │
│  │   assignedTo: 'agent-001',                             │            │
│  │   createdBy: 'user-123',                               │            │
│  │   createdAt: '2026-04-30T10:45:00Z'                   │            │
│  │ }                                                        │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ BEFORE-HOOKS ──────────────────────────────────────────┐            │
│  │ Execute registered before-hooks for entity:update      │            │
│  │ (Previous state available for comparison)              │            │
│  │                                                          │            │
│  │ Hook 1: Status change logging                          │            │
│  │   if (previousEntity.status !== 'resolved') {          │            │
│  │     log('Ticket status changed to resolved')           │            │
│  │   }                                                      │            │
│  │                                                          │            │
│  │ Hook 2: Update timestamp                               │            │
│  │   updates.updatedAt = new Date()                       │            │
│  │   updates.updatedBy = 'user-123'                       │            │
│  │                                                          │            │
│  │ Processed updates: { status: 'resolved', updatedAt, updatedBy }     │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ DATABASE UPDATE ───────────────────────────────────────┐            │
│  │ UPDATE support_tickets                                  │            │
│  │ SET status = 'resolved',                               │            │
│  │     updated_at = NOW(),                                │            │
│  │     updated_by = 'user-123'                            │            │
│  │ WHERE id = 'tkt-abc123'                                │            │
│  │                                                          │            │
│  │ Updated ticket:                                         │            │
│  │ {                                                        │            │
│  │   id: 'tkt-abc123',                                    │            │
│  │   number: 'TKT-00127',                                 │            │
│  │   title: "Can't login",                                │            │
│  │   status: 'resolved',               ← Changed!         │            │
│  │   assignedTo: 'agent-001',                             │            │
│  │   createdBy: 'user-123',                               │            │
│  │   createdAt: '2026-04-30T10:45:00Z',                  │            │
│  │   updatedAt: '2026-04-30T11:30:00Z',                  │            │
│  │   updatedBy: 'user-123'                                │            │
│  │ }                                                        │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ AFTER-HOOKS ───────────────────────────────────────────┐            │
│  │ Hook 1: Audit logging (with change tracking)           │            │
│  │   auditService.log({                                   │            │
│  │     action: 'update',                                  │            │
│  │     entity: 'ticket',                                  │            │
│  │     recordId: 'tkt-abc123',                           │            │
│  │     userId: 'user-123',                                │            │
│  │     changes: {                                          │            │
│  │       status: { from: 'assigned', to: 'resolved' }    │            │
│  │     }                                                    │            │
│  │   })                                                     │            │
│  │                                                          │            │
│  │ Hook 2: Webhooks                                       │            │
│  │   webhookService.trigger('ticket:updated', {           │            │
│  │     ticket: updatedTicket,                             │            │
│  │     changes: { status: 'resolved' }                    │            │
│  │   })                                                     │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ EVENT EMISSION ────────────────────────────────────────┐            │
│  │ Emit event with BEFORE and AFTER states                │            │
│  │                                                          │            │
│  │ eventBus.emit('support:ticket:updated', {              │            │
│  │   entity: {                                             │            │
│  │     id: 'tkt-abc123',                                 │            │
│  │     number: 'TKT-00127',                              │            │
│  │     status: 'resolved',                                │            │
│  │     ...                                                 │            │
│  │   },                                                    │            │
│  │   previousEntity: {                                     │            │
│  │     id: 'tkt-abc123',                                 │            │
│  │     number: 'TKT-00127',                              │            │
│  │     status: 'assigned',  ← Before state                │            │
│  │     ...                                                 │            │
│  │   },                                                    │            │
│  │   userId: 'user-123',                                  │            │
│  │   timestamp: '2026-04-30T11:30:00Z',                 │            │
│  │   source: 'api',                                       │            │
│  │   metadata: {                                           │            │
│  │     correlationId: 'corr-abc789'                      │            │
│  │   }                                                      │            │
│  │ })                                                       │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  ┌─ WORKFLOW TRIGGER ──────────────────────────────────────┐            │
│  │ Find all workflows subscribed to 'support:ticket:updated'           │            │
│  │   → 'resolve-ticket-workflow'                           │            │
│  │   → 'notify-stakeholders'                              │            │
│  │   → 'update-sla-metrics'                               │            │
│  │                                                          │            │
│  │   ┌─ Workflow: resolve-ticket-workflow ────────────┐   │            │
│  │   │ Condition: ticket status changed to 'resolved' │   │            │
│  │   │                                                  │   │            │
│  │   │ Step 1: Check if SLA met                       │   │            │
│  │   │   SLA met? YES (resolved within 24h)          │   │            │
│  │   │                                                  │   │            │
│  │   │ Step 2: Update metrics                         │   │            │
│  │   │   UPDATE tickets SET slaStatus = 'met' ...     │   │            │
│  │   │   Emit: 'support:ticket:updated' (again)       │   │            │
│  │   │   [correlationId prevents infinite loop]        │   │            │
│  │   │                                                  │   │            │
│  │   │ Step 3: Send email to customer                 │   │            │
│  │   │   notifyCustomer({                              │   │            │
│  │   │     customerId: ticket.createdBy,               │   │            │
│  │   │     template: 'ticket-resolved'                 │   │            │
│  │   │   })                                             │   │            │
│  │   │                                                  │   │            │
│  │   │ ✓ Workflow completed                            │   │            │
│  │   └──────────────────────────────────────────────────┘   │            │
│  │                                                          │            │
│  │   ┌─ Workflow: notify-stakeholders ───────────────────┐   │            │
│  │   │ Notify manager (assignee's manager)              │   │            │
│  │   │ "Ticket resolved by agent user-123"            │   │            │
│  │   │ ✓ Workflow completed                            │   │            │
│  │   └──────────────────────────────────────────────────┘   │            │
│  │                                                          │            │
│  └──────────────────────┬─────────────────────────────────┘            │
│                         │                                               │
│                         ↓                                               │
│  HTTP Response (200 OK)                                                 │
│  {                                                                      │
│    success: true,                                                       │
│    data: {                                                              │
│      id: 'tkt-abc123',                                                │
│      number: 'TKT-00127',                                             │
│      title: "Can't login",                                            │
│      status: 'resolved',                                              │
│      assignedTo: 'agent-001',                                         │
│      updatedAt: '2026-04-30T11:30:00Z',                              │
│      slaStatus: 'met'       ← Updated by workflow!                    │
│    }                                                                    │
│  }                                                                      │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ HTTP Response
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ CLIENT (Browser) - Grid View                                            │
│                                                                          │
│  Grid Component:                                                        │
│  1. Subscribed to 'support:ticket:updated' event                       │
│  2. Receives event payload with updated ticket                         │
│  3. Finds row by ID: tkt-abc123                                        │
│  4. Updates all fields in place:                                       │
│     row.status = 'resolved'                                            │
│     row.slaStatus = 'met'                                              │
│     row.updatedAt = '2026-04-30T11:30:00Z'                           │
│  5. Re-renders row with animation                                      │
│                                                                          │
│  Updated Grid:                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ ID      │ Number  │ Title          │ Status      │ Assigned To │    │
│  ├─────────┼─────────┼────────────────┼─────────────┼─────────────┤    │
│  │ tkt-001 │ TKT-001 │ Login Issue    │ assigned    │ Alice       │    │
│  │ tkt-002 │ TKT-002 │ Can't login    │ resolved ✓  │ Alice       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Live Indicators:                                                       │
│  ✓ Status updated to 'resolved'                                        │
│  ✓ SLA metrics updated (met)                                           │
│  ✓ Customer notified via email                                         │
│  ✓ Manager notified of resolution                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Complete Ticket Lifecycle Example

This section walks through the complete lifecycle of a ticket from creation to escalation, showing how all systems interact at each stage.

### Phase 1: Customer Creates Ticket

```
TIME: 10:00 AM

User Action:
  1. Customer visits support portal
  2. Fills out ticket form:
     - Title: "Can't reset password"
     - Description: "Getting invalid token error"
  3. Clicks "Submit Ticket"

Backend Processing:
  1. API receives POST /api/support/tickets
  
  2. Permission Check:
     - User: customer (role='customer')
     - Permission: ticket:create ✓
     - Fields: title, description (both creatable) ✓
  
  3. Before-Hooks:
     - Generate ticket number: TKT-00501
     - Set status: open
     - Set priority: normal (default)
     - Record creator: customer-id
  
  4. Database Write:
     INSERT INTO support_tickets 
     (number, title, description, status, priority, created_by, created_at)
     VALUES ('TKT-00501', "Can't reset password", ..., 'open', 'normal', 'cust-123', NOW())
  
  5. After-Hooks:
     - Audit log created
     - Webhook triggered
  
  6. Event Emission:
     Emit: support:ticket:created
     Payload: { entity: ticket, userId: 'cust-123', source: 'api' }
  
  7. Workflows Triggered:
     
     Workflow: auto-assign-ticket
     ├─ Condition: status === 'open' ✓
     ├─ Query: Find first available agent
     │  WHERE available = true AND online = true
     │  ORDER BY assignedTickets.count ASC
     │  → Result: Alice (agent-001)
     ├─ Action: Mutate ticket
     │  UPDATE support_tickets
     │  SET assigned_to = 'agent-001', status = 'assigned'
     │  → Emits: support:ticket:updated
     └─ Action: Notify agent
        Send: "New ticket TKT-00501 assigned to you"
     
     Workflow: notify-customer-creation
     ├─ Send email: "Your ticket #TKT-00501 has been received"
     ├─ Include: Expected response time (4-8 hours)
     └─ Include: Link to ticket tracking
     
     Workflow: track-sla
     ├─ Start SLA clock: 24 hours
     ├─ Set escalation trigger: if unresolved at +24h
     └─ Create metric record

Frontend Result:
  ✓ Form submitted
  ✓ Redirect to ticket detail page
  ✓ Display: "Ticket #TKT-00501 created successfully"
  ✓ Show: "Assigned to Alice"

System State:
  Database:
    tickets table:
      id: tkt-00501
      number: TKT-00501
      title: Can't reset password
      description: Getting invalid token error
      status: assigned              ← Changed by workflow
      assigned_to: agent-001         ← Changed by workflow
      priority: normal
      created_by: cust-123
      created_at: 2026-04-30 10:00:00
      sla_start_time: 2026-04-30 10:00:00
      sla_due_time: 2026-05-01 10:00:00
  
  Workflows:
    auto-assign-ticket: COMPLETED ✓
    notify-customer-creation: IN_PROGRESS (sending email)
    track-sla: ACTIVE (watching for 24h timeout)
  
  Agent Dashboard:
    Alice sees:
      [1] New Ticket - TKT-00501: Can't reset password (from cust-123)
      Priority: Normal
      Assigned to: You
      [Open Ticket]
```

### Phase 2: Agent Reads Ticket

```
TIME: 10:15 AM (+15 minutes)

User Action:
  Agent Alice clicks on ticket in dashboard

Backend Processing:
  1. API receives GET /api/support/tickets/tkt-00501
  
  2. Permission Check:
     - User: Alice (role='agent')
     - Permission: ticket:read ✓
     - Field-level: read:title, read:description, read:status ✓
  
  3. Database Read:
     SELECT * FROM support_tickets WHERE id = 'tkt-00501'
  
  4. Event Emission:
     Emit: support:ticket:read
     Payload: { entity: ticket, userId: 'agent-001', source: 'ui' }
  
  5. Workflows Triggered:
     Workflow: log-ticket-view
     ├─ Record view: { ticketId, agentId, timestamp }
     └─ Update metric: totalViews++

Frontend Result:
  Alice sees ticket details:
    Ticket #TKT-00501
    Title: Can't reset password
    Description: Getting invalid token error
    Status: Assigned
    Assigned to: Alice (you)
    Created: 2026-04-30 10:00:00
    [Reply Button] [Change Status] [Add Note] [Escalate]
```

### Phase 3: Agent Responds (Updates Ticket with Note)

```
TIME: 10:45 AM (+45 minutes)

User Action:
  Alice types response:
    "Thanks for reporting this. I'm looking into the password reset flow now.
     Please try again in a few minutes."
  
  Clicks: "Reply and Update Status"
  Selects new status: "in-progress"

Backend Processing:
  1. API receives PUT /api/support/tickets/tkt-00501
     Body: {
       status: 'in-progress',
       notes: [..., { text: 'Thanks for...', author: 'agent-001', timestamp }]
     }
  
  2. Permission Checks:
     - ticket:update ✓
     - ticket:update:status ✓
     - ticket:update:notes ✓
  
  3. Before-Hooks:
     - Update lastUpdatedAt
     - Update lastUpdatedBy: agent-001
     - Mark lastResponseTime: now
  
  4. Database Update:
     UPDATE support_tickets
     SET status = 'in-progress',
         notes = JSON_APPEND(notes, ...),
         updated_by = 'agent-001',
         updated_at = NOW()
     WHERE id = 'tkt-00501'
  
  5. Event Emission:
     Emit: support:ticket:updated
     Payload: {
       entity: { status: 'in-progress', ... },
       previousEntity: { status: 'assigned', ... },
       userId: 'agent-001',
       timestamp: NOW()
     }
  
  6. Workflows Triggered:
     
     Workflow: notify-customer-update
     ├─ Customer changed from 'assigned' to 'in-progress'
     ├─ Send email to customer:
     │  "Agent Alice replied to your ticket TKT-00501"
     │  Include: Latest note text
     └─ Include: "Reply to this email to continue the conversation"
     
     Workflow: reset-sla-idle-timer
     ├─ Condition: Agent responded to ticket
     ├─ Action: Reset idle timer
     │  idle_start_time = NOW()
     │  idle_timeout = 48h  (2 days)
     └─ Schedule new escalation check at 48h
     
     Workflow: update-agent-metrics
     ├─ Increment: responses_given++
     ├─ Update: first_response_time = (now - creation_time)
     └─ If first_response_time < 4h: record bonus points

Frontend Result:
  Alice sees:
    ✓ Status changed to "in-progress"
    ✓ Note added to timeline
    ✓ "Customer will be notified of your response"

System State:
  Database:
    tickets:
      status: in-progress          ← Changed
      updated_at: 2026-04-30 10:45:00
      updated_by: agent-001
      last_response_time: 10:45:00
      notes: [{ ... original ... }, { new note }]
  
  Workflows:
    notify-customer-update: ACTIVE (sending email)
    reset-sla-idle-timer: SCHEDULED (for 2026-05-02 10:45:00)
    track-sla: STILL ACTIVE (overall 24h clock running)
```

### Phase 4: Customer Replies (No Progress)

```
TIME: 14:30 (4.5 hours later)

Email Notification Received by Customer:
  "Agent Alice replied to your ticket TKT-00501..."
  Customer replies to email: "Still getting the same error. Any update?"

Inbound Email Processing:
  1. Email system receives customer reply
  2. Extract reply body and link to ticket TKT-00501
  3. API POST /api/support/tickets/tkt-00501/notes
     Body: {
       source: 'email',
       text: "Still getting the same error. Any update?",
       inboundFrom: customer_email
     }
  
  4. Permission Check: inbound_email:create_note ✓
  
  5. Before-Hooks:
     - Convert email HTML to plaintext
     - Extract quoted text
     - Link to customer (verify domain)
  
  6. Database Write:
     INSERT INTO ticket_notes
     (ticket_id, type, text, source, created_by, created_at)
     VALUES ('tkt-00501', 'customer', 'Still getting...', 'email', 'cust-123', NOW())
  
  7. Event Emission:
     Emit: support:ticket_note:created
     Payload: { noteId, ticketId, author: 'customer', source: 'email' }
  
  8. Workflows Triggered:
     
     Workflow: escalate-on-customer-urgency
     ├─ Condition: Customer replied multiple times + no resolution
     ├─ Count: This is 2nd customer message
     ├─ Status check: Still 'in-progress' after 4h+
     ├─ Decision: Escalate priority
     │  UPDATE support_tickets SET priority = 'high'
     │  Emit: support:ticket:updated
     └─ Action: Notify agent supervisor
        "Ticket TKT-00501 escalated to HIGH priority.
         Customer has followed up."
     
     Workflow: assign-to-specialist
     ├─ Condition: priority = 'high' AND issue is 'password_reset'
     ├─ Action: Find specialist
     │  Query: agents with expertise='password_systems' AND available=true
     │  → Result: Bob (specialist for password recovery)
     ├─ Action: Reassign ticket
     │  UPDATE: assigned_to = 'agent-002' (Bob)
     │  status = 'escalated'
     └─ Notify: Bob gets escalated ticket + customer context

Frontend Result (Agent Dashboard - Alice's View):
  Alice sees notification:
    "Ticket TKT-00501 escalated and reassigned to Bob (specialist)"
  
  Bob (Specialist) sees:
    [URGENT] New Escalated Ticket - TKT-00501: Can't reset password
    Priority: High
    Re-assigned by: Workflow (escalate-on-customer-urgency)
    Customer Status: Frustrated (2 follow-ups)
    [Urgent - Investigate Immediately]

System State:
  Database:
    tickets:
      status: escalated            ← Changed by workflow
      priority: high               ← Changed by workflow
      assigned_to: agent-002       ← Changed by workflow
      escalated_at: 2026-04-30 14:30:00
      escalation_reason: customer_follow_up
    
    ticket_notes:
      [original note from Alice]
      [customer reply #1]
      [customer reply #2] ← Just added
  
  Workflows:
    escalate-on-customer-urgency: COMPLETED ✓
    assign-to-specialist: COMPLETED ✓
    notify-supervisor: ACTIVE (notifying Alice's manager)
    track-sla: STILL ACTIVE (original 24h clock from 10:00 AM)
```

### Phase 5: Specialist Investigates and Resolves

```
TIME: 16:00 (6 hours after creation)

User Action (Bob - Specialist):
  Bob investigates password reset logs
  Finds issue: Customer's email not verified in 30-day timeout
  Solution: Reset verification and resend verification email
  
  Updates ticket:
    Status: 'resolved'
    Resolution: 'customer_verification_expired'
    Notes: 'Email verification had timed out. Sent new verification link.
            Customer should receive email in 2 minutes.'

Backend Processing:
  1. API PUT /api/support/tickets/tkt-00501
     Body: { status: 'resolved', resolution: 'customer_verification_expired', ... }
  
  2. Permission Checks:
     - ticket:update ✓
     - ticket:update:status ✓
     - ticket:update:resolution ✓
  
  3. Before-Hooks:
     - Record resolver: agent-002
     - Set resolved_at: NOW()
  
  4. Database Update:
     UPDATE support_tickets
     SET status = 'resolved',
         resolution = 'customer_verification_expired',
         resolved_at = NOW(),
         resolved_by = 'agent-002'
     WHERE id = 'tkt-00501'
  
  5. Event Emission:
     Emit: support:ticket:updated
     Payload: {
       entity: { status: 'resolved', ... },
       previousEntity: { status: 'escalated', ... }
     }
  
  6. Workflows Triggered:
     
     Workflow: measure-sla-compliance
     ├─ Event triggered: ticket status → 'resolved'
     ├─ Calculate:
     │  - created_at: 2026-04-30 10:00:00
     │  - resolved_at: 2026-04-30 16:00:00
     │  - actual_time: 6 hours
     │  - sla_due: 24 hours
     │  - sla_status: 'MET' ✓
     ├─ Record metrics:
     │  - first_response_time: 45 minutes
     │  - resolution_time: 6 hours
     │  - interactions: 5 (3 customer, 2 agent)
     └─ Award points: +50 points to Bob (met SLA on escalated ticket)
     
     Workflow: notify-customer-resolution
     ├─ Send email to customer:
     │  Subject: "Ticket #TKT-00501 Resolved"
     │  Body: "Your issue has been resolved. Email verification link sent."
     │  Include: Resolution summary
     │  Include: "Rate this support experience" [link to survey]
     └─ Set email follow-up: if not confirmed in 24h, auto-send reminder
     
     Workflow: quality-review-flagging
     ├─ Condition: First response time < 1 hour + escalation + resolution < 24h
     ├─ Decision: Flag for quality review
     │  This ticket shows excellent response time and problem-solving.
     │  Add to: Bob's performance review queue
     └─ Mark: quality_score = 9.5/10

Frontend Result:
  Bob sees:
    ✓ Ticket marked as "resolved"
    ✓ SLA status: "MET" (6h / 24h)
    ✓ Metrics: First response 45min, total time 6h
    ✓ Points awarded: +50
  
  Customer sees:
    Email: "Your ticket TKT-00501 is resolved"
    Option: "Confirm resolution" or "Reopen ticket"
    Survey: "How was your support experience?" [1-5 stars]

System State:
  Database:
    tickets:
      status: resolved             ← Changed
      resolved_at: 2026-04-30 16:00:00
      resolved_by: agent-002
      sla_status: met
      sla_actual_time_minutes: 360
    
    metrics:
      [New record] {
        ticket_id: tkt-00501,
        first_response_time_minutes: 45,
        resolution_time_minutes: 360,
        escalations: 1,
        sla_met: true,
        resolution_type: customer_verification_expired,
        agent_id: agent-002,
        customer_satisfaction: pending_survey
      }
    
    performance_reviews:
      [New record] {
        agent_id: agent-002,
        ticket_id: tkt-00501,
        quality_score: 9.5,
        reason: excellent_escalated_resolution,
        review_status: pending_manager_review
      }
  
  Workflows:
    measure-sla-compliance: COMPLETED ✓
    notify-customer-resolution: ACTIVE (sending email)
    quality-review-flagging: COMPLETED ✓
    track-sla: COMPLETED ✓ (ticket resolved, SLA clock stopped)
```

### Phase 6: Customer Confirms and Closes

```
TIME: 17:30 (1.5 hours after resolution)

Customer Action:
  Customer receives email with verification link
  Clicks link → Email verified successfully
  Goes to ticket detail → Clicks "Confirm Resolution"

Backend Processing:
  1. API POST /api/support/tickets/tkt-00501/confirm
  
  2. Permission Check: ticket:confirm_resolution ✓
  
  3. Update:
     UPDATE support_tickets
     SET status = 'closed',
         confirmed_at = NOW(),
         customer_satisfaction = pending_survey
     WHERE id = 'tkt-00501'
  
  4. Event Emission:
     Emit: support:ticket:updated
     Payload: {
       entity: { status: 'closed', ... },
       previousEntity: { status: 'resolved', ... }
     }
  
  5. Workflows Triggered:
     
     Workflow: archive-closed-ticket
     ├─ Move to archive after 30 days
     ├─ Schedule: Archive on 2026-05-30
     └─ Create archive record
     
     Workflow: request-customer-survey
     ├─ Send followup email: "Please rate your support experience"
     ├─ Include: Quick survey link (1-5 stars + comment)
     └─ Deadline: 7 days
     
     Workflow: update-team-stats
     ├─ Increment: tickets_closed++
     ├─ Update: avg_resolution_time
     ├─ Update: customer_satisfaction (pending)
     └─ Update leaderboard (Bob moves up)

Frontend Result:
  Customer sees:
    ✓ Ticket closed
    ✓ Email verification successful
    ✓ Prompt to rate experience
  
  Bob (Specialist) sees:
    [CLOSED] TKT-00501
    Status: Closed - Confirmed by customer
    Resolution: Met SLA ✓

Final System State:
  Database:
    tickets:
      status: closed
      confirmed_at: 2026-04-30 17:30:00
      sla_status: met
      resolution_time_minutes: 360
      escalations: 1
      interactions_total: 5
    
    workflows:
      - auto-assign-ticket: COMPLETED
      - notify-customer-creation: COMPLETED
      - escalate-on-customer-urgency: COMPLETED
      - measure-sla-compliance: COMPLETED
      - quality-review-flagging: COMPLETED
      - archive-closed-ticket: SCHEDULED (2026-05-30)
      - request-customer-survey: ACTIVE (7-day window)

Summary Timeline:
  10:00 - Ticket created
  10:15 - Agent Alice assigned (auto-workflow)
  10:45 - Alice responds, changes to in-progress
  14:30 - Customer follows up, escalated to specialist Bob
  16:00 - Bob resolves, SLA met in 6 hours
  17:30 - Customer confirms, ticket closed
  
  Total Time: 7.5 hours
  SLA Target: 24 hours
  SLA Status: MET (6/24 = 25% of budget)
  
  Events Emitted: 8
  Workflows Triggered: 12
  Permissions Checked: 25
  Database Transactions: 7
```

---

## Summary

The Lume runtime integration model unifies five core systems through a publish-subscribe event architecture:

| System | Role | Integration Points |
|---|---|---|
| **Entities** | Source of truth | Emit lifecycle events; store data; enforce rules |
| **Views** | User interface | Subscribe to events; auto-generate from EntityDef; render data |
| **Workflows** | Automation | Subscribe to events; execute actions; mutate entities |
| **Permissions** | Access control | Guard all operations; filter fields; restrict actions |
| **Events** | Communication | Connect all systems; maintain audit trail; enable tracing |

**Key Principles**:

1. **All events flow through the event bus** — No direct coupling between systems
2. **Permissions are enforced everywhere** — At API level, field level, action level, workflow level
3. **State changes are observable** — Every mutation emits an event
4. **Workflows are autonomous agents** — They react to events and trigger further events
5. **Data consistency is maintained** — Transactions, hooks, and correlation IDs prevent corruption

This design enables:
- ✓ Complex multi-step automations (e.g., ticket auto-assignment, escalation, SLA tracking)
- ✓ Real-time UI updates (grid subscriptions to events)
- ✓ Audit trails (all events logged)
- ✓ Permission-based filtering (field-level access control)
- ✓ Extensibility (new workflows can be added without code changes)
- ✓ Observability (correlation IDs trace operations across systems)

