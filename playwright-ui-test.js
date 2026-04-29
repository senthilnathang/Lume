import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

const issues = [];

async function log(message, type = 'info') {
  const prefix = {
    info: '✓',
    warn: '⚠️',
    error: '❌',
    success: '✅'
  }[type] || '•';
  console.log(`${prefix} ${message}`);
}

async function testAdminLogin() {
  log('Testing admin login...', 'info');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to admin
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Check for login form elements
    const emailInput = await page.$('input[type="email"]') || await page.$('input[placeholder*="email" i]') || await page.$('input[name="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("Login")') || await page.$('button:has-text("Sign In")');

    if (!emailInput) {
      issues.push('Email input not found on login page');
      log('Email input not found on login page', 'error');
    }
    if (!passwordInput) {
      issues.push('Password input not found on login page');
      log('Password input not found on login page', 'error');
    }
    if (!submitBtn) {
      issues.push('Submit button not found on login page');
      log('Submit button not found on login page', 'error');
    } else {
      log('Login form elements found', 'success');
    }

    // Try to login
    if (emailInput && passwordInput) {
      await emailInput.fill('admin@lume.dev');
      await passwordInput.fill('admin123');
      await page.click('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');

      // Wait for navigation or dashboard load
      await page.waitForTimeout(2000);
      const url = page.url();
      if (url.includes('login')) {
        log('Login failed or still on login page', 'warn');
        issues.push('Login did not redirect away from login page');
      } else {
        log('Login successful, redirected to: ' + url, 'success');
      }
    }
  } catch (error) {
    log(`Login test error: ${error.message}`, 'error');
    issues.push(`Login test error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function testDashboardLoad() {
  log('Testing dashboard load...', 'info');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

    const title = await page.title();
    log(`Dashboard title: ${title}`, 'success');

    // Check for common dashboard elements
    const mainContent = await page.$('main') || await page.$('[role="main"]');
    if (mainContent) {
      log('Main content area found', 'success');
    } else {
      log('Main content area not found', 'warn');
      issues.push('Main content area not found on dashboard');
    }

    // Check for navigation
    const nav = await page.$('nav') || await page.$('[role="navigation"]');
    if (nav) {
      log('Navigation element found', 'success');
    } else {
      log('Navigation element not found', 'warn');
      issues.push('Navigation not found on dashboard');
    }
  } catch (error) {
    log(`Dashboard test error: ${error.message}`, 'error');
    issues.push(`Dashboard test error: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function testBackendConnectivity() {
  log('Testing backend connectivity...', 'info');
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      log(`Backend health: ${JSON.stringify(data)}`, 'success');
    } else {
      log(`Backend returned ${response.status}`, 'error');
      issues.push(`Backend health check failed with ${response.status}`);
    }
  } catch (error) {
    log(`Backend connectivity error: ${error.message}`, 'error');
    issues.push(`Backend connectivity error: ${error.message}`);
  }
}

async function testConsoleErrors() {
  log('Checking for console errors...', 'info');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      log(`Found ${errors.length} console errors:`, 'warn');
      errors.forEach(err => log(`  - ${err}`, 'error'));
      issues.push(`Console errors found: ${errors.length}`);
    } else {
      log('No console errors found', 'success');
    }
  } catch (error) {
    log(`Console error test failed: ${error.message}`, 'error');
  } finally {
    await browser.close();
  }
}

async function testResponsiveness() {
  log('Testing responsive design...', 'info');
  const browser = await chromium.launch();

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      const hasScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
      log(`${viewport.name} (${viewport.width}x${viewport.height}): ${hasScroll ? 'Has vertical scroll' : 'No scroll needed'}`, 'info');
    } catch (error) {
      log(`Responsiveness test failed for ${viewport.name}: ${error.message}`, 'error');
      issues.push(`Responsiveness test failed for ${viewport.name}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

async function runAllTests() {
  console.log('\n🧪 Starting Lume UI/UX Test Suite\n');
  console.log('================================\n');

  await testBackendConnectivity();
  console.log('');

  await testDashboardLoad();
  console.log('');

  await testAdminLogin();
  console.log('');

  await testConsoleErrors();
  console.log('');

  await testResponsiveness();
  console.log('');

  console.log('================================\n');
  if (issues.length > 0) {
    log(`Test Summary: ${issues.length} issues found`, 'error');
    console.log('\nIssues found:');
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    log('All tests passed! ✨', 'success');
  }
  console.log('');
}

runAllTests().catch(console.error);
