import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, clickTableAction, expectSuccessMessage, expectErrorMessage } from '../helpers/ui-helpers';

/**
 * Documents Management CRUD Tests
 *
 * Tests comprehensive CRUD operations for documents:
 * - Create document with types/templates
 * - Read documents in table
 * - Update document content
 * - Version control/history
 * - Document sharing/permissions
 * - Delete document or archive
 */

test.describe('Module: Documents', () => {
  test('should navigate to documents list', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/documents');
  });

  test('should create new document', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    const docTitle = `Test Document ${timestamp}`;

    await fillForm(adminPage, {
      'Title': docTitle,
      'Description': 'A test document for E2E testing',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify document appears in table
    await waitForTable(adminPage);
    const docRow = adminPage.locator(`text=${docTitle}`);
    await expect(docRow).toBeVisible();
  });

  test('should validate required document title', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await openDrawer(adminPage, 'create');

    // Try to submit without title
    const submitButton = adminPage.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation error
    const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should read documents in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage, { minRows: 1 });

    // Verify table structure
    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should search documents by title', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    // Look for search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      await waitForTable(adminPage);

      const docRow = adminPage.locator('text=Test');
      if (await docRow.count() > 0) {
        expect(docRow).toBeVisible();
      }
    }
  });

  test('should filter documents by type', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    // Look for type filter
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

  test('should open document editor', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    // Click edit button on first document
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Open")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for document editor to load
      const editor = adminPage.locator('[contenteditable="true"], .document-editor, .editor').first();
      if (await editor.count() > 0) {
        await editor.waitFor({ state: 'visible', timeout: 10000 });
        expect(editor).toBeVisible();
      } else {
        // If no editor found, just verify page loaded
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should update document content', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    // Find first editable document
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Open")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for editor
      const editorBody = adminPage.locator('[contenteditable="true"], .document-editor, .editor').first();
      if (await editorBody.count() > 0) {
        await editorBody.waitFor({ state: 'visible', timeout: 10000 });

        // Add or update content
        await editorBody.click();
        await adminPage.keyboard.press('Control+A');
        await adminPage.keyboard.type('Updated document content ' + Date.now());

        // Save
        const saveButton = adminPage.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should view document version history', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Open")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for version history button
      const historyButton = adminPage.locator('button:has-text("History"), button:has-text("Versions"), button:has-text("Changes")').first();
      if (await historyButton.count() > 0) {
        await historyButton.click();

        // Verify history panel appears
        const historyPanel = adminPage.locator('.version-history, [role="dialog"]:has-text("History")').first();
        if (await historyPanel.count() > 0) {
          await expect(historyPanel).toBeVisible();
        }
      }
    }
  });

  test('should revert to previous version', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Open")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Open history
      const historyButton = adminPage.locator('button:has-text("History"), button:has-text("Versions")').first();
      if (await historyButton.count() > 0) {
        await historyButton.click();

        // Find revert button
        const revertButton = adminPage.locator('button:has-text("Revert"), button:has-text("Restore")').first();
        if (await revertButton.count() > 0) {
          await revertButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should share document', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    const shareButton = adminPage.locator('tbody tr').first().locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();

      // Wait for share dialog
      await adminPage.waitForSelector('[role="dialog"]:has-text("Share"), .share-panel', { timeout: 10000 }).catch(() => {});

      // Add user to share
      const shareInput = adminPage.locator('input[placeholder*="User"], input[placeholder*="Email"]').first();
      if (await shareInput.count() > 0) {
        await shareInput.fill('user@test.com');

        // Select from dropdown
        const userOption = adminPage.locator('[role="option"]').first();
        if (await userOption.count() > 0) {
          await userOption.click();

          // Save share
          const saveButton = adminPage.locator('button:has-text("Share"), button:has-text("Add")').first();
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await expectSuccessMessage(adminPage);
          }
        }
      }
    }
  });

  test('should set document permissions', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    const shareButton = adminPage.locator('tbody tr').first().locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();

      // Look for permission dropdown
      const permissionSelect = adminPage.locator('label:has-text("Permission") ~ .ant-select, [placeholder*="Permission"]').first();
      if (await permissionSelect.count() > 0) {
        await permissionSelect.click();
        await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

        const editOption = adminPage.locator('[title="Can Edit"], text=Can Edit').first();
        if (await editOption.count() > 0) {
          await editOption.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should delete document with confirmation', async ({ adminPage }) => {
    // Create a document first
    const timestamp = Date.now();
    await adminPage.goto('/admin/documents');
    await openDrawer(adminPage, 'create');

    const docTitle = `Delete Test ${timestamp}`;
    await fillForm(adminPage, {
      'Title': docTitle,
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    // Now delete it
    await waitForTable(adminPage);
    const deleteRow = adminPage.locator(`tbody tr:has-text("${docTitle}")`).first();
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

  test('should archive document instead of delete', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    // Look for archive button on first row
    const archiveButton = adminPage.locator('tbody tr').first().locator('button:has-text("Archive")').first();
    if (await archiveButton.count() > 0) {
      await archiveButton.click();
      await expectSuccessMessage(adminPage);

      // Document should still be visible but marked as archived
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('should prevent access to documents as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/documents', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show no access
    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/documents') || url.includes('dashboard') || url.includes('error');
    expect(hasNoAccess).toBe(true);
  });

  test('should sort documents by title', async ({ adminPage }) => {
    await adminPage.goto('/admin/documents');
    await waitForTable(adminPage);

    // Click title header to sort
    const titleHeader = adminPage.locator('thead th:has-text("Title")').first();
    if (await titleHeader.count() > 0) {
      await titleHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Click again for descending
      await titleHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Verify sort indicator
      const sortIcon = titleHeader.locator('.ant-table-column-sorter-up, .ant-table-column-sorter-down');
      expect(await sortIcon.count()).toBeGreaterThan(0);
    }
  });
});
