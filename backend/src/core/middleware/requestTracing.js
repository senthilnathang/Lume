import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../config/logger.js';

// Request tracing middleware - adds trace ID to all requests for logging correlation
export const requestTracing = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || uuidv4();
  req.traceId = traceId;
  req.startTime = Date.now();

  // Add trace ID to all response headers
  res.setHeader('X-Trace-ID', traceId);

  // Log request details
  const method = req.method;
  const path = req.path;
  const query = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const clientIp = req.ip || req.connection.remoteAddress;

  logger.debug(`[${traceId}] ${method} ${path} ${query} - Client: ${clientIp}`);

  // Hook into response finish to log response details
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    const level = statusCode >= 400 ? 'warn' : statusCode >= 500 ? 'error' : 'info';

    logger.log(level, `[${traceId}] ${method} ${path} - ${statusCode} (${duration}ms)`);

    // Store trace info on response for monitoring
    res.traceData = {
      traceId,
      method,
      path,
      statusCode,
      duration,
      timestamp: new Date().toISOString()
    };

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Get current trace ID from request context
export const getTraceId = (req) => req.traceId || 'unknown';
