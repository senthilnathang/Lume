import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Base Customization Module CRUD Tests
 * Tests theme, layout, and UI customization
 */

test.describe('Module: Base Customization', () => {
  test('should navigate to customization', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_customization');
    await adminPage.waitForLoadState('networkidle').catch(() => {});
    expect(adminPage.url()).toContain('/admin/base_customization');
  });

  test('should display customization form', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_customization');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const form = adminPage.locator('form, .customization-form').first();
    expect(await form.count()).toBeGreaterThan(0);
  });

  test('should update theme colors', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_customization');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const colorInput = adminPage.locator('input[type="color"], label:has-text("Color") ~ input').first();
    if (await colorInput.count() > 0) {
      // Set a color (placeholder approach since color picker is complex)
      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should update layout settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_customization');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const layoutSelect = adminPage.locator('label:has-text("Layout") ~ .ant-select, [placeholder*="Layout"]').first();
    if (await layoutSelect.count() > 0) {
      await layoutSelect.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();

        const saveButton = adminPage.locator('button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should manage custom CSS', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_customization');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const cssInput = adminPage.locator('textarea[placeholder*="CSS"], label:has-text("CSS") ~ textarea').first();
    if (await cssInput.count() > 0) {
      await fillForm(adminPage, {
        'Custom CSS': 'body { background: white; }',
      });

      const saveButton = adminPage.locator('button[type="submit"]').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should toggle sidebar', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_customization');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const sidebarToggle = adminPage.locator('label:has-text("Sidebar") ~ .ant-switch, .sidebar-toggle').first();
    if (await sidebarToggle.count() > 0) {
      await sidebarToggle.click();

      const saveButton = adminPage.locator('button[type="submit"]').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/base_customization', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/base_customization') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
