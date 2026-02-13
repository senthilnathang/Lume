/**
 * CSRF Token Utility Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCsrfToken,
  getCsrfHeader,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../csrf';

describe('CSRF Utilities', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CSRF_COOKIE_NAME', () => {
    it('should be csrf_token', () => {
      expect(CSRF_COOKIE_NAME).toBe('csrf_token');
    });
  });

  describe('CSRF_HEADER_NAME', () => {
    it('should be X-CSRF-Token', () => {
      expect(CSRF_HEADER_NAME).toBe('X-CSRF-Token');
    });
  });

  describe('getCsrfToken', () => {
    it('should return null when no CSRF cookie exists', () => {
      const token = getCsrfToken();
      expect(token).toBeNull();
    });

    it('should return the token when CSRF cookie exists', () => {
      document.cookie = 'csrf_token=test-token-123; path=/';
      const token = getCsrfToken();
      expect(token).toBe('test-token-123');
    });

    it('should handle URL encoded token values', () => {
      document.cookie = 'csrf_token=test%20token%2B123; path=/';
      const token = getCsrfToken();
      expect(token).toBe('test token+123');
    });

    it('should return correct token when multiple cookies exist', () => {
      document.cookie = 'other_cookie=other_value; path=/';
      document.cookie = 'csrf_token=correct-token; path=/';
      document.cookie = 'another_cookie=another_value; path=/';
      const token = getCsrfToken();
      expect(token).toBe('correct-token');
    });

    it('should handle cookies with spaces', () => {
      document.cookie = ' csrf_token = spaced-token ; path=/';
      const token = getCsrfToken();
      // The regex should handle leading spaces in cookie names
      expect(token).not.toBeNull();
    });
  });

  describe('getCsrfHeader', () => {
    it('should return empty object when no CSRF cookie exists', () => {
      const header = getCsrfHeader();
      expect(header).toEqual({});
    });

    it('should return header object with token when cookie exists', () => {
      document.cookie = 'csrf_token=header-test-token; path=/';
      const header = getCsrfHeader();
      expect(header).toEqual({
        'X-CSRF-Token': 'header-test-token',
      });
    });

    it('should use CSRF_HEADER_NAME constant for header key', () => {
      document.cookie = 'csrf_token=check-constant; path=/';
      const header = getCsrfHeader();
      expect(header[CSRF_HEADER_NAME]).toBe('check-constant');
    });
  });

  describe('Integration with request headers', () => {
    it('should provide headers suitable for fetch/axios', () => {
      document.cookie = 'csrf_token=integration-token; path=/';
      const header = getCsrfHeader();

      // Should be usable in fetch
      const mockFetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...header,
        },
      };

      expect((mockFetchOptions.headers as Record<string, string>)['X-CSRF-Token']).toBe('integration-token');
    });
  });
});
