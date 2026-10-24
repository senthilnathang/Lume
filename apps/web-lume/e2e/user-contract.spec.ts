import { test, expect } from '@playwright/test';
import { apiBase, credentials } from './helpers';

test('user management supports create, search, update, and delete', async ({ request }) => {
  const login = await request.post(`${apiBase}/auth/login`, { data: credentials() });
  expect(login.ok()).toBe(true);
  const { data: session } = await login.json();
  const headers = { Authorization: `Bearer ${session.accessToken}` };
  const email = `contract-${crypto.randomUUID()}@lume.test`;
  let id: number | undefined;
  try {
    const created = await request.post(`${apiBase}/users`, { headers, data: {
      email, firstName: 'Contract', lastName: 'Tester', password: 'DisposableTest!2026',
      role_id: session.user.role_id, isActive: true,
    } });
    expect(created.status()).toBe(201);
    const { data: user } = await created.json();
    id = user.id;
    expect(user).not.toHaveProperty('password');
    const listed = await request.get(`${apiBase}/users`, { headers, params: { page: 1, limit: 5, search: email } });
    expect((await listed.json()).data).toMatchObject({ total: 1, data: [{ id, email }] });
    const updated = await request.put(`${apiBase}/users/${id}`, { headers, data: {
      firstName: 'Updated', isActive: false, phone: '12345',
    } });
    expect(updated.ok()).toBe(true);
    expect((await updated.json()).data).toMatchObject({ firstName: 'Updated', isActive: false, phone: '12345' });
    const stats = await request.get(`${apiBase}/users/stats`, { headers });
    expect(stats.ok()).toBe(true);
    expect((await stats.json()).data.total).toBeGreaterThan(0);
  } finally {
    if (id !== undefined) expect((await request.delete(`${apiBase}/users/${id}`, { headers })).ok()).toBe(true);
    await request.post(`${apiBase}/auth/logout`, { headers });
  }
});

test('incorrect unlock password preserves the authenticated session', async ({ request }) => {
  const login = await request.post(`${apiBase}/auth/login`, { data: credentials() });
  const { data } = await login.json();
  const headers = { Authorization: `Bearer ${data.accessToken}` };
  try {
    const denied = await request.post(`${apiBase}/auth/confirm-password`, { headers, data: { password: 'wrong' } });
    expect(denied.status()).toBe(403);
    expect((await request.get(`${apiBase}/auth/me`, { headers })).status()).toBe(200);
    const confirmed = await request.post(`${apiBase}/auth/confirm-password`, { headers, data: { password: credentials().password } });
    expect((await confirmed.json()).data.confirmed).toBe(true);
  } finally {
    await request.post(`${apiBase}/auth/logout`, { headers });
  }
});
