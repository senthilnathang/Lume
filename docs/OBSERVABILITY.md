# Lume Framework v2.0 — Observability & Monitoring Guide

## Overview

Lume v2.0 includes comprehensive observability features for monitoring application health, tracking errors, and debugging issues in production and development environments.

## Logging

### Winston Logger Configuration

The application uses Winston for structured logging with multiple transports:

```javascript
import { logger } from './config/logger.js';

logger.info('User created', { userId: 123, email: 'user@example.com' });
logger.warn('Cache miss detected', { cacheKey: 'settings:1' });
logger.error('Database connection failed', { error: err.message });
```

### Log Levels (by environment)

- **Development:** `debug` - All log levels enabled
- **Production:** `info` - Info, warn, and error only
- **Override:** Set `LOG_LEVEL` environment variable

```bash
LOG_LEVEL=debug npm run dev
LOG_LEVEL=error npm run start  # Only errors in production
```

### Log Output Locations

Logs are written to:

- **Console:** Real-time output during development
- **logs/error.log:** Error-level logs only
- **logs/combined.log:** All logs (info, warn, error)

## Request Tracing

### Trace IDs for Request Correlation

Every HTTP request receives a unique trace ID for correlation across logs:

```
[2e5a3d1f-8c2b-4d9e-b5a3-1c2d3e4f5g6h] GET /api/users - 200 (145ms)
```

### Setting Trace ID from Client

To propagate trace IDs from client to server (useful for distributed tracing):

```javascript
// Frontend - include trace ID in headers
fetch('/api/users', {
  headers: {
    'X-Trace-ID': 'client-trace-id-12345'
  }
});
```

The backend will use the provided trace ID or generate a new one if not provided.

### Accessing Trace ID in Request Handlers

```javascript
app.get('/api/endpoint', (req, res) => {
  const traceId = req.traceId;  // Access trace ID
  logger.info(`Processing request`, { traceId, userId: req.user?.id });
  res.json({ success: true });
});
```

### Trace ID in Response Headers

Every response includes the trace ID:

```
X-Trace-ID: 2e5a3d1f-8c2b-4d9e-b5a3-1c2d3e4f5g6h
```

## Metrics

### In-Memory Metrics

The application tracks real-time metrics in memory:

```javascript
{
  requests: {
    total: 1234,           // Total requests since startup
    successful: 1200,      // Status < 400
    failed: 34,            // Status >= 400
    byMethod: {
      GET: 800,
      POST: 250,
      PUT: 100,
      DELETE: 84
    },
    byStatusCode: {
      200: 900,
      201: 100,
      400: 15,
      500: 19
    }
  },
  performance: {
    avgDuration: 145,      // Average response time in ms
    slowRequests: [
      {
        method: 'POST',
        path: '/api/reports/generate',
        duration: 2500,
        statusCode: 200,
        timestamp: '2024-01-15T10:30:45Z'
      }
    ]
  },
  errors: {
    total: 15,
    byType: {
      ValidationError: 8,
      DatabaseError: 5,
      TimeoutError: 2
    }
  },
  uptime: 86400          // Process uptime in seconds
}
```

### Health Check Endpoint

The `/health` endpoint now returns metrics:

```bash
curl http://localhost:3000/health
```

Response includes:
- Application status and version
- Request metrics (total, successful, failed, success rate)
- Performance metrics (average response time, slow request count)
- System metrics (uptime, memory, CPU usage)
- Error count

### Slow Request Detection

Requests taking >1 second are automatically logged as warnings:

```
[SLOW_REQUEST] GET /api/reports/generate took 2500ms
```

The 100 most recent slow requests are stored in memory for analysis.

### Access Metrics Programmatically

```javascript
import { getMetrics, getHealthMetrics } from './core/middleware/metrics.js';

// Get all metrics
const allMetrics = getMetrics();

// Get health-check metrics
const healthMetrics = getHealthMetrics();
```

### Reset Metrics

For testing or periodic archival:

```javascript
import { resetMetrics } from './core/middleware/metrics.js';

resetMetrics();  // Clears all in-memory metrics
```

## Error Tracking

### Automatic Error Logging

All errors are automatically logged with:
- Trace ID for correlation
- Error type (constructor name)
- Error message and stack trace
- Request method, path, and status code

```
[2e5a3d1f-8c2b-4d9e-b5a3-1c2d3e4f5g6h] ValidationError: Email is required
Stack: at validateEmail (validators.js:45)
       at createUser (service.js:123)
       ...
Method: POST, Path: /api/users, Status: 400
```

### Error Counting

Errors are counted by type for trend analysis:

```javascript
{
  errors: {
    total: 15,
    byType: {
      ValidationError: 8,
      DatabaseError: 5,
      TimeoutError: 2
    }
  }
}
```

## Monitoring in Development

### Real-Time Logging

All logs appear in console during development:

```bash
npm run dev
# Output:
# [debug] GET /api/users?page=1 {"page":1} - Client: 127.0.0.1
# [info] GET /api/users - 200 (145ms)
# [warn] [SLOW_REQUEST] GET /api/complex-query took 1200ms
```

### Debugging with Trace IDs

1. Find the trace ID from error log
2. Use it to grep all related logs:

```bash
grep "2e5a3d1f-8c2b-4d9e-b5a3-1c2d3e4f5g6h" logs/combined.log
```

## Monitoring in Production

### Log Aggregation (Recommended)

For production, use a log aggregation service:

- **ELK Stack:** Elasticsearch, Logstash, Kibana
- **Datadog:** Real-time metrics and error tracking
- **Sumo Logic:** Cloud-based log management
- **Papertrail:** Syslog-compatible log management

Send logs to your service:

```bash
# Winston can send logs to syslog for forwarding
NODE_ENV=production npm run start
```

### Metrics Export (Recommended)

For distributed systems, export metrics to:

- **Prometheus:** Time-series database for metrics
- **Grafana:** Visualization of Prometheus metrics
- **New Relic:** Application performance monitoring
- **Datadog:** Unified monitoring platform

Example: Export to Prometheus format:

```javascript
app.get('/metrics', (req, res) => {
  const metrics = getMetrics();
  const output = [
    `# HELP requests_total Total HTTP requests`,
    `# TYPE requests_total counter`,
    `requests_total{method="GET"} ${metrics.requests.byMethod.GET || 0}`,
    `requests_total{method="POST"} ${metrics.requests.byMethod.POST || 0}`,
    `# HELP response_duration_ms Average response duration`,
    `# TYPE response_duration_ms gauge`,
    `response_duration_ms ${metrics.performance.avgDuration}`,
  ].join('\n');
  res.set('Content-Type', 'text/plain');
  res.send(output);
});
```

### Alerting Rules (Example)

Set up alerts for:

- **Error rate > 5%:** High failure rate indicates problems
- **Response time > 2s:** Performance degradation
- **Error spike:** Sudden increase in specific error type
- **Memory usage > 80%:** Memory leak or under-provisioning
- **Request volume > 10x normal:** Unusual traffic pattern

## Best Practices Checklist

- [ ] Use descriptive log messages with context data
- [ ] Include trace IDs in error reports for correlation
- [ ] Monitor slow requests (>1s) for optimization
- [ ] Check health endpoint regularly for system status
- [ ] Set up log aggregation in production
- [ ] Configure alerting on error rate and response time
- [ ] Export metrics to monitoring service
- [ ] Review error trends weekly
- [ ] Archive old logs to cold storage
- [ ] Use debug logging only during investigation (turn off in production)

## Example: Complete Monitoring Setup

```javascript
// Express route with full observability
app.post('/api/reports/generate', async (req, res, next) => {
  const traceId = req.traceId;
  const startTime = Date.now();

  try {
    logger.info('Report generation started', { traceId, userId: req.user.id });

    // Business logic
    const result = await generateReport(req.body, req.user.id);

    logger.info('Report generated successfully', { traceId, reportId: result.id });
    res.json({ success: true, data: result });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Report generation failed`, { 
      traceId, 
      error: error.message, 
      duration,
      userId: req.user.id 
    });
    next(error);  // errorTracker middleware handles the error
  }
});
```

## Environment Variables

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error
NODE_ENV=production              # Enable production optimizations

# External Services (Optional)
SENTRY_DSN=https://...          # Error tracking via Sentry
DATADOG_API_KEY=...             # Metrics to Datadog
PROMETHEUS_PUSHGATEWAY=...      # Push metrics to Prometheus
```
