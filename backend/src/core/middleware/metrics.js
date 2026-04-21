import { logger } from '../../config/logger.js';

// In-memory metrics storage (use external service like Prometheus in production)
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byMethod: {},
    byStatusCode: {}
  },
  performance: {
    totalDuration: 0,
    requestCount: 0,
    slowRequests: []  // Requests > 1000ms
  },
  errors: {
    total: 0,
    byType: {}
  }
};

// Performance monitoring middleware
export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const method = req.method;

  // Initialize method counter if not exists
  if (!metrics.requests.byMethod[method]) {
    metrics.requests.byMethod[method] = 0;
  }

  // Hook into response finish
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Update metrics
    metrics.requests.total += 1;
    metrics.requests.byMethod[method] += 1;

    if (!metrics.requests.byStatusCode[statusCode]) {
      metrics.requests.byStatusCode[statusCode] = 0;
    }
    metrics.requests.byStatusCode[statusCode] += 1;

    if (statusCode < 400) {
      metrics.requests.successful += 1;
    } else {
      metrics.requests.failed += 1;
    }

    metrics.performance.totalDuration += duration;
    metrics.performance.requestCount += 1;

    // Track slow requests (>1 second)
    if (duration > 1000) {
      metrics.performance.slowRequests.push({
        method,
        path: req.path,
        duration,
        statusCode,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 slow requests
      if (metrics.performance.slowRequests.length > 100) {
        metrics.performance.slowRequests = metrics.performance.slowRequests.slice(-100);
      }

      // Log slow requests
      logger.warn(`[SLOW_REQUEST] ${method} ${req.path} took ${duration}ms`);
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error tracking middleware
export const errorTracker = (err, req, res, next) => {
  const errorType = err.constructor.name;

  metrics.errors.total += 1;
  if (!metrics.errors.byType[errorType]) {
    metrics.errors.byType[errorType] = 0;
  }
  metrics.errors.byType[errorType] += 1;

  // Log error with trace ID
  const traceId = req.traceId || 'unknown';
  logger.error(`[${traceId}] ${errorType}: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode
  });

  // Continue with normal error handling
  next(err);
};

// Get current metrics
export const getMetrics = () => ({
  ...metrics,
  performance: {
    ...metrics.performance,
    avgDuration: metrics.performance.requestCount > 0
      ? Math.round(metrics.performance.totalDuration / metrics.performance.requestCount)
      : 0
  },
  uptime: process.uptime()
});

// Reset metrics (for testing or periodic archival)
export const resetMetrics = () => {
  metrics.requests.total = 0;
  metrics.requests.successful = 0;
  metrics.requests.failed = 0;
  metrics.requests.byMethod = {};
  metrics.requests.byStatusCode = {};
  metrics.performance.totalDuration = 0;
  metrics.performance.requestCount = 0;
  metrics.performance.slowRequests = [];
  metrics.errors.total = 0;
  metrics.errors.byType = {};
};

// Health check endpoint data
export const getHealthMetrics = () => {
  const avgDuration = metrics.performance.requestCount > 0
    ? Math.round(metrics.performance.totalDuration / metrics.performance.requestCount)
    : 0;

  const successRate = metrics.requests.total > 0
    ? Math.round((metrics.requests.successful / metrics.requests.total) * 100)
    : 100;

  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    requests: {
      total: metrics.requests.total,
      successful: metrics.requests.successful,
      failed: metrics.requests.failed,
      successRate: successRate + '%'
    },
    performance: {
      avgDuration: avgDuration + 'ms',
      slowRequests: metrics.performance.slowRequests.length
    },
    errors: metrics.errors.total
  };
};
