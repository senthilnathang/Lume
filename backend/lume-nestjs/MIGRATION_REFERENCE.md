# Migration Reference Guide

## Permissions to Register

All three modules require permissions to be registered in the database. These should be added to the manifest files or seeded during module installation.

### Activities Module Permissions
```
activities.read - Read activities
activities.write - Create, update, publish, cancel activities
activities.delete - Delete activities
activities.create - Explicitly create activities
activities.publish - Publish activities
```

### Documents Module Permissions
```
documents.read - Read documents
documents.write - Create, update documents
documents.delete - Delete documents
documents.create - Explicitly create documents
```

### Team Module Permissions
```
team.read - Read team data
team.write - Create, update, reorder team members
team.delete - Delete team members
team.create - Explicitly create team members
```

## Database Schema Reference

### Activities Table
```sql
CREATE TABLE activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  short_description VARCHAR(500),
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  location VARCHAR(255),
  cover_image VARCHAR(500),
  gallery JSON DEFAULT '[]',
  capacity INT,
  registered_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  metadata JSON DEFAULT '{}',
  created_by INT,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### Documents Table
```sql
CREATE TABLE documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size INT,
  type VARCHAR(20) DEFAULT 'document',
  category VARCHAR(100),
  path VARCHAR(500) NOT NULL,
  url VARCHAR(500),
  description TEXT,
  tags JSON DEFAULT '[]',
  uploaded_by INT,
  is_public BOOLEAN DEFAULT FALSE,
  downloads INT DEFAULT 0,
  metadata JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### Team Members Table
```sql
CREATE TABLE team_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  position VARCHAR(100),
  department VARCHAR(100),
  bio TEXT,
  photo VARCHAR(500),
  order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_leader BOOLEAN DEFAULT FALSE,
  social_links JSON DEFAULT '{}',
  metadata JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

## Drizzle Schema Files

The Drizzle schemas should be located at:
- `/opt/Lume/backend/src/modules/activities/models/schema.js`
- `/opt/Lume/backend/src/modules/documents/models/schema.js`
- `/opt/Lume/backend/src/modules/team/models/schema.js`

These already exist in the Express codebase and define table structures using Drizzle syntax.

## Migration Path

### Step 1: Module Registration
Add modules to `app.module.ts`:
```typescript
import { ActivitiesModule } from '@modules/activities/activities.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { TeamModule } from '@modules/team/team.module';

@Module({
  imports: [
    // ... other modules
    ActivitiesModule,
    DocumentsModule,
    TeamModule,
  ],
})
export class AppModule {}
```

### Step 2: Database Setup
Ensure tables are created:
```bash
npm run db:migrate
# or manual creation using schema.sql files
```

### Step 3: Seed Permissions
Create or update seed script to register permissions:
```typescript
const permissions = [
  // Activities
  { name: 'activities.read', description: 'Read activities' },
  { name: 'activities.write', description: 'Write activities' },
  { name: 'activities.delete', description: 'Delete activities' },
  // Documents
  { name: 'documents.read', description: 'Read documents' },
  { name: 'documents.write', description: 'Write documents' },
  { name: 'documents.delete', description: 'Delete documents' },
  // Team
  { name: 'team.read', description: 'Read team data' },
  { name: 'team.write', description: 'Write team data' },
  { name: 'team.delete', description: 'Delete team members' },
];

for (const permission of permissions) {
  await prisma.permission.upsert({
    where: { name: permission.name },
    create: permission,
    update: {},
  });
}
```

### Step 4: Testing
Run the test suite:
```bash
npm test -- activities.service.spec.ts
npm test -- documents.service.spec.ts
npm test -- team.service.spec.ts
```

### Step 5: Frontend Integration
Update Vue 3 frontend to call new NestJS endpoints:
- Replace `/api/activities/*` calls
- Replace `/api/documents/*` calls
- Replace `/api/team/*` calls

## Key Differences from Express

### Validation
- Express: Manual `express-validator` middleware per route
- NestJS: Class-based DTOs with `class-validator` decorators
- Automatic validation via pipes

### Error Handling
- Express: Manual try-catch with `res.status()` and `res.json()`
- NestJS: Throw exceptions, let exception filters handle responses

### Guards & Decorators
- Express: Manual middleware checks
- NestJS: `@UseGuards()` and `@Permissions()` decorators

### Database Access
- Express: Direct service instantiation
- NestJS: Dependency injection via constructor

### Response Format
- Both: Return `{ success, data, message, pagination }`
- Consistent response structure across Express and NestJS

## Rollback Plan

If issues arise, the Express implementation remains in:
- `/opt/Lume/backend/src/modules/activities/`
- `/opt/Lume/backend/src/modules/documents/`
- `/opt/Lume/backend/src/modules/team/`

To revert:
1. Remove module imports from `app.module.ts`
2. Update frontend API calls to use old endpoints
3. Restart Express server
