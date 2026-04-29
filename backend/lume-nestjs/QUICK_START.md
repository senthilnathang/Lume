# Quick Start - NestJS Content Modules

## Files Created

### Activities Module
```
src/modules/activities/
  ├── activities.module.ts
  ├── controllers/activities.controller.ts
  ├── services/activities.service.ts
  └── dtos/
      ├── create-activity.dto.ts
      ├── update-activity.dto.ts
      ├── query-activities.dto.ts
      └── index.ts
```

### Documents Module
```
src/modules/documents/
  ├── documents.module.ts
  ├── controllers/documents.controller.ts
  ├── services/documents.service.ts
  └── dtos/
      ├── create-document.dto.ts
      ├── update-document.dto.ts
      ├── query-documents.dto.ts
      └── index.ts
```

### Team Module
```
src/modules/team/
  ├── team.module.ts
  ├── controllers/team.controller.ts
  ├── services/team.service.ts
  └── dtos/
      ├── create-team-member.dto.ts
      ├── update-team-member.dto.ts
      ├── query-team-members.dto.ts
      ├── reorder-team-members.dto.ts
      └── index.ts
```

## Integration Steps

### 1. Register Modules in app.module.ts
```typescript
import { ActivitiesModule } from '@modules/activities/activities.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { TeamModule } from '@modules/team/team.module';

@Module({
  imports: [
    // ... existing modules
    ActivitiesModule,
    DocumentsModule,
    TeamModule,
  ],
})
export class AppModule {}
```

### 2. Start the Application
```bash
npm run start:dev
```

### 3. Test an Endpoint
```bash
# Public endpoint (no auth required)
curl http://localhost:3000/api/activities

# Protected endpoint (auth required)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/activities/stats
```

## API Examples

### Activities
```bash
# List activities
GET /api/activities?page=1&limit=20&status=published

# Get upcoming activities
GET /api/activities/upcoming?limit=5

# Create activity (requires auth + activities.write permission)
POST /api/activities
Content-Type: application/json

{
  "title": "Team Meeting",
  "description": "Monthly sync",
  "startDate": "2026-05-15T10:00:00Z",
  "endDate": "2026-05-15T11:00:00Z",
  "capacity": 20
}

# Publish activity
POST /api/activities/1/publish

# Get stats
GET /api/activities/stats
```

### Documents
```bash
# List documents
GET /api/documents?page=1&type=image&isPublic=true

# Create document (requires auth + documents.write permission)
POST /api/documents
Content-Type: application/json

{
  "title": "Logo.png",
  "filename": "logo.png",
  "path": "/uploads/logo.png",
  "type": "image",
  "isPublic": true
}

# Increment download counter
POST /api/documents/5/download
```

### Team
```bash
# List team members
GET /api/team?department=Engineering&isActive=true

# Get all active members
GET /api/team/active

# Get leadership
GET /api/team/leaders

# Create team member (requires auth + team.write permission)
POST /api/team
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "position": "Senior Engineer",
  "department": "Engineering",
  "isLeader": true
}

# Reorder team members
POST /api/team/reorder
Content-Type: application/json

{
  "members": [
    { "id": 1, "order": 1 },
    { "id": 2, "order": 2 },
    { "id": 3, "order": 3 }
  ]
}
```

## Authentication

### Getting a Token
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@lume.dev",
  "password": "admin123"
}

# Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

### Using Token
```bash
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3000/api/activities/stats
```

## Permissions

Required permissions for protected endpoints:

**Activities:**
- `activities.read` - Read activities
- `activities.write` - Create, update, publish, cancel
- `activities.delete` - Delete activities

**Documents:**
- `documents.read` - Read documents
- `documents.write` - Create, update
- `documents.delete` - Delete documents

**Team:**
- `team.read` - Read team data
- `team.write` - Create, update, reorder
- `team.delete` - Delete members

## Troubleshooting

### Module not found error
- Ensure modules are imported in `app.module.ts`
- Check import paths match the file structure

### 401 Unauthorized error
- Get a valid JWT token from login endpoint
- Include `Authorization: Bearer <token>` header
- Token must not be expired

### 403 Forbidden error
- User is authenticated but lacks required permission
- Assign permission to user's role
- Admin/super_admin roles bypass permission checks

### 404 Not found error
- Resource doesn't exist
- Check the ID/slug in the request
- Database record may have been deleted

### Drizzle connection error
- Verify DATABASE_URL or DB_* env variables
- Check MySQL is running and accessible
- Verify database name, user, password

## Testing

### Run Tests
```bash
npm test
```

### Run Specific Module Tests
```bash
npm test -- activities.service.spec.ts
npm test -- documents.service.spec.ts
npm test -- team.service.spec.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

## Documentation Files

- **COMPLETION_REPORT.md** - Full migration report with all details
- **MIGRATION_SUMMARY.md** - Feature overview for each module
- **MIGRATION_REFERENCE.md** - Technical reference and schemas
- **MODULES_STRUCTURE.txt** - File tree diagram
- **QUICK_START.md** (this file) - Integration and usage guide

---

**Total:** 25 files created | 27 endpoints implemented | 3 modules migrated
