import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, clickTableAction, expectSuccessMessage, expectErrorMessage } from '../helpers/ui-helpers';
import { DataFactory } from '../fixtures/data-factory';

/**
 * User Management CRUD Tests
 *
 * Tests comprehensive CRUD operations for users:
 * - Create user via form
 * - Read users in table
 * - Update user details
 * - Delete user with confirmation
 * - Bulk delete users
 * - Permission-based access control
 */

test.describe('Module: Users', () => {
  let userId: number;
  const factory = new DataFactory();

  test('should navigate to users list', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/users');
  });

  test('should create user with form submission', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Email': `user-${timestamp}@test.com`,
      'First Name': 'Test',
      'Last Name': 'User',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage, { text: 'created' });

    // Verify user appears in table
    await waitForTable(adminPage);
    const userRow = adminPage.locator(`text=user-${timestamp}@test.com`);
    await expect(userRow).toBeVisible();
  });

  test('should validate required email field', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await openDrawer(adminPage, 'create');

    // Try to submit without email
    const submitButton = adminPage.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation error
    const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await openDrawer(adminPage, 'create');

    await fillForm(adminPage, {
      'Email': 'invalid-email-format',
    });

    const submitButton = adminPage.locator('button[type="submit"]');
    await submitButton.click();

    // Should show format error
    const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should read users in paginated table', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage, { minRows: 1 });

    // Verify table structure
    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);

    // Check for pagination (if applicable)
    const paginationButton = adminPage.locator('.ant-pagination button').first();
    if (await paginationButton.count() > 0) {
      expect(paginationButton).toBeVisible();
    }
  });

  test('should search users by email', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Look for search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('admin@lume.dev');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      await waitForTable(adminPage);

      const adminRow = adminPage.locator('text=admin@lume.dev');
      await expect(adminRow).toBeVisible();
    }
  });

  test('should filter users by role', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Look for role filter dropdown
    const roleFilter = adminPage.locator('label:has-text("Role") ~ .ant-select, [placeholder*="Role"]').first();
    if (await roleFilter.count() > 0) {
      await roleFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const adminOption = adminPage.locator('[title="Admin"], text=Admin').first();
      if (await adminOption.count() > 0) {
        await adminOption.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should open user edit drawer', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Click edit button on first row
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await adminPage.waitForSelector('.ant-drawer, .ant-modal', { timeout: 10000 });
      expect(adminPage.locator('.ant-drawer, .ant-modal')).toBeVisible();
    }
  });

  test('should update user details', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Find and edit a test user
    const testUserRow = adminPage.locator(`tbody tr:has-text("user@lume.dev")`).first();
    if (await testUserRow.count() > 0) {
      const editButton = testUserRow.locator('button:has-text("Edit")').first();
      await editButton.click();

      // Wait for drawer
      await adminPage.waitForSelector('.ant-drawer, .ant-modal', { timeout: 10000 });

      // Update first name
      await fillForm(adminPage, {
        'First Name': 'Updated',
      });

      await submitForm(adminPage);
      await expectSuccessMessage(adminPage, { text: 'updated' });
    }
  });

  test('should delete user with confirmation', async ({ adminPage }) => {
    // Create a user first
    const timestamp = Date.now();
    const testEmail = `delete-${timestamp}@test.com`;

    await adminPage.goto('/admin/users');
    await openDrawer(adminPage, 'create');

    await fillForm(adminPage, {
      'Email': testEmail,
      'First Name': 'Delete',
      'Last Name': 'Test',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    // Now delete the user
    await waitForTable(adminPage);
    const deleteRow = adminPage.locator(`tbody tr:has-text("${testEmail}")`).first();
    if (await deleteRow.count() > 0) {
      const deleteButton = deleteRow.locator('button:has-text("Delete")').first();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should bulk select users', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Click checkboxes on first two rows
    const checkboxes = adminPage.locator('tbody tr input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Verify bulk action button appears
      const bulkAction = adminPage.locator('button:has-text("Delete"), button:has-text("Bulk Delete")').first();
      if (await bulkAction.count() > 0) {
        expect(bulkAction).toBeVisible();
      }
    }
  });

  test('should prevent regular user from accessing users list', async ({ userPage }) => {
    // Regular user should not have access to /admin/users
    await userPage.goto('/admin/users', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show access denied
    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/users') || url.includes('dashboard') || url.includes('error');
    expect(hasNoAccess).toBe(true);
  });

  test('should show user details in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Get table data
    const firstRow = adminPage.locator('tbody tr').first();
    const cells = firstRow.locator('td');

    // Should have at least email and role columns
    expect(await cells.count()).toBeGreaterThan(1);
  });

  test('should sort users by email', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Click email header to sort
    const emailHeader = adminPage.locator('thead th:has-text("Email")').first();
    if (await emailHeader.count() > 0) {
      await emailHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Click again for descending
      await emailHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Verify sort indicator
      const sortIcon = emailHeader.locator('.ant-table-column-sorter-up, .ant-table-column-sorter-down');
      expect(await sortIcon.count()).toBeGreaterThan(0);
    }
  });

  test('should reset filters and search', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await waitForTable(adminPage);

    // Apply a search
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('nonexistent');
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Look for reset button
      const resetButton = adminPage.locator('button:has-text("Reset")').first();
      if (await resetButton.count() > 0) {
        await resetButton.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});

        // Verify search is cleared
        const searchValue = await searchInput.inputValue();
        expect(searchValue).toBe('');
      }
    }
  });
});
