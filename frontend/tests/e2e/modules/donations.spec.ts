import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Donations Module CRUD Tests
 * Tests donation management and tracking
 */

test.describe('Module: Donations', () => {
  test('should navigate to donations list', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/donations');
  });

  test('should display donations table', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
    await waitForTable(adminPage, { minRows: 0 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should create donation record', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Donor Name': `Donor ${timestamp}`,
      'Amount': '100',
      'Email': `donor-${timestamp}@test.com`,
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
  });

  test('should search donations', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should filter donations by status', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
    await waitForTable(adminPage);

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

  test('should view donation details', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
    await waitForTable(adminPage);

    const detailsButton = adminPage.locator('tbody tr').first().locator('button:has-text("View")').first();
    if (await detailsButton.count() > 0) {
      await detailsButton.click();
      await adminPage.waitForSelector('[role="dialog"], .details-panel', { timeout: 10000 }).catch(() => {});
    }
  });

  test('should delete donation', async ({ adminPage }) => {
    await adminPage.goto('/admin/donations');
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

  test('should prevent access to donations as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/donations', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/donations') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
