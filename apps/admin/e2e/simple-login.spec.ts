import { test, expect } from '@playwright/test';
import { credentials } from './helpers';

test('keyboard submission signs in using the NestJS API', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(credentials().email);
  const password = page.getByLabel('Password', { exact: true });
  await password.fill(credentials().password);
  await password.press('Enter');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
});
