/**
 * Secure Cookie Utility Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setSecureCookie,
  getSecureCookie,
  deleteSecureCookie,
  getAllCookies,
  hasCookie,
  setJsonCookie,
  getJsonCookie,
  clearAllCookies,
  areCookiesEnabled,
  getCookiesSize,
  canSetCookie,
} from '../secure-cookies';

describe('Secure Cookie Utilities', () => {
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

  describe('setSecureCookie', () => {
    it('should set a cookie with default options', () => {
      setSecureCookie('test_cookie', 'test_value');
      const value = getSecureCookie('test_cookie');
      expect(value).toBe('test_value');
    });

    it('should throw error for invalid cookie name', () => {
      expect(() => setSecureCookie('invalid name', 'value')).toThrow();
    });

    it('should throw error for empty cookie name', () => {
      expect(() => setSecureCookie('', 'value')).toThrow();
    });

    it('should allow alphanumeric names with special characters', () => {
      expect(() => setSecureCookie('valid_cookie-name', 'value')).not.toThrow();
    });

    it('should encode special characters in value', () => {
      setSecureCookie('encoded', 'value with spaces & symbols');
      const value = getSecureCookie('encoded');
      expect(value).toBe('value with spaces & symbols');
    });

    it('should throw error for oversized cookie value', () => {
      const largeValue = 'x'.repeat(5000); // Over 4KB limit
      expect(() => setSecureCookie('large', largeValue)).toThrow();
    });

    it('should apply custom maxAge option', () => {
      setSecureCookie('expiring', 'value', { maxAge: 3600 });
      // Cookie should be set (we can't easily verify maxAge in jsdom)
      expect(getSecureCookie('expiring')).toBe('value');
    });

    it('should apply custom path option', () => {
      setSecureCookie('pathed', 'value', { path: '/api' });
      // Note: In jsdom, all cookies are accessible regardless of path
      // This test just verifies no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('getSecureCookie', () => {
    it('should return null for non-existent cookie', () => {
      const value = getSecureCookie('nonexistent');
      expect(value).toBeNull();
    });

    it('should return value for existing cookie', () => {
      document.cookie = 'existing=cookie_value; path=/';
      const value = getSecureCookie('existing');
      expect(value).toBe('cookie_value');
    });

    it('should decode URL-encoded values', () => {
      document.cookie = 'encoded=hello%20world; path=/';
      const value = getSecureCookie('encoded');
      expect(value).toBe('hello world');
    });

    it('should handle cookies with equals sign in value', () => {
      document.cookie = 'complex=key=value; path=/';
      const value = getSecureCookie('complex');
      expect(value).toBe('key=value');
    });

    it('should return null for empty name', () => {
      const value = getSecureCookie('');
      expect(value).toBeNull();
    });
  });

  describe('deleteSecureCookie', () => {
    it('should delete existing cookie', () => {
      setSecureCookie('to_delete', 'value');
      expect(getSecureCookie('to_delete')).toBe('value');

      deleteSecureCookie('to_delete');
      expect(getSecureCookie('to_delete')).toBeNull();
    });

    it('should not throw when deleting non-existent cookie', () => {
      expect(() => deleteSecureCookie('nonexistent')).not.toThrow();
    });
  });

  describe('getAllCookies', () => {
    it('should return empty object when no cookies exist', () => {
      const cookies = getAllCookies();
      expect(Object.keys(cookies).length).toBe(0);
    });

    it('should return all cookies as key-value pairs', () => {
      document.cookie = 'cookie1=value1; path=/';
      document.cookie = 'cookie2=value2; path=/';

      const cookies = getAllCookies();
      expect(cookies['cookie1']).toBe('value1');
      expect(cookies['cookie2']).toBe('value2');
    });
  });

  describe('hasCookie', () => {
    it('should return false for non-existent cookie', () => {
      expect(hasCookie('nonexistent')).toBe(false);
    });

    it('should return true for existing cookie', () => {
      setSecureCookie('exists', 'value');
      expect(hasCookie('exists')).toBe(true);
    });
  });

  describe('setJsonCookie / getJsonCookie', () => {
    it('should store and retrieve JSON object', () => {
      const data = { name: 'test', count: 42 };
      setJsonCookie('json_cookie', data);

      const retrieved = getJsonCookie<typeof data>('json_cookie');
      expect(retrieved).toEqual(data);
    });

    it('should store and retrieve arrays', () => {
      const data = [1, 2, 3, 'four'];
      setJsonCookie('array_cookie', data);

      const retrieved = getJsonCookie<typeof data>('array_cookie');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent JSON cookie', () => {
      const retrieved = getJsonCookie('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      document.cookie = 'invalid_json=not{json}; path=/';
      const retrieved = getJsonCookie('invalid_json');
      expect(retrieved).toBeNull();
    });

    it('should handle nested objects', () => {
      const data = { user: { name: 'test', settings: { theme: 'dark' } } };
      setJsonCookie('nested', data);

      const retrieved = getJsonCookie<typeof data>('nested');
      expect(retrieved?.user?.settings?.theme).toBe('dark');
    });
  });

  describe('clearAllCookies', () => {
    it('should clear all cookies', () => {
      setSecureCookie('cookie1', 'value1');
      setSecureCookie('cookie2', 'value2');
      setSecureCookie('cookie3', 'value3');

      clearAllCookies();

      expect(getSecureCookie('cookie1')).toBeNull();
      expect(getSecureCookie('cookie2')).toBeNull();
      expect(getSecureCookie('cookie3')).toBeNull();
    });
  });

  describe('areCookiesEnabled', () => {
    it('should return true when cookies are enabled', () => {
      // In jsdom, cookies are enabled by default
      expect(areCookiesEnabled()).toBe(true);
    });
  });

  describe('getCookiesSize', () => {
    it('should return 0 when no cookies exist', () => {
      expect(getCookiesSize()).toBe(0);
    });

    it('should return size of all cookies', () => {
      setSecureCookie('size_test', 'value');
      const size = getCookiesSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('canSetCookie', () => {
    it('should return true for valid cookie', () => {
      expect(canSetCookie('valid_name', 'valid_value')).toBe(true);
    });

    it('should return false for invalid name', () => {
      expect(canSetCookie('invalid name', 'value')).toBe(false);
    });

    it('should return false for oversized value', () => {
      const largeValue = 'x'.repeat(5000);
      expect(canSetCookie('large', largeValue)).toBe(false);
    });
  });
});
