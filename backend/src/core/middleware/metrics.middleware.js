/**
 * Prometheus Metrics Middleware
 * Records HTTP request metrics (duration, size, status) for monitoring
 */

import { recordHttpRequest, recordError, setErrorRate } from '../metrics/index.js';
import { logger } from '../logger/winston.config.js';

// Paths that should not be tracked in metrics (to reduce cardinality)
const METRICS_SKIP_PATHS = [
  '/health',
  '/metrics',
  '/api/health',
  '/api/lume/health',
  '/api/gawdesy/health',
  '/api/base/health',
  '/api/base_automation/health',
  '/api/base_features_data/health',
  '/api/base_security/health',
  '/api/base_customization/health',
  '/api/advanced_features/health',
];

// Track overall metrics for error rate calculation
let totalRequests = 0;
let totalErrors = 0;
let lastCalculation = Date.now();
const CALCULATION_INTERVAL = 60000; // Calculate error rate every 60 seconds

/**
 * Check if a path should be skipped from metrics tracking
 */
function shouldSkipMetrics(path) {
  return METRICS_SKIP_PATHS.some(skipPath => path.startsWith(skipPath));
}

/**
 * Calculate and update error rate percentage
 */
function updateErrorRate() {
  const now = Date.now();
  if (now - lastCalculation >= CALCULATION_INTERVAL && totalRequests > 0) {
    const errorRate = (totalErrors / totalRequests) * 100;
    setErrorRate(errorRate);
    lastCalculation = now;

    // Reset counters for next interval
    totalRequests = 0;
    totalErrors = 0;
  }
}

/**
 * Express middleware for recording Prometheus metrics
 */
export const metricsMiddleware = (req, res, next) => {
  // Skip metrics tracking for health check endpoints
  if (shouldSkipMetrics(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const method = req.method;
  const path = req.path;

  // Store original response methods
  const originalEnd = res.end;
  const originalWrite = res.write;

  // Track response size
  let responseSize = 0;

  // Hook write() to track response body size
  res.write = function (...args) {
    if (args[0] && typeof args[0] === 'string') {
      responseSize += Buffer.byteLength(args[0], 'utf8');
    } else if (Buffer.isBuffer(args[0])) {
      responseSize += args[0].length;
    }
    return originalWrite.apply(this, args);
  };

  // Hook end() to record metrics when response finishes
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode || 200;

    // Calculate request body size
    const requestSize = req.get('content-length')
      ? parseInt(req.get('content-length'), 10)
      : (req.body ? JSON.stringify(req.body).length : 0);

    // Record metrics
    try {
      recordHttpRequest(method, path, duration, statusCode, requestSize, responseSize);
    } catch (error) {
      logger.warn('Failed to record HTTP request metrics:', { error: error.message });
    }

    // Track error rate
    totalRequests += 1;
    if (statusCode >= 400) {
      totalErrors += 1;
      recordError(res.statusCode >= 500 ? 'ServerError' : 'ClientError', statusCode);
    }

    // Update error rate periodically
    updateErrorRate();

    // Call original end
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Get current metrics summary for health endpoint
 */
export const getMetricsSummary = () => {
  return {
    requests: {
      total: totalRequests,
      errors: totalErrors,
      errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%' : '0%'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
};

export default metricsMiddleware;
