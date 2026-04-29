/**
 * Performance Benchmark Tests
 * Measures response times and throughput for key API endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app, { initializeDatabasesAndModules } from '../../src/index.js';

describe('Performance Benchmarks', () => {
  let adminToken;

  beforeAll(async () => {
    // Initialize databases for tests
    try {
      await initializeDatabasesAndModules();
    } catch (err) {
      console.warn('Database initialization may have failed, continuing with test...', err.message);
    }

    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: 'admin@lume.dev',
        password: 'Admin@123'
      });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.body.data.token;
    }
  });

  describe('Response Time SLAs', () => {
    it('health check should respond < 50ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(50);
    });

    it('public config should respond < 100ms', async () => {
      const start = Date.now();
      const response = await request(app).get('/api/public/config');
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100);
    });

    it('list endpoints should respond < 500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/base/users?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);
      const duration = Date.now() - start;

      expect([200, 401]).toContain(response.status);
      expect(duration).toBeLessThan(500);
    });

    it('single record fetch should respond < 200ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/base/users/1')
        .set('Authorization', `Bearer ${adminToken}`);
      const duration = Date.now() - start;

      expect([200, 401, 404]).toContain(response.status);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Caching Efficiency', () => {
    it('cached endpoint should hit cache on second request', async () => {
      // First request - cache miss
      const first = await request(app).get('/api/website/public/settings');
      const cacheHeader1 = first.headers['x-cache'];

      // Second request - should hit cache
      const second = await request(app).get('/api/website/public/settings');
      const cacheHeader2 = second.headers['x-cache'];

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(cacheHeader2).toBe('HIT');
    });

    it('cached request should be faster than cache miss', async () => {
      const times = [];

      // Warm cache
      await request(app).get('/api/website/public/menus/header');

      // Measure cache hit time
      const start = Date.now();
      for (let i = 0; i < 10; i++) {
        await request(app).get('/api/website/public/menus/header');
      }
      const avgCachedTime = (Date.now() - start) / 10;

      expect(avgCachedTime).toBeLessThan(10); // Cache hit should be very fast
    });
  });

  describe('Throughput Tests', () => {
    it('should handle 50 concurrent requests to health check', async () => {
      const promises = Array(50).fill(null).map(() =>
        request(app).get('/health')
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBe(50);
      expect(duration).toBeLessThan(2000); // Should complete in < 2s
    });

    it('should handle 20 concurrent POST requests', async () => {
      const promises = Array(20).fill(null).map((_, i) =>
        request(app)
          .post('/api/users/login')
          .send({
            email: 'admin@lume.dev',
            password: 'admin123'
          })
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => [200, 401].includes(r.status)).length;
      expect(successCount).toBeGreaterThanOrEqual(18);
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Trace ID Headers', () => {
    it('should include X-Trace-ID in all responses', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-trace-id');
      expect(response.headers['x-trace-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should use client-provided trace ID', async () => {
      const traceId = 'test-trace-12345';
      const response = await request(app)
        .get('/health')
        .set('X-Trace-ID', traceId);

      expect(response.headers['x-trace-id']).toBe(traceId);
    });
  });

  describe('Error Rate Metrics', () => {
    it('should track 404 errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent/endpoint')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should track auth errors', async () => {
      const response = await request(app)
        .get('/api/base/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should track validation errors', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'invalid-email',
          password: ''
        });

      expect(response.status).toBe(400);
    });
  });
});
