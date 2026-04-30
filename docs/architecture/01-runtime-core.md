# Core Runtime Architecture & Interfaces

## Overview

The Lume Unified Runtime is a metadata-driven execution engine that orchestrates entity mutations, validation, workflows, permissions, views, and agents through a single coherent system. It replaces scattered CRUD endpoints, hook systems, and event emitters with a unified registry and event-driven pipeline.

**Key Design Goals:**
- Single source of truth for entity definitions, workflows, and permissions
- Type-safe execution context passed through entire pipeline
- Event-driven architecture for decoupled subsystems
- Efficient permission evaluation before mutations
- Automatic view invalidation on data changes
- Agent reactivity to business events

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      RuntimeRegistry                             │
│                  (Singleton, Bootstrap)                          │
└─────────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Entity     │  │  Workflow    │  │    View      │
    │  Subsystem   │  │  Subsystem   │  │  Subsystem   │
    │              │  │              │  │              │
    │ - Registry   │  │ - Registry   │  │ - Registry   │
    │ - Executor   │  │ - Executor   │  │ - Listener   │
    │ - Store      │  │ - Store      │  │ - Cache      │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Permission   │  │   Module     │  │   Events     │
    │  Subsystem   │  │  Subsystem   │  │   Bus        │
    │              │  │              │  │              │
    │ - Engine     │  │ - Loader     │  │ - Publish    │
    │ - Evaluator  │  │ - Initializer│  │ - Subscribe  │
    │ - Cache      │  │ - Registry   │  │ - Emit       │
    └──────────────┘  └──────────────┘  └──────────────┘
```

**Subsystems:**
1. **Entity Subsystem** — Entity definitions, field validators, hooks, mutation execution
2. **Workflow Subsystem** — Workflow definitions, trigger evaluation, action execution
3. **View Subsystem** — View definitions, lazy loading, cache invalidation
4. **Permission Subsystem** — Permission evaluation, role checks, field-level access
5. **Module Subsystem** — Module discovery, lifecycle, dependency injection

---

## Event-Driven Flow Diagram

```
User Action (HTTP Request)
        │
        ▼
┌──────────────────────────────┐
│ Step 1: Entity Event Fired    │
│ (create | update | delete)    │
│                               │
│ Event: {                      │
│   type: 'entity:mutate',      │
│   entityName: 'User',         │
│   action: 'update',           │
│   data: {...}                 │
│ }                             │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Step 2: Permission Check      │
│                               │
│ - Evaluate role-based rules   │
│ - Check field-level access    │
│ - Apply domain filters        │
│                               │
│ Result: Allow | Deny | Error  │
└──────────────────────────────┘
        │
        ├─ DENY ───────────────────┐
        │                           │
        │                    Emit: ❌ Forbidden
        │                    Return to client
        │
        ▼ (ALLOW)
┌──────────────────────────────┐
│ Step 3: Before-Hooks         │
│                               │
│ - Data transformation         │
│ - Validation                  │
│ - Side-effect setup           │
│                               │
│ May throw errors              │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Step 4: Mutation Executed     │
│                               │
│ - Write to database           │
│ - Update record state         │
│ - Generate change event       │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Step 5: After-Hooks &         │
│         Workflows Triggered   │
│                               │
│ - Post-mutation side effects  │
│ - Trigger workflow conditions │
│ - Emit domain events          │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Step 6: Agents Subscribe &    │
│         React                 │
│                               │
│ - Listen to workflow events   │
│ - Execute agent actions       │
│ - Chain dependent workflows   │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Step 7: View Invalidation     │
│                               │
│ - Signal affected views       │
│ - Mark cache as stale         │
│ - Clients refresh via WebSocket│
└──────────────────────────────┘
        │
        ▼
    Return Result
    to Client
```

---

## Core TypeScript Interfaces

### RuntimeRegistry

The central singleton that bootstraps and coordinates all subsystems.

```typescript
interface RuntimeRegistry {
  /**
   * Initialize the registry from installed modules.
   * - Discover defineEntity, defineWorkflow, defineView exports
   * - Validate schema integrity
   * - Emit 'registry:ready' when complete
   */
  bootstrap(installedModules: InstalledModule[]): Promise<void>;

  /**
   * Get entity definition by name.
   */
  getEntityDef(entityName: string): EntityDef | null;

  /**
   * Get all registered entity definitions.
   */
  getAllEntityDefs(): EntityDef[];

  /**
   * Get workflow definition by name.
   */
  getWorkflowDef(workflowName: string): WorkflowDef | null;

  /**
   * Get view definition by name.
   */
  getViewDef(viewName: string): ViewDef | null;

  /**
   * Get permission engine instance.
   */
  getPermissionEngine(): PermissionEngine;

  /**
   * Get entity executor instance.
   */
  getEntityExecutor(): EntityExecutor;

  /**
   * Get workflow executor instance.
   */
  getWorkflowExecutor(): WorkflowExecutor;

  /**
   * Subscribe to runtime events.
   */
  on(
    event: 'registry:ready' | 'entity:created' | 'entity:updated' | 'entity:deleted' | 'workflow:triggered',
    handler: (payload: any) => void
  ): void;

  /**
   * Check if registry is initialized and ready.
   */
  isReady(): boolean;
}
```

### EntityDef

Complete entity definition including fields, metadata, hooks, and permissions.

```typescript
interface EntityDef {
  /**
   * Unique entity name (e.g., 'User', 'Post', 'Comment').
   */
  name: string;

  /**
   * Human-readable label.
   */
  label: string;

  /**
   * Database table name (if stored).
   */
  tableName?: string;

  /**
   * Module that owns this entity.
   */
  module: string;

  /**
   * Field definitions.
   */
  fields: Record<string, EntityField>;

  /**
   * Entity-level metadata.
   */
  metadata: {
    /**
     * If true, records can be soft-deleted (has deleted_at column).
     */
    softDelete?: boolean;

    /**
     * If true, entity supports audit logging.
     */
    auditable?: boolean;

    /**
     * If true, entity supports versioning.
     */
    versionable?: boolean;

    /**
     * Custom metadata (e.g., icon, color, categories).
     */
    custom?: Record<string, any>;
  };

  /**
   * Lifecycle hooks.
   */
  hooks: EntityHooks;

  /**
   * Entity-level permission rules.
   */
  permissions: EntityPermission[];

  /**
   * Field-level permission rules.
   */
  fieldPermissions: Record<string, FieldPermission[]>;

  /**
   * List of workflow names triggered by this entity's mutations.
   */
  triggersWorkflows: string[];

  /**
   * Default values for new records.
   */
  defaults?: Record<string, any>;

  /**
   * Validation schema (e.g., Zod, Joi).
   */
  schema?: any;
}
```

### EntityField

Defines a single field's structure, type, and validation.

```typescript
interface EntityField {
  /**
   * Field name (database column or property).
   */
  name: string;

  /**
   * JavaScript type (string, number, boolean, date, object, array, etc.).
   */
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'enum';

  /**
   * Human-readable label.
   */
  label: string;

  /**
   * If true, field is required on create.
   */
  required?: boolean;

  /**
   * If true, field cannot be updated after creation.
   */
  readOnly?: boolean;

  /**
   * Default value (static or function).
   */
  default?: any;

  /**
   * Validation rules.
   */
  validation?: {
    /**
     * Minimum length (strings) or value (numbers).
     */
    min?: number;

    /**
     * Maximum length (strings) or value (numbers).
     */
    max?: number;

    /**
     * Regex pattern.
     */
    pattern?: RegExp;

    /**
     * Enum of allowed values.
     */
    enum?: string[];

    /**
     * Custom validation function.
     */
    custom?: (value: any, record: Record<string, any>) => boolean;
  };

  /**
   * If true, field is indexed in the database.
   */
  indexed?: boolean;

  /**
   * If true, field is unique.
   */
  unique?: boolean;

  /**
   * Relationship type (if applicable).
   */
  relation?: {
    /**
     * 'hasOne', 'hasMany', 'belongsTo', 'belongsToMany'
     */
    type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

    /**
     * Related entity name.
     */
    entity: string;

    /**
     * Foreign key field name.
     */
    foreignKey?: string;
  };

  /**
   * If true, visible in list/table views by default.
   */
  visibleInList?: boolean;

  /**
   * If true, visible in detail/form views by default.
   */
  visibleInDetail?: boolean;

  /**
   * UI component hint (e.g., 'text', 'textarea', 'select', 'date-picker', 'rich-editor').
   */
  uiComponent?: string;

  /**
   * Custom field metadata (e.g., placeholder, help text).
   */
  custom?: Record<string, any>;
}
```

### EntityHooks

Lifecycle hooks for entity mutations.

```typescript
interface EntityHooks {
  /**
   * Runs before any create, update, or delete.
   * May throw to reject the operation.
   */
  beforeMutate?: (
    action: 'create' | 'update' | 'delete',
    data: Record<string, any>,
    context: ExecutionContext
  ) => Promise<Record<string, any> | void>;

  /**
   * Runs before create specifically.
   * Return modified data or void.
   */
  beforeCreate?: (
    data: Record<string, any>,
    context: ExecutionContext
  ) => Promise<Record<string, any> | void>;

  /**
   * Runs before update specifically.
   * Receives both old and new data.
   */
  beforeUpdate?: (
    data: Record<string, any>,
    oldRecord: Record<string, any>,
    context: ExecutionContext
  ) => Promise<Record<string, any> | void>;

  /**
   * Runs before delete specifically.
   */
  beforeDelete?: (
    record: Record<string, any>,
    context: ExecutionContext
  ) => Promise<void>;

  /**
   * Runs after create successfully.
   * Result is not modifiable (informational).
   */
  afterCreate?: (
    record: Record<string, any>,
    context: ExecutionContext
  ) => Promise<void>;

  /**
   * Runs after update successfully.
   * Receives both old and new record.
   */
  afterUpdate?: (
    newRecord: Record<string, any>,
    oldRecord: Record<string, any>,
    context: ExecutionContext
  ) => Promise<void>;

  /**
   * Runs after delete successfully.
   */
  afterDelete?: (
    record: Record<string, any>,
    context: ExecutionContext
  ) => Promise<void>;

  /**
   * Runs if any mutation fails (exception handler).
   * Can log, alert, or recover.
   */
  onError?: (
    error: Error,
    action: 'create' | 'update' | 'delete',
    context: ExecutionContext
  ) => Promise<void>;
}
```

### RuntimeEvent

Event emitted by the runtime at each pipeline stage.

```typescript
interface RuntimeEvent {
  /**
   * Event type identifier (e.g., 'entity:created', 'workflow:triggered').
   */
  type: string;

  /**
   * Entity name that triggered the event (e.g., 'User').
   */
  entityName?: string;

  /**
   * Action performed ('create', 'update', 'delete', 'trigger', etc.).
   */
  action?: string;

  /**
   * Record ID affected.
   */
  recordId?: string | number;

  /**
   * Mutation data (new values or delta).
   */
  data?: Record<string, any>;

  /**
   * Old data (for updates/deletes).
   */
  oldData?: Record<string, any>;

  /**
   * Execution context at event time.
   */
  context: ExecutionContext;

  /**
   * Timestamp of event.
   */
  timestamp: Date;

  /**
   * Unique request ID for tracing.
   */
  requestId: string;

  /**
   * Additional metadata.
   */
  metadata?: Record<string, any>;

  /**
   * Error (if event is failure).
   */
  error?: Error;
}
```

### ExecutionContext

Type-safe context passed through entire pipeline. Populated at request entry, accessible in hooks, workflows, and agents.

```typescript
interface ExecutionContext {
  /**
   * Unique request identifier (UUID).
   */
  requestId: string;

  /**
   * Authenticated user ID.
   */
  userId: string | number;

  /**
   * User's role (e.g., 'admin', 'editor', 'viewer').
   */
  role: string;

  /**
   * User's permissions (array of permission strings).
   * Format: 'entity:action' (e.g., 'User:create', 'Post:update').
   */
  permissions: string[];

  /**
   * IP address of requester.
   */
  ipAddress?: string;

  /**
   * User agent string.
   */
  userAgent?: string;

  /**
   * HTTP method ('GET', 'POST', 'PUT', 'DELETE', etc.).
   */
  method?: string;

  /**
   * Request path.
   */
  path?: string;

  /**
   * Query parameters.
   */
  query?: Record<string, any>;

  /**
   * Request body (if applicable).
   */
  body?: Record<string, any>;

  /**
   * Domain filter(s) applied to user (e.g., { orgId: 123 }).
   */
  domainFilter?: Record<string, any>;

  /**
   * Timestamp of request start.
   */
  startTime: Date;

  /**
   * Custom context data set by middleware or hooks.
   */
  custom?: Record<string, any>;

  /**
   * Check if user has permission.
   */
  hasPermission(permission: string): boolean;

  /**
   * Check if user has any of the given roles.
   */
  hasRole(...roles: string[]): boolean;

  /**
   * Check if user is admin (admin or super_admin role).
   */
  isAdmin(): boolean;
}
```

### EntityPermission

Entity-level permission rule (read, create, update, delete an entire entity).

```typescript
interface EntityPermission {
  /**
   * Action ('create', 'read', 'update', 'delete').
   */
  action: 'create' | 'read' | 'update' | 'delete';

  /**
   * Roles allowed to perform this action.
   */
  allowedRoles: string[];

  /**
   * Optional condition function (e.g., check if record belongs to user).
   */
  condition?: (record: Record<string, any>, context: ExecutionContext) => boolean;
}
```

### FieldPermission

Field-level permission rule (read or update a specific field).

```typescript
interface FieldPermission {
  /**
   * Action ('read', 'update').
   */
  action: 'read' | 'update';

  /**
   * Roles allowed to perform this action on this field.
   */
  allowedRoles: string[];

  /**
   * Optional condition function.
   */
  condition?: (record: Record<string, any>, context: ExecutionContext) => boolean;
}
```

---

## Execution Pipeline (7 Steps)

### Step 1: Entity Event Fired

A user action (HTTP POST/PUT/DELETE) initiates a mutation request.

**Flow:**
1. Request arrives at endpoint (e.g., `POST /api/users`)
2. Route handler creates `ExecutionContext` from HTTP request
3. Handler calls `entityExecutor.mutate()`
4. Event of type `entity:mutate` is queued

**Example:**
```typescript
// User calls:
POST /api/users { name: 'Alice', email: 'alice@example.com' }

// Handler does:
const context = createExecutionContext(req);
const result = await entityExecutor.mutate({
  entityName: 'User',
  action: 'create',
  data: { name: 'Alice', email: 'alice@example.com' },
  context
});

// Internally, event fired:
{
  type: 'entity:mutate',
  entityName: 'User',
  action: 'create',
  data: { name: 'Alice', email: 'alice@example.com' },
  context: {...}
}
```

---

### Step 2: Permission Check

Before any mutation, the permission engine evaluates whether the user is allowed.

**Flow:**
1. Retrieve entity definition from registry
2. Check entity-level permission (e.g., 'User:create')
3. If update, check field-level permissions for changed fields
4. Apply domain filters (e.g., user can only create records in their org)
5. Return Allow, Deny, or throw error

**Permission Evaluation:**
```typescript
const allowed = permissionEngine.evaluate({
  entityName: 'User',
  action: 'create',
  record: { name: 'Alice', email: 'alice@example.com' },
  context
});

if (!allowed) {
  throw new ForbiddenException('User:create denied');
}
```

**Special Cases:**
- **Admin bypass**: Users with `admin` or `super_admin` roles skip this step
- **Field-level**: If updating `Post.title` and `Post.published`, check both fields' permissions
- **Domain filters**: If user belongs to Organization X, filter enforces `orgId === X`

---

### Step 3: Before-Hooks Run

Hooks execute to validate, transform, or reject the mutation.

**Flow:**
1. Call `entity.hooks.beforeMutate()` if defined
2. Call action-specific hook (`beforeCreate`, `beforeUpdate`, or `beforeDelete`)
3. Hooks may:
   - Throw to reject mutation (e.g., validation error)
   - Modify data and return transformed version
   - Return void (data unchanged)
4. If any hook throws, emit error event and stop pipeline

**Example:**
```typescript
// Entity definition:
hooks: {
  beforeCreate: async (data, context) => {
    if (!data.email.includes('@')) {
      throw new BadRequestException('Invalid email');
    }
    return { ...data, email: data.email.toLowerCase() };
  }
}

// Execution:
// Input: { name: 'Alice', email: 'ALICE@EXAMPLE.COM' }
// After hook: { name: 'Alice', email: 'alice@example.com' }
// If validation failed: Hook throws, pipeline stops
```

---

### Step 4: Mutation Executed

The actual write to the database occurs.

**Flow:**
1. Pass transformed data to entity store/repository
2. Execute database INSERT, UPDATE, or DELETE
3. Store returns the new/updated/deleted record
4. Generate change event with `oldData` and new data
5. Update any in-memory caches

**Implementation Details:**
- **Prisma entities**: Use PrismaAdapter for core models
- **Drizzle entities**: Use DrizzleAdapter for module models
- **Atomicity**: Single transaction, all-or-nothing
- **Change tracking**: Store old data for audit log and after-hooks

---

### Step 5: After-Hooks & Workflows Triggered

Post-mutation side effects and workflow triggers execute.

**Flow:**
1. Call `entity.hooks.afterCreate/afterUpdate/afterDelete()`
2. Hooks may:
   - Send emails, notifications
   - Update related records
   - Call external APIs
   - Cannot modify the persisted record (it's already committed)
3. For each workflow in `entity.triggersWorkflows`:
   - Evaluate trigger conditions (e.g., `status === 'published'`)
   - If matched, enqueue workflow execution
4. Emit domain events (e.g., `'user:created'`, `'post:published'`)

**Example:**
```typescript
// Entity definition:
hooks: {
  afterCreate: async (record, context) => {
    // Send welcome email
    await emailService.send(record.email, 'Welcome!');
  }
},
triggersWorkflows: ['SendWelcomeEmail', 'NotifyAdmins']

// Execution:
// User created → afterCreate runs → workflows SendWelcomeEmail and NotifyAdmins enqueued
```

---

### Step 6: Agents Subscribe and React

Agents listen to workflow events and execute their own actions.

**Flow:**
1. WorkflowExecutor fires workflow execution events
2. AgentExecutor subscribes to these events
3. Agents matching the workflow trigger are activated
4. Agent actions execute (e.g., create related records, send HTTP requests)
5. Agent actions may themselves trigger workflows (cascading)
6. All agent actions logged for audit trail

**Example:**
```typescript
// Workflow triggered:
{
  type: 'workflow:triggered',
  workflowName: 'SendWelcomeEmail',
  triggerData: { userId: 42, email: 'alice@example.com' },
  context: {...}
}

// Agent listens:
const agent = {
  name: 'WelcomeEmailAgent',
  triggers: ['SendWelcomeEmail'],
  actions: [
    {
      type: 'http',
      method: 'POST',
      url: 'https://email-service.com/send',
      body: { email: '{{triggerData.email}}', template: 'welcome' }
    }
  ]
};

// Agent executes → HTTP request sent
```

---

### Step 7: View Invalidation Signals

Cache is invalidated and clients are notified of changes.

**Flow:**
1. ViewListener detects entity mutation from Step 4
2. Identify all views that include the mutated entity (e.g., `UserListView` uses `User` entity)
3. Mark those views' caches as stale
4. Emit cache invalidation event with affected view names
5. WebSocket sends invalidation signal to connected clients
6. Clients refresh views on next access or via polling

**Implementation:**
```typescript
// Step 4 mutation: User updated
// Step 7 detects: `User` entity changed

// Views using `User` entity:
const viewsAffected = ['UserListView', 'UserDetailView'];

// Emit:
{
  type: 'view:invalidated',
  views: ['UserListView', 'UserDetailView'],
  entityName: 'User',
  recordId: 42
}

// WebSocket broadcast to clients:
{
  event: 'cache:invalidated',
  data: { views: ['UserListView', 'UserDetailView'] }
}
```

---

## Registry Initialization Process

### Bootstrap Sequence

The `RuntimeRegistry.bootstrap()` method orchestrates module discovery and initialization.

**Flow:**

```
1. Registry.bootstrap(installedModules)
        │
        ▼
2. For each installed module:
   - Load module metadata from DB
   - Import module JavaScript file
   - Discover exports:
     * defineEntity()
     * defineWorkflow()
     * defineView()
   - Collect definitions
        │
        ▼
3. Entity Validation Phase:
   - Check field names are unique per entity
   - Validate field types and relations
   - Ensure referenced entities exist
   - Check for circular dependencies
   - Validate permission rules
        │
        ▼
4. Workflow Validation Phase:
   - Check trigger entity exists
   - Validate action configurations
   - Ensure agent references are resolvable
        │
        ▼
5. View Validation Phase:
   - Verify source entity exists
   - Check filters reference valid fields
   - Validate field orderings
        │
        ▼
6. Cross-System Integration:
   - Link workflows to entities (triggersWorkflows)
   - Link views to entities
   - Link agents to workflows
        │
        ▼
7. Emit 'registry:ready' Event
   - All systems operational
   - Route handlers can begin serving requests
```

### Bootstrap Implementation Outline

```typescript
class RuntimeRegistry {
  private entityDefs: Map<string, EntityDef> = new Map();
  private workflowDefs: Map<string, WorkflowDef> = new Map();
  private viewDefs: Map<string, ViewDef> = new Map();
  private ready = false;

  async bootstrap(installedModules: InstalledModule[]): Promise<void> {
    try {
      // Phase 1: Discover definitions from modules
      for (const module of installedModules) {
        const modulePath = `/opt/Lume/backend/src/modules/${module.name}`;
        const moduleExports = await import(modulePath);

        // Collect entity definitions
        if (moduleExports.defineEntity) {
          const entities = Array.isArray(moduleExports.defineEntity)
            ? moduleExports.defineEntity
            : [moduleExports.defineEntity];
          for (const entity of entities) {
            this.entityDefs.set(entity.name, entity);
          }
        }

        // Collect workflow definitions
        if (moduleExports.defineWorkflow) {
          const workflows = Array.isArray(moduleExports.defineWorkflow)
            ? moduleExports.defineWorkflow
            : [moduleExports.defineWorkflow];
          for (const workflow of workflows) {
            this.workflowDefs.set(workflow.name, workflow);
          }
        }

        // Collect view definitions
        if (moduleExports.defineView) {
          const views = Array.isArray(moduleExports.defineView)
            ? moduleExports.defineView
            : [moduleExports.defineView];
          for (const view of views) {
            this.viewDefs.set(view.name, view);
          }
        }
      }

      // Phase 2: Validate schema integrity
      await this.validateEntitySchema();
      await this.validateWorkflowSchema();
      await this.validateViewSchema();

      // Phase 3: Cross-system integration
      await this.linkWorkflowsToEntities();
      await this.linkViewsToEntities();
      await this.linkAgentsToWorkflows();

      // Phase 4: Emit ready event
      this.ready = true;
      this.emit('registry:ready', {
        entityCount: this.entityDefs.size,
        workflowCount: this.workflowDefs.size,
        viewCount: this.viewDefs.size,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Registry bootstrap failed:', error);
      throw error;
    }
  }

  private async validateEntitySchema(): Promise<void> {
    for (const [name, entityDef] of this.entityDefs) {
      // Check field names unique
      const fieldNames = Object.keys(entityDef.fields);
      const duplicates = fieldNames.filter((f, i) => fieldNames.indexOf(f) !== i);
      if (duplicates.length > 0) {
        throw new Error(`Entity ${name} has duplicate fields: ${duplicates.join(', ')}`);
      }

      // Validate field relations
      for (const [fieldName, field] of Object.entries(entityDef.fields)) {
        if (field.relation) {
          const relatedEntity = this.entityDefs.get(field.relation.entity);
          if (!relatedEntity) {
            throw new Error(
              `Entity ${name}.${fieldName} references unknown entity ${field.relation.entity}`
            );
          }
        }
      }

      // Validate permission rules
      for (const perm of entityDef.permissions || []) {
        if (!['create', 'read', 'update', 'delete'].includes(perm.action)) {
          throw new Error(
            `Entity ${name} has invalid permission action: ${perm.action}`
          );
        }
      }
    }
  }

  private async validateWorkflowSchema(): Promise<void> {
    for (const [name, workflowDef] of this.workflowDefs) {
      // Verify trigger entity exists
      const triggerEntity = this.entityDefs.get(workflowDef.trigger.entity);
      if (!triggerEntity) {
        throw new Error(
          `Workflow ${name} references unknown trigger entity ${workflowDef.trigger.entity}`
        );
      }

      // Validate action configurations
      for (const action of workflowDef.actions || []) {
        if (!action.type || !action.id) {
          throw new Error(
            `Workflow ${name} action missing type or id`
          );
        }
      }
    }
  }

  private async validateViewSchema(): Promise<void> {
    for (const [name, viewDef] of this.viewDefs) {
      // Verify source entity exists
      const sourceEntity = this.entityDefs.get(viewDef.sourceEntity);
      if (!sourceEntity) {
        throw new Error(
          `View ${name} references unknown source entity ${viewDef.sourceEntity}`
        );
      }

      // Check filters reference valid fields
      for (const filter of viewDef.filters || []) {
        if (!sourceEntity.fields[filter.field]) {
          throw new Error(
            `View ${name} filter references unknown field ${filter.field}`
          );
        }
      }
    }
  }

  private async linkWorkflowsToEntities(): Promise<void> {
    for (const [workflowName, workflowDef] of this.workflowDefs) {
      const entity = this.entityDefs.get(workflowDef.trigger.entity);
      if (entity) {
        if (!entity.triggersWorkflows) {
          entity.triggersWorkflows = [];
        }
        entity.triggersWorkflows.push(workflowName);
      }
    }
  }

  private async linkViewsToEntities(): Promise<void> {
    for (const [viewName, viewDef] of this.viewDefs) {
      const entity = this.entityDefs.get(viewDef.sourceEntity);
      if (entity) {
        if (!entity.relatedViews) {
          entity.relatedViews = [];
        }
        entity.relatedViews.push(viewName);
      }
    }
  }

  private async linkAgentsToWorkflows(): Promise<void> {
    // Load agent definitions from modules and link to workflows
    // (implementation deferred to agent subsystem doc)
  }

  isReady(): boolean {
    return this.ready;
  }
}
```

### Validation Errors

If bootstrap fails, the application should:
1. Log all validation errors
2. Prevent route handlers from executing
3. Return 503 Service Unavailable until bootstrap retries successfully
4. Optionally fail fast on startup (strict mode)

---

## Summary

The unified runtime architecture provides:

1. **Single Source of Truth**: Entity, workflow, and view definitions centralized in the registry
2. **Type Safety**: ExecutionContext and interfaces ensure compile-time safety
3. **Clear Pipeline**: 7-step execution from request to cache invalidation
4. **Permission Integration**: Check before Step 4 mutation, respecting roles and fields
5. **Event Driven**: Hooks, workflows, and agents communicate via events
6. **Schema Validation**: Bootstrap validates all definitions before serving requests
7. **Audit Trail**: ExecutionContext and change tracking enable compliance

This design replaces scattered CRUD endpoints, hook systems, and event emitters with a cohesive, testable, and extensible architecture suitable for building enterprise applications.

---

## Next Steps

See related documents:
- **02-entity-subsystem.md** — Entity definition DSL, field validation, hooks
- **03-workflow-subsystem.md** — Workflow DSL, trigger evaluation, action execution
- **04-view-subsystem.md** — View definitions, query building, cache strategy
- **05-permission-subsystem.md** — Permission engine, RBAC evaluation, field-level access
- **06-module-subsystem.md** — Module loader, lifecycle, dependency injection
