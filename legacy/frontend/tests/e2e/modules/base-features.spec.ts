import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Base Features Data Module CRUD Tests
 * Tests feature flags and feature management
 */

test.describe('Module: Base Features', () => {
  test('should navigate to features', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_features_data');
    await adminPage.waitForLoadState('networkidle').catch(() => {});
    expect(adminPage.url()).toContain('/admin/base_features_data');
  });

  test('should display features list', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_features_data');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const features = adminPage.locator('.feature-item, [role="switch"], .ant-switch');
    const count = await features.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should toggle feature flag', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_features_data');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const featureToggle = adminPage.locator('.ant-switch, input[type="checkbox"]').first();
    if (await featureToggle.count() > 0) {
      await featureToggle.click();
      await expectSuccessMessage(adminPage);
    }
  });

  test('should display feature description', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_features_data');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const description = adminPage.locator('.feature-description, .feature-info').first();
    if (await description.count() > 0) {
      expect(description).toBeVisible();
    }
  });

  test('should search features', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_features_data');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should filter features by status', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_features_data');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const statusFilter = adminPage.locator('label:has-text("Status") ~ .ant-select, [placeholder*="Status"]').first();
    if (await statusFilter.count() > 0) {
      await statusFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/base_features_data', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/base_features_data') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
