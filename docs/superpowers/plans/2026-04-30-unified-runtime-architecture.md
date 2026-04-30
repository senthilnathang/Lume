# Unified Runtime Architecture for Lume Framework

> **Goal:** Design and document a fully integrated metadata-driven runtime that unifies Lume's entity system, workflow engine, view engine, permission engine, and module loader into a cohesive platform runtime supporting zero-code app generation.

**Architecture:** Central runtime registry coordinates all systems. Entities are the primary abstraction; defining an entity triggers automatic API, UI, and workflow generation. All operations flow through a permission engine. The system is event-driven, with workflows reacting to entity lifecycle events. A datagrid component serves as the primary UI layer.

**Tech Stack:** TypeScript, NestJS, Prisma + Drizzle ORM, TipTap (editor module), Vue 3 + Nuxt 3 (frontend), event emitters

---

## Design Overview

This plan delivers **8 interconnected architectural specifications**:

| Part | Deliverable | Dependencies |
|------|-------------|--------------|
| 1 | Runtime Architecture & Core Interfaces | None |
| 2 | Zero-Code Generation Pipeline | Part 1 |
| 3 | System Integration Model | Parts 1–2 |
| 4 | Datagrid Design (UI Layer) | Parts 1–3 |
| 5 | Permission Enforcement Engine | Parts 1–3 |
| 6 | Agent System Foundation | Parts 1–5 |
| 7 | Performance & Scalability Design | Parts 1–6 |
| 8 | End-to-End Example: Ticket System | Parts 1–7 |

---

## Design Documents to Create

```
docs/
└── architecture/
    ├── 01-runtime-core.md          (Part 1: Core runtime, registry, execution pipeline)
    ├── 02-zero-code-generation.md  (Part 2: Auto-generation pipeline & templates)
    ├── 03-system-integration.md    (Part 3: Entity↔Workflow↔View↔Permission dataflows)
    ├── 04-datagrid-design.md       (Part 4: Grid state model, backend integration, Vue components)
    ├── 05-permission-engine.md     (Part 5: RBAC/ABAC policy engine, enforcement points)
    ├── 06-agent-system.md          (Part 6: Agent lifecycle, event subscription, execution)
    ├── 07-performance-scalability.md (Part 7: Caching, event queues, optimization)
    └── 08-ticket-example.md        (Part 8: Complete working example with all systems)
```

---

# DESIGN TASKS

## Task 1: Core Runtime Architecture & Interfaces

**Output:** `docs/architecture/01-runtime-core.md`

**Deliverables:**
- Runtime architecture diagram (text-based)
- Core interfaces (RuntimeRegistry, EntityMetadata, WorkflowDef, ViewDef, PolicyDef)
- Execution lifecycle diagram (entity create/update/delete → permission check → workflow trigger → view render)
- Central registry design (single source of truth)

**Content Outline:**

1. **Architecture Overview**
   - Diagram: Central RuntimeRegistry with 5 subsystems (Entity, Workflow, View, Permission, Module)
   - Event-driven flow: entity changes → lifecycle events → workflow queue → permission checks → view updates

2. **Core TypeScript Interfaces**
   ```typescript
   interface RuntimeRegistry {
     entities: Map<string, EntityDef>;
     workflows: Map<string, WorkflowDef>;
     views: Map<string, ViewDef>;
     policies: Map<string, PolicyDef>;
     modules: Map<string, ModuleDef>;
     events: EventBus;
     executeEvent(event: RuntimeEvent): Promise<void>;
   }

   interface EntityDef {
     name: string;
     displayName: string;
     fields: EntityField[];
     metadata?: Record<string, unknown>;
     hooks?: EntityHooks;
     permissions?: string[];
   }

   interface RuntimeEvent {
     type: 'entity.create' | 'entity.update' | 'entity.delete';
     entityName: string;
     recordId: string;
     data: Record<string, unknown>;
     context: ExecutionContext;
   }

   interface ExecutionContext {
     userId: string;
     role: string;
     permissions: string[];
     requestId: string;
   }
   ```

3. **Execution Pipeline**
   - Step 1: Entity event fired (create/update/delete)
   - Step 2: Permission check (policy engine validates operation)
   - Step 3: Before-hooks run (custom logic)
   - Step 4: Mutation executed (DB write)
   - Step 5: After-hooks & workflows triggered (event queue)
   - Step 6: Agents subscribe and react
   - Step 7: View invalidation signals (grid refresh)

4. **Registry Initialization**
   - Bootstrap from installed modules
   - Discover defineEntity, defineWorkflow, defineView, etc.
   - Validate schema integrity (no circular dependencies)
   - Emit `registry:ready` event

---

## Task 2: Zero-Code App Generation Pipeline

**Output:** `docs/architecture/02-zero-code-generation.md`

**Deliverables:**
- Generation pipeline flow (input entity → output APIs, views, workflows)
- Default template specifications (form, table, CRUD endpoints)
- Convention-over-configuration rules
- Override mechanism design
- Example: Ticket entity → generated output

**Content Outline:**

1. **Generation Pipeline Flow**
   - Input: EntityDef (from defineEntity)
   - Trigger: Entity registration in RuntimeRegistry
   - Steps:
     - Generate REST API routes (GET /, GET /:id, POST /, PUT /:id, DELETE /:id)
     - Generate optional GraphQL schema
     - Generate default form view (from field types)
     - Generate default table view (from field types)
     - Generate CRUD workflows (on-create, before-update, on-delete hooks)
   - Output: ApiEndpoints, ViewComponents, WorkflowDefinitions

2. **Default Templates**
   - Form template: Renders all fields based on type (text, number, date, select, etc.)
   - Table template: Sortable, filterable grid with inline editing
   - Workflow template: Standard CRUD lifecycle hooks

3. **Convention Rules**
   - Entity `fieldName` → API param `fieldName`
   - Field type `string` → Form input `text`, Table column `text`
   - Field type `date` → Form input `date-picker`, Table column `formatted-date`
   - API route: `/api/{entityName}` (plural auto-handled)
   - Permission naming: `{entityName}:create`, `{entityName}:read`, `{entityName}:update`, `{entityName}:delete`

4. **Override Mechanism**
   - Custom API handlers via `entity.customRoutes`
   - Custom views via `entity.customViews`
   - Custom workflows via `entity.hooks`
   - Pattern: convention wins if no override provided

5. **Example: Ticket Entity**
   ```typescript
   const ticketEntity = defineEntity('Ticket', {
     fields: [
       { name: 'title', type: 'string', required: true },
       { name: 'description', type: 'text' },
       { name: 'status', type: 'select', options: ['open', 'in-progress', 'closed'] },
       { name: 'assignee', type: 'reference', entityName: 'User' },
       { name: 'createdAt', type: 'date', readonly: true }
     ]
   });
   
   // Auto-generated:
   // APIs: GET/POST /api/tickets, GET/PUT/DELETE /api/tickets/:id
   // Views: TicketForm (create/edit), TicketGrid (list)
   // Workflows: onCreate, onUpdate, onDelete
   // Permissions: ticket:create, ticket:read, ticket:update, ticket:delete
   ```

---

## Task 3: System Integration Model

**Output:** `docs/architecture/03-system-integration.md`

**Deliverables:**
- Entity ↔ Workflow integration (lifecycle events, trigger conditions)
- Entity ↔ View integration (field binding, form/grid generation)
- Entity ↔ Permission integration (operation policies, field-level access)
- Workflow ↔ Permission integration (action authorization)
- Data flow diagrams (text-based) for complete scenarios
- Example: Ticket lifecycle across all systems

**Content Outline:**

1. **Entity ↔ Workflow Integration**
   - Entities emit lifecycle events: `entity:created`, `entity:updated`, `entity:deleted`
   - Workflows subscribe to events via `on()` trigger
   - Workflow actions can mutate entity data
   - Example: On Ticket creation, auto-assign to first available agent

2. **Entity ↔ View Integration**
   - Views auto-generate from EntityDef fields
   - Field metadata drives component selection (type → component mapping)
   - View subscriptions to entity events trigger updates
   - Two-way binding: Form/Grid ↔ Entity

3. **Entity ↔ Permission Integration**
   - Entity operations require `entity:action` permissions
   - Field-level permissions restrict visibility/editability
   - Example: `ticket:read:description` hides description field from restricted users

4. **Workflow ↔ Permission Integration**
   - Workflow actions checked against user permissions before execution
   - Workflow conditions can reference user role/permissions
   - Example: "Only admins can escalate tickets"

5. **Data Flow Diagrams**
   - Create Ticket Flow:
     ```
     User submits form
       → API POST /api/tickets
       → Permission check (ticket:create)
       → Before-hooks (validation)
       → Ticket inserted into DB
       → entity:created event emitted
       → Workflows triggered (auto-assign, notify)
       → Agents react (log, webhook)
       → Grid view invalidated (signal refresh)
       → Client receives new ticket
     ```
   
   - Update Ticket Flow:
     ```
     User edits status in grid
       → API PUT /api/tickets/:id
       → Permission check (ticket:update, status field writeable)
       → Before-hooks (validate state transition)
       → Ticket updated in DB
       → entity:updated event emitted
       → Workflows triggered (escalation logic)
       → Agents react (create follow-up tasks)
       → Grid refreshes with new data
     ```

6. **Example: Ticket Lifecycle**
   - Ticket created by user
   - Permission engine: user has `ticket:create`
   - Workflow triggers: auto-assign based on assignee availability
   - Agents watch: log creation, send Slack notification
   - View updates: grid shows new ticket with assigned agent
   - Workflow triggers on assignment: send email to agent
   - Agent acknowledges: workflow tracks SLA timer
   - Escalation agent fires: if no update in 24h, escalate to manager
   - User changes status: permission check, workflow updates assignee availability pool

---

## Task 4: Datagrid Design (Primary UI Layer)

**Output:** `docs/architecture/04-datagrid-design.md`

**Deliverables:**
- Grid state model (columns, filters, sort, grouping, saved views)
- Backend query integration (filter → SQL/Drizzle, pagination, lazy loading)
- Vue 3 component architecture (DataGrid wrapper, column renderers, inline editors)
- Nuxt 3 integration (server-side pagination, prefetch)
- Real-time update mechanism (WebSocket subscription model)

**Content Outline:**

1. **Grid State Model**
   ```typescript
   interface GridState {
     entityName: string;
     columns: GridColumn[];
     filters: FilterCondition[];
     sort: SortOrder[];
     groupBy?: string;
     savedViews: SavedView[];
     currentViewId?: string;
     pagination: { page: number; pageSize: number; total: number };
     selectedRows: string[];
   }

   interface GridColumn {
     field: string;
     label: string;
     type: 'text' | 'date' | 'number' | 'boolean' | 'select' | 'reference';
     editable: boolean;
     sortable: boolean;
     filterable: boolean;
     width?: string;
     render?: (value: unknown, row: Record<string, unknown>) => string;
   }

   interface FilterCondition {
     field: string;
     operator: '=' | '!=' | '>' | '<' | 'in' | 'like' | 'between';
     value: unknown;
   }

   interface SavedView {
     id: string;
     name: string;
     columns: string[];
     filters: FilterCondition[];
     sort: SortOrder[];
     shared: boolean;
   }
   ```

2. **Backend Query Integration**
   - Filter translator: GridState → Drizzle/Prisma query
   - Pagination: offset/limit from GridState
   - Sorting: multiple columns supported
   - Computed columns: backend-side calculations
   - Query optimization: eager load referenced entities

3. **Vue 3 Component Architecture**
   - `<DataGrid>` wrapper component (handles state, event emission)
   - `<GridColumn>` child components (renderer registration)
   - Column renderer plugins: TextRenderer, DateRenderer, ReferenceRenderer, etc.
   - Inline edit mode: cell click → editor modal/inline
   - Validation: pre-save validation using entity field rules

4. **Nuxt 3 Integration**
   - Server-side pagination (reduce client memory)
   - Composable: `useDataGrid(entityName)` (fetches data server-side)
   - Middleware: permission checking before API call
   - Real-time: WebSocket subscription for updates

5. **Real-Time Updates**
   - WebSocket events: `entity:created`, `entity:updated`, `entity:deleted`
   - Client subscribes to entity: `watch('Ticket', callbackFn)`
   - Grid state updated: row inserted/updated/removed
   - Optimistic updates: user sees change immediately, rolled back on error

---

## Task 5: Permission Enforcement Engine

**Output:** `docs/architecture/05-permission-engine.md`

**Deliverables:**
- RBAC (Role-Based) + ABAC (Attribute-Based) policy definitions
- Policy evaluation engine (decision logic)
- Enforcement points (API, Workflow, Query, Field-level)
- Policy rule examples
- Integration with entity operations

**Content Outline:**

1. **RBAC vs ABAC**
   - RBAC: Role-based (admin, user, guest)
   - ABAC: Attribute-based (time, location, user properties, record state)
   - Combined: Role defines baseline, attributes refine

2. **Policy Definition**
   ```typescript
   interface PolicyDef {
     id: string;
     name: string;
     description: string;
     rules: PolicyRule[];
   }

   interface PolicyRule {
     effect: 'allow' | 'deny';
     resource: string; // 'ticket:*', 'ticket:read', 'ticket:update'
     action: string; // 'read', 'create', 'update', 'delete'
     condition?: PolicyCondition; // ABAC condition
   }

   interface PolicyCondition {
     type: 'role' | 'ownership' | 'time' | 'attribute';
     operator: '=' | '!=' | '>' | '<' | 'in';
     value: unknown;
   }
   ```

3. **Policy Evaluation Engine**
   - Engine receives: (user, action, resource, context)
   - Steps:
     - Collect matching rules for user's role
     - Evaluate ABAC conditions
     - Aggregate allow/deny (deny wins)
     - Return decision + explanation

4. **Enforcement Points**
   - **API Level**: Check permission before route handler
     ```typescript
     @Post('/tickets')
     @CheckPermission('ticket:create')
     createTicket(@Body() data) { ... }
     ```
   - **Query Level**: Filter results by user permissions
     ```typescript
     // User can only see own tickets or tickets assigned to them
     tickets = db.tickets.where((t) => 
       t.createdBy === userId || t.assignee === userId
     )
     ```
   - **Workflow Level**: Check before action execution
     ```typescript
     if (!hasPermission(user, 'ticket:escalate')) {
       throw new ForbiddenException();
     }
     ```
   - **Field Level**: Hide/disable fields based on permissions
     ```typescript
     // Form hides description field if user lacks 'ticket:read:description'
     ```

5. **Example Rules**
   ```typescript
   // Rule 1: Users can read their own tickets
   {
     effect: 'allow',
     resource: 'ticket:read',
     condition: { type: 'ownership', operator: '=', value: 'self' }
   }

   // Rule 2: Admins can delete any ticket
   {
     effect: 'allow',
     resource: 'ticket:delete',
     condition: { type: 'role', operator: '=', value: 'admin' }
   }

   // Rule 3: Support team can only escalate tickets during business hours
   {
     effect: 'allow',
     resource: 'ticket:escalate',
     condition: { type: 'time', operator: '>', value: '09:00' }
   }
   ```

---

## Task 6: Agent System Foundation

**Output:** `docs/architecture/06-agent-system.md`

**Deliverables:**
- Agent API (`agent()` function)
- Agent lifecycle (registration, subscription, execution, cleanup)
- Event-driven trigger model
- Example agents (auto-assign, escalation, notification)
- Execution guarantees (at-least-once, idempotency)

**Content Outline:**

1. **Agent API**
   ```typescript
   // Define agent
   agent('ticket:auto-assign', {
     triggers: ['entity:created'],
     entityFilter: { entityName: 'Ticket' },
     async handler(event: RuntimeEvent, context: ExecutionContext) {
       // React to ticket creation
       const ticket = event.data;
       const assignee = await findAvailableAgent();
       await updateTicket(ticket.id, { assignee });
     }
   });

   // Agent state machine:
   // registered → listening → triggered → executing → listening
   ```

2. **Agent Lifecycle**
   - **Registration**: Agent registers via `agent()` in module manifest
   - **Listening**: Agent subscribed to entity events
   - **Trigger**: Entity event matches filter conditions
   - **Execution**: Agent handler runs (async, isolated)
   - **Cleanup**: Completion, error handling, retry logic

3. **Event Subscription Model**
   - Agents subscribe to: `entity:{action}` events
   - Filter by entityName, record state, user role
   - Multi-agent coordination: agents don't block each other
   - Queue: Events queued, agents process async

4. **Example Agents**
   - **Auto-Assign Agent**: On ticket creation, find available agent and assign
   - **Escalation Agent**: On ticket update, check SLA; escalate if breached
   - **Notification Agent**: On ticket update, send notifications to stakeholders
   - **Audit Agent**: On any entity change, log to audit trail

5. **Execution Model**
   - At-least-once delivery: event persisted, agent runs, confirmation checkpoint
   - Idempotency: agents must be idempotent (safe to re-run)
   - Error handling: failed agents logged, dead-letter queue for manual retry
   - Timeout: max 30s per agent execution

---

## Task 7: Performance & Scalability Design

**Output:** `docs/architecture/07-performance-scalability.md`

**Deliverables:**
- Caching strategy (entity metadata, permission cache, query results)
- Event queue architecture (Redis/RabbitMQ)
- Query optimization (lazy loading, eager loading, batch queries)
- Module loading performance (lazy module discovery)
- Bottleneck analysis with recommendations

**Content Outline:**

1. **Caching Strategy**
   - **Metadata Cache**: RuntimeRegistry cached in memory + Redis
     - TTL: 24h (cleared on module install/update)
     - Invalidation: manual bust on defineEntity changes
   - **Permission Cache**: User permissions cached per session
     - TTL: 1h
     - Invalidation: role/permission change events
   - **Query Result Cache**: Entity grid queries (configurable per entity)
     - TTL: 5-30m
     - Invalidation: entity mutation events
   - **Eager Loading**: Related entities prefetched in batch queries

2. **Event Queue Architecture**
   ```
   Event Source (API) → Event Queue (Redis) → Agent Workers (3-5 parallel)
   
   - Event persisted to Redis
   - Worker picks event, processes, marks complete
   - Incomplete events re-queued after timeout
   - Dead-letter queue for permanent failures
   ```

3. **Query Optimization**
   - **Lazy Loading**: Load related fields on-demand
   - **Batch Queries**: Multiple same-entity queries bundled
   - **Index Strategy**: 
     - Indexes on entity ID, foreign keys, commonly filtered fields
     - Composite indexes for multi-field filters
   - **Pagination**: Always limit rows (grid default: 50 rows/page)
   - **Select Minimization**: Only requested fields in query

4. **Module Loading Performance**
   - Lazy discovery: Modules loaded on-demand per request
   - Manifest caching: Module manifests cached
   - Parallel initialization: Modules initialized in parallel
   - Dependency ordering: Respect manifests `depends` array

5. **Bottleneck Analysis**
   - **Current**: Entity operations (create/update/delete) may block on workflow execution
   - **Solution**: Async workflow queuing (client doesn't wait for workflows)
   - **Current**: Permission checks on every API call
   - **Solution**: Permission cache per user session (1h TTL)
   - **Current**: Large grid queries slow (no pagination)
   - **Solution**: Server-side pagination standard (50 rows default)
   - **Target P95**: API response < 300ms, grid load < 2s

---

## Task 8: End-to-End Example — Ticket Management System

**Output:** `docs/architecture/08-ticket-example.md`

**Deliverables:**
- Complete Ticket entity definition
- Auto-generated API endpoints with code
- UI code (form component, grid component)
- Workflow definitions (auto-assign, escalation)
- Permission configuration
- Agent definitions (all 3 example agents)
- Execution walkthrough (user creates ticket → auto-assign → escalation agent fires)
- Testing strategy

**Content Outline:**

1. **Entity Definition**
   ```typescript
   const ticketEntity = defineEntity('Ticket', {
     displayName: 'Support Ticket',
     fields: [
       { name: 'title', type: 'string', required: true, label: 'Title' },
       { name: 'description', type: 'text', label: 'Description' },
       { name: 'status', type: 'select', 
         options: [
           { label: 'Open', value: 'open' },
           { label: 'In Progress', value: 'in-progress' },
           { label: 'Resolved', value: 'resolved' },
           { label: 'Closed', value: 'closed' }
         ],
         default: 'open'
       },
       { name: 'priority', type: 'select',
         options: [
           { label: 'Low', value: 'low' },
           { label: 'Medium', value: 'medium' },
           { label: 'High', value: 'high' },
           { label: 'Critical', value: 'critical' }
         ],
         default: 'medium'
       },
       { name: 'assignee', type: 'reference', entityName: 'User', label: 'Assigned to' },
       { name: 'createdBy', type: 'reference', entityName: 'User', readonly: true },
       { name: 'createdAt', type: 'date', readonly: true },
       { name: 'updatedAt', type: 'date', readonly: true },
       { name: 'resolvedAt', type: 'date' },
       { name: 'dueDate', type: 'date' }
     ],
     permissions: [
       'ticket:create',
       'ticket:read',
       'ticket:update',
       'ticket:delete',
       'ticket:assign',
       'ticket:escalate'
     ],
     hooks: {
       beforeCreate: async (data, context) => {
         data.createdBy = context.userId;
         return data;
       },
       afterCreate: async (record, context) => {
         // Trigger auto-assign agent
       }
     }
   });
   ```

2. **Auto-Generated API Endpoints**
   ```typescript
   // GET /api/tickets
   // Query: ?page=1&pageSize=50&status=open&priority=high&sort=createdAt:desc
   // Returns: { data: Ticket[], total: 150, page: 1, pageSize: 50 }

   // POST /api/tickets
   // Body: { title, description, priority }
   // Returns: { id, title, status: 'open', createdAt, ... }

   // GET /api/tickets/:id
   // Returns: { id, title, description, status, assignee: { id, name }, ... }

   // PUT /api/tickets/:id
   // Body: { status: 'in-progress', assignee: 'user-2' }
   // Returns: updated Ticket

   // DELETE /api/tickets/:id
   // Returns: 204 No Content

   // POST /api/tickets/bulk
   // Body: { ids: ['t1', 't2'], action: 'assign', value: 'user-2' }
   // Returns: { success: true, updated: 2 }
   ```

3. **UI Components**
   - **TicketForm** (Vue 3):
     ```typescript
     <template>
       <form @submit.prevent="submit">
         <input v-model="form.title" type="text" placeholder="Title" required />
         <textarea v-model="form.description"></textarea>
         <select v-model="form.priority">
           <option value="low">Low</option>
           <option value="medium">Medium</option>
           <option value="high">High</option>
           <option value="critical">Critical</option>
         </select>
         <button type="submit">Create Ticket</button>
       </form>
     </template>

     <script setup>
     const form = ref({ title: '', description: '', priority: 'medium' });
     const submit = async () => {
       const response = await api.post('/api/tickets', form.value);
       // Redirect to ticket view
     };
     </script>
     ```
   
   - **TicketGrid** (Vue 3):
     ```typescript
     <template>
       <DataGrid :entityName="'Ticket'" :columns="columns" @row-updated="onRowUpdate">
         <GridColumn field="title" type="text" sortable filterable />
         <GridColumn field="status" type="select" :options="statusOptions" editable />
         <GridColumn field="priority" type="select" :options="priorityOptions" sortable />
         <GridColumn field="assignee" type="reference" entityName="User" />
       </DataGrid>
     </template>

     <script setup>
     const columns = [
       { field: 'title', label: 'Title', type: 'text' },
       { field: 'status', label: 'Status', type: 'select' },
       { field: 'priority', label: 'Priority', type: 'select' },
       { field: 'assignee', label: 'Assigned to', type: 'reference' }
     ];
     const statusOptions = [
       { label: 'Open', value: 'open' },
       { label: 'In Progress', value: 'in-progress' },
       { label: 'Resolved', value: 'resolved' },
       { label: 'Closed', value: 'closed' }
     ];
     </script>
     ```

4. **Workflows**
   ```typescript
   // Auto-assign workflow
   defineWorkflow('ticket-auto-assign', {
     on: 'entity:created',
     filter: { entityName: 'Ticket', status: 'open' },
     async handler(event: RuntimeEvent) {
       const ticket = event.data;
       const agents = await db.users.where({ role: 'support-agent' });
       const available = agents.sort((a, b) => 
         a.openTickets - b.openTickets
       )[0];
       
       await updateTicket(ticket.id, { assignee: available.id });
     }
   });

   // Escalation workflow
   defineWorkflow('ticket-escalate', {
     on: 'entity:updated',
     filter: { entityName: 'Ticket' },
     async handler(event: RuntimeEvent) {
       const ticket = event.data;
       const created = new Date(ticket.createdAt);
       const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
       
       if (ticket.priority === 'critical' && ageHours > 1) {
         await escalateTicket(ticket.id);
       }
     }
   });
   ```

5. **Agents**
   ```typescript
   // Agent 1: Auto-assign
   agent('ticket:auto-assign', {
     triggers: ['entity:created'],
     entityFilter: { entityName: 'Ticket' },
     async handler(event: RuntimeEvent) {
       const ticket = event.data;
       const agents = await findAvailableAgents();
       const assigned = agents[0];
       await updateTicket(ticket.id, { assignee: assigned.id });
       // Event: ticket:assigned fired for other agents to react
     }
   });

   // Agent 2: Escalation
   agent('ticket:escalate', {
     triggers: ['entity:updated'],
     entityFilter: { 
       entityName: 'Ticket',
       priority: { $in: ['high', 'critical'] }
     },
     async handler(event: RuntimeEvent) {
       const ticket = event.data;
       if (shouldEscalate(ticket)) {
         await escalate(ticket);
       }
     }
   });

   // Agent 3: Notifications
   agent('ticket:notify', {
     triggers: ['entity:updated'],
     entityFilter: { entityName: 'Ticket' },
     async handler(event: RuntimeEvent) {
       const ticket = event.data;
       if (ticket.assignee) {
         await sendEmail(ticket.assignee, {
           subject: `Ticket assigned: ${ticket.title}`,
           body: `...`
         });
       }
     }
   });
   ```

6. **Permissions**
   ```typescript
   const ticketPermissions = [
     { name: 'ticket:create', description: 'Create tickets' },
     { name: 'ticket:read', description: 'View tickets' },
     { name: 'ticket:update', description: 'Update tickets' },
     { name: 'ticket:delete', description: 'Delete tickets' },
     { name: 'ticket:assign', description: 'Assign tickets' },
     { name: 'ticket:escalate', description: 'Escalate tickets' }
   ];

   // RBAC: Assign to roles
   assignPermissionsToRole('support-agent', ['ticket:create', 'ticket:read', 'ticket:update']);
   assignPermissionsToRole('support-manager', ['ticket:*', 'ticket:escalate']);
   assignPermissionsToRole('admin', ['ticket:*']);

   // ABAC: Field-level access
   const policies = [
     {
       resource: 'ticket:read:description',
       condition: { type: 'role', value: 'support-agent' }
     },
     {
       resource: 'ticket:assign',
       condition: { type: 'ownership', value: 'manager-of-assignee' }
     }
   ];
   ```

7. **Execution Walkthrough**
   ```
   === User Creates Ticket ===
   
   Step 1: User fills form, clicks "Create"
   Step 2: Frontend POST /api/tickets { title, description, priority }
   Step 3: API permission check: user has 'ticket:create'? YES
   Step 4: Before-hooks run: set createdBy = userId
   Step 5: Insert Ticket into DB
   Step 6: Event fired: entity:created { entityName: 'Ticket', recordId: 't-123', data: {...} }
   Step 7: Workflow "ticket-auto-assign" triggered
   Step 8:   - Find available support agents (sort by open ticket count)
   Step 9:   - Update ticket: assignee = agent-1
   Step 10: Event fired: entity:updated { assignee changed from null → agent-1 }
   Step 11: Agent "ticket:notify" triggered
   Step 12:   - Send email to agent-1: "Ticket assigned: {title}"
   Step 13: Grid subscribed to Ticket events
   Step 14: Grid refreshes, shows new ticket with agent-1 assigned
   Step 15: Escalation agent listening (waiting 1h for priority=critical tickets)
   
   === 1 Hour Later (Critical Priority) ===
   
   Step A: Escalation agent check runs (or triggered on next update)
   Step B: Ticket age > 1 hour AND priority = critical? YES
   Step C: Escalate ticket to manager
   Step D: Event fired: ticket:escalated
   Step E: Manager notified via UI/email
   ```

8. **Testing Strategy**
   - **Unit Tests**: Individual components (entity validation, permission rules)
   - **Integration Tests**: Entity → API → Grid flow
   - **Agent Tests**: Agent triggering and execution
   - **Workflow Tests**: Lifecycle event handling
   - **Permission Tests**: RBAC/ABAC enforcement
   - **Performance Tests**: Grid pagination, caching behavior

---

## Dependencies & Sequencing

| Task | Depends On | Output Used By |
|------|-----------|----------------|
| 1 | None | 2, 3, 4, 5, 6, 7, 8 |
| 2 | 1 | 3, 8 |
| 3 | 1, 2 | 4, 5, 6, 7, 8 |
| 4 | 1, 3 | 8 |
| 5 | 1, 3 | 6, 7, 8 |
| 6 | 1, 5 | 7, 8 |
| 7 | 1-6 | 8 |
| 8 | 1-7 | Final example |

---

## Implementation Notes

- **Design Only**: These documents are specifications, not code implementation
- **Reference Implementation**: Task 8 shows a real example you can build from
- **Interfaces**: All TypeScript interfaces are contracts to be refined during implementation
- **Diagrams**: Text-based ASCII/Mermaid diagrams for architecture clarity
- **Code Samples**: Pseudocode-like; real implementation adapts to project conventions

---

## Next Steps (After Design Complete)

1. Review all 8 architecture documents
2. Identify any gaps or conflicts
3. Create implementation plan for core runtime (Part 1 code)
4. Build example module (Ticket Management) to validate design
5. Iterate architecture based on implementation learnings
