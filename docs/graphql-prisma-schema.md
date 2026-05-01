# Prisma Schema Updates for GraphQL Grid Modules

**Version:** 1.0  
**Status:** Schema Reference  
**Last Updated:** May 2026

## Overview

This document outlines the Prisma schema additions needed to support the four grid modules. Add these models to `backend/prisma/schema.prisma`.

## DataGrid Models

```prisma
// Data Grid Models
model DataGrid {
  id                String           @id @default(cuid())
  tenantId          String
  title             String
  description       String?
  columns           DataGridColumn[]
  rows              GridRow[]
  
  createdById       String
  createdBy         User             @relation("DataGridCreatedBy", fields: [createdById], references: [id])
  updatedById       String?
  updatedBy         User?            @relation("DataGridUpdatedBy", fields: [updatedById], references: [id])
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([tenantId])
  @@index([createdById])
}

model DataGridColumn {
  id                String           @id @default(cuid())
  gridId            String
  grid              DataGrid         @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  name              String
  type              String           // TEXT, NUMBER, DATE, DATETIME, BOOLEAN, SELECT, RELATION, etc.
  displayName       String
  width             Int?
  
  sortable          Boolean          @default(true)
  filterable        Boolean          @default(true)
  editable          Boolean          @default(true)
  hidden            Boolean          @default(false)
  required          Boolean          @default(false)
  
  formatters        String?          // JSON array of formatter names
  validators        String?          // JSON array of validator names
  
  sequence          Int
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@unique([gridId, name])
  @@index([gridId])
}

model GridRow {
  id                String           @id @default(cuid())
  gridId            String
  grid              DataGrid         @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  data              Json             // { field1: value1, field2: value2, ... }
  status            String           @default("VALID") // VALID, INVALID, PENDING_REVIEW
  errors            String?          // JSON array of validation errors
  
  sequence          Int              @default(0)
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  deletedAt         DateTime?        // Soft delete support
  
  @@index([gridId])
  @@index([status])
  @@index([deletedAt])
}

model GridFilter {
  id                String           @id @default(cuid())
  gridId            String
  grid              DataGrid         @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  field             String
  operator          String           // EQ, NE, GT, LT, IN, CONTAINS, etc.
  value             String?
  
  createdAt         DateTime         @default(now())
  
  @@index([gridId])
}

model GridSort {
  id                String           @id @default(cuid())
  gridId            String
  grid              DataGrid         @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  field             String
  direction         String           @default("ASC") // ASC, DESC
  sequence          Int
  
  createdAt         DateTime         @default(now())
  
  @@index([gridId])
}
```

## Agent Models

```prisma
// Agent Grid Models
model AgentGrid {
  id                String           @id @default(cuid())
  tenantId          String
  title             String
  description       String?
  
  agents            Agent[]
  executions        AgentExecution[]
  
  createdById       String
  createdBy         User             @relation("AgentGridCreatedBy", fields: [createdById], references: [id])
  updatedById       String?
  updatedBy         User?            @relation("AgentGridUpdatedBy", fields: [updatedById], references: [id])
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([tenantId])
}

model Agent {
  id                String           @id @default(cuid())
  gridId            String
  grid              AgentGrid        @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  name              String
  description       String?
  status            String           @default("ACTIVE") // ACTIVE, INACTIVE, MAINTENANCE, ERROR
  version           String           @default("1.0.0")
  
  config            Json             // Agent configuration
  capabilities      String           // JSON array of capabilities
  
  executions        AgentExecution[]
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([gridId])
  @@index([status])
}

model AgentExecution {
  id                String           @id @default(cuid())
  gridId            String
  grid              AgentGrid        @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  agentId           String
  agent             Agent            @relation(fields: [agentId], references: [id], onDelete: Cascade)
  
  status            String           @default("PENDING") // PENDING, RUNNING, SUCCESS, FAILED, CANCELLED
  input             Json
  output            Json?
  
  logs              ExecutionLog[]
  
  startedAt         DateTime?
  completedAt       DateTime?
  duration          Int?             // milliseconds
  
  error             String?
  
  createdAt         DateTime         @default(now())
  
  @@index([agentId])
  @@index([status])
  @@index([gridId])
}

model ExecutionLog {
  id                String           @id @default(cuid())
  executionId       String
  execution         AgentExecution   @relation(fields: [executionId], references: [id], onDelete: Cascade)
  
  level             String           // DEBUG, INFO, WARN, ERROR
  message           String
  data              Json?
  
  timestamp         DateTime         @default(now())
  
  @@index([executionId])
  @@index([level])
  @@index([timestamp])
}
```

## Policy Models

```prisma
// Policy Grid Models
model PolicyGrid {
  id                String           @id @default(cuid())
  tenantId          String
  title             String
  description       String?
  
  policies          AccessPolicy[]
  resources         Resource[]
  
  createdById       String
  createdBy         User             @relation("PolicyGridCreatedBy", fields: [createdById], references: [id])
  updatedById       String?
  updatedBy         User?            @relation("PolicyGridUpdatedBy", fields: [updatedById], references: [id])
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([tenantId])
}

model AccessPolicy {
  id                String           @id @default(cuid())
  gridId            String
  grid              PolicyGrid       @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  name              String
  description       String?
  
  resource          String           // Resource name
  action            String           // Action name
  
  conditions        PolicyCondition[]
  roles             Role[]           @relation("RolePolicies")
  
  effect            String           @default("ALLOW") // ALLOW, DENY
  priority          Int              @default(100)
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@unique([gridId, resource, action])
  @@index([gridId])
  @@index([resource])
  @@index([effect])
}

model PolicyCondition {
  id                String           @id @default(cuid())
  policyId          String
  policy            AccessPolicy     @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  field             String           // Field name to check
  operator          String           // EQ, NE, IN, CONTAINS, REGEX, etc.
  value             String?
  values            String?          // JSON array for multi-value operators
  
  @@index([policyId])
}

model Resource {
  id                String           @id @default(cuid())
  gridId            String
  grid              PolicyGrid       @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  name              String           @unique
  displayName       String
  description       String?
  
  actions           ResourceAction[]
  
  @@index([gridId])
}

model ResourceAction {
  id                String           @id @default(cuid())
  resourceId        String
  resource          Resource         @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  
  name              String
  description       String?
  
  @@unique([resourceId, name])
  @@index([resourceId])
}
```

## Workflow Models

```prisma
// Flow Grid Models
model FlowGrid {
  id                String           @id @default(cuid())
  tenantId          String
  title             String
  description       String?
  
  workflows         Workflow[]
  
  createdById       String
  createdBy         User             @relation("FlowGridCreatedBy", fields: [createdById], references: [id])
  updatedById       String?
  updatedBy         User?            @relation("FlowGridUpdatedBy", fields: [updatedById], references: [id])
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([tenantId])
}

model Workflow {
  id                String           @id @default(cuid())
  gridId            String
  grid              FlowGrid         @relation(fields: [gridId], references: [id], onDelete: Cascade)
  
  name              String
  description       String?
  version           Int              @default(1)
  
  status            String           @default("DRAFT") // DRAFT, PUBLISHED, ARCHIVED, PAUSED
  
  steps             WorkflowStep[]
  triggers          WorkflowTrigger[]
  variables         WorkflowVariable[]
  executions        WorkflowExecution[]
  
  successRate       Float            @default(0)
  totalExecutions   Int              @default(0)
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([gridId])
  @@index([status])
}

model WorkflowStep {
  id                String           @id @default(cuid())
  workflowId        String
  workflow          Workflow         @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  name              String
  type              String           // ACTION, CONDITION, LOOP, DELAY, WEBHOOK, SCRIPT, HUMAN_TASK
  sequence          Int
  
  config            Json             // Step configuration
  conditions        StepCondition[]
  
  nextStepIds       String           // JSON array of next step IDs
  errorHandling     Json?            // Error handling config
  
  @@index([workflowId])
  @@index([sequence])
}

model StepCondition {
  id                String           @id @default(cuid())
  stepId            String
  step              WorkflowStep     @relation(fields: [stepId], references: [id], onDelete: Cascade)
  
  field             String
  operator          String           // EQ, NE, GT, LT, IN, CONTAINS, REGEX
  value             String?
  
  @@index([stepId])
}

model WorkflowTrigger {
  id                String           @id @default(cuid())
  workflowId        String
  workflow          Workflow         @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  type              String           // WEBHOOK, SCHEDULED, EVENT, MANUAL
  config            Json
  
  @@index([workflowId])
}

model WorkflowVariable {
  id                String           @id @default(cuid())
  workflowId        String
  workflow          Workflow         @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  name              String
  type              String           // STRING, NUMBER, BOOLEAN, ARRAY, OBJECT, DATE
  defaultValue      String?
  required          Boolean          @default(false)
  
  @@unique([workflowId, name])
  @@index([workflowId])
}

model WorkflowExecution {
  id                String           @id @default(cuid())
  workflowId        String
  workflow          Workflow         @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  status            String           // PENDING, RUNNING, SUCCESS, FAILED, CANCELLED
  variables         Json
  
  steps             StepExecution[]
  
  startedAt         DateTime?
  completedAt       DateTime?
  duration          Int?             // milliseconds
  
  error             String?
  
  createdAt         DateTime         @default(now())
  
  @@index([workflowId])
  @@index([status])
  @@index([createdAt])
}

model StepExecution {
  id                String           @id @default(cuid())
  executionId       String
  execution         WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  
  stepId            String           // Reference to WorkflowStep
  
  status            String           // PENDING, RUNNING, SUCCESS, FAILED, SKIPPED
  
  input             Json?
  output            Json?
  
  startedAt         DateTime?
  completedAt       DateTime?
  duration          Int?             // milliseconds
  
  error             String?
  
  @@index([executionId])
  @@index([status])
}
```

## Tenant Relations Updates

```prisma
// Add these relations to the User model
model User {
  // ... existing fields ...
  
  // GraphQL Grid Relations
  dataGridsCreated    DataGrid[]     @relation("DataGridCreatedBy")
  dataGridsUpdated    DataGrid[]     @relation("DataGridUpdatedBy")
  agentGridsCreated   AgentGrid[]    @relation("AgentGridCreatedBy")
  agentGridsUpdated   AgentGrid[]    @relation("AgentGridUpdatedBy")
  policyGridsCreated  PolicyGrid[]   @relation("PolicyGridCreatedBy")
  policyGridsUpdated  PolicyGrid[]   @relation("PolicyGridUpdatedBy")
  flowGridsCreated    FlowGrid[]     @relation("FlowGridCreatedBy")
  flowGridsUpdated    FlowGrid[]     @relation("FlowGridUpdatedBy")
}
```

## Migration Instructions

### 1. Create Migration File

```bash
cd backend

# Generate migration from schema changes
npx prisma migrate dev --name add-graphql-grid-models

# This will:
# - Create SQL migration file in prisma/migrations/
# - Apply migration to development database
# - Update prisma/schema.prisma
```

### 2. Update Prisma Client

```bash
# Generate updated Prisma Client types
npx prisma generate
```

### 3. Verify Migration

```bash
# Check migration status
npx prisma migrate status

# View schema
npx prisma studio  # Opens Prisma Studio at http://localhost:5555
```

### 4. Seed Test Data (Optional)

```bash
# Create migration script in prisma/seed.ts
# Run seeding
npx prisma db seed
```

## Index Strategy

Indexes are placed on:
- **Foreign Keys**: `tenantId`, `gridId`, `agentId`, `workflowId`
- **Status Fields**: `status` (frequently filtered)
- **Timestamps**: `createdAt`, `updatedAt`, `deletedAt` (for time-based queries)
- **Sorting Fields**: `sequence` (for ordered results)
- **Text Search**: `name`, `title` (for full-text search)

## Performance Considerations

1. **GridRow Table** — Can grow very large
   - Use partitioning by tenantId or date if needed
   - Archive old rows periodically
   - Consider separate collection for historical data

2. **ExecutionLog Table** — Time-series data
   - Implement rotation/cleanup policy
   - Archive logs older than 90 days
   - Use TTL indexes in production

3. **Audit Trail** — Use existing AuditLog table
   - Track all grid modifications
   - Query by resource type for compliance

## Validation

Run these queries to verify schema:

```sql
-- Count tables created
SELECT COUNT(*) FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'lume' 
AND TABLE_NAME LIKE '%grid%';

-- Check indexes
SHOW INDEX FROM dataGrid;
SHOW INDEX FROM workflow_executions;

-- Verify foreign keys
SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'lume' 
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

