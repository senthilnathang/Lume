import { test, expect } from '@playwright/test';

test.describe('Final Login Verification', () => {
  
  test('admin login works end-to-end', async ({ page }) => {
    console.log('Testing complete login flow...');
    
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Fill the login form
    await page.locator('input[type="email"]').fill('admin@gawdesy.org');
    await page.locator('input[type="password"]').fill('GawdesyAdmin@2024!');
    
    console.log('Submitting login form...');
    await page.locator('button[type="submit"]').click();
    
    // Wait for login processing
    await page.waitForTimeout(5000);
    
    // Check results
    const currentUrl = page.url();
    console.log('URL after login:', currentUrl);
    
    // Check for success indicators
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    console.log('Token in localStorage:', !!token);
    console.log('User in localStorage:', !!user);
    
    // If we got a token, login was successful
    const loginSuccessful = !!token && !!user;
    
    if (loginSuccessful) {
      console.log('✅ Login successful!');
    } else {
      // Check for error messages
      const errorElements = await page.locator('.error-message, .text-red-500').count();
      if (errorElements > 0) {
        const errorText = await page.locator('.error-message, .text-red-500').first().textContent();
        console.log('Error message found:', errorText);
      }
    }
    
    expect(loginSuccessful).toBeTruthy();
  });
  
  test('direct API call test', async ({ page }) => {
    console.log('Testing direct API call from browser context...');
    
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'admin@gawdesy.org',
            password: 'GawdesyAdmin@2024!'
          })
        });
        
        const data = await response.json();
        return {
          status: response.status,
          data,
          success: !!data.token
        };
      } catch (error) {
        return {
          error: error.message,
          success: false
        };
      }
    });
    
    console.log('API Test Result:', result);
    expect(result.success || result.status === 200).toBeTruthy();
  });
});