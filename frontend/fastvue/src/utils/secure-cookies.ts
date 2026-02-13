/**
 * Secure Cookie Management Utilities
 *
 * Provides secure-by-default cookie operations with:
 * - Automatic Secure flag in production
 * - SameSite=Strict default
 * - Size validation
 * - Name validation
 * - Expiry management
 *
 * @module utils/secure-cookies
 */

/**
 * Cookie configuration options
 */
export interface CookieOptions {
  /** Max age in seconds (default: 86400 = 24 hours) */
  maxAge?: number;
  /** Expiry date (alternative to maxAge) */
  expires?: Date;
  /** Cookie path (default: '/') */
  path?: string;
  /** Cookie domain */
  domain?: string;
  /** Secure flag - only send over HTTPS (default: true in production) */
  secure?: boolean;
  /** SameSite policy (default: 'strict') */
  sameSite?: 'strict' | 'lax' | 'none';
  /** HttpOnly flag - not accessible via JavaScript (only set by server) */
  httpOnly?: boolean;
}

/**
 * Cookie value with metadata
 */
export interface CookieInfo {
  name: string;
  value: string;
  options?: CookieOptions;
}

// Environment detection
const isProduction = import.meta.env.PROD;
const isSecureContext =
  typeof window !== 'undefined' && window.isSecureContext;

// Constants
const MAX_COOKIE_SIZE = 4096; // 4KB limit per cookie
const MAX_NAME_LENGTH = 256;
const VALID_NAME_REGEX = /^[\w!#$%&'*+\-.^`|~]+$/;

/**
 * Default cookie options with secure defaults
 */
const DEFAULT_OPTIONS: CookieOptions = {
  maxAge: 86400, // 24 hours
  path: '/',
  secure: isProduction || isSecureContext,
  sameSite: 'strict',
};

/**
 * Validate cookie name
 *
 * @throws Error if name is invalid
 */
function validateCookieName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Cookie name must be a non-empty string');
  }

  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Cookie name exceeds maximum length of ${MAX_NAME_LENGTH}`);
  }

  if (!VALID_NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid cookie name: "${name}". Names can only contain alphanumeric characters and !#$%&'*+-.^_\`|~`,
    );
  }

  // Check for reserved prefixes
  const reservedPrefixes = ['__Secure-', '__Host-'];
  for (const prefix of reservedPrefixes) {
    if (name.startsWith(prefix) && !isSecureContext) {
      throw new Error(
        `Cookie name "${name}" uses reserved prefix "${prefix}" which requires secure context`,
      );
    }
  }
}

/**
 * Validate cookie value
 *
 * @throws Error if value exceeds size limit
 */
function validateCookieValue(name: string, value: string): void {
  const encoded = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (encoded.length > MAX_COOKIE_SIZE) {
    throw new Error(
      `Cookie "${name}" exceeds maximum size of ${MAX_COOKIE_SIZE} bytes (current: ${encoded.length})`,
    );
  }
}

/**
 * Build cookie string from name, value, and options
 */
function buildCookieString(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const parts: string[] = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
  ];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  // Note: HttpOnly cannot be set via JavaScript, only server-side
  // This is included for documentation purposes when used with backend

  return parts.join('; ');
}

/**
 * Set a cookie with secure defaults
 *
 * @param name - Cookie name (alphanumeric and special chars only)
 * @param value - Cookie value
 * @param options - Cookie options (merged with secure defaults)
 * @throws Error if name or value is invalid
 *
 * @example
 * ```ts
 * // Simple usage with defaults
 * setSecureCookie('user_preference', 'dark_mode');
 *
 * // With custom options
 * setSecureCookie('session_hint', 'abc123', {
 *   maxAge: 3600, // 1 hour
 *   sameSite: 'lax',
 * });
 * ```
 */
export function setSecureCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  validateCookieName(name);
  validateCookieValue(name, value);

  const finalOptions: CookieOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Enforce Secure flag for SameSite=None (required by browsers)
  if (finalOptions.sameSite === 'none' && !finalOptions.secure) {
    console.warn(
      `Cookie "${name}": SameSite=None requires Secure flag. Enabling Secure.`,
    );
    finalOptions.secure = true;
  }

  // Warn about non-secure cookies in production
  if (isProduction && !finalOptions.secure) {
    console.warn(
      `Cookie "${name}" is being set without Secure flag in production. ` +
        'This may expose the cookie to man-in-the-middle attacks.',
    );
  }

  document.cookie = buildCookieString(name, value, finalOptions);
}

/**
 * Get a cookie value by name
 *
 * @param name - Cookie name to retrieve
 * @returns Cookie value or null if not found
 *
 * @example
 * ```ts
 * const preference = getSecureCookie('user_preference');
 * if (preference) {
 *   applyPreference(preference);
 * }
 * ```
 */
export function getSecureCookie(name: string): string | null {
  if (!name || typeof window === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split('=');
    const trimmedName = cookieName?.trim();

    if (trimmedName === name) {
      const value = valueParts.join('=').trim();
      try {
        return decodeURIComponent(value);
      } catch {
        // Return raw value if decoding fails
        return value;
      }
    }
  }

  return null;
}

/**
 * Delete a cookie
 *
 * @param name - Cookie name to delete
 * @param path - Cookie path (must match the path used when setting)
 * @param domain - Cookie domain (must match the domain used when setting)
 *
 * @example
 * ```ts
 * deleteSecureCookie('user_preference');
 *
 * // With specific path
 * deleteSecureCookie('session_token', '/app');
 * ```
 */
export function deleteSecureCookie(
  name: string,
  path: string = '/',
  domain?: string,
): void {
  const options: CookieOptions = {
    maxAge: 0,
    expires: new Date(0),
    path,
    secure: isProduction || isSecureContext,
    sameSite: 'strict',
  };

  if (domain) {
    options.domain = domain;
  }

  document.cookie = buildCookieString(name, '', options);
}

/**
 * Get all cookies as a key-value object
 *
 * @returns Object with cookie names as keys and values
 *
 * @example
 * ```ts
 * const allCookies = getAllCookies();
 * console.log(allCookies);
 * // { csrf_token: 'abc123', user_preference: 'dark_mode' }
 * ```
 */
export function getAllCookies(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const cookies: Record<string, string> = {};
  const cookieString = document.cookie;

  if (!cookieString) {
    return cookies;
  }

  for (const cookie of cookieString.split(';')) {
    const [name, ...valueParts] = cookie.split('=');
    const trimmedName = name?.trim();

    if (trimmedName) {
      const value = valueParts.join('=').trim();
      try {
        cookies[trimmedName] = decodeURIComponent(value);
      } catch {
        cookies[trimmedName] = value;
      }
    }
  }

  return cookies;
}

/**
 * Check if a cookie exists
 *
 * @param name - Cookie name to check
 * @returns true if cookie exists
 */
export function hasCookie(name: string): boolean {
  return getSecureCookie(name) !== null;
}

/**
 * Set a JSON object as a cookie value
 *
 * @param name - Cookie name
 * @param value - Object to serialize and store
 * @param options - Cookie options
 * @throws Error if serialization fails or exceeds size limit
 *
 * @example
 * ```ts
 * setJsonCookie('user_settings', { theme: 'dark', language: 'en' });
 * ```
 */
export function setJsonCookie<T>(
  name: string,
  value: T,
  options: CookieOptions = {},
): void {
  try {
    const serialized = JSON.stringify(value);
    setSecureCookie(name, serialized, options);
  } catch (error) {
    throw new Error(
      `Failed to serialize value for cookie "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Get a JSON object from a cookie
 *
 * @param name - Cookie name
 * @returns Parsed object or null if not found or parsing fails
 *
 * @example
 * ```ts
 * const settings = getJsonCookie<UserSettings>('user_settings');
 * if (settings) {
 *   applySettings(settings);
 * }
 * ```
 */
export function getJsonCookie<T>(name: string): T | null {
  const value = getSecureCookie(name);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    console.warn(`Failed to parse JSON cookie "${name}"`);
    return null;
  }
}

/**
 * Clear all cookies (for the current path and domain)
 *
 * Note: This only clears cookies accessible via JavaScript.
 * HttpOnly cookies set by the server cannot be cleared this way.
 */
export function clearAllCookies(): void {
  const cookies = getAllCookies();

  for (const name of Object.keys(cookies)) {
    deleteSecureCookie(name);
  }
}

/**
 * Check if cookies are enabled in the browser
 *
 * @returns true if cookies are enabled
 */
export function areCookiesEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testName = '__cookie_test__';
    document.cookie = `${testName}=1`;
    const enabled = document.cookie.includes(testName);
    document.cookie = `${testName}=; Max-Age=0`;
    return enabled;
  } catch {
    return false;
  }
}

/**
 * Get the total size of all cookies in bytes
 *
 * @returns Total size of document.cookie string
 */
export function getCookiesSize(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  return new Blob([document.cookie]).size;
}

/**
 * Check if adding a new cookie would exceed browser limits
 *
 * Note: Most browsers allow ~4KB per cookie and ~80 cookies per domain
 *
 * @param name - Cookie name to check
 * @param value - Cookie value to check
 * @returns true if the cookie can be safely added
 */
export function canSetCookie(name: string, value: string): boolean {
  try {
    validateCookieName(name);
    validateCookieValue(name, value);
    return true;
  } catch {
    return false;
  }
}
