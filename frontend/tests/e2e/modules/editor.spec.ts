import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Editor Module CRUD Tests
 * Tests visual page builder templates and snippets
 */

test.describe('Module: Editor', () => {
  test('should navigate to editor templates', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/templates');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/editor/templates');
  });

  test('should display templates in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/templates');
    await waitForTable(adminPage, { minRows: 1 });

    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should create new template', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/templates');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Name': `Template ${timestamp}`,
      'Description': 'A test editor template',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
  });

  test('should search templates', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/templates');
    await waitForTable(adminPage);

    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('template');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should open template editor', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/templates');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Open")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      await adminPage.waitForLoadState('networkidle').catch(() => {});
      expect(adminPage.url()).toContain('/edit');
    }
  });

  test('should delete template', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/templates');
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

  test('should navigate to snippets', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/snippets');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/editor/snippets');
  });

  test('should create new snippet', async ({ adminPage }) => {
    await adminPage.goto('/admin/editor/snippets');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    await fillForm(adminPage, {
      'Name': `Snippet ${timestamp}`,
      'Description': 'A reusable snippet',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
  });

  test('should prevent access to editor as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/editor/templates', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/editor') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });
});
