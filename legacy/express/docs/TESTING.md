# Lume Framework -- Testing Documentation

## Table of Contents

- [Testing Stack](#testing-stack)
- [Configuration](#configuration)
- [Test Directory Structure](#test-directory-structure)
- [Writing Tests](#writing-tests)
- [Test Suites](#test-suites)
- [Running Tests](#running-tests)
- [Mocking Patterns for ESM](#mocking-patterns-for-esm)
- [Testing API Endpoints](#testing-api-endpoints)

---

## Testing Stack

| Tool        | Purpose                  | Version |
|-------------|--------------------------|---------|
| Jest        | Test runner and assertions | ^29.7.0 |
| supertest   | HTTP endpoint testing     | ^7.2.2  |

Jest runs with ESM support enabled via `NODE_OPTIONS='--experimental-vm-modules'`.

---

## Configuration

### jest.config.cjs

The Jest configuration file uses CommonJS format (`.cjs` extension) because Jest's config loading does not support ESM:

```js
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
  transform: {},  // CRITICAL: Empty transform disables default Babel transform for ESM
};
```

Key settings:

| Setting                 | Value               | Why                                    |
|-------------------------|---------------------|----------------------------------------|
| `testEnvironment`       | `node`              | Backend tests, not browser.            |
| `transform`             | `{}`                | **Required for ESM.** Disables Babel transform so Node handles ESM natively. |
| `testTimeout`           | `30000`             | 30-second timeout for async operations.|
| `setupFilesAfterEnv`    | `tests/setup.js`    | Global test setup (e.g., env vars).    |

### ESM Requirement

The `test` script in `package.json` sets the required Node flag:

```json
{
  "test": "NODE_OPTIONS='--experimental-vm-modules' jest"
}
```

Without `--experimental-vm-modules`, Jest cannot import ES modules and will fail with `SyntaxError: Cannot use import statement outside a module`.

---

## Test Directory Structure

```
backend/
  tests/
    setup.js                    # Global test setup (runs before all suites)
    unit/
      utils.test.js             # Shared utility tests
      security-service.test.js  # SecurityService tests
      module-loader.test.js     # Module loader tests
      manifests.test.js         # Manifest validation tests
      constants.test.js         # Constants tests
      error-handler.test.js     # Error handler middleware tests
```

All test files live under `tests/unit/` and use the `.test.js` extension.

---

## Writing Tests

### Basic Test Structure

```js
import { jest } from '@jest/globals';  // REQUIRED for ESM

describe('MyService', () => {
  let service;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return the expected result', async () => {
    const result = await service.doSomething('input');

    expect(result).toBeDefined();
    expect(result.status).toBe('success');
    expect(result.items).toHaveLength(3);
  });

  it('should throw on invalid input', async () => {
    await expect(service.doSomething(null))
      .rejects
      .toThrow('Input is required');
  });
});
```

### Important: Import Jest Globals

In ESM mode, Jest globals (`jest`, `expect`, `describe`, `it`, etc.) are available automatically **except** the `jest` object itself. You **must** explicitly import it:

```js
import { jest } from '@jest/globals';
```

`describe`, `it`, `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll` are injected globally and do not need importing.

### Common Assertions

```js
// Equality
expect(value).toBe(42);              // Strict equality
expect(obj).toEqual({ a: 1 });       // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(count).toBeGreaterThan(0);
expect(count).toBeLessThanOrEqual(100);

// Strings
expect(message).toMatch(/success/i);
expect(str).toContain('substring');

// Arrays
expect(arr).toHaveLength(5);
expect(arr).toContain('item');
expect(arr).toEqual(expect.arrayContaining(['a', 'b']));

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('nested.field', 'value');
expect(obj).toMatchObject({ status: 'active' });

// Exceptions
expect(() => func()).toThrow();
expect(() => func()).toThrow('specific message');
await expect(asyncFunc()).rejects.toThrow();

// Functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(3);
```

---

## Test Suites

The project currently has **270 tests across 6 suites**:

### utils.test.js

Tests for shared utility functions:

- `passwordUtil` -- hashing, verification, validation
- `jwtUtil` -- token generation, verification, refresh tokens
- `dateUtil` -- formatting, relative time, date arithmetic
- `stringUtil` -- slugify, truncate, masking
- `fileUtil` -- extension extraction, size formatting
- `validationUtil` -- email, phone, URL validation
- `objectUtil` -- clean, pick, omit, deepClone
- `responseUtil` -- success, error, paginated response formatting

### security-service.test.js

Tests for `SecurityService`:

- Permission checking (`check_access`)
- Admin bypass behavior
- Record rule evaluation
- Domain matching logic
- Operator comparisons (`=`, `!=`, `>`, `<`, `in`, `not in`, `like`)

### module-loader.test.js

Tests for the module system (`__loader__.js`):

- Module discovery and loading
- Manifest parsing
- Dependency resolution (topological sort)
- Circular dependency detection
- Module initialization lifecycle
- Install/uninstall hook execution

### manifests.test.js

Tests that validate all module manifests:

- Required fields are present (name, version, depends)
- Permission naming conventions
- Menu structure validation
- Dependency references point to existing modules

### constants.test.js

Tests for shared constants:

- HTTP status code values
- Message strings are defined
- Enum completeness
- Cache key function behavior

### error-handler.test.js

Tests for error handling middleware:

- 404 not found handler
- Generic error handler response format
- Error status code mapping
- Stack trace inclusion in development mode

---

## Running Tests

### Run All Tests

```bash
npm test
```

This executes: `NODE_OPTIONS='--experimental-vm-modules' jest`

### Run Tests with Coverage

```bash
npm run test:coverage
```

Coverage reports are written to the `coverage/` directory in both text (terminal) and lcov (HTML) formats.

### Run a Specific Test File

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest tests/unit/utils.test.js
```

### Run Tests Matching a Pattern

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest --testPathPattern="security"
```

### Run a Specific Test by Name

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest -t "should hash password"
```

### Watch Mode

```bash
NODE_OPTIONS='--experimental-vm-modules' npx jest --watch
```

---

## Mocking Patterns for ESM

### jest.unstable_mockModule

In ESM, the standard `jest.mock()` does not work because `import` statements are hoisted. Use `jest.unstable_mockModule` instead:

```js
import { jest } from '@jest/globals';

// Mock BEFORE importing the module under test
jest.unstable_mockModule('../../core/db/prisma.js', () => ({
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Import AFTER setting up the mock
const prisma = (await import('../../core/db/prisma.js')).default;
const { UserService } = await import('../../src/modules/user/service.js');
```

### Mocking a Specific Function

```js
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../shared/utils/index.js', () => ({
  jwtUtil: {
    generateToken: jest.fn().mockReturnValue('mock-token'),
    verifyToken: jest.fn().mockReturnValue({ id: 1, email: 'test@test.com' }),
  },
  responseUtil: {
    success: jest.fn((data) => ({ success: true, data })),
    error: jest.fn((msg) => ({ success: false, error: { message: msg } })),
  },
}));
```

### Spying on Methods

```js
import { jest } from '@jest/globals';

const spy = jest.spyOn(service, 'search');
spy.mockResolvedValue({ items: [], total: 0 });

await service.search({ page: 1 });

expect(spy).toHaveBeenCalledWith({ page: 1 });
spy.mockRestore();
```

### Manual Mocks

For complex mocking scenarios, create a `__mocks__` directory next to the module:

```
src/core/db/
  prisma.js
  __mocks__/
    prisma.js     # Manual mock
```

---

## Testing API Endpoints

Use `supertest` to test Express routes without starting a real HTTP server.

### Basic Endpoint Test

```js
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Set up a minimal Express app with the route under test
const app = express();
app.use(express.json());

// Mock auth middleware to always pass
jest.unstable_mockModule('../../core/middleware/auth.js', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 1, email: 'test@test.com', role: 'admin' };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

const { default: createRoutes } = await import('../../src/modules/mymodule/api/index.js');

// Mount routes
const mockAdapters = { /* ... */ };
const mockServices = { /* ... */ };
app.use('/api/mymodule', createRoutes(mockAdapters, mockServices));

describe('GET /api/mymodule/items', () => {
  it('should return items list', async () => {
    const res = await request(app)
      .get('/api/mymodule/items')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should create an item', async () => {
    const res = await request(app)
      .post('/api/mymodule/items')
      .send({ name: 'Test Item', status: 'draft' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Item');
  });
});
```

### Testing Error Responses

```js
it('should return 404 for missing record', async () => {
  const res = await request(app)
    .get('/api/mymodule/items/999')
    .expect(404);

  expect(res.body.success).toBe(false);
  expect(res.body.error).toContain('not found');
});

it('should return 400 for invalid input', async () => {
  const res = await request(app)
    .post('/api/mymodule/items')
    .send({})  // Missing required fields
    .expect(400);

  expect(res.body.success).toBe(false);
});
```

### Testing Authenticated Endpoints

```js
it('should return 401 without token', async () => {
  // Use a fresh app without mocked auth
  const realApp = express();
  realApp.use(express.json());
  // Mount with real auth middleware
  // ...

  const res = await request(realApp)
    .get('/api/protected')
    .expect(401);

  expect(res.body.success).toBe(false);
});
```
