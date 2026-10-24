/**
 * Alert Context Middleware
 * Tracks request context for enriching alerts with relevant information
 */

import crypto from 'crypto';

// Store for active request contexts (in production, use Redis)
const contextStore = new Map();

/**
 * Middleware to track alert context for each request
 * Attaches trace, error, and metric information to the request
 */
export function alertContextMiddleware(req, res, next) {
  // Generate or retrieve trace ID
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Create request context
  const context = {
    traceId,
    requestId,
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    startTime: Date.now(),
    metrics: {},
    errors: [],
    logs: []
  };

  // Store context
  contextStore.set(traceId, context);

  // Attach to request for use in handlers
  req.alertContext = context;

  // Track response
  const originalSend = res.send;
  res.send = function(data) {
    context.statusCode = res.statusCode;
    context.contentLength = typeof data === 'string' ? Buffer.byteLength(data) : 0;
    context.duration = Date.now() - context.startTime;

    // Call original send
    return originalSend.call(this, data);
  };

  // Track errors
  const originalJson = res.json;
  res.json = function(data) {
    if (data?.error || res.statusCode >= 400) {
      context.statusCode = res.statusCode;
      context.errors.push({
        message: data?.error?.message || data?.message,
        code: data?.error?.code,
        stack: data?.error?.stack,
        timestamp: new Date().toISOString()
      });
    }
    context.duration = Date.now() - context.startTime;
    return originalJson.call(this, data);
  };

  // Add methods to track context
  req.addMetric = (key, value) => {
    context.metrics[key] = value;
  };

  req.addError = (error) => {
    context.errors.push({
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  };

  req.addLog = (level, message) => {
    context.logs.push({
      level,
      message,
      timestamp: new Date().toISOString()
    });
  };

  // Clean up context after response
  res.on('finish', () => {
    // Keep context for a short time (for alert processing)
    setTimeout(() => {
      contextStore.delete(traceId);
    }, 5000);
  });

  next();
}

/**
 * Get alert context for a given trace ID
 * @param {string} traceId Trace ID
 * @returns {object} Request context with metrics, logs, errors
 */
export function getAlertContext(traceId) {
  return contextStore.get(traceId) || null;
}

/**
 * Add metric to current request context
 * @param {string} traceId Trace ID
 * @param {string} key Metric key
 * @param {*} value Metric value
 */
export function addMetricToContext(traceId, key, value) {
  const context = contextStore.get(traceId);
  if (context) {
    context.metrics[key] = value;
  }
}

/**
 * Add error to current request context
 * @param {string} traceId Trace ID
 * @param {Error} error Error object
 */
export function addErrorToContext(traceId, error) {
  const context = contextStore.get(traceId);
  if (context) {
    context.errors.push({
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Add log entry to current request context
 * @param {string} traceId Trace ID
 * @param {string} level Log level (info, warn, error)
 * @param {string} message Log message
 */
export function addLogToContext(traceId, level, message) {
  const context = contextStore.get(traceId);
  if (context) {
    context.logs.push({
      level,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Create alert context from request
 * Used by alert handlers to enrich alerts with request details
 * @param {object} req Express request object
 * @returns {object} Alert context
 */
export function createAlertContextFromRequest(req) {
  const alertContext = req.alertContext || {};

  return {
    traceId: alertContext.traceId,
    requestId: alertContext.requestId,
    userId: alertContext.userId,
    method: alertContext.method,
    path: alertContext.path,
    url: alertContext.url,
    ip: alertContext.ip,
    duration: alertContext.duration,
    statusCode: alertContext.statusCode,
    metrics: alertContext.metrics,
    errors: alertContext.errors,
    logs: alertContext.logs,
    userAgent: alertContext.userAgent
  };
}

/**
 * Get context summary for alert
 * @param {string} traceId Trace ID
 * @returns {object} Context summary
 */
export function getContextSummary(traceId) {
  const context = contextStore.get(traceId);
  if (!context) return null;

  return {
    traceId: context.traceId,
    requestId: context.requestId,
    duration: context.duration,
    statusCode: context.statusCode,
    errorCount: context.errors.length,
    metricCount: Object.keys(context.metrics).length,
    logCount: context.logs.length,
    userId: context.userId,
    endpoint: `${context.method} ${context.path}`
  };
}

/**
 * Get all active contexts
 * @returns {array} Array of active contexts
 */
export function getAllContexts() {
  return Array.from(contextStore.values());
}

/**
 * Clear old contexts (manual cleanup)
 * @param {number} ageMinutes Age threshold in minutes
 */
export function clearOldContexts(ageMinutes = 30) {
  const now = Date.now();
  const ageMs = ageMinutes * 60 * 1000;
  let cleared = 0;

  for (const [key, context] of contextStore.entries()) {
    if ((now - context.startTime) > ageMs) {
      contextStore.delete(key);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Export contexts for analysis or external systems
 * @returns {array} All contexts as JSON
 */
export function exportContexts() {
  return Array.from(contextStore.values());
}

export {
  contextStore
};
