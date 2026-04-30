# Permission Enforcement Engine

## Overview

The Lume Permission Engine is a unified policy evaluation system that combines **Role-Based Access Control (RBAC)** and **Attribute-Based Access Control (ABAC)** to enforce authorization decisions across four enforcement layers: API, Query, Workflow, and Field-level.

**Key Design Goals:**
- Single policy engine powers all authorization decisions
- RBAC (roles) + ABAC (attributes) combined evaluation
- Efficient short-circuit evaluation for performance
- Enforcement at multiple layers to prevent data leaks
- Clear denial reasoning for debugging and auditing
- Support for ownership-based access (user-specific records)
- Time-based policies (business hours, scheduling)
- Resource and field-level granularity

**Architecture Principle**: Permissions are declarative policies evaluated at runtime, not hard-coded checks scattered through handlers.

---

## 1. RBAC vs ABAC: Combined Model

### Role-Based Access Control (RBAC)

RBAC defines baseline access rights based on a user's assigned roles. Roles form the first line of authorization—if a user lacks the required role, access is denied immediately.

**Role Hierarchy in Lume:**

```
┌─────────────────────────────────────────┐
│         super_admin                     │
│    (All systems, all actions)           │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│   admin      │ │ manager  │ │   user   │
│              │ │          │ │          │
│ - Module mgmt│ │ - Reports│ │ - CRUD   │
│ - User mgmt  │ │ - Team   │ │ - View   │
│ - Audit logs │ │ - Config │ │          │
└──────────────┘ └──────────┘ └──────────┘
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ guest (minimal)      │
        │ - Public reads only  │
        └──────────────────────┘
```

**RBAC Evaluation**:
```
If user.roles does NOT include required_role:
  → DENY (short-circuit, no ABAC evaluation)
```

**Example RBAC Policies:**
- Only `admin` and `manager` roles can delete users
- Only `admin` can manage modules
- Only `user` and above can create tickets
- Guests can only read published pages

### Attribute-Based Access Control (ABAC)

ABAC refines access decisions based on contextual attributes: user properties, resource properties, time, location, request context, etc. A user may have the required role, but ABAC conditions may still deny access.

**ABAC Condition Types:**

| Type | Operator | Example | Use Case |
|------|----------|---------|----------|
| **Ownership** | `==` | `data.owner_id == user.id` | User can edit own records |
| **Attribute** | `>`, `<`, `>=`, `<=` | `data.priority > 3` | Only high-priority tickets |
| **Time** | `between` | `now.hour >= 9 AND now.hour < 17` | Business hours only |
| **Department** | `in` | `user.department IN data.departments` | Manager views own dept |
| **Status** | `!=` | `data.status != 'locked'` | Can't modify locked items |
| **Group** | `hasMember` | `user.groups hasMember 'data.groupId'` | Group-based access |

**ABAC Evaluation**:
```
If policy.rule evaluates to FALSE:
  → DENY with explanation
If policy.rule evaluates to TRUE:
  → ALLOW (may still have field-level restrictions)
```

**Example ABAC Policies:**
- Users can only edit tickets assigned to them: `data.assignedTo == user.id`
- Support team can escalate only during business hours: `now.hour >= 9 AND now.hour < 17`
- Managers can only delete reports from their department: `user.departmentId == data.departmentId`
- Admins can only reset passwords if user is not super_admin: `data.role != 'super_admin'`

### Combined RBAC + ABAC Evaluation

The engine evaluates policies in this order:

```
1. Check RBAC (role requirement)
   ├─ If role mismatch → DENY
   └─ If role matches → Continue to ABAC

2. Check ABAC (attribute conditions)
   ├─ If condition fails → DENY
   └─ If condition passes → Continue to field checks

3. Check Field-Level Restrictions
   ├─ Determine which fields are readable/writable
   └─ Apply filters to query results

4. Return Decision + Explanation
   ├─ allowed: boolean
   ├─ explanation: string (for logs/UI)
   └─ fieldFilters: { fieldName: boolean }
```

**Example: Combined Policy**

```javascript
// Policy: Managers can delete closed tickets only
{
  resource: 'ticket',
  action: 'delete',
  allowedRoles: ['admin', 'manager'],      // RBAC
  rule: "data.status == 'closed'",         // ABAC
  explanation: "Only admins and managers can delete closed tickets"
}

// Evaluation with user = { roles: ['user'] }
→ RBAC check fails (user not in allowedRoles)
→ DENY: "User does not have required role"

// Evaluation with user = { roles: ['manager'] }, data = { status: 'open' }
→ RBAC check passes
→ ABAC check fails (status is 'open', not 'closed')
→ DENY: "Condition not met: data.status == 'closed'"

// Evaluation with user = { roles: ['manager'] }, data = { status: 'closed' }
→ RBAC check passes
→ ABAC check passes
→ ALLOW
```

---

## 2. Policy Definition & Interfaces

### TypeScript Interfaces

```typescript
/**
 * Authorization request sent to the engine
 */
interface PermissionRequest {
  /** Resource name (entity slug) */
  resource: string;

  /** Action name: 'create', 'read', 'update', 'delete', 'execute', etc. */
  action: string;

  /** User context with roles and attributes */
  user: ExecutionContext;

  /** Record data for ABAC evaluation (optional) */
  data?: Record<string, any>;

  /** Scope: 'api' (single record) or 'query' (multiple records) */
  scope?: 'api' | 'query';
}

/**
 * User execution context passed through pipeline
 */
interface ExecutionContext {
  userId: string;
  email?: string;
  roles: string[];           // e.g., ['user', 'manager']
  permissions: string[];     // e.g., ['ticket:create', 'ticket:delete']
  departmentId?: string;
  groupIds?: string[];
  attributes?: Record<string, any>;
}

/**
 * Policy definition (stored in registry or database)
 */
interface PermissionPolicy {
  id?: string;
  resource: string;          // e.g., 'ticket'
  action: string;            // e.g., 'delete'

  // RBAC: required roles (if empty, any role allowed)
  allowedRoles?: string[];   // e.g., ['admin', 'manager']

  // ABAC: attribute conditions
  rule?: string;             // e.g., "data.status == 'closed'"

  // Field-level permissions
  fieldLevel?: Record<string, string>;  // { fieldName: condition }

  // Query scope filtering
  queryScope?: {
    condition: string;       // Filter for multi-record queries
  };

  // Metadata
  name?: string;
  description?: string;
  explanation?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Condition within a policy
 */
interface PolicyCondition {
  type: 'role' | 'ownership' | 'time' | 'attribute' | 'expression';
  operator: string;          // '==', '!=', '>', '<', 'between', 'in', etc.
  value: any;
  negated?: boolean;
}

/**
 * Result of policy evaluation
 */
interface PermissionResult {
  allowed: boolean;
  reason?: string;           // Explanation if denied
  explanation?: string;      // Detailed explanation for logs
  filters?: FilterCondition[];    // Query filters for scope filtering
  fieldFilters?: Record<string, boolean>;  // Per-field access
  denialReasons?: string[];  // Multiple reasons if multi-policy eval
}

/**
 * Query filter condition
 */
interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: any;
}

/**
 * Evaluation context (passed internally)
 */
interface EvaluationContext {
  user: ExecutionContext;
  data?: Record<string, any>;
  now: Date;
  scope?: 'api' | 'query';
}
```

---

## 3. Policy Evaluation Engine

### Engine Architecture

```
┌──────────────────────────────────────┐
│  PolicyEngine                        │
│  - registry: MetadataRegistry        │
│  - evaluator: ExpressionEvaluator    │
│  - cache: Map<string, Decision>      │
└──────────────────────────────────────┘
        │
        ├─ evaluate(request)
        │   └─ Evaluate single permission request
        │
        ├─ evaluatePolicy(policy, user, data)
        │   └─ Evaluate RBAC + ABAC for one policy
        │
        ├─ evaluateExpression(rule, context)
        │   └─ Evaluate ABAC condition expression
        │
        └─ hasPermission(resource, action, user)
            └─ Quick boolean check
```

### Evaluation Algorithm

```
Function: evaluate(request: PermissionRequest): PermissionResult

Input:
  - request.resource: string
  - request.action: string
  - request.user: ExecutionContext
  - request.data: Record<string, any> (optional)

Process:

1. FETCH POLICIES
   policies = registry.getPermissions(resource, action)
   
   if (policies.length === 0):
       return { allowed: true }  // No policy = allow by default
   
2. EVALUATE POLICIES (AND logic: all must pass)
   denialReasons = []
   
   for each policy in policies:
       result = evaluatePolicy(policy, user, data)
       
       if (!result.allowed):
           denialReasons.push(result.reason)
           return {
               allowed: false,
               reason: result.reason,
               denialReasons: denialReasons
           }
   
3. AGGREGATE FIELD FILTERS (OR logic: any pass = allowed)
   aggregatedFieldFilters = {}
   
   for each policy in policies:
       if (policy.fieldLevel):
           for each field in policy.fieldLevel:
               aggregatedFieldFilters[field] = true
   
4. RETURN SUCCESS
   return {
       allowed: true,
       filters: [],
       fieldFilters: aggregatedFieldFilters
   }

End Function
```

### Single Policy Evaluation

```
Function: evaluatePolicy(policy, user, data): PolicyResult

1. RBAC STAGE
   if (policy.allowedRoles is not empty):
       userHasRole = user.roles.some(role => policy.allowedRoles.includes(role))
       
       if (!userHasRole):
           return {
               allowed: false,
               reason: "User does not have required role. 
                        Required: {policy.allowedRoles}, 
                        Got: {user.roles}"
           }

2. ABAC STAGE
   if (policy.rule is not empty):
       context = {
           user: user,
           data: data || {},
           now: new Date()
       }
       
       try:
           ruleResult = evaluator.evaluate(policy.rule, context)
           
           if (!ruleResult):
               return {
                   allowed: false,
                   reason: "Condition not met: {policy.rule}"
               }
       catch (error):
           return {
               allowed: false,
               reason: "Condition evaluation error: {error.message}"
           }

3. FIELD-LEVEL STAGE
   fieldFilters = {}
   
   if (policy.fieldLevel is object):
       for each [field, rule] in policy.fieldLevel:
           context = { user, data, now }
           try:
               fieldFilters[field] = evaluator.evaluate(rule, context)
           catch (error):
               fieldFilters[field] = false

4. QUERY SCOPE FILTERING
   filters = []
   
   if (policy.queryScope):
       filters.push({
           condition: policy.queryScope.condition,
           operator: 'AND'
       })

5. RETURN SUCCESS
   return {
       allowed: true,
       filters: filters,
       fieldFilters: fieldFilters
   }

End Function
```

### Expression Evaluation Context

The evaluator resolves variables within ABAC expressions:

```
Expression: "data.assignedTo == user.id AND data.priority >= 3"

Context = {
    user: {
        userId: "user123",
        roles: ["agent"],
        departmentId: "dept456"
    },
    data: {
        assignedTo: "user123",
        priority: 5,
        status: "open"
    },
    now: Date(2026-04-30T12:34:56Z)
}

Variable Resolution:
  user.id              → context.user.userId
  user.roles[0]        → context.user.roles[0]
  user.departmentId    → context.user.departmentId
  data.assignedTo      → context.data.assignedTo
  data.priority        → context.data.priority
  now.hour             → context.now.getHours()
  now.day              → context.now.getDay()
```

### Caching Strategy

```
Cache Key Format: "{userId}:{resource}:{action}:{dataHash}"

Example:
  Key: "user123:ticket:delete:abc123def456"
  Value: { allowed: true, fieldFilters: {...} }
  TTL: 5 minutes (invalidated on policy changes)

Invalidation Triggers:
  - Policy registry updated
  - User roles modified
  - User permissions changed
  - Explicit cache.clear()
```

---

## 4. Enforcement Points (4 Layers)

Permission enforcement happens at four distinct layers to prevent authorization bypasses:

### Layer 1: API-Level Enforcement

**Purpose**: Block unauthorized API requests before handler execution

**Implementation**: Applied in route handlers via `@Authorize` decorator or middleware

```typescript
// NestJS Example (target architecture)
@Controller('tickets')
export class TicketController {
  constructor(private permissionEngine: PolicyEngine) {}

  @Post()
  @Authorize('ticket', 'create')
  async create(@Body() dto: CreateTicketDto, @User() user: ExecutionContext) {
    const result = await this.permissionEngine.evaluate({
      resource: 'ticket',
      action: 'create',
      user: user,
      data: dto,
      scope: 'api'
    });

    if (!result.allowed) {
      throw new ForbiddenException(result.reason);
    }

    return this.ticketService.create(dto);
  }

  @Delete(':id')
  @Authorize('ticket', 'delete')
  async delete(@Param('id') id: string, @User() user: ExecutionContext) {
    const ticket = await this.ticketService.findById(id);
    
    const result = await this.permissionEngine.evaluate({
      resource: 'ticket',
      action: 'delete',
      user: user,
      data: ticket,
      scope: 'api'
    });

    if (!result.allowed) {
      throw new ForbiddenException(result.reason);
    }

    return this.ticketService.delete(id);
  }
}

// Express.js Example (current architecture)
app.delete('/api/tickets/:id', async (req, res) => {
  const user = req.user;  // ExecutionContext
  const ticket = await ticketService.findById(req.params.id);

  const result = await permissionEngine.evaluate({
    resource: 'ticket',
    action: 'delete',
    user: user,
    data: ticket,
    scope: 'api'
  });

  if (!result.allowed) {
    return res.status(403).json({ error: result.reason });
  }

  await ticketService.delete(req.params.id);
  res.json({ success: true });
});
```

**Failure Behavior:**
- Returns HTTP 403 Forbidden
- Logs denial with reason
- Does NOT execute handler
- Audit trail recorded

---

### Layer 2: Query-Level Enforcement

**Purpose**: Filter query results to only include records user is authorized to read

**Implementation**: Applied to bulk read operations (list, find, search)

```typescript
// QueryFilter applies ABAC conditions to database queries
// Converts permission rules into SQL WHERE clauses

// Example Policy
{
  resource: 'ticket',
  action: 'read',
  allowedRoles: ['agent', 'manager', 'admin'],
  queryScope: {
    condition: "data.assignedTo == user.id OR user.roles[0] == 'manager'"
  }
}

// Query Execution
const tickets = await ticketService.find({}, user);

// Internal (in service):
const filters = queryFilter.buildDrizzleFilters(
  policy.queryScope.condition,
  user
);
// filters = [
//   { field: 'assignedTo', operator: 'eq', value: 'user123' },
//   { operator: 'OR' },
//   { field: 'manager_id', operator: 'eq', value: 'user123' }
// ]

const query = db.select().from(tickets);
for (const filter of filters) {
  query = query.where(filter);
}
const results = await query;
```

**Example Scenarios:**

```javascript
// Manager sees only own department tickets
Policy: "user.departmentId == data.departmentId"
User:   { departmentId: 'dept_sales' }
Query:  ticket.find()
Result: Only tickets where ticket.departmentId == 'dept_sales'

// User sees only assigned tickets
Policy: "data.assignedTo == user.id"
User:   { userId: 'user123' }
Query:  ticket.find()
Result: Only tickets where ticket.assignedTo == 'user123'

// Admin sees everything (no filter)
Policy: (empty, no queryScope)
User:   { roles: ['admin'] }
Query:  ticket.find()
Result: All tickets
```

---

### Layer 3: Workflow-Level Enforcement

**Purpose**: Check permissions before executing workflow actions

**Implementation**: Applied in WorkflowExecutor before action execution

```typescript
// Workflow Definition
workflow('escalate-ticket', {
  trigger: 'ticket:updated',
  
  steps: [
    {
      id: 'check-permissions',
      type: 'permission-check',
      resource: 'ticket',
      action: 'escalate',  // Custom action
      data: '$event.entity'
    },
    {
      id: 'escalate-ticket',
      type: 'action',
      action: {
        type: 'entity-mutate',
        entity: 'ticket',
        id: '$event.entity.id',
        mutation: {
          escalated: true,
          escalatedAt: '$now',
          escalatedBy: '$user.id'
        }
      }
    }
  ]
});

// Executor Implementation
class WorkflowExecutor {
  async executeStep(step, workflow, event, executionContext) {
    if (step.type === 'permission-check') {
      const result = await this.policyEngine.evaluate({
        resource: step.resource,
        action: step.action,
        user: executionContext,
        data: step.data
      });

      if (!result.allowed) {
        throw new UnauthorizedWorkflowError(
          `Workflow step denied: ${step.id} - ${result.reason}`
        );
      }
    }
  }
}
```

---

### Layer 4: Field-Level Enforcement

**Purpose**: Control which fields are readable/writable based on user permissions

**Implementation**: Applied in field serialization and mutation validation

```typescript
// Policy with Field-Level Permissions
{
  resource: 'ticket',
  action: 'update',
  allowedRoles: ['agent', 'manager', 'admin'],
  fieldLevel: {
    assignedTo:    "user.roles.includes('manager') OR user.roles.includes('admin')",
    status:        "user.roles.includes('manager') OR user.roles.includes('admin')",
    priority:      "true",  // Anyone can update
    internalNotes: "user.roles.includes('agent') OR user.roles.includes('manager')",
    resolution:    "true"
  }
}

// Serialization (Return to Client)
class FieldFilter {
  static filterFieldsForUser(record, user, fieldFilters) {
    const result = {};
    
    for (const [field, value] of Object.entries(record)) {
      // If field has no filter rule, include by default
      if (!(field in fieldFilters)) {
        result[field] = value;
        continue;
      }

      // Include field only if filter evaluates to true
      if (fieldFilters[field]) {
        result[field] = value;
      }
    }

    return result;
  }
}

// Mutation Validation (Accept from Client)
class FieldValidator {
  static validateUpdatePayload(updateData, user, fieldFilters) {
    const errors = [];
    
    for (const field of Object.keys(updateData)) {
      // Skip if field not in filter list
      if (!(field in fieldFilters)) {
        continue;
      }

      // Reject if field write not allowed
      if (!fieldFilters[field]) {
        errors.push(`Field '${field}' cannot be modified by ${user.roles[0]}`);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }
}
```

**Field-Level Examples:**

```javascript
// Scenario 1: Support agent cannot change status
fieldFilters = { status: false, priority: false, notes: true }
updateData = { status: 'closed', notes: 'Resolved' }
Validation Error: Field 'status' cannot be modified

// Scenario 2: Manager sees internalNotes, agent does not
Record: {
  id: 'ticket123',
  title: 'Bug report',
  status: 'open',
  internalNotes: 'Customer is VIP, escalate priority'
}

For agent (fieldFilters.internalNotes = false):
  Result: { id, title, status }  // internalNotes excluded

For manager (fieldFilters.internalNotes = true):
  Result: { id, title, status, internalNotes }  // included
```

---

## 5. Policy Rule Examples

### Example 1: Ownership-Based Access

```javascript
Policy: Users can only edit their own profile

{
  id: 'user-edit-own-profile',
  resource: 'user',
  action: 'update',
  allowedRoles: ['user', 'manager', 'admin'],  // Basic role check
  rule: "data.id == user.id",  // ABAC: user can only edit self
  description: 'Users can update their own profile',
  explanation: 'You can only edit your own profile'
}

// Evaluation
User:    { userId: 'user123', roles: ['user'] }
Data:    { id: 'user456', name: 'John Doe' }

RBAC: ✓ user has 'user' role
ABAC: ✗ data.id ('user456') != user.id ('user123')
Result: DENY - "Condition not met: data.id == user.id"
```

### Example 2: Role-Based Access

```javascript
Policy: Only admins and managers can delete records

{
  id: 'delete-records',
  resource: 'ticket',
  action: 'delete',
  allowedRoles: ['admin', 'manager'],  // RBAC only
  description: 'Only admins and managers can delete tickets',
  explanation: 'Only managers and admins can delete tickets'
}

// Evaluation with agent
User:  { userId: 'agent1', roles: ['agent'] }
RBAC:  ✗ agent not in ['admin', 'manager']
Result: DENY - "User does not have required role"

// Evaluation with manager
User:  { userId: 'manager1', roles: ['manager'] }
RBAC:  ✓ manager in ['admin', 'manager']
Result: ALLOW
```

### Example 3: Status-Based Access

```javascript
Policy: Managers can only close completed tickets

{
  id: 'close-completed-tickets',
  resource: 'ticket',
  action: 'close',
  allowedRoles: ['manager', 'admin'],
  rule: "data.status == 'completed' OR user.roles.includes('admin')",
  description: 'Managers can close completed tickets; admins can close any',
  explanation: 'Ticket must be marked completed before closing'
}

// Evaluation
User: { userId: 'manager1', roles: ['manager'] }
Data: { status: 'open', id: 'ticket1' }

RBAC: ✓ manager in allowedRoles
ABAC: ✗ status is 'open', not 'completed', and user is not admin
Result: DENY - "Condition not met: data.status == 'completed' OR user.roles.includes('admin')"
```

### Example 4: Time-Based Access

```javascript
Policy: Support team can escalate tickets during business hours only

{
  id: 'escalate-business-hours',
  resource: 'ticket',
  action: 'escalate',
  allowedRoles: ['agent', 'manager'],
  rule: "now.hour >= 9 AND now.hour < 17",  // 9 AM - 5 PM
  description: 'Escalation available 9 AM - 5 PM only',
  explanation: 'Ticket escalation is only available during business hours'
}

// Evaluation at 10:30 AM
User:  { userId: 'agent1', roles: ['agent'] }
Now:   2026-04-30T10:30:00Z
RBAC:  ✓ agent in ['agent', 'manager']
ABAC:  ✓ hour (10) >= 9 AND hour (10) < 17
Result: ALLOW

// Evaluation at 11:30 PM
Now:   2026-04-30T23:30:00Z
RBAC:  ✓ agent in ['agent', 'manager']
ABAC:  ✗ hour (23) >= 9 fails
Result: DENY - "Condition not met: now.hour >= 9 AND now.hour < 17"
```

### Example 5: Department-Based Access

```javascript
Policy: Managers can only view reports from their own department

{
  id: 'manager-view-own-dept',
  resource: 'report',
  action: 'read',
  allowedRoles: ['manager', 'admin'],
  queryScope: {
    condition: "user.departmentId == data.departmentId OR user.roles.includes('admin')"
  },
  fieldLevel: {
    budget: "user.roles.includes('admin')",
    forecast: "user.roles.includes('admin')"
  },
  description: 'Managers see own department, admins see all',
  explanation: 'Managers can only view reports from their department'
}

// List Query
User: { userId: 'manager1', departmentId: 'sales', roles: ['manager'] }
Action: GET /reports

Query Filter Applied:
  WHERE departmentId = 'sales' OR user.roles = 'admin'
Results: Only reports from sales department

Field Filtering:
  budget, forecast fields excluded for manager
  (visible only to admin)
```

### Example 6: Conditional Group Membership

```javascript
Policy: Users can access group resources if they're members

{
  id: 'group-member-access',
  resource: 'group_resource',
  action: 'read',
  rule: "user.groupIds.includes(data.groupId)",
  description: 'Only group members can access group resources',
  explanation: 'You must be a member of this group to access it'
}

// Evaluation
User: { userId: 'user1', groupIds: ['grp_eng', 'grp_design'], roles: ['user'] }
Data: { id: 'doc1', groupId: 'grp_eng', name: 'Engineering Docs' }

Rule Evaluation: user.groupIds.includes('grp_eng')
                 ['grp_eng', 'grp_design'].includes('grp_eng')
                 → true
Result: ALLOW

// Same user, different group
Data: { id: 'doc2', groupId: 'grp_sales', name: 'Sales Docs' }

Rule Evaluation: user.groupIds.includes('grp_sales')
                 ['grp_eng', 'grp_design'].includes('grp_sales')
                 → false
Result: DENY - "Condition not met: user.groupIds.includes(data.groupId)"
```

### Example 7: Complex Multi-Condition

```javascript
Policy: Support agents can update tickets assigned to them,
        but only if ticket status is not 'locked' or 'archived'

{
  id: 'agent-update-assigned',
  resource: 'ticket',
  action: 'update',
  allowedRoles: ['agent', 'manager', 'admin'],
  rule: "(data.assignedTo == user.id OR user.roles.includes('manager')) AND data.status != 'locked' AND data.status != 'archived'",
  fieldLevel: {
    title:          "true",  // Agent can update
    status:         "user.roles.includes('manager')",  // Manager only
    internalNotes:  "true",  // Agent can update
    resolution:     "data.status == 'resolved'"  // Only if resolved
  },
  description: 'Agents update assigned tickets (not locked/archived)',
  explanation: 'You can only update tickets assigned to you that are not locked'
}

// Evaluation 1: Agent on assigned, open ticket
User: { userId: 'agent1', roles: ['agent'] }
Data: { assignedTo: 'agent1', status: 'open' }

Rule: (true OR false) AND true AND true → true
Result: ALLOW
Fields: title ✓, status ✗, internalNotes ✓, resolution ✗

// Evaluation 2: Agent on assigned, locked ticket
User: { userId: 'agent1', roles: ['agent'] }
Data: { assignedTo: 'agent1', status: 'locked' }

Rule: (true OR false) AND false AND true → false
Result: DENY - "Ticket is locked and cannot be modified"

// Evaluation 3: Manager on any ticket
User: { userId: 'manager1', roles: ['manager'] }
Data: { assignedTo: 'agent1', status: 'open' }

Rule: (false OR true) AND true AND true → true
Result: ALLOW
Fields: title ✓, status ✓, internalNotes ✓, resolution ✗
```

---

## 6. Integration with Execution Context

The permission engine receives the **ExecutionContext** from the runtime pipeline and uses it throughout evaluation:

### ExecutionContext Structure

```typescript
interface ExecutionContext {
  // Identification
  userId: string;
  email?: string;
  sessionId?: string;

  // Authorization
  roles: string[];                    // ['user', 'manager']
  permissions: string[];              // ['ticket:create', 'ticket:delete']

  // Attributes for ABAC
  departmentId?: string;
  groupIds?: string[];
  teamId?: string;
  organizationId?: string;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;

  // Custom attributes
  attributes?: Record<string, any>;
}
```

### Context Flow Through Layers

```
HTTP Request
    │
    ├─ Authenticate & load user record
    ├─ Extract roles, permissions, attributes
    └─ Create ExecutionContext
    │
    ▼
┌─────────────────────────────────┐
│ API Layer (PermissionInterceptor)
│ - Check: can user call this action?
│ - Use: ExecutionContext + resource + action
└─────────────────────────────────┘
    │
    ├─ ALLOW → Continue
    └─ DENY → Respond 403, abort
    │
    ▼
┌─────────────────────────────────┐
│ Query Layer (QueryFilter)
│ - Filter: which records can user see?
│ - Use: ExecutionContext + query
└─────────────────────────────────┘
    │
    ├─ Apply WHERE filters
    └─ Return filtered results
    │
    ▼
┌─────────────────────────────────┐
│ Field Layer (FieldFilter)
│ - Mask: which fields can user see?
│ - Use: ExecutionContext + record
└─────────────────────────────────┘
    │
    └─ Return record with filtered fields
    │
    ▼
HTTP Response (with filtered data)
```

---

## 7. Error Handling & Denial Reasons

The engine provides clear, actionable denial reasons for debugging and user-facing error messages:

### Denial Reason Categories

```
1. RBAC DENIAL
   Reason: "User does not have required role. Required: [admin, manager], Got: [user]"
   User-Facing: "You don't have permission to perform this action"
   Log Level: WARN

2. ABAC DENIAL
   Reason: "Condition not met: data.status == 'closed'"
   User-Facing: "This ticket cannot be deleted while open"
   Log Level: WARN

3. OWNERSHIP DENIAL
   Reason: "Record is not owned by current user. Owner: user456, Current: user123"
   User-Facing: "You can only access your own records"
   Log Level: WARN

4. TIME-BASED DENIAL
   Reason: "Condition not met: now.hour >= 9 AND now.hour < 17"
   User-Facing: "This action is only available during business hours"
   Log Level: DEBUG

5. EVALUATION ERROR
   Reason: "Condition evaluation error: Undefined variable 'user.dept'"
   User-Facing: "An error occurred while checking permissions"
   Log Level: ERROR
```

### Logging & Auditing

```javascript
// Permission check logged
LOG: [PermissionInterceptor] Access denied for user123:
     resource=ticket, action=delete
     reason="Condition not met: data.status == 'closed'"
     timestamp=2026-04-30T12:34:56Z

// Includes in audit trail
{
  userId: 'user123',
  action: 'ticket:delete',
  resource: 'ticket',
  resourceId: 'ticket456',
  allowed: false,
  reason: "Condition not met: data.status == 'closed'",
  timestamp: '2026-04-30T12:34:56Z'
}
```

---

## 8. Performance Optimizations

### Caching Strategy

```
Level 1: In-Memory Cache (PolicyEngine)
  Key: md5(userId + resource + action + dataHash)
  TTL: 5 minutes
  Invalidation: On policy registry changes

Level 2: Query Filter Caching
  Key: md5(userId + policy.queryScope)
  TTL: 10 minutes
  Example: "agent1:ticket:read" → WHERE assignedTo = 'agent1'

Level 3: Field Filter Caching
  Key: md5(userId + resource + action)
  TTL: 5 minutes
  Example: "agent1:ticket:update" → { status: false, notes: true }
```

### Short-Circuit Evaluation

```
// Stop evaluating as soon as result is determined
if (policy.allowedRoles && !userHasRole) {
  return { allowed: false };  // Don't evaluate ABAC
}

// Deny-wins: any denial stops evaluation
for (const policy of policies) {
  const result = evaluatePolicy(policy);
  if (!result.allowed) {
    return result;  // Stop, return denial
  }
}
```

### Expression Compilation

```javascript
// Compile expressions to functions on first use
const compiled = ExpressionCompiler.compile(rule);
// compiled = (context) => context.data.status == 'closed' && ...

// Cache compiled functions
const cache = new Map<string, Function>();
cache.set(rule, compiled);

// Reuse on subsequent evaluations
const fn = cache.get(rule) || ExpressionCompiler.compile(rule);
const result = fn(context);  // Much faster than parsing/interpreting
```

---

## 9. Testing Strategies

### Unit Tests: Policy Evaluation

```typescript
describe('PolicyEngine - Permission Evaluation', () => {
  it('should deny when user lacks required role', async () => {
    const policy = {
      resource: 'ticket',
      action: 'delete',
      allowedRoles: ['admin', 'manager']
    };

    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'delete',
      user: { userId: 'user1', roles: ['agent'] },
      data: { id: 'ticket1' }
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/required role/i);
  });

  it('should allow when ABAC condition passes', async () => {
    const policy = {
      resource: 'ticket',
      action: 'update',
      rule: "data.assignedTo == user.id"
    };

    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'update',
      user: { userId: 'user1', roles: ['agent'] },
      data: { assignedTo: 'user1' }
    });

    expect(result.allowed).toBe(true);
  });

  it('should filter fields based on field-level policy', async () => {
    const policy = {
      resource: 'ticket',
      action: 'read',
      fieldLevel: {
        internalNotes: "user.roles.includes('manager')"
      }
    };

    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'read',
      user: { userId: 'agent1', roles: ['agent'] },
      data: {}
    });

    expect(result.fieldFilters.internalNotes).toBe(false);
  });
});
```

### Integration Tests: Full Flow

```typescript
describe('Permission Engine - Full Authorization Flow', () => {
  it('should deny API request, not execute handler', async () => {
    // Setup
    const permissionPolicy = {
      resource: 'user',
      action: 'delete',
      allowedRoles: ['admin']
    };
    await registry.registerPermission(permissionPolicy);

    // Request as non-admin
    const user = { userId: 'user1', roles: ['user'] };

    // API call
    const response = await request(app)
      .delete('/api/users/user2')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    // Verify handler NOT called
    expect(userService.delete).not.toHaveBeenCalled();
  });

  it('should filter query results by permission', async () => {
    const policy = {
      resource: 'ticket',
      action: 'read',
      queryScope: {
        condition: "data.assignedTo == user.id"
      }
    };
    await registry.registerPermission(policy);

    // Query as agent
    const results = await ticketService.find({}, {
      userId: 'agent1',
      roles: ['agent']
    });

    // Verify only assigned tickets returned
    expect(results).toEqual([
      { id: 'ticket1', assignedTo: 'agent1' },
      { id: 'ticket3', assignedTo: 'agent1' }
    ]);
  });
});
```

---

## 10. Configuration & Deployment

### Registering Policies

```javascript
// Policies registered on module init
const manifest = {
  id: 'support_module',
  permissions: [
    {
      id: 'ticket_create',
      resource: 'ticket',
      action: 'create',
      allowedRoles: ['agent', 'manager', 'admin'],
      rule: "true",  // Anyone with role can create
      description: 'Create support tickets'
    },
    {
      id: 'ticket_delete',
      resource: 'ticket',
      action: 'delete',
      allowedRoles: ['manager', 'admin'],
      rule: "data.status == 'closed'",
      description: 'Delete closed tickets only'
    }
  ]
};

// During module boot
await permissionEngine.registerPolicies(manifest.permissions);
```

### Disabling Permissions (Admin Override)

```javascript
// Skip permission checks for specific operations
const result = await entityService.update(
  entityId,
  updateData,
  {
    skipPermissions: true,  // Bypass permission engine
    userId: 'system'        // Log as system, not user
  }
);
```

---

## Summary

The Permission Engine provides a unified, declarative policy system that:

1. **Combines RBAC + ABAC**: Roles set baseline access, attributes refine decisions
2. **Enforces at 4 layers**: API, Query, Workflow, Field
3. **Scales efficiently**: Caching, short-circuit evaluation, compiled expressions
4. **Enables auditability**: Clear denial reasons, structured logging
5. **Integrates seamlessly**: Works with ExecutionContext throughout pipeline

Policies are registered once (in manifests), evaluated consistently, and provide the foundation for a secure, auditable, and scalable authorization system.
