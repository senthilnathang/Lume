# GraphQL API Developer Guide

**Version:** 1.0.0  
**Last Updated:** 2026-05-01  
**Audience:** Frontend/API client developers

This guide provides practical examples for building applications against the Lume GraphQL API. For architecture details, see [GRAPHQL_ARCHITECTURE.md](GRAPHQL_ARCHITECTURE.md).

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Queries & Pagination](#queries--pagination)
4. [Mutations](#mutations)
5. [Subscriptions](#subscriptions)
6. [Field-Level Permissions](#field-level-permissions)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Client Setup](#client-setup)

---

## Getting Started

### Endpoint & Protocol

```
HTTP POST:   /api/v2/graphql
WebSocket:   /api/v2/graphql (graphql-ws protocol)
Schema:      GET /api/v2/graphql/schema.graphql (SDL)
Introspection: GET /api/v2/graphql/schema.json
Documentation: GET /api/v2/graphql/docs (Markdown)
Examples:    GET /api/v2/graphql/examples (Client examples)
```

### Quick Test (using cURL)

```bash
curl -X POST http://localhost:3000/api/v2/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-org-id: 1" \
  -d '{"query": "{ entities { id name } }"}'
```

---

## Authentication

### Bearer Token (HTTP Requests)

All HTTP GraphQL requests require JWT authentication:

```graphql
POST /api/v2/graphql
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-org-id: 1

query {
  entities {
    id
    name
  }
}
```

**JWT Payload (decoded):**
```json
{
  "sub": 123,                    # User ID
  "email": "admin@lume.dev",
  "role_name": "admin",
  "company_id": 1,
  "iat": 1672531200,
  "exp": 1672617600
}
```

### WebSocket (Subscriptions)

For subscriptions, authenticate on WebSocket connection:

```javascript
const client = new GraphQLWsLink({
  url: 'ws://localhost:3000/api/v2/graphql',
  connectionParams: {
    authorization: 'Bearer YOUR_JWT_TOKEN'
  }
});
```

### Multi-Tenant Header

In multi-tenant scenarios, pass company ID via header (fallback if JWT missing):

```
x-org-id: 1
```

The header is optional if your JWT already includes `company_id` claim.

---

## Queries & Pagination

### Basic Entity Query

```graphql
query {
  entities {
    id
    name
    label
    model
    status
    createdAt
    updatedAt
  }
}
```

### Pagination Pattern

```graphql
query GetEntitiesPage($page: Int!, $limit: Int!) {
  entities(pagination: { page: $page, limit: $limit, sortBy: "name", sortOrder: "asc" }) {
    id
    name
    _pagination {
      page
      limit
      total
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**Variables:**
```json
{
  "page": 1,
  "limit": 20
}
```

**Pagination Rules:**
- Max `limit: 100` (enforced server-side, clamps higher values)
- Default `limit: 20`
- `page: 1` is first page (1-indexed)
- `sortBy` field must exist on type
- `sortOrder: "asc" | "desc"`

### Filtering

```graphql
query SearchEntities($filters: [FilterInput!]) {
  entities(filters: $filters) {
    id
    name
  }
}
```

**Filter Input:**
```json
{
  "filters": [
    {
      "field": "status",
      "operator": "eq",
      "value": "active"
    },
    {
      "field": "createdAt",
      "operator": "gte",
      "value": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Supported Operators:**
- `eq` — equals
- `neq` — not equals
- `gt` — greater than
- `gte` — greater than or equal
- `lt` — less than
- `lte` — less than or equal
- `in` — in array
- `contains` — substring match
- `icontains` — case-insensitive substring

### Record Queries with Field Masking

```graphql
query GetRecords($entityId: Int!, $page: Int!) {
  entityRecords(entityId: $entityId, pagination: { page: $page, limit: 20 }) {
    edges {
      id
      entityId
      data       # JSON — automatically masked per field permissions
      visibility
      createdBy {
        id
        email
      }
      createdAt
      updatedAt
    }
    _pagination {
      total
      hasNextPage
    }
  }
}
```

**Data Field:**
- Contains record data as JSON object
- Fields excluded based on `EntityFieldPermission.canRead = false`
- Automatically filtered server-side (no client-side masking needed)

### Related Data with DataLoader

```graphql
query GetEntityWithFields($id: Int!) {
  entity(id: $id) {
    id
    name
    fields {          # DataLoader batches field queries
      id
      name
      type
      label
      description
      required
      sequence
      selectOptions
    }
  }
}
```

DataLoader ensures that querying 10 entities + their fields results in 2 database queries (not 11). No special syntax needed — it's transparent.

---

## Mutations

### Create Entity

```graphql
mutation CreateEntity($input: CreateEntityInput!) {
  createEntity(input: $input) {
    id
    name
    label
    model
    status
    createdAt
  }
}
```

**Input Variables:**
```json
{
  "input": {
    "name": "customers",
    "label": "Customers",
    "model": "customer",
    "description": "Customer records"
  }
}
```

### Create Record

```graphql
mutation CreateRecord($entityId: Int!, $input: CreateEntityRecordInput!) {
  createEntityRecord(entityId: $entityId, input: $input) {
    id
    entityId
    data
    visibility
    createdAt
  }
}
```

**Input Variables:**
```json
{
  "entityId": 5,
  "input": {
    "data": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "status": "active"
    },
    "visibility": "public"
  }
}
```

### Update Record

```graphql
mutation UpdateRecord($entityId: Int!, $recordId: Int!, $input: UpdateEntityRecordInput!) {
  updateEntityRecord(entityId: $entityId, recordId: $recordId, input: $input) {
    id
    data
    updatedAt
  }
}
```

### Delete Record

```graphql
mutation DeleteRecord($recordId: Int!) {
  deleteEntityRecord(recordId: $recordId)  # Returns Boolean
}
```

### Bulk Operations

```graphql
mutation DeleteMultiple($recordIds: [Int!]!) {
  deleteEntityRecords(recordIds: $recordIds) {
    id
    deletedAt    # Soft delete timestamp
  }
}
```

### Error Response Example

```json
{
  "errors": [
    {
      "message": "Permission denied: base.entity_records.create",
      "extensions": {
        "code": "FORBIDDEN",
        "userId": 123,
        "companyId": 1
      }
    }
  ]
}
```

---

## Subscriptions

### WebSocket Connection Setup

```javascript
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { webSocket } from 'ws';

const wsLink = new GraphQLWsLink({
  webSocketImpl: webSocket,
  url: 'ws://localhost:3000/api/v2/graphql',
  connectionParams: {
    authorization: `Bearer ${jwtToken}`
  }
});
```

### Listen to Workflow Events

```graphql
subscription OnFlowExecuted {
  flowExecuted {
    id
    flowId
    flowName
    model
    status           # 'completed' | 'failed' | 'running'
    recordId
    payload          # JSON event data
    executionTimeMs
    errorMessage
    timestamp
  }
}
```

### Example: Listen for Workflow Completion

```javascript
const subscription = gql`
  subscription {
    flowExecuted {
      id
      flowName
      status
      recordId
      executionTimeMs
    }
  }
`;

apolloClient.subscribe({ query: subscription }).subscribe({
  next: (data) => {
    const { flowExecuted } = data.data;
    console.log(`Workflow ${flowExecuted.flowName} ${flowExecuted.status}`);
    console.log(`Duration: ${flowExecuted.executionTimeMs}ms`);
  },
  error: (err) => console.error('Subscription error:', err),
  complete: () => console.log('Subscription closed')
});
```

### Multi-Tenant Filtering (Automatic)

You only receive events for your `company_id`. Server-side filtering handles this automatically:

```typescript
// You only get events where payload.flowExecuted.companyId === your_company_id
// No need to manually filter
```

---

## Field-Level Permissions

### Understanding Field Masking

When you query a record, returned `data` field automatically excludes fields where your role lacks `canRead` permission:

```graphql
query {
  entityRecords(entityId: 1) {
    edges {
      data    # Already masked — missing fields you can't read
    }
  }
}
```

**Before masking (server-side):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "ssn": "123-45-6789",      # ← Only accessible if you have canRead
  "email": "john@example.com",
  "salary": 75000             # ← Only accessible if you have canRead
}
```

**After masking (what you receive):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
  # ssn and salary excluded (no read permission)
}
```

### Write Permissions

If you attempt to write to a field where you lack `canWrite`:

```graphql
mutation {
  updateEntityRecord(entityId: 1, recordId: 10, input: {
    data: {
      salary: 100000    # ← You lack canWrite for this field
    }
  }) {
    data
  }
}
```

**Response:**
```json
{
  "errors": [
    {
      "message": "Permission denied: cannot write field 'salary'",
      "extensions": {
        "code": "FORBIDDEN",
        "deniedFields": ["salary"]
      }
    }
  ]
}
```

### Checking Your Permissions

```graphql
query {
  fieldPermissions(roleId: 5) {
    fieldId
    roleId
    canRead
    canWrite
    field {
      id
      name
      label
    }
  }
}
```

---

## Error Handling

### GraphQL Error Codes

All GraphQL errors include an `extensions.code` for client-side error handling:

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHENTICATED` | 401 | Missing/invalid JWT token |
| `FORBIDDEN` | 403 | Authenticated but lacks permission |
| `QUERY_COMPLEXITY_EXCEEDED` | 400 | Query too expensive (dev: >1000, prod: >100) |
| `BAD_REQUEST` | 400 | Invalid input (validation error) |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error |
| `NOT_FOUND` | 404 | Resource doesn't exist |

### Error Response Structure

```json
{
  "errors": [
    {
      "message": "Missing permission: base.entities.read",
      "extensions": {
        "code": "FORBIDDEN",
        "userId": 123,
        "companyId": 1,
        "operation": "entities",
        "timestamp": "2026-05-01T10:30:00Z"
      }
    }
  ]
}
```

### Client Error Handling Example

```javascript
import { ApolloError } from '@apollo/client';

try {
  await client.query({ query });
} catch (err) {
  if (err instanceof ApolloError) {
    const { graphQLErrors, networkError } = err;
    
    if (graphQLErrors.length > 0) {
      const code = graphQLErrors[0].extensions.code;
      
      switch (code) {
        case 'UNAUTHENTICATED':
          redirectToLogin();
          break;
        case 'FORBIDDEN':
          showAlert('You lack permission for this action');
          break;
        case 'QUERY_COMPLEXITY_EXCEEDED':
          showAlert('Query too complex. Use smaller limits.');
          break;
        default:
          showAlert(graphQLErrors[0].message);
      }
    }
  }
}
```

---

## Best Practices

### 1. Always Paginate Large Datasets

**❌ Bad:** Fetches unlimited records

```graphql
query {
  entityRecords(entityId: 1) {  # No pagination — could return 10,000+ records
    edges { id name }
  }
}
```

**✅ Good:** Paginate with reasonable limits

```graphql
query {
  entityRecords(entityId: 1, pagination: { page: 1, limit: 50 }) {
    edges { id name }
    _pagination { total hasNextPage }
  }
}
```

### 2. Request Only Fields You Need

**❌ Bad:** Over-fetches data

```graphql
query {
  entities {
    id name label model status description createdAt updatedAt 
    createdBy { id email ... } # Many unused fields
    fields { ... }              # Nested data
  }
}
```

**✅ Good:** Minimal field selection

```graphql
query {
  entities {
    id name status
  }
}
```

### 3. Use Variables for Dynamic Values

**❌ Bad:** String interpolation (injection risk)

```javascript
const query = `{ entity(id: ${entityId}) { name } }`;
```

**✅ Good:** GraphQL variables

```javascript
const query = gql`
  query GetEntity($id: Int!) {
    entity(id: $id) { name }
  }
`;
client.query({ query, variables: { id: entityId } });
```

### 4. Handle Subscription Cleanup

**❌ Bad:** Memory leak

```javascript
apolloClient.subscribe({ query: SUBSCRIPTION }).subscribe(next);
// No unsubscribe — connection stays open
```

**✅ Good:** Cleanup on unmount

```javascript
useEffect(() => {
  const subscription = apolloClient.subscribe({ query: SUBSCRIPTION })
    .subscribe({ next, error });
  
  return () => subscription.unsubscribe();  // Cleanup
}, []);
```

### 5. Respect Complexity Limits in Production

Development allows complexity up to 1000. Production is limited to 100. Test your queries in prod-like environment:

```bash
ENVIRONMENT=production npm run dev
```

### 6. Cache Query Results Appropriately

DataLoader caches within a single request. For cross-request caching (optional future feature):

```graphql
query GetEntity($id: Int!, $cacheMinutes: Int) {
  entity(id: $id, cacheTtl: $cacheMinutes) {
    id name
  }
}
```

Currently cache TTL is managed server-side. Check [GRAPHQL_ARCHITECTURE.md](GRAPHQL_ARCHITECTURE.md#planned-caching) for future plans.

---

## Client Setup

### Apollo Client (Recommended)

```javascript
import { ApolloClient, InMemoryCache, HttpLink, GraphQLWsLink } from '@apollo/client';
import { split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'http://localhost:3000/api/v2/graphql',
  credentials: 'include',
  headers: {
    authorization: `Bearer ${getStoredJwtToken()}`
  }
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:3000/api/v2/graphql',
    connectionParams: {
      authorization: `Bearer ${getStoredJwtToken()}`
    }
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});
```

### Generate TypeScript Types

Using `@graphql-codegen`:

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript
npx graphql-code-generator init
```

**codegen.yml:**
```yaml
schema: http://localhost:3000/api/v2/graphql
documents: './src/**/*.graphql'
generates:
  ./src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
```

**Usage:**
```typescript
import { useGetEntityQuery } from './generated/graphql';

const { data, loading, error } = useGetEntityQuery({ variables: { id: 1 } });
```

---

## FAQ

**Q: How often are DataLoaders cleared?**  
A: Per-request. Each GraphQL operation gets a fresh DataLoader registry scoped to that request's context.

**Q: Can I paginate backwards?**  
A: Not with offset pagination. Consider cursor-based pagination for production (planned future feature).

**Q: What happens if I exceed complexity limits?**  
A: Query is rejected before execution with `QUERY_COMPLEXITY_EXCEEDED` error.

**Q: How are subscriptions billed?**  
A: Subscriptions are live WebSocket connections. Monitor connections in production (auto-cleanup on disconnect).

**Q: Can I access raw SQL?**  
A: No. The GraphQL layer abstracts all data access through resolvers. Raw SQL access is not exposed.

---

## See Also

- [GRAPHQL_ARCHITECTURE.md](GRAPHQL_ARCHITECTURE.md) — Detailed system architecture
- [ARCHITECTURE.md](ARCHITECTURE.md) — Full system architecture
- Apollo Client Docs: https://www.apollographql.com/docs/react/
- GraphQL Best Practices: https://graphql.org/learn/best-practices/
