/**
 * Security Utilities for FastVue Frontend
 *
 * Provides:
 * - XSS protection
 * - Input sanitization
 * - Token management
 * - Security event logging
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

/**
 * Validate and sanitize URL to prevent open redirect attacks
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`Blocked unsafe URL protocol: ${parsed.protocol}`);
      return '/';
    }

    // For external URLs, only allow same origin or configured domains
    const allowedDomains = [
      window.location.hostname,
      'localhost',
      '127.0.0.1',
    ];

    if (!allowedDomains.includes(parsed.hostname)) {
      console.warn(`Blocked external redirect to: ${parsed.hostname}`);
      return '/';
    }

    return url;
  } catch {
    return '/';
  }
}

/**
 * Secure token storage using sessionStorage (more secure than localStorage)
 */
export const SecureTokenStorage = {
  setAccessToken(token: string): void {
    sessionStorage.setItem('access_token', token);
  },

  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  },

  setRefreshToken(token: string): void {
    // Refresh token in localStorage for persistence across tabs
    localStorage.setItem('refresh_token', token);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },

  clearTokens(): void {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  hasValidTokens(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return !!(accessToken || refreshToken);
  },
};

/**
 * Rate limiter for client-side actions
 */
export class ClientRateLimiter {
  private actions: Map<string, number[]> = new Map();

  /**
   * Check if action is allowed
   * @param key Action identifier
   * @param limit Maximum actions allowed
   * @param windowMs Time window in milliseconds
   */
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize action timestamps
    let timestamps = this.actions.get(key) || [];

    // Filter out old timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if under limit
    if (timestamps.length < limit) {
      timestamps.push(now);
      this.actions.set(key, timestamps);
      return true;
    }

    return false;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.actions.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.actions.clear();
  }
}

// Global rate limiter instance
export const rateLimiter = new ClientRateLimiter();

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  eventType: string,
  details?: Record<string, unknown>,
): void {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details,
  };

  // In production, you might want to send this to your backend
  if (import.meta.env.DEV) {
    console.warn('[Security Event]', event);
  } else {
    // Could send to backend logging endpoint
    // fetch('/api/v1/security/log', { method: 'POST', body: JSON.stringify(event) });
  }
}

/**
 * Content Security Policy nonce generator
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * Detect potential security issues in the browser
 */
export function detectSecurityIssues(): string[] {
  const issues: string[] = [];

  // Check if running in an iframe (potential clickjacking)
  if (window.self !== window.top) {
    issues.push('Application is running in an iframe');
  }

  // Check for browser devtools (not necessarily bad, but worth noting)
  const devtools =
    /./;
  (devtools as { toString: () => string }).toString = function () {
    issues.push('DevTools are open');
    return '';
  };

  // Check for insecure context
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    issues.push('Application is not running in a secure context (HTTPS)');
  }

  return issues;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password should be at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }

  // Check for common patterns
  const commonPatterns = [
    /^password/i,
    /^12345/,
    /^qwerty/i,
    /^admin/i,
    /^user/i,
  ];
  if (commonPatterns.some((pattern) => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common password patterns');
  }

  return {
    score,
    feedback,
    isStrong: score >= 4 && feedback.length === 0,
  };
}

// Re-export enhanced XSS protection functions
export {
  detectXSS,
  sanitizeForDisplay,
  stripDangerousContent,
  sanitizeUrl as sanitizeUrlAdvanced,
  containsXSS,
  getThreatDescriptions,
  type XSSDetectionResult,
} from './xss-protection';
