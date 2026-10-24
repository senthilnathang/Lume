import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test('dashboard uses NestJS account routes without API failures', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', response => {
    if (response.url().includes('/api/v2/') && response.status() >= 400) failed.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  const menus = page.waitForResponse(response => response.url().endsWith('/account/menus'));
  await signIn(page);
  expect((await menus).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Website', exact: true })).toBeVisible();
  expect(failed).toEqual([]);
});
