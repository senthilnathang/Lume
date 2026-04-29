# Base Module - NestJS Migration

## Overview

The Base module has been successfully migrated from Express.js to NestJS. This is the core, most complex module that provides:

- **Entity Management**: Custom entity CRUD, field management, and view configuration
- **Record Management**: Entity record CRUD operations with company scoping and filtering
- **View Rendering**: Dynamic view rendering with metadata and column configuration
- **Queue Management**: Job queue operations and monitoring
- **Relationship Management**: Record-to-record linking with circular reference prevention
- **Module Management**: Module lifecycle, dependency tracking, and menu/permission syncing
- **Security**: Permission checking, record rules evaluation, and access control

## Architecture

### Directory Structure

```
src/modules/base/
├── base.module.ts              # Module definition
├── controllers/                # Route handlers
│   ├── entity.controller.ts          # Entity CRUD & fields
│   ├── entity-records.controller.ts  # Record CRUD & relationships
│   ├── entity-views.controller.ts    # View rendering
│   └── queue.controller.ts           # Queue operations
├── services/                   # Business logic
│   ├── entity.service.ts       # Entity operations
│   ├── record.service.ts       # Record CRUD with validation
│   ├── view-renderer.service.ts      # View metadata rendering
│   ├── queue.service.ts        # Queue management
│   ├── relationship.service.ts       # Record relationships
│   ├── module.service.ts       # Module lifecycle
│   └── security.service.ts     # Permission & rule checking
└── dtos/                       # Data transfer objects
    ├── create-entity.dto.ts
    ├── update-entity.dto.ts
    ├── create-field.dto.ts
    ├── update-field.dto.ts
    ├── create-record.dto.ts
    ├── update-record.dto.ts
    ├── create-view.dto.ts
    ├── link-records.dto.ts
    ├── add-job.dto.ts
    └── add-recurring-job.dto.ts
```

### Controllers & Routes

#### EntityController (`api/entities`)
- `POST /` - Create entity
- `GET /` - List entities (paginated)
- `GET /:id` - Get entity with fields
- `PUT /:id` - Update entity
- `DELETE /:id` - Delete entity (soft)
- `POST /:id/publish` - Publish entity
- `POST /:id/unpublish` - Unpublish entity
- `POST /:entityId/fields` - Create field
- `GET /:entityId/fields` - List fields
- `PUT /fields/:fieldId` - Update field
- `DELETE /fields/:fieldId` - Delete field (soft)
- `POST /:entityId/views` - Create view
- `GET /:entityId/views` - List views

#### EntityRecordsController (`api/entities/:entityId/records`)
- `POST /` - Create record with validation
- `GET /` - List records (paginated, filterable, sortable)
- `GET /:recordId` - Get single record
- `PUT /:recordId` - Update record with validation
- `DELETE /:recordId` - Delete record (soft or hard)
- `POST /:recordId/relationships` - Link records
- `DELETE /:recordId/relationships` - Unlink records

#### EntityViewsController (`api/entities/:entityId/views`)
- `GET /:viewId/render` - Render view with metadata
- `GET /` - List views for entity

#### QueueController (`api/queue`)
- `GET /stats` - All queue statistics
- `GET /:queueName` - Queue stats by name
- `GET /:queueName/:jobId` - Job details
- `POST /:queueName/clear` - Clear queue
- `POST /:queueName/job` - Add job
- `POST /:queueName/recurring` - Add recurring job
- `GET /` - List all queues

## Key Implementation Details

### Entity Service

**Entity Operations**:
- Create, read, update, delete (soft) entities
- Publish/unpublish entities for public access
- Automatic slug generation from entity name

**Field Management**:
- Create fields with type validation (text, number, email, url, select, date, etc.)
- Field immutability: name and type cannot be changed after creation
- Select option validation for choice fields
- Soft delete fields with deletedAt tracking

**View Configuration**:
- Create views (list, grid, form, kanban, calendar types)
- Auto-generate column metadata from fields
- Configurable sort, filter, and page size defaults

### Record Service

**CRUD Operations**:
- Company-scoped record isolation
- JSON data storage with parsed output
- Automatic created_by tracking
- Soft or hard delete capability

**Validation**:
- Required field checking
- Type-specific validation (email format, URL format, etc.)
- Comprehensive error reporting with field-level messages
- Inherited from EntityFieldDefinitions

**Filtering & Sorting**:
- In-memory filtering (suitable for moderate data volumes)
- Supports contains, equals, startsWith operators
- Custom sort field specification
- Pagination with hasMore indicator

### View Renderer Service

- Dynamic column generation based on view type
- List views: configurable columns, sortable, filterable
- Grid views: all fields, basic metadata
- Form views: includes required status and help text
- Default sort and filter configuration

### Relationship Service

- Circular reference prevention (record cannot link to itself)
- Link/unlink operations with relationship tracking
- Bulk relationship queries

### Queue Service

- Queue statistics and job monitoring
- Add one-time or recurring jobs
- Job status tracking (pending, active, completed, failed)
- Queue clearing and job details retrieval
- Integration with BullMQ queue manager (initialized globally)

### Module Service

**Lifecycle Management**:
- Install/uninstall with dependency validation
- Module upgrade with version tracking
- Module state tracking (installed, uninstalled, etc.)

**Synchronization**:
- Auto-sync permissions from module manifest
- Auto-sync menus with hierarchical support
- Dependency tree construction

**Permission & Menu Management**:
- Create/update permissions in categories
- Create hierarchical menu items with sequences
- Preserve existing items during sync

### Security Service

**Permission Checking**:
- User-level permission lookup via role FK
- Admin/super_admin role bypass
- Support for checking any/all permissions
- Permission caching (clearable)

**Record Rules**:
- Evaluate domain conditions against records
- Support operators: eq, ne, gt, gte, lt, lte, in, nin
- Combine multiple rules with AND logic
- Active rule filtering

## Migration Notes

### From Express to NestJS

#### What Changed
1. **Route Decorators**: `router.get()` → `@Get()`, `router.post()` → `@Post()`, etc.
2. **Middleware**: Express middleware → NestJS `@UseGuards()` and `@Req()` injection
3. **Error Handling**: Express error objects → NestJS `BadRequestException`, `NotFoundException`, etc.
4. **Request/Response**: Express `req, res` → NestJS parameters with `@Param()`, `@Body()`, etc.
5. **Service Injection**: Manual instantiation → NestJS `@Injectable()` with constructor injection
6. **Async Handling**: Auto-wrapped in NestJS (no need for `asyncHandler`)

#### What Remained the Same
1. **Business Logic**: All validation and data transformation logic preserved
2. **Database Access**: PrismaService and Drizzle querying patterns identical
3. **Error Messages**: Same error formats and messages
4. **Response Format**: `{ success, data, message, pagination, errors }` structure maintained

### Breaking Changes
None - the migration is backward compatible in terms of:
- Response formats
- Permission names
- Error messages
- Data validation rules

### Testing Considerations

Ensure the following are tested:
1. **Entity CRUD**: Create, read, list, update, delete, publish/unpublish
2. **Field Management**: Create, update (immutability checks), delete
3. **Record CRUD**: Create with validation, list with filters/sort, update, delete (soft/hard)
4. **Relationships**: Link/unlink with circular reference prevention
5. **Views**: Create different types, render with proper metadata
6. **Security**: Permission checking, record rule evaluation, admin bypass
7. **Modules**: Install/uninstall with dependencies, sync permissions/menus
8. **Queue**: Add jobs, get stats, clear queues

## Dependencies

- `@nestjs/common` - Core NestJS framework
- `@nestjs/jwt` - JWT token handling
- `class-validator` - DTO validation
- PrismaService - Core database access
- DrizzleService - Module database access
- JwtAuthGuard - JWT validation
- RbacGuard - Role-based access control

## Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` - Prisma database connection
- `JWT_SECRET` - JWT signing key

## Migration Checklist

- [x] Create DTOs for all request bodies
- [x] Implement EntityService with full CRUD
- [x] Implement RecordService with validation and filtering
- [x] Implement ViewRendererService with dynamic metadata
- [x] Implement QueueService with job management
- [x] Implement RelationshipService with circular prevention
- [x] Implement ModuleService with lifecycle management
- [x] Implement SecurityService with permission/rule checking
- [x] Create all four controllers
- [x] Register all services and controllers in base.module.ts
- [x] Apply JWT and RBAC guards to protected routes
- [x] Add permission decorators

## Future Improvements

1. **Performance**: Implement caching for permission lookups
2. **Drizzle Integration**: Migrate entity/field storage to Drizzle if needed
3. **Validation**: Use Prisma validation middleware for advanced rules
4. **Relationships**: Add reverse relationship queries
5. **Views**: Add Kanban/Calendar view metadata generation
6. **Queue**: Implement webhook callbacks for job completion
