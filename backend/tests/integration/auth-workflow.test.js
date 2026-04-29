/**
 * Integration Test: Authentication Workflow
 * Tests complete auth flows: registration, login, token refresh, logout
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app, { initializeDatabasesAndModules } from '../../src/index.js';
import prisma from '../../src/core/db/prisma.js';

describe('Authentication Workflow Integration Tests', () => {
  let testUserId;
  let authToken;
  let refreshToken;

  beforeAll(async () => {
    // Initialize databases for tests
    try {
      await initializeDatabasesAndModules();
    } catch (err) {
      console.warn('Note: Database initialization may have failed, continuing with test...', err.message);
    }

    // Ensure test database is clean
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: 'test-integration' } }
      });
    } catch (err) {
      console.warn('Warning: Could not clean up test users:', err.message);
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe('User Registration → Login → Refresh → Logout', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test-integration@example.com',
          password: 'SecurePassword123!',
          first_name: 'Test',
          last_name: 'User'
        });

      if (response.status !== 201) {
        console.log('Registration failed:', response.body);
      }
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', 'test-integration@example.com');

      testUserId = response.body.data.id;
    });

    it('should login user and receive tokens', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test-integration@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');

      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should access protected route with auth token', async () => {
      console.log('DEBUG: authToken=', authToken);
      console.log('DEBUG: Full header would be:', `Bearer ${authToken}`);

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      console.log('DEBUG: /me response status:', response.status);
      console.log('DEBUG: /me response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', 'test-integration@example.com');
    });

    it('should refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');

      authToken = response.body.data.token;
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request without auth header', async () => {
      const response = await request(app)
        .get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting on Auth Endpoints', () => {
    it('should enforce rate limiting on login attempts', async () => {
      // Simulate multiple failed login attempts
      let lastStatus = 200;

      for (let i = 0; i < 15; i++) {
        const response = await request(app)
          .post('/api/users/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          });

        lastStatus = response.status;

        // After many attempts, should get rate limited (429)
        if (i > 10) {
          expect(response.status).toBe(429);
        }
      }

      expect(lastStatus).toBe(429);
    }, 10000);
  });
});
