import { test, expect } from '@playwright/test';

test.describe('Login Form Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(60000);
  });

  test('login page has working form fields', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    
    // Check for password input (type="password")
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  test('can fill login form with credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill email
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('admin@gawdesy.org');
    
    // Fill password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('admin123');
    
    // Verify values were entered
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    
    expect(emailValue).toBe('admin@gawdesy.org');
    expect(passwordValue).toBe('admin123');
  });

  test('login form submits without JavaScript errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill the form
    await page.locator('input[type="email"]').first().fill('admin@gawdesy.org');
    await page.locator('input[type="password"]').first().fill('admin123');
    
    // Click submit
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForTimeout(2000);
    
    // Filter out acceptable errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('network') &&
      !error.includes('Failed to load resource') &&
      !error.includes('ERR_CONNECTION_REFUSED') &&
      !error.includes('/api/') &&
      !error.includes('proxy')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});
