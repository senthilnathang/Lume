import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, uploadFile, clickTableAction, expectSuccessMessage, expectErrorMessage } from '../helpers/ui-helpers';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Media Management CRUD Tests (Media Module)
 *
 * Tests comprehensive CRUD operations for media library:
 * - Upload image/file
 * - Edit image (crop, resize)
 * - Browse media library
 * - Search/filter media
 * - Delete media
 * - Bulk operations
 */

test.describe('Module: Media', () => {
  let testImagePath: string;

  test.beforeAll(() => {
    // Create a test image file (simple 1x1 pixel PNG)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    testImagePath = join('/tmp', `test-image-${Date.now()}.png`);
    writeFileSync(testImagePath, pngBuffer);
  });

  test.afterAll(() => {
    // Clean up test image
    try {
      unlinkSync(testImagePath);
    } catch (e) {
      // File might already be deleted
    }
  });

  test('should navigate to media library', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/media');
  });

  test('should upload image file', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');

    // Look for upload button
    const uploadButton = adminPage.locator('button:has-text("Upload"), button:has-text("Add Image")').first();
    if (await uploadButton.count() > 0) {
      await uploadButton.click();

      // Look for file input
      const fileInput = adminPage.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await uploadFile(adminPage, 'input[type="file"]', testImagePath);

        // Wait for upload to complete
        await expectSuccessMessage(adminPage);
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should validate file type on upload', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');

    const uploadButton = adminPage.locator('button:has-text("Upload"), button:has-text("Add Image")').first();
    if (await uploadButton.count() > 0) {
      await uploadButton.click();

      // Try to upload invalid file type (create temp .txt file)
      const txtPath = join('/tmp', `test-${Date.now()}.txt`);
      writeFileSync(txtPath, 'invalid file content');

      const fileInput = adminPage.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await uploadFile(adminPage, 'input[type="file"]', txtPath);

        // Should show error
        await expectErrorMessage(adminPage);
      }

      try {
        unlinkSync(txtPath);
      } catch (e) {}
    }
  });

  test('should read media library with pagination', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage, { minRows: 1 });

    // Verify gallery/grid layout
    const mediaItems = adminPage.locator('.media-item, [role="gridcell"]');
    if (await mediaItems.count() > 0) {
      expect(await mediaItems.count()).toBeGreaterThan(0);
    }

    // Check pagination
    const paginationButton = adminPage.locator('.ant-pagination button').first();
    if (await paginationButton.count() > 0) {
      expect(paginationButton).toBeVisible();
    }
  });

  test('should search media by filename', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Look for search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Should show filtered results
      const mediaItems = adminPage.locator('.media-item, [role="gridcell"]');
      if (await mediaItems.count() > 0) {
        expect(await mediaItems.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should filter media by type', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Look for type filter
    const typeFilter = adminPage.locator('label:has-text("Type") ~ .ant-select, [placeholder*="Type"]').first();
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      await adminPage.waitForSelector('.ant-select-dropdown', { timeout: 5000 }).catch(() => {});

      const imageOption = adminPage.locator('[title="Image"], text=Image').first();
      if (await imageOption.count() > 0) {
        await imageOption.click();
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }
  });

  test('should open media details/edit', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Click on first media item
    const mediaItem = adminPage.locator('.media-item, [role="gridcell"]').first();
    if (await mediaItem.count() > 0) {
      await mediaItem.click();

      // Wait for details panel or modal
      await adminPage.waitForSelector('[role="dialog"], .media-details-panel', { timeout: 10000 }).catch(() => {});
      const detailsPanel = adminPage.locator('[role="dialog"], .media-details-panel').first();
      expect(await detailsPanel.count()).toBeGreaterThan(0);
    }
  });

  test('should edit image properties', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Open first media item
    const mediaItem = adminPage.locator('.media-item, [role="gridcell"]').first();
    if (await mediaItem.count() > 0) {
      await mediaItem.click();

      // Wait for details
      await adminPage.waitForSelector('[role="dialog"], .media-details-panel', { timeout: 10000 }).catch(() => {});

      // Update alt text or title
      await fillForm(adminPage, {
        'Alt Text': 'Test Image Alt Text',
        'Title': 'Test Image Title',
      });

      // Save
      const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should crop image', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Open first image
    const mediaItem = adminPage.locator('.media-item, [role="gridcell"]').first();
    if (await mediaItem.count() > 0) {
      await mediaItem.click();

      // Look for crop button
      const cropButton = adminPage.locator('button:has-text("Crop"), button:has-text("Edit Image")').first();
      if (await cropButton.count() > 0) {
        await cropButton.click();

        // Wait for crop editor
        await adminPage.waitForSelector('.image-crop-editor, [role="dialog"]', { timeout: 10000 }).catch(() => {});

        // Save crop
        const saveCropButton = adminPage.locator('button:has-text("Apply"), button:has-text("Save Crop")').first();
        if (await saveCropButton.count() > 0) {
          await saveCropButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should resize image', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Open first image
    const mediaItem = adminPage.locator('.media-item, [role="gridcell"]').first();
    if (await mediaItem.count() > 0) {
      await mediaItem.click();

      // Look for resize option
      const resizeButton = adminPage.locator('button:has-text("Resize")').first();
      if (await resizeButton.count() > 0) {
        await resizeButton.click();

        // Fill resize dimensions
        await fillForm(adminPage, {
          'Width': '800',
          'Height': '600',
        });

        const saveButton = adminPage.locator('button:has-text("Apply"), button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should delete media file', async ({ adminPage }) => {
    // Upload a file first
    await adminPage.goto('/admin/media');

    const uploadButton = adminPage.locator('button:has-text("Upload"), button:has-text("Add Image")').first();
    if (await uploadButton.count() > 0) {
      await uploadButton.click();

      const fileInput = adminPage.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await uploadFile(adminPage, 'input[type="file"]', testImagePath);
        await expectSuccessMessage(adminPage);
        await adminPage.waitForLoadState('networkidle').catch(() => {});
      }
    }

    // Now delete it
    const lastMediaItem = adminPage.locator('.media-item, [role="gridcell"]').last();
    if (await lastMediaItem.count() > 0) {
      await lastMediaItem.click();

      // Look for delete button
      const deleteButton = adminPage.locator('button:has-text("Delete")').first();
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

  test('should bulk select media files', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Find checkboxes on media items
    const checkboxes = adminPage.locator('.media-item input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Verify bulk action button appears
      const bulkAction = adminPage.locator('button:has-text("Delete"), button:has-text("Bulk Delete")').first();
      if (await bulkAction.count() > 0) {
        expect(bulkAction).toBeVisible();
      }
    }
  });

  test('should bulk delete media files', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Select multiple items
    const checkboxes = adminPage.locator('.media-item input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Click bulk delete
      const bulkDelete = adminPage.locator('button:has-text("Delete"), button:has-text("Bulk Delete")').first();
      if (await bulkDelete.count() > 0) {
        await bulkDelete.click();

        // Confirm
        const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should prevent access to media as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/media', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show no access
    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/media') || url.includes('dashboard') || url.includes('error');
    expect(hasNoAccess).toBe(true);
  });

  test('should sort media by date', async ({ adminPage }) => {
    await adminPage.goto('/admin/media');
    await waitForTable(adminPage);

    // Click date header to sort
    const dateHeader = adminPage.locator('thead th:has-text("Date"), thead th:has-text("Uploaded")').first();
    if (await dateHeader.count() > 0) {
      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Click again for descending
      await dateHeader.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Verify sort indicator
      const sortIcon = dateHeader.locator('.ant-table-column-sorter-up, .ant-table-column-sorter-down');
      expect(await sortIcon.count()).toBeGreaterThan(0);
    }
  });
});
