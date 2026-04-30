# Metrics Interpretation Guide

## Overview

Prometheus metrics measure application health and performance. This guide explains what each metric means and how to interpret them.

---

## Metric Types

### Counter
A counter is a monotonically increasing number (only goes up, never down).

**Example:** `lume_http_requests_total`
```
lume_http_requests_total{method="GET", path="/api/users", status="200"} 1234
```
Meaning: 1,234 successful GET requests to /api/users since startup

**Use for:** Counting events, request volumes, errors

### Histogram
A histogram tracks the distribution of values (e.g., request duration).

**Example:** `lume_http_request_duration_seconds`
```
lume_http_request_duration_seconds_bucket{path="/api/users", le="0.1"} 500
lume_http_request_duration_seconds_bucket{path="/api/users", le="0.5"} 1200
lume_http_request_duration_seconds_bucket{path="/api/users", le="1.0"} 1230
```
Meaning: 
- 500 requests completed in < 100ms
- 1,200 requests completed in < 500ms
- 1,230 requests completed in < 1000ms
- (All requests completed in < 1 second)

**Use for:** Understanding distribution of durations, latencies

**Query percentile:**
```promql
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m]))
```
Returns the 95th percentile (p95) request duration in the last 5 minutes

### Gauge
A gauge is a point-in-time value that can go up or down.

**Example:** `lume_db_connections_active`
```
lume_db_connections_active{database="primary"} 42
```
Meaning: Currently 42 active database connections

**Use for:** Measurements, capacity, current state

---

## HTTP Request Metrics

### Counter: `lume_http_requests_total`

**Labels:**
- `method`: GET, POST, PUT, DELETE, PATCH
- `path`: /api/users, /api/users/{id}, /health (normalized)
- `status`: 200, 201, 400, 401, 403, 404, 500, etc.
- `status_group`: 2xx, 4xx, 5xx

**Query examples:**

Total requests in last 5 minutes:
```promql
rate(lume_http_requests_total[5m])
```

Request rate by endpoint:
```promql
rate(lume_http_requests_total{path="/api/users"}[5m])
```

Error rate (4xx + 5xx) as percentage:
```promql
(sum(rate(lume_http_requests_total{status_group=~"4xx|5xx"}[5m])) / 
 sum(rate(lume_http_requests_total[5m]))) * 100
```

### Histogram: `lume_http_request_duration_seconds`

**Labels:**
- `method`: HTTP method
- `path`: Request path (normalized)
- `status`: HTTP status code

**Query examples:**

95th percentile latency:
```promql
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m]))
```

99th percentile latency by endpoint:
```promql
histogram_quantile(0.99, rate(lume_http_request_duration_seconds_bucket{path="/api/users"}[5m]))
```

Average latency:
```promql
rate(lume_http_request_duration_seconds_sum[5m]) / 
rate(lume_http_request_duration_seconds_count[5m])
```

Request duration percentiles table:
```promql
histogram_quantile(0.50, rate(lume_http_request_duration_seconds_bucket[5m]))  # p50
histogram_quantile(0.90, rate(lume_http_request_duration_seconds_bucket[5m]))  # p90
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m]))  # p95
histogram_quantile(0.99, rate(lume_http_request_duration_seconds_bucket[5m]))  # p99
```

### Histogram: `lume_http_request_size_bytes` & `lume_http_response_size_bytes`

**Labels:**
- `method`: HTTP method
- `path`: Request path

**Query examples:**

Average request size:
```promql
rate(lume_http_request_size_bytes_sum[5m]) / 
rate(lume_http_request_size_bytes_count[5m])
```

Average response size by endpoint:
```promql
(rate(lume_http_response_size_bytes_sum{path="/api/users"}[5m]) / 
 rate(lume_http_response_size_bytes_count{path="/api/users"}[5m])) / 1024
```
(Divide by 1024 to convert bytes to KB)

---

## Database Metrics

### Counter: `lume_db_queries_total`

**Labels:**
- `operation`: select, insert, update, delete
- `status`: success, error

**Query examples:**

Total database queries per minute:
```promql
rate(lume_db_queries_total[1m])
```

Failed database queries:
```promql
rate(lume_db_queries_total{status="error"}[5m])
```

Query distribution by operation:
```promql
rate(lume_db_queries_total[5m]) by (operation)
```

### Histogram: `lume_db_query_duration_seconds`

**Labels:**
- `operation`: select, insert, update, delete

**Query examples:**

95th percentile query duration:
```promql
histogram_quantile(0.95, rate(lume_db_query_duration_seconds_bucket[5m]))
```

Slowest query type (p99):
```promql
histogram_quantile(0.99, rate(lume_db_query_duration_seconds_bucket[5m])) by (operation)
```

### Gauge: `lume_db_connections_active`

**Labels:**
- `database`: primary, replica, etc.

**What it means:**
- < 5: Healthy, plenty of capacity
- 5-20: Normal usage
- 20-40: High but okay
- 40+: Nearing pool limit, may exhaust soon

**Query examples:**

Current connection count:
```promql
lume_db_connections_active
```

Alert on connection pool exhaustion:
```promql
lume_db_connections_active > 50  # Assuming pool size is 100
```

---

## Module Metrics

### Counter: `lume_module_installations_total`

Counts total module installations over time.

**Query example:**
```promql
rate(lume_module_installations_total[24h])  # Installs per day
```

### Counter: `lume_module_operations_total`

Tracks module-specific operations (install, uninstall, enable, disable).

**Labels:**
- `module`: module name
- `operation`: install, uninstall, enable, disable
- `status`: success, failure

### Counter: `lume_module_errors_total`

**Labels:**
- `module`: module name
- `error_type`: MissingDependency, ConfigError, RuntimeError, etc.

**Query example:**
```promql
rate(lume_module_errors_total[5m]) by (module)  # Errors per module
```

### Gauge: `lume_module_active_count`

Current number of active modules.

**Healthy value:** Should be stable (not fluctuating)
**Alert if:** Decreases suddenly (module crash)

---

## Cache Metrics

### Counter: `lume_cache_hits_total` & `lume_cache_misses_total`

**Query examples:**

Cache hit rate percentage:
```promql
(rate(lume_cache_hits_total[5m]) / 
 (rate(lume_cache_hits_total[5m]) + rate(lume_cache_misses_total[5m]))) * 100
```

Expected values:
- > 80%: Excellent
- 60-80%: Good
- 40-60%: Fair
- < 40%: Poor, consider cache strategy

### Histogram: `lume_cache_duration_seconds`

**Query example:**

95th percentile cache operation duration:
```promql
histogram_quantile(0.95, rate(lume_cache_duration_seconds_bucket[5m]))
```

Should be < 50ms for healthy cache

---

## Error Metrics

### Counter: `lume_errors_total`

**Labels:**
- `error_type`: DatabaseError, ValidationError, AuthError, NotFoundError, ServerError

**Query examples:**

Errors by type:
```promql
rate(lume_errors_total[5m]) by (error_type)
```

All errors (not just HTTP 5xx):
```promql
sum(rate(lume_errors_total[5m]))
```

### Gauge: `lume_error_rate_percentage`

Current error rate as percentage.

**Healthy values:**
- < 1%: Excellent
- 1-2%: Good
- 2-5%: Acceptable
- > 5%: Alert condition

---

## PromQL Basics

### Rate of Change

**30-second change:**
```promql
rate(lume_http_requests_total[30s])
```
→ Requests per second in last 30 seconds

**5-minute change:**
```promql
rate(lume_http_requests_total[5m])
```
→ Requests per second over 5 minutes (smoother)

### Aggregation

**Sum across all labels:**
```promql
sum(lume_http_requests_total)
```

**Group by path:**
```promql
sum(lume_http_requests_total) by (path)
```

**Top 5 by request count:**
```promql
topk(5, sum(lume_http_requests_total) by (path))
```

### Filtering

**Only errors:**
```promql
lume_http_requests_total{status_group="5xx"}
```

**Multiple statuses:**
```promql
lume_http_requests_total{status=~"500|502|503|504"}
```

**Not matching pattern:**
```promql
lume_http_request_duration_seconds{path!="/health"}
```

### Calculations

**Percentage:**
```promql
(errors / total) * 100
```

**Ratio:**
```promql
rate(lume_cache_hits_total) / rate(lume_cache_misses_total)
```

---

## Grafana Dashboard Interpretation

### Dashboard Panel: Request Rate Over Time

**What it shows:** Number of requests per second over time

**Healthy pattern:** Flat line (consistent traffic)
**Alert pattern:** Spike or drop (anomaly)

**Dashboard URL:** `https://grafana.lume.dev/d/http-metrics`

### Dashboard Panel: p95 Latency by Endpoint

**What it shows:** 95th percentile request time per endpoint

**Healthy values:**
- /api/users: < 100ms
- /api/complex-query: < 500ms

**Alert pattern:** Sudden increase (performance regression)

### Dashboard Panel: Error Rate

**What it shows:** Percentage of failed requests (4xx + 5xx)

**Healthy value:** < 1%
**Warning:** 1-5%
**Alert:** > 5%

### Dashboard Panel: Database Query Duration

**What it shows:** p95 query duration and query rate

**Healthy pattern:**
- p95 < 100ms (fast queries)
- Consistent rate

**Alert pattern:**
- p95 > 500ms (slow queries)
- Sudden spike (query plan regression)

### Dashboard Panel: Active Connections

**What it shows:** Current database connections used

**Healthy pattern:** Stable between 5-20
**Alert pattern:** > 40 or rapidly increasing

### Dashboard Panel: Cache Hit Rate

**What it shows:** Percentage of cache hits

**Healthy value:** > 80%
**Warning:** 60-80%
**Poor:** < 60%

---

## Common Performance Issues and Metrics

### Issue 1: High Latency

**Check these metrics:**
1. `lume_http_request_duration_seconds{status="200"}` → Is application slow?
2. `lume_db_query_duration_seconds` → Is database slow?
3. `lume_db_connections_active` → Is connection pool exhausted?

**Resolution:** See HIGH_LATENCY.md runbook

### Issue 2: High Error Rate

**Check these metrics:**
1. `lume_error_rate_percentage` → Current error rate?
2. `lume_errors_total` → Which error types increasing?
3. `lume_http_requests_total{status_group="5xx"}` → Which endpoints?

**Resolution:** See HIGH_ERROR_RATE.md runbook

### Issue 3: Database Performance

**Check these metrics:**
1. `lume_db_query_duration_seconds` → Query duration p95/p99
2. `lume_db_queries_total` → Query rate
3. `lume_db_connections_active` → Pool utilization

**Resolution:** See DATABASE_PERFORMANCE.md runbook

### Issue 4: Memory/Resource Exhaustion

**Check these metrics:**
1. `node_memory_usage` (from node exporter)
2. `lume_module_active_count` → Number of modules
3. `lume_cache_hits_total + lume_cache_misses_total` → Cache pressure

**Resolution:** See RESOURCE_EXHAUSTION.md runbook

---

## SLI and SLO Definitions

### Service Level Indicator (SLI): Availability

**Definition:** Percentage of requests that return non-5xx responses

```promql
(sum(rate(lume_http_requests_total{status_group!="5xx"}[5m])) / 
 sum(rate(lume_http_requests_total[5m]))) * 100
```

### SLI: Latency

**Definition:** Percentage of requests that complete in < 500ms

```promql
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) < 0.5
```

### SLO (Service Level Objective)

**Availability SLO:** 99.9% uptime (43 minutes downtime per month)
```promql
# Alert if availability drops below 99.8% (rolling 30 days)
availability_30d < 99.8
```

**Latency SLO:** p95 < 500ms for 99% of requests
```promql
# Alert if p95 > 500ms
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) > 0.5
```

**Error Rate SLO:** < 0.1% (0.001)
```promql
# Alert if error rate > 0.5% (5x threshold)
lume_error_rate_percentage > 0.5
```

---

## Exporting Metrics

### Export to CSV from Grafana

1. Open dashboard
2. Click on graph
3. Click "Inspect" → "Data"
4. Click "Download CSV"

### Query Prometheus Directly

**HTTP GET:**
```bash
curl 'http://localhost:9090/api/v1/query_range' \
  --data-urlencode 'query=rate(lume_http_requests_total[5m])' \
  --data-urlencode 'start=1677600000' \
  --data-urlencode 'end=1677603600' \
  --data-urlencode 'step=60'
```

**Using promtool:**
```bash
promtool query instant 'lume_error_rate_percentage'
```

---

See also:
- **OBSERVABILITY_ARCHITECTURE.md**: Metrics system overview
- **ALERTS_RESPONSE.md**: Alert thresholds and responses
- **TROUBLESHOOTING.md**: Metric issues and solutions
