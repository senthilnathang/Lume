# Observability Troubleshooting Guide

## Overview

This guide helps diagnose and fix issues when observability components aren't working correctly.

---

## Logging Issues

### Issue: No Logs Appearing

**Symptom:** Application is running but no logs show up in files or Kibana

**Checklist:**

1. **Is logging middleware registered?**
```bash
grep -n "loggingMiddleware" src/index.js src/main.js src/server.js
```
Expected: Should see middleware registration

If missing:
```javascript
// In src/index.js or src/main.js
import { loggingMiddleware } from './src/core/middleware/logging.middleware.js';

app.use(loggingMiddleware);  // Register early in middleware chain
```

2. **Is log directory writable?**
```bash
ls -la logs/
# Should see: drwxrwxr-x (755 permissions)

# If not writable:
chmod 755 logs/
```

3. **Is disk space available?**
```bash
df -h logs/
# Should show > 100 MB available

# If full, clear old logs:
rm logs/*.1 logs/*.2 logs/*.3
```

4. **Is LOG_LEVEL set too high?**
```bash
echo $LOG_LEVEL
# Should be: info or debug
# If: error or silent, increase verbosity

# Fix:
export LOG_LEVEL=info
npm start
```

5. **Are logs being written?**
```bash
tail -f logs/combined.log
# Make a request: curl http://localhost:3000/api/users
# Should see entries appear
```

6. **Is Winston config correct?**
```javascript
// src/core/logger/winston.config.js
const transports = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/combined.log' }),
  new winston.transports.Console({ format: winston.format.simple() }),
];
// ^ Should match your LOG_DIR
```

**Fix command:**
```bash
# Reset logging
rm -rf logs/*
mkdir -p logs
chmod 755 logs
npm start
```

---

### Issue: Logs Too Verbose

**Symptom:** Too many logs, disk is filling up

**Solutions:**

1. **Reduce log level:**
```bash
LOG_LEVEL=warn npm start
# Now only errors and warnings
```

2. **Skip health check logs:**
Edit `src/core/middleware/logging.middleware.js`:
```javascript
const SKIP_LOGGING_PATHS = [
  '/health',
  '/metrics',
  '/api/health',
  '/api/*/health',        // Add this to skip all health checks
  '/static/*',            // Add this to skip static files
];
```

3. **Enable log rotation:**
```javascript
// src/core/logger/winston.config.js
new winston.transports.File({
  filename: 'logs/combined.log',
  maxsize: 5242880,        // 5 MB
  maxFiles: 5,             // Keep 5 files
})
```

4. **Sample high-volume endpoints:**
```javascript
// In logging middleware
if (Math.random() < 0.01 && req.path === '/api/high-volume') {
  // Log only 1% of high-volume requests
  return next();
}
```

---

### Issue: Logs Not Appearing in Kibana

**Symptom:** Logs on disk but not in Kibana dashboard

**Checklist:**

1. **Is Elasticsearch running?**
```bash
curl http://localhost:9200/
# Should return JSON with version info
```

2. **Is Elasticsearch enabled in config?**
```bash
echo $ELASTICSEARCH_ENABLED
# Should be: true

grep -n "ELASTICSEARCH" src/core/logger/winston.config.js
```

3. **Is Elasticsearch endpoint correct?**
```bash
# Check config
grep "ELASTICSEARCH_HOSTS" .env
# Default: http://localhost:9200

# Test connection
curl http://localhost:9200/_cat/indices
```

4. **Are indices being created?**
```bash
curl http://localhost:9200/_cat/indices | grep lume
# Should see: lume-logs-2026-04-30

# If not:
# 1. Check Winston configuration
# 2. Verify Elasticsearch is accepting connections
# 3. Check network between app and Elasticsearch
```

5. **Is Kibana connected to Elasticsearch?**
```bash
# In Kibana UI, go to: Admin → Index Patterns
# Should see: lume-logs-* pattern
# If not, create it manually
```

**Fix:**
```bash
# Restart Elasticsearch
docker-compose restart elasticsearch

# Restart application
npm start

# Wait 30 seconds for logs to appear
```

---

## Tracing Issues

### Issue: No Traces Appearing in Jaeger

**Symptom:** Application running but Jaeger shows no data

**Checklist:**

1. **Is tracing initialized?**
```bash
# Check startup logs
npm start 2>&1 | grep -i otel

# Should see:
# ✅ OpenTelemetry tracing initialized
# Endpoint: http://localhost:4317
```

2. **Is OTEL_EXPORTER_OTLP_ENDPOINT set?**
```bash
echo $OTEL_EXPORTER_OTLP_ENDPOINT
# Should be: http://localhost:4317

# If not set:
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
npm start
```

3. **Can you reach the OTLP collector?**
```bash
curl -v http://localhost:4317/v1/traces \
  -X POST \
  -H "Content-Type: application/protobuf" \
  --data ""
# Should not get "Connection refused"
```

4. **Is the OTLP collector running?**
```bash
docker ps | grep otel
# Should see: otel-collector or similar

# If not running:
docker-compose up -d otel-collector
```

5. **Is initTracing() called before Express setup?**
```javascript
// src/index.js - CORRECT ORDER
import { initTracing } from './src/core/tracing/tracing.config.js';
await initTracing();              // ← FIRST

const app = express();            // ← SECOND
app.use(metricsMiddleware);
app.use(loggingMiddleware);
```

6. **Is sampling configured?**
```bash
echo $OTEL_TRACES_SAMPLER_ARG
# Should be: 0.1 (or 1.0 for debugging)

# For debugging, increase sampling:
export OTEL_TRACES_SAMPLER_ARG=1.0
npm start
```

7. **Make a request and check logs:**
```bash
curl http://localhost:3000/api/users
# Check for trace export errors:
tail logs/combined.log | grep -i "otel\|trace"
```

**Fix:**
```bash
# 1. Ensure OTLP collector is running
docker-compose up -d otel-collector

# 2. Set environment
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_TRACES_SAMPLER_ARG=1.0

# 3. Restart app
npm start

# 4. Make request
curl http://localhost:3000/api/users

# 5. Check Jaeger
# Open http://localhost:16686
# Service: lume-backend
# Should see traces
```

---

### Issue: Traces Missing Some Operations

**Symptom:** Trace shows partial request, some operations missing

**Causes:**
1. Not all operations are auto-instrumented
2. Custom operations need manual spans

**Solution: Add manual span**

```javascript
import { createSpan, recordException } from './src/core/tracing/tracing.config.js';

export async function processLargeFile(fileId) {
  const span = createSpan('process-file', {
    'file.id': fileId,
    'file.size': file.size,
  });

  try {
    // Do work
    const result = await processFile(fileId);
    
    span.addEvent('processing-complete', {
      'items-processed': result.count,
    });
    
    return result;
  } catch (error) {
    recordException(error, span);
    throw error;
  } finally {
    span.end();
  }
}
```

---

### Issue: Sampling Missing Important Traces

**Symptom:** Only 10% of traces visible, missing errors

**Solution: Error-based sampling**

```javascript
// src/core/tracing/tracing.config.js
const samplingRatio = process.env.OTEL_TRACES_SAMPLER_ARG
  ? parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG)
  : NODE_ENV === 'production' ? 0.1 : 1.0;

// OPTION 1: Always sample errors
if (res.statusCode >= 400) {
  samplingRatio = 1.0;  // 100% sampling for errors
}

// OPTION 2: Temporary full sampling for debugging
export OTEL_TRACES_SAMPLER_ARG=1.0  # During investigation
```

---

## Metrics Issues

### Issue: No Metrics Appearing

**Symptom:** `/metrics` endpoint returns empty or no data in Prometheus

**Checklist:**

1. **Is metrics middleware registered?**
```bash
grep -n "metricsMiddleware" src/index.js
```

2. **Can you access /metrics endpoint?**
```bash
curl http://localhost:3000/metrics
# Should return Prometheus text format
# Example:
# # HELP lume_http_requests_total Total HTTP requests
# # TYPE lume_http_requests_total counter
# lume_http_requests_total{method="GET",path="/api/users",status="200"} 123
```

3. **Is Prometheus scraping the endpoint?**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
# Should show: localhost:3000 as UP

# Or in Prometheus UI:
# http://localhost:9090/targets
```

4. **Are metrics being recorded?**
```bash
# Make some requests
for i in {1..10}; do curl http://localhost:3000/api/users; done

# Check metrics
curl http://localhost:3000/metrics | grep "http_requests_total"
# Should see counter increase
```

5. **Is Prometheus retention policy OK?**
```bash
# Check metrics age in Prometheus
curl http://localhost:9090/api/v1/query?query=up
# Should return recent data (now - retention period)
```

**Fix:**
```bash
# 1. Verify middleware registration
grep "metricsMiddleware" src/index.js || echo "NOT REGISTERED"

# 2. If missing, add to src/index.js:
# import { metricsMiddleware } from './src/core/middleware/metrics.middleware.js';
# app.use(metricsMiddleware);

# 3. Restart app
npm start

# 4. Make requests
curl http://localhost:3000/api/users

# 5. Check metrics
curl http://localhost:3000/metrics
```

---

### Issue: Metrics Endpoint Too Large

**Symptom:** `/metrics` endpoint returning 10+ MB response

**Cause:** Cardinality explosion (too many metric combinations)

**Example:**
```
# Bad: 1000s of metrics
lume_http_request_duration_seconds{path="/api/users/1", status="200"}
lume_http_request_duration_seconds{path="/api/users/2", status="200"}
lume_http_request_duration_seconds{path="/api/users/3", status="200"}
...

# Good: Normalized paths
lume_http_request_duration_seconds{path="/api/users/{id}", status="200"}
```

**Fix: Normalize paths**

```javascript
// src/core/metrics/index.js
function normalizePath(path) {
  return path
    .replace(/\/\d+/g, '/{id}')           // /users/123 → /users/{id}
    .replace(/\/[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}/g, '/{uuid}')
    .replace(/\/[0-9.]+/g, '/{number}');  // /123.45 → /{number}
}
```

**Check cardinality:**
```bash
# Count unique metric combinations
curl http://localhost:3000/metrics | \
  grep "^lume_" | wc -l
# Should be < 1000

# If > 10000, cardinality explosion
```

---

### Issue: Prometheus Can't Scrape Metrics

**Symptom:** Prometheus shows target as DOWN

**Checklist:**

1. **Is application running?**
```bash
curl http://localhost:3000/metrics
# Should work
```

2. **Is Prometheus config correct?**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'lume-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

3. **Is firewall blocking?**
```bash
# Check if port 3000 is accessible from Prometheus container
docker exec prometheus curl http://host.docker.internal:3000/metrics
# or
docker exec prometheus curl http://lume-backend:3000/metrics
```

4. **Reload Prometheus config:**
```bash
# Prometheus reads config on startup only
# If you changed prometheus.yml:
docker-compose restart prometheus

# Or if using systemd:
systemctl reload prometheus
```

**Fix:**
```bash
# 1. Verify application running
curl http://localhost:3000/metrics

# 2. Check Prometheus config
cat prometheus.yml | grep -A 10 "lume-backend"

# 3. Restart Prometheus
docker-compose restart prometheus

# 4. Check targets
# http://localhost:9090/targets
```

---

## Alert Issues

### Issue: Alerts Not Firing

**Symptom:** Metrics show problem (e.g., error rate > 5%) but no alert

**Checklist:**

1. **Is the alert rule configured?**
```bash
# Check Prometheus alert rules
curl http://localhost:9090/api/v1/rules
# Should see your alert rule

# Or in UI:
# http://localhost:9090/alerts
```

2. **Is the alert rule syntax correct?**
```promql
# Bad syntax
lume_error_rate_percentage > 5

# Good syntax
lume_error_rate_percentage > 5.0

# Also check that metric exists
lume_error_rate_percentage > 0
```

3. **Is the metric actually above threshold?**
```bash
# Check metric value
curl 'http://localhost:9090/api/v1/query?query=lume_error_rate_percentage'
# If result is null, metric not being recorded
```

4. **Has enough time passed?**
Alerts require metric to exceed threshold for the `for` duration:
```yaml
- alert: HighErrorRate
  expr: lume_error_rate_percentage > 5
  for: 5m      # Alert fires after 5 minutes above threshold
```
If metric was above threshold for only 2 minutes, alert won't fire.

5. **Is alert routing working?**
```bash
# Check Prometheus alert manager config
cat alertmanager.yml | grep -A 10 "slack\|pagerduty"

# Restart alert manager:
docker-compose restart alertmanager
```

**Fix:**
```bash
# 1. Create test alert (temporary)
curl -X POST http://localhost:9090/api/v1/alerts \
  -d '[{"status":"firing", "labels":{"alertname":"TestAlert"}}]'

# 2. Check Prometheus rules
# http://localhost:9090/alerts

# 3. Verify metric is being recorded
curl 'http://localhost:9090/api/v1/query?query=lume_error_rate_percentage'

# 4. If metric is high, wait 5+ minutes for alert to fire
```

---

### Issue: Alert Fatigue (Too Many False Alarms)

**Symptom:** Getting paged constantly for non-critical issues

**Solution: Tune thresholds**

```yaml
# Too sensitive (triggers on every spike)
- alert: HighErrorRate
  expr: lume_error_rate_percentage > 0.5
  for: 1m

# Better (requires sustained elevation)
- alert: HighErrorRate
  expr: lume_error_rate_percentage > 5
  for: 5m
  annotations:
    description: "Error rate is {{ $value }}%"

# Even better (trending indicator)
- alert: HighErrorRate
  expr: |
    (lume_error_rate_percentage > 3) and
    (increase(lume_error_rate_percentage[5m]) > 1)
  for: 5m
```

---

## Grafana Issues

### Issue: Dashboard Empty (No Data)

**Symptom:** Grafana panel shows "No data"

**Checklist:**

1. **Is Prometheus data source configured?**
```
Grafana → Configuration → Data Sources
Should see: Prometheus
Status: green (connected)
```

2. **Is Prometheus running and has data?**
```bash
curl http://localhost:9090/api/v1/query?query=up
# Should return value: 1
```

3. **Is time range correct?**
Grafana top-right corner should show:
- Start time: recent (last hour or day)
- End time: now
- If range is 2 years ago, won't see current data

4. **Is metric name correct?**
```promql
# In Grafana query, check metric exists
lume_http_requests_total
# If red error, metric not found
```

5. **Is panel using correct data source?**
Panel settings → Data source should be "Prometheus"

**Fix:**
```
1. Click panel → Edit
2. Check metric name: lume_http_requests_total
3. Check time range: Last 1 hour
4. Click play/refresh button
5. Should see data
```

---

### Issue: Grafana Slow or Timing Out

**Symptom:** Dashboards take 10+ seconds to load

**Cause:** Prometheus query too expensive or database under load

**Solutions:**
1. Reduce time range (Last 1 hour instead of Last 30 days)
2. Simplify query (remove extra filters)
3. Increase Prometheus resources
4. Use recording rules for complex queries

```promql
# Expensive query
sum(rate(lume_http_requests_total[5m])) by (path, method, status)

# Better: Use recording rule that pre-computes
# In prometheus.yml:
# recording_rules:
#   - expr: sum(rate(lume_http_requests_total[5m])) by (path, method, status)
#     record: rate:lume_http_requests:5m

# Then query:
rate:lume_http_requests:5m
```

---

## Docker Compose Issues

### Issue: All Containers Down

**Symptom:** No observability data (nothing running)

**Check:**
```bash
docker-compose ps
# See status of all containers

docker-compose logs -f
# See error messages
```

**Fix:**
```bash
# Restart everything
docker-compose down
docker-compose up -d

# Wait for startup (30-60 seconds)
sleep 30

# Verify services
docker-compose ps
# All should show "Up"

# Test connectivity
curl http://localhost:9090        # Prometheus
curl http://localhost:3000/metrics # Metrics
curl http://localhost:16686       # Jaeger
```

---

### Issue: Service Won't Start (CrashLoopBackOff)

**Symptom:** Docker container keeps restarting

**Cause:** Configuration error or resource limit

**Debug:**
```bash
docker-compose logs prometheus
# See error message

# Common errors:
# - Port already in use: Change port in docker-compose.yml
# - Config file not found: Check path
# - Memory limit too low: Increase in docker-compose.yml
```

**Fix example (port conflict):**
```yaml
# docker-compose.yml
services:
  prometheus:
    ports:
      - "9091:9090"  # Change from 9090 to 9091
```

---

## Network Issues

### Issue: Components Can't Communicate

**Symptom:** Metrics not reaching Prometheus, traces not reaching Jaeger

**Check:**
```bash
# From app container to Prometheus
docker-compose exec app curl http://prometheus:9090

# From app to Jaeger OTLP
docker-compose exec app curl http://otel-collector:4317 -X POST

# DNS resolution
docker-compose exec app nslookup prometheus
```

**Common issues:**
1. **Hostname wrong:** Use service name (prometheus, not localhost)
2. **Port wrong:** 4317 (OTLP), 9090 (Prometheus), 16686 (Jaeger)
3. **Network isolated:** Ensure all containers in same docker network

**Fix:**
```bash
# Check docker-compose.yml networks section
# All services should have:
networks:
  - lume-network

# Verify network
docker network ls | grep lume
docker network inspect <network-name>
```

---

## Summary Troubleshooting Checklist

**For any observability issue:**

1. ✅ **Check if service is running:** `docker-compose ps` or `ps aux | grep node`
2. ✅ **Check connectivity:** `curl http://localhost:port`
3. ✅ **Check configuration:** Verify env vars, config files
4. ✅ **Check logs:** `docker-compose logs <service>` or `tail -100 logs/combined.log`
5. ✅ **Check metrics/traces:** Is data being generated?
6. ✅ **Restart service:** Often fixes temporary issues
7. ✅ **Check time sync:** If using alerts, servers must have same time

---

See also:
- **OBSERVABILITY_ARCHITECTURE.md**: System design
- **LOGS_ANALYSIS_GUIDE.md**: Log debugging
- **TRACE_DEBUGGING_GUIDE.md**: Trace debugging
- **METRICS_INTERPRETATION.md**: Metrics guide
