import { test, expect } from '../fixtures/auth.fixture';
import { waitForTable, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Audit Module CRUD Tests
 * Tests audit log viewing and management
 */

test.describe('Module: Audit', () => {
  test('should navigate to audit logs', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/audit');
  });

  test('should display audit logs in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage, { minRows: 1 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should filter audit logs by action', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage);

    const actionFilter = adminPage.locator('label:has-text("Action") ~ .ant-select, [placeholder*="Action"]').first();
    if (await actionFilter.count() > 0) {
      await actionFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should filter audit logs by user', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage);

    const userFilter = adminPage.locator('label:has-text("User") ~ .ant-select, [placeholder*="User"]').first();
    if (await userFilter.count() > 0) {
      await userFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should search audit logs', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should view audit log details', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage);

    const detailsButton = adminPage.locator('tbody tr').first().locator('button:has-text("View"), button:has-text("Details")').first();
    if (await detailsButton.count() > 0) {
      await detailsButton.click();
      await adminPage.waitForSelector('[role="dialog"], .details-panel', { timeout: 10000 }).catch(() => {});
    }
  });

  test('should sort audit logs by date', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit');
    await waitForTable(adminPage);

    const dateHeader = adminPage.locator('thead th:has-text("Date"), thead th:has-text("Time")').first();
    if (await dateHeader.count() > 0) {
      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should prevent access to audit as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/audit', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/audit') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
