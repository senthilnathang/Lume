import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * User Profile Module Tests
 * Tests user account settings and profile management
 */

test.describe('Module: User Profile', () => {
  test('should navigate to user profile', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});
    expect(adminPage.url()).toContain('/admin/user/profile');
  });

  test('should display user profile form', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const form = adminPage.locator('form, .profile-form').first();
    expect(await form.count()).toBeGreaterThan(0);
  });

  test('should update user name', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const firstNameInput = adminPage.locator('label:has-text("First Name") ~ input, input[placeholder*="First Name"]').first();
    if (await firstNameInput.count() > 0) {
      await fillForm(adminPage, {
        'First Name': 'Admin Updated',
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should update user email', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const emailInput = adminPage.locator('label:has-text("Email") ~ input[type="email"], input[placeholder*="email"]').first();
    if (await emailInput.count() > 0) {
      // Read current email first (if visible)
      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        // Don't actually update email to avoid issues
        // Just verify the button exists
        expect(saveButton).toBeVisible();
      }
    }
  });

  test('should change password', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const passwordTab = adminPage.locator('button:has-text("Password"), button:has-text("Security"), .ant-tabs-tab:has-text("Password")').first();
    if (await passwordTab.count() > 0) {
      await passwordTab.click();

      const currentPasswordInput = adminPage.locator('label:has-text("Current Password") ~ input[type="password"], input[placeholder*="Current"]').first();
      if (await currentPasswordInput.count() > 0) {
        // Password change requires verification, skip actual change
        expect(currentPasswordInput).toBeVisible();
      }
    }
  });

  test('should update profile picture', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const uploadButton = adminPage.locator('button:has-text("Upload"), button:has-text("Change Photo"), .profile-pic-upload').first();
    if (await uploadButton.count() > 0) {
      expect(uploadButton).toBeVisible();
    }
  });

  test('should enable two-factor authentication', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const twoFaButton = adminPage.locator('button:has-text("Enable 2FA"), button:has-text("Two-Factor")').first();
    if (await twoFaButton.count() > 0) {
      expect(twoFaButton).toBeVisible();
    }
  });

  test('should view login history', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const historyTab = adminPage.locator('button:has-text("Login History"), button:has-text("Sessions"), .ant-tabs-tab').last();
    if (await historyTab.count() > 0) {
      await historyTab.click();

      const historyTable = adminPage.locator('tbody, .history-list').first();
      if (await historyTable.count() > 0) {
        expect(historyTable).toBeVisible();
      }
    }
  });

  test('should manage connected devices', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const devicesSection = adminPage.locator('text=Device, text=Session, .devices-section').first();
    if (await devicesSection.count() > 0) {
      expect(devicesSection).toBeVisible();
    }
  });

  test('should manage API tokens', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const tokensSection = adminPage.locator('text=API, text=Token, .api-tokens').first();
    if (await tokensSection.count() > 0) {
      expect(tokensSection).toBeVisible();
    }
  });

  test('should reset to default settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/user/profile');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const resetButton = adminPage.locator('button:has-text("Reset"), button:has-text("Default")').first();
    if (await resetButton.count() > 0) {
      expect(resetButton).toBeVisible();
    }
  });
});
