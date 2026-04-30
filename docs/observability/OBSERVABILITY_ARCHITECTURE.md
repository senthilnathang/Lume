# Lume Framework — Observability Architecture

## Overview

The Lume observability system provides comprehensive visibility into application behavior through **structured logging**, **distributed tracing**, **metrics collection**, and **intelligent alerting**. This document describes the system architecture, components, and data flow.

## System Components

### 1. Logging System (Winston)

**Purpose:** Record application events and request/response lifecycle

**Components:**
- **Winston Logger** (`src/core/logger/winston.config.js`): Structured JSON logging with multiple transports
- **Log Sanitizer** (`src/core/logger/log-sanitizer.js`): Removes sensitive data (passwords, tokens, API keys)
- **Logging Middleware** (`src/core/middleware/logging.middleware.js`): Captures all HTTP requests/responses

**Log Structure:**
```json
{
  "timestamp": "2026-04-30T10:30:45.123Z",
  "level": "info",
  "type": "REQUEST|RESPONSE|ERROR|SLOW_REQUEST",
  "requestId": "unique-request-identifier",
  "method": "GET|POST|PUT|DELETE",
  "path": "/api/users",
  "statusCode": 200,
  "durationMs": 45,
  "userId": "user-123",
  "userEmail": "user@example.com",
  "userRole": "admin",
  "message": "Incoming GET /api/users"
}
```

**Transports:**
- Console (development)
- File (`logs/combined.log`, `logs/error.log`)
- Optional: Elasticsearch (for log aggregation)

### 2. Distributed Tracing (OpenTelemetry + Jaeger)

**Purpose:** Trace requests across service boundaries and identify performance bottlenecks

**Components:**
- **OpenTelemetry SDK** (`src/core/tracing/tracing.config.js`): Auto-instrumentation framework
- **OTLP Exporter**: HTTP exporter to OpenTelemetry Collector
- **Jaeger Backend**: Trace storage and visualization

**Auto-Instrumentation Coverage:**
- HTTP (incoming requests)
- Express (routing, middleware)
- MySQL2 (database queries)
- Redis (cache operations)

**Trace Context Propagation:**
- W3C Trace Context standard
- `traceparent` header across services
- `x-trace-id` correlation with logs

**Sampling Strategy:**
- Development: 100% sampling (all traces)
- Production: 10% sampling (1 in 10 requests)
- Configurable via `OTEL_TRACES_SAMPLER_ARG`

**Trace Structure:**
```
Request Span (root)
├── Express Route Span
├── Database Query Span 1
├── Cache Hit Span
├── Database Query Span 2
└── Response Span
```

### 3. Metrics Collection (Prometheus)

**Purpose:** Measure application performance and health indicators

**Components:**
- **Prometheus Client** (`src/core/metrics/prometheus.config.js`): Metrics definition and export
- **Metrics Middleware** (`src/core/middleware/metrics.middleware.js`): Records HTTP metrics
- **Metrics Endpoint** (`GET /metrics`): Prometheus-compatible scrape endpoint

**Metric Types:**

#### Counters (monotonic increase)
- `lume_http_requests_total`: Total HTTP requests by method/path/status
- `lume_db_queries_total`: Total database queries by operation/status
- `lume_module_installations_total`: Total module installations
- `lume_errors_total`: Total errors by type
- `lume_cache_hits_total`: Total cache hits
- `lume_cache_misses_total`: Total cache misses

#### Histograms (distribution of values)
- `lume_http_request_duration_seconds`: HTTP request duration distribution
- `lume_db_query_duration_seconds`: Database query duration distribution
- `lume_cache_duration_seconds`: Cache operation duration distribution

#### Gauges (point-in-time value)
- `lume_db_connections_active`: Active database connections
- `lume_module_active_count`: Number of active modules
- `lume_error_rate_percentage`: Current error rate percentage

**Metric Labels (cardinality control):**
```
method: GET, POST, PUT, DELETE
path: /api/users (normalized to prevent explosion)
status: 200, 201, 400, 401, 403, 404, 500, etc.
status_group: 2xx, 4xx, 5xx
operation: select, insert, update, delete
```

### 4. Alerting System (Alert Rules + PagerDuty)

**Purpose:** Notify on-call engineers of critical issues

**Alert Rules:** (configured in monitoring stack)
- High Error Rate (> 5% for 5 minutes)
- High Latency (p95 > 1000ms for 5 minutes)
- Database Connection Pool Exhaustion
- Out-of-Memory conditions
- Service Down (no metrics for 2 minutes)

**Severity Levels:**
- **Critical**: Page immediately (5 min response SLA)
- **High**: Notify with escalation after 30 min (15 min response SLA)
- **Medium**: Create ticket, notify on morning standup (8 hour SLA)
- **Low**: Dashboard alert only (no notification)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Lume Application                         │
│  (Express.js, NestJS, Module Services)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │ Logs   │ │Traces  │ │Metrics │ │Alerts  │
   │(JSON)  │ │(Spans) │ │(Gauges)│ │(Rules) │
   └────────┘ └────────┘ └────────┘ └────────┘
        │          │          │          │
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │Winston │ │  OTLP  │ │Prometh │ │AlertMgr│
   │Logger  │ │Exporter│ │ eus    │ │(Rules) │
   └────────┘ └────────┘ └────────┘ └────────┘
        │          │          │          │
        │          │          │          │
        ▼          ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │Files/  │ │ Jaeger │ │Prometh │ │Pager   │
   │Elastic │ │ Backend│ │eus DB  │ │Duty    │
   └────────┘ └────────┘ └────────┘ └────────┘
        │          │          │          │
        └──────────┴──────────┴──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌──────────┐         ┌──────────┐
   │  Kibana  │         │ Grafana  │
   │  (Logs)  │         │(Metrics) │
   └──────────┘         └──────────┘
```

---

## Configuration

### Environment Variables

#### Tracing
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=lume-backend
OTEL_SERVICE_VERSION=2.0.0
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling in production
```

#### Logging
```bash
LOG_LEVEL=info
LOG_DIR=./logs
ELASTICSEARCH_ENABLED=false  # Optional: for log aggregation
ELASTICSEARCH_HOSTS=http://localhost:9200
```

#### Metrics
```bash
PROMETHEUS_PORT=9090
PROMETHEUS_SCRAPE_INTERVAL=15s
PROMETHEUS_RETENTION=15d
```

### Initialization Order

**Critical:** Tracing MUST be initialized BEFORE creating the Express app:

```javascript
// 1. Initialize tracing first
import { initTracing } from './src/core/tracing/tracing.config.js';
await initTracing();

// 2. Create Express app
const app = express();

// 3. Register middleware (order matters)
app.use(metricsMiddleware);      // Record metrics
app.use(loggingMiddleware);       // Log requests/responses
app.use(authMiddleware);          // Authenticate users
```

---

## Performance Characteristics

### Logging
- **Latency Impact**: < 1ms per request
- **Disk Usage**: ~500 KB per 10,000 requests (compressed)
- **Overhead**: 0.5% CPU

### Tracing
- **Latency Impact**: < 2ms per request (with sampling)
- **Network Bandwidth**: 
  - 100% sampling: ~1 MB/min at 100 RPS
  - 10% sampling: ~100 KB/min at 100 RPS
- **Sampling reduces overhead to < 1% CPU**

### Metrics
- **Latency Impact**: < 0.5ms per request
- **Memory Usage**: ~50 MB for metric storage
- **Scrape Size**: ~500 KB per scrape

### Combined Observability Stack
- **Total Latency Overhead**: 1-3ms per request (unnoticeable at scale)
- **Total CPU Overhead**: 2-3% in production (10% sampling)
- **Total Memory Overhead**: ~200 MB

---

## Tool Choices and Rationale

### Winston for Logging
✅ **Why:** Structured JSON logging, multiple transports, log levels, performance
- Alternative: pino (similar, slightly faster but less feature-rich)
- Not: console.log (unstructured, no persistence)

### OpenTelemetry + Jaeger for Tracing
✅ **Why:** W3C standard, vendor-neutral, auto-instrumentation, excellent UX
- Alternative: Zipkin (older, less feature-rich)
- Alternative: Datadog (proprietary, vendor lock-in)
- Not: manual request IDs (error-prone, no automatic correlation)

### Prometheus for Metrics
✅ **Why:** Industry standard, time-series optimized, simple text format, wide tool support
- Alternative: InfluxDB (better for high-cardinality, slower query performance)
- Alternative: Datadog (proprietary)
- Not: StatsD (UDP, loses data under load)

### Grafana for Visualization
✅ **Why:** Excellent dashboard UI, Prometheus support, alerting rules
- Works seamlessly with Prometheus
- Shared dashboards across team
- Easy alert configuration

---

## Key Architectural Decisions

### 1. **Sampling Strategy**
- 100% in development (visibility), 10% in production (cost control)
- Parent-based sampling: if parent sampled, child sampled
- Prevents distributed trace fragmentation

### 2. **Sensitive Data Handling**
- Sanitizer intercepts: passwords, tokens, API keys, credit cards
- Redacted in logs and traces
- Ensures GDPR/HIPAA compliance

### 3. **Path Normalization in Metrics**
- Example: `/api/users/123` → `/api/users/{id}`
- Prevents cardinality explosion (1000s of metrics instead of 1000000s)
- Ensures Prometheus remains queryable

### 4. **Request Tracing Context**
- Every request gets unique `requestId` (timestamp + random)
- Included in all logs and traces
- Enables correlation across systems

### 5. **Error Rate Tracking**
- Calculated every 60 seconds
- Used for circuit breaking and health checks
- More accurate than instantaneous calculation

---

## Security Considerations

### 1. **Sensitive Data Masking**
- Passwords, tokens, API keys are redacted automatically
- PII (email, phone) NOT redacted (needed for debugging)
- Custom sanitization rules can be added

### 2. **Access Control**
- Metrics endpoint (`/metrics`): internal only (IP whitelist)
- Logs in Kibana: RBAC based on user role
- Traces in Jaeger: production traces limited to ops team

### 3. **Data Retention**
- Logs: 30 days (configurable)
- Metrics: 15 days (Prometheus default)
- Traces: 72 hours (Jaeger default)

### 4. **Network Security**
- OTLP exporter: optional TLS to Jaeger
- Prometheus scrape: optional basic auth
- Kibana/Grafana: HTTPS + authentication

---

## Scaling Considerations

### At High Load (1000+ RPS)

**Logging:**
- Use async file transports to avoid blocking
- Enable log rotation (daily or by size)
- Consider log sampling (log every Nth request)

**Tracing:**
- Reduce sampling ratio (5% or lower)
- Use BatchSpanProcessor (default in production)
- Ensure OTLP collector has adequate resources

**Metrics:**
- Monitor Prometheus disk usage (15 days retention = ~1 GB per 100 RPS)
- Implement retention policies
- Use metric relabeling to drop unused labels

**Alerting:**
- Implement alert grouping to prevent alert fatigue
- Use alert routing to different teams
- Set appropriate thresholds (avoid false positives)

---

## Health Checks

The observability system includes health checks to verify all components:

**Logging Health:**
```
GET /api/health → logs present in last 5 minutes
```

**Tracing Health:**
```
GET /api/health → spans exported to Jaeger in last 5 minutes
```

**Metrics Health:**
```
GET /metrics → Prometheus-compatible output
```

**Alert System Health:**
```
Checked by: PagerDuty "heartbeat" alert every hour
```

---

## Related Documentation

- **LOGS_ANALYSIS_GUIDE.md**: How to query and analyze logs
- **TRACE_DEBUGGING_GUIDE.md**: How to use traces for debugging
- **METRICS_INTERPRETATION.md**: Understanding metrics and dashboards
- **ALERTS_RESPONSE.md**: Incident response and escalation
- **TROUBLESHOOTING.md**: Common issues and solutions
- **Runbooks:** HIGH_ERROR_RATE.md, HIGH_LATENCY.md, DATABASE_PERFORMANCE.md, RESOURCE_EXHAUSTION.md
