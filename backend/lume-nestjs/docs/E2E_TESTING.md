# End-to-End Testing Guide

Comprehensive end-to-end test suites for verifying complete user workflows across all example modules.

## Overview

E2E tests verify full workflows from user login through data creation, workflow execution, permission enforcement, and analytics. They test real-world scenarios across CRM, e-commerce, and project management modules.

## Test Suites

### 1. CRM Workflow Tests (`crm-workflow.e2e.test.ts`)

**Lead Lifecycle Workflow**
- Create lead with auto-assignment
- Retrieve lead with computed fields
- Update lead status (triggers workflows)
- Verify workflow execution and updates
- Track version history

**Access Control**
- Owner can read/write own leads
- Non-owner denied access (ABAC policy)
- Admin can bypass restrictions

**Advanced Queries**
- Multi-filter queries
- Text search
- Grouping and aggregations

**Workflow Execution**
- Manual workflow execution
- Workflow testing with sample data

**AI-Powered Queries**
- Natural language questions
- Record extraction and ranking

**Admin Operations**
- List modules, workflows, policies
- Test CRUD for admin resources

### 2. E-Commerce Workflow Tests (`ecommerce-workflow.e2e.test.ts`)

**Product Catalog & Inventory**
- Create products with stock tracking
- Compute available inventory
- Search storefront
- Category filtering

**Order Lifecycle**
- Create orders (triggers order-confirmation workflow)
- Payment verification
- Shipping and tracking
- Order metrics (computed fields)

**Inventory Management**
- Low stock detection
- Reorder triggers
- Prevent overselling
- Stock reservation on order

**Customer Orders**
- Customers see only their orders (policy)
- Order history and analytics
- Refund/cancellation flows

**Admin Analytics**
- Sales dashboard data
- Inventory dashboard
- Revenue aggregations

### 3. Project Management Tests (`project-workflow.e2e.test.ts`)

**Project Creation & Team**
- Create projects with team members
- Compute budget metrics
- Team member access control

**Task Management**
- Create tasks in projects
- Assign to team members
- Status transitions (todo → in-progress → done)
- Compute completion metrics
- Hour tracking (estimated vs actual)

**Time Tracking**
- Log work hours
- Compute billable amounts
- Time reports by user/project

**Team Collaboration**
- Members view assigned tasks
- Permission-based access
- PM overrides
- Non-members denied access

**Project Analytics**
- Status distribution
- Completion rates
- Team workload
- Time tracking reports

## Running the Tests

### Run All E2E Tests

```bash
# All tests
NODE_OPTIONS='--experimental-vm-modules' npm run test:e2e

# With verbose output
NODE_OPTIONS='--experimental-vm-modules' npm run test:e2e -- --verbose
```

### Run Specific Test Suite

```bash
# CRM tests only
NODE_OPTIONS='--experimental-vm-modules' npm test -- test/e2e/crm-workflow.e2e.test.ts

# E-Commerce tests only
NODE_OPTIONS='--experimental-vm-modules' npm test -- test/e2e/ecommerce-workflow.e2e.test.ts

# Project Management tests only
NODE_OPTIONS='--experimental-vm-modules' npm test -- test/e2e/project-workflow.e2e.test.ts
```

### Run Specific Test

```bash
# Run only CRM "Lead Lifecycle Workflow" tests
NODE_OPTIONS='--experimental-vm-modules' npm test -- crm-workflow.e2e.test.ts -t "Lead Lifecycle"

# Run only permission/access control tests
NODE_OPTIONS='--experimental-vm-modules' npm test -- -t "Access Control"
```

## Test Structure

Each test suite follows a consistent pattern:

```typescript
describe('Workflow Name', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    // Initialize app and authenticate
  });

  afterAll(async () => {
    // Clean up
  });

  describe('Feature Group', () => {
    it('should perform action and verify result', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/endpoint',
        headers: { Authorization: `Bearer ${token}` },
        payload: { /* test data */ },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });
});
```

## Test Data Management

### Test Users

Tests use pre-seeded test users:

```
Email: salesman@example.com | Role: sales_rep | ID: varies
Email: customer@example.com | Role: customer | ID: varies
Email: pm@example.com | Role: project_manager | ID: varies
Email: dev1@example.com | Role: developer | ID: varies
Email: admin@example.com | Role: admin/super_admin | ID: varies
```

### Data Isolation

Each test:
1. Creates fresh records via API
2. Operates on created data
3. Verifies expected outcomes
4. Does NOT depend on previous test data

This allows tests to run in any order and be run repeatedly.

### Seed Data

Optional: Pre-seed database for faster tests:

```bash
npm run seed:test-data
```

Provides pre-created products, leads, projects for tests that need them.

## Common Test Patterns

### 1. CRUD Operations

```typescript
// Create
const createRes = await app.inject({
  method: 'POST',
  url: '/api/entities/Entity/records',
  payload: { /* data */ },
});
const id = JSON.parse(createRes.body).data.id;

// Read
const readRes = await app.inject({
  method: 'GET',
  url: `/api/entities/Entity/records/${id}`,
});

// Update
const updateRes = await app.inject({
  method: 'PUT',
  url: `/api/entities/Entity/records/${id}`,
  payload: { /* changes */ },
});

// Delete
const deleteRes = await app.inject({
  method: 'DELETE',
  url: `/api/entities/Entity/records/${id}`,
});
```

### 2. Workflow Execution

```typescript
// Create record that triggers workflow
const response = await app.inject({
  method: 'POST',
  url: '/api/entities/Entity/records',
  payload: { /* triggers workflow */ },
});

// Wait for async workflow
await new Promise(resolve => setTimeout(resolve, 500));

// Verify workflow effects
const result = await app.inject({
  method: 'GET',
  url: `/api/entities/Entity/records/${id}`,
});
expect(result.data.fieldUpdatedByWorkflow).toBeDefined();
```

### 3. Permission Testing

```typescript
// Try authorized request
const allowed = await app.inject({
  method: 'GET',
  url: `/api/entities/Entity/records/${id}`,
  headers: { Authorization: `Bearer ${authorizedToken}` },
});
expect(allowed.statusCode).toBe(200);

// Try unauthorized request
const denied = await app.inject({
  method: 'GET',
  url: `/api/entities/Entity/records/${id}`,
  headers: { Authorization: `Bearer ${unauthorizedToken}` },
});
expect(denied.statusCode).toBe(403);
```

### 4. Query Testing

```typescript
const response = await app.inject({
  method: 'POST',
  url: '/api/query',
  payload: {
    entity: 'Entity',
    filters: [
      { field: 'status', operator: '==', value: 'active' },
      { field: 'score', operator: '>', value: '50' },
    ],
    search: 'search term',
    groupBy: 'category',
    aggregations: ['count', 'sum:amount'],
    orderBy: [{ field: 'score', order: 'desc' }],
    pagination: { page: 1, limit: 25 },
  },
});

expect(response.statusCode).toBe(200);
const data = JSON.parse(response.body);
expect(data.data).toBeInstanceOf(Array);
expect(data.aggregations).toBeDefined();
```

### 5. Computed Fields

```typescript
// Create record
const createRes = await app.inject({
  method: 'POST',
  url: '/api/entities/Lead/records',
  payload: {
    firstName: 'John',
    lastName: 'Doe',
  },
});

// Verify computed field
const data = JSON.parse(createRes.body);
expect(data.data.fullName).toBe('John Doe'); // Computed from firstName + lastName
```

## Assertions

Common assertions used in E2E tests:

```typescript
// HTTP status codes
expect(response.statusCode).toBe(200);
expect(response.statusCode).toBe(201);
expect([200, 201]).toContain(response.statusCode);

// Response structure
expect(data.success).toBe(true);
expect(data.data).toBeDefined();
expect(data.error).toBeUndefined();

// Data validation
expect(data.data.id).toBeDefined();
expect(data.data.name).toBe('expected value');
expect(data.data.status).toMatch(/active|inactive/);

// Array operations
expect(data.data).toBeInstanceOf(Array);
expect(data.data.length).toBeGreaterThan(0);
expect(data.data).toContainEqual(expect.objectContaining({ id: 1 }));

// Computed fields
expect(data.data.fullName).toBe(`${firstName} ${lastName}`);

// Permission enforcement
expect(response.statusCode).toBe(403); // Forbidden
```

## Debugging Tests

### Enable Verbose Logging

```bash
DEBUG=* NODE_OPTIONS='--experimental-vm-modules' npm test -- test/e2e/crm-workflow.e2e.test.ts
```

### Print Response Body

```typescript
if (response.statusCode !== 200) {
  console.log('Response:', JSON.stringify(response.body, null, 2));
}
```

### Slow Down Async Operations

Add delays to let workflows complete:

```typescript
// Wait for workflow
await new Promise(resolve => setTimeout(resolve, 1000));

// Verify results
const result = await app.inject({ /* ... */ });
```

### Check Database State Directly

```typescript
// If needed, query database directly (advanced)
const record = await prisma.lead.findUnique({ where: { id: leadId } });
console.log('DB Record:', record);
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        env:
          MYSQL_DATABASE: lume_test
          MYSQL_ROOT_PASSWORD: password

    steps:
      - uses: actions/checkout@v2
      
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      
      - run: npm run db:init -- --test
      
      - run: npm run test:e2e
        env:
          NODE_OPTIONS: --experimental-vm-modules
          DB_HOST: localhost
          DB_NAME: lume_test
```

## Performance Considerations

### Test Execution Time

- Each E2E test suite: ~2-5 seconds
- Full E2E run: ~15-20 seconds
- Parallel execution can reduce to ~10 seconds

### Database Setup

- Fresh database per test run
- Use test fixtures for speed
- Consider test data factories for complex setups

### Async/Workflow Timing

- Workflows are async
- Use `setTimeout()` for workflow completion
- Or poll until condition met:

```typescript
const waitForWorkflow = async (condition) => {
  let attempts = 0;
  while (attempts < 10) {
    if (await condition()) return true;
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  throw new Error('Workflow did not complete in time');
};
```

## Troubleshooting

### Tests Timeout

**Problem**: Tests hang waiting for response

**Solution**: Increase Jest timeout in `jest.config.cjs`:
```javascript
testTimeout: 10000 // 10 seconds
```

### Async Workflow Issues

**Problem**: Workflow changes not visible in next query

**Solution**: Add delay for async operations:
```typescript
await new Promise(r => setTimeout(r, 500));
```

### Authentication Failures

**Problem**: Bearer token invalid or expired

**Solution**: Authenticate fresh in beforeAll, not in individual tests

### Database State Conflicts

**Problem**: Tests interfere with each other

**Solution**: Each test creates fresh records, avoid shared state

### Port Already in Use

**Problem**: App fails to start on test port

**Solution**: Kill stray processes or use random port:
```typescript
const app = await NestFactory.create(AppModule);
await app.listen(0); // Random port
```

## Extending Tests

### Add New Test Suite

1. Create new file in `test/e2e/`
2. Follow existing patterns
3. Test full user workflow
4. Include permission/access tests
5. Add aggregation/analytics tests

Example template:

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

describe('New Workflow E2E', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'user@example.com', password: 'password' },
    });
    token = JSON.parse(loginRes.body).data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Feature', () => {
    it('should work', async () => {
      // Test implementation
    });
  });
});
```

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [API Testing Best Practices](../docs/DEVELOPMENT.md)
- [Example Workflows](../examples/README.md)
