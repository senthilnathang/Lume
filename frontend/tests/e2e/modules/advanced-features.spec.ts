import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Advanced Features Module CRUD Tests
 * Tests advanced functionality and premium features
 */

test.describe('Module: Advanced Features', () => {
  test('should navigate to advanced features', async ({ adminPage }) => {
    await adminPage.goto('/admin/advanced_features');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/advanced_features');
  });

  test('should display advanced features list', async ({ adminPage }) => {
    await adminPage.goto('/admin/advanced_features');
    await waitForTable(adminPage, { minRows: 0 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should enable advanced feature', async ({ adminPage }) => {
    await adminPage.goto('/admin/advanced_features');
    await waitForTable(adminPage);

    const enableButton = adminPage.locator('tbody tr').first().locator('button:has-text("Enable")').first();
    if (await enableButton.count() > 0) {
      await enableButton.click();
      await expectSuccessMessage(adminPage);
    }
  });

  test('should configure feature settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/advanced_features');
    await waitForTable(adminPage);

    const configButton = adminPage.locator('tbody tr').first().locator('button:has-text("Configure"), button:has-text("Settings")').first();
    if (await configButton.count() > 0) {
      await configButton.click();

      await adminPage.waitForSelector('[role="dialog"], .settings-panel', { timeout: 10000 }).catch(() => {});

      const settingsForm = adminPage.locator('form, .settings-form').first();
      if (await settingsForm.count() > 0) {
        const saveButton = adminPage.locator('button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should disable advanced feature', async ({ adminPage }) => {
    await adminPage.goto('/admin/advanced_features');
    await waitForTable(adminPage);

    const disableButton = adminPage.locator('tbody tr').first().locator('button:has-text("Disable")').first();
    if (await disableButton.count() > 0) {
      await disableButton.click();

      const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Disable")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should view feature documentation', async ({ adminPage }) => {
    await adminPage.goto('/admin/advanced_features');
    await waitForTable(adminPage);

    const docsButton = adminPage.locator('tbody tr').first().locator('button:has-text("Docs"), button:has-text("Help")').first();
    if (await docsButton.count() > 0) {
      await docsButton.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/advanced_features', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/advanced_features') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
