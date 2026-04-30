# Lume Framework - Local Development Setup Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Running the Observability Stack](#running-the-observability-stack)
5. [Accessing Services](#accessing-services)
6. [Making Test Requests](#making-test-requests)
7. [Viewing Logs, Traces & Metrics](#viewing-logs-traces--metrics)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

---

## Quick Start

Get the full observability stack running in 3 steps:

```bash
# 1. Clone or navigate to the Lume project
cd /path/to/lume

# 2. Start the observability stack
./scripts/start-observability.sh

# 3. Start the backend application in another terminal
npm run dev
```

**That's it!** All services are now running and collecting observability data.

---

## Prerequisites

### Required Software

- **Docker Desktop** (v20.10+)
  - Download: https://www.docker.com/products/docker-desktop
  - Includes both Docker and Docker Compose

- **Node.js** (v18+)
  - Download: https://nodejs.org/
  - Required for running the Lume backend

- **Git** (v2.30+)
  - Download: https://git-scm.com/
  - For cloning the repository

- **Bash/Shell** (or equivalent)
  - macOS: Built-in
  - Linux: Built-in
  - Windows: Git Bash or WSL2 recommended

### System Requirements

- **RAM**: 8GB minimum (4GB for observability stack + 4GB for development)
- **Disk**: 10GB free space (for containers, volumes, logs)
- **CPU**: 4 cores recommended
- **Network**: Ports 3000-9093 must be available

### Environment Validation

```bash
# Check Docker installation
docker --version
# Expected: Docker version 20.10.x or higher

# Check Docker Compose
docker compose version
# Expected: Docker Compose version 2.x or higher

# Check Docker daemon is running
docker ps
# Expected: List of running containers (empty if none are running)

# Check Node.js
node --version
# Expected: v18.x or higher

# Check npm
npm --version
# Expected: 8.x or higher
```

---

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/lume.git
cd lume
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### Step 3: Create Environment File

```bash
# Copy the example environment file
cp .env.local.example .env.local

# (Optional) Edit .env.local to customize settings
nano .env.local  # or use your favorite editor
```

**Key variables to consider:**
- `NODE_ENV=development` (for dev mode)
- `LOG_LEVEL=debug` (verbose logging)
- `OTEL_TRACES_SAMPLER=always_on` (capture 100% of traces for development)

### Step 4: Verify Docker Configuration

```bash
# Check Docker daemon is running
docker ps

# Pull base images (this may take a few minutes on first run)
docker pull mysql:8.0
docker pull redis:7.2-alpine
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
docker pull jaegertracing/all-in-one:latest
```

---

## Running the Observability Stack

### Start the Stack

```bash
# Navigate to project root
cd /path/to/lume

# Start all observability services
./scripts/start-observability.sh start

# Or using docker-compose directly
docker-compose -f docker-compose.observability.yml up -d
```

### Verify Services Are Running

```bash
# Check all containers
docker ps

# Check stack status
./scripts/start-observability.sh status

# Expected output: 10+ containers running
#   - elasticsearch
#   - kibana
#   - loki
#   - prometheus
#   - grafana
#   - jaeger
#   - alertmanager
#   - redis
#   - mysql
#   - otel-collector
```

### Monitor Startup Progress

```bash
# View logs from all services
./scripts/start-observability.sh logs

# View logs from specific service
./scripts/start-observability.sh logs prometheus
./scripts/start-observability.sh logs grafana
./scripts/start-observability.sh logs jaeger
```

### Start the Backend Application

```bash
cd /path/to/lume/backend

# Install dependencies (if not already done)
npm install

# Start in development mode
npm run dev

# Expected output: "Server running on http://localhost:3000"
```

---

## Accessing Services

### Web Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | (none) |
| **Jaeger UI** | http://localhost:16686 | (none) |
| **Kibana** | http://localhost:5601 | (none) |
| **AlertManager** | http://localhost:9093 | (none) |
| **Loki** | http://localhost:3100 | (none) |

### API Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| **Prometheus API** | http://localhost:9090/api/v1 | Query metrics |
| **Jaeger API** | http://localhost:16686/api | Query traces |
| **Elasticsearch** | http://localhost:9200 | Direct log queries |
| **Loki API** | http://localhost:3100/loki/api | Query logs |
| **Lume Metrics** | http://localhost:3000/metrics | Prometheus scrape endpoint |

### Database Access

```bash
# Connect to MySQL directly
mysql -h localhost -P 3306 -u lume_dev -p
# Password: lume123

# Connect to Redis directly
redis-cli -p 6379
# Password: redis123
# Command: AUTH redis123
```

---

## Making Test Requests

### 1. Health Check

```bash
# Backend health
curl http://localhost:3000/api/base/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-04-30T10:30:45.123Z",
#   "version": "2.0.0"
# }
```

### 2. Metrics Endpoint

```bash
# View application metrics (Prometheus format)
curl http://localhost:3000/metrics

# Expected output: Prometheus text format with metrics like:
# lume_http_requests_total{method="GET",path="/health",status="200"} 1
# lume_http_request_duration_seconds_bucket{...} 0.045
```

### 3. Sample API Requests

```bash
# Get users (requires authentication)
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a new resource
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Simulate error
curl http://localhost:3000/api/users/invalid-id
# Expected: 404 or 500 error (will trigger error metrics)
```

### 4. Generate Load for Testing

```bash
# Use the included load testing script
node scripts/load-test.js

# Or use Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/base/health

# Or use wrk
wrk -t4 -c10 -d30s http://localhost:3000/api/base/health
```

---

## Viewing Logs, Traces & Metrics

### Grafana - Dashboards & Visualization

#### Access Grafana

```
http://localhost:3000
Login: admin / admin
```

#### Create Your First Dashboard

1. **Add Data Source**
   - Home → Configuration → Data Sources
   - Click "Add data source"
   - Select "Prometheus"
   - URL: `http://prometheus:9090`
   - Save & Test

2. **Create Dashboard**
   - Home → Create → Dashboard
   - Click "Add a new panel"
   - Select Prometheus data source
   - Query examples:
     - `rate(lume_http_requests_total[5m])` - Request rate
     - `histogram_quantile(0.95, lume_http_request_duration_seconds_bucket)` - P95 latency
     - `lume_errors_total` - Error count

3. **Explore Existing Dashboards**
   - Dashboards folder contains pre-configured dashboards
   - Use templates for common patterns

#### Common Grafana Queries

```promql
# HTTP Request Rate (requests per second)
rate(lume_http_requests_total[5m])

# Error Rate (errors per second)
rate(lume_errors_total[5m])

# P95 Latency (95th percentile in seconds)
histogram_quantile(0.95, lume_http_request_duration_seconds_bucket)

# Active Database Connections
lume_db_connections_active

# Cache Hit Rate
rate(lume_cache_hits_total[5m]) / (rate(lume_cache_hits_total[5m]) + rate(lume_cache_misses_total[5m]))

# HTTP Requests by Status
rate(lume_http_requests_total{job="lume-backend"}[5m])
```

### Prometheus - Raw Metrics

#### Access Prometheus

```
http://localhost:9090
```

#### Query Examples

```bash
# Click "Graph" tab to see metrics
# Try these queries:

# 1. All available metrics
{job="lume-backend"}

# 2. HTTP requests total
lume_http_requests_total

# 3. Request duration
lume_http_request_duration_seconds

# 4. Error rate by status
lume_http_requests_total{status=~"5.."}

# 5. Database queries
lume_db_queries_total
```

#### View Alert Rules

```
http://localhost:9090/alerts
```

Alerts can be triggered by:
- High error rate (>5% for 5 minutes)
- High latency (p95 > 1000ms)
- Service down (no metrics for 2 minutes)
- Database pool exhaustion

### Jaeger - Distributed Tracing

#### Access Jaeger UI

```
http://localhost:16686
```

#### Trace a Request

1. **Select Service**
   - Dropdown at top left
   - Select "lume-backend"

2. **Filter Traces**
   - Operation: select an endpoint (e.g., "GET /api/users")
   - Tags: filter by user_id, status, duration, etc.
   - Click "Find Traces"

3. **Examine Trace Details**
   - Click on a trace to expand
   - View span timeline (shows where time is spent)
   - See database queries, cache hits, external calls
   - Check logs associated with trace

#### Trace Examples

```
- GET /api/users (main request)
  ├── Database query: SELECT * FROM users
  ├── Cache check: Redis get user_ids
  └── Response serialization
```

Each operation shows:
- Duration (total time)
- Status (success/error)
- Tags (metadata about the operation)
- Logs (detailed events)

#### Query Traces

```bash
# API endpoint to query traces
curl 'http://localhost:16686/api/traces?service=lume-backend&operation=GET%20/api/users'
```

### Kibana - Log Search & Analysis

#### Access Kibana

```
http://localhost:5601
```

#### Create Index Pattern

1. **Management → Stack Management → Index Patterns**
2. **Create Index Pattern**
   - Name: `logs-*`
   - Timestamp: `@timestamp`
   - Click "Create Index Pattern"

3. **Discover**
   - Select the index pattern
   - View all logs
   - Filter, search, and analyze

#### Log Query Examples

```
# Search by level
level: "error"

# Search by service
service: "backend"

# Search by user
user_id: "123"

# Search by duration
duration_ms > 1000

# Search by status code
status_code: 500

# Boolean queries
(level: "error" AND status_code: "500") OR (duration_ms > 5000)
```

#### Create Log Dashboard

1. **Dashboards → Create Dashboard**
2. **Add Panel → Visualize**
3. **Select Index Pattern → Logs**
4. Create visualizations for:
   - Error rate over time
   - Top error types
   - Request count by endpoint
   - Slowest requests

### Loki - Alternative Log Aggregation

#### Access Loki Explore in Grafana

1. **Grafana → Explore**
2. **Select "Loki" data source**
3. **Query logs using LogQL**

#### LogQL Query Examples

```logql
# All logs from backend
{job="lume-backend"}

# Error logs only
{level="error"}

# Logs from specific service
{service="backend", environment="development"}

# Logs matching pattern
{job="lume-backend"} |= "error"

# Count logs
count({job="lume-backend"})

# Average response time
{job="lume-backend"} | json | status="200" | __error__=""
| unwrap duration_ms | avg
```

---

## Common Tasks

### Task 1: Monitor a Specific Request

```bash
# 1. Start the stack
./scripts/start-observability.sh start

# 2. Make a request (note the trace ID from headers)
curl -v http://localhost:3000/api/users/123

# 3. Find trace in Jaeger
# - Go to http://localhost:16686
# - Search for trace ID from response header
# - Examine span timeline

# 4. Check logs in Kibana
# - Go to http://localhost:5601
# - Filter by trace ID
# - See all log entries for this request
```

### Task 2: Debug Performance Issues

```bash
# 1. Identify slow requests in Grafana
# - Dashboard → Create → Panel
# - Query: histogram_quantile(0.95, lume_http_request_duration_seconds_bucket)
# - Find endpoints with high latency

# 2. Drill down into traces
# - Go to Jaeger
# - Filter by operation (slow endpoint)
# - Filter by duration > 1000ms
# - Examine spans to find bottleneck

# 3. Check database performance
# - In Jaeger, look for database query spans
# - Check query duration
# - Compare with expected execution time

# 4. View database logs
# - In Kibana, filter by operation: "query"
# - Check slow_query_log for details
```

### Task 3: Find and Analyze Errors

```bash
# 1. Check error rate in Prometheus
curl 'http://localhost:9090/api/v1/query?query=rate(lume_errors_total[5m])'

# 2. View error details in Kibana
# - Filter: level: "error"
# - Sort by timestamp (newest first)
# - Examine error message and stack trace

# 3. See error in Jaeger
# - Service: lume-backend
# - Tags: status: "ERROR"
# - Click on trace to see detailed error

# 4. Check AlertManager
# - http://localhost:9093
# - View firing alerts related to errors
```

### Task 4: Monitor Database Performance

```bash
# 1. Create dashboard in Grafana
# - Data source: Prometheus
# - Metrics:
#   - lume_db_queries_total
#   - lume_db_query_duration_seconds
#   - lume_db_connections_active

# 2. Set up alerts in Prometheus
# - Rules configured in docker/prometheus/alert-rules.yml
# - Alerts trigger on:
#   - Slow queries (> 500ms)
#   - High connection count (> 80%)
#   - Query errors

# 3. Connect directly to MySQL
mysql -h localhost -u lume_dev -p
# SHOW PROCESSLIST;  # Active queries
# SHOW STATUS;       # Performance metrics
```

### Task 5: Test Alerts

```bash
# 1. Manually trigger an alert
curl -XPOST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "critical",
      "service": "backend"
    },
    "annotations": {
      "summary": "Test alert fired",
      "description": "Testing alert notification delivery"
    }
  }]'

# 2. Check AlertManager received it
# - http://localhost:9093
# - Should show firing alert

# 3. Configure notification channel
# - Edit docker/prometheus/alertmanager.yml
# - Uncomment Slack/Email/PagerDuty section
# - Add your webhook URL/credentials
# - Restart: docker-compose restart alertmanager

# 4. Trigger real alert
# - Make requests causing > 5% error rate
# - Wait 5 minutes (evaluation interval)
# - Check AlertManager for HighErrorRate alert
```

---

## Troubleshooting

### Services Not Starting

**Problem**: Containers fail to start or exit immediately

```bash
# 1. Check logs
./scripts/start-observability.sh logs

# 2. Check for port conflicts
lsof -i :3000   # Check if port 3000 is in use
lsof -i :9090   # Check if port 9090 is in use
lsof -i :3100   # etc.

# 3. Free up ports if needed
# - Stop other services on those ports
# - Or configure different ports in docker-compose.yml

# 4. Check Docker resources
docker system df  # Check disk usage
docker system prune  # Clean up unused images/volumes

# 5. Reset and try again
./scripts/start-observability.sh reset
```

### Metrics Not Appearing in Prometheus

**Problem**: Prometheus shows no targets or red indicators

```bash
# 1. Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# 2. Verify backend is exposing /metrics
curl http://localhost:3000/metrics

# 3. Check Prometheus configuration
# - docker/prometheus/prometheus.local.yml
# - Ensure lume-backend target is correct
# - Default: localhost:3000

# 4. Verify backend is running
curl http://localhost:3000/api/base/health

# 5. Restart Prometheus
docker-compose -f docker-compose.observability.yml restart prometheus

# 6. Check Prometheus logs
./scripts/start-observability.sh logs prometheus
```

### Logs Not Appearing in Kibana

**Problem**: No data in Kibana, index pattern red X

```bash
# 1. Check Elasticsearch is healthy
curl http://localhost:9200/_cluster/health

# 2. Check indices exist
curl http://localhost:9200/_cat/indices

# 3. Send test data
curl -X POST http://localhost:9200/logs-test/_doc \
  -H 'Content-Type: application/json' \
  -d '{"message":"test","timestamp":"'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'","level":"info"}'

# 4. Refresh index pattern in Kibana
# - Management → Index Patterns → Select logs-*
# - Click refresh icon (circular arrow)
# - Or delete and recreate with correct timestamp field

# 5. Check backend is sending logs
# - Configure LOG_LEVEL=debug in .env.local
# - Restart backend
# - Make a test request
# - Check logs/lume-*.log file

# 6. If still no data, manually index logs
# - Edit docker-compose.observability.yml
# - Add filebeat service to ship logs to Elasticsearch
# - Or use Logstash to ingest logs
```

### Traces Not Appearing in Jaeger

**Problem**: No services or traces in Jaeger UI

```bash
# 1. Verify backend exports traces
curl http://localhost:3000/metrics | grep trace

# 2. Check OpenTelemetry is enabled
# - OTEL_ENABLED=true in .env.local
# - OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# 3. Verify OTEL Collector is running and healthy
docker ps | grep otel
curl http://localhost:13133/  # Health check

# 4. Generate test traces
# - Make API requests: curl http://localhost:3000/api/users

# 5. Wait for traces to be indexed
# - Jaeger may take 30 seconds to show traces
# - Refresh page in browser

# 6. Check OTEL Collector logs
./scripts/start-observability.sh logs otel-collector

# 7. Verify Jaeger collector is receiving data
curl http://localhost:14268/api/traces

# 8. Check backend OpenTelemetry config
# - src/core/tracing/tracing.config.js
# - Ensure exporter is configured correctly
```

### High CPU/Memory Usage

**Problem**: Docker containers consuming excessive resources

```bash
# 1. Check resource usage
docker stats

# 2. Identify heavy containers
# - Elasticsearch is memory-intensive (default 512MB heap)
# - Prometheus stores metrics (grows over time)

# 3. Reduce resource consumption

# For Elasticsearch:
# - Edit docker-compose.observability.yml
# - Change ES_JAVA_OPTS to smaller values
# - Example: -Xms256m -Xmx256m

# For Prometheus:
# - Reduce scrape frequency
# - Edit docker/prometheus/prometheus.local.yml
# - Change scrape_interval: 30s

# 4. Clean up old data
./scripts/start-observability.sh reset  # Remove all volumes
docker system prune -a  # Remove unused images

# 5. Monitor specific container
docker stats lume-prometheus  # Watch one container
```

### Grafana Not Accessible

**Problem**: Cannot reach Grafana dashboard

```bash
# 1. Check Grafana container is running
docker ps | grep grafana

# 2. Check port 3000 is not in use by another service
lsof -i :3000

# 3. Check Grafana logs
./scripts/start-observability.sh logs grafana

# 4. Restart Grafana
docker-compose -f docker-compose.observability.yml restart grafana

# 5. Check if it needs time to start
sleep 30  # Wait 30 seconds
curl http://localhost:3000

# 6. Reset Grafana (loses dashboards)
docker-compose -f docker-compose.observability.yml down
docker volume rm lume_observability_grafana_data
./scripts/start-observability.sh start
```

### Database Connection Errors

**Problem**: Backend cannot connect to MySQL

```bash
# 1. Check MySQL is running
docker ps | grep mysql

# 2. Verify connection parameters
grep DATABASE_URL .env.local

# 3. Test connection directly
mysql -h localhost -P 3306 -u lume_dev -p
# Password: lume123

# 4. Check MySQL logs
./scripts/start-observability.sh logs mysql

# 5. Check network connectivity
docker exec lume-mysql-observability ping -c 3 localhost

# 6. Restart MySQL
docker-compose -f docker-compose.observability.yml restart mysql

# 7. Reinitialize database
# - docker exec lume-mysql-observability mysql -u root -p -e "CREATE DATABASE lume_dev;"
# - Run migrations
```

---

## Advanced Configuration

### Customize Service Ports

Edit `docker-compose.observability.yml`:

```yaml
services:
  prometheus:
    ports:
      - "9099:9090"  # Map 9099 on host to 9090 in container
```

Then update `.env.local`:

```env
PROMETHEUS_URL=http://localhost:9099
```

### Enable Email Alerts

Edit `docker/prometheus/alertmanager.yml`:

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'your-email@example.com'
        from: 'alertmanager@lume.dev'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

### Enable Slack Notifications

1. Create Slack webhook: https://api.slack.com/apps
2. Edit `docker/prometheus/alertmanager.yml`:

```yaml
global:
  slack_api_url: 'YOUR_WEBHOOK_URL'

receivers:
  - name: 'slack'
    slack_configs:
      - channel: '#monitoring'
```

3. Restart AlertManager:

```bash
docker-compose -f docker-compose.observability.yml restart alertmanager
```

### Connect to PagerDuty

Edit `docker/prometheus/alertmanager.yml`:

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        client: 'Lume Alert Manager'
```

### Store Metrics Long-Term

Enable remote storage in `docker/prometheus/prometheus.local.yml`:

```yaml
remote_write:
  - url: "http://remote-prometheus:9009/api/prom/push"
    queue_config:
      capacity: 10000
      max_shards: 100
```

### Add Custom Grafana Dashboards

1. Create dashboard in Grafana UI
2. Export JSON: Dashboard menu → Export
3. Save to `docker/grafana/dashboards/custom-dashboard.json`
4. Restart Grafana: `docker-compose restart grafana`

---

## Summary

You now have a complete local development environment with:

- ✅ Metrics collection and visualization (Prometheus + Grafana)
- ✅ Distributed tracing (Jaeger)
- ✅ Log aggregation (ELK + Loki)
- ✅ Alert management (AlertManager)
- ✅ Database and cache monitoring
- ✅ One-command startup/shutdown

For detailed technical information, see:
- [`docs/observability/OBSERVABILITY_ARCHITECTURE.md`](observability/OBSERVABILITY_ARCHITECTURE.md)
- [`docs/observability/METRICS_INTERPRETATION.md`](observability/METRICS_INTERPRETATION.md)
- [`docs/observability/TRACE_DEBUGGING_GUIDE.md`](observability/TRACE_DEBUGGING_GUIDE.md)
- [`docs/observability/LOGS_ANALYSIS_GUIDE.md`](observability/LOGS_ANALYSIS_GUIDE.md)
- [`docs/observability/TROUBLESHOOTING.md`](observability/TROUBLESHOOTING.md)

---

**Last Updated**: 2026-04-30
**Version**: 2.0.0
