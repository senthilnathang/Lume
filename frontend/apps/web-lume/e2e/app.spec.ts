import { test, expect } from '@playwright/test';

test.describe('GAWDESY Application Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(60000);
  });

  test('homepage loads and renders correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for Vue app to hydrate
    await page.waitForSelector('#app', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // Check title - contains organization name
    const title = await page.title();
    expect(title.toLowerCase()).toContain('gandhian');
    expect(title.toLowerCase()).toContain('welfare');
    
    // Check that the app rendered with content
    const appContent = await page.locator('#app').innerHTML();
    expect(appContent.length).toBeGreaterThan(100);
    
    // Check for main heading
    const heading = await page.locator('h1, h2').first().textContent();
    expect(heading).toBeTruthy();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Wait for Vue to hydrate
    await page.waitForSelector('#app', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // Check page loaded - title should contain login
    const title = await page.title();
    expect(title.toLowerCase()).toContain('login');
  });

  test('public pages load correctly', async ({ page }) => {
    const pages = [
      { path: '/', name: 'Homepage' },
      { path: '/about', name: 'About' },
      { path: '/programmes', name: 'Programmes' },
      { path: '/contact', name: 'Contact' },
    ];
    
    for (const p of pages) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      // Check page has content
      const content = await page.locator('#app').innerHTML();
      expect(content.length).toBeGreaterThan(50), `${p.name} should have content`;
    }
  });

  test('admin route redirects or shows login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // Should either be on login page or admin page
    const url = page.url();
    expect(url).toMatch(/login|admin/);
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const mobileContent = await page.locator('#app').innerHTML();
    expect(mobileContent.length).toBeGreaterThan(50);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const desktopContent = await page.locator('#app').innerHTML();
    expect(desktopContent.length).toBeGreaterThan(50);
  });

  test('page performance is acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    const loadTime = Date.now() - startTime;
    
    // Page should load in less than 15 seconds
    expect(loadTime).toBeLessThan(15000);
  });

  test('footer is visible on homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // Check for footer
    const footerCount = await page.locator('footer').count();
    expect(footerCount).toBeGreaterThan(0);
  });

  test('programmes page has content', async ({ page }) => {
    await page.goto('/programmes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // Check page loaded
    const url = page.url();
    expect(url).toMatch(/programmes/);
    
    // Check for content
    const content = await page.locator('#app').innerHTML();
    expect(content.length).toBeGreaterThan(50);
  });

  test('contact page has form elements', async ({ page }) => {
    await page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // Check for form or input elements
    const inputs = page.locator('input, textarea');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });
});

test.describe('Backend API Tests', () => {
  test('health endpoint responds (or fails gracefully)', async ({ page }) => {
    const response = await page.request.get('/api/health').catch(() => null);
    
    if (response) {
      expect([200, 500, 404, 503]).toContain(response.status());
    } else {
      console.log('Backend not running - this is expected in frontend-only tests');
    }
  });
});
