# Phase 6: Observability & Monitoring Implementation Guide

## Phase Overview

**Phase 6** establishes production-grade observability for the Lume framework across 6 tasks:

1. ✅ **Task 1: Structured Logging** (COMPLETE)
2. 🔄 **Task 2: Distributed Tracing** (Queued)
3. 🔄 **Task 3: Metrics & Monitoring** (Queued)
4. 🔄 **Task 4: Error Tracking & Alerting** (Queued)
5. 🔄 **Task 5: Performance Dashboard** (Queued)
6. 🔄 **Task 6: Health Checks & Canaries** (Queued)

---

## Task 1: Structured Logging - COMPLETE ✅

### What Was Implemented

A production-grade structured JSON logging system with:
- Winston logger with multiple transports
- Sensitive data masking (passwords, tokens, API keys, etc.)
- Request/response tracking with trace IDs
- Daily rotating log files
- Health check endpoint filtering
- Performance monitoring (slow request detection)

### Key Files

```
backend/src/core/logger/
├── winston.config.js           # Logger configuration (143 lines)
├── log-sanitizer.js            # Sensitive data masking (191 lines)
└── index.js                    # Public API (43 lines)

backend/src/core/middleware/
└── logging.middleware.js       # Request/response logging (147 lines)

backend/tests/unit/
├── logging.test.js             # Unit tests: 33 tests
└── logging-middleware.integration.test.js  # Integration tests: 8 tests
```

### Test Coverage

- **41 total tests**: 100% passing
- **Sensitive data masking**: 26 field patterns detected
- **Request/response logging**: Full lifecycle tracked
- **Health check filtering**: Skips noisy endpoints
- **Circular reference protection**: 20-level depth limit

### Usage Example

```javascript
import { createLogger } from './core/logger/index.js';

const logger = createLogger('UserService');
logger.info('User created', {
  userId: 123,
  email: 'user@example.com',
  // password field would be automatically redacted
});
```

### Log Output

```json
{
  "timestamp": "2026-04-30 21:32:23.913",
  "level": "info",
  "message": "User created",
  "context": {
    "service": "lume",
    "environment": "production",
    "version": "2.0.0",
    "userId": 123,
    "email": "user@example.com"
  }
}
```

---

## Phase 6 Task 2: Distributed Tracing (Queued)

### Planned Features

Build on Task 1 to add:
- OpenTelemetry integration
- Trace context propagation across services
- Span tracking for distributed calls
- W3C Trace Context support
- Service dependency mapping

### Foundation from Task 1

- ✅ Request ID (req.id) available on all requests
- ✅ Structured JSON format supports context propagation
- ✅ Logger hooks established for integration

### Expected Deliverables

- `backend/src/core/tracing/tracer.js` - OpenTelemetry setup
- `backend/src/core/tracing/span.js` - Span management
- `backend/src/core/middleware/tracing.middleware.js` - Context propagation
- Integration with logging.middleware.js for correlated logs

---

## Phase 6 Task 3: Metrics & Monitoring (Queued)

### Planned Features

Collect and expose metrics from:
- HTTP request latency (p50, p95, p99)
- Request volume per endpoint
- Error rates by status code
- Active request count
- Memory and CPU usage
- Database query metrics
- Cache hit/miss rates

### Foundation from Task 1

- ✅ Response duration logged for every request
- ✅ Status code recorded in logs
- ✅ Structured data format for aggregation
- ✅ Slow request detection (> 1 second)

### Expected Deliverables

- `backend/src/core/metrics/prometheus-client.js` - Prometheus metrics
- Metrics endpoint: `GET /metrics` (Prometheus format)
- Dashboard-ready metrics
- Integration with logging for rate calculation

---

## Phase 6 Task 4: Error Tracking & Alerting (Queued)

### Planned Features

- Error aggregation and grouping
- Alert rules based on error patterns
- Slack/email notifications
- Error rate thresholds
- Exception analysis
- Stack trace deduplication

### Foundation from Task 1

- ✅ Error logs in separate file (lume-error-*.log)
- ✅ Stack traces captured
- ✅ Error context logged with user info
- ✅ Log level differentiation (error vs warn)

### Expected Deliverables

- `backend/src/core/alerting/alert-engine.js` - Alert rules
- `backend/src/core/alerting/notifiers.js` - Slack/email senders
- Alert dashboard
- Error fingerprinting

---

## Phase 6 Task 5: Performance Dashboard (Queued)

### Planned Features

- Real-time performance metrics
- Endpoint latency visualization
- Request volume trends
- Error rate trends
- Slow query tracking
- User session analysis

### Foundation from Task 1

- ✅ All timing data in logs
- ✅ Structured format for aggregation
- ✅ User context available
- ✅ Trace IDs for correlation

### Expected Deliverables

- Dashboard frontend (Grafana or custom)
- Time-series data aggregation
- Alert configuration UI
- Historical trend analysis

---

## Phase 6 Task 6: Health Checks & Canaries (Queued)

### Planned Features

- Service health endpoints
- Database connectivity checks
- Cache availability tests
- External API health
- Synthetic transaction monitoring
- Self-healing capabilities

### Foundation from Task 1

- ✅ Health check filtering in middleware
- ✅ Structured health metadata
- ✅ Error tracking foundation

### Expected Deliverables

- `backend/src/core/health/health-checks.js`
- `backend/src/core/health/canary-tests.js`
- Health dashboard
- Automatic failover triggers

---

## Integration Timeline

### Week 1: Task 1 (COMPLETE ✅)
- [x] Winston logger setup
- [x] Sensitive data masking
- [x] Request/response logging
- [x] Test coverage (41 tests)

### Week 2: Task 2 (Next)
- [ ] OpenTelemetry integration
- [ ] Trace context propagation
- [ ] Span tracking

### Week 3-4: Tasks 3-4
- [ ] Prometheus metrics
- [ ] Error alerting
- [ ] Slack notifications

### Week 5-6: Tasks 5-6
- [ ] Dashboard implementation
- [ ] Health checks
- [ ] Canary tests

---

## Development Workflow

### For Task 1 (Complete)

```bash
# Tests
npm test -- tests/unit/logging

# View logs
tail -f logs/lume-$(date +%Y-%m-%d).log | jq .

# Search for errors
grep '"level":"error"' logs/lume-*.log | jq .

# Monitor performance
jq 'select(.context.durationMs > 1000)' logs/lume-*.log
```

### For Future Tasks

```bash
# Will use same foundation
# Task 2: Tracing
npm test -- tests/unit/tracing

# Task 3: Metrics
curl http://localhost:3000/metrics

# Task 4: Alerting
npm test -- tests/unit/alerting

# Task 5: Dashboard
open http://localhost:3000/admin/dashboard

# Task 6: Health
curl http://localhost:3000/health
```

---

## Configuration Reference

### Environment Variables

```env
# Core Logging (Task 1)
LOG_LEVEL=info                  # error, warn, info, debug, trace
LOG_FORMAT=json                 # json or text
LOG_DIR=logs                    # Directory for log files

# Cloud Logging (Task 1 - Optional)
LOGTAIL_SOURCE_TOKEN=           # Logtail integration
DATADOG_API_KEY=                # Datadog integration

# Tracing (Task 2 - Future)
OTEL_ENABLED=true               # Enable OpenTelemetry
OTEL_TRACE_RATIO=1.0            # Sampling ratio

# Metrics (Task 3 - Future)
PROMETHEUS_ENABLED=true
METRICS_PORT=9090

# Alerting (Task 4 - Future)
SLACK_WEBHOOK_URL=
ALERT_EMAIL=

# Dashboard (Task 5 - Future)
GRAFANA_ENABLED=true
GRAFANA_PORT=3001
```

---

## Performance Targets

### Task 1: Logging
- Request logging overhead: < 1ms
- Memory usage: ~2MB
- Disk usage: ~100KB/day per 1000 requests
- Log query time: < 500ms

### Task 2: Tracing
- Trace overhead: < 5ms per request
- Span creation: < 1ms
- Context propagation: negligible

### Task 3: Metrics
- Metric collection: < 2ms
- Prometheus scrape time: < 100ms
- 1000 time series limit

### Task 4: Alerting
- Alert evaluation: < 1 second
- Notification delivery: < 10 seconds
- Error deduplication: < 5 minutes

### Task 5: Dashboard
- Page load time: < 3 seconds
- Chart rendering: < 1 second
- Data freshness: 30 seconds

### Task 6: Health Checks
- Health endpoint response: < 200ms
- Canary test execution: < 5 seconds
- Check frequency: 30 seconds

---

## Security & Compliance

### Data Protection
- ✅ PII masking in logs
- ✅ Password redaction
- ✅ Token protection
- ✅ API key sanitization

### Future (Phase 6 Tasks)
- [ ] Encryption at rest (logs)
- [ ] Encryption in transit (cloud logging)
- [ ] Access control on dashboards
- [ ] HIPAA/GDPR compliance

### Audit Trail
- [x] All requests logged
- [x] User actions tracked
- [x] Change history available
- [ ] Immutable log archive (Task 4)

---

## Monitoring Strategy

### Current (Task 1)
- Application logs to console and files
- Manual log search and analysis
- Daily log rotation

### Planned (Tasks 2-6)
- Centralized log aggregation
- Real-time error alerts
- Performance dashboards
- Automated remediation
- Predictive alerting

---

## References

### Task 1 Documentation
- `/opt/Lume/PHASE_6_TASK_1_SUMMARY.md` - Detailed implementation
- `/opt/Lume/LOGGING_QUICK_START.md` - Usage guide
- `backend/src/core/logger/` - Source files

### Related Documentation
- `docs/ARCHITECTURE.md` - System architecture
- `docs/DEVELOPMENT.md` - Development guide
- `docs/TESTING.md` - Test infrastructure

### External Resources
- [Winston Logger](https://github.com/winstonjs/winston)
- [OpenTelemetry](https://opentelemetry.io/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)

---

## Contact & Support

For questions about Phase 6 implementation:
- Commit: `2552db04` - Task 1 implementation
- Author: Claude Haiku 4.5
- Date: 2026-04-30

---

**Phase 6 Status**: 1/6 tasks complete (16.7%)
**Next Milestone**: Task 2 - Distributed Tracing
**Estimated Duration**: 6 weeks for all 6 tasks
