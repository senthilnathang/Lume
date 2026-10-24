import { expect, type Page } from '@playwright/test';

export const apiBase = process.env.LUME_E2E_API_URL || 'http://127.0.0.1:3012/api/v2';
export function credentials() {
  const email = process.env.LUME_TEST_ADMIN_EMAIL;
  const password = process.env.LUME_TEST_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set LUME_TEST_ADMIN_EMAIL and LUME_TEST_ADMIN_PASSWORD for the isolated test account.');
  return { email, password };
}
export async function signIn(page: Page, path = '/login') {
  const user = credentials();
  await page.goto(path);
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
