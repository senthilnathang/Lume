# Playwright E2E Tests

Comprehensive end-to-end testing infrastructure for Lume admin dashboard using Playwright.

## Setup

### Prerequisites
- Node.js >= 20.12.0
- Lume backend running on `http://localhost:3001`
- Admin app dev server running on `http://localhost:5173`

### Installation

```bash
cd frontend
npm install -D @playwright/test
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in headed mode (visible browser)
```bash
npm run test:e2e:headed
```

### Debug mode (interactive debugging)
```bash
npm run test:e2e:debug
```

### UI mode (interactive test runner)
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test tests/e2e/auth.spec.ts
```

### Run tests matching pattern
```bash
npx playwright test --grep @authentication
```

## Project Structure

```
tests/e2e/
├── auth.spec.ts              # Authentication tests
├── helpers/
│   └── ui-helpers.ts         # UI interaction abstractions
├── fixtures/
│   ├── auth.fixture.ts       # Authentication fixtures & setup
│   └── data-factory.ts       # Test data creation via API
└── .gitignore
```

## Fixtures

### Auth Fixture (`fixtures/auth.fixture.ts`)

Provides pre-authenticated contexts for testing:

```typescript
import { test } from './fixtures/auth.fixture';

test('admin can manage users', async ({ adminPage }) => {
  await adminPage.goto('/users');
  // authenticated as admin@lume.dev
});

test('regular user has limited access', async ({ userPage }) => {
  await userPage.goto('/dashboard');
  // authenticated as user@lume.dev
});
```

**Available fixtures:**
- `authenticatedPage` - Basic authenticated page context
- `adminPage` - Page authenticated as admin@lume.dev
- `userPage` - Page authenticated as user@lume.dev

### Data Factory (`fixtures/data-factory.ts`)

Create test data via API:

```typescript
import { dataFactory } from './fixtures/data-factory';

const user = await dataFactory.createUser({
  email: 'test@example.com',
  firstName: 'Test',
});

const page = await dataFactory.createPage({
  title: 'Test Page',
  slug: 'test-page',
});

// Cleanup
await dataFactory.deleteUser(user.id);
await dataFactory.deletePage(page.id);
```

**Available factories:**
- `createUser(data)` - Create a test user
- `createPage(data)` - Create a test page with TipTap content
- `createMenu(data)` - Create a test menu
- `createForm(data)` - Create a test form

## UI Helpers (`helpers/ui-helpers.ts`)

Common UI interactions abstracted into reusable helpers:

### Form Interactions

```typescript
import { fillForm, submitForm } from './helpers/ui-helpers';

// Fill form by label
await fillForm(page, {
  'Email': 'user@example.com',
  'Password': 'password123',
  'Remember me': true,
});

// Submit and wait for navigation
await submitForm(page, { waitForUrl: '/dashboard' });
```

### Table Interactions

```typescript
import { waitForTable, getTableData, clickTableAction } from './helpers/ui-helpers';

// Wait for table to load
await waitForTable(page, { minRows: 5 });

// Get table data as array of objects
const data = await getTableData(page);
console.log(data[0]); // { Name: 'John', Email: 'john@example.com' }

// Click action in specific row
await clickTableAction(page, 'John', 'Edit');
```

### Drawer/Modal

```typescript
import { openDrawer, closeDrawer } from './helpers/ui-helpers';

// Open action drawer
await openDrawer(page, 'create');
await fillForm(page, { Title: 'New Item' });
await submitForm(page);

// Close drawer
await closeDrawer(page);
```

### Dropdown Selection

```typescript
import { selectDropdown } from './helpers/ui-helpers';

await selectDropdown(page, 'Status', 'Published');
```

### File Upload

```typescript
import { uploadFile } from './helpers/ui-helpers';

await uploadFile(page, 'input[type="file"]', './fixtures/test-image.png');
```

### Messages

```typescript
import { expectSuccessMessage, expectErrorMessage } from './helpers/ui-helpers';

await expectSuccessMessage(page);
await expectErrorMessage(page, { text: 'Required field' });
```

## Configuration

### playwright.config.ts

Located at `/opt/Lume/frontend/playwright.config.ts`

Key settings:
- **Base URL**: `http://localhost:5173` (dev) or staging
- **Timeout**: 30s default
- **Browsers**: Chromium, Firefox
- **Workers**: 4 parallel (CI: 1)
- **Retries**: 0 (dev), 2 (CI)
- **Artifacts**:
  - Screenshots on failure
  - Videos on failure
  - Traces on first retry

## Test Data Management

### Auth State Caching

Auth states are cached in `auth-states/` directory:
- `admin-auth.json` - Admin session
- `user-auth.json` - User session

This speeds up tests by reusing auth state instead of logging in each time.

### Cleanup

Always cleanup created test data:

```typescript
test('create and delete user', async ({ page }) => {
  const user = await dataFactory.createUser();

  // Test assertions...

  // Cleanup
  await dataFactory.deleteUser(user.id);
});
```

## Test Patterns

### Basic Test

```typescript
test('should login successfully', async ({ page }) => {
  await page.goto('/');
  await fillForm(page, {
    'Email': 'admin@lume.dev',
    'Password': 'admin123',
  });
  await submitForm(page, { waitForUrl: '/dashboard' });
  expect(page.url()).toContain('/dashboard');
});
```

### With Fixtures

```typescript
import { test } from './fixtures/auth.fixture';

test('admin can create user', async ({ adminPage }) => {
  await adminPage.goto('/users');
  await openDrawer(adminPage, 'create');
  await fillForm(adminPage, {
    'Email': 'newuser@example.com',
  });
  await submitForm(adminPage);
  await expectSuccessMessage(adminPage);
});
```

### With Test Data

```typescript
test('display created page in list', async ({ page }) => {
  const testPage = await dataFactory.createPage({
    title: 'Unique Test Page',
  });

  await page.goto('/pages');
  await waitForTable(page);
  const data = await getTableData(page);
  
  expect(data).toContainEqual(expect.objectContaining({
    Title: 'Unique Test Page',
  }));

  await dataFactory.deletePage(testPage.id);
});
```

## Debugging

### Generate Report

```bash
npx playwright show-report
```

### View Videos/Screenshots

Test artifacts are saved in `test-results/`:
```
test-results/
├── auth-should-login-successfully/
│   ├── test-failed-1.png
│   ├── video.webm
│   └── trace.zip
```

### Debug a Test

```bash
npx playwright test tests/e2e/auth.spec.ts --debug
```

This opens the Playwright Inspector where you can:
- Step through test execution
- Evaluate expressions
- Inspect DOM
- Record new tests

## CI/CD Integration

For GitHub Actions, add to `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check if backend is running on port 3001
- Check if frontend dev server is running on port 5173

### Auth state not persisting
- Delete `auth-states/` directory and re-run tests
- Check localStorage in browser DevTools
- Verify auth token is being stored correctly

### Can't find element
- Run with `--debug` flag to inspect DOM
- Use `page.pause()` in test to pause execution
- Check if element exists or uses different selector

## Best Practices

1. **Use fixtures** for auth - don't login in every test
2. **Use helpers** for common interactions - keep tests readable
3. **Cleanup test data** - always delete created resources
4. **Wait for elements** - use proper waitFor methods, not arbitrary delays
5. **Use meaningful selectors** - prefer text/role over class selectors
6. **Isolate tests** - each test should be independent
7. **Test user journeys** - test complete workflows, not individual elements
8. **Document complex tests** - use comments for non-obvious logic

## Next Steps

- Task 2: Add module CRUD tests (users, pages, menus, forms)
- Task 3: Add advanced interaction tests (drag & drop, file upload)
- Task 4: Add performance tests (load times, network monitoring)
- Task 5: Add visual regression tests (screenshot comparisons)
