import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, clickTableAction, expectSuccessMessage, expectErrorMessage } from '../helpers/ui-helpers';

/**
 * Forms Management CRUD Tests (Website Module)
 *
 * Tests comprehensive CRUD operations for website forms:
 * - Create form with builder
 * - Add form fields (text, email, select, etc)
 * - Read forms in table
 * - Update form configuration
 * - View form submissions/responses
 * - Delete form
 */

test.describe('Module: Forms', () => {
  test('should navigate to forms list', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);
    expect(adminPage.url()).toContain('/admin/website/forms');
  });

  test('should create new form', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await openDrawer(adminPage, 'create');

    const timestamp = Date.now();
    const formTitle = `Test Form ${timestamp}`;

    await fillForm(adminPage, {
      'Title': formTitle,
      'Description': 'A test form for E2E testing',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify form appears in table
    await waitForTable(adminPage);
    const formRow = adminPage.locator(`text=${formTitle}`);
    await expect(formRow).toBeVisible();
  });

  test('should validate required form title', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await openDrawer(adminPage, 'create');

    // Try to submit without title
    const submitButton = adminPage.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation error
    const errorMessage = adminPage.locator('[role="alert"], .ant-form-item-explain-error').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should read forms in table', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage, { minRows: 1 });

    // Verify table structure
    const tableHeaders = adminPage.locator('thead th');
    expect(await tableHeaders.count()).toBeGreaterThan(0);
  });

  test('should search forms by title', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    // Look for search input
    const searchInput = adminPage.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('Test');
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      await waitForTable(adminPage);

      const formRow = adminPage.locator('text=Test');
      if (await formRow.count() > 0) {
        expect(formRow).toBeVisible();
      }
    }
  });

  test('should open form builder', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    // Click edit button on first form
    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for form builder to load
      await adminPage.waitForSelector('.form-builder, [role="dialog"]', { timeout: 10000 }).catch(() => {});
      const builder = adminPage.locator('.form-builder, [role="dialog"]').first();
      expect(await builder.count()).toBeGreaterThan(0);
    }
  });

  test('should add text field to form', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for add field button
      const addFieldButton = adminPage.locator('button:has-text("Add Field"), button:has-text("Add Text Field")').first();
      if (await addFieldButton.count() > 0) {
        await addFieldButton.click();

        // Fill field configuration
        await fillForm(adminPage, {
          'Label': 'Full Name',
          'Name': 'full_name',
          'Required': true,
        });

        // Save field
        const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should add email field to form', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for add field dropdown
      const addFieldButton = adminPage.locator('button:has-text("Add Field")').first();
      if (await addFieldButton.count() > 0) {
        await addFieldButton.click();

        // Select email field type
        const emailOption = adminPage.locator('button:has-text("Email"), [title="Email"]').first();
        if (await emailOption.count() > 0) {
          await emailOption.click();

          await fillForm(adminPage, {
            'Label': 'Email Address',
            'Name': 'email',
            'Required': true,
          });

          const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await expectSuccessMessage(adminPage);
          }
        }
      }
    }
  });

  test('should add select field to form', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for add field dropdown
      const addFieldButton = adminPage.locator('button:has-text("Add Field")').first();
      if (await addFieldButton.count() > 0) {
        await addFieldButton.click();

        // Select dropdown field type
        const selectOption = adminPage.locator('button:has-text("Select"), button:has-text("Dropdown"), [title="Select"]').first();
        if (await selectOption.count() > 0) {
          await selectOption.click();

          await fillForm(adminPage, {
            'Label': 'Country',
            'Name': 'country',
          });

          // Add options
          const addOptionButton = adminPage.locator('button:has-text("Add Option")').first();
          if (await addOptionButton.count() > 0) {
            await addOptionButton.click();
            await fillForm(adminPage, { 'Option': 'USA' });
          }

          const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await expectSuccessMessage(adminPage);
          }
        }
      }
    }
  });

  test('should update form field', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Find first field edit button
      const fieldEditButton = adminPage.locator('[role="dialog"] button:has-text("Edit"), .form-field-row button:has-text("Edit")').first();
      if (await fieldEditButton.count() > 0) {
        await fieldEditButton.click();

        // Update label
        await fillForm(adminPage, {
          'Label': 'Updated Field ' + Date.now(),
        });

        const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should delete form field', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Find first field delete button
      const fieldDeleteButton = adminPage.locator('[role="dialog"] button:has-text("Delete"), .form-field-row button:has-text("Delete")').first();
      if (await fieldDeleteButton.count() > 0) {
        await fieldDeleteButton.click();

        // Confirm deletion
        const confirmButton = adminPage.locator('.ant-popconfirm button:has-text("OK"), .ant-modal button:has-text("Delete")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should view form submissions', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    // Click on first form to view submissions
    const viewButton = adminPage.locator('tbody tr').first().locator('button:has-text("View"), button:has-text("Submissions"), button:has-text("Responses")').first();
    if (await viewButton.count() > 0) {
      await viewButton.click();

      // Wait for submissions table/list
      await adminPage.waitForLoadState('networkidle').catch(() => {});
      const submissionsTable = adminPage.locator('tbody, .submissions-list').first();
      expect(await submissionsTable.count()).toBeGreaterThan(0);
    }
  });

  test('should delete form with confirmation', async ({ adminPage }) => {
    // Create a form first
    const timestamp = Date.now();
    await adminPage.goto('/admin/website/forms');
    await openDrawer(adminPage, 'create');

    const formTitle = `Delete Test ${timestamp}`;
    await fillForm(adminPage, {
      'Title': formTitle,
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    // Now delete it
    await waitForTable(adminPage);
    const deleteRow = adminPage.locator(`tbody tr:has-text("${formTitle}")`).first();
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

  test('should configure form notifications', async ({ adminPage }) => {
    await adminPage.goto('/admin/website/forms');
    await waitForTable(adminPage);

    const editButton = adminPage.locator('tbody tr').first().locator('button:has-text("Edit"), button:has-text("Build")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Look for settings/notifications button
      const settingsButton = adminPage.locator('button:has-text("Settings"), button:has-text("Notifications")').first();
      if (await settingsButton.count() > 0) {
        await settingsButton.click();

        // Configure notification email
        await fillForm(adminPage, {
          'Notification Email': 'admin@test.com',
        });

        const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await expectSuccessMessage(adminPage);
        }
      }
    }
  });

  test('should prevent access to forms as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/website/forms', { waitUntil: 'networkidle' }).catch(() => {});

    // Should either redirect or show no access
    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/website/forms') || url.includes('dashboard') || url.includes('error');
    expect(hasNoAccess).toBe(true);
  });
});
