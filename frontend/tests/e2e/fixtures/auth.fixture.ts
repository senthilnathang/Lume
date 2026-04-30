import { test as base, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export type AuthFixture = {
  authenticatedPage: Page;
  adminPage: Page;
  userPage: Page;
};

/**
 * Authentication Fixture
 *
 * Provides pre-authenticated browser contexts and pages for different user roles.
 * Stores auth state in JSON files for reuse across test sessions.
 *
 * First run: Tests will perform login and cache auth state
 * Subsequent runs: Auth state is loaded from cache, speeding up test execution
 */

const AUTH_STATE_DIR = path.join(__dirname, '../auth-states');
const ADMIN_STATE_FILE = path.join(AUTH_STATE_DIR, 'admin-auth.json');
const USER_STATE_FILE = path.join(AUTH_STATE_DIR, 'user-auth.json');

// Ensure auth states directory exists
if (!fs.existsSync(AUTH_STATE_DIR)) {
  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
}

/**
 * Authenticate a user and save auth state to file
 */
async function authenticateUser(
  page: Page,
  email: string,
  password: string,
  stateFile: string
): Promise<void> {
  await page.goto('/');

  // Wait for login form to be visible
  await page.waitForSelector('form, [role="form"]', { timeout: 10000 });

  // Find and fill email input
  const emailInput = page.locator(
    'input[type="email"], input[placeholder*="email" i], input[name="email" i]'
  ).first();
  await emailInput.fill(email);

  // Find and fill password input
  const passwordInput = page.locator(
    'input[type="password"], input[placeholder*="password" i], input[name="password" i]'
  ).first();
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.click();

  // Wait for navigation to dashboard or home
  await page.waitForURL(/(dashboard|home)/, { waitUntil: 'networkidle' }).catch(() => {
    // If URL doesn't match expected pattern, just wait for network to be idle
  });

  // Save auth state
  await page.context().storageState({ path: stateFile });
}

/**
 * Base fixture for authenticated tests
 */
export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Just pass through the authenticated page
    await use(page);
  },

  adminPage: async ({ browser }, use) => {
    let context;
    let stateExists = fs.existsSync(ADMIN_STATE_FILE);

    if (stateExists) {
      // Use stored auth state
      try {
        context = await browser.newContext({
          storageState: ADMIN_STATE_FILE,
        });
      } catch {
        // If stored state is invalid, create new one
        context = await browser.newContext();
        const page = context.newPage();
        await authenticateUser(page, 'admin@lume.dev', 'admin123', ADMIN_STATE_FILE);
        await page.close();

        // Recreate context with new state
        context = await browser.newContext({
          storageState: ADMIN_STATE_FILE,
        });
      }
    } else {
      // Create new context and authenticate
      context = await browser.newContext();
      const page = context.newPage();
      await authenticateUser(page, 'admin@lume.dev', 'admin123', ADMIN_STATE_FILE);
      await page.close();

      // Recreate context with saved state
      context = await browser.newContext({
        storageState: ADMIN_STATE_FILE,
      });
    }

    const page = context.newPage();
    await use(page);

    await page.close();
    await context.close();
  },

  userPage: async ({ browser }, use) => {
    let context;
    let stateExists = fs.existsSync(USER_STATE_FILE);

    if (stateExists) {
      // Use stored auth state
      try {
        context = await browser.newContext({
          storageState: USER_STATE_FILE,
        });
      } catch {
        // If stored state is invalid, create new one
        context = await browser.newContext();
        const page = context.newPage();
        await authenticateUser(page, 'user@lume.dev', 'user123', USER_STATE_FILE);
        await page.close();

        // Recreate context with new state
        context = await browser.newContext({
          storageState: USER_STATE_FILE,
        });
      }
    } else {
      // Create new context and authenticate
      context = await browser.newContext();
      const page = context.newPage();
      await authenticateUser(page, 'user@lume.dev', 'user123', USER_STATE_FILE);
      await page.close();

      // Recreate context with saved state
      context = await browser.newContext({
        storageState: USER_STATE_FILE,
      });
    }

    const page = context.newPage();
    await use(page);

    await page.close();
    await context.close();
  },
});

export { expect } from '@playwright/test';
