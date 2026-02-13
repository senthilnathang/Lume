import { test, expect } from '@playwright/test';

test.describe('Simple Login Test', () => {
  
  test('admin login with new password', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill login form with new credentials
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('admin@gawdesy.org');
    await passwordInput.fill('GawdesyAdmin@2024!');
    
    console.log('Form filled, submitting...');
    
    // Submit the form
    await submitButton.click();
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check for any success indication
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Check for success indicators
    const hasSuccess = currentUrl.includes('/admin') || 
                     await page.locator('text=Login successful').count() > 0 ||
                     await page.locator('text=Dashboard').count() > 0;
    
    console.log('Success indicators found:', hasSuccess);
    
    // Check for token in storage
    const localStorageToken = await page.evaluate(() => {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    });
    
    console.log('Token found in storage:', !!localStorageToken);
    
    // At least one success indicator should be true
    expect(hasSuccess || !!localStorageToken).toBeTruthy();
    
    console.log('Login test completed successfully!');
  });
});
