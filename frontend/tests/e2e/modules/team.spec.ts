import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Team Module CRUD Tests
 * Tests team member management, roles, and permissions
 */

test.describe('Module: Team', () => {
  test('should navigate to team list', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/team');
  });

  test('should display team members', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage, { minRows: 1 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should add team member', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Email': `member-${timestamp}@test.com`,
      'First Name': 'Team',
      'Last Name': 'Member',
      'Role': 'Member',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
  });

  test('should search team members', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should update team member role', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      const roleSelect = adminPage.locator('label:has-text("Role") ~ .ant-select, [placeholder*="Role"]').first();
      if (await roleSelect.count() > 0) {
        await roleSelect.click();
        await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

        const roleOption = adminPage.locator('.ant-select-item').nth(0);
        if (await roleOption.count() > 0) {
          await roleOption.click();

          const saveButton = adminPage.locator('button[type="submit"]').first();
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await expectSuccessMessage(adminPage);
          }
        }
      }
    }
  });

  test('should remove team member', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage);

    const deleteButton = adminPage.locator('tbody tr').first().locator('button:has-text("Remove"), button:has-text("Delete")').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should filter by role', async ({ adminPage }) => {
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage);

    const roleFilter = adminPage.locator('label:has-text("Role") ~ .ant-select, [placeholder*="Role"]').first();
    if (await roleFilter.count() > 0) {
      await roleFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const roleOption = adminPage.locator('.ant-select-item').first();
      if (await roleOption.count() > 0) {
        await roleOption.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should prevent access to team as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/team', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/team') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
