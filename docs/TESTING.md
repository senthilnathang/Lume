# Lume Framework — Testing Guide

## Overview

Lume uses Jest with ESM support for backend unit testing and Vitest + Playwright for frontend testing.

| Component | Framework | Location |
|-----------|-----------|----------|
| Backend unit tests | Jest (ESM) | `backend/tests/unit/` |
| Frontend unit tests | Vitest | `frontend/apps/web-lume/` |
| E2E tests | Playwright | `frontend/apps/web-lume/` |

---

## Backend Testing (Jest)

### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test file
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/unit/module-loader.test.js

# Run with coverage
npm run test:coverage

# Watch mode
NODE_OPTIONS='--experimental-vm-modules' npx jest --watch

# Run tests matching a pattern
NODE_OPTIONS='--experimental-vm-modules' npx jest --testPathPattern="editor"
```

### Test Suites

| Suite | File | Tests | Description |
|-------|------|-------|-------------|
| Utils | `utils.test.js` | ~60 | Password hashing, JWT, date formatting, string utils |
| Security Service | `security-service.test.js` | ~25 | Security feature aggregation |
| Module Loader | `module-loader.test.js` | ~15 | Module discovery, dependency resolution, lifecycle |
| Manifests | `manifests.test.js` | ~50 | All 23 module manifests validation |
| Constants | `constants.test.js` | ~20 | HTTP codes, roles, messages constants |
| Error Handler | `error-handler.test.js` | ~30 | Global error handling middleware |
| Editor Service | `editor-service.test.js` | ~200 | Block extensions, views, renders, widget manager, Phase 9–18 |
| Website Service | `website-service.test.js` | ~100 | Manifest, schema tables, services, taxonomy, scheduling, locking |

**Total: 577 tests across 8 suites** (as of Phase 18).

### Configuration

Jest configuration is in `backend/jest.config.cjs`:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.{js,mjs,cjs}'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'json'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/scripts/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transform: {},  // ESM — no transforms needed
};
```

### ESM Requirements

The backend uses ES modules. Jest requires special configuration:

1. `transform: {}` in `jest.config.cjs` — disables CommonJS transforms
2. `NODE_OPTIONS='--experimental-vm-modules'` — enables ESM in Jest
3. Import jest globals explicitly:
   ```javascript
   import { jest } from '@jest/globals';
   ```

### Writing Tests

```javascript
import { jest } from '@jest/globals';
import { MyService } from '../../src/modules/my_module/services/my_module.service.js';

describe('MyService', () => {
  let service;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      findAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'Updated' }),
      destroy: jest.fn().mockResolvedValue(true),
      count: jest.fn().mockResolvedValue(0),
      getFields: jest.fn().mockReturnValue([]),
    };
    service = new MyService(mockAdapter);
  });

  describe('search', () => {
    test('should pass domain filters to adapter', async () => {
      const domain = [['status', '=', 'active']];
      await service.search({ where: domain });
      expect(mockAdapter.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: domain })
      );
    });
  });

  describe('create', () => {
    test('should create and return new record', async () => {
      const result = await service.create({ name: 'Test' });
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(mockAdapter.create).toHaveBeenCalledWith({ name: 'Test' });
    });
  });
});
```

### Testing Patterns

**Mocking Adapters**: Always mock the adapter layer. Tests should not touch the database.

```javascript
const mockAdapter = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};
```

**Testing Module Manifests**: Validate all modules have required fields.

```javascript
import fs from 'fs';
import path from 'path';

const modulesDir = path.join(process.cwd(), 'src/modules');
const modules = fs.readdirSync(modulesDir).filter(d =>
  fs.existsSync(path.join(modulesDir, d, '__manifest__.js'))
);

for (const mod of modules) {
  test(`${mod} manifest has required fields`, async () => {
    const manifest = await import(`../../src/modules/${mod}/__manifest__.js`);
    expect(manifest.default).toHaveProperty('name');
    expect(manifest.default).toHaveProperty('technicalName');
    expect(manifest.default).toHaveProperty('depends');
  });
}
```

---

## Frontend Testing

### Unit Tests (Vitest)

```bash
cd frontend/apps/web-lume
npm run test
```

### E2E Tests (Playwright)

```bash
cd frontend/apps/web-lume

# Install browsers
npm run test:e2e:install

# Run E2E tests
npm run test:e2e

# Run with HTML report
npm run test:e2e:report
```

### Available Frontend Scripts

```bash
npm run test              # Vitest unit tests
npm run test:e2e          # Playwright E2E tests
npm run test:e2e:report   # Playwright with HTML report
npm run test:e2e:install  # Install Playwright browsers
npm run typecheck         # TypeScript type checking
npm run lint              # ESLint
npm run lint:fix          # ESLint with auto-fix
```

---

## Coverage

Generate and view coverage reports:

```bash
cd backend
npm run test:coverage

# Coverage report is generated in backend/coverage/
# Open backend/coverage/lcov-report/index.html in a browser
```

Coverage is collected from all `src/**/*.js` files, excluding entry points and scripts.

---

## Integration Testing (Phase 7)

Integration tests verify complete workflows across multiple systems (API, database, authentication, caching).

### Location

```
backend/tests/integration/
├── auth-workflow.test.js          # Authentication workflows
├── website-workflow.test.js        # CMS page and menu management
└── performance-benchmark.test.js   # Performance SLA validation
```

### Running Integration Tests

```bash
cd backend

# Run all integration tests
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration

# Run specific integration test file
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration/auth-workflow.test.js

# Run integration tests with timeout extension (60 seconds)
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration --testTimeout=60000
```

### Integration Test Suites

#### 1. Authentication Workflow (`auth-workflow.test.js`)

Tests complete user authentication lifecycle:

- **Registration** → Create new user account
- **Login** → Authenticate and receive JWT + refresh token
- **Protected Access** → Use token to access secured endpoints
- **Token Refresh** → Request new token with refresh token
- **Rate Limiting** → Verify brute-force protection on auth endpoints

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration/auth-workflow.test.js
```

#### 2. Website Module Workflow (`website-workflow.test.js`)

Tests CMS functionality (Pages, Menus, Settings):

- **Page Creation** → Create new pages with TipTap content
- **Page Updates** → Modify page content and metadata
- **List Pagination** → Fetch pages with pagination
- **Menu Management** → Create and reorder menu items
- **Public API** → Access content without authentication

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration/website-workflow.test.js
```

#### 3. Performance Benchmarks (`performance-benchmark.test.js`)

Validates response time SLAs and system performance:

**Response Time SLAs:**
- Health check: < 50ms
- Public config: < 100ms
- List endpoints: < 500ms
- Single record fetch: < 200ms

**Caching Efficiency:**
- Cache HIT on subsequent requests
- Cached responses faster than cache misses

**Throughput:**
- 50 concurrent health checks: < 2 seconds
- 20 concurrent login requests: < 5 seconds

**Trace IDs & Error Tracking:**
- All responses include `X-Trace-ID` header
- Error counts by type are tracked

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration/performance-benchmark.test.js
```

### Integration Test Best Practices

✅ **Do:**
- Test complete workflows end-to-end
- Use real database (or test database) for data persistence
- Clean up test data after each test
- Verify cache headers and metrics
- Test both success and failure paths
- Use descriptive test names
- Include setup/teardown for test isolation

❌ **Don't:**
- Mock everything (defeats purpose of integration testing)
- Depend on test execution order
- Leave test data in database
- Test third-party libraries
- Create long-running tests (target < 30s each)

### Test Database Setup

Integration tests use a dedicated test database:

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE lume_test;"

# Set in .env or .env.test
NODE_ENV=test
DATABASE_URL="mysql://user:pass@localhost/lume_test"
```

### Debugging Integration Tests

```bash
# Run single test with verbose output
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration/auth-workflow.test.js --verbose

# Enable debug logging
DEBUG=* NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration

# Run in watch mode for iterative development
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/integration --watch
```

### CI/CD Integration

Integration tests run on every commit to the `framework` branch:

```yaml
# Example GitHub Actions workflow
- name: Run integration tests
  run: |
    cd backend
    NODE_OPTIONS='--experimental-vm-modules' npm run test -- tests/integration
```

### Performance Regression Prevention

The performance benchmark tests prevent regressions by verifying:
- Response times don't exceed SLA thresholds
- Cache hit rates are consistent
- Error rates remain low
- System can handle concurrent load

Review performance reports after each test run to catch degradation early.
