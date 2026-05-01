# GraphQL Module Adapters — Implementation Checklist

**Version:** 1.0  
**Status:** Extension to Phase 3  
**Estimated Timeline:** 2-3 weeks (addition to core GraphQL implementation)

---

## Overview

This checklist covers the integration of three high-priority modules into the GraphQL layer using the adapter pattern established in the core GraphQL implementation.

**Modules to integrate:**
- Documents Module
- Messages Module
- Team Module

---

## Phase 3A: Documents Module Integration

### Adapter & Resolver Setup
- [ ] Copy `documents.adapter.ts` to `backend/src/core/graphql/adapters/`
- [ ] Copy `documents.resolver.ts` to `backend/src/core/graphql/resolvers/`
- [ ] Copy `documents.schema.graphql` to `backend/src/core/graphql/schema/`
- [ ] Register DocumentsAdapter in `graphql.module.ts` providers
- [ ] Register DocumentsResolver in `graphql.module.ts` providers
- [ ] Add documents schema to Apollo Server schema definition

### Service Integration
- [ ] Verify DocumentService exists at `backend/src/core/services/document.service.js`
- [ ] Ensure DocumentService has all required methods:
  - [ ] `findById(id, options)`
  - [ ] `find(options)`
  - [ ] `count(options)`
  - [ ] `create(data)`
  - [ ] `update(id, data)`
  - [ ] `delete(id)`
- [ ] Verify Drizzle schema includes `documents` table

### Testing
- [ ] Copy test suite to `backend/src/core/graphql/adapters/__tests__/documents.adapter.spec.ts`
- [ ] Run unit tests: `npm test -- documents.adapter.spec.ts`
- [ ] Achieve 90%+ coverage for adapter
- [ ] Write integration tests with mock DocumentService
- [ ] Test role-based access control:
  - [ ] Admin can view all documents
  - [ ] Manager can create/edit documents
  - [ ] Editor can publish documents
  - [ ] Viewer can only read documents
- [ ] Test tenant isolation:
  - [ ] Users from tenant-1 cannot access tenant-2 documents
  - [ ] Filters automatically scope to tenant
- [ ] Test input validation:
  - [ ] Reject empty title
  - [ ] Reject oversized title (>500 chars)
  - [ ] Reject missing content

### GraphQL Testing
- [ ] Test query: `query { documents(filter: { status: "DRAFT" }) { ... } }`
- [ ] Test mutation: `mutation { createDocument(input: { ... }) { ... } }`
- [ ] Test mutation: `mutation { publishDocument(id: "...") { ... } }`
- [ ] Test mutation: `mutation { deleteDocument(id: "...") }`
- [ ] Test error handling for unauthorized users
- [ ] Test pagination with cursor-based approach

### Documentation
- [ ] Document DocumentsResolver in schema
- [ ] Add documents examples to `graphql-quick-reference.md`:
  - [ ] List documents query
  - [ ] Get single document query
  - [ ] Create document mutation
  - [ ] Update document mutation
  - [ ] Publish document mutation
  - [ ] Delete document mutation
- [ ] Add error handling examples

---

## Phase 3B: Messages Module Integration

### Adapter & Resolver Setup
- [ ] Copy `messages.adapter.ts` to `backend/src/core/graphql/adapters/`
- [ ] Copy `messages.resolver.ts` to `backend/src/core/graphql/resolvers/`
- [ ] Copy `messages.schema.graphql` to `backend/src/core/graphql/schema/`
- [ ] Register MessagesAdapter in `graphql.module.ts` providers
- [ ] Register MessagesResolver in `graphql.module.ts` providers
- [ ] Add messages schema to Apollo Server schema definition

### Service Integration
- [ ] Verify MessageService exists at `backend/src/core/services/message.service.js`
- [ ] Ensure MessageService has all required methods:
  - [ ] `findById(id, options)`
  - [ ] `find(options)`
  - [ ] `count(options)`
  - [ ] `create(data)`
  - [ ] `update(id, data)`
  - [ ] `delete(id)`
- [ ] Verify Drizzle schema includes `messages` table

### Testing
- [ ] Copy test suite to `backend/src/core/graphql/adapters/__tests__/messages.adapter.spec.ts`
- [ ] Run unit tests: `npm test -- messages.adapter.spec.ts`
- [ ] Achieve 90%+ coverage for adapter
- [ ] Test email validation:
  - [ ] Reject invalid email formats
  - [ ] Accept valid emails
- [ ] Test message content validation:
  - [ ] Reject empty messages
  - [ ] Reject oversized messages (>5000 chars)
- [ ] Test status transitions:
  - [ ] NEW → READ
  - [ ] NEW/READ → REPLIED
  - [ ] ANY → ARCHIVED
- [ ] Test reply functionality:
  - [ ] Only admins/managers can reply
  - [ ] Stores repliedAt and repliedById
  - [ ] Updates status to REPLIED

### GraphQL Testing
- [ ] Test query: `query { messages(filter: { status: "NEW" }) { ... } }`
- [ ] Test query: `query { message(id: "...") { ... } }`
- [ ] Test mutation: `mutation { createMessage(input: { ... }) }`
- [ ] Test mutation: `mutation { replyToMessage(id: "...", reply: "...") }`
- [ ] Test mutation: `mutation { updateMessageStatus(id: "...", status: "REPLIED") }`
- [ ] Test mutation: `mutation { deleteMessage(id: "...") }`
- [ ] Test public createMessage endpoint (no auth required)
- [ ] Test protected reply/delete endpoints (auth required)

### Documentation
- [ ] Document MessagesResolver in schema
- [ ] Add messages examples to `graphql-quick-reference.md`:
  - [ ] Create message mutation (public)
  - [ ] List messages query (admin only)
  - [ ] Reply to message mutation
  - [ ] Update message status mutation
  - [ ] Delete message mutation
- [ ] Document message types (CONTACT, INQUIRY, SUPPORT, FEEDBACK, COMPLAINT)
- [ ] Document message statuses (NEW, READ, REPLIED, ARCHIVED)

---

## Phase 3C: Team Module Integration

### Adapter & Resolver Setup
- [ ] Copy `team.adapter.ts` to `backend/src/core/graphql/adapters/`
- [ ] Copy `team.resolver.ts` to `backend/src/core/graphql/resolvers/`
- [ ] Copy `team.schema.graphql` to `backend/src/core/graphql/schema/`
- [ ] Register TeamAdapter in `graphql.module.ts` providers
- [ ] Register TeamResolver in `graphql.module.ts` providers
- [ ] Add team schema to Apollo Server schema definition

### Service Integration
- [ ] Verify TeamService exists at `backend/src/core/services/team.service.js`
- [ ] Ensure TeamService has all required methods:
  - [ ] `findById(id, options)`
  - [ ] `find(options)`
  - [ ] `count(options)`
  - [ ] `create(data)`
  - [ ] `update(id, data)`
  - [ ] `delete(id)`
- [ ] Verify Drizzle schema includes `team_members` table

### Testing
- [ ] Copy test suite to `backend/src/core/graphql/adapters/__tests__/team.adapter.spec.ts`
- [ ] Run unit tests: `npm test -- team.adapter.spec.ts`
- [ ] Achieve 90%+ coverage for adapter
- [ ] Test role validation:
  - [ ] Only valid roles: LEAD, MEMBER, CONTRIBUTOR, VIEWER
  - [ ] Reject invalid roles
- [ ] Test status validation:
  - [ ] Valid statuses: ACTIVE, INACTIVE, PENDING_INVITATION, INVITED
  - [ ] Reject invalid statuses
- [ ] Test member profile:
  - [ ] Store name, email, role, status
  - [ ] Store optional avatar, bio, social links
  - [ ] Social links stored as JSON

### GraphQL Testing
- [ ] Test query: `query { teamMembers(filter: { role: "LEAD" }) { ... } }`
- [ ] Test query: `query { teamMember(id: "...") { ... } }`
- [ ] Test mutation: `mutation { createTeamMember(input: { ... }) }`
- [ ] Test mutation: `mutation { updateTeamMember(id: "...", input: { ... }) }`
- [ ] Test mutation: `mutation { updateTeamMemberRole(id: "...", role: "LEAD") }`
- [ ] Test mutation: `mutation { updateTeamMemberStatus(id: "...", status: "INVITED") }`
- [ ] Test mutation: `mutation { deleteTeamMember(id: "...") }`
- [ ] Test authorization:
  - [ ] Only admin can delete members
  - [ ] Only admin/manager can create/update
  - [ ] Viewers can list but not modify

### Documentation
- [ ] Document TeamResolver in schema
- [ ] Add team examples to `graphql-quick-reference.md`:
  - [ ] List team members query
  - [ ] Get team member query
  - [ ] Create team member mutation
  - [ ] Update team member mutation
  - [ ] Update role/status mutations
  - [ ] Delete team member mutation
- [ ] Document team roles and statuses
- [ ] Document social links format

---

## Cross-Module Integration

### Module Registration
- [ ] All three modules registered in `graphql.module.ts`
- [ ] All three resolvers registered as providers
- [ ] All three adapters registered as providers
- [ ] All three schemas loaded in Apollo configuration

### Schema Validation
- [ ] GraphQL schema builds without errors: `npm run graphql:build`
- [ ] Type validation passes: `npm run graphql:validate`
- [ ] No schema conflicts or duplicate types

### Tenant Isolation Verification
- [ ] All three modules enforce tenant boundaries:
  - [ ] User from tenant-1 cannot access tenant-2 data
  - [ ] Queries automatically filtered by tenantId
  - [ ] Mutations validate tenant ownership
- [ ] Adapter's `ensureTenantOwnership()` called in all operations

### Authorization Testing
- [ ] All three modules check roles/permissions:
  - [ ] Admin role: full access
  - [ ] Manager role: CRUD access
  - [ ] Editor/Contributor role: create/edit access
  - [ ] Viewer role: read-only access
- [ ] Unauthenticated users get UNAUTHENTICATED errors
- [ ] Unauthorized users get FORBIDDEN errors

### Audit Logging
- [ ] All mutations logged to audit trail:
  - [ ] CREATE operations logged
  - [ ] UPDATE operations logged
  - [ ] DELETE operations logged
  - [ ] PUBLISH/STATUS operations logged
- [ ] Logs include:
  - [ ] Operation type
  - [ ] Resource ID
  - [ ] User ID
  - [ ] Timestamp
  - [ ] Tenant ID

---

## Testing & Quality

### Unit Test Coverage
- [ ] Documents adapter: 90%+ coverage
- [ ] Messages adapter: 90%+ coverage
- [ ] Team adapter: 90%+ coverage
- [ ] All tests passing: `npm test -- --testPathPattern="adapter"`

### Integration Tests
- [ ] Test all three modules together
- [ ] Test cross-module relationships (e.g., team member creating document)
- [ ] Test shared utility functions (pagination, filtering, sorting)
- [ ] Performance test: list operations return <100ms for 1000 items

### E2E Tests
- [ ] Test complete workflows:
  - [ ] Create document → Publish → Delete
  - [ ] Create message → Reply → Archive
  - [ ] Create team member → Update role → Deactivate
- [ ] Test error scenarios:
  - [ ] Invalid input → proper error response
  - [ ] Unauthorized access → proper error response
  - [ ] Service failure → graceful degradation

### Code Review
- [ ] All three adapters reviewed for:
  - [ ] Proper error handling
  - [ ] Tenant isolation enforcement
  - [ ] Input validation
  - [ ] Code style consistency
- [ ] All three resolvers reviewed for:
  - [ ] Authorization checks
  - [ ] Audit logging
  - [ ] Error handling
  - [ ] Query/mutation signatures

---

## Documentation

### API Documentation
- [ ] `graphql-quick-reference.md` updated with:
  - [ ] Documents queries and mutations
  - [ ] Messages queries and mutations
  - [ ] Team queries and mutations
  - [ ] All operations with working examples
  - [ ] Error response examples

### Integration Guide
- [ ] Update `graphql-integration-with-modules.md`:
  - [ ] Add Documents adapter pattern (if not covered)
  - [ ] Add Messages adapter pattern (if not covered)
  - [ ] Add Team adapter pattern (if not covered)
  - [ ] Show how patterns extend to other modules

### Implementation Checklist
- [ ] This checklist marked complete
- [ ] Findings documented for next phase
- [ ] Lessons learned documented

---

## Deployment

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Performance baselines met

### Deployment Steps
- [ ] Deploy to staging environment
- [ ] Run full test suite on staging
- [ ] Verify schemas load correctly
- [ ] Verify adapters connect to services
- [ ] Run smoke tests for all three modules
- [ ] Monitor for errors in logs
- [ ] Deploy to production (blue-green)
- [ ] Monitor error rates and latency
- [ ] Keep rollback ready for 24 hours

### Post-Deployment
- [ ] All GraphQL operations working
- [ ] No error spikes
- [ ] Performance metrics normal
- [ ] Tenant isolation verified
- [ ] Authorization working correctly

---

## Success Criteria

### Functionality
- ✅ All three modules accessible via GraphQL
- ✅ All CRUD operations working
- ✅ Pagination working correctly
- ✅ Filtering working for all modules
- ✅ Sorting working for all modules
- ✅ Error responses formatted correctly

### Quality
- ✅ 90%+ test coverage for adapters
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ Code review approved
- ✅ Documentation complete

### Performance
- ✅ List operations: <100ms for 1000 items
- ✅ Single item fetch: <50ms
- ✅ Create operation: <200ms
- ✅ Update operation: <200ms
- ✅ Delete operation: <150ms

### Security
- ✅ Tenant isolation verified
- ✅ Authorization enforced
- ✅ Input validation working
- ✅ Audit logging working
- ✅ Error messages don't leak sensitive info

---

## Sign-Off

When all items above are complete:

- [ ] Developer: _____________________ Date: _______
- [ ] QA Lead: _____________________ Date: _______
- [ ] Tech Lead: _____________________ Date: _______

**Deployment Date:** ________________

**Notes:**


---

**Version:** 1.0  
**Status:** Ready for Implementation  
**Last Updated:** May 2026
