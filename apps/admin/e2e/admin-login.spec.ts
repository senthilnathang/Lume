import { test, expect } from '@playwright/test';
import { credentials, signIn } from './helpers';

test('seeded administrator reaches a populated dashboard', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Account: Frontend Tester', exact: true })).toBeVisible();
  expect(await page.evaluate(() => Boolean(localStorage.getItem('token')))).toBe(true);
});
test('wrong password is rejected by NestJS', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(credentials().email);
  await page.getByLabel('Password', { exact: true }).fill('DeliberatelyWrong!');
  const response = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect((await response).status()).toBe(401);
  await expect(page.locator('.lume-login-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});
