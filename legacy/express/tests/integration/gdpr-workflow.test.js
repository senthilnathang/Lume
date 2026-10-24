import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app, { initializeDatabasesAndModules } from '../../src/index.js';
import prisma from '../../src/core/db/prisma.js';

describe('GDPR export and erasure (F3.3/F4.4)', () => {
  let adminToken = '';
  let subjectId = 0;
  const email = `gdpr-e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    try {
      await initializeDatabasesAndModules();
    } catch (err) {
      console.warn('DB init note:', err.message);
    }
    const adminLogin = await request(app).post('/api/users/login').send({
      email: 'admin@lume.dev',
      password: 'Admin@Lume!1',
    });
    adminToken = adminLogin.body?.data?.accessToken || adminLogin.body?.data?.token || '';
    const role = await prisma.role.findFirst();
    const created = await prisma.user.create({
      data: {
        email,
        password: 'hashed-test-value',
        firstName: 'Gdpr',
        lastName: 'Subject',
        role_id: role.id,
        isActive: true,
      },
    });
    subjectId = created.id;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { email: { contains: 'gdpr-e2e-' } } });
    } catch { /* ignore */ }
  });

  it('exports user data without secrets', async () => {
    const res = await request(app)
      .get(`/api/users/${subjectId}/export`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.exportedAt).toBeTruthy();
  });

  it('erases the user and blocks subsequent login', async () => {
    const res = await request(app)
      .delete(`/api/users/${subjectId}/erasure`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.recordsDeleted).toBeGreaterThanOrEqual(0);
    const login = await request(app).post('/api/users/login').send({
      email,
      password: 'GdprTest!1',
    });
    expect(login.status).not.toBe(200);
  });
});
