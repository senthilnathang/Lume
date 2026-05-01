# GraphQL Integration with Existing Lume Modules

**Version:** 1.0  
**Status:** Integration Architecture  
**Last Updated:** May 2026

## Table of Contents

1. [Integration Strategy](#integration-strategy)
2. [Architecture Overview](#architecture-overview)
3. [Adapter Pattern](#adapter-pattern)
4. [Module-by-Module Integration](#module-by-module-integration)
5. [REST to GraphQL Mapping](#rest-to-graphql-mapping)
6. [Migration Path](#migration-path)
7. [Backward Compatibility](#backward-compatibility)

---

## Integration Strategy

### Vision

Gradually expose Lume's 22+ existing modules through GraphQL while maintaining backward compatibility with existing REST APIs. The GraphQL layer acts as a modern facade over existing module services.

### Principles

1. **Non-Invasive** — Don't modify existing module code
2. **Gradual** — Migrate modules one at a time
3. **Compatible** — REST and GraphQL coexist
4. **Consistent** — Unified GraphQL API across all modules
5. **Delegating** — GraphQL resolvers delegate to existing services

---

## Architecture Overview

### Integration Layers

```
┌─────────────────────────────────────────────────┐
│          GraphQL API Layer (New)                │
│  ┌─────────────────────────────────────────┐  │
│  │ GraphQL Resolvers                       │  │
│  │ (Query, Mutation, Subscription)         │  │
│  └────────────┬────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│ Module Adapters  │  │ Module Adapters  │
│ (Transform Data) │  │ (Transform Data) │
└────────┬─────────┘  └────────┬─────────┘
         │                    │
    ┌────┴────────────────────┴─────┐
    ▼                               ▼
┌──────────────────┐    ┌──────────────────┐
│ Existing Module  │    │ Existing Module  │
│ Services         │    │ Services         │
│ (REST APIs)      │    │ (REST APIs)      │
└──────────────────┘    └──────────────────┘
         │                    │
         └────────┬───────────┘
                  ▼
            MySQL Database
```

### Integration Points

**For Each Existing Module:**

1. **Identify Module Service** — Find existing `*.service.ts`
2. **Create Adapter** — New adapter wraps the service
3. **Define GraphQL Schema** — Types + queries + mutations
4. **Create Resolver** — Delegates to adapter
5. **Add Tests** — Unit + integration tests
6. **Document Migration** — How REST maps to GraphQL

---

## Adapter Pattern

### Why Adapters?

Adapters provide a translation layer between:
- **GraphQL's input/output types** → **REST service's types**
- **GraphQL's operation semantics** → **Module service's methods**
- **GraphQL context (tenantId, userId)** → **Module service parameters**

### Base Adapter Structure

```typescript
// core/graphql/adapters/base-module.adapter.ts
import { Injectable } from '@nestjs/common';
import logger from '../../services/logger';

export interface AdapterContext {
  userId: string;
  tenantId: string;
  userRoles: string[];
}

@Injectable()
export abstract class BaseModuleAdapter {
  protected readonly logger = logger;

  /**
   * Transform module service data to GraphQL type
   */
  protected transformToGraphQL(data: any): any {
    throw new Error('transformToGraphQL must be implemented');
  }

  /**
   * Transform GraphQL input to module service format
   */
  protected transformFromGraphQL(input: any): any {
    throw new Error('transformFromGraphQL must be implemented');
  }

  /**
   * Enforce tenant isolation
   */
  protected ensureTenantOwnership(resource: any, context: AdapterContext) {
    if (resource.tenantId !== context.tenantId) {
      throw new Error('Access denied: Resource belongs to different tenant');
    }
  }

  /**
   * Handle errors from module service
   */
  protected handleServiceError(error: any, operation: string) {
    this.logger.error(`Module service error during ${operation}`, error);

    if (error.message.includes('not found')) {
      throw new Error(`Resource not found`);
    }
    if (error.message.includes('validation')) {
      throw new Error(`Validation error: ${error.message}`);
    }

    throw new Error(`Failed to ${operation}: ${error.message}`);
  }
}
```

### Adapter Implementation Example

```typescript
// core/graphql/adapters/activity.adapter.ts
import { Injectable } from '@nestjs/common';
import { BaseModuleAdapter, AdapterContext } from './base-module.adapter';
import { ActivitiesService } from '../../modules/activities/activities.service';

@Injectable()
export class ActivityAdapter extends BaseModuleAdapter {
  constructor(private activitiesService: ActivitiesService) {
    super();
  }

  /**
   * Get activity by ID
   */
  async getActivity(id: string, context: AdapterContext) {
    try {
      const activity = await this.activitiesService.getActivity(id);
      
      // Enforce tenant isolation
      this.ensureTenantOwnership(activity, context);
      
      // Transform to GraphQL format
      return this.transformToGraphQL(activity);
    } catch (error) {
      this.handleServiceError(error, 'fetch activity');
    }
  }

  /**
   * List activities with filtering and pagination
   */
  async listActivities(
    context: AdapterContext,
    filters: any,
    pagination: any,
  ) {
    try {
      const { page = 1, pageSize = 20 } = pagination;

      // Call existing module service
      const result = await this.activitiesService.list({
        tenantId: context.tenantId,
        ...filters,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Transform to GraphQL format
      return {
        edges: result.data.map(item => ({
          node: this.transformToGraphQL(item),
          cursor: Buffer.from(item.id).toString('base64'),
        })),
        pageInfo: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
          hasNextPage: page * pageSize < result.total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      this.handleServiceError(error, 'list activities');
    }
  }

  /**
   * Create new activity
   */
  async createActivity(input: any, context: AdapterContext) {
    try {
      const data = this.transformFromGraphQL(input);

      const activity = await this.activitiesService.create({
        ...data,
        tenantId: context.tenantId,
        createdById: context.userId,
      });

      return this.transformToGraphQL(activity);
    } catch (error) {
      this.handleServiceError(error, 'create activity');
    }
  }

  /**
   * Transform REST/service format to GraphQL format
   */
  protected transformToGraphQL(activity: any) {
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      slug: activity.slug,
      category: activity.category,
      status: activity.status,
      startDate: activity.startDate,
      endDate: activity.endDate,
      capacity: activity.capacity,
      isFeatured: activity.isFeatured,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  }

  /**
   * Transform GraphQL input to REST/service format
   */
  protected transformFromGraphQL(input: any) {
    return {
      title: input.title,
      description: input.description,
      category: input.category,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      capacity: input.capacity,
      isFeatured: input.isFeatured,
    };
  }
}
```

---

## Module-by-Module Integration

### Existing Modules & Integration Status

| Module | Type | GraphQL Status | Priority |
|--------|------|---|---|
| **activities** | Content | Planned | HIGH |
| **documents** | Content | Planned | HIGH |
| **messages** | Communication | Planned | HIGH |
| **media** | Assets | Planned | MEDIUM |
| **donations** | Financial | Planned | MEDIUM |
| **editor** | Content Builder | Planned | MEDIUM |
| **team** | Personnel | Planned | MEDIUM |
| **base_rbac** | Core | Planned | HIGH |
| **base_security** | Core | Planned | HIGH |
| **base_automation** | Workflow | Planned | LOW |
| **audit** | Core | Planned | MEDIUM |

### High-Priority Modules (Start Here)

#### 1. Activities Module

**Existing Service:**
- Location: `src/modules/activities/`
- Service: `ActivitiesService`
- REST Endpoints: `GET /api/activities`, `POST /api/activities`, etc.

**GraphQL Integration:**

```graphql
# activities.schema.graphql
type Activity implements TenantScoped {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  slug: String!
  category: String!
  status: ActivityStatus!
  startDate: DateTime!
  endDate: DateTime!
  capacity: Int!
  isFeatured: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ActivityStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
  CANCELLED
}

type ActivityConnection {
  edges: [ActivityEdge!]!
  pageInfo: PageInfo!
}

type ActivityEdge {
  node: Activity!
  cursor: String!
}

input ActivityInput {
  title: String!
  description: String
  category: String!
  status: ActivityStatus!
  startDate: DateTime!
  endDate: DateTime!
  capacity: Int!
  isFeatured: Boolean!
}

extend type Query {
  activity(id: ID!): Activity @auth(roles: ["user"])
  activities(input: PaginationInput): ActivityConnection! @auth(roles: ["user"])
  activitiesByCategory(category: String!, input: PaginationInput): [Activity!]!
}

extend type Mutation {
  createActivity(input: ActivityInput!): Activity! @auth(roles: ["admin"]) @policy(resource: "activities", action: "create")
  updateActivity(id: ID!, input: ActivityInput!): Activity! @auth(roles: ["admin"]) @policy(resource: "activities", action: "update")
  deleteActivity(id: ID!): Boolean! @auth(roles: ["admin"]) @policy(resource: "activities", action: "delete")
}
```

**Adapter Implementation:**

```typescript
// core/graphql/adapters/activity.adapter.ts
@Injectable()
export class ActivityAdapter extends BaseModuleAdapter {
  constructor(private activitiesService: ActivitiesService) {
    super();
  }

  async getActivity(id: string, context: AdapterContext) {
    // Implementation shown above
  }

  async listActivities(context: AdapterContext, filters: any, pagination: any) {
    // Implementation shown above
  }

  async createActivity(input: any, context: AdapterContext) {
    // Implementation shown above
  }

  async updateActivity(id: string, input: any, context: AdapterContext) {
    try {
      const activity = await this.activitiesService.getActivity(id);
      this.ensureTenantOwnership(activity, context);

      const updateData = this.transformFromGraphQL(input);
      const updated = await this.activitiesService.update(id, updateData);

      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'update activity');
    }
  }

  async deleteActivity(id: string, context: AdapterContext): Promise<boolean> {
    try {
      const activity = await this.activitiesService.getActivity(id);
      this.ensureTenantOwnership(activity, context);

      await this.activitiesService.delete(id);
      return true;
    } catch (error) {
      this.handleServiceError(error, 'delete activity');
    }
  }
}
```

**Resolver Implementation:**

```typescript
// core/graphql/resolvers/activity.resolver.ts
@Resolver('Activity')
export class ActivityResolver {
  constructor(
    private activityAdapter: ActivityAdapter,
    private graphqlService: GraphQLService,
  ) {}

  @Query('activity')
  async getActivity(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('activity', 'query', context, { id });
    return this.activityAdapter.getActivity(id, context);
  }

  @Query('activities')
  async listActivities(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('activities', 'query', context, input);
    return this.activityAdapter.listActivities(context, {}, input);
  }

  @Mutation('createActivity')
  async createActivity(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('createActivity', 'mutation', context, input);
    const activity = await this.activityAdapter.createActivity(input, context);
    await this.graphqlService.createAuditLog(
      context.userId,
      'CREATE',
      'activity',
      activity.id,
      { input },
    );
    return activity;
  }

  @Mutation('updateActivity')
  async updateActivity(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('updateActivity', 'mutation', context, { id, input });
    const activity = await this.activityAdapter.updateActivity(id, input, context);
    await this.graphqlService.createAuditLog(
      context.userId,
      'UPDATE',
      'activity',
      id,
      { input },
    );
    return activity;
  }

  @Mutation('deleteActivity')
  async deleteActivity(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    this.graphqlService.logOperation('deleteActivity', 'mutation', context, { id });
    const deleted = await this.activityAdapter.deleteActivity(id, context);
    await this.graphqlService.createAuditLog(
      context.userId,
      'DELETE',
      'activity',
      id,
      {},
    );
    return deleted;
  }
}
```

#### 2. Documents Module

**Similar pattern:**
- Service: `DocumentsService`
- Schema: `documents.schema.graphql`
- Adapter: `DocumentAdapter`
- Resolver: `DocumentResolver`

#### 3. Messages Module

**Similar pattern:**
- Service: `MessagesService`
- Schema: `messages.schema.graphql`
- Adapter: `MessageAdapter`
- Resolver: `MessageResolver`

---

## REST to GraphQL Mapping

### Mapping Patterns

#### REST GET → GraphQL Query

```
REST:     GET /api/activities
GraphQL:  query { activities(input: { page: 1, pageSize: 20 }) { edges { node { id title } } } }

REST:     GET /api/activities/:id
GraphQL:  query { activity(id: "123") { id title description } }

REST:     GET /api/activities?status=published&category=health
GraphQL:  query { activities(input: { filter: "published" }) { edges { node { id } } } }
```

#### REST POST → GraphQL Mutation

```
REST:     POST /api/activities
          { "title": "...", "description": "..." }
GraphQL:  mutation { createActivity(input: { title: "...", description: "..." }) { id } }

REST:     POST /api/activities/:id
          { "title": "..." }
GraphQL:  mutation { updateActivity(id: "123", input: { title: "..." }) { id } }

REST:     DELETE /api/activities/:id
GraphQL:  mutation { deleteActivity(id: "123") }
```

#### REST Bulk Operations → GraphQL Mutations

```
REST:     POST /api/activities/bulk-delete
          { "ids": ["1", "2", "3"] }
GraphQL:  mutation { bulkDeleteActivities(ids: ["1", "2", "3"]) }

REST:     POST /api/activities/bulk-update
          { "updates": [...] }
GraphQL:  mutation { bulkUpdateActivities(items: [...]) { updatedCount failedCount } }
```

### Complete REST ↔ GraphQL Mapping Table

| Operation | REST | GraphQL |
|-----------|------|---------|
| List all | `GET /api/resources` | `query { resources(input: {...}) }` |
| Get one | `GET /api/resources/:id` | `query { resource(id: "...") }` |
| Search | `GET /api/resources?search=...` | `query { resources(input: { filter: "..." }) }` |
| Create | `POST /api/resources` | `mutation { createResource(input: {...}) }` |
| Update | `PUT /api/resources/:id` | `mutation { updateResource(id: "...", input: {...}) }` |
| Delete | `DELETE /api/resources/:id` | `mutation { deleteResource(id: "...") }` |
| Bulk delete | `POST /api/resources/bulk-delete` | `mutation { bulkDeleteResources(ids: [...]) }` |
| Bulk update | `POST /api/resources/bulk-update` | `mutation { bulkUpdateResources(items: [...]) }` |

---

## Migration Path

### Phase-Based Rollout

#### Phase 1: Foundation (Week 1-2)
- [ ] Set up base adapter infrastructure
- [ ] Create ActivityAdapter + GraphQL schema
- [ ] Write tests for activity integration
- [ ] Deploy to staging
- [ ] REST API still primary, GraphQL available

#### Phase 2: Core Modules (Week 3-4)
- [ ] Add DocumentAdapter + schema
- [ ] Add MessageAdapter + schema
- [ ] Add TeamAdapter + schema
- [ ] All on staging, can test side-by-side

#### Phase 3: Feature Modules (Week 5-6)
- [ ] Add MediaAdapter + schema
- [ ] Add DonationAdapter + schema
- [ ] Add EditorAdapter + schema
- [ ] Comprehensive testing

#### Phase 4: Production (Week 7-8)
- [ ] Gradual rollout (5% → 25% → 50% → 100%)
- [ ] Monitor metrics
- [ ] REST API remains as fallback
- [ ] Migrate frontend gradually

#### Phase 5: Stabilization (Week 9+)
- [ ] Monitor for issues
- [ ] Optimize hot paths
- [ ] Deprecate REST endpoints (if desired)
- [ ] Documentation updates

### Client Migration Strategy

```typescript
// Old REST API
const activities = await fetch('/api/activities').then(r => r.json());

// Transition: Decide per request
const useGraphQL = feature.isEnabled('use-graphql-api');
const activities = useGraphQL
  ? await graphqlClient.query(ACTIVITIES_QUERY)
  : await fetch('/api/activities').then(r => r.json());

// New GraphQL API
const { data } = await graphqlClient.query(ACTIVITIES_QUERY);
```

---

## Backward Compatibility

### Dual-Stack Architecture

```typescript
// routes/activities.ts (existing REST API)
router.get('/activities', async (req, res) => {
  const activities = await activitiesService.list(req.query);
  res.json(activities);
});

// resolvers/activity.resolver.ts (new GraphQL API)
@Query('activities')
async listActivities(@Args('input') input: any) {
  // Uses same adapter internally
  return this.activityAdapter.listActivities(context, {}, input);
}

// Both call the same adapter, which uses the same service
```

### Gradual Deprecation

```typescript
// In REST endpoint handler
if (process.env.DEPRECATE_REST_API === 'true') {
  res.setHeader(
    'Deprecation',
    'true'
  );
  res.setHeader(
    'Sunset',
    new Date(Date.now() + 90*24*60*60*1000).toUTCString() // 90 days
  );
  res.setHeader(
    'Link',
    '<https://docs.lume.dev/graphql>; rel="successor-version"'
  );
}

// Log usage
logger.info('REST endpoint called (deprecated)', {
  endpoint: req.path,
  timestamp: new Date(),
});
```

### Version Header Support

```typescript
// Accept GraphQL or REST based on Accept header
app.get('/api/activities', (req, res) => {
  const acceptGraphQL = req.headers.accept?.includes('application/graphql');
  
  if (acceptGraphQL) {
    // Redirect to GraphQL or return GraphQL response
    return res.status(301).redirect('/graphql');
  }

  // Continue with REST
  next();
});
```

---

## Testing Integration

### Integration Test Example

```typescript
// tests/integration/activity-adapter.spec.ts
describe('ActivityAdapter', () => {
  let adapter: ActivityAdapter;
  let service: ActivitiesService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      providers: [ActivityAdapter, ActivitiesService],
    }).compile();

    adapter = moduleFixture.get(ActivityAdapter);
    service = moduleFixture.get(ActivitiesService);
  });

  it('should transform service data to GraphQL format', async () => {
    const mockActivity = {
      id: '1',
      title: 'Test Activity',
      status: 'published',
      createdAt: new Date(),
    };

    jest.spyOn(service, 'getActivity').mockResolvedValue(mockActivity);

    const result = await adapter.getActivity('1', {
      userId: 'user-1',
      tenantId: 'tenant-1',
      userRoles: ['user'],
    });

    expect(result.id).toBe('1');
    expect(result.title).toBe('Test Activity');
  });

  it('should enforce tenant isolation', async () => {
    const mockActivity = {
      id: '1',
      title: 'Test',
      tenantId: 'other-tenant',
    };

    jest.spyOn(service, 'getActivity').mockResolvedValue(mockActivity);

    await expect(
      adapter.getActivity('1', {
        userId: 'user-1',
        tenantId: 'my-tenant',
        userRoles: ['user'],
      }),
    ).rejects.toThrow('Access denied');
  });
});
```

---

## Implementation Checklist

### For Each Module Integration

- [ ] Analyze existing REST API endpoints
- [ ] Design GraphQL schema (types, queries, mutations)
- [ ] Create adapter (extends BaseModuleAdapter)
- [ ] Create resolver (implements @Resolver)
- [ ] Write unit tests (service mocking)
- [ ] Write integration tests (database)
- [ ] Write E2E tests (full GraphQL stack)
- [ ] Update GraphQL module registration
- [ ] Document REST ↔ GraphQL mapping
- [ ] Deploy to staging
- [ ] Verify backward compatibility
- [ ] Monitor metrics

---

## Next Steps

1. **Choose first module:** Start with Activities (HIGH priority)
2. **Create adapter:** Follow ActivityAdapter pattern
3. **Define schema:** Use activities.schema.graphql template
4. **Implement resolver:** Use ActivityResolver as reference
5. **Write tests:** Use test examples provided
6. **Deploy:** Follow migration path strategy
7. **Monitor:** Track usage metrics

---

**Result:** All 22+ Lume modules accessible via modern GraphQL API while maintaining full REST backward compatibility.

