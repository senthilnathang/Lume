/**
 * Security Hardening Utilities
 * Best practices from OWASP and Anthropic Cybersecurity Skills
 */

/**
 * Input Validation Utilities
 */
export const InputValidation = {
  // Whitelist validation
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  validateURL: (url) => {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  validateInteger: (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= min && num <= max;
  },

  sanitizeString: (str, maxLength = 255) => {
    if (typeof str !== 'string') return '';
    return str.substring(0, maxLength).trim();
  },

  // SQL injection prevention - use parameterized queries
  validateSQLInput: (input) => {
    const suspiciousPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      /(-{2}|\/\*|\*\/|;)/,
      /('\s*OR\s*'|"\s*OR\s*")/i
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(input));
  }
};

/**
 * Output Encoding Utilities
 */
export const OutputEncoding = {
  // HTML entity encoding to prevent XSS
  htmlEncode: (str) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  },

  // URL encoding
  urlEncode: (str) => {
    return encodeURIComponent(str);
  },

  // JavaScript string encoding
  jsEncode: (str) => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  },

  // CSV encoding to prevent formula injection
  csvEncode: (str) => {
    if (/[,"\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    // Prevent formula injection
    if (/^[=+\-@]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }
};

/**
 * Authentication Security
 */
export const AuthenticationSecurity = {
  // Password strength validator
  validatePasswordStrength: (password) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
      valid: score >= 4, // Require at least 4 of 5 criteria
      score: Math.round((score / 5) * 100),
      checks
    };
  },

  // Generate secure random token
  generateSecureToken: (length = 32) => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  },

  // Session management
  validateSessionTimeout: (lastActivity, timeoutMinutes = 30) => {
    const now = Date.now();
    const elapsed = (now - lastActivity) / 1000 / 60;
    return elapsed < timeoutMinutes;
  }
};

/**
 * CORS Security
 */
export const CORSSecurity = {
  // Validate CORS origin
  validateOrigin: (origin, whitelist) => {
    if (!origin) return false;
    return whitelist.some(allowed => {
      if (allowed === '*') return false; // Don't use *
      if (allowed.includes('*')) {
        // Support subdomain wildcards like *.example.com
        const regex = new RegExp(`^${allowed.replace(/\*/g, '[^/]+')}\$`);
        return regex.test(origin);
      }
      return origin === allowed;
    });
  },

  // Safe CORS headers
  getSafeCORSHeaders: (origin, whitelist) => {
    const isValid = this.validateOrigin(origin, whitelist);
    return isValid ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '3600'
    } : {};
  }
};

/**
 * Rate Limiting
 */
export const RateLimitingSecurity = {
  // Simple in-memory rate limiter
  createRateLimiter: (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();

    return (identifier) => {
      const now = Date.now();
      const userRequests = requests.get(identifier) || [];

      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => now - time < windowMs);

      if (validRequests.length >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }

      validRequests.push(now);
      requests.set(identifier, validRequests);

      return {
        allowed: true,
        remaining: maxRequests - validRequests.length,
        resetTime: Math.min(...validRequests) + windowMs
      };
    };
  }
};

/**
 * Security Headers
 */
export const SecurityHeaders = {
  // Standard security headers
  getSecurityHeaders: () => ({
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Clickjacking protection
    'X-Frame-Options': 'DENY',

    // XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Feature policy / Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

    // Enforce HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Content Security Policy
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'"
  })
};

/**
 * API Security
 */
export const APISecurity = {
  // Prevent parameter pollution
  validateQueryParams: (params, allowedKeys) => {
    return Object.keys(params).every(key => allowedKeys.includes(key));
  },

  // Prevent excessive payload sizes
  validatePayloadSize: (payload, maxBytes = 1048576) => {
    const size = JSON.stringify(payload).length;
    return size <= maxBytes;
  },

  // Prevent deep object nesting (DoS protection)
  validateObjectDepth: (obj, maxDepth = 10, currentDepth = 0) => {
    if (currentDepth > maxDepth) return false;
    if (typeof obj !== 'object' || obj === null) return true;

    return Object.values(obj).every(val =>
      this.validateObjectDepth(val, maxDepth, currentDepth + 1)
    );
  }
};

/**
 * Logging Security
 */
export const LoggingSecurity = {
  // Redact sensitive information from logs
  redactSensitiveData: (obj) => {
    const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'creditcard', 'ssn'];
    const redact = (val) => {
      if (typeof val !== 'object' || val === null) return val;

      const redacted = { ...val };
      Object.keys(redacted).forEach(key => {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          redacted[key] = '***REDACTED***';
        } else if (typeof redacted[key] === 'object') {
          redacted[key] = redact(redacted[key]);
        }
      });
      return redacted;
    };
    return redact(obj);
  },

  // Format audit log entry
  formatAuditLog: (action, user, resource, result) => ({
    timestamp: new Date().toISOString(),
    action,
    userId: user?.id,
    userEmail: user?.email,
    resource,
    result,
    ipAddress: user?.ipAddress,
    userAgent: user?.userAgent
  })
};

export default {
  InputValidation,
  OutputEncoding,
  AuthenticationSecurity,
  CORSSecurity,
  RateLimitingSecurity,
  SecurityHeaders,
  APISecurity,
  LoggingSecurity
};
