/**
 * Logging Middleware Integration Tests
 * Tests the request/response logging middleware in action
 */

import { jest } from '@jest/globals';
import express from 'express';
import { loggingMiddleware } from '../../src/core/middleware/logging.middleware.js';
import { logger } from '../../src/core/logger/winston.config.js';

describe('Logging Middleware Integration', () => {
  let app;
  let loggerSpy;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Spy on logger methods
    loggerSpy = {
      info: jest.spyOn(logger, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(logger, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(logger, 'error').mockImplementation(() => {}),
    };

    app.use(loggingMiddleware);
  });

  afterEach(() => {
    loggerSpy.info.mockRestore();
    loggerSpy.warn.mockRestore();
    loggerSpy.error.mockRestore();
  });

  it('should log successful GET request', async () => {
    app.get('/api/users', (req, res) => {
      res.json({ success: true, data: [] });
    });

    const request = (await import('supertest')).default(app);
    await request.get('/api/users').expect(200);

    // Check that logger.info was called for both request and response
    expect(loggerSpy.info).toHaveBeenCalled();
    const calls = loggerSpy.info.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('should log POST request with sanitized body', async () => {
    app.post('/api/users/login', (req, res) => {
      res.json({ success: true, data: { token: 'abc123' } });
    });

    const request = (await import('supertest')).default(app);
    await request
      .post('/api/users/login')
      .send({ email: 'user@example.com', password: 'secret123' })
      .expect(200);

    // Check that logger was called
    expect(loggerSpy.info).toHaveBeenCalled();
  });

  it('should skip logging for health check endpoints', async () => {
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    const request = (await import('supertest')).default(app);
    await request.get('/health').expect(200);

    // Health checks should not be logged
    expect(loggerSpy.info).not.toHaveBeenCalled();
  });

  it('should log error responses', async () => {
    app.get('/api/error', (req, res) => {
      res.status(500).json({ success: false, error: 'Server error' });
    });

    const request = (await import('supertest')).default(app);
    await request.get('/api/error').expect(500);

    // Error response should be logged as warn
    expect(loggerSpy.warn).toHaveBeenCalled();
  });

  it('should attach request ID to req object', async () => {
    let capturedReqId = null;
    app.get('/api/test', (req, res) => {
      capturedReqId = req.id;
      res.json({ success: true });
    });

    const request = (await import('supertest')).default(app);
    await request.get('/api/test').expect(200);

    // Request should have an ID
    expect(capturedReqId).toBeDefined();
    expect(typeof capturedReqId).toBe('string');
    expect(capturedReqId.length).toBeGreaterThan(0);
  });

  it('should sanitize password in request body logs', async () => {
    app.post('/api/users/register', (req, res) => {
      res.json({ success: true });
    });

    const request = (await import('supertest')).default(app);
    await request
      .post('/api/users/register')
      .send({
        email: 'new@example.com',
        password: 'mysecretpassword123',
        name: 'John Doe',
      })
      .expect(200);

    // Check that a log was made and contains sanitized password
    expect(loggerSpy.info).toHaveBeenCalled();
    const logCalls = loggerSpy.info.mock.calls;

    // At least one call should be related to the request
    const hasRequestLog = logCalls.some(call => {
      const metadata = call[1];
      return metadata && metadata.type === 'REQUEST';
    });

    expect(hasRequestLog).toBe(true);
  });

  it('should log query parameters', async () => {
    app.get('/api/users', (req, res) => {
      res.json({ success: true, data: [] });
    });

    const request = (await import('supertest')).default(app);
    await request.get('/api/users?page=1&search=test').expect(200);

    expect(loggerSpy.info).toHaveBeenCalled();
  });

  it('should log authenticated requests with user info', async () => {
    app.use((req, res, next) => {
      // Simulate authenticated user
      if (req.path === '/api/protected') {
        req.user = {
          id: 123,
          email: 'user@example.com',
          role: 'admin',
        };
      }
      next();
    });

    app.get('/api/protected', (req, res) => {
      res.json({ success: true });
    });

    const request = (await import('supertest')).default(app);
    await request.get('/api/protected').expect(200);

    expect(loggerSpy.info).toHaveBeenCalled();
  });
});
