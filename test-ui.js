import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const issues = [];

async function log(message, type = 'info') {
  const symbols = { info: '✓', warn: '⚠️', error: '❌', success: '✅' };
  console.log(`${symbols[type] || '•'} ${message}`);
}

async function testPageLoad(path, name) {
  log(`Testing ${name}...`, 'info');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 5000 }).catch(() => {});

    const title = await page.title();
    log(`  ${name}: ${title}`, 'success');

    if (errors.length > 0) {
      log(`  Found ${errors.length} console errors`, 'error');
      issues.push(`${name}: ${errors.length} console errors`);
    }
  } catch (e) {
    log(`  ${name}: ${e.message}`, 'error');
    issues.push(`${name}: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLoginForm() {
  log('Testing login form...', 'info');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 5000 });

    const emailInput = await page.$('input[type="email"]') || await page.$('input[placeholder*="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && submitBtn) {
      log('  Login form complete ✓', 'success');
    } else {
      log('  Login form incomplete', 'error');
      if (!emailInput) issues.push('Login: email input missing');
      if (!passwordInput) issues.push('Login: password input missing');
      if (!submitBtn) issues.push('Login: submit button missing');
    }
  } catch (e) {
    log(`  Login form test failed: ${e.message}`, 'error');
  } finally {
    await browser.close();
  }
}

async function testResponsiveness() {
  log('Testing responsive layout...', 'info');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 5000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const status = overflow ? 'overflow' : 'OK';
      log(`  ${vp.name} (${vp.width}x${vp.height}): ${status}`, overflow ? 'warn' : 'success');
    } catch (e) {
      log(`  ${vp.name}: failed`, 'error');
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

(async () => {
  console.log('\n🧪 Lume UI/UX Test Suite\n');
  console.log('==============================\n');

  await testPageLoad('/', 'Home Page');
  console.log('');

  await testPageLoad('/login', 'Login Page');
  console.log('');

  await testLoginForm();
  console.log('');

  await testResponsiveness();
  console.log('');

  console.log('==============================\n');
  if (issues.length > 0) {
    log(`Summary: ${issues.length} issues found`, 'error');
    console.log('\nIssues:');
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
  } else {
    log('All tests passed! ✨', 'success');
  }
  console.log('');
  process.exit(issues.length > 0 ? 1 : 0);
})();
