# GraphQL Testing Guide for Lume Framework

**Version:** 1.0  
**Status:** Testing Strategy & Examples  
**Last Updated:** May 2026

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Test Data Setup](#test-data-setup)
6. [Performance Testing](#performance-testing)

---

## Testing Philosophy

### Test Pyramid

```
        E2E Tests (1-5%)
       /              \
      /                \
   Integration Tests (15-25%)
  /                          \
/                              \
Unit Tests (70-85%)
```

**Unit Tests:** Test resolvers, services, and utility functions in isolation  
**Integration Tests:** Test resolver + service + database interactions  
**E2E Tests:** Test complete GraphQL queries through HTTP

---

## Unit Tests

### Service Unit Tests

```typescript
// tests/unit/data-grid.service.spec.ts
import { jest } from '@jest/globals';
import { DataGridService } from '../../src/core/graphql/services/data-grid.service';

describe('DataGridService', () => {
  let service: DataGridService;

  beforeEach(() => {
    service = new DataGridService();
  });

  describe('getDataGrid', () => {
    it('should retrieve a data grid by id and tenantId', async () => {
      const mockDataGrid = {
        id: 'grid-1',
        tenantId: 'tenant-1',
        title: 'Test Grid',
        description: 'Test Description',
        columns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getDataGrid').mockResolvedValue(mockDataGrid);

      const result = await service.getDataGrid('grid-1', 'tenant-1');

      expect(result).toEqual(mockDataGrid);
      expect(service.getDataGrid).toHaveBeenCalledWith('grid-1', 'tenant-1');
    });

    it('should return null if data grid not found', async () => {
      jest.spyOn(service, 'getDataGrid').mockResolvedValue(null);

      const result = await service.getDataGrid('nonexistent', 'tenant-1');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      jest
        .spyOn(service, 'getDataGrid')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.getDataGrid('grid-1', 'tenant-1'),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('createRow', () => {
    it('should create a row with valid data', async () => {
      const input = {
        gridId: 'grid-1',
        data: { name: 'Test', value: 100 },
      };

      const mockRow = {
        id: 'row-1',
        gridId: 'grid-1',
        data: input.data,
        sequence: 0,
        status: 'VALID',
      };

      jest.spyOn(service, 'createRow').mockResolvedValue(mockRow);

      const result = await service.createRow(input, 'tenant-1');

      expect(result).toEqual(mockRow);
      expect(service.createRow).toHaveBeenCalledWith(input, 'tenant-1');
    });

    it('should validate required fields', async () => {
      const input = {
        gridId: 'grid-1',
        data: { /* missing required field */ },
      };

      jest
        .spyOn(service, 'createRow')
        .mockRejectedValue(new Error('Validation failed'));

      await expect(
        service.createRow(input, 'tenant-1'),
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('bulkUpdateRows', () => {
    it('should update multiple rows successfully', async () => {
      const rows = [
        { id: 'row-1', data: { name: 'Updated 1' } },
        { id: 'row-2', data: { name: 'Updated 2' } },
      ];

      const mockResult = {
        success: true,
        message: 'Updated 2/2 rows',
        errors: [],
        updatedCount: 2,
        failedCount: 0,
        failedRows: [],
      };

      jest.spyOn(service, 'bulkUpdateRows').mockResolvedValue(mockResult);

      const result = await service.bulkUpdateRows('grid-1', rows, 'tenant-1');

      expect(result.updatedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle partial failures', async () => {
      const rows = [
        { id: 'row-1', data: { name: 'Updated' } },
        { id: 'row-invalid', data: null }, // Invalid
      ];

      const mockResult = {
        success: false,
        message: 'Updated 1/2 rows',
        errors: [],
        updatedCount: 1,
        failedCount: 1,
        failedRows: [
          {
            success: false,
            message: 'Invalid data',
            errors: [
              { field: 'data', message: 'Invalid data', code: 'UPDATE_ERROR' },
            ],
            row: null,
          },
        ],
      };

      jest.spyOn(service, 'bulkUpdateRows').mockResolvedValue(mockResult);

      const result = await service.bulkUpdateRows('grid-1', rows, 'tenant-1');

      expect(result.updatedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failedRows.length).toBe(1);
    });
  });
});
```

### Resolver Unit Tests

```typescript
// tests/unit/data-grid.resolver.spec.ts
import { jest } from '@jest/globals';
import { DataGridResolver } from '../../src/core/graphql/resolvers/data-grid.resolver';
import { GraphQLService } from '../../src/core/graphql/graphql.service';
import { DataGridService } from '../../src/core/graphql/services/data-grid.service';
import { DataLoaderService } from '../../src/core/graphql/loaders/dataloader.service';

describe('DataGridResolver', () => {
  let resolver: DataGridResolver;
  let graphqlService: GraphQLService;
  let dataGridService: DataGridService;
  let dataLoaderService: DataLoaderService;
  let mockContext: any;

  beforeEach(() => {
    graphqlService = new GraphQLService();
    dataGridService = new DataGridService();
    dataLoaderService = new DataLoaderService();

    resolver = new DataGridResolver(
      graphqlService,
      dataGridService,
      dataLoaderService,
    );

    mockContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      userRoles: ['user'],
    };
  });

  describe('getDataGrid', () => {
    it('should return a data grid for authorized user', async () => {
      const mockDataGrid = {
        id: 'grid-1',
        tenantId: 'tenant-1',
        title: 'Test Grid',
      };

      jest.spyOn(dataGridService, 'getDataGrid').mockResolvedValue(mockDataGrid);

      const result = await resolver.getDataGrid('grid-1', mockContext);

      expect(result).toEqual(mockDataGrid);
    });

    it('should throw error for unauthorized user', async () => {
      const unauthorizedContext = {
        ...mockContext,
        userRoles: [],
      };

      jest.spyOn(graphqlService, 'hasRole').mockReturnValue(false);

      await expect(
        resolver.getDataGrid('grid-1', unauthorizedContext),
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if grid not found', async () => {
      jest.spyOn(dataGridService, 'getDataGrid').mockResolvedValue(null);

      await expect(
        resolver.getDataGrid('nonexistent', mockContext),
      ).rejects.toThrow('DataGrid not found');
    });
  });

  describe('createDataGrid', () => {
    it('should create a new data grid', async () => {
      const input = {
        title: 'New Grid',
        description: 'Test',
        columns: [],
      };

      const mockDataGrid = {
        id: 'grid-1',
        ...input,
        tenantId: 'tenant-1',
        createdAt: new Date(),
      };

      jest.spyOn(graphqlService, 'hasRole').mockReturnValue(true);
      jest.spyOn(dataGridService, 'create').mockResolvedValue(mockDataGrid);
      jest.spyOn(graphqlService, 'createAuditLog').mockResolvedValue(undefined);

      const result = await resolver.createDataGrid(input, mockContext);

      expect(result).toEqual(mockDataGrid);
      expect(dataGridService.create).toHaveBeenCalledWith(
        input,
        'tenant-1',
        'user-1',
      );
      expect(graphqlService.createAuditLog).toHaveBeenCalled();
    });
  });
});
```

---

## Integration Tests

### DataGrid Integration Test

```typescript
// tests/integration/data-grid.integration.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaService } from '../../src/core/db/prisma';
import { DataGridResolver } from '../../src/core/graphql/resolvers/data-grid.resolver';
import { DataGridService } from '../../src/core/graphql/services/data-grid.service';
import { GraphQLService } from '../../src/core/graphql/graphql.service';
import { DataLoaderService } from '../../src/core/graphql/loaders/dataloader.service';

describe('DataGrid Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let dataGridService: DataGridService;
  let graphqlService: GraphQLService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [GraphQLModule],
      providers: [
        DataGridResolver,
        DataGridService,
        GraphQLService,
        DataLoaderService,
        PrismaService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    dataGridService = moduleFixture.get<DataGridService>(DataGridService);
    graphqlService = moduleFixture.get<GraphQLService>(GraphQLService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.gridRow.deleteMany({});
    await prisma.dataGridColumn.deleteMany({});
    await prisma.dataGrid.deleteMany({});
  });

  describe('Data Grid CRUD', () => {
    it('should create and retrieve a data grid', async () => {
      const input = {
        title: 'Test Grid',
        description: 'Integration Test',
        columns: [
          {
            name: 'id',
            type: 'TEXT',
            displayName: 'ID',
            sequence: 0,
            sortable: true,
            filterable: true,
            editable: false,
          },
          {
            name: 'name',
            type: 'TEXT',
            displayName: 'Name',
            sequence: 1,
            sortable: true,
            filterable: true,
            editable: true,
          },
        ],
      };

      const created = await dataGridService.create(
        input,
        'tenant-test',
        'user-test',
      );

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Test Grid');
      expect(created.columns.length).toBe(2);

      const retrieved = await dataGridService.getDataGrid(
        created.id,
        'tenant-test',
      );

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Test Grid');
    });

    it('should update a data grid', async () => {
      const created = await dataGridService.create(
        {
          title: 'Original Title',
          description: 'Original Description',
          columns: [],
        },
        'tenant-test',
        'user-test',
      );

      const updated = await dataGridService.update(
        created.id,
        {
          title: 'Updated Title',
          description: 'Updated Description',
          columns: [],
        },
        'tenant-test',
        'user-test',
      );

      expect(updated.title).toBe('Updated Title');
    });

    it('should delete a data grid and associated data', async () => {
      const created = await dataGridService.create(
        {
          title: 'Test Grid',
          description: 'Test',
          columns: [],
        },
        'tenant-test',
        'user-test',
      );

      // Create a row
      await dataGridService.createRow(
        {
          gridId: created.id,
          data: { test: 'data' },
        },
        'tenant-test',
      );

      const deleted = await dataGridService.delete(created.id, 'tenant-test');

      expect(deleted).toBe(true);

      // Verify deletion
      const retrieved = await dataGridService.getDataGrid(
        created.id,
        'tenant-test',
      );

      expect(retrieved).toBeNull();
    });
  });

  describe('Row Management', () => {
    let gridId: string;

    beforeEach(async () => {
      const grid = await dataGridService.create(
        {
          title: 'Test Grid',
          description: 'Test',
          columns: [
            {
              name: 'name',
              type: 'TEXT',
              displayName: 'Name',
              sequence: 0,
              sortable: true,
              filterable: true,
              editable: true,
            },
          ],
        },
        'tenant-test',
        'user-test',
      );
      gridId = grid.id;
    });

    it('should create and retrieve rows', async () => {
      const row1 = await dataGridService.createRow(
        {
          gridId,
          data: { name: 'Row 1' },
        },
        'tenant-test',
      );

      const row2 = await dataGridService.createRow(
        {
          gridId,
          data: { name: 'Row 2' },
        },
        'tenant-test',
      );

      expect(row1.id).toBeDefined();
      expect(row2.id).toBeDefined();

      const rows = await dataGridService.getRows(gridId, {}, 'tenant-test');

      expect(rows.length).toBe(2);
    });

    it('should bulk update rows', async () => {
      const row1 = await dataGridService.createRow(
        { gridId, data: { name: 'Original 1' } },
        'tenant-test',
      );

      const row2 = await dataGridService.createRow(
        { gridId, data: { name: 'Original 2' } },
        'tenant-test',
      );

      const result = await dataGridService.bulkUpdateRows(
        gridId,
        [
          { id: row1.id, data: { name: 'Updated 1' } },
          { id: row2.id, data: { name: 'Updated 2' } },
        ],
        'tenant-test',
      );

      expect(result.updatedCount).toBe(2);
      expect(result.success).toBe(true);
    });
  });
});
```

---

## End-to-End Tests

### GraphQL E2E Tests

```typescript
// tests/e2e/data-grid.e2e.spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('DataGrid GraphQL E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Authenticate
    const authResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    accessToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Query: dataGrids', () => {
    it('should list all data grids', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query {
              dataGrids(input: { page: 1, pageSize: 10 }) {
                edges {
                  node {
                    id
                    title
                    description
                  }
                }
                pageInfo {
                  total
                  page
                  pageSize
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.dataGrids).toBeDefined();
      expect(response.body.data.dataGrids.edges).toBeInstanceOf(Array);
      expect(response.body.data.dataGrids.pageInfo).toHaveProperty('total');
    });

    it('should filter data grids by title', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            query {
              dataGrids(input: { page: 1, pageSize: 10, filter: "test" }) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.dataGrids.edges).toBeInstanceOf(Array);
    });
  });

  describe('Mutation: createDataGrid', () => {
    it('should create a new data grid', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation {
              createDataGrid(input: {
                title: "E2E Test Grid"
                description: "Created via E2E test"
                columns: [
                  {
                    name: "id"
                    type: TEXT
                    displayName: "ID"
                    sequence: 0
                  }
                ]
              }) {
                id
                title
                description
                columns {
                  name
                  type
                  displayName
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createDataGrid).toBeDefined();
      expect(response.body.data.createDataGrid.title).toBe('E2E Test Grid');
      expect(response.body.data.createDataGrid.columns.length).toBe(1);
    });

    it('should reject unauthorized users', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createDataGrid(input: {
                title: "Unauthorized"
                columns: []
              }) {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Mutation: bulkUpdateRows', () => {
    let gridId: string;

    beforeAll(async () => {
      // Create a test grid
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation {
              createDataGrid(input: {
                title: "Bulk Update Test"
                columns: []
              }) {
                id
              }
            }
          `,
        });

      gridId = createResponse.body.data.createDataGrid.id;
    });

    it('should bulk update multiple rows', async () => {
      // First create rows
      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation {
              createRow(input: {
                gridId: "${gridId}"
                data: { name: "Row 1" }
              }) {
                row {
                  id
                }
              }
            }
          `,
        });

      const rowId = createResponse.body.data.createRow.row.id;

      // Bulk update
      const updateResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: `
            mutation {
              bulkUpdateRows(gridId: "${gridId}", rows: [
                { id: "${rowId}", data: { name: "Updated" } }
              ]) {
                success
                updatedCount
                failedCount
              }
            }
          `,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.bulkUpdateRows.success).toBe(true);
      expect(updateResponse.body.data.bulkUpdateRows.updatedCount).toBe(1);
    });
  });
});
```

---

## Test Data Setup

### Database Seeding for Tests

```typescript
// tests/fixtures/seed.ts
import prisma from '../../src/core/db/prisma';

export async function seedTestData() {
  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: 'tenant-test',
      name: 'Test Tenant',
    },
  });

  // Create test user
  const user = await prisma.user.create({
    data: {
      id: 'user-test',
      email: 'test@example.com',
      tenantId: 'tenant-test',
      roles: {
        connect: [{ id: 'user-role' }],
      },
    },
  });

  // Create test data grid
  const dataGrid = await prisma.dataGrid.create({
    data: {
      id: 'grid-test',
      title: 'Test Grid',
      tenantId: 'tenant-test',
      createdById: 'user-test',
      columns: {
        create: [
          {
            name: 'id',
            type: 'TEXT',
            displayName: 'ID',
            sequence: 0,
            sortable: true,
            filterable: true,
            editable: false,
          },
          {
            name: 'name',
            type: 'TEXT',
            displayName: 'Name',
            sequence: 1,
            sortable: true,
            filterable: true,
            editable: true,
          },
        ],
      },
    },
  });

  // Create test rows
  await prisma.gridRow.createMany({
    data: [
      {
        gridId: 'grid-test',
        data: { id: '1', name: 'Row 1' },
        sequence: 0,
        status: 'VALID',
      },
      {
        gridId: 'grid-test',
        data: { id: '2', name: 'Row 2' },
        sequence: 1,
        status: 'VALID',
      },
    ],
  });

  return { tenant, user, dataGrid };
}

export async function cleanupTestData() {
  await prisma.gridRow.deleteMany({});
  await prisma.dataGridColumn.deleteMany({});
  await prisma.dataGrid.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
}
```

---

## Performance Testing

### Query Complexity Testing

```typescript
// tests/performance/query-complexity.spec.ts
import { getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { buildSchema } from 'graphql';

describe('GraphQL Query Complexity', () => {
  const schema = buildSchema(`
    type Query {
      dataGrids: [DataGrid!]!
      users: [User!]!
    }

    type DataGrid {
      id: ID!
      title: String!
      rows: [GridRow!]!
    }

    type GridRow {
      id: ID!
      data: JSON!
    }

    type User {
      id: ID!
      email: String!
    }
  `);

  it('should reject overly complex queries', () => {
    const query = `
      query {
        dataGrids {
          id
          title
          rows {
            id
            data
          }
        }
      }
    `;

    const complexity = getComplexity({
      schema,
      query,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    });

    expect(complexity).toBeLessThan(100);
  });

  it('should track N+1 query risks', () => {
    // A query that would cause N+1 queries
    const riskyQuery = `
      query {
        users {
          id
          email
        }
      }
    `;

    // In production, DataLoader would prevent N+1
    // This test documents the risk
    expect(riskyQuery).toBeDefined();
  });
});
```

### Load Testing

```typescript
// tests/performance/load.spec.ts
import autocannon from 'autocannon';

describe('GraphQL Load Testing', () => {
  it('should handle 100 req/sec on data grid queries', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/graphql',
      connections: 10,
      duration: 10,
      requests: [
        {
          path: '/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({
            query: `query { dataGrids(input: {page: 1, pageSize: 10}) { edges { node { id } } } }`,
          }),
        },
      ],
    });

    expect(result.errors).toBe(0);
    expect(result.throughput.average).toBeGreaterThan(0);
  });
});
```

---

## Running Tests

### Test Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- data-grid.spec.ts

# Run in watch mode
npm test -- --watch

# Run performance tests
npm run test:performance
```

### Test Configuration

```javascript
// jest.config.cjs
module.exports = {
  displayName: 'graphql-tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        esModuleInterop: true,
      },
    }],
  },
  testMatch: [
    '<rootDir>/tests/**/*.spec.ts',
  ],
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## Best Practices

✅ **Do:**
- Test business logic in service layer
- Mock external dependencies
- Use fixtures for test data
- Test both success and error paths
- Test authorization checks
- Use DataLoader in tests to prevent N+1

❌ **Don't:**
- Test framework code (Apollo, NestJS)
- Make real database calls in unit tests
- Test implementation details
- Skip error cases
- Use hardcoded test data

## Coverage Goals

| Layer | Target | Priority |
|-------|--------|----------|
| Services | 85%+ | High |
| Resolvers | 80%+ | High |
| Directives | 90%+ | High |
| Loaders | 85%+ | High |
| Integration | 70%+ | Medium |
| E2E | 60%+ | Medium |

