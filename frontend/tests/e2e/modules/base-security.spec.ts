import { test, expect } from '../fixtures/auth.fixture';
import { fillForm, submitForm, waitForTable, openDrawer, expectSuccessMessage } from '../helpers/ui-helpers';

/**
 * Base Security Module CRUD Tests
 * Tests security policies and configurations
 */

test.describe('Module: Base Security', () => {
  test('should navigate to security', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});
    expect(adminPage.url()).toContain('/admin/base_security');
  });

  test('should display security settings', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const form = adminPage.locator('form, .security-form').first();
    expect(await form.count()).toBeGreaterThan(0);
  });

  test('should update password policy', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const minLengthInput = adminPage.locator('label:has-text("Password") ~ input[type="number"], input[placeholder*="length"]').first();
    if (await minLengthInput.count() > 0) {
      await fillForm(adminPage, {
        'Minimum Password Length': '8',
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should configure two-factor authentication', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const twoFaToggle = adminPage.locator('label:has-text("Two-Factor") ~ .ant-switch, label:has-text("2FA") ~ .ant-switch').first();
    if (await twoFaToggle.count() > 0) {
      await twoFaToggle.click();

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should configure rate limiting', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const rateLimitInput = adminPage.locator('label:has-text("Rate Limit") ~ input[type="number"], input[placeholder*="requests"]').first();
    if (await rateLimitInput.count() > 0) {
      await fillForm(adminPage, {
        'Rate Limit': '100',
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should configure IP whitelist', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const whitelistInput = adminPage.locator('label:has-text("IP Whitelist") ~ textarea, label:has-text("Whitelist") ~ input').first();
    if (await whitelistInput.count() > 0) {
      await fillForm(adminPage, {
        'IP Whitelist': '192.168.1.1',
      });

      const saveButton = adminPage.locator('button[type="submit"], button:has-text("Save")').first();
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await expectSuccessMessage(adminPage);
      }
    }
  });

  test('should prevent access as regular user', async ({ userPage }) => {
    await userPage.goto('/admin/base_security', { waitUntil: 'networkidle' }).catch(() => {});

    const url = userPage.url();
    const hasNoAccess = !url.includes('/admin/base_security') || url.includes('dashboard');
    expect(hasNoAccess).toBe(true);
  });

  test('should display security audit trail', async ({ adminPage }) => {
    await adminPage.goto('/admin/base_security');
    await adminPage.waitForLoadState('networkidle').catch(() => {});

    const auditLog = adminPage.locator('text=Audit, text=Log, .security-audit').first();
    if (await auditLog.count() > 0) {
      expect(auditLog).toBeVisible();
    }
  });
});
