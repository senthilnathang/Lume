import { test, expect } from '@playwright/test';

test.describe('Fixed Login Test', () => {
  
  test('admin login with local API', async ({ page }) => {
    console.log('Testing login with local backend...');
    
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill login form with correct credentials
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await emailInput.fill('admin@gawdesy.org');
    await passwordInput.fill('GawdesyAdmin@2024!');
    
    console.log('Form filled, submitting login...');
    
    // Submit the form
    await submitButton.click();
    
    // Wait for login to process
    await page.waitForTimeout(8000);
    
    // Check results
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Check for success indicators
    const hasSuccess = currentUrl.includes('/admin') || 
                     await page.locator('text=Dashboard').count() > 0 ||
                     await page.locator('text=Login successful').count() > 0;
    
    // Check for token in local storage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    console.log('Success indicators:', hasSuccess);
    console.log('Token found:', !!token);
    console.log('User found:', !!user);
    
    // Check for error messages
    const errorExists = await page.locator('.error-message, .text-red-500, [role="alert"]').count() > 0;
    if (errorExists) {
      const errorText = await page.locator('.error-message, .text-red-500, [role="alert"]').first().textContent();
      console.log('Error message:', errorText);
    }
    
    // Verify login success
    expect(hasSuccess || !!token).toBeTruthy();
    
    console.log('✓ Login test completed!');
  });
});