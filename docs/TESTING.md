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
