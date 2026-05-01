# GraphQL Layer Architecture for Lume Framework

**Version:** 1.0  
**Status:** Production Design  
**Last Updated:** May 2026

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Design Principles](#design-principles)
4. [Modular Schema Design](#modular-schema-design)
5. [Hybrid ORM Integration](#hybrid-orm-integration)
6. [Multi-Tenancy & Policy-Aware Access](#multi-tenancy--policy-aware-access)
7. [Grid Module Integration](#grid-module-integration)
8. [AI-Native Querying & Semantic Support](#ai-native-querying--semantic-support)
9. [Performance & Optimization](#performance--optimization)
10. [Observability & Monitoring](#observability--monitoring)
11. [Security Considerations](#security-considerations)
12. [Decision Matrix](#decision-matrix)

---

## Executive Summary

The Lume Framework GraphQL layer provides a **scalable, modular GraphQL API** that:

- **Integrates seamlessly** with Lume's modular architecture (22+ modules)
- **Supports multi-tenancy** with policy-aware field-level access control
- **Leverages hybrid ORM** (Prisma for relational data, Drizzle for performance queries)
- **Enables AI-native querying** through semantic query resolution
- **Follows NestJS patterns** for clean, testable, maintainable code
- **Provides full observability** via OpenTelemetry integration

### Four Grid Modules

The GraphQL layer is designed specifically to power four advanced grid systems:

1. **DataGrid** — Dynamic data tables with filtering, sorting, pagination, and inline editing
2. **AgentGrid** — AI agent orchestration dashboard with execution tracking and logs
3. **PolicyGrid** — Role-based access control with multi-level permission hierarchies
4. **FlowGrid** — Workflow engine visualizations with step execution and branching logic

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                    │
│          (Vue 3 Admin Panel + Nuxt 3 Public Site)          │
└─────────────────┬───────────────────────────────────────────┘
                  │ GraphQL Queries/Mutations/Subscriptions
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              GraphQL API Layer (Apollo Server)              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Query Resolvers   Mutation Resolvers  Subscriptions  │  │
│  │  (with DataLoader) (with Validation) (Real-time)     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ Prisma Client    │  │ Drizzle ORM      │
│ (Core Models)    │  │ (Module Tables)  │
│                  │  │                  │
│ • Users          │  │ • Activities     │
│ • Roles          │  │ • Documents      │
│ • Permissions    │  │ • Teams          │
│ • Settings       │  │ • Messages       │
│ • Audit Logs     │  │ • Media          │
└──────────────────┘  │ • Editor Content │
        │             │ • Website Pages  │
        │             │ • Workflows      │
        │             │ • Agents         │
        │             └──────────────────┘
        ▼
    MySQL Database
```

### Layer Structure

```typescript
graphql/
├── schema/
│   ├── base.schema.graphql         // Shared types & directives
│   ├── grid/
│   │   ├── data-grid.schema.graphql
│   │   ├── agent-grid.schema.graphql
│   │   ├── policy-grid.schema.graphql
│   │   └── flow-grid.schema.graphql
│   └── scalars/                     // Custom scalar types
│       ├── datetime.scalar.ts
│       ├── json.scalar.ts
│       └── date.scalar.ts
├── resolvers/
│   ├── base/
│   │   ├── user.resolver.ts
│   │   ├── role.resolver.ts
│   │   └── permission.resolver.ts
│   └── grids/
│       ├── data-grid.resolver.ts
│       ├── agent-grid.resolver.ts
│       ├── policy-grid.resolver.ts
│       └── flow-grid.resolver.ts
├── services/
│   ├── graphql.service.ts           // Main GraphQL service
│   ├── data-grid.service.ts
│   ├── agent-grid.service.ts
│   ├── policy-grid.service.ts
│   └── flow-grid.service.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── policy.middleware.ts         // Policy-aware access
│   └── audit.middleware.ts
├── loaders/
│   ├── dataloader.ts                // N+1 prevention
│   └── user.loader.ts
├── directives/
│   ├── auth.directive.ts
│   ├── policy.directive.ts
│   └── cache.directive.ts
└── subscriptions/
    ├── grid-updates.subscription.ts
    └── workflow-events.subscription.ts
```

---

## Design Principles

### 1. **Modularity**
Each grid module is independently defined, tested, and deployable. Shared types live in `base.schema.graphql` to prevent duplication.

### 2. **Clean Architecture**
- **Resolvers:** Only orchestrate data flow
- **Services:** Contain business logic and ORM delegation
- **Middleware:** Handle cross-cutting concerns (auth, audit, policy)
- **Directives:** Handle declarative access control

### 3. **Hybrid ORM Delegation**
- **Prisma:** Relational queries (users, roles, core entities)
- **Drizzle:** Performance-critical operations (aggregations, analytics, batch operations)
- **Services:** Decide which ORM to use for each operation

### 4. **Security First**
- Field-level access control via policy directives
- Role-based access in resolvers
- Audit logging on all mutations
- Input validation on all mutations

### 5. **Performance**
- DataLoader for batch loading (prevent N+1)
- Connection pooling at ORM level
- Query complexity analysis
- Schema-level caching directives

### 6. **Type Safety**
- TypeScript for 100% type coverage
- Codegen from schema → interfaces
- Runtime validation via class-validator

### 7. **Observability**
- OpenTelemetry tracing on all queries/mutations
- Structured logging for errors
- Metrics collection for performance monitoring
- Real-time subscription event tracking

---

## Modular Schema Design

### Base Schema (Shared)

```graphql
# base.schema.graphql
scalar DateTime
scalar JSON
scalar Date

# Access control directive
directive @auth(
  roles: [String!]
  permissions: [String!]
) on FIELD_DEFINITION

directive @policy(
  resource: String!
  action: String!
) on FIELD_DEFINITION

directive @cache(
  ttl: Int = 300
  key: String
) on FIELD_DEFINITION

# Pagination
input PaginationInput {
  page: Int! = 1
  pageSize: Int! = 20
  sort: [SortInput!]
  filter: String
}

input SortInput {
  field: String!
  direction: SortDirection! = ASC
}

enum SortDirection {
  ASC
  DESC
}

# Filtering
input FilterInput {
  field: String!
  operator: FilterOperator!
  value: String
  values: [String!]
}

enum FilterOperator {
  EQ
  NE
  GT
  GTE
  LT
  LTE
  IN
  NIN
  CONTAINS
  STARTS_WITH
  ENDS_WITH
}

# Pagination response
type PageInfo {
  page: Int!
  pageSize: Int!
  total: Int!
  totalPages: Int!
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
}

# Error handling
type ErrorDetail {
  field: String!
  message: String!
  code: String!
}

type MutationResponse {
  success: Boolean!
  message: String!
  errors: [ErrorDetail!]
}

# Audit
type AuditLog {
  id: ID!
  userId: ID!
  action: String!
  resource: String!
  resourceId: String!
  changes: JSON
  ipAddress: String
  userAgent: String
  createdAt: DateTime!
}

# Tenant context
interface TenantScoped {
  tenantId: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# User (core)
type User implements TenantScoped {
  id: ID!
  tenantId: ID!
  email: String!
  firstName: String
  lastName: String
  avatar: String
  status: UserStatus!
  roles: [Role!]!
  permissions: [Permission!]! @auth(roles: ["admin"])
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

# Role (core)
type Role {
  id: ID!
  name: String!
  description: String
  permissions: [Permission!]!
  userCount: Int! @auth(roles: ["admin"])
  createdAt: DateTime!
}

# Permission (core)
type Permission {
  id: ID!
  name: String!
  description: String
  resource: String!
  action: String!
  createdAt: DateTime!
}

type Query {
  # Base queries
  me: User @auth(roles: ["user"])
  user(id: ID!): User @auth(roles: ["admin"])
  users(input: PaginationInput): UserConnection! @auth(roles: ["admin"])
  
  roles: [Role!]! @auth(roles: ["admin"])
  permissions: [Permission!]! @auth(roles: ["admin"])
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type Mutation {
  # Base mutations
  createUser(input: CreateUserInput!): User! @auth(roles: ["admin"]) @policy(resource: "users", action: "create")
  updateUser(id: ID!, input: UpdateUserInput!): User! @auth(roles: ["admin"]) @policy(resource: "users", action: "update")
  deleteUser(id: ID!): Boolean! @auth(roles: ["admin"]) @policy(resource: "users", action: "delete")
}

input CreateUserInput {
  email: String!
  firstName: String
  lastName: String
  roleIds: [ID!]!
}

input UpdateUserInput {
  email: String
  firstName: String
  lastName: String
  status: UserStatus
  roleIds: [ID!]
}
```

### DataGrid Schema

```graphql
# grid/data-grid.schema.graphql
interface GridEntity implements TenantScoped {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User
}

type DataGridColumn {
  id: ID!
  name: String!
  type: ColumnType!
  displayName: String!
  width: Int
  sortable: Boolean!
  filterable: Boolean!
  editable: Boolean!
  hidden: Boolean!
  formatters: [String!]
  validators: [String!]
  sequence: Int!
}

enum ColumnType {
  TEXT
  NUMBER
  DATE
  DATETIME
  BOOLEAN
  SELECT
  MULTISELECT
  RELATION
  RICH_TEXT
  JSON
}

type DataGrid implements GridEntity {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  columns: [DataGridColumn!]!
  rows: [GridRow!]! @policy(resource: "datagrid", action: "read")
  totalRows: Int!
  pageSize: Int!
  filters: [FilterRule!]!
  sort: [SortRule!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User
}

type GridRow {
  id: ID!
  gridId: ID!
  data: JSON!
  sequence: Int!
  status: RowStatus!
  errors: [String!]
}

enum RowStatus {
  VALID
  INVALID
  PENDING_REVIEW
}

type FilterRule {
  id: ID!
  field: String!
  operator: FilterOperator!
  value: String!
}

type SortRule {
  id: ID!
  field: String!
  direction: SortDirection!
}

type DataGridConnection {
  edges: [DataGridEdge!]!
  pageInfo: PageInfo!
}

type DataGridEdge {
  node: DataGrid!
  cursor: String!
}

input DataGridInput {
  title: String!
  description: String
  columns: [DataGridColumnInput!]!
}

input DataGridColumnInput {
  name: String!
  type: ColumnType!
  displayName: String!
  width: Int
  sortable: Boolean = true
  filterable: Boolean = true
  editable: Boolean = true
  hidden: Boolean = false
  sequence: Int!
}

input RowDataInput {
  gridId: ID!
  data: JSON!
}

type RowMutationResponse implements MutationResponse {
  success: Boolean!
  message: String!
  errors: [ErrorDetail!]
  row: GridRow
}

extend type Query {
  dataGrid(id: ID!): DataGrid @auth(roles: ["user"])
  dataGrids(input: PaginationInput): DataGridConnection! @auth(roles: ["user"])
  dataGridRows(gridId: ID!, input: PaginationInput): [GridRow!]! @auth(roles: ["user"]) @policy(resource: "datagrid", action: "read")
}

extend type Mutation {
  createDataGrid(input: DataGridInput!): DataGrid! @auth(roles: ["user"]) @policy(resource: "datagrid", action: "create")
  updateDataGrid(id: ID!, input: DataGridInput!): DataGrid! @auth(roles: ["user"]) @policy(resource: "datagrid", action: "update")
  deleteDataGrid(id: ID!): Boolean! @auth(roles: ["user"]) @policy(resource: "datagrid", action: "delete")
  
  createRow(input: RowDataInput!): RowMutationResponse! @auth(roles: ["user"]) @policy(resource: "datagrid_rows", action: "create")
  updateRow(id: ID!, data: JSON!): RowMutationResponse! @auth(roles: ["user"]) @policy(resource: "datagrid_rows", action: "update")
  deleteRow(id: ID!): Boolean! @auth(roles: ["user"]) @policy(resource: "datagrid_rows", action: "delete")
  bulkDeleteRows(gridId: ID!, ids: [ID!]!): Int! @auth(roles: ["user"]) @policy(resource: "datagrid_rows", action: "delete")
  
  bulkUpdateRows(gridId: ID!, rows: [RowDataInput!]!): BulkUpdateResponse! @auth(roles: ["user"]) @policy(resource: "datagrid_rows", action: "update")
}

type BulkUpdateResponse implements MutationResponse {
  success: Boolean!
  message: String!
  errors: [ErrorDetail!]
  updatedCount: Int!
  failedCount: Int!
  failedRows: [RowMutationResponse!]
}
```

### AgentGrid Schema

```graphql
# grid/agent-grid.schema.graphql
type AgentGrid implements GridEntity {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  agents: [Agent!]!
  executions: [AgentExecution!]! @policy(resource: "agent_grid", action: "read")
  totalExecutions: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User
}

type Agent {
  id: ID!
  name: String!
  description: String
  status: AgentStatus!
  version: String!
  config: JSON!
  capabilities: [String!]!
  lastExecution: AgentExecution
  executionCount: Int!
  successRate: Float!
}

enum AgentStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
  ERROR
}

type AgentExecution {
  id: ID!
  agentId: ID!
  status: ExecutionStatus!
  input: JSON!
  output: JSON
  logs: [ExecutionLog!]!
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int # milliseconds
  error: String
}

enum ExecutionStatus {
  PENDING
  RUNNING
  SUCCESS
  FAILED
  CANCELLED
}

type ExecutionLog {
  id: ID!
  executionId: ID!
  level: LogLevel!
  message: String!
  data: JSON
  timestamp: DateTime!
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}

type AgentGridConnection {
  edges: [AgentGridEdge!]!
  pageInfo: PageInfo!
}

type AgentGridEdge {
  node: AgentGrid!
  cursor: String!
}

input AgentExecutionInput {
  agentId: ID!
  input: JSON!
}

type AgentExecutionResponse implements MutationResponse {
  success: Boolean!
  message: String!
  errors: [ErrorDetail!]
  execution: AgentExecution
}

extend type Query {
  agentGrid(id: ID!): AgentGrid @auth(roles: ["user"])
  agentGrids(input: PaginationInput): AgentGridConnection! @auth(roles: ["user"])
  agent(id: ID!): Agent @auth(roles: ["user"])
  agents: [Agent!]! @auth(roles: ["user"])
  
  agentExecution(id: ID!): AgentExecution @auth(roles: ["user"])
  agentExecutions(agentId: ID!, input: PaginationInput): [AgentExecution!]! @auth(roles: ["user"]) @policy(resource: "agent_grid", action: "read")
  
  executionLogs(executionId: ID!): [ExecutionLog!]! @auth(roles: ["user"]) @policy(resource: "agent_grid", action: "read")
}

extend type Mutation {
  createAgentGrid(input: AgentGridInput!): AgentGrid! @auth(roles: ["user"]) @policy(resource: "agent_grid", action: "create")
  updateAgentGrid(id: ID!, input: AgentGridInput!): AgentGrid! @auth(roles: ["user"]) @policy(resource: "agent_grid", action: "update")
  deleteAgentGrid(id: ID!): Boolean! @auth(roles: ["user"]) @policy(resource: "agent_grid", action: "delete")
  
  registerAgent(input: RegisterAgentInput!): Agent! @auth(roles: ["admin"]) @policy(resource: "agent_grid", action: "create")
  updateAgent(id: ID!, input: UpdateAgentInput!): Agent! @auth(roles: ["admin"]) @policy(resource: "agent_grid", action: "update")
  
  executeAgent(input: AgentExecutionInput!): AgentExecutionResponse! @auth(roles: ["user"])
  cancelExecution(id: ID!): Boolean! @auth(roles: ["user"])
}

input AgentGridInput {
  title: String!
  description: String
}

input RegisterAgentInput {
  name: String!
  description: String
  capabilities: [String!]!
  config: JSON!
}

input UpdateAgentInput {
  status: AgentStatus
  config: JSON
}

# Subscriptions for real-time execution updates
extend type Subscription {
  executionUpdated(executionId: ID!): AgentExecution!
  agentStatusChanged(agentId: ID!): Agent!
}
```

### PolicyGrid Schema

```graphql
# grid/policy-grid.schema.graphql
type PolicyGrid implements GridEntity {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  policies: [AccessPolicy!]!
  roles: [Role!]!
  resources: [Resource!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User
}

type AccessPolicy {
  id: ID!
  name: String!
  description: String
  resource: String!
  action: String!
  conditions: [PolicyCondition!]!
  roles: [Role!]!
  effect: PolicyEffect!
  priority: Int!
}

enum PolicyEffect {
  ALLOW
  DENY
}

type PolicyCondition {
  id: ID!
  field: String!
  operator: ConditionOperator!
  value: String
  values: [String!]
}

enum ConditionOperator {
  EQ
  NE
  GT
  LT
  IN
  CONTAINS
  REGEX
}

type Resource {
  id: ID!
  name: String!
  displayName: String!
  description: String
  actions: [ResourceAction!]!
}

type ResourceAction {
  id: ID!
  name: String!
  description: String!
}

type PolicyGridConnection {
  edges: [PolicyGridEdge!]!
  pageInfo: PageInfo!
}

type PolicyGridEdge {
  node: PolicyGrid!
  cursor: String!
}

type AccessCheckResult {
  allowed: Boolean!
  reason: String
  deniedBy: AccessPolicy
  matchedPolicies: [AccessPolicy!]
}

input PolicyConditionInput {
  field: String!
  operator: ConditionOperator!
  value: String
  values: [String!]
}

input AccessPolicyInput {
  name: String!
  description: String
  resource: String!
  action: String!
  conditions: [PolicyConditionInput!]
  roleIds: [ID!]!
  effect: PolicyEffect!
  priority: Int = 100
}

type PolicyMutationResponse implements MutationResponse {
  success: Boolean!
  message: String!
  errors: [ErrorDetail!]
  policy: AccessPolicy
}

extend type Query {
  policyGrid(id: ID!): PolicyGrid @auth(roles: ["admin"])
  policyGrids(input: PaginationInput): PolicyGridConnection! @auth(roles: ["admin"])
  
  policy(id: ID!): AccessPolicy @auth(roles: ["admin"])
  policies(input: PaginationInput): [AccessPolicy!]! @auth(roles: ["admin"])
  
  resources: [Resource!]! @auth(roles: ["admin"])
  resource(name: String!): Resource @auth(roles: ["admin"])
  
  checkAccess(userId: ID!, resource: String!, action: String!): AccessCheckResult! @auth(roles: ["admin"])
  userEffectivePermissions(userId: ID!): [String!]! @auth(roles: ["admin"])
}

extend type Mutation {
  createPolicyGrid(input: PolicyGridInput!): PolicyGrid! @auth(roles: ["admin"]) @policy(resource: "policy_grid", action: "create")
  updatePolicyGrid(id: ID!, input: PolicyGridInput!): PolicyGrid! @auth(roles: ["admin"]) @policy(resource: "policy_grid", action: "update")
  deletePolicyGrid(id: ID!): Boolean! @auth(roles: ["admin"]) @policy(resource: "policy_grid", action: "delete")
  
  createPolicy(input: AccessPolicyInput!): PolicyMutationResponse! @auth(roles: ["admin"]) @policy(resource: "policy_grid", action: "create")
  updatePolicy(id: ID!, input: AccessPolicyInput!): PolicyMutationResponse! @auth(roles: ["admin"]) @policy(resource: "policy_grid", action: "update")
  deletePolicy(id: ID!): Boolean! @auth(roles: ["admin"]) @policy(resource: "policy_grid", action: "delete")
  
  registerResource(input: RegisterResourceInput!): Resource! @auth(roles: ["admin"])
  updateResource(name: String!, input: UpdateResourceInput!): Resource! @auth(roles: ["admin"])
}

input PolicyGridInput {
  title: String!
  description: String
}

input RegisterResourceInput {
  name: String!
  displayName: String!
  description: String
  actions: [String!]!
}

input UpdateResourceInput {
  displayName: String
  description: String
  actions: [String!]
}
```

### FlowGrid Schema

```graphql
# grid/flow-grid.schema.graphql
type FlowGrid implements GridEntity {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  workflows: [Workflow!]!
  totalExecutions: Int!
  successRate: Float!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User
}

type Workflow {
  id: ID!
  name: String!
  description: String
  version: Int!
  status: WorkflowStatus!
  steps: [WorkflowStep!]!
  triggers: [WorkflowTrigger!]!
  variables: [WorkflowVariable!]!
  executions: [WorkflowExecution!]! @policy(resource: "flow_grid", action: "read")
  successRate: Float!
  totalExecutions: Int!
}

enum WorkflowStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  PAUSED
}

type WorkflowStep {
  id: ID!
  workflowId: ID!
  name: String!
  type: StepType!
  sequence: Int!
  config: JSON!
  conditions: [StepCondition!]!
  nextStepIds: [ID!]!
  errorHandling: ErrorHandlingConfig
}

enum StepType {
  ACTION
  CONDITION
  LOOP
  DELAY
  WEBHOOK
  SCRIPT
  HUMAN_TASK
}

type StepCondition {
  id: ID!
  stepId: ID!
  field: String!
  operator: ConditionOperator!
  value: String
}

type ErrorHandlingConfig {
  retryCount: Int
  retryDelay: Int
  fallbackAction: String
  notifyOnError: Boolean
}

type WorkflowTrigger {
  id: ID!
  workflowId: ID!
  type: TriggerType!
  config: JSON!
}

enum TriggerType {
  WEBHOOK
  SCHEDULED
  EVENT
  MANUAL
}

type WorkflowVariable {
  id: ID!
  workflowId: ID!
  name: String!
  type: VariableType!
  defaultValue: String
  required: Boolean!
}

enum VariableType {
  STRING
  NUMBER
  BOOLEAN
  ARRAY
  OBJECT
  DATE
}

type WorkflowExecution {
  id: ID!
  workflowId: ID!
  status: ExecutionStatus!
  variables: JSON!
  steps: [StepExecution!]!
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int
  error: String
}

type StepExecution {
  id: ID!
  executionId: ID!
  stepId: ID!
  status: ExecutionStatus!
  input: JSON
  output: JSON
  startedAt: DateTime!
  completedAt: DateTime
  duration: Int
  error: String
}

type FlowGridConnection {
  edges: [FlowGridEdge!]!
  pageInfo: PageInfo!
}

type FlowGridEdge {
  node: FlowGrid!
  cursor: String!
}

type WorkflowExecutionResponse implements MutationResponse {
  success: Boolean!
  message: String!
  errors: [ErrorDetail!]
  execution: WorkflowExecution
}

input StepConditionInput {
  field: String!
  operator: ConditionOperator!
  value: String
}

input ErrorHandlingConfigInput {
  retryCount: Int
  retryDelay: Int
  fallbackAction: String
  notifyOnError: Boolean
}

input WorkflowStepInput {
  name: String!
  type: StepType!
  sequence: Int!
  config: JSON!
  conditions: [StepConditionInput!]
  nextStepIds: [ID!]
  errorHandling: ErrorHandlingConfigInput
}

input WorkflowTriggerInput {
  type: TriggerType!
  config: JSON!
}

input WorkflowVariableInput {
  name: String!
  type: VariableType!
  defaultValue: String
  required: Boolean = false
}

input WorkflowInput {
  name: String!
  description: String
  steps: [WorkflowStepInput!]!
  triggers: [WorkflowTriggerInput!]!
  variables: [WorkflowVariableInput!]!
}

input ExecuteWorkflowInput {
  workflowId: ID!
  variables: JSON
}

extend type Query {
  flowGrid(id: ID!): FlowGrid @auth(roles: ["user"])
  flowGrids(input: PaginationInput): FlowGridConnection! @auth(roles: ["user"])
  
  workflow(id: ID!): Workflow @auth(roles: ["user"])
  workflows(input: PaginationInput): [Workflow!]! @auth(roles: ["user"])
  
  workflowExecution(id: ID!): WorkflowExecution @auth(roles: ["user"])
  workflowExecutions(workflowId: ID!, input: PaginationInput): [WorkflowExecution!]! @auth(roles: ["user"]) @policy(resource: "flow_grid", action: "read")
}

extend type Mutation {
  createFlowGrid(input: FlowGridInput!): FlowGrid! @auth(roles: ["user"]) @policy(resource: "flow_grid", action: "create")
  updateFlowGrid(id: ID!, input: FlowGridInput!): FlowGrid! @auth(roles: ["user"]) @policy(resource: "flow_grid", action: "update")
  deleteFlowGrid(id: ID!): Boolean! @auth(roles: ["user"]) @policy(resource: "flow_grid", action: "delete")
  
  createWorkflow(gridId: ID!, input: WorkflowInput!): Workflow! @auth(roles: ["user"]) @policy(resource: "flow_grid", action: "create")
  publishWorkflow(id: ID!): Workflow! @auth(roles: ["user"]) @policy(resource: "flow_grid", action: "update")
  executeWorkflow(input: ExecuteWorkflowInput!): WorkflowExecutionResponse! @auth(roles: ["user"])
  cancelExecution(id: ID!): Boolean! @auth(roles: ["user"])
}

extend type Subscription {
  workflowExecutionUpdated(executionId: ID!): WorkflowExecution!
  stepExecutionUpdated(executionId: ID!, stepId: ID!): StepExecution!
}
```

---

## Hybrid ORM Integration

### Service Architecture

**Decision**: Use **Strategy Pattern** to switch between ORM implementations based on query complexity.

```typescript
// services/data-grid.service.ts
export class DataGridService {
  constructor(
    private prisma: PrismaClient,
    private drizzle: DrizzleDB,
    private logger: Logger,
  ) {}

  // Simple relational query → Prisma
  async getDataGrid(id: string): Promise<DataGrid> {
    return this.prisma.dataGrid.findUnique({
      where: { id },
      include: { columns: true, createdBy: true },
    });
  }

  // Aggregation/performance-critical → Drizzle
  async getGridAnalytics(gridId: string): Promise<GridAnalytics> {
    return this.drizzle.query.dataGrids
      .findFirst({ where: eq(dataGrids.id, gridId) })
      .then(async (grid) => {
        if (!grid) return null;
        
        const rowStats = await this.drizzle.query.gridRows
          .select({
            validCount: count(gridRows.id)
              .filter(eq(gridRows.status, 'VALID')),
            invalidCount: count(gridRows.id)
              .filter(eq(gridRows.status, 'INVALID')),
            totalCount: count(gridRows.id),
          })
          .from(gridRows)
          .where(eq(gridRows.gridId, gridId));
          
        return { grid, ...rowStats };
      });
  }

  // Cross-tenant queries → Drizzle (better performance)
  async searchAcrossGrids(
    search: string,
    userId: string,
  ): Promise<DataGrid[]> {
    // Get user's tenant and accessible grids via policies
    const userTenant = await this.getUserTenant(userId);
    
    return this.drizzle.query.dataGrids
      .select()
      .from(dataGrids)
      .where(
        and(
          eq(dataGrids.tenantId, userTenant.id),
          sql`MATCH (${dataGrids.title}, ${dataGrids.description}) AGAINST (${search} IN BOOLEAN MODE)`,
        ),
      )
      .limit(50);
  }
}
```

### ORM Decision Matrix

| Query Type | ORM | Reason |
|---|---|---|
| Single entity read | Prisma | Relational consistency, built-in caching |
| Nested relations | Prisma | Best for JOINs, eager loading |
| Aggregations | Drizzle | Raw SQL performance, better control |
| Full-text search | Drizzle | Native MySQL FTS support |
| Real-time dashboards | Drizzle | Streaming, better for large datasets |
| Multi-tenant isolation | Prisma | Middleware hooks for tenant context |
| Batch operations | Drizzle | createMany is more efficient |
| Transactions | Both | Combine for complex workflows |

---

## Multi-Tenancy & Policy-Aware Access

### Tenant Context Injection

```typescript
// middleware/tenant.middleware.ts
import { Injectable } from '@nestjs/common';
import { GraphQLExecutionContext } from '@nestjs/graphql';

@Injectable()
export class TenantMiddleware {
  resolve(source, args, context, info) {
    const user = context.req.user;
    
    // Inject tenantId into context
    context.tenantId = user.tenantId;
    context.userId = user.id;
    context.userRoles = user.roles.map(r => r.name);
    
    return source;
  }
}
```

### Policy-Aware Directive

```typescript
// directives/policy.directive.ts
import { SchemaDirectiveVisitor } from 'apollo-server';
import { GraphQLField } from 'graphql';

export class PolicyDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resource, action } = this.args;
    const originalResolve = field.resolve;

    field.resolve = async (source, args, context, info) => {
      // Check policy
      const allowed = await this.checkPolicy(
        context.userId,
        resource,
        action,
        args,
        context.tenantId,
      );

      if (!allowed) {
        throw new ForbiddenException(
          `Access denied: ${resource}/${action}`,
        );
      }

      return originalResolve(source, args, context, info);
    };
  }

  private async checkPolicy(
    userId: string,
    resource: string,
    action: string,
    args: any,
    tenantId: string,
  ): Promise<boolean> {
    // Fetch applicable policies
    const policies = await this.policyService.getPoliciesForUser(
      userId,
      resource,
      action,
    );

    // Evaluate conditions
    for (const policy of policies) {
      if (this.evaluateConditions(policy.conditions, args)) {
        return policy.effect === 'ALLOW';
      }
    }

    return false;
  }
}
```

---

## Grid Module Integration

### DataLoader for N+1 Prevention

```typescript
// loaders/dataloader.ts
import DataLoader from 'dataloader';

export class DataLoaderService {
  userLoader = new DataLoader(async (userIds: string[]) => {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    return userIds.map(id => users.find(u => u.id === id));
  });

  roleLoader = new DataLoader(async (roleIds: string[]) => {
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
    });
    return roleIds.map(id => roles.find(r => r.id === id));
  });

  agentLoader = new DataLoader(async (agentIds: string[]) => {
    const agents = await this.drizzle.query.agents
      .select()
      .from(agents)
      .where(inArray(agents.id, agentIds));
    return agentIds.map(id => agents.find(a => a.id === id));
  });

  // Clear caches after mutations
  clearCache() {
    this.userLoader.clearAll();
    this.roleLoader.clearAll();
    this.agentLoader.clearAll();
  }
}
```

---

## AI-Native Querying & Semantic Support

### Semantic Query Resolution

```typescript
// services/semantic-query.service.ts
export class SemanticQueryService {
  constructor(
    private llm: OpenAIService,
    private graphqlService: GraphQLService,
  ) {}

  /**
   * Convert natural language to GraphQL query
   * Example: "Show me all active workflows from last week"
   */
  async resolveQuery(
    naturalLanguage: string,
    schema: GraphQLSchema,
  ): Promise<any> {
    // 1. Extract entities and intents
    const intent = await this.llm.extractIntent(naturalLanguage);
    
    // 2. Map to GraphQL concepts
    const mappedQuery = this.mapToGraphQL(intent, schema);
    
    // 3. Generate GraphQL query
    const gqlQuery = this.generateGraphQL(mappedQuery);
    
    // 4. Execute and return
    return this.graphqlService.execute(gqlQuery);
  }

  private mapToGraphQL(intent: Intent, schema: GraphQLSchema) {
    // intent.entities → GraphQL types
    // intent.action → Query/Mutation/Subscription
    // intent.filters → WHERE clauses
    // intent.sorting → SORT arguments
    // intent.aggregations → aggregation fields
    
    return {
      operation: intent.action,
      type: intent.primaryEntity,
      filters: this.buildFilters(intent.filters),
      sort: this.buildSort(intent.sorting),
      fields: this.inferFields(intent, schema),
    };
  }
}
```

### AI-Enhanced Resolvers

```typescript
// resolvers/grids/data-grid.resolver.ts
@Resolver('DataGrid')
export class DataGridResolver {
  @Query('dataGrids')
  async dataGrids(
    @Args('input') input: PaginationInput,
    @Context() context: any,
  ) {
    // AI can auto-suggest filters based on user behavior
    const suggestedFilters = await this.aiService.suggestFilters(
      context.userId,
      'DataGrid',
    );

    return this.dataGridService.paginate(input, {
      tenantId: context.tenantId,
      userId: context.userId,
      suggestedFilters,
    });
  }

  @Mutation('bulkUpdateRows')
  async bulkUpdateRows(
    @Args('gridId') gridId: string,
    @Args('rows') rows: RowDataInput[],
    @Context() context: any,
  ): Promise<BulkUpdateResponse> {
    // AI can validate and auto-correct data
    const validatedRows = await this.aiService.validateAndCorrect(
      rows,
      gridId,
      context.tenantId,
    );

    return this.dataGridService.bulkUpdate(gridId, validatedRows);
  }
}
```

---

## Performance & Optimization

### Query Complexity Analysis

```typescript
// middleware/complexity.middleware.ts
import { GraphQLError } from 'graphql';
import { getComplexity, simpleEstimator } from 'graphql-query-complexity';

@Injectable()
export class ComplexityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const schema = this.graphqlService.schema;
    
    return (req: any, res: Response, next: NextFunction) => {
      if (req.body.query) {
        const complexity = getComplexity({
          schema,
          operationName: req.body.operationName,
          query: req.body.query,
          variables: req.body.variables,
          estimators: [simpleEstimator({ defaultComplexity: 1 })],
        });

        if (complexity > MAX_QUERY_COMPLEXITY) {
          throw new GraphQLError(
            `Query too complex: ${complexity}/${MAX_QUERY_COMPLEXITY}`,
          );
        }
      }

      next();
    };
  }
}
```

### Connection Pooling

```typescript
// config/database.config.ts
export const databaseConfig = {
  // Prisma pooling
  prisma: {
    datasource: {
      url: `${DATABASE_URL}?connection_limit=10&pool_timeout=10`,
    },
  },

  // Drizzle pooling
  drizzle: {
    connectionPool: {
      min: 5,
      max: 20,
      waitForConnections: true,
      connectionTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelaySeconds: 0,
    },
  },
};
```

---

## Observability & Monitoring

### OpenTelemetry Integration

```typescript
// middleware/tracing.middleware.ts
@Injectable()
export class TracingMiddleware {
  constructor(private tracer = trace.getTracer('graphql-layer')) {}

  resolve(source, args, context, info) {
    const span = this.tracer.startSpan(
      `graphql.${info.parentType.name}.${info.fieldName}`,
    );

    return context.runInAsyncScope(async () => {
      try {
        span.addEvent('query_start', {
          'query.name': info.fieldName,
          'query.type': info.parentType.name,
          'args.count': Object.keys(args).length,
        });

        const result = await source;

        span.addEvent('query_complete', {
          'result.size': JSON.stringify(result).length,
        });

        return result;
      } catch (error) {
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

### Structured Logging

```typescript
// services/logging.service.ts
@Injectable()
export class GraphQLLogger {
  constructor(private logger: Logger) {}

  logQuery(fieldName: string, args: any, context: any) {
    this.logger.debug('GraphQL Query', {
      field: fieldName,
      userId: context.userId,
      tenantId: context.tenantId,
      args: JSON.stringify(args),
      timestamp: new Date().toISOString(),
    });
  }

  logMutation(fieldName: string, args: any, context: any, result: any) {
    this.logger.info('GraphQL Mutation', {
      field: fieldName,
      userId: context.userId,
      tenantId: context.tenantId,
      changes: JSON.stringify(args),
      result: result.success,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Security Considerations

### Input Validation

```typescript
// validators/graphql.validator.ts
import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateUserInput {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;
}
```

### Rate Limiting per User

```typescript
// middleware/rate-limit.middleware.ts
@Injectable()
export class RateLimitMiddleware {
  constructor(private redis: RedisClient) {}

  async checkRateLimit(userId: string, tenantId: string) {
    const key = `ratelimit:${tenantId}:${userId}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, 60); // 60 seconds
    }

    const limit = 100; // 100 requests per minute
    if (count > limit) {
      throw new TooManyRequestsException();
    }
  }
}
```

---

## Decision Matrix

| Decision | Option A | Option B | Chosen | Reason |
|---|---|---|---|---|
| **GraphQL Server** | Apollo Server | GraphQL Yoga | Apollo Server | Best NestJS integration, mature ecosystem, subscription support |
| **Schema Definition** | SDL files | TypeScript classes | SDL files | Modular, versionable, easier federation |
| **ORM Strategy** | Prisma only | Hybrid (Prisma + Drizzle) | Hybrid | Balances relational consistency with query performance |
| **Data Loaders** | Custom implementation | graphql-query-complexity library | Custom + library | Fine-grained control + built-in complexity |
| **Authentication** | JWT in headers | Bearer tokens | Both | Flexible for different client types |
| **Multi-tenancy** | Context injection | Middleware | Both | Comprehensive tenant isolation |
| **Caching** | Redis | Apollo Cache | Redis + @cacheControl | Performance at scale |
| **Real-time** | WebSockets | SSE | WebSockets | Lower latency for subscriptions |
| **File Upload** | GraphQL Upload | External S3 API | External S3 API | Scalability, separation of concerns |
| **Testing** | Jest + apollo-server-testing | End-to-end | Both | Unit + integration coverage |

---

## Conclusion

This GraphQL architecture provides:

✅ **Modularity** — Independent grid modules with shared base types  
✅ **Performance** — Hybrid ORM, DataLoaders, complexity analysis  
✅ **Security** — Policy-aware directives, field-level access control  
✅ **Scalability** — Multi-tenant isolation, connection pooling  
✅ **Observability** — OpenTelemetry tracing, structured logging  
✅ **AI-Native** — Semantic query resolution, LLM integration  
✅ **Production-Ready** — Comprehensive error handling, validation, testing  

**Next Steps:**

1. Set up Apollo Server with NestJS GraphQL module
2. Implement schema files (base + grids)
3. Build resolvers with service layer
4. Add middleware (auth, policy, tracing)
5. Implement DataLoader batching
6. Set up tests (unit + integration + e2e)
7. Configure observability stack
8. Document API with Introspection UI
