/**
 * Metrics API - Public Interface
 * Provides methods to record and retrieve metrics across the application
 */

import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  dbQueriesTotal,
  dbQueryDurationSeconds,
  dbConnectionsActive,
  moduleInstallationsTotal,
  moduleOperationsTotal,
  moduleErrorsTotal,
  moduleActiveCount,
  businessEventCounter,
  businessMetricGauge,
  errorsTotal,
  errorRatePercentage,
  cacheHitsTotal,
  cacheMissesTotal,
  cacheDurationSeconds,
  getMetricsText,
  getMetricsTextSync,
  getMetricsJson,
  updateMetricsCache,
  resetMetrics as prometheusResetMetrics
} from './prometheus.config.js';

/**
 * Record HTTP request metrics
 * @param {string} method HTTP method (GET, POST, etc.)
 * @param {string} path Request path/route
 * @param {number} duration Request duration in milliseconds
 * @param {number} statusCode HTTP status code
 * @param {number} requestSize Request body size in bytes
 * @param {number} responseSize Response body size in bytes
 */
export const recordHttpRequest = (method, path, duration, statusCode, requestSize = 0, responseSize = 0) => {
  try {
    // Normalize path to prevent cardinality explosion (remove IDs, etc.)
    const normalizedPath = normalizePath(path);
    const statusGroup = `${Math.floor(statusCode / 100)}xx`;

    // Record counters
    httpRequestsTotal.labels(method, normalizedPath, statusCode, statusGroup).inc();

    // Record duration histogram (convert ms to seconds)
    httpRequestDurationSeconds.labels(method, normalizedPath, statusCode).observe(duration / 1000);

    // Record sizes
    if (requestSize > 0) {
      httpRequestSizeBytes.labels(method, normalizedPath).observe(requestSize);
    }
    if (responseSize > 0) {
      httpResponseSizeBytes.labels(method, normalizedPath, statusCode).observe(responseSize);
    }
  } catch (error) {
    console.warn('⚠️ Failed to record HTTP request metrics:', error.message);
  }
};

/**
 * Record database query metrics
 * @param {string} operation Operation type (select, insert, update, delete)
 * @param {number} duration Query duration in milliseconds
 * @param {string} status Status (success, error)
 */
export const recordDatabaseQuery = (operation, duration, status = 'success') => {
  try {
    const op = (operation || 'unknown').toLowerCase();

    // Record counter
    dbQueriesTotal.labels(op, status).inc();

    // Record duration histogram (convert ms to seconds)
    dbQueryDurationSeconds.labels(op).observe(duration / 1000);
  } catch (error) {
    console.warn('⚠️ Failed to record database query metrics:', error.message);
  }
};

/**
 * Set active database connections
 * @param {number} count Number of active connections
 * @param {string} database Database name
 */
export const setActiveConnections = (count, database = 'primary') => {
  try {
    dbConnectionsActive.labels(database).set(count);
  } catch (error) {
    console.warn('⚠️ Failed to set active connections metric:', error.message);
  }
};

/**
 * Record module installation
 * @param {string} moduleName Module name
 * @param {string} status Installation status (success, failed, skipped)
 */
export const recordModuleInstallation = (moduleName, status = 'success') => {
  try {
    moduleInstallationsTotal.labels(moduleName, status).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record module installation:', error.message);
  }
};

/**
 * Record module operation
 * @param {string} moduleName Module name
 * @param {string} operation Operation type (activate, deactivate, execute, etc.)
 */
export const recordModuleOperation = (moduleName, operation) => {
  try {
    moduleOperationsTotal.labels(moduleName, operation).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record module operation:', error.message);
  }
};

/**
 * Record module error
 * @param {string} moduleName Module name
 * @param {string} errorType Error type/category
 */
export const recordModuleError = (moduleName, errorType = 'unknown') => {
  try {
    moduleErrorsTotal.labels(moduleName, errorType).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record module error:', error.message);
  }
};

/**
 * Set active module count
 * @param {number} count Number of active modules
 */
export const setActiveModuleCount = (count) => {
  try {
    moduleActiveCount.set(count);
  } catch (error) {
    console.warn('⚠️ Failed to set active module count:', error.message);
  }
};

/**
 * Record custom business event
 * @param {string} eventType Event type name
 * @param {string} status Event status (success, failed, warning)
 */
export const recordBusinessEvent = (eventType, status = 'success') => {
  try {
    businessEventCounter.labels(eventType, status).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record business event:', error.message);
  }
};

/**
 * Set custom business metric value
 * @param {string} metricName Metric name
 * @param {number} value Metric value
 */
export const setBusinessMetric = (metricName, value) => {
  try {
    businessMetricGauge.labels(metricName).set(value);
  } catch (error) {
    console.warn('⚠️ Failed to set business metric:', error.message);
  }
};

/**
 * Record error
 * @param {string} errorType Error type/class name
 * @param {number} statusCode HTTP status code (if applicable)
 */
export const recordError = (errorType, statusCode = 500) => {
  try {
    errorsTotal.labels(errorType, statusCode).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record error metric:', error.message);
  }
};

/**
 * Set error rate percentage
 * @param {number} percentage Error rate as percentage (0-100)
 */
export const setErrorRate = (percentage) => {
  try {
    errorRatePercentage.set(Math.max(0, Math.min(100, percentage)));
  } catch (error) {
    console.warn('⚠️ Failed to set error rate metric:', error.message);
  }
};

/**
 * Record cache hit
 * @param {string} cacheName Cache name/identifier
 */
export const recordCacheHit = (cacheName) => {
  try {
    cacheHitsTotal.labels(cacheName).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record cache hit:', error.message);
  }
};

/**
 * Record cache miss
 * @param {string} cacheName Cache name/identifier
 */
export const recordCacheMiss = (cacheName) => {
  try {
    cacheMissesTotal.labels(cacheName).inc();
  } catch (error) {
    console.warn('⚠️ Failed to record cache miss:', error.message);
  }
};

/**
 * Record cache operation duration
 * @param {string} cacheName Cache name/identifier
 * @param {string} operation Operation type (get, set, delete)
 * @param {number} duration Duration in milliseconds
 */
export const recordCacheDuration = (cacheName, operation, duration) => {
  try {
    cacheDurationSeconds.labels(cacheName, operation).observe(duration / 1000);
  } catch (error) {
    console.warn('⚠️ Failed to record cache duration:', error.message);
  }
};

/**
 * Get all metrics in Prometheus text format (synchronous)
 * @returns {string} Metrics in Prometheus exposition format
 */
export const getMetrics = () => {
  try {
    return getMetricsTextSync();
  } catch (error) {
    console.warn('⚠️ Failed to get metrics:', error.message);
    return '# Error retrieving metrics\n';
  }
};

/**
 * Get all metrics as JSON (async)
 * @returns {Promise<object>} Metrics as structured JSON
 */
export const getMetricsAsJson = async () => {
  try {
    return await getMetricsJson();
  } catch (error) {
    console.warn('⚠️ Failed to get metrics as JSON:', error.message);
    return [];
  }
};

/**
 * Reset all metrics (for testing)
 * Note: prom-client doesn't provide a direct reset, so we clear and re-register metrics
 */
export const resetAllMetrics = () => {
  try {
    // Note: Prometheus client library doesn't support full reset after initialization
    // Metrics will persist across resets in prom-client, which is acceptable for tests
    // In production, metrics are expected to accumulate over the service lifetime
    prometheusResetMetrics();
  } catch (error) {
    // Silently ignore reset errors - metrics will continue accumulating
  }
};

/**
 * Normalize URL path to prevent cardinality explosion
 * Replaces numeric IDs, UUIDs, and hashes with placeholders
 * @param {string} path URL path
 * @returns {string} Normalized path
 */
function normalizePath(path) {
  if (!path) return '/unknown';

  // Remove query parameters
  const pathOnly = path.split('?')[0];

  // Replace UUIDs FIRST (before numeric replacements)
  // Standard UUID format: 8-4-4-4-12 hex digits
  let normalized = pathOnly.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=[/?]|$)/gi, '/:uuid');

  // Replace numeric IDs (e.g., /users/123 -> /users/:id)
  normalized = normalized.replace(/\/\d+(?=[/?]|$)/g, '/:id');

  // Replace hash-like strings (40+ char hex)
  normalized = normalized.replace(/\/[a-f0-9]{40,}(?=[/?]|$)/gi, '/:hash');

  // Limit path depth to prevent explosion (keep only first 4 segments)
  const segments = normalized.split('/').slice(0, 5);
  return segments.join('/') || '/';
}

/**
 * Initialize metrics cache (call at app startup)
 * Updates cache immediately and every second
 */
export const initMetricsCache = () => {
  // Update immediately
  updateMetricsCache();
  // Update every second
  setInterval(updateMetricsCache, 1000);
};

/**
 * Export all metrics for external access
 */
export {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
  dbQueriesTotal,
  dbQueryDurationSeconds,
  dbConnectionsActive,
  moduleInstallationsTotal,
  moduleOperationsTotal,
  moduleErrorsTotal,
  moduleActiveCount,
  businessEventCounter,
  businessMetricGauge,
  errorsTotal,
  errorRatePercentage,
  cacheHitsTotal,
  cacheMissesTotal,
  cacheDurationSeconds,
  updateMetricsCache
};
