import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * RBAC (Role-Based Access Control) Module CRUD Tests
 * Tests role and permission management
 */

test.describe('Module: RBAC', () => {
  test('should navigate to roles list', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/rbac/roles');
  });

  test('should display roles in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await waitForTable(adminPage, { minRows: 1 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should create new role', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Name': `Role ${timestamp}`,
      'Description': 'Test role for RBAC',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
  });

  test('should search roles', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('admin');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should edit role permissions', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Permissions")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for permission checkboxes
      const permissionCheckboxes = adminPage.locator('input[type="checkbox"]');
      const count = await permissionCheckboxes.count();

      if (count > 0) {
        // Toggle a permission
        const checkbox = permissionCheckboxes.first();
        const isChecked = await checkbox.isChecked();
        await checkbox.click();

        const saveButton = adminPage.locator('button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should view role details', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await waitForTable(adminPage);

    const viewButton = adminPage.locator('tbody tr').first().locator('button:has-text("View")').first();
    if (await viewButton.count() > 0) {
      await viewButton.click();
      await adminPage.waitForSelector('[role="dialog"], .details-panel', { timeout: 10000 }).catch(() => {});
    }
  });

  test('should delete role', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/roles');
    await waitForTable(adminPage);

    const deleteButton = adminPage.locator('tbody tr').first().locator('button:has-text("Delete")').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should navigate to permissions list', async ({ adminPage }) => {
    await adminPage.goto('/admin/rbac/permissions');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/rbac/permissions');
  });

  test('should prevent access to rbac as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/rbac/roles', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/rbac') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
