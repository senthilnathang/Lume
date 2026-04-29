# Base Module Implementation Guide

## Quick Reference

### Service Dependencies

All services are injected via NestJS constructor injection:

```typescript
constructor(
  private prisma: PrismaService,
  private drizzle: DrizzleService,
  private recordService: RecordService,
  private relationshipService: RelationshipService,
) {}
```

### Key Validation Patterns

#### Record Validation
```typescript
// In RecordService.validateRecordData()
// Checks:
// 1. Required fields are present
// 2. Email format for email fields
// 3. Number format for number fields
// 4. Date format for date fields
// 5. URL format for url fields
```

#### Field Immutability
```typescript
// In EntityService.updateField()
// Cannot change:
// - field.name
// - field.type
// Can change:
// - label
// - required
// - helpText
// - selectOptions
// - defaultValue
```

### Data Serialization

#### JSON Storage Pattern
```typescript
// Storing
data: JSON.stringify(recordData)

// Retrieving
data: JSON.parse(record.data)

// Selective options parsing
selectOptions: field.selectOptions ? JSON.parse(field.selectOptions) : null
config: view.config ? JSON.parse(view.config) : {}
```

### Company Scoping

All record operations include company isolation:

```typescript
// Creating records
companyId = req.user?.companyId || 1
userId = req.user?.id || 1

// Reading records
const record = await this.prisma.entityRecord.findUnique({...})
if (!record || record.companyId !== companyId) return null

// Filtering by company
where: {
  entityId,
  companyId,
  deletedAt: null
}
```

## Common Patterns

### Pagination
```typescript
async listRecords(entityId, companyId, options = {}) {
  const { page = 1, limit = 20 } = options
  const skip = (page - 1) * limit
  
  const total = await count()
  const items = await findMany({ skip, take: limit })
  
  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
}
```

### Filtering
```typescript
// URL: /records?filters=[{"field":"name","operator":"contains","value":"test"}]
filters = JSON.parse(req.query.filters)

filteredRecords = parsedRecords.filter(record => {
  return filters.every(filter => {
    const fieldValue = record.data[filter.field]
    const operator = filter.operator || 'contains'
    
    switch(operator) {
      case 'contains': return String(fieldValue).includes(filter.value)
      case 'equals': return fieldValue === filter.value
      case 'startsWith': return String(fieldValue).startsWith(filter.value)
    }
  })
})
```

### Error Responses
```typescript
// Validation errors
throw new BadRequestException({
  message: 'Validation failed',
  errors: {
    fieldName: 'error message'
  }
})

// Not found
throw new NotFoundException('Entity not found')

// Unavailable
throw new ServiceUnavailableException('Queue manager not initialized')
```

## Testing Examples

### Creating an Entity
```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "companies",
    "label": "Companies",
    "description": "Customer companies"
  }'
```

### Creating a Record
```bash
curl -X POST http://localhost:3000/api/entities/1/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "status": "active"
    }
  }'
```

### Listing Records with Filters
```bash
curl "http://localhost:3000/api/entities/1/records?page=1&limit=20&filters=%5B%7B%22field%22:%22status%22,%22operator%22:%22equals%22,%22value%22:%22active%22%7D%5D" \
  -H "Authorization: Bearer $TOKEN"
```

### Linking Records
```bash
curl -X POST http://localhost:3000/api/entities/1/records/5/relationships \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "relationshipId": 1,
    "targetRecordId": 10
  }'
```

## Performance Considerations

### Current Implementation
- **In-memory filtering**: Records are fetched and filtered in JavaScript
- **Full table scans**: All records for entity/company are fetched for filtering
- **Suitable for**: Small to medium datasets (1,000-10,000 records)

### Optimization Opportunities
1. **Database-level filtering**: Use Prisma JSON operators for large datasets
2. **Caching**: Implement Redis for permission/rule lookups
3. **Indexing**: Add DB indexes on entityId, companyId, deletedAt
4. **Pagination**: Implement cursor-based pagination for large result sets

## Integration Points

### With Other Modules
- **Auth Module**: Uses JwtAuthGuard and RbacGuard
- **Users Module**: User lookups for permission checks
- **RBAC Module**: Role and permission management
- **Settings Module**: Module configuration storage

### With Core Services
- **PrismaService**: Core model queries
- **DrizzleService**: Module table operations
- **LoggerService**: Error and event logging
- **RbacService**: Permission evaluation

## Troubleshooting

### Common Issues

**Issue**: Permission denied errors
- **Cause**: User role doesn't have required permission
- **Solution**: Check RolePermission mappings, ensure permission exists

**Issue**: Record not found even though it exists
- **Cause**: Company ID mismatch or soft deleted
- **Solution**: Check companyId, verify deletedAt is null

**Issue**: Queue manager not initialized
- **Cause**: BullMQ not started before queue operations
- **Solution**: Ensure queue initialization in app startup

**Issue**: Field type cannot be changed
- **Cause**: Field immutability protection
- **Solution**: Delete and recreate field with new type

## Code Examples

### Custom Permission Checking
```typescript
// In controller
async create(@Body() dto: CreateEntityDto, @Req() req) {
  const securityService = new SecurityService(this.prisma)
  const hasPermission = await securityService.checkPermission(
    req.user.id,
    'base.entities.write'
  )
  if (!hasPermission) throw new ForbiddenException()
}
```

### Record Rule Evaluation
```typescript
// In security service
async checkRecordRules(modelName, action, record) {
  const rules = await this.prisma.recordRule.findMany({
    where: { modelName, action, isActive: true }
  })
  
  for (const rule of rules) {
    const domain = JSON.parse(rule.domain || '{}')
    const matches = this.evaluateDomain(domain, record)
    if (!matches) throw new Error(`Access denied: ${rule.name}`)
  }
  return true
}
```

### View Rendering
```typescript
// Dynamic column generation
const columns = view.type === 'list'
  ? config.columns.map(name => fieldMap[name])
  : fields.map(f => ({...f}))

return {
  ...view,
  columns,
  pageSize: config.pageSize || 20,
  defaultSort: config.defaultSort || [{field: 'createdAt', direction: 'desc'}]
}
```

## Migration from Express

### Old Pattern (Express)
```javascript
router.post('/', async (req, res) => {
  try {
    const entity = await entityService.createEntity(req.body)
    res.status(201).json({ success: true, data: entity })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})
```

### New Pattern (NestJS)
```typescript
@Post()
@UseGuards(JwtAuthGuard, RbacGuard)
@Permissions('base.entities.write')
async createEntity(@Body() dto: CreateEntityDto) {
  try {
    return { success: true, data: await this.entityService.createEntity(dto) }
  } catch (error) {
    throw new BadRequestException(error.message)
  }
}
```

Key differences:
1. Decorators for HTTP method and guards
2. DTOs for type safety
3. Automatic response serialization
4. Exception handling via NestJS exceptions
5. Dependency injection instead of manual instantiation

## Related Documentation

- `src/modules/base/README.md` - Complete module documentation
- `src/modules/base/controllers/` - Route handler implementations
- `src/modules/base/services/` - Business logic implementations
- `src/modules/base/dtos/` - Data validation schemas
