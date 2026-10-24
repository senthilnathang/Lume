import { test, expect } from '@playwright/test';

test('unavailable API keeps the user on login with a recoverable error', async ({ page }) => {
  await page.route('**/auth/login', route => route.abort('failed'));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('ExamplePassword!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.lume-login-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
});
test('HTTP rejection does not trigger recursive refresh or logout requests', async ({ page }) => {
  let requests = 0;
  await page.route('**/auth/**', async route => {
    requests++;
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid credentials' }) });
  });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('ExamplePassword!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.lume-login-error')).toBeVisible();
  expect(requests).toBe(1);
});
