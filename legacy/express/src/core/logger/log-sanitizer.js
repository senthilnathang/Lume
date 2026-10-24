/**
 * Log Sanitizer - Masks sensitive data in logs
 * Prevents exposure of passwords, tokens, keys, and PII
 */

const SENSITIVE_PATTERNS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'secret_key',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'authorization',
  'ssn',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pinCode',
  'pin_code',
  'privateKey',
  'private_key',
  'publicKey',
  'public_key',
  'clientSecret',
  'client_secret',
  'authToken',
  'auth_token',
  'sessionId',
  'session_id',
  'x-api-key',
];

/**
 * Check if a key matches any sensitive pattern (case-insensitive)
 */
export function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false;
  const lowerKey = key.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => lowerKey.includes(pattern.toLowerCase()));
}

/**
 * Recursively sanitize an object by masking sensitive values
 * Preserves structure while redacting sensitive data
 */
/**
 * Recursively sanitize an object by masking sensitive values
 * Preserves structure while redacting sensitive data
 */
export function sanitizeObject(obj, depth = 0) {
  // Prevent deep recursion attacks
  if (depth > 20) return '[REDACTED - depth limit]';

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    try {
      return obj.map(item => sanitizeObject(item, depth + 1));
    } catch (err) {
      return '[REDACTED - array processing error]';
    }
  }

  // Handle objects
  try {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Always preserve null and undefined
      if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (isSensitiveKey(key)) {
        // Mask sensitive values but show type/length hint
        if (typeof value === 'string') {
          sanitized[key] = '***REDACTED*** (string)';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = '***REDACTED*** (object)';
        } else {
          sanitized[key] = '***REDACTED***';
        }
      } else if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(value, depth + 1);
      } else if (Buffer.isBuffer(value)) {
        // Don't try to serialize buffers
        sanitized[key] = '[Buffer]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  } catch (err) {
    return '[REDACTED - object processing error]';
  }
}

/**
 * Sanitize request body
 */
export function sanitizeRequestBody(body) {
  if (!body) return body;
  if (typeof body !== 'object') return body;
  return sanitizeObject(body);
}

/**
 * Sanitize response body
 */
export function sanitizeResponseBody(body) {
  if (!body) return body;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(sanitizeObject(parsed));
    } catch {
      // Not JSON, return as-is
      return body;
    }
  }
  if (typeof body === 'object') {
    return sanitizeObject(body);
  }
  return body;
}

/**
 * Sanitize query parameters
 */
export function sanitizeQueryParams(params) {
  if (!params || typeof params !== 'object') return params;
  return sanitizeObject(params);
}

/**
 * Sanitize headers (removes Authorization header entirely, masks API keys)
 */
export function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;

  const sanitized = { ...headers };

  // Remove/redact sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'x-auth-token',
    'cookie',
    'set-cookie',
    'x-csrf-token',
  ];

  for (const header of sensitiveHeaders) {
    const lowerHeader = header.toLowerCase();
    for (const key in sanitized) {
      if (key.toLowerCase() === lowerHeader) {
        if (key.toLowerCase() === 'authorization') {
          sanitized[key] = '[REDACTED - Bearer token]';
        } else if (key.toLowerCase() === 'cookie' || key.toLowerCase() === 'set-cookie') {
          sanitized[key] = '[REDACTED - cookies]';
        } else {
          sanitized[key] = '[REDACTED]';
        }
      }
    }
  }

  return sanitized;
}

export default {
  sanitizeObject,
  sanitizeRequestBody,
  sanitizeResponseBody,
  sanitizeQueryParams,
  sanitizeHeaders,
  isSensitiveKey,
};
