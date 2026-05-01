import { chromium } from '@playwright/test';

async function testLogin() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🧪 Testing Credentials with Updated Frontend...\n');
    
    // Navigate to login
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 5000 });
    console.log('✅ Navigated to login page');
    
    // Wait for form to load
    await page.waitForTimeout(1500);
    
    // Fill email
    const emailInput = page.locator('input').nth(0);
    await emailInput.fill('admin@lume.dev');
    console.log('✅ Email filled: admin@lume.dev');
    
    // Fill password
    const passwordInput = page.locator('input').nth(1);
    await passwordInput.fill('Admin@123');
    console.log('✅ Password filled: Admin@123');
    
    // Submit
    const submitBtn = page.locator('button').nth(0);
    await submitBtn.click();
    console.log('✅ Login submitted');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    const pageContent = await page.content();
    
    console.log('\n📍 Final URL:', finalUrl);
    
    if (finalUrl.includes('/dashboard') || !finalUrl.includes('/login')) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('   Email: admin@lume.dev');
      console.log('   Password: Admin@123');
      console.log('   Credentials Fixed!');
    } else {
      console.log('\n⚠️  Frontend needs to be rebuilt after changes');
      console.log('   Run: npm run build (in lume-admin)');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLogin();
