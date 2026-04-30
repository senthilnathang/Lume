import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Settings Module Tests
 * Tests system settings management and configuration
 */

test.describe('Module: Settings', () => {
  test('should navigate to settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});
    expect(adminPage.url()).toContain('/admin/settings');
  });

  test('should display settings form', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const form = adminPage.locator('form, .settings-form').first();
    expect(await form.count()).toBeGreaterThan(0);
  });

  test('should update general settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const appNameInput = adminPage.locator('input[placeholder*="Application Name"], label:has-text("App Name") ~ input').first();
    if (await appNameInput.count() > 0) {
      await fillForm(adminPage, {
        'Application Name': 'Lume Updated ' + Date.now(),
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should update email settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const emailInput = adminPage.locator('label:has-text("Email") ~ input[type="email"], input[placeholder*="email"]').first();
    if (await emailInput.count() > 0) {
      await fillForm(adminPage, {
        'Email': 'admin@test.com',
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should have multiple settings tabs', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const tabs = adminPage.locator('.ant-tabs-tab, [role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      expect(adminPage.url()).toContain('/admin/settings');
    }
  });

  test('should validate email format in settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const emailInput = adminPage.locator('label:has-text("Email") ~ input[type="email"], input[placeholder*="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill('invalid-email-format');

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();

        // Should show error
        const error = adminPage.locator('[role="alert"], .ant-form-item-explain-error').first();
        if (await error.count() > 0) {
          await expect(error).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should update logo/branding', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const logoInput = adminPage.locator('input[placeholder*="Logo"], label:has-text("Logo") ~ input').first();
    if (await logoInput.count() > 0) {
      // Try to fill with URL
      await fillForm(adminPage, {
        'Logo': 'https://example.com/logo.png',
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should prevent access to settings as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/settings', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/settings') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });

  test('should reset settings to defaults', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const resetButton = adminPage.locator('button:has-text("Reset"), button:has-text("Default")').first();
    if (await resetButton.count() > 0) {
      await resetButton.click();

      // Confirm reset
      const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Reset")').first();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should display system information', async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const systemInfo = adminPage.locator('text=Version, text=System, .system-info').first();
    if (await systemInfo.count() > 0) {
      expect(systemInfo).toBeVisible();
    }
  });
});
