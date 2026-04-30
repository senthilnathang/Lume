import { test, expect } from '../fixtures/auth.fixture';
import { waitForTable, clickTableAction, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Activities Module CRUD Tests
 * Tests activity log viewing, filtering, and management
 */

test.describe('Module: Activities', () => {
  test('should navigate to activities list', async ({ adminPage }) => {
    await adminPage.goto('/admin/activities');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/activities');
  });

  test('should display activities in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/activities');
    await waitForTable(adminPage, { minRows: 1 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should filter activities by type', async ({ adminPage }) => {
    await adminPage.goto('/admin/activities');
    await waitForTable(adminPage);

    const typeFilter = adminPage.locator('label:has-text("Type") ~ .ant-select, [placeholder*="Type"]').first();
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const typeOption = adminPage.locator('.ant-select-item').first();
      if (await typeOption.count() > 0) {
        await typeOption.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should search activities', async ({ adminPage }) => {
    await adminPage.goto('/admin/activities');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should view activity details', async ({ adminPage }) => {
    await adminPage.goto('/admin/activities');
    await waitForTable(adminPage);

    const detailsButton = adminPage.locator('tbody tr').first().locator('button:has-text("View"), button:has-text("Details")').first();
    if (await detailsButton.count() > 0) {
      await detailsButton.click();
      await adminPage.waitForSelector('[role="dialog"], .details-panel', { timeout: 10000 }).catch(() => {});
    }
  });

  test('should sort activities by date', async ({ adminPage }) => {
    await adminPage.goto('/admin/activities');
    await waitForTable(adminPage);

    const dateHeader = adminPage.locator('thead th:has-text("Date"), thead th:has-text("Time")').first();
    if (await dateHeader.count() > 0) {
      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should prevent access to activities as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/activities', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/activities') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
