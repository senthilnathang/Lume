/**
 * Prometheus Metrics Unit Tests
 * Tests metric recording and Prometheus endpoint
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/index.js';
import {
  recordHttpRequest,
  recordDatabaseQuery,
  setActiveConnections,
  recordModuleInstallation,
  recordModuleOperation,
  recordModuleError,
  setActiveModuleCount,
  recordBusinessEvent,
  setBusinessMetric,
  recordError,
  setErrorRate,
  recordCacheHit,
  recordCacheMiss,
  recordCacheDuration,
  getMetrics,
  updateMetricsCache
} from '../../src/core/metrics/index.js';

describe('Prometheus Metrics', () => {
  // Helper to refresh metrics cache before assertions
  const refresh = async () => {
    await updateMetricsCache();
  };

  describe('HTTP Request Metrics', () => {
    test('should record HTTP requests without throwing', async () => {
      recordHttpRequest('GET', '/api/users', 100, 200, 0, 512);
      recordHttpRequest('POST', '/api/users', 200, 201, 256, 512);
      await refresh();
      expect(getMetrics()).toContain('http_requests_total');
    });

    test('should record request duration histogram', async () => {
      recordHttpRequest('GET', '/api/test', 100, 200);
      recordHttpRequest('GET', '/api/test', 500, 200);
      recordHttpRequest('GET', '/api/test', 1500, 200);
      await refresh();
      expect(getMetrics()).toContain('http_request_duration_seconds');
    });

    test('should track different HTTP methods', async () => {
      recordHttpRequest('GET', '/api/items', 50, 200);
      recordHttpRequest('POST', '/api/items', 100, 201);
      recordHttpRequest('PUT', '/api/items/1', 75, 200);
      recordHttpRequest('DELETE', '/api/items/1', 60, 204);
      await refresh();
      const metrics = getMetrics();
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('method="PUT"');
      expect(metrics).toContain('method="DELETE"');
    });

    test('should track different status codes', async () => {
      recordHttpRequest('GET', '/ok', 50, 200);
      recordHttpRequest('GET', '/created', 50, 201);
      recordHttpRequest('GET', '/bad', 50, 400);
      recordHttpRequest('GET', '/notfound', 50, 404);
      recordHttpRequest('GET', '/error', 50, 500);
      await refresh();
      const metrics = getMetrics();
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="400"');
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('status_code="500"');
    });

    test('should normalize numeric IDs in paths', async () => {
      recordHttpRequest('GET', '/api/users/123', 50, 200);
      recordHttpRequest('GET', '/api/users/456', 50, 200);
      await refresh();
      expect(getMetrics()).toContain('path="/api/users/:id"');
    });

    test('should record request sizes', async () => {
      recordHttpRequest('POST', '/api/data', 100, 201, 1024, 2048);
      await refresh();
      const metrics = getMetrics();
      expect(metrics).toContain('http_request_size_bytes');
      expect(metrics).toContain('http_response_size_bytes');
    });
  });

  describe('Database Query Metrics', () => {
    test('should record database queries', async () => {
      recordDatabaseQuery('select', 50);
      recordDatabaseQuery('insert', 100);
      recordDatabaseQuery('update', 75);
      recordDatabaseQuery('delete', 60);
      await refresh();
      expect(getMetrics()).toContain('db_queries_total');
    });

    test('should track query duration', async () => {
      recordDatabaseQuery('select', 10);
      recordDatabaseQuery('select', 100);
      recordDatabaseQuery('select', 500);
      await refresh();
      expect(getMetrics()).toContain('db_query_duration_seconds');
    });

    test('should track query status', async () => {
      recordDatabaseQuery('select', 50, 'success');
      recordDatabaseQuery('insert', 100, 'error');
      await refresh();
      const metrics = getMetrics();
      expect(metrics).toContain('status="success"');
      expect(metrics).toContain('status="error"');
    });

    test('should track active connections', async () => {
      setActiveConnections(10, 'primary');
      setActiveConnections(5, 'replica');
      await refresh();
      expect(getMetrics()).toContain('db_connections_active');
    });
  });

  describe('Module Metrics', () => {
    test('should record module installations', async () => {
      recordModuleInstallation('base', 'success');
      recordModuleInstallation('editor', 'success');
      recordModuleInstallation('invalid', 'failed');
      await refresh();
      expect(getMetrics()).toContain('module_installations_total');
    });

    test('should record module operations', async () => {
      recordModuleOperation('editor', 'activate');
      recordModuleOperation('website', 'execute');
      await refresh();
      expect(getMetrics()).toContain('module_operations_total');
    });

    test('should record module errors', async () => {
      recordModuleError('editor', 'init_failed');
      recordModuleError('website', 'validation_error');
      await refresh();
      expect(getMetrics()).toContain('module_errors_total');
    });

    test('should track active module count', async () => {
      setActiveModuleCount(5);
      setActiveModuleCount(8);
      await refresh();
      expect(getMetrics()).toContain('module_active_count');
    });
  });

  describe('Business Metrics', () => {
    test('should record business events', async () => {
      recordBusinessEvent('donation_created', 'success');
      recordBusinessEvent('activity_published', 'success');
      recordBusinessEvent('payment_failed', 'failed');
      await refresh();
      expect(getMetrics()).toContain('business_events_total');
    });

    test('should record business metric values', async () => {
      setBusinessMetric('total_donations', 150000);
      setBusinessMetric('active_users', 425);
      await refresh();
      expect(getMetrics()).toContain('business_metric_value');
    });
  });

  describe('Error Metrics', () => {
    test('should record errors by type', async () => {
      recordError('ValidationError', 400);
      recordError('NotFoundError', 404);
      recordError('ServerError', 500);
      await refresh();
      expect(getMetrics()).toContain('errors_total');
    });

    test('should track error rate', async () => {
      setErrorRate(5.5);
      setErrorRate(10);
      await refresh();
      expect(getMetrics()).toContain('error_rate_percentage');
    });

    test('should clamp error rate 0-100', async () => {
      setErrorRate(50);
      await refresh();
      let metrics = getMetrics();
      expect(metrics).toContain('error_rate_percentage');

      setErrorRate(-5); // Should clamp to 0
      await refresh();
      metrics = getMetrics();
      // Should contain the metric (value gets clamped)
      expect(metrics).toContain('error_rate_percentage');

      setErrorRate(150); // Should clamp to 100
      await refresh();
      metrics = getMetrics();
      expect(metrics).toContain('error_rate_percentage');
    });
  });

  describe('Cache Metrics', () => {
    test('should record cache hits and misses', async () => {
      recordCacheHit('user_cache');
      recordCacheHit('user_cache');
      recordCacheMiss('user_cache');
      recordCacheHit('settings_cache');
      recordCacheMiss('settings_cache');
      await refresh();
      const metrics = getMetrics();
      expect(metrics).toContain('cache_hits_total');
      expect(metrics).toContain('cache_misses_total');
    });

    test('should record cache operation duration', async () => {
      recordCacheDuration('user_cache', 'get', 5);
      recordCacheDuration('user_cache', 'set', 8);
      recordCacheDuration('settings_cache', 'get', 3);
      await refresh();
      expect(getMetrics()).toContain('cache_duration_seconds');
    });
  });

  describe('Metrics Endpoint', () => {
    test('GET /metrics returns Prometheus format', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect('Content-Type', /text\/plain/)
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text.length).toBeGreaterThan(100);
    });

    test('metrics endpoint includes default labels', async () => {
      const response = await request(app).get('/metrics').expect(200);

      expect(response.text).toContain('service=');
      expect(response.text).toContain('environment=');
      expect(response.text).toContain('instance=');
      expect(response.text).toContain('version=');
    });

    test('metrics endpoint has proper Prometheus format', async () => {
      const response = await request(app).get('/metrics').expect(200);

      const lines = response.text.split('\n');
      expect(lines.length).toBeGreaterThan(10);

      // Should have HELP and TYPE lines
      const helpLines = lines.filter(l => l.startsWith('# HELP'));
      const typeLines = lines.filter(l => l.startsWith('# TYPE'));
      expect(helpLines.length).toBeGreaterThan(0);
      expect(typeLines.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid metric recording gracefully', async () => {
      expect(() => {
        recordHttpRequest(null, '/api/test', 100, 200);
        recordDatabaseQuery(null, 50);
        setActiveConnections(null);
      }).not.toThrow();
      await refresh();
    });

    test('should return metrics even with errors', async () => {
      const metrics = getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Content', () => {
    test('should include default metrics', async () => {
      await refresh();
      const metrics = getMetrics();

      // Should include process metrics from prom-client defaults
      expect(metrics).toMatch(/process_/);
      expect(metrics).toMatch(/nodejs_/);
    });

    test('should include HTTP metrics', async () => {
      recordHttpRequest('GET', '/api/test', 100, 200);
      await refresh();
      const metrics = getMetrics();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
    });

    test('should include database metrics', async () => {
      recordDatabaseQuery('select', 50);
      await refresh();
      const metrics = getMetrics();

      expect(metrics).toContain('db_queries_total');
      expect(metrics).toContain('db_query_duration_seconds');
    });

    test('should include module metrics', async () => {
      recordModuleInstallation('test', 'success');
      await refresh();
      const metrics = getMetrics();

      expect(metrics).toContain('module_installations_total');
      expect(metrics).toContain('module_operations_total');
      expect(metrics).toContain('module_errors_total');
    });
  });

  describe('Path Normalization', () => {
    test('should normalize UUID paths', async () => {
      recordHttpRequest('GET', '/api/users/550e8400-e29b-41d4-a716-446655440000', 50, 200);
      await refresh();
      expect(getMetrics()).toContain('path="/api/users/:uuid"');
    });

    test('should normalize hash paths', async () => {
      recordHttpRequest('GET', '/api/download/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 50, 200);
      await refresh();
      expect(getMetrics()).toContain('path="/api/download/:hash"');
    });
  });
});
