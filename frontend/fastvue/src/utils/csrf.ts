/**
 * CSRF Token Management for FastVue
 *
 * Implements the client-side of the Double-Submit Cookie pattern:
 * 1. Backend sets CSRF token in a cookie
 * 2. This module reads the cookie and provides the token
 * 3. Request interceptor adds the token to X-CSRF-Token header
 *
 * @module utils/csrf
 */

/** Cookie name used by the backend for CSRF token */
export const CSRF_COOKIE_NAME = 'csrf_token';

/** Header name expected by the backend for CSRF token */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Get the CSRF token from the cookie
 *
 * @returns The CSRF token string or null if not found
 *
 * @example
 * ```ts
 * const token = getCsrfToken();
 * if (token) {
 *   headers['X-CSRF-Token'] = token;
 * }
 * ```
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
  );

  if (match && match[2]) {
    return decodeURIComponent(match[2]);
  }

  return null;
}

/**
 * Get CSRF header object for use in fetch/axios requests
 *
 * @returns Object with CSRF header or empty object if no token
 *
 * @example
 * ```ts
 * const headers = {
 *   'Content-Type': 'application/json',
 *   ...getCsrfHeader(),
 * };
 * ```
 */
export function getCsrfHeader(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

/**
 * Check if the current request method requires CSRF protection
 *
 * Safe methods (GET, HEAD, OPTIONS, TRACE) don't need CSRF tokens
 *
 * @param method - HTTP method to check
 * @returns true if CSRF token is required
 */
export function requiresCsrfToken(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Add CSRF token to request config if needed
 *
 * Utility function for request interceptors
 *
 * @param config - Request config object with headers and method
 * @returns Modified config with CSRF header added if needed
 *
 * @example
 * ```ts
 * client.addRequestInterceptor({
 *   fulfilled: (config) => addCsrfToRequest(config),
 * });
 * ```
 */
export function addCsrfToRequest<
  T extends { headers: Record<string, string>; method?: string },
>(config: T): T {
  const method = config.method?.toUpperCase() || 'GET';

  if (requiresCsrfToken(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers[CSRF_HEADER_NAME] = token;
    }
  }

  return config;
}

/**
 * Clear CSRF token cookie (for logout scenarios)
 *
 * Note: This only clears the cookie on the client side.
 * The server will issue a new token on the next request.
 */
export function clearCsrfToken(): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
  }
}

/**
 * Initialize CSRF token by making a GET request to the backend
 *
 * This should be called during app bootstrap to ensure the CSRF cookie
 * is set before any state-changing requests are made.
 *
 * Uses a dedicated /api/v1/auth/csrf-token endpoint that always sets the cookie.
 */
export async function initializeCsrfToken(): Promise<void> {
  // Skip if we already have a CSRF token
  if (getCsrfToken()) {
    console.debug('CSRF token already exists');
    return;
  }

  try {
    // Make a GET request to the dedicated CSRF token endpoint
    // This endpoint is specifically designed to set the CSRF cookie
    const response = await fetch('/api/v1/auth/csrf-token', {
      method: 'GET',
      credentials: 'include', // Important: include cookies in response
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to initialize CSRF token:', response.status);
      return;
    }

    // Verify the cookie was actually set
    // Give the browser a moment to process the Set-Cookie header
    await new Promise(resolve => setTimeout(resolve, 50));

    const token = getCsrfToken();
    if (token) {
      console.debug('CSRF token initialized successfully');
    } else {
      console.warn('CSRF cookie was not set by backend');
    }
  } catch (error) {
    // Non-fatal - CSRF cookie will be set on first successful GET request
    console.warn('CSRF initialization failed:', error);
  }
}
