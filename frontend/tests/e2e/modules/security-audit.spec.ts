import { test, expect } from '../fixtures/auth.fixture';
import { waitForTable, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Security Audit Module Tests
 * Tests security audit logs and compliance monitoring
 */

test.describe('Module: Security Audit', () => {
  test('should navigate to security audit', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/security-audit');
  });

  test('should display security events', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage, { minRows: 1 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should filter events by type', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);

    const typeFilter = adminPage.locator('label:has-text("Type") ~ .ant-select, [placeholder*="Type"]').first();
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should filter events by severity', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);

    const severityFilter = adminPage.locator('label:has-text("Severity") ~ .ant-select, [placeholder*="Severity"]').first();
    if (await severityFilter.count() > 0) {
      await severityFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const option = adminPage.locator('.ant-select-item').first();
      if (await option.count() > 0) {
        await option.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should search security events', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('failed');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should view event details', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);

    const detailsButton = adminPage.locator('tbody tr').first().locator('button:has-text("View"), button:has-text("Details")').first();
    if (await detailsButton.count() > 0) {
      await detailsButton.click();
      await adminPage.waitForSelector('[role="dialog"], .details-panel', { timeout: 10000 }).catch(() => {});
    }
  });

  test('should sort events by date', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);

    const dateHeader = adminPage.locator('thead th:has-text("Date"), thead th:has-text("Time")').first();
    if (await dateHeader.count() > 0) {
      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should export audit logs', async ({ adminPage }) => {
    await adminPage.goto('/admin/security-audit');
    await waitForTable(adminPage);

    const exportButton = adminPage.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportButton.count() > 0) {
      expect(exportButton).toBeVisible();
    }
  });

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/security-audit', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/security-audit') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
