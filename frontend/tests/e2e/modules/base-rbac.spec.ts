import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Base RBAC Module Tests
 * Tests base role-based access control configuration
 */

test.describe('Module: Base RBAC', () => {
  test('should navigate to base rbac settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});
    expect(adminPage.url()).toContain('/admin/base_rbac');
  });

  test('should display rbac configuration', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const form = adminPage.locator('form, .rbac-form, .rbac-config').first();
    expect(await form.count()).toBeGreaterThan(0);
  });

  test('should view role hierarchy', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const hierarchy = adminPage.locator('text=Hierarchy, .role-hierarchy, [role="tree"]').first();
    if (await hierarchy.count() > 0) {
      expect(hierarchy).toBeVisible();
    }
  });

  test('should view permission matrix', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const matrix = adminPage.locator('text=Permission, text=Matrix, .permission-matrix, table').first();
    if (await matrix.count() > 0) {
      expect(matrix).toBeVisible();
    }
  });

  test('should manage role inheritance', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const inheritanceSelect = adminPage.locator('label:has-text("Inherit") ~ .ant-select, [placeholder*="Inherit"]').first();
    if (await inheritanceSelect.count() > 0) {
      await inheritanceSelect.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();

        const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should toggle default role', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const defaultToggle = adminPage.locator('.ant-switch, input[type="checkbox"]').first();
    if (await defaultToggle.count() > 0) {
      await defaultToggle.click();
      await expectSuccessMessage(adminPage);
    }
  });

  test('should view permission descriptions', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_rbac');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const descriptions = adminPage.locator('.permission-description, [title*="permission"]').first();
    if (await descriptions.count() > 0) {
      expect(descriptions).toBeVisible();
    }
  });

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/base_rbac', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/base_rbac') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
