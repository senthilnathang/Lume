# E2E Test Quick Start Guide

Get started with Playwright E2E testing for Lume admin dashboard in 5 minutes.

## Prerequisites

Ensure backend and frontend are running:
```bash
# Terminal 1: Backend (from /opt/Lume/backend)
npm run dev

# Terminal 2: Frontend (from /opt/Lume/frontend/gawdesy-admin)
npm run dev
```

## Run Tests

### All Tests
```bash
cd /opt/Lume/frontend
npm run test:e2e
```

**Output:**
- Runs 9 authentication tests
- First run: Logs in and caches auth state (~30-45s)
- Subsequent runs: Reuses auth state (~10-15s)
- Test report: `playwright-report/index.html`

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Mode (Interactive)
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector with step-through debugging.

### UI Mode (Interactive Runner)
```bash
npm run test:e2e:ui
```
Modern interactive test runner with live reload.

## Common Tasks

### Add New Test
Create `tests/e2e/users.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';
import { fillForm, submitForm, waitForTable } from './helpers/ui-helpers';

test('should create new user', async ({ page }) => {
  // Navigate to users page
  await page.goto('/users');
  
  // Open create drawer
  const button = page.locator('button:has-text("Add")');
  await button.click();
  
  // Fill form
  await fillForm(page, {
    'Email': 'test@example.com',
    'First Name': 'John',
    'Last Name': 'Doe',
  });
  
  // Submit
  await submitForm(page);
  
  // Verify success
  expect(page.url()).toContain('/users');
});
```

### Use Admin Authentication
```typescript
import { test } from './fixtures/auth.fixture';

test('admin feature', async ({ adminPage }) => {
  // Page is pre-authenticated as admin
  await adminPage.goto('/users');
  // ... test continues
});
```

### Create Test Data via API
```typescript
import { dataFactory } from './fixtures/data-factory';

test('display user in list', async ({ adminPage }) => {
  // Create user via API
  const user = await dataFactory.createUser({
    email: 'test@example.com',
  });
  
  // Navigate and verify
  await adminPage.goto('/users');
  // ... test logic
  
  // Cleanup
  await dataFactory.deleteUser(user.id);
});
```

## File Structure

```
frontend/tests/e2e/
├── auth.spec.ts              ← All auth tests (9 tests)
├── fixtures/
│   ├── auth.fixture.ts       ← Admin/user fixtures
│   └── data-factory.ts       ← API data creation
├── helpers/
│   └── ui-helpers.ts         ← Form, table, drawer helpers
├── auth-states/              ← Cache dir (auto-created)
│   ├── admin-auth.json       ← Admin session cache
│   └── user-auth.json        ← User session cache
├── README.md                 ← Full documentation
└── QUICK_START.md            ← This file
```

## UI Helpers Cheat Sheet

### Fill Form
```typescript
await fillForm(page, {
  'Email': 'user@example.com',
  'Password': 'pass123',
  'Remember me': true,
});
```

### Submit Form
```typescript
await submitForm(page, { waitForUrl: '/dashboard' });
```

### Wait for Table
```typescript
await waitForTable(page, { minRows: 5 });
const data = await getTableData(page);
```

### Open Drawer
```typescript
await openDrawer(page, 'create');
// Or: 'edit', 'delete', custom action name
```

### Select Dropdown
```typescript
await selectDropdown(page, 'Status', 'Published');
```

### Upload File
```typescript
await uploadFile(page, 'input[type="file"]', './test-image.png');
```

### Click Table Action
```typescript
await clickTableAction(page, 'John Doe', 'Edit');
```

### Check Messages
```typescript
await expectSuccessMessage(page);
await expectErrorMessage(page, { text: 'Email already exists' });
```

## Test Patterns

### Simple Test
```typescript
test('login success', async ({ page }) => {
  await page.goto('/');
  await fillForm(page, {
    'Email': 'admin@lume.dev',
    'Password': 'Admin@123',
  });
  await submitForm(page, { waitForUrl: '/dashboard' });
  expect(page.url()).toContain('/dashboard');
});
```

### With Authenticated User
```typescript
import { test } from './fixtures/auth.fixture';

test('list users', async ({ adminPage }) => {
  await adminPage.goto('/users');
  await waitForTable(adminPage);
  expect(await getTableData(adminPage)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ Email: 'admin@lume.dev' })
    ])
  );
});
```

### With Test Data
```typescript
import { dataFactory } from './fixtures/data-factory';

test('create and display page', async ({ adminPage }) => {
  const page = await dataFactory.createPage({
    title: 'New Test Page',
    slug: 'new-test-page',
  });
  
  await adminPage.goto('/pages');
  await waitForTable(adminPage);
  
  const data = await getTableData(adminPage);
  expect(data).toContainEqual(
    expect.objectContaining({ Title: 'New Test Page' })
  );
  
  await dataFactory.deletePage(page.id);
});
```

## Debugging

### View Test Report
```bash
npx playwright show-report
```

### Screenshot on Failure
Automatically captured in `test-results/` directory.

### Video on Failure
Stored as `video.webm` in test result folder.

### Trace on Failure
Stored as `trace.zip` - open with:
```bash
npx playwright show-trace test-results/auth-should-login/trace.zip
```

### Pause Test
Add to test code:
```typescript
await page.pause();
```

### Step Through
Run with debug flag:
```bash
npm run test:e2e:debug
```

## Environment Variables

Override configuration via env vars:
```bash
# Use different base URL (e.g., staging)
PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:e2e

# Run single browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts
```

## Troubleshooting

### Tests timeout?
- Ensure backend is running on port 3001
- Ensure frontend is running on port 5173
- Increase timeout in `playwright.config.ts`

### Can't find element?
- Use `--debug` mode to inspect DOM
- Check if selector uses correct case
- Verify element is visible: `await element.waitFor({ state: 'visible' })`

### Auth state issues?
- Delete `auth-states/` directory
- Re-run tests to generate fresh auth state
- Check credentials in auth.spec.ts

### Can't login?
- Verify admin@lume.dev / Admin@123 exists in DB
- Check backend login endpoint: POST /api/auth/login
- Look for error messages in test output

## Next Steps

1. Run existing tests: `npm run test:e2e`
2. Add new tests for modules (users, pages, menus, forms)
3. Implement advanced interactions (drag/drop, file upload)
4. Add visual regression tests
5. Set up CI/CD pipeline

## Resources

- **Full Docs**: [README.md](./README.md)
- **Implementation Details**: [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- **Playwright Docs**: https://playwright.dev
- **Test Fixtures**: [fixtures/](./fixtures/)
- **UI Helpers**: [helpers/ui-helpers.ts](./helpers/ui-helpers.ts)

---

**Tips:**
- Start with `test:e2e:headed` to see browser behavior
- Use `--debug` when tests fail to understand what's happening
- Write small, focused tests (one assertion per test is fine)
- Use fixtures to avoid repeating setup
- Clean up test data to keep tests independent
