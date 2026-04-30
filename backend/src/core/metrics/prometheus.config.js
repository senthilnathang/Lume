/**
 * Prometheus Client Configuration
 * Initializes Prometheus client with service labels and default metrics
 */

import client from 'prom-client';
import os from 'os';
import { packageVersion } from '../../config/version.js';

// Get service configuration from environment
const serviceName = process.env.OTEL_SERVICE_NAME || 'lume-backend';
const serviceVersion = process.env.OTEL_SERVICE_VERSION || packageVersion || '2.0.0';
const environment = process.env.NODE_ENV || 'development';
const instanceId = process.env.INSTANCE_ID || os.hostname();

/**
 * Default labels applied to all metrics (service, environment, instance)
 */
const defaultLabels = {
  service: serviceName,
  environment: environment,
  instance: instanceId,
  version: serviceVersion
};

// Set default labels on all metrics
client.register.setDefaultLabels(defaultLabels);

/**
 * HTTP Request Metrics
 */

// Total HTTP requests counter (incremented on each request)
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests by method, path, and status code',
  labelNames: ['method', 'path', 'status_code', 'status_group'],
  registers: [client.register]
});

// HTTP request duration histogram (measures request latency)
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0],
  registers: [client.register]
});

// HTTP request size histogram
export const httpRequestSizeBytes = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'HTTP request body size in bytes',
  labelNames: ['method', 'path'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [client.register]
});

// HTTP response size histogram
export const httpResponseSizeBytes = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'HTTP response body size in bytes',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
  registers: [client.register]
});

/**
 * Database Operation Metrics
 */

// Total database queries counter
export const dbQueriesTotal = new client.Counter({
  name: 'db_queries_total',
  help: 'Total database queries by operation type and status',
  labelNames: ['operation', 'status'],
  registers: [client.register]
});

// Database query duration histogram
export const dbQueryDurationSeconds = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query execution time in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
  registers: [client.register]
});

// Active database connections gauge
export const dbConnectionsActive = new client.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [client.register]
});

/**
 * Process Metrics (standard node.js process metrics)
 */

// Process uptime counter (seconds)
export const processUptimeSeconds = new client.Counter({
  name: 'process_uptime_seconds',
  help: 'Process uptime in seconds',
  registers: [client.register]
});

/**
 * Module Lifecycle Metrics
 */

// Module installations counter
export const moduleInstallationsTotal = new client.Counter({
  name: 'module_installations_total',
  help: 'Total module installations by module name and status',
  labelNames: ['module', 'status'],
  registers: [client.register]
});

// Module operations counter
export const moduleOperationsTotal = new client.Counter({
  name: 'module_operations_total',
  help: 'Total module operations by module and operation type',
  labelNames: ['module', 'operation'],
  registers: [client.register]
});

// Module errors counter
export const moduleErrorsTotal = new client.Counter({
  name: 'module_errors_total',
  help: 'Total errors by module and error type',
  labelNames: ['module', 'error_type'],
  registers: [client.register]
});

// Active modules gauge
export const moduleActiveCount = new client.Gauge({
  name: 'module_active_count',
  help: 'Number of active installed modules',
  registers: [client.register]
});

/**
 * Custom Business Metrics
 */

// Generic counter for custom business events
export const businessEventCounter = new client.Counter({
  name: 'business_events_total',
  help: 'Business-specific events counter',
  labelNames: ['event_type', 'status'],
  registers: [client.register]
});

// Generic gauge for custom business metrics
export const businessMetricGauge = new client.Gauge({
  name: 'business_metric_value',
  help: 'Business-specific metric gauge',
  labelNames: ['metric_name'],
  registers: [client.register]
});

/**
 * Error Rate Metrics
 */

// Total errors counter
export const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total errors by error type and HTTP status code',
  labelNames: ['error_type', 'status_code'],
  registers: [client.register]
});

// Error rate gauge (calculated periodically)
export const errorRatePercentage = new client.Gauge({
  name: 'error_rate_percentage',
  help: 'Current error rate as percentage',
  registers: [client.register]
});

/**
 * Cache Metrics
 */

// Cache hits counter
export const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits by cache name',
  labelNames: ['cache_name'],
  registers: [client.register]
});

// Cache misses counter
export const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses by cache name',
  labelNames: ['cache_name'],
  registers: [client.register]
});

// Cache duration histogram
export const cacheDurationSeconds = new client.Histogram({
  name: 'cache_duration_seconds',
  help: 'Cache operation duration in seconds',
  labelNames: ['cache_name', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [client.register]
});

/**
 * Middleware to automatically register default Node.js process metrics
 */
try {
  client.collectDefaultMetrics({ register: client.register });
} catch (err) {
  console.warn('⚠️ Could not register default metrics:', err.message);
}

/**
 * Export Prometheus registry and utilities
 */
export const registry = client.register;

// Cache for metrics text (updated asynchronously)
let metricsCache = '# Metrics not yet available\n';

/**
 * Update metrics cache (call periodically or on demand)
 * This converts the async metrics() to a cached sync version
 */
export const updateMetricsCache = async () => {
  try {
    metricsCache = await registry.metrics();
  } catch (err) {
    console.warn('⚠️ Error updating metrics cache:', err.message);
    metricsCache = '# Error retrieving metrics\n';
  }
};

/**
 * Get all metrics in Prometheus text format (async)
 */
export const getMetricsText = async () => {
  return await registry.metrics();
};

/**
 * Get cached metrics text synchronously
 * For use in synchronous contexts like HTTP endpoints
 * Note: Cache is updated periodically, so may be slightly stale
 */
export const getMetricsTextSync = () => {
  return metricsCache;
};

/**
 * Get metrics as JSON (for structured logging)
 * Returns array of metric objects with name, type, help, and values
 */
export const getMetricsJson = async () => {
  try {
    const metricsText = await registry.metrics();
    const lines = metricsText.split('\n');
    const metrics = [];
    let currentMetric = null;

    for (const line of lines) {
      if (line.startsWith('# HELP')) {
        const parts = line.split(' ');
        const name = parts[2];
        const help = parts.slice(3).join(' ');
        currentMetric = { name, help, type: '', values: [] };
      } else if (line.startsWith('# TYPE')) {
        const parts = line.split(' ');
        const name = parts[2];
        const type = parts[3];
        if (!currentMetric || currentMetric.name !== name) {
          currentMetric = { name, help: '', type, values: [] };
          metrics.push(currentMetric);
        } else {
          currentMetric.type = type;
          metrics.push(currentMetric);
        }
      } else if (line && !line.startsWith('#') && currentMetric) {
        // Parse metric line: name{labels} value timestamp
        const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\{([^}]*)\}\s+([\d.e+-]+)(?:\s+(\d+))?/);
        if (match) {
          const metricName = match[1];
          const labelStr = match[2];
          const value = parseFloat(match[3]);

          // Parse labels
          const labels = {};
          const labelMatches = labelStr.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g);
          for (const labelMatch of labelMatches) {
            labels[labelMatch[1]] = labelMatch[2];
          }

          currentMetric.values.push({ labels, value });
        } else if (line && !line.startsWith('#')) {
          // Handle untagged metric line
          const parts = line.split(/\s+/);
          if (parts.length >= 2) {
            currentMetric.values.push({
              labels: {},
              value: parseFloat(parts[1])
            });
          }
        }
      }
    }

    return metrics;
  } catch (err) {
    console.warn('⚠️ Failed to parse metrics as JSON:', err.message);
    return [];
  }
};

/**
 * Reset all metrics (useful for testing)
 */
export const resetMetrics = () => {
  registry.resetMetrics();
};

/**
 * Update process uptime metric
 */
export const updateProcessUptime = () => {
  processUptimeSeconds.inc(Math.floor(process.uptime()));
};

export default client;
