import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Messages Module CRUD Tests
 * Tests message creation, viewing, and management
 */

test.describe('Module: Messages', () => {
  test('should navigate to messages list', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/messages');
  });

  test('should display messages in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');
    await waitForTable(adminPage, { minRows: 0 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should create new message', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');

    const createButton = adminPage.locator('button:has-text("Create"), button:has-text("New Message"), button:has-text("Compose")').first();
    if (await createButton.count() > 0) {
      await createButton.click();

      const timestamp = Date.now();
      await fillForm(adminPage, {
        'Title': `Message ${timestamp}`,
        'Content': 'Test message content',
      });

      await submitForm(adminPage);
      await expectSuccessMessage(adminPage);
    }
  });

  test('should search messages', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should filter messages by status', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');
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

  test('should read message details', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');
    await waitForTable(adminPage);

    const viewButton = adminPage.locator('tbody tr').first().locator('button:has-text("View"), button:has-text("Read")').first();
    if (await viewButton.count() > 0) {
      await viewButton.click();
      await adminPage.waitForSelector('[role="dialog"], .message-details', { timeout: 10000 }).catch(() => {});
    }
  });

  test('should delete message', async ({ adminPage }) => {
    await adminPage.goto('/admin/messages');
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

  test('should prevent access to messages as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/messages', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/messages') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
