/**
 * Frontend Security Configuration
 *
 * Centralized security settings loaded from environment variables.
 * All security features can be enabled/disabled via VITE_* env vars.
 */

// =============================================================================
// Type Definitions
// =============================================================================

export interface CSRFConfig {
  enabled: boolean;
  cookieName: string;
  headerName: string;
  safeMethods: Set<string>;
}

export interface XSSConfig {
  enabled: boolean;
  filterMode: 'strict' | 'moderate' | 'lenient';
  logAttempts: boolean;
  blockOnDetect: boolean;
}

export interface CSPConfig {
  enabled: boolean;
  reportOnly: boolean;
  reportUri: string;
}

export interface SecurityHeadersConfig {
  enabled: boolean;
  hstsEnabled: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: string;
  xXssProtection: boolean;
  referrerPolicy: string;
}

export interface CrossOriginConfig {
  embedderPolicy: string;
  openerPolicy: string;
  resourcePolicy: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  showWarnings: boolean;
  retryAfterHeader: string;
}

export interface ZeroTrustConfig {
  enabled: boolean;
  deviceFingerprintEnabled: boolean;
  trustLevelHeader: string;
  trustScoreHeader: string;
  riskScoreHeader: string;
  stepUpAuthEnabled: boolean;
}

export interface CookieConfig {
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  defaultMaxAge: number;
  path: string;
}

export interface ThreatDetectionConfig {
  enabled: boolean;
  logToConsole: boolean;
  reportToBackend: boolean;
}

export interface SecurityConfig {
  // Environment
  isProduction: boolean;
  isDevelopment: boolean;

  // Feature toggles
  csrf: CSRFConfig;
  xss: XSSConfig;
  csp: CSPConfig;
  headers: SecurityHeadersConfig;
  crossOrigin: CrossOriginConfig;
  rateLimit: RateLimitConfig;
  zeroTrust: ZeroTrustConfig;
  cookies: CookieConfig;
  threatDetection: ThreatDetectionConfig;

  // Debugging
  debugMode: boolean;
  logSecurityEvents: boolean;
}

// =============================================================================
// Environment Helpers
// =============================================================================

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
};

const getEnvString = (key: string, defaultValue: string): string => {
  const value = import.meta.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// =============================================================================
// Configuration
// =============================================================================

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

export const securityConfig: SecurityConfig = {
  // Environment
  isProduction,
  isDevelopment,

  // CSRF Protection
  csrf: {
    enabled: getEnvBoolean('VITE_CSRF_ENABLED', true),
    cookieName: getEnvString('VITE_CSRF_COOKIE_NAME', 'csrf_token'),
    headerName: getEnvString('VITE_CSRF_HEADER_NAME', 'X-CSRF-Token'),
    safeMethods: new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']),
  },

  // XSS Protection
  xss: {
    enabled: getEnvBoolean('VITE_XSS_PROTECTION_ENABLED', true),
    filterMode: getEnvString('VITE_XSS_FILTER_MODE', 'strict') as 'strict' | 'moderate' | 'lenient',
    logAttempts: getEnvBoolean('VITE_XSS_LOG_ATTEMPTS', true),
    blockOnDetect: getEnvBoolean('VITE_XSS_BLOCK_ON_DETECT', true),
  },

  // Content Security Policy
  csp: {
    enabled: getEnvBoolean('VITE_CSP_ENABLED', true),
    reportOnly: getEnvBoolean('VITE_CSP_REPORT_ONLY', false),
    reportUri: getEnvString('VITE_CSP_REPORT_URI', '/api/v1/security/violations/csp'),
  },

  // Security Headers
  headers: {
    enabled: getEnvBoolean('VITE_SECURITY_HEADERS_ENABLED', true),
    hstsEnabled: getEnvBoolean('VITE_HSTS_ENABLED', isProduction),
    xContentTypeOptions: getEnvBoolean('VITE_X_CONTENT_TYPE_OPTIONS', true),
    xFrameOptions: getEnvString('VITE_X_FRAME_OPTIONS', 'DENY'),
    xXssProtection: getEnvBoolean('VITE_X_XSS_PROTECTION', true),
    referrerPolicy: getEnvString('VITE_REFERRER_POLICY', 'strict-origin-when-cross-origin'),
  },

  // Cross-Origin Headers
  crossOrigin: {
    embedderPolicy: getEnvString('VITE_CROSS_ORIGIN_EMBEDDER_POLICY', 'require-corp'),
    openerPolicy: getEnvString('VITE_CROSS_ORIGIN_OPENER_POLICY', 'same-origin'),
    resourcePolicy: getEnvString('VITE_CROSS_ORIGIN_RESOURCE_POLICY', 'same-origin'),
  },

  // Rate Limiting
  rateLimit: {
    enabled: getEnvBoolean('VITE_RATE_LIMITING_ENABLED', true),
    showWarnings: getEnvBoolean('VITE_RATE_LIMIT_SHOW_WARNINGS', true),
    retryAfterHeader: getEnvString('VITE_RATE_LIMIT_RETRY_HEADER', 'Retry-After'),
  },

  // Zero Trust
  zeroTrust: {
    enabled: getEnvBoolean('VITE_ZERO_TRUST_ENABLED', true),
    deviceFingerprintEnabled: getEnvBoolean('VITE_DEVICE_FINGERPRINT_ENABLED', true),
    trustLevelHeader: getEnvString('VITE_TRUST_LEVEL_HEADER', 'X-Trust-Level'),
    trustScoreHeader: getEnvString('VITE_TRUST_SCORE_HEADER', 'X-Trust-Score'),
    riskScoreHeader: getEnvString('VITE_RISK_SCORE_HEADER', 'X-Risk-Score'),
    stepUpAuthEnabled: getEnvBoolean('VITE_STEP_UP_AUTH_ENABLED', true),
  },

  // Cookie Settings
  cookies: {
    secure: getEnvBoolean('VITE_COOKIE_SECURE', isProduction),
    sameSite: getEnvString('VITE_COOKIE_SAMESITE', isProduction ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
    defaultMaxAge: getEnvNumber('VITE_COOKIE_MAX_AGE', 86400),
    path: getEnvString('VITE_COOKIE_PATH', '/'),
  },

  // Threat Detection
  threatDetection: {
    enabled: getEnvBoolean('VITE_THREAT_DETECTION_ENABLED', true),
    logToConsole: getEnvBoolean('VITE_THREAT_LOG_TO_CONSOLE', isDevelopment),
    reportToBackend: getEnvBoolean('VITE_THREAT_REPORT_TO_BACKEND', true),
  },

  // Debugging
  debugMode: getEnvBoolean('VITE_SECURITY_DEBUG', isDevelopment),
  logSecurityEvents: getEnvBoolean('VITE_LOG_SECURITY_EVENTS', isDevelopment),
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof SecurityConfig): boolean {
  const value = securityConfig[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && 'enabled' in value) return value.enabled;
  return false;
}

/**
 * Get CSRF header object if CSRF is enabled and method requires it
 */
export function getCSRFHeaderIfNeeded(method: string): Record<string, string> {
  if (!securityConfig.csrf.enabled) return {};
  if (securityConfig.csrf.safeMethods.has(method.toUpperCase())) return {};

  const token = getCookieValue(securityConfig.csrf.cookieName);
  return token ? { [securityConfig.csrf.headerName]: token } : {};
}

/**
 * Read cookie value by name
 */
export function getCookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]!) : null;
}

/**
 * Log security event (respects config)
 */
export function logSecurityEvent(
  type: string,
  message: string,
  details?: Record<string, unknown>
): void {
  if (!securityConfig.logSecurityEvents) return;

  const event = {
    timestamp: new Date().toISOString(),
    type,
    message,
    details,
  };

  if (securityConfig.debugMode) {
    console.warn('[Security Event]', event);
  }

  // Report to backend if enabled
  if (securityConfig.threatDetection.reportToBackend) {
    try {
      navigator.sendBeacon(
        '/api/v1/security/events',
        JSON.stringify(event)
      );
    } catch {
      // Silently fail - don't break the app for logging
    }
  }
}

/**
 * Get security configuration summary for debugging
 */
export function getSecuritySummary(): Record<string, boolean | string> {
  return {
    csrfEnabled: securityConfig.csrf.enabled,
    xssEnabled: securityConfig.xss.enabled,
    xssMode: securityConfig.xss.filterMode,
    cspEnabled: securityConfig.csp.enabled,
    cspReportOnly: securityConfig.csp.reportOnly,
    headersEnabled: securityConfig.headers.enabled,
    rateLimitEnabled: securityConfig.rateLimit.enabled,
    zeroTrustEnabled: securityConfig.zeroTrust.enabled,
    fingerprintEnabled: securityConfig.zeroTrust.deviceFingerprintEnabled,
    cookieSecure: securityConfig.cookies.secure,
    cookieSameSite: securityConfig.cookies.sameSite,
    threatDetectionEnabled: securityConfig.threatDetection.enabled,
    debugMode: securityConfig.debugMode,
    environment: securityConfig.isProduction ? 'production' : 'development',
  };
}

// Export default config
export default securityConfig;
