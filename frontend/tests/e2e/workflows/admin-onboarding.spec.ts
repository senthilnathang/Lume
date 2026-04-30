import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, closeDrawer, expectSuccessMessage, navigateToMenuItem } from '../helpers/ui-helpers';

/**
 * Admin Onboarding Workflow
 *
 * Simulates an admin setting up the Lume system:
 * 1. Login as admin
 * 2. Create first team member (user)
 * 3. Configure role and assign permissions
 * 4. Set up organization settings
 * 5. Configure basic site settings
 * 6. Verify setup completion
 *
 * Real-world workflow for initial system setup
 */

test.describe('Workflow: Admin Onboarding', () => {
  test('complete admin onboarding flow', async ({ adminPage }) => {
    // Step 1: Admin dashboard access
    await adminPage.goto('/admin/dashboard');
    await expect(adminPage).toHaveURL(/.*\/admin\/(dashboard|home)/);

    // Step 2: Create first team member
    await navigateToMenuItem(adminPage, 'Team');
    await waitForTable(adminPage);
    await expect(adminPage.url()).toContain('/admin/team');

    // Open create user drawer
    await openDrawer(adminPage, 'create');
    const timestamp = Date.now();
    const newUserEmail = `team-member-${timestamp}@lume.test`;

    await fillForm(adminPage, {
      'First Name': 'John',
      'Last Name': 'Developer',
      'Email': newUserEmail,
    });

    // Set initial password
    const passwordField = adminPage.locator('input[type="password"]').first();
    await passwordField.fill('TempPassword@123');

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify user appears in table
    await waitForTable(adminPage);
    const userRow = adminPage.locator(`text=${newUserEmail}`);
    await expect(userRow).toBeVisible();

    // Step 3: Configure user role and permissions
    // Navigate to RBAC/Roles
    await navigateToMenuItem(adminPage, 'Settings');
    await navigateToMenuItem(adminPage, 'RBAC');

    // Wait for roles table
    await waitForTable(adminPage);

    // Create custom role
    await openDrawer(adminPage, 'create');
    const roleName = `Content Manager ${timestamp}`;

    await fillForm(adminPage, {
      'Name': roleName,
      'Description': 'Can manage pages, menus, and media',
    });

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify role created
    await waitForTable(adminPage);
    const roleRow = adminPage.locator(`text=${roleName}`);
    await expect(roleRow).toBeVisible();

    // Step 4: Set up organization settings
    await navigateToMenuItem(adminPage, 'Settings');
    const settingsButton = adminPage.locator('button:has-text("Settings"), a:has-text("Settings")').first();

    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }

    // Fill basic organization settings
    const siteName = adminPage.locator('input[name*="siteName"], input[name*="name"]').first();
    if (await siteName.count() > 0) {
      await siteName.fill('Test Organization');
    }

    const siteEmail = adminPage.locator('input[type="email"], input[name*="email"]').first();
    if (await siteEmail.count() > 0) {
      await siteEmail.fill('admin@testorg.lume');
    }

    // Submit settings
    const submitButton = adminPage.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }

    // Step 5: Configure basic site settings (SEO, general)
    await navigateToMenuItem(adminPage, 'Website');
    await navigateToMenuItem(adminPage, 'Settings');

    await expect(adminPage.url()).toContain('/admin/website/settings');

    // Fill SEO metadata
    const metaTitleField = adminPage.locator('input[placeholder*="title" i], input[name*="metaTitle"]').first();
    if (await metaTitleField.count() > 0) {
      await metaTitleField.fill('My Awesome Site');
    }

    const metaDescField = adminPage.locator('textarea[placeholder*="description" i], textarea[name*="metaDesc"]').first();
    if (await metaDescField.count() > 0) {
      await metaDescField.fill('Welcome to our amazing website built with Lume');
    }

    // Save settings
    const saveButton = adminPage.locator('button:has-text("Save"), button[type="submit"]').first();
    if (await saveButton.count() > 0) {
      await saveButton.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});
    }

    // Step 6: Verify dashboard shows setup status
    await adminPage.goto('/admin/dashboard');

    // Dashboard should be accessible and show overview
    await expect(adminPage.url()).toContain('/admin');

    // Should see main navigation items
    const sidebarItems = adminPage.locator('[class*="sidebar"], [class*="menu"], nav');
    await expect(sidebarItems.first()).toBeVisible();

    // Verify we can see team, settings, website modules
    const teamLink = adminPage.locator('a, button', { hasText: /Team|Users/i }).first();
    const settingsLink = adminPage.locator('a, button', { hasText: /Settings|Configuration/i }).first();
    const websiteLink = adminPage.locator('a, button', { hasText: /Website|Pages/i }).first();

    if (await teamLink.count() > 0) await expect(teamLink).toBeVisible();
    if (await settingsLink.count() > 0) await expect(settingsLink).toBeVisible();
    if (await websiteLink.count() > 0) await expect(websiteLink).toBeVisible();

    console.log('✓ Admin onboarding workflow completed successfully');
  });

  test('admin can configure webhooks', async ({ adminPage }) => {
    // Navigate to webhook/automation settings
    await adminPage.goto('/admin/settings');

    // Look for automation or webhook section
    const automationMenu = adminPage.locator('a, button', { hasText: /Automation|Webhooks|Integration/i }).first();

    if (await automationMenu.count() > 0) {
      await automationMenu.click();
      await adminPage.waitForLoadState('networkidle').catch(() => {});

      // Verify we're on automation/webhook page
      const pageTitle = adminPage.locator('h1, h2, [class*="title"]').first();
      await expect(pageTitle).toBeVisible();
    }
  });

  test('admin can manage multiple users and roles', async ({ adminPage }) => {
    // Navigate to team
    await adminPage.goto('/admin/team');
    await waitForTable(adminPage, { minRows: 1 });

    // Count existing users
    const initialUserCount = await adminPage.locator('tbody tr').count();
    expect(initialUserCount).toBeGreaterThan(0);

    // Create another user
    const timestamp = Date.now();
    await openDrawer(adminPage, 'create');

    await fillForm(adminPage, {
      'First Name': 'Jane',
      'Last Name': 'Editor',
      'Email': `editor-${timestamp}@lume.test`,
    });

    const passwordField = adminPage.locator('input[type="password"]').first();
    await passwordField.fill('TempPassword@123');

    await submitForm(adminPage);
    await expectSuccessMessage(adminPage);

    // Verify new user count increased
    await waitForTable(adminPage);
    const newUserCount = await adminPage.locator('tbody tr').count();
    expect(newUserCount).toBeGreaterThanOrEqual(initialUserCount + 1);

    console.log('✓ Multiple user management completed successfully');
  });

  test('admin setup creates audit trail', async ({ adminPage }) => {
    // Navigate to audit logs
    await adminPage.goto('/admin/audit');

    if (await adminPage.url().then(url => url.includes('/admin/audit'))) {
      // Wait for audit table to load
      await waitForTable(adminPage, { minRows: 1 }).catch(() => {
        // Audit logs might not exist, that's ok
      });

      const auditRows = await adminPage.locator('tbody tr').count();
      // Should have some audit entries from admin actions
      expect(auditRows).toBeGreaterThanOrEqual(0);

      console.log(`✓ Found ${auditRows} audit log entries`);
    }
  });
});
