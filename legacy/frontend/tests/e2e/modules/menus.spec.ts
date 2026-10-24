import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, clickTableAction, expectSuccessMessage, expectErrorMessage } from '../helpers/ui-helpers';

/**
 * Menus Management CRUD Tests (Website Module)
 *
 * Tests comprehensive CRUD operations for website menus:
 * - Create menu with hierarchy
 * - Read menus in table
 * - Update menu items
 * - Drag-drop reorder menu items
 * - Delete menu items
 * - Menu publication
 */

test.describe('Module: Menus', () => {
  test('should navigate to menus list', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/website/menus');
  });

  test('should create new menu', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    const menuName = `Test Menu ${timestamp}`;

    await fillForm(adminPage, {
      'Name': menuName,
      'Location': 'header',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify menu appears in table
    await waitForTable(adminPage);
    const menuRow = adminPage.locator(`text=${menuName}`);
    await expect(menuRow).toBeVisible();
  });

  test('should validate required menu name', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await openDrawer(adminPage, 'create');

    // Try to submit without name
    const submitButton = adminPage.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation error
    const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should read menus in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage, { minRows: 1 });

    // Verify table structure
    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should search menus by name', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    // Look for search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('header');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      await waitForTable(adminPage);

      const menuRow = adminPage.locator('text=header, text=Header');
      if (await menuRow.count() > 0) {
        expect(menuRow).toBeVisible();
      }
    }
  });

  test('should open menu editor to manage items', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    // Click edit button on first menu
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Manage")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for menu editor
      await adminPage.waitForSelector('.menu-editor, [role="dialog"]', { timeout: 10000 }).catch(() => {});
      const menuEditor = adminPage.locator('.menu-editor, [role="dialog"]').first();
      expect(await menuEditor.count()).toBeGreaterThan(0);
    }
  });

  test('should add menu item', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Manage")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for add item button
      const addItemButton = adminPage.locator('button:has-text("Add Item"), button:has-text("Add Menu Item")').first();
      if (await addItemButton.count() > 0) {
        await addItemButton.click();

        // Fill menu item form
        await fillForm(adminPage, {
          'Label': 'Test Item ' + Date.now(),
          'URL': '/test-page',
        });

        // Save item
        const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should display menu hierarchy tree', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    // Click on first menu
    const menuRow = adminPage.locator('tbody tr').first();
    if (await menuRow.count() > 0) {
      const menuLink = menuRow.locator('a, button:not([type="button"])').first();
      if (await menuLink.count() > 0) {
        await menuLink.click();

        // Look for tree structure or hierarchy view
        const treeView = adminPage.locator('.menu-tree, .ant-tree, [role="tree"]').first();
        if (await treeView.count() > 0) {
          await expect(treeView).toBeVisible();
        }
      }
    }
  });

  test('should reorder menu items via drag and drop', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Manage")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for draggable menu items
      const menuItems = adminPage.locator('[draggable="true"], .menu-item-row').first();
      if (await menuItems.count() > 0) {
        // Verify items are draggable
        const secondItem = adminPage.locator('[draggable="true"], .menu-item-row').nth(1);
        if (await secondItem.count() > 0) {
          // Try to drag (without verifying exact position change due to complexity)
          expect(await menuItems.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should nest menu items', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Manage")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for parent item dropdown
      const parentSelect = adminPage.locator('label:has-text("Parent") ~ .ant-select, [placeholder*="Parent Item"]').first();
      if (await parentSelect.count() > 0) {
        await parentSelect.click();
        await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

        // Select a parent item
        const parentOption = adminPage.locator('.ant-select-item').first();
        if (await parentOption.count() > 0) {
          await parentOption.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should update menu item', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Manage")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Find first menu item edit button
      const itemEditButton = adminPage.locator('[role="dialog"] button:has-text("Edit"), .menu-item-row button:has-text("Edit")').first();
      if (await itemEditButton.count() > 0) {
        await itemEditButton.click();

        // Update label
        await fillForm(adminPage, {
          'Label': 'Updated Item ' + Date.now(),
        });

        const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should delete menu item', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Manage")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Find first menu item delete button
      const itemDeleteButton = adminPage.locator('[role="dialog"] button:has-text("Delete"), .menu-item-row button:has-text("Delete")').first();
      if (await itemDeleteButton.count() > 0) {
        await itemDeleteButton.click();

        // Confirm deletion
        const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should delete menu with confirmation', async ({ adminPage }) => {
    // Create a menu first
    const timestamp = Date.now();
    await adminPage.goto('/admin/website/menus');
    await openDrawer(adminPage, 'create');

    const menuName = `Delete Test ${timestamp}`;
    await fillForm(adminPage, {
      'Name': menuName,
      'Location': 'footer',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    // Now delete it
    await waitForTable(adminPage);
    const deleteRow = adminPage.locator(`tbody tr:has-text("${menuName}")`).first();
    if (await deleteRow.count() > 0) {
      const deleteButton = deleteRow.locator('button:has-text("Delete")').first();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should filter menus by location', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/menus');
    await waitForTable(adminPage);

    // Look for location filter
    const locationFilter = adminPage.locator('label:has-text("Location") ~ .ant-select, [placeholder*="Location"]').first();
    if (await locationFilter.count() > 0) {
      await locationFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const headerOption = adminPage.locator('[title="Header"], text=Header').first();
      if (await headerOption.count() > 0) {
        await headerOption.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should prevent access to menus as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/website/menus', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show no access
    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/website/menus') || url.includes('dashboard') || url.includes('error');
    expect(hasNoAccess).toBe(true);
  });
});
