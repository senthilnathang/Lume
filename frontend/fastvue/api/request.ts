/**
 * API Request Client Configuration for FastAPI Backend
 *
 * Security features:
 * - Request ID tracking for debugging
 * - Rate limit handling
 * - Security headers
 * - XSS protection via input sanitization
 * - Automatic retry on network errors
 * - Zero Trust device fingerprinting
 * - Step-up authentication handling
 *
 * This module uses a provider pattern for store dependencies,
 * making it modular and testable. The provider must be initialized
 * during app bootstrap via initializeRequestProvider().
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';

import { message, notification } from 'ant-design-vue';

import {
  getAuthProvider,
  getCompanyProvider,
  getTrustProvider,
  isProviderInitialized,
} from './request-provider';
import { getFingerprintHeader } from '#/utils/fingerprint';
import { getCsrfToken, CSRF_HEADER_NAME } from '#/utils/csrf';

import { refreshTokenApi } from './core';

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove potentially dangerous HTML/script content
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeInput(v);
    }
    return sanitized;
  }
  return value;
}

/**
 * Handle rate limit response
 */
function handleRateLimitError(retryAfter: number) {
  notification.warning({
    message: 'Too Many Requests',
    description: `Please wait ${retryAfter} seconds before trying again.`,
    duration: Math.min(retryAfter, 10),
  });
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    timeout: 30000,
  });

  /**
   * Re-authentication logic
   * Uses the provider pattern for decoupled store access
   */
  async function doReAuthenticate() {
    console.warn('Access token is invalid or expired.');
    const authProvider = getAuthProvider();
    if (!authProvider) {
      console.warn('Auth provider not initialized');
      return;
    }

    authProvider.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      authProvider.isAccessChecked()
    ) {
      authProvider.setLoginExpired(true);
    } else {
      await authProvider.logout();
    }
  }

  /**
   * Refresh token logic for FastAPI JWT
   * Uses the provider pattern for decoupled store access
   */
  async function doRefreshToken() {
    const authProvider = getAuthProvider();
    if (!authProvider) {
      throw new Error('Auth provider not initialized');
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const resp = await refreshTokenApi(refreshToken);
    const newToken = resp.access_token;
    authProvider.setAccessToken(newToken);
    // Update refresh token if provided
    if (resp.refresh_token) {
      localStorage.setItem('refresh_token', resp.refresh_token);
    }
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // Request interceptor - add authorization, security headers, and sanitization
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const authProvider = getAuthProvider();
      const companyProvider = getCompanyProvider();

      // Authorization - use provider if available, fall back to null
      const accessToken = authProvider?.getAccessToken() ?? null;
      config.headers.Authorization = formatToken(accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;

      // Debug: Log auth header status for module install requests
      if (config.url?.includes('/modules/')) {
        console.debug(`[Auth Debug] ${config.method?.toUpperCase()} ${config.url}`);
        console.debug(`[Auth Debug] Provider initialized: ${!!authProvider}`);
        console.debug(`[Auth Debug] Token present: ${!!accessToken}`);
        console.debug(`[Auth Debug] Authorization header: ${config.headers.Authorization ? 'set' : 'NOT SET'}`);
      }

      // Add company filter header for multi-tenancy
      const selectedCompanyId = companyProvider?.getSelectedCompanyId() ?? null;
      if (selectedCompanyId) {
        config.headers['X-Company-ID'] = String(selectedCompanyId);
      }

      // Security headers
      config.headers['X-Request-ID'] = generateRequestId();
      config.headers['X-Requested-With'] = 'XMLHttpRequest';

      // CSRF Protection - Add token for state-changing requests
      const method = config.method?.toUpperCase() || 'GET';
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers[CSRF_HEADER_NAME] = csrfToken;
        } else {
          // Debug: Log when CSRF token is missing
          console.warn(`[CSRF] No token found for ${method} request to ${config.url}`);
          console.debug('[CSRF] Current cookies:', document.cookie);
        }
      }

      // Zero Trust - Device fingerprint header
      const fingerprint = getFingerprintHeader();
      if (fingerprint) {
        config.headers['X-Device-Fingerprint'] = fingerprint;
      }

      // Sanitize request data to prevent XSS
      if (config.data && typeof config.data === 'object') {
        config.data = sanitizeInput(config.data);
      }

      return config;
    },
  });

  // Response interceptor - handle FastAPI response format
  // FastAPI returns data directly, not wrapped in { code, data, message }
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const { data: responseData, status, headers } = response;

      // Update trust level from response headers (Zero Trust)
      // Use provider pattern for decoupled trust store access
      if (headers && isProviderInitialized()) {
        const trustProvider = getTrustProvider();
        if (trustProvider) {
          try {
            trustProvider.updateTrustFromHeaders(headers as any);
          } catch {
            // Trust provider may fail silently
          }
        }
      }

      // FastAPI returns 2xx for success
      if (status >= 200 && status < 300) {
        return responseData;
      }

      throw new Error(responseData?.message || 'Request failed');
    },
    rejected: (error) => {
      return Promise.reject(error);
    },
  });

  // Zero Trust - Step-up authentication handling
  client.addResponseInterceptor({
    fulfilled: (response) => response,
    rejected: (error) => {
      // Handle step-up authentication required (403 with step_up_required)
      if (error?.response?.status === 403) {
        const responseData = error.response.data;
        if (responseData?.step_up_required && isProviderInitialized()) {
          const trustProvider = getTrustProvider();
          if (trustProvider) {
            try {
              trustProvider.setStepUpRequired(
                true,
                responseData.reason || 'Additional authentication required',
                responseData.method || 'mfa',
                responseData.session_id,
              );
            } catch {
              // Trust provider may fail silently
            }
          }
          // Don't show error message for step-up, it's handled by UI
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    },
  });

  // Token expiration handling
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // Rate limit handling
  client.addResponseInterceptor({
    fulfilled: (response) => response,
    rejected: (error) => {
      if (error?.response?.status === 429) {
        const retryAfter = parseInt(
          error.response.headers?.['retry-after'] || '60',
          10,
        );
        handleRateLimitError(retryAfter);
        return Promise.reject(error);
      }
      return Promise.reject(error);
    },
  });

  // Error message handling
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      const status = error?.response?.status;

      // Skip rate limit errors (handled separately)
      if (status === 429) {
        return;
      }

      // FastAPI error format - uses 'detail' field or nested error object
      let errorMessage = '';

      if (typeof responseData?.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (Array.isArray(responseData?.detail)) {
        // Pydantic validation errors
        errorMessage = responseData.detail
          .map((err: { msg?: string }) => err.msg)
          .join(', ');
      } else if (responseData?.error?.message) {
        // Structured error response from our middleware
        errorMessage = responseData.error.message;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      }

      if (errorMessage) {
        message.error(errorMessage);
      } else if (msg) {
        message.error(msg);
      }
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL);

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
