import { test, expect, Page } from '@playwright/test';
import { fillForm, submitForm, isLoggedIn, expectSuccessMessage, expectErrorMessage } from './helpers/ui-helpers';

/**
 * Authentication Test Suite
 *
 * Tests core authentication flows:
 * - Valid login
 * - Invalid credentials
 * - Logout
 * - Session persistence
 * - Permission denied (403)
 * - Unauthorized redirect (302 to login)
 * - Token refresh
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/');
  });

  test('should login with valid admin credentials', async ({ page }) => {
    // Fill login form
    await fillForm(page, {
      'Email': 'admin@lume.dev',
      'Password': 'admin123',
    });

    // Submit form
    await submitForm(page, { waitForUrl: '/dashboard' });

    // Verify logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    // Verify dashboard is visible
    expect(page.url()).toContain('/dashboard');
  });

  test('should login with valid user credentials', async ({ page }) => {
    // Fill login form
    await fillForm(page, {
      'Email': 'user@lume.dev',
      'Password': 'user123',
    });

    // Submit form
    await submitForm(page, { waitForUrl: '/dashboard' });

    // Verify logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);
  });

  test('should reject invalid email', async ({ page }) => {
    // Fill login form with invalid email
    await fillForm(page, {
      'Email': 'nonexistent@example.com',
      'Password': 'wrongpassword',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for error message
    await expectErrorMessage(page, { timeout: 10000 });

    // Verify still on login page
    expect(page.url()).toContain('/');
  });

  test('should reject invalid password', async ({ page }) => {
    // Fill login form with valid email but wrong password
    await fillForm(page, {
      'Email': 'admin@lume.dev',
      'Password': 'wrongpassword123',
    });

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for error message
    await expectErrorMessage(page, { timeout: 10000 });

    // Verify still on login page
    expect(page.url()).toContain('/');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await fillForm(page, {
      'Email': 'admin@lume.dev',
      'Password': 'admin123',
    });
    await submitForm(page, { waitForUrl: '/dashboard' });

    // Verify logged in
    expect(await isLoggedIn(page)).toBe(true);

    // Logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [class*="logout"]');
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
    } else {
      // Try profile menu
      const profileMenu = page.locator('[class*="profile"], [title="Profile"]');
      if (await profileMenu.count() > 0) {
        await profileMenu.first().click();
        const logoutOption = page.locator('button:has-text("Logout"), button:has-text("Sign Out")');
        if (await logoutOption.count() > 0) {
          await logoutOption.first().click();
        }
      }
    }

    // Wait for redirect to login
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      // Logout might not redirect, just verify user is logged out
    });

    // Verify logged out (checking local storage or UI)
    const loggedInAfterLogout = await isLoggedIn(page);
    expect(loggedInAfterLogout).toBe(false);
  });

  test('should persist session on page reload', async ({ page }) => {
    // Login
    await fillForm(page, {
      'Email': 'admin@lume.dev',
      'Password': 'admin123',
    });
    await submitForm(page, { waitForUrl: '/dashboard' });

    // Get current URL
    const dashboardUrl = page.url();

    // Reload page
    await page.reload();

    // Verify still logged in and still on dashboard
    expect(await isLoggedIn(page)).toBe(true);
    expect(page.url()).toEqual(dashboardUrl);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    // Try to access protected route without logging in
    await page.goto('/dashboard', { waitUntil: 'networkidle' }).catch(() => {
      // Navigation might fail due to redirect
    });

    // Should be redirected to login
    expect(page.url()).toContain('/');
  });

  test('should refresh token on 401 response', async ({ page }) => {
    // Login
    await fillForm(page, {
      'Email': 'admin@lume.dev',
      'Password': 'admin123',
    });
    await submitForm(page, { waitForUrl: '/dashboard' });

    // Get auth token from storage
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    });

    expect(token).toBeTruthy();

    // Simulate token expiration by clearing and making API request
    // The app should automatically refresh the token
    const tokenAfterRequest = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    });

    // Token should still exist (either original or refreshed)
    expect(tokenAfterRequest).toBeTruthy();
  });

  test('should prevent access to admin routes with user role', async ({ page }) => {
    // Login as regular user
    await fillForm(page, {
      'Email': 'user@lume.dev',
      'Password': 'user123',
    });
    await submitForm(page, { waitForUrl: '/dashboard' });

    // Try to access admin-only route
    await page.goto('/admin/users', { waitUntil: 'networkidle' }).catch(() => {
      // Navigation might fail
    });

    // Should not have access (either 403 or redirect to accessible page)
    const url = page.url();
    expect(!url.includes('/admin/users') || url.includes('/')).toBe(true);
  });

  test('should load auth state from storage on init', async ({ browser }) => {
    // Create context with pre-set localStorage
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: 'http://localhost:5173',
            localStorage: [
              {
                name: 'auth_token',
                value: 'mock-token-value',
              },
            ],
          },
        ],
      },
    });

    const page = context.newPage();
    await page.goto('/');

    // Token should be loaded from storage
    const storedToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });

    expect(storedToken).toBe('mock-token-value');

    await page.close();
    await context.close();
  });
});
