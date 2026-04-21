import { test, expect } from '@playwright/test';

test.describe('Login Flow Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(60000);
  });

  test('login form stays on page when backend is down', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill the form
    await page.locator('input[type="email"]').first().fill('admin@gawdesy.org');
    await page.locator('input[type="password"]').first().fill('admin123');
    
    // Submit the form
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for timeout + error to appear (backend is down, so it will fail after ~10s)
    await page.waitForTimeout(12000);
    
    // Check we're still on login page (not redirected to home)
    const url = page.url();
    expect(url).toContain('/login');
    
    // Check for error alert
    const hasErrorAlert = await page.locator('.error-alert').count() > 0;
    expect(hasErrorAlert).toBe(true);
  });

  test('login form prevents default form submission', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Get initial URL
    const initialUrl = page.url();
    
    // Fill and submit
    await page.locator('input[type="email"]').first().fill('admin@gawdesy.org');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForTimeout(2000);
    
    // Should still be on login page
    const currentUrl = page.url();
    expect(currentUrl).toBe(initialUrl);
  });
});
