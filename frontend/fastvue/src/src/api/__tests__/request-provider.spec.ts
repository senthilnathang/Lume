/**
 * Request Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeRequestProvider,
  getRequestProvider,
  isProviderInitialized,
  resetRequestProvider,
  getAuthProvider,
  getCompanyProvider,
  getTrustProvider,
  type RequestProviderConfig,
} from '../request-provider';

describe('Request Provider', () => {
  // Mock provider implementations
  const mockAuthProvider = {
    getAccessToken: vi.fn(() => 'test-token'),
    setAccessToken: vi.fn(),
    isAccessChecked: vi.fn(() => true),
    setLoginExpired: vi.fn(),
    isLoginExpired: vi.fn(() => false),
    logout: vi.fn(),
  };

  const mockCompanyProvider = {
    getSelectedCompanyId: vi.fn(() => 1),
  };

  const mockTrustProvider = {
    updateTrustFromHeaders: vi.fn(),
    setStepUpRequired: vi.fn(),
  };

  const mockConfig: RequestProviderConfig = {
    auth: mockAuthProvider,
    company: mockCompanyProvider,
    trust: mockTrustProvider,
  };

  beforeEach(() => {
    resetRequestProvider();
    vi.clearAllMocks();
  });

  describe('initializeRequestProvider', () => {
    it('should initialize the provider', () => {
      initializeRequestProvider(mockConfig);
      expect(isProviderInitialized()).toBe(true);
    });

    it('should allow getting the provider after initialization', () => {
      initializeRequestProvider(mockConfig);
      const provider = getRequestProvider();
      expect(provider).toEqual(mockConfig);
    });
  });

  describe('getRequestProvider', () => {
    it('should throw if not initialized', () => {
      expect(() => getRequestProvider()).toThrow(
        'Request provider not initialized',
      );
    });

    it('should return provider after initialization', () => {
      initializeRequestProvider(mockConfig);
      const provider = getRequestProvider();
      expect(provider.auth).toBe(mockAuthProvider);
      expect(provider.company).toBe(mockCompanyProvider);
      expect(provider.trust).toBe(mockTrustProvider);
    });
  });

  describe('isProviderInitialized', () => {
    it('should return false when not initialized', () => {
      expect(isProviderInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      initializeRequestProvider(mockConfig);
      expect(isProviderInitialized()).toBe(true);
    });

    it('should return false after reset', () => {
      initializeRequestProvider(mockConfig);
      resetRequestProvider();
      expect(isProviderInitialized()).toBe(false);
    });
  });

  describe('getAuthProvider', () => {
    it('should return null when not initialized', () => {
      expect(getAuthProvider()).toBeNull();
    });

    it('should return auth provider when initialized', () => {
      initializeRequestProvider(mockConfig);
      const auth = getAuthProvider();
      expect(auth).toBe(mockAuthProvider);
    });

    it('should work with provider methods', () => {
      initializeRequestProvider(mockConfig);
      const auth = getAuthProvider();

      auth?.getAccessToken();
      expect(mockAuthProvider.getAccessToken).toHaveBeenCalled();

      auth?.setAccessToken('new-token');
      expect(mockAuthProvider.setAccessToken).toHaveBeenCalledWith('new-token');

      auth?.logout();
      expect(mockAuthProvider.logout).toHaveBeenCalled();
    });
  });

  describe('getCompanyProvider', () => {
    it('should return null when not initialized', () => {
      expect(getCompanyProvider()).toBeNull();
    });

    it('should return company provider when initialized', () => {
      initializeRequestProvider(mockConfig);
      const company = getCompanyProvider();
      expect(company).toBe(mockCompanyProvider);
    });

    it('should return selected company ID', () => {
      initializeRequestProvider(mockConfig);
      const company = getCompanyProvider();
      const id = company?.getSelectedCompanyId();
      expect(id).toBe(1);
    });
  });

  describe('getTrustProvider', () => {
    it('should return null when not initialized', () => {
      expect(getTrustProvider()).toBeNull();
    });

    it('should return trust provider when initialized', () => {
      initializeRequestProvider(mockConfig);
      const trust = getTrustProvider();
      expect(trust).toBe(mockTrustProvider);
    });

    it('should handle trust level updates', () => {
      initializeRequestProvider(mockConfig);
      const trust = getTrustProvider();

      const headers = new Headers();
      headers.set('X-Trust-Level', 'high');

      trust?.updateTrustFromHeaders(headers);
      expect(mockTrustProvider.updateTrustFromHeaders).toHaveBeenCalledWith(headers);
    });

    it('should handle step-up requirements', () => {
      initializeRequestProvider(mockConfig);
      const trust = getTrustProvider();

      trust?.setStepUpRequired(true, 'MFA required', 'mfa', 'session-123');
      expect(mockTrustProvider.setStepUpRequired).toHaveBeenCalledWith(
        true,
        'MFA required',
        'mfa',
        'session-123',
      );
    });
  });

  describe('resetRequestProvider', () => {
    it('should reset the provider state', () => {
      initializeRequestProvider(mockConfig);
      expect(isProviderInitialized()).toBe(true);

      resetRequestProvider();

      expect(isProviderInitialized()).toBe(false);
      expect(getAuthProvider()).toBeNull();
      expect(getCompanyProvider()).toBeNull();
      expect(getTrustProvider()).toBeNull();
    });
  });
});
