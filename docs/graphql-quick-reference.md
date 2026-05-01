# GraphQL Quick Reference Guide

**Version:** 1.0  
**Status:** Quick Reference  
**Last Updated:** May 2026

## Authentication

All GraphQL requests require an Authorization header with Bearer token:

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id email } }"}'
```

## DataGrid Operations

### List DataGrids

```graphql
query {
  dataGrids(input: { page: 1, pageSize: 20, filter: "search term" }) {
    edges {
      node {
        id
        title
        description
        columns {
          name
          type
          displayName
        }
        totalRows
      }
    }
    pageInfo {
      page
      pageSize
      total
      totalPages
      hasNextPage
    }
  }
}
```

### Get DataGrid by ID

```graphql
query {
  dataGrid(id: "grid-1") {
    id
    title
    description
    columns {
      id
      name
      type
      displayName
      sortable
      filterable
      editable
    }
    totalRows
  }
}
```

### Create DataGrid

```graphql
mutation {
  createDataGrid(input: {
    title: "My Data Grid"
    description: "A sample data grid"
    columns: [
      {
        name: "id"
        type: TEXT
        displayName: "ID"
        sequence: 0
        sortable: true
        filterable: true
        editable: false
      }
      {
        name: "name"
        type: TEXT
        displayName: "Name"
        sequence: 1
        sortable: true
        filterable: true
        editable: true
      }
      {
        name: "value"
        type: NUMBER
        displayName: "Value"
        sequence: 2
        sortable: true
        filterable: true
        editable: true
      }
    ]
  }) {
    id
    title
    columns {
      name
      type
    }
  }
}
```

### Update DataGrid

```graphql
mutation {
  updateDataGrid(id: "grid-1", input: {
    title: "Updated Title"
    description: "Updated description"
    columns: [
      {
        name: "id"
        type: TEXT
        displayName: "ID"
        sequence: 0
      }
    ]
  }) {
    id
    title
  }
}
```

### Delete DataGrid

```graphql
mutation {
  deleteDataGrid(id: "grid-1")
}
```

---

## Row Operations

### Get Grid Rows

```graphql
query {
  dataGridRows(gridId: "grid-1", input: { page: 1, pageSize: 50 }) {
    id
    data
    status
    errors
  }
}
```

### Create Row

```graphql
mutation {
  createRow(input: {
    gridId: "grid-1"
    data: {
      id: "1"
      name: "John Doe"
      value: 100
    }
  }) {
    success
    message
    row {
      id
      data
      status
    }
    errors {
      field
      message
      code
    }
  }
}
```

### Update Row

```graphql
mutation {
  updateRow(id: "row-1", data: {
    name: "Jane Doe"
    value: 200
  }) {
    success
    row {
      id
      data
      status
    }
  }
}
```

### Delete Row

```graphql
mutation {
  deleteRow(id: "row-1")
}
```

### Bulk Delete Rows

```graphql
mutation {
  bulkDeleteRows(gridId: "grid-1", ids: ["row-1", "row-2", "row-3"])
}
```

### Bulk Update Rows

```graphql
mutation {
  bulkUpdateRows(gridId: "grid-1", rows: [
    {
      id: "row-1"
      data: { name: "Updated 1", value: 100 }
    }
    {
      id: "row-2"
      data: { name: "Updated 2", value: 200 }
    }
  ]) {
    success
    message
    updatedCount
    failedCount
    failedRows {
      success
      message
      errors {
        field
        message
        code
      }
    }
  }
}
```

---

## Agent Operations

### List Agents

```graphql
query {
  agents {
    id
    name
    description
    status
    version
    capabilities
    executionCount
    successRate
    lastExecution {
      id
      status
      duration
    }
  }
}
```

### List Agent Executions

```graphql
query {
  agentExecutions(agentId: "agent-1", input: { page: 1, pageSize: 20 }) {
    id
    status
    input
    output
    startedAt
    completedAt
    duration
    error
    logs {
      level
      message
      timestamp
    }
  }
}
```

### Execute Agent

```graphql
mutation {
  executeAgent(input: {
    agentId: "agent-1"
    input: {
      data: "test input"
      parameters: { timeout: 30 }
    }
  }) {
    success
    message
    execution {
      id
      status
      startedAt
    }
  }
}
```

### Cancel Execution

```graphql
mutation {
  cancelExecution(id: "exec-1")
}
```

### Subscribe to Execution Updates

```graphql
subscription {
  executionUpdated(executionId: "exec-1") {
    id
    status
    output
    completedAt
    duration
  }
}
```

---

## Policy Operations

### List Policies

```graphql
query {
  policies(input: { page: 1, pageSize: 20 }) {
    id
    name
    description
    resource
    action
    effect
    priority
    roles {
      id
      name
    }
    conditions {
      field
      operator
      value
    }
  }
}
```

### Check Access

```graphql
query {
  checkAccess(userId: "user-1", resource: "datagrid", action: "read") {
    allowed
    reason
    deniedBy {
      id
      name
    }
    matchedPolicies {
      id
      name
      effect
    }
  }
}
```

### Get User Effective Permissions

```graphql
query {
  userEffectivePermissions(userId: "user-1")
}
```

### Create Policy

```graphql
mutation {
  createPolicy(input: {
    name: "DataGrid Editor Policy"
    description: "Allows editing data grids"
    resource: "datagrid"
    action: "update"
    effect: ALLOW
    priority: 100
    roleIds: ["role-editor"]
    conditions: [
      {
        field: "tenantId"
        operator: EQ
        value: "tenant-1"
      }
    ]
  }) {
    success
    message
    policy {
      id
      name
      effect
    }
  }
}
```

### Update Policy

```graphql
mutation {
  updatePolicy(id: "policy-1", input: {
    priority: 50
    effect: DENY
  }) {
    success
    policy {
      id
      priority
      effect
    }
  }
}
```

### Delete Policy

```graphql
mutation {
  deletePolicy(id: "policy-1")
}
```

---

## Workflow Operations

### List Workflows

```graphql
query {
  workflows(input: { page: 1, pageSize: 20 }) {
    id
    name
    description
    version
    status
    steps {
      id
      name
      type
      sequence
      nextStepIds
    }
    triggers {
      type
      config
    }
    variables {
      name
      type
      required
    }
    successRate
    totalExecutions
  }
}
```

### Create Workflow

```graphql
mutation {
  createWorkflow(gridId: "flow-1", input: {
    name: "Customer Onboarding"
    description: "Onboarding workflow for new customers"
    steps: [
      {
        name: "Send Welcome Email"
        type: ACTION
        sequence: 1
        config: {
          service: "email"
          template: "welcome"
        }
        nextStepIds: ["step-2"]
      }
      {
        name: "Create Account"
        type: ACTION
        sequence: 2
        config: {
          service: "account"
          action: "create"
        }
        nextStepIds: []
      }
    ]
    triggers: [
      {
        type: MANUAL
        config: {}
      }
    ]
    variables: [
      {
        name: "customerEmail"
        type: STRING
        required: true
      }
      {
        name: "customerName"
        type: STRING
        required: true
      }
    ]
  }) {
    id
    name
    status
  }
}
```

### Publish Workflow

```graphql
mutation {
  publishWorkflow(id: "workflow-1") {
    id
    status
    version
  }
}
```

### Execute Workflow

```graphql
mutation {
  executeWorkflow(input: {
    workflowId: "workflow-1"
    variables: {
      customerEmail: "john@example.com"
      customerName: "John Doe"
    }
  }) {
    success
    message
    execution {
      id
      status
      startedAt
    }
  }
}
```

### Subscribe to Workflow Execution

```graphql
subscription {
  workflowExecutionUpdated(executionId: "exec-1") {
    id
    status
    startedAt
    completedAt
    duration
    steps {
      id
      status
      startedAt
      completedAt
    }
  }
}
```

---

## User Management

### Get Current User

```graphql
query {
  me {
    id
    email
    firstName
    lastName
    status
    roles {
      id
      name
      permissions {
        name
        resource
        action
      }
    }
  }
}
```

### List Users

```graphql
query {
  users(input: { page: 1, pageSize: 20, filter: "john" }) {
    edges {
      node {
        id
        email
        firstName
        lastName
        status
        roles {
          id
          name
        }
      }
    }
    pageInfo {
      total
      page
      pageSize
    }
  }
}
```

### Get User

```graphql
query {
  user(id: "user-1") {
    id
    email
    firstName
    lastName
    roles {
      id
      name
    }
  }
}
```

### Create User

```graphql
mutation {
  createUser(input: {
    email: "newuser@example.com"
    firstName: "New"
    lastName: "User"
    roleIds: ["role-user"]
  }) {
    id
    email
    roles {
      id
      name
    }
  }
}
```

### Update User

```graphql
mutation {
  updateUser(id: "user-1", input: {
    firstName: "Updated"
    lastName: "Name"
    status: ACTIVE
    roleIds: ["role-admin", "role-editor"]
  }) {
    id
    email
    status
    roles {
      id
      name
    }
  }
}
```

### Delete User

```graphql
mutation {
  deleteUser(id: "user-1")
}
```

---

## Pagination Pattern

All list queries follow this pattern:

```graphql
query {
  items(input: {
    page: 1              # Current page (1-indexed)
    pageSize: 20         # Items per page
    sort: [
      { field: "name", direction: ASC }
    ]
    filter: "search"     # Optional text search
  }) {
    edges {
      node {
        # Fields
      }
      cursor
    }
    pageInfo {
      page
      pageSize
      total               # Total number of items
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
}
```

---

## Error Handling

All mutations return responses with consistent error format:

```graphql
{
  success: Boolean!      # Whether operation succeeded
  message: String!       # Human-readable message
  errors: [
    {
      field: String!     # Field that caused error
      message: String!   # Error description
      code: String!      # Error code for programmatic handling
    }
  ]
}
```

### Example Error Response

```json
{
  "data": {
    "createRow": {
      "success": false,
      "message": "Validation failed",
      "errors": [
        {
          "field": "data.name",
          "message": "Name is required",
          "code": "REQUIRED_FIELD"
        }
      ]
    }
  }
}
```

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| `ACTIVE` | Active/enabled |
| `INACTIVE` | Inactive/disabled |
| `SUSPENDED` | Temporarily disabled |
| `DRAFT` | Not yet published |
| `PUBLISHED` | Live and available |
| `ARCHIVED` | No longer in use |
| `PENDING` | Awaiting action |
| `RUNNING` | Currently executing |
| `SUCCESS` | Completed successfully |
| `FAILED` | Completed with failure |
| `CANCELLED` | User cancelled |

---

## Tips & Tricks

### Fetch Related Data in One Query

```graphql
query {
  dataGrid(id: "grid-1") {
    id
    title
    createdBy {
      id
      email
      roles {
        name
      }
    }
    updatedBy {
      id
      email
    }
  }
}
```

### Use Fragments for DRY Queries

```graphql
fragment UserFields on User {
  id
  email
  firstName
  lastName
  roles {
    id
    name
  }
}

query {
  user(id: "user-1") {
    ...UserFields
  }
  createdBy {
    ...UserFields
  }
}
```

### Filter During Query

```graphql
query {
  dataGrids(input: {
    page: 1
    pageSize: 20
    filter: "important"
  }) {
    edges {
      node {
        title
      }
    }
  }
}
```

### Sort Results

```graphql
query {
  dataGrids(input: {
    sort: [
      { field: "title", direction: ASC }
      { field: "createdAt", direction: DESC }
    ]
  }) {
    edges {
      node {
        title
      }
    }
  }
}
```

---

## Rate Limits

- **Queries:** 100 per minute per user
- **Mutations:** 50 per minute per user
- **Query Complexity:** Max 1000 per request
- **Response Size:** Max 5MB per response

---

## Useful Links

- **API Docs:** http://localhost:3000/graphql
- **Apollo Studio:** https://studio.apollographql.com
- **GraphQL Spec:** https://spec.graphql.org
- **Best Practices:** https://graphql.org/learn/best-practices

