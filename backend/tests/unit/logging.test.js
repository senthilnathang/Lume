/**
 * Logging System Tests
 * Tests for log sanitization, Winston configuration, and logging middleware
 */

import { jest } from '@jest/globals';
import {
  sanitizeObject,
  sanitizeRequestBody,
  sanitizeQueryParams,
  sanitizeHeaders,
  isSensitiveKey,
} from '../../src/core/logger/log-sanitizer.js';
import { logger, transports } from '../../src/core/logger/winston.config.js';

describe('Log Sanitizer', () => {
  describe('isSensitiveKey', () => {
    it('should detect password field', () => {
      expect(isSensitiveKey('password')).toBe(true);
    });

    it('should detect token field', () => {
      expect(isSensitiveKey('token')).toBe(true);
    });

    it('should detect apiKey field', () => {
      expect(isSensitiveKey('apiKey')).toBe(true);
    });

    it('should detect api_key field', () => {
      expect(isSensitiveKey('api_key')).toBe(true);
    });

    it('should detect authorization header', () => {
      expect(isSensitiveKey('authorization')).toBe(true);
    });

    it('should detect x-api-key header', () => {
      expect(isSensitiveKey('x-api-key')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isSensitiveKey('PASSWORD')).toBe(true);
      expect(isSensitiveKey('ApiKey')).toBe(true);
      expect(isSensitiveKey('REFRESHTOKEN')).toBe(true);
    });

    it('should not flag normal fields', () => {
      expect(isSensitiveKey('username')).toBe(false);
      expect(isSensitiveKey('email')).toBe(false);
      expect(isSensitiveKey('userId')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isSensitiveKey(null)).toBe(false);
      expect(isSensitiveKey(undefined)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should mask password field', () => {
      const obj = { username: 'john', password: 'secret123' };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('***REDACTED*** (string)');
    });

    it('should mask apiKey field', () => {
      const obj = { id: 1, apiKey: 'sk_live_12345' };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.id).toBe(1);
      expect(sanitized.apiKey).toBe('***REDACTED*** (string)');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret123',
          },
        },
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.password).toBe('***REDACTED*** (string)');
    });

    it('should handle arrays', () => {
      const obj = {
        users: [
          { name: 'John', password: 'secret' },
          { name: 'Jane', password: 'secret2' },
        ],
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.users).toHaveLength(2);
      expect(sanitized.users[0].password).toBe('***REDACTED*** (string)');
      expect(sanitized.users[1].password).toBe('***REDACTED*** (string)');
    });

    it('should handle deep nesting', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              token: 'xyz',
            },
          },
        },
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.level1.level2.level3.token).toBe('***REDACTED*** (string)');
    });

    it('should prevent circular reference attacks', () => {
      const obj = { data: 'value' };
      obj.self = obj; // Create circular reference
      const sanitized = sanitizeObject(obj);
      expect(sanitized).toBeDefined();
    });

    it('should handle depth limits', () => {
      let obj = { level: 0 };
      let current = obj;
      for (let i = 1; i <= 25; i++) {
        current.next = { level: i };
        current = current.next;
      }
      const sanitized = sanitizeObject(obj);
      expect(sanitized).toBeDefined();
    });

    it('should preserve non-sensitive data types', () => {
      const obj = {
        id: 123,
        active: true,
        score: 95.5,
        tags: ['tag1', 'tag2'],
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.id).toBe(123);
      expect(sanitized.active).toBe(true);
      expect(sanitized.score).toBe(95.5);
      expect(sanitized.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle objects with null/undefined values', () => {
      const obj = {
        name: 'John',
        password: null,
        token: undefined,
      };
      const sanitized = sanitizeObject(obj);
      expect(sanitized.name).toBe('John');
      expect(sanitized.password).toBeNull();
      expect(sanitized.token).toBeUndefined();
    });
  });

  describe('sanitizeRequestBody', () => {
    it('should sanitize request body with credentials', () => {
      const body = {
        email: 'user@example.com',
        password: 'mypassword123',
        rememberMe: true,
      };
      const sanitized = sanitizeRequestBody(body);
      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.password).toBe('***REDACTED*** (string)');
      expect(sanitized.rememberMe).toBe(true);
    });

    it('should handle null/undefined body', () => {
      expect(sanitizeRequestBody(null)).toBeNull();
      expect(sanitizeRequestBody(undefined)).toBeUndefined();
    });

    it('should handle non-object body', () => {
      expect(sanitizeRequestBody('string')).toBe('string');
      expect(sanitizeRequestBody(123)).toBe(123);
    });
  });

  describe('sanitizeQueryParams', () => {
    it('should sanitize query parameters', () => {
      const params = {
        search: 'john',
        apiKey: 'secret_key',
        page: '1',
      };
      const sanitized = sanitizeQueryParams(params);
      expect(sanitized.search).toBe('john');
      expect(sanitized.apiKey).toBe('***REDACTED*** (string)');
      expect(sanitized.page).toBe('1');
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact authorization header', () => {
      const headers = {
        'content-type': 'application/json',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      const sanitized = sanitizeHeaders(headers);
      expect(sanitized['content-type']).toBe('application/json');
      expect(sanitized.authorization).toBe('[REDACTED - Bearer token]');
    });

    it('should redact API key header', () => {
      const headers = {
        'x-api-key': 'sk_live_12345',
        host: 'api.example.com',
      };
      const sanitized = sanitizeHeaders(headers);
      expect(sanitized.host).toBe('api.example.com');
      expect(sanitized['x-api-key']).toBe('[REDACTED]');
    });

    it('should redact cookies', () => {
      const headers = {
        cookie: 'session=abc123; user=xyz',
        'content-type': 'application/json',
      };
      const sanitized = sanitizeHeaders(headers);
      expect(sanitized.cookie).toBe('[REDACTED - cookies]');
      expect(sanitized['content-type']).toBe('application/json');
    });

    it('should handle case-insensitive headers', () => {
      const headers = {
        AUTHORIZATION: 'Bearer token',
        'X-API-KEY': 'secret',
      };
      const sanitized = sanitizeHeaders(headers);
      expect(sanitized.AUTHORIZATION).toBe('[REDACTED - Bearer token]');
      expect(sanitized['X-API-KEY']).toBe('[REDACTED]');
    });
  });
});

describe('Winston Logger Configuration', () => {
  it('should have logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have required transports', () => {
    expect(Array.isArray(transports)).toBe(true);
    expect(transports.length).toBeGreaterThan(0);
  });

  it('should log messages without errors', (done) => {
    logger.info('Test message', { testKey: 'testValue' });
    // Give logger time to process
    setTimeout(done, 100);
  });

  it('should log errors with stack traces', (done) => {
    const error = new Error('Test error');
    logger.error('Error message', { error: error.message, stack: error.stack });
    setTimeout(done, 100);
  });

  it('should handle metadata in logs', (done) => {
    logger.info('Test with metadata', {
      userId: 123,
      action: 'create',
      resource: 'user',
    });
    setTimeout(done, 100);
  });
});

describe('Logger Functions', () => {
  it('should create logger with context', async () => {
    const { createLogger } = await import('../../src/core/logger/index.js');
    const contextLogger = createLogger('UserService');
    expect(contextLogger).toBeDefined();
    expect(typeof contextLogger.info).toBe('function');
  });

  it('should return default logger', async () => {
    const { getLogger } = await import('../../src/core/logger/index.js');
    const defaultLogger = getLogger();
    expect(defaultLogger).toBeDefined();
    expect(typeof defaultLogger.info).toBe('function');
  });
});
