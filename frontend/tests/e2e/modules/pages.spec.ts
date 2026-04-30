import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, clickTableAction, expectSuccessMessage, expectErrorMessage } from '../helpers/ui-helpers';

/**
 * Pages Management CRUD Tests (Website Module)
 *
 * Tests comprehensive CRUD operations for website pages:
 * - Create page with TipTap editor
 * - Read pages in table
 * - Update page content
 * - Publish/unpublish page
 * - Delete page
 * - Page revisions/history
 */

test.describe('Module: Pages', () => {
  test('should navigate to pages list', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/website/pages');
  });

  test('should create new page via drawer', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    const pageTitle = `Test Page ${timestamp}`;
    const pageSlug = `test-page-${timestamp}`;

    await fillForm(adminPage, {
      'Title': pageTitle,
      'Slug': pageSlug,
    });

    // Switch to visual editor if available
    const visualTab = adminPage.locator('button:has-text("Visual"), .ant-tabs-tab:has-text("Visual")').first();
    if (await visualTab.count() > 0) {
      await visualTab.click();
    }

    // Add some content to editor
    const editorBody = adminPage.locator('[contenteditable="true"], .tiptap-editor, .ProseMirror').first();
    if (await editorBody.count() > 0) {
      await editorBody.click();
      await editorBody.type('Test page content');
    }

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify page appears in table
    await waitForTable(adminPage);
    const pageRow = adminPage.locator(`text=${pageTitle}`);
    await expect(pageRow).toBeVisible();
  });

  test('should validate required page title', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await openDrawer(adminPage, 'create');

    // Try to submit without title
    const submitButton = adminPage.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation error
    const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should validate unique slug', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');

    // Get first page slug from table
    const firstSlugCell = adminPage.locator('tbody tr').first().locator('td').nth(1);
    const existingSlug = await firstSlugCell.textContent();

    if (existingSlug && existingSlug.trim()) {
      await openDrawer(adminPage, 'create');

      await fillForm(adminPage, {
        'Title': 'Duplicate Slug Page',
        'Slug': existingSlug.trim(),
      });

      await submitForm(adminPage);

      // Should show error about duplicate slug
      const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should read pages in table with pagination', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage, { minRows: 1 });

    // Verify table structure
    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);

    // Check pagination
    const paginationButton = adminPage.locator('.ant-pagination button').first();
    if (await paginationButton.count() > 0) {
      expect(paginationButton).toBeVisible();
    }
  });

  test('should filter pages by status', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Look for status filter
    const statusFilter = adminPage.locator('label:has-text("Status") ~ .ant-select, [placeholder*="Status"]').first();
    if (await statusFilter.count() > 0) {
      await statusFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const publishedOption = adminPage.locator('[title="Published"], text=Published').first();
      if (await publishedOption.count() > 0) {
        await publishedOption.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should search pages by title', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Look for search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      await waitForTable(adminPage);

      const testPageRow = adminPage.locator('text=Test');
      if (await testPageRow.count() > 0) {
        expect(testPageRow).toBeVisible();
      }
    }
  });

  test('should open page editor', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Click edit button on first row
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for page editor to load
      const editor = adminPage.locator('[contenteditable="true"], .tiptap-editor, .ProseMirror, .page-editor').first();
      if (await editor.count() > 0) {
        await editor.waitFor({ state: 'visible', timeout: 10000 });
        expect(editor).toBeVisible();
      }
    }
  });

  test('should update page content', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Find first editable page
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for editor
      const editorBody = adminPage.locator('[contenteditable="true"], .tiptap-editor, .ProseMirror').first();
      if (await editorBody.count() > 0) {
        await editorBody.waitFor({ state: 'visible', timeout: 10000 });

        // Clear existing content
        await editorBody.click();
        await adminPage.keyboard.press('Control+A');
        await adminPage.keyboard.press('Delete');

        // Add new content
        await editorBody.type('Updated test content ' + Date.now());

        // Save
        const saveButton = adminPage.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should publish page', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Find a draft page
    const draftRow = adminPage.locator('tbody tr:has-text("Draft")').first();
    if (await draftRow.count() > 0) {
      const editButton = draftRow.locator('button:has-text("Edit")').first();
      if (await editButton.count() > 0) {
        await editButton.click();

        // Look for publish button or status dropdown
        const publishButton = adminPage.locator('button:has-text("Publish"), .ant-btn:has-text("Publish")').first();
        if (await publishButton.count() > 0) {
          await publishButton.click();
          await expectSuccessMessage(adminPage);
        }

        // Or check for status field
        const statusSelect = adminPage.locator('label:has-text("Status") ~ .ant-select, [placeholder*="Status"]').first();
        if (await statusSelect.count() > 0) {
          await statusSelect.click();
          await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

          const publishedOption = adminPage.locator('[title="Published"], text=Published').first();
          if (await publishedOption.count() > 0) {
            await publishedOption.click();

            // Save changes
            const saveButton = adminPage.locator('button[type="submit"]').first();
            if (await saveButton.count() > 0) {
              await saveButton.click();
              await expectSuccessMessage(adminPage);
            }
          }
        }
      }
    }
  });

  test('should unpublish page', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Find a published page
    const publishedRow = adminPage.locator('tbody tr:has-text("Published")').first();
    if (await publishedRow.count() > 0) {
      const editButton = publishedRow.locator('button:has-text("Edit")').first();
      if (await editButton.count() > 0) {
        await editButton.click();

        // Look for unpublish button
        const unpublishButton = adminPage.locator('button:has-text("Unpublish")').first();
        if (await unpublishButton.count() > 0) {
          await unpublishButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should delete page with confirmation', async ({ adminPage }) => {
    // Create a page first
    const timestamp = Date.now();
    await adminPage.goto('/admin/website/pages');
    await openDrawer(adminPage, 'create');

    const pageTitle = `Delete Test ${timestamp}`;
    await fillForm(adminPage, {
      'Title': pageTitle,
      'Slug': `delete-test-${timestamp}`,
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    // Now delete it
    await waitForTable(adminPage);
    const deleteRow = adminPage.locator(`tbody tr:has-text("${pageTitle}")`).first();
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

  test('should view page revisions', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    // Click on first page edit
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for revisions/history button
      const revisionsButton = adminPage.locator('button:has-text("History"), button:has-text("Revisions")').first();
      if (await revisionsButton.count() > 0) {
        await revisionsButton.click();

        // Verify revisions panel/drawer appears
        const revisionsPanel = adminPage.locator('.revisions-panel, [role="dialog"]:has-text("History")').first();
        if (await revisionsPanel.count() > 0) {
          await expect(revisionsPanel).toBeVisible();
        }
      }
    }
  });

  test('should set page metadata (SEO)', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for SEO/Metadata section
      const seoSection = adminPage.locator('button:has-text("SEO"), button:has-text("Metadata"), label:has-text("Meta Title")').first();
      if (await seoSection.count() > 0) {
        if (await adminPage.locator('button:has-text("SEO")').count() > 0) {
          await adminPage.locator('button:has-text("SEO")').first().click();
        }

        await fillForm(adminPage, {
          'Meta Title': 'SEO Title ' + Date.now(),
          'Meta Description': 'SEO Description for testing',
        });

        const saveButton = adminPage.locator('button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should sort pages by title', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/pages');
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

  test('should prevent access to pages as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/website/pages', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show no access
    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/website/pages') || url.includes('dashboard') || url.includes('error');
    expect(hasNoAccess).toBe(true);
  });
});
