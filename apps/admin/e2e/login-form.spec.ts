import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/login'); });
test('email and password inputs retain user-entered values', async ({ page }) => {
  await page.getByLabel('Email', { exact: true }).fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('ExamplePassword!');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('test@example.test');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('ExamplePassword!');
});
test('empty form does not call the authentication API', async ({ page }) => {
  let requests = 0;
  page.on('request', request => { if (request.url().endsWith('/auth/login')) requests++; });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect(await page.locator('form').evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  expect(requests).toBe(0);
});
test('password visibility toggles without submitting the form', async ({ page }) => {
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('ExamplePassword!');
  await page.locator('.lume-toggle-password').click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.locator('.lume-toggle-password').click();
  await expect(password).toHaveAttribute('type', 'password');
});
