/**
 * Request/Response Logging Middleware
 * Logs incoming requests and outgoing responses with structured JSON format
 */

import { logger } from '../logger/winston.config.js';
import {
  sanitizeQueryParams,
  sanitizeRequestBody,
  sanitizeResponseBody,
  sanitizeHeaders,
} from '../logger/log-sanitizer.js';

// Health check endpoints to skip logging
const SKIP_LOGGING_PATHS = [
  '/health',
  '/metrics',
  '/api/health',
  '/api/lume/health',
  '/api/gawdesy/health',
  '/api/base/health',
];

/**
 * Check if a path should be skipped from logging
 */
function shouldSkipLogging(path) {
  return SKIP_LOGGING_PATHS.some(skipPath => path.startsWith(skipPath));
}

/**
 * Express middleware for request/response logging
 */
export const loggingMiddleware = (req, res, next) => {
  // Skip health check endpoints
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const requestId = req.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Store request ID on request object for downstream use
  req.id = requestId;

  // Log incoming request
  const requestLog = {
    requestId,
    type: 'REQUEST',
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    query: sanitizeQueryParams(req.query),
    headers: sanitizeHeaders(req.headers),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  // Add user info if authenticated
  if (req.user) {
    requestLog.userId = req.user.id;
    requestLog.userEmail = req.user.email;
    requestLog.userRole = req.user.role;
  }

  // Add request body if present (and safe to log)
  if (req.method !== 'GET' && req.body && typeof req.body === 'object') {
    requestLog.body = sanitizeRequestBody(req.body);
  }

  // Log request at info level
  logger.info(`Incoming ${req.method} ${req.path}`, requestLog);

  // Intercept response.json to log response body
  const originalJson = res.json.bind(res);
  let responseBody = null;

  res.json = function(body) {
    responseBody = body;
    return originalJson(body);
  };

  // Log response when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    const responseLog = {
      requestId,
      type: 'RESPONSE',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    };

    // Add response body if available (sanitized)
    if (responseBody) {
      if (typeof responseBody === 'object') {
        responseLog.body = sanitizeResponseBody(JSON.stringify(responseBody));
      } else {
        responseLog.body = sanitizeResponseBody(responseBody);
      }
    }

    // Add content length
    const contentLength = res.get('content-length');
    if (contentLength) {
      responseLog.contentLengthBytes = parseInt(contentLength, 10);
    }

    // Log at appropriate level
    if (isError) {
      logger.warn(`Response ${req.method} ${req.path} - ${res.statusCode}`, responseLog);
    } else {
      logger.info(`Response ${req.method} ${req.path} - ${res.statusCode}`, responseLog);
    }

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.path} took ${duration}ms`, {
        requestId,
        type: 'SLOW_REQUEST',
        method: req.method,
        path: req.path,
        durationMs: duration,
        threshold: 1000,
      });
    }
  });

  // Log response errors
  res.on('error', (err) => {
    logger.error(`Response error on ${req.method} ${req.path}`, {
      requestId,
      type: 'RESPONSE_ERROR',
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
    });
  });

  next();
};

export default loggingMiddleware;
