import { test, expect } from '@playwright/test';
import { apiBase, credentials, signIn } from './helpers';

test('authenticated profile survives a page reload', async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account: Frontend Tester', exact: true })).toBeVisible();
});
test('refresh and logout enforce the session contract', async ({ request }) => {
  const login = await request.post(`${apiBase}/auth/login`, { data: credentials() });
  expect(login.ok()).toBe(true);
  const { data } = await login.json();
  const refreshed = await request.post(`${apiBase}/auth/refresh`, { data: { refreshToken: data.refreshToken } });
  expect(refreshed.status()).toBe(201);
  expect((await refreshed.json()).data.accessToken).toBeTruthy();
  const wrongType = await request.post(`${apiBase}/auth/refresh`, { data: { refreshToken: data.accessToken } });
  expect(wrongType.status()).toBe(401);
  const logout = await request.post(`${apiBase}/auth/logout`, { headers: { Authorization: `Bearer ${data.accessToken}` } });
  expect(logout.ok()).toBe(true);
  expect((await request.get(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${data.accessToken}` } })).status()).toBe(401);
  expect((await request.post(`${apiBase}/auth/refresh`, { data: { refreshToken: data.refreshToken } })).status()).toBe(401);
});
