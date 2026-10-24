import { test, expect } from '@playwright/test';
import { apiBase } from './helpers';

test('root redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page).toHaveTitle('Lume Framework');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
test('protected dashboard requires authentication', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
test('login fits the configured desktop or mobile viewport', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('login renders without uncaught JavaScript errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('NestJS health endpoint is healthy', async ({ request }) => {
  const response = await request.get(`${apiBase}/health`);
  expect(response.status()).toBe(200);
  expect((await response.json()).status).toBe('ok');
});
