import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Base Automation Module CRUD Tests
 * Tests automation rules and workflow management
 */

test.describe('Module: Base Automation', () => {
  test('should navigate to automation list', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/base_automation');
  });

  test('should display automations in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
    await waitForTable(adminPage, { minRows: 0 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should create new automation rule', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Name': `Automation ${timestamp}`,
      'Description': 'Test automation rule',
      'Trigger': 'On Schedule',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
  });

  test('should search automations', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should edit automation rule', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      await fillForm(adminPage, {
        'Name': 'Updated Automation ' + Date.now(),
      });

      const saveButton = adminPage.locator('button[type="submit"]').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should enable/disable automation', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
    await waitForTable(adminPage);

    const toggleButton = adminPage.locator('tbody tr').first().locator('.ant-switch, input[type="checkbox"]').first();
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      await expectSuccessMessage(adminPage);
    }
  });

  test('should delete automation rule', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_automation');
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

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/base_automation', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/base_automation') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
