# GraphQL Module Adapters — Index & Reference

**Version:** 1.0  
**Status:** Production-Ready  
**Last Updated:** May 2026

---

## Overview

This document provides a master index and reference guide for GraphQL module adapters — the pattern used to integrate existing Lume modules into the GraphQL layer without requiring module refactoring.

**Key Principle**: GraphQL adapters act as a **facade** over existing REST services, translating between REST data models and GraphQL schemas.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│          GraphQL Layer (Core)                   │
│  ┌─────────────────────────────────────────┐   │
│  │  Resolvers (Query/Mutation/Subscription)│   │
│  │  - documentsResolver                    │   │
│  │  - messagesResolver                     │   │
│  │  - teamResolver                         │   │
│  └────────────┬────────────────────────────┘   │
└───────────────┼──────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│          Adapter Layer (Translation)             │
│  ┌─────────────────────────────────────────┐   │
│  │  DocumentsAdapter ─┐                    │   │
│  │  MessagesAdapter  ├─ Transform          │   │
│  │  TeamAdapter      ─┤ Tenant/Auth        │   │
│  │  BaseModuleAdapter┘ Error Handling      │   │
│  └────────────┬────────────────────────────┘   │
└───────────────┼──────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│        Service Layer (Existing)                  │
│  ┌─────────────────────────────────────────┐   │
│  │  DocumentService (Drizzle)              │   │
│  │  MessageService (Drizzle)               │   │
│  │  TeamService (Drizzle)                  │   │
│  └────────────┬────────────────────────────┘   │
└───────────────┼──────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│        Database Layer                           │
│  ┌─────────────────────────────────────────┐   │
│  │  MySQL (Tenant-scoped data)             │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Module Adapters Implemented

### Phase 3A: Documents Module

**Purpose**: Manage document creation, editing, publishing, and organization

**Files**:
- Adapter: `backend/src/core/graphql/adapters/documents.adapter.ts`
- Resolver: `backend/src/core/graphql/resolvers/documents.resolver.ts`
- Schema: `backend/src/core/graphql/schema/documents.schema.graphql`

**Key Features**:
- CRUD operations (Create, Read, Update, Delete)
- Publish workflow (Draft → Published)
- Categorization via categoryId
- Tags for organization
- Full-text search
- Status filtering (DRAFT, PUBLISHED, ARCHIVED, REVIEW)

**GraphQL Operations**:
```graphql
query {
  documents(filter: { status: DRAFT }, page: 1, limit: 10) {
    edges { node { id title status createdAt } }
    pageInfo { totalCount hasNextPage }
  }
}

mutation {
  createDocument(input: { title: "..." content: "..." }) {
    id status createdAt
  }
}

mutation {
  publishDocument(id: "doc-1") {
    id status publishedAt
  }
}
```

**Access Control**:
- Admin: View all, create, edit, delete
- Manager: Create, edit
- Editor: Create, edit, publish
- Viewer: Read-only

---

### Phase 3B: Messages Module

**Purpose**: Handle contact form messages, inquiries, and support requests

**Files**:
- Adapter: `backend/src/core/graphql/adapters/messages.adapter.ts`
- Resolver: `backend/src/core/graphql/resolvers/messages.resolver.ts`
- Schema: `backend/src/core/graphql/schema/messages.schema.graphql`

**Key Features**:
- Public message creation (no auth)
- Message types (CONTACT, INQUIRY, SUPPORT, FEEDBACK, COMPLAINT)
- Status tracking (NEW, READ, REPLIED, ARCHIVED)
- Reply system for support workflows
- Email/name/phone capture
- IP address logging
- Metadata storage

**GraphQL Operations**:
```graphql
# Public endpoint - no auth required
mutation {
  createMessage(input: {
    email: "user@example.com"
    name: "John"
    subject: "Support"
    message: "Help needed..."
    type: SUPPORT
  }) {
    id status createdAt
  }
}

# Admin only
mutation {
  replyToMessage(id: "msg-1", reply: "We're here to help...") {
    id status repliedAt repliedById
  }
}
```

**Access Control**:
- Public: Create messages only
- Admin: View all, reply, delete
- Manager: View, reply

---

### Phase 3C: Team Module

**Purpose**: Manage team members, roles, and organizational structure

**Files**:
- Adapter: `backend/src/core/graphql/adapters/team.adapter.ts`
- Resolver: `backend/src/core/graphql/resolvers/team.resolver.ts`
- Schema: `backend/src/core/graphql/schema/team.schema.graphql`

**Key Features**:
- Team member profiles (name, email, role, status)
- Role management (LEAD, MEMBER, CONTRIBUTOR, VIEWER)
- Status tracking (ACTIVE, INACTIVE, PENDING_INVITATION, INVITED)
- Avatar and bio support
- Social media links (LinkedIn, Twitter, etc.)
- Member search and filtering

**GraphQL Operations**:
```graphql
query {
  teamMembers(filter: { role: LEAD }, page: 1, limit: 10) {
    edges {
      node {
        id name email role status avatar bio
      }
    }
    pageInfo { totalCount }
  }
}

mutation {
  createTeamMember(input: {
    name: "Jane Doe"
    email: "jane@example.com"
    role: MEMBER
  }) {
    id name email role
  }
}

mutation {
  updateTeamMemberRole(id: "member-1", role: LEAD) {
    id name role
  }
}
```

**Access Control**:
- Admin: Full access (CRUD + role changes)
- Manager: Create, view, update (not delete)
- Viewer: List and view only

---

## Adapter Pattern Details

### BaseModuleAdapter Structure

All module adapters extend `BaseModuleAdapter`, which provides:

```typescript
abstract class BaseModuleAdapter {
  // Core methods that adapters must implement
  protected abstract transformToGraphQL(data: any): any;
  protected abstract transformFromGraphQL(input: any, context: AdapterContext): any;
  
  // Shared utilities
  protected ensureTenantOwnership(resource: any, context: AdapterContext): void;
  protected handleServiceError(error: any, operation: string): void;
}
```

### Adapter Responsibilities

1. **Data Transformation**:
   - Convert service response → GraphQL type
   - Convert GraphQL input → service data format
   - Handle field mapping and type conversion

2. **Tenant Isolation**:
   - Verify request belongs to user's tenant
   - Filter queries by tenantId
   - Prevent cross-tenant data access

3. **Error Handling**:
   - Catch service errors
   - Format as GraphQL errors
   - Avoid leaking sensitive information

4. **Authorization**:
   - Work with resolver-level auth checks
   - Enforce field-level policies
   - Support role-based access

### Example Adapter Implementation

```typescript
@Injectable()
export class DocumentsAdapter extends BaseModuleAdapter {
  constructor(private documentService: DocumentService) {
    super('documents');
  }

  async getDocument(id: string, context: AdapterContext) {
    try {
      // 1. Enforce tenant ownership
      this.ensureTenantOwnership({ tenantId: context.tenantId }, context);
      
      // 2. Query service with tenant filter
      const document = await this.documentService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      // 3. Check existence
      if (!document) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // 4. Transform and return
      return this.transformToGraphQL(document);
    } catch (error) {
      // 5. Handle errors
      this.handleServiceError(error, 'getDocument');
    }
  }

  protected transformToGraphQL(data: any): any {
    // Map service model → GraphQL type
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      status: data.status,
      // ... more fields
    };
  }

  protected transformFromGraphQL(input: DocumentsGqlInput, context: AdapterContext): any {
    // Map GraphQL input → service data
    return {
      title: input.title,
      content: input.content,
      status: input.status || 'DRAFT',
      // ... more fields
    };
  }
}
```

---

## Resolver Pattern

All module resolvers follow a consistent pattern:

```typescript
@Resolver('Document')
@UseGuards(AuthGuard)
export class DocumentsResolver {
  constructor(
    private adapter: DocumentsAdapter,
    private graphqlService: GraphQLService,
  ) {}

  @Query('document')
  async getDocument(@Args('id') id: string, @Context() context: any): Promise<Document> {
    // 1. Log operation
    this.graphqlService.logOperation('getDocument', { id }, context);

    // 2. Check authorization
    if (!this.graphqlService.hasRole(['admin', 'manager', 'viewer'], context)) {
      throw new GraphQLError('Insufficient permissions', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // 3. Call adapter
    return this.adapter.getDocument(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('createDocument')
  async createDocument(@Args('input') input: DocumentsGqlInput, @Context() context: any) {
    // 1. Log operation
    this.graphqlService.logOperation('createDocument', { input }, context);
    
    // 2. Audit log (for mutations)
    this.graphqlService.createAuditLog('CREATE', 'documents', 'N/A', input, context);

    // 3. Check authorization (stricter for mutations)
    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // 4. Call adapter
    return this.adapter.createDocument(input, { /* context */ });
  }
}
```

---

## Testing Strategy

### Three-Layer Testing

| Layer | Focus | Tools |
|-------|-------|-------|
| **Unit (Adapter)** | Data transformation, validation, error handling | Jest, mocked service |
| **Integration (Resolver)** | Authorization, audit logging, error responses | Jest, mocked adapter |
| **E2E (GraphQL)** | Full workflows, cross-module interactions | Supertest, real DB |

### Test Structure

```
adapter/
├── documents.adapter.ts
├── __tests__/
│   └── documents.adapter.spec.ts (90%+ coverage)
└── documents.resolver.ts

resolver/
├── documents.resolver.ts
├── __tests__/
│   └── documents.resolver.spec.ts (80%+ coverage)
```

### Coverage Targets

- **Adapters**: 90%+ (method coverage)
- **Resolvers**: 80%+ (happy path + errors)
- **Services**: 85%+ (unit tested separately)
- **Overall**: 85%+

---

## Integration Checklist

### Quick Start (Per Module)

```bash
# 1. Copy files
cp backend/src/core/graphql/adapters/documents.adapter.ts \
   backend/src/core/graphql/adapters/

# 2. Register in module
# Edit backend/src/core/graphql/graphql.module.ts
# Add: DocumentsAdapter to providers
# Add: DocumentsResolver to providers

# 3. Register schema
# Add documents.schema.graphql to Apollo config

# 4. Run tests
npm test -- documents.adapter.spec.ts
npm test -- documents.resolver.spec.ts

# 5. Test GraphQL
npm run graphql:validate
npm run dev  # Start server and test in Apollo Studio
```

### Detailed Checklist

See `GRAPHQL_MODULE_ADAPTERS_CHECKLIST.md` for complete checklist covering:
- Adapter & resolver setup
- Service integration
- Testing (unit, integration, E2E)
- Documentation
- Deployment

---

## Files Reference

### Adapters (Translation Layer)

| Module | Adapter File | Service Interface | Database Table |
|--------|--------------|-------------------|-----------------|
| Documents | `documents.adapter.ts` | DocumentService | documents |
| Messages | `messages.adapter.ts` | MessageService | messages |
| Team | `team.adapter.ts` | TeamService | team_members |

**Common Methods**:
- `getX(id, context)` — Fetch single item
- `listX(filter, pagination, context)` — List with filtering
- `createX(input, context)` — Create new item
- `updateX(id, input, context)` — Update existing item
- `deleteX(id, context)` — Delete item
- `statusX(id, status, context)` — Update status (if applicable)

### Resolvers (API Endpoints)

| Module | Resolver File | Queries | Mutations |
|--------|---------------|---------|-----------|
| Documents | `documents.resolver.ts` | document, documents | createDocument, updateDocument, publishDocument, deleteDocument |
| Messages | `messages.resolver.ts` | message, messages | createMessage, replyToMessage, updateMessageStatus, deleteMessage |
| Team | `team.resolver.ts` | teamMember, teamMembers | createTeamMember, updateTeamMember, updateTeamMemberRole, updateTeamMemberStatus, deleteTeamMember |

### Schemas (GraphQL Definitions)

| Module | Schema File | Root Types | Enums | Inputs |
|--------|-------------|-----------|-------|--------|
| Documents | `documents.schema.graphql` | Document, DocumentConnection | DocumentStatus | DocumentInput, DocumentFilter |
| Messages | `messages.schema.graphql` | Message, MessageConnection | MessageType, MessageStatus | MessageInput, MessageFilter |
| Team | `team.schema.graphql` | TeamMember, TeamMemberConnection | TeamRole, TeamMemberStatus | TeamMemberInput, TeamMemberFilter |

---

## Quick Reference: Common Operations

### List with Pagination

```graphql
query {
  documents(
    filter: { status: DRAFT }
    page: 1
    limit: 10
  ) {
    edges {
      node { id title status }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
}
```

### Create with Validation

```graphql
mutation {
  createDocument(
    input: {
      title: "New Document"
      content: "..."
      status: "DRAFT"
    }
  ) {
    id
    status
    createdAt
    createdById
  }
}
```

### Update Status

```graphql
mutation {
  publishDocument(id: "doc-1") {
    id
    status
    publishedAt
  }
}
```

### Error Handling

```graphql
# Invalid input
{
  "errors": [
    {
      "message": "Document title is required",
      "extensions": { "code": "INVALID_INPUT" }
    }
  ]
}

# Unauthorized
{
  "errors": [
    {
      "message": "Insufficient permissions to view documents",
      "extensions": { "code": "FORBIDDEN" }
    }
  ]
}

# Not found
{
  "errors": [
    {
      "message": "Document not found",
      "extensions": { "code": "NOT_FOUND" }
    }
  ]
}
```

---

## Implementation Roadmap

### Week 1-2: Documents Module
- [ ] Copy adapter, resolver, schema
- [ ] Register in GraphQL module
- [ ] Write and pass tests
- [ ] Document in quick reference
- [ ] Deploy to staging

### Week 2-3: Messages Module
- [ ] Repeat process for Messages
- [ ] Special focus: public createMessage endpoint
- [ ] Test auth bypass for create (no-auth)

### Week 3: Team Module
- [ ] Repeat process for Team
- [ ] Focus on role management mutations
- [ ] Test role-based CRUD

### Week 3-4: Cross-Module Testing
- [ ] Integration tests across all three
- [ ] Performance benchmarks
- [ ] Tenant isolation verification
- [ ] Authorization matrix testing

### Week 4+: Additional Modules
- [ ] Apply pattern to remaining modules
- [ ] Documents (phase 2)
- [ ] Donations
- [ ] Editor
- [ ] Website

---

## Best Practices

### Data Transformation

```typescript
// ✅ Good: Explicit field mapping
protected transformToGraphQL(data: any): any {
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    // ... all fields mapped explicitly
  };
}

// ❌ Bad: Spreading without mapping
protected transformToGraphQL(data: any): any {
  return { ...data }; // Exposes internal fields
}
```

### Tenant Isolation

```typescript
// ✅ Good: Multiple levels of protection
const document = await this.service.findById(id, {
  where: { tenantId: context.tenantId }, // Filter in query
});
this.ensureTenantOwnership(document, context); // Verify result

// ❌ Bad: Only client-side filtering
const document = await this.service.findById(id);
if (document.tenantId !== context.tenantId) { // Too late!
  throw error;
}
```

### Error Handling

```typescript
// ✅ Good: Structured errors
throw new GraphQLError('Document not found', {
  extensions: { code: 'NOT_FOUND' },
});

// ❌ Bad: Unstructured errors
throw new Error('Cannot find resource');
```

### Authorization

```typescript
// ✅ Good: Resolver-level auth
@Query('documents')
async listDocuments(@Context() context: any) {
  if (!this.graphqlService.hasRole(['admin', 'viewer'], context)) {
    throw new GraphQLError('Unauthorized');
  }
  return this.adapter.listDocuments(...);
}

// ❌ Bad: Adapter-level auth only (incomplete)
// Authorization should happen in resolver, not adapter
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Module is undefined" | Adapter not registered | Register in graphql.module.ts providers |
| "Cannot read property 'tenantId'" | Context missing | Ensure context injected from resolver |
| "GraphQL error: unknown type" | Schema not loaded | Add schema to Apollo configuration |
| "Tenant isolation violated" | Missing filter in query | Add tenantId where clause in service call |
| "Tests failing" | Service mock incomplete | Mock all service methods used by adapter |

---

## Documentation Files

| Document | Purpose |
|----------|---------|
| `graphql-integration-with-modules.md` | Overall integration strategy & patterns |
| `GRAPHQL_MODULE_ADAPTERS_INDEX.md` | This file - reference guide |
| `graphql-module-adapters-testing.md` | Detailed testing guide |
| `GRAPHQL_MODULE_ADAPTERS_CHECKLIST.md` | Phase-by-phase implementation checklist |
| `graphql-quick-reference.md` | API examples for all operations |

---

## Contact & Support

### Questions?

- **Architecture**: See `graphql-integration-with-modules.md`
- **Implementation**: See `GRAPHQL_MODULE_ADAPTERS_CHECKLIST.md`
- **Testing**: See `graphql-module-adapters-testing.md`
- **API Usage**: See `graphql-quick-reference.md`

---

**Version:** 1.0  
**Status:** Complete  
**Last Updated:** May 2026  
**Maintained by:** GraphQL Team
