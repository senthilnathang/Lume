# Lume Observability - Quick Reference Card

**Print this or keep it handy!**

---

## 🚀 Quick Start (3 Steps)

```bash
# 1. Start observability stack
./scripts/start-observability.sh start

# 2. Start backend (in another terminal)
npm run dev

# 3. Open dashboards in browser
# See service URLs below
```

---

## 📊 Service URLs & Credentials

| Service | URL | User | Pass | Port |
|---------|-----|------|------|------|
| **Grafana** | http://localhost:3000 | admin | admin | 3000 |
| **Prometheus** | http://localhost:9090 | - | - | 9090 |
| **Jaeger** | http://localhost:16686 | - | - | 16686 |
| **Kibana** | http://localhost:5601 | - | - | 5601 |
| **AlertManager** | http://localhost:9093 | - | - | 9093 |
| **Loki** | http://localhost:3100 | - | - | 3100 |
| **MySQL** | localhost:3306 | lume_dev | lume123 | 3306 |
| **Redis** | localhost:6379 | (pass) | redis123 | 6379 |

---

## 🔧 Common Commands

### Stack Management

```bash
# Start stack
./scripts/start-observability.sh start

# Stop stack
./scripts/start-observability.sh stop

# Restart (stop + start)
./scripts/start-observability.sh stop && ./scripts/start-observability.sh start

# View logs
./scripts/start-observability.sh logs

# View specific service logs
./scripts/start-observability.sh logs prometheus
./scripts/start-observability.sh logs grafana
./scripts/start-observability.sh logs jaeger

# Check status
./scripts/start-observability.sh status

# Full reset (removes all data)
./scripts/start-observability.sh reset
```

### Backend

```bash
# Start backend (requires Node.js)
npm run dev

# Test health
curl http://localhost:3000/api/base/health

# Get metrics
curl http://localhost:3000/metrics

# Make API call
curl http://localhost:3000/api/users
```

### Database

```bash
# Connect to MySQL
mysql -h localhost -u lume_dev -p
# Password: lume123

# Connect to Redis
redis-cli -p 6379 -a redis123
```

---

## 📈 Prometheus Queries

Copy-paste ready!

```promql
# Request Rate (requests/second)
rate(lume_http_requests_total[5m])

# Error Rate (%)
(rate(lume_errors_total[5m]) / rate(lume_http_requests_total[5m])) * 100

# P95 Latency (seconds)
histogram_quantile(0.95, lume_http_request_duration_seconds_bucket)

# Database Connections
lume_db_connections_active

# Cache Hit Rate (%)
(rate(lume_cache_hits_total[5m]) / (rate(lume_cache_hits_total[5m]) + rate(lume_cache_misses_total[5m]))) * 100

# Total Errors
lume_errors_total

# Database Queries
rate(lume_db_queries_total[5m])
```

---

## 🔍 How to Find Things

### "I want to see request traces"
1. Open http://localhost:16686 (Jaeger)
2. Select "lume-backend" from dropdown
3. Click "Find Traces"
4. Click a trace to see span details

### "I want to search logs"
1. Open http://localhost:5601 (Kibana)
2. Click "Discover"
3. Search by field:
   - `level: "error"` - only errors
   - `status_code: 500` - HTTP 500s
   - `duration_ms > 1000` - slow requests

### "I want to see metrics graphs"
1. Open http://localhost:3000 (Grafana)
2. Click "Explore" (compass icon)
3. Select "Prometheus" datasource
4. Paste query from above
5. Click blue "Run Query" button

### "I want to test alerts"
1. Open http://localhost:9093 (AlertManager)
2. Manually trigger test alert:

```bash
curl -XPOST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "critical"
    },
    "annotations": {
      "summary": "Test"
    }
  }]'
```

---

## ⚠️ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| "Port 3000 in use" | `lsof -i :3000` to find what's using it, then kill or use different port |
| Services not starting | `./scripts/start-observability.sh logs` to see why |
| No metrics in Prometheus | `curl http://localhost:3000/metrics` - backend must be running |
| No logs in Kibana | Create index pattern `logs-*` in Kibana UI |
| No traces in Jaeger | Make requests to backend, wait 30s for traces to appear |
| High CPU usage | Edit docker-compose.observability.yml and reduce container resources |
| Can't connect to MySQL | `mysql -h localhost -u lume_dev -p` and check password is `lume123` |
| Docker daemon not running | Start Docker Desktop |

---

## 📝 Grafana Dashboard Quick Tips

### Create a Panel
1. Dashboard → Edit (pencil icon)
2. Add Panel → Prometheus
3. Paste query from above
4. Customize: Title, legend, colors
5. Save Dashboard

### Common Dashboard Queries

**Request Rate Chart**
```promql
rate(lume_http_requests_total[5m])
```

**Error Rate Gauge**
```promql
(rate(lume_errors_total[5m]) / rate(lume_http_requests_total[5m])) * 100
```

**Response Time Heatmap**
```promql
lume_http_request_duration_seconds_bucket
```

---

## 🎯 Workflow Examples

### Monitor a User's Session
1. Get user ID from logs: `user_id: 123`
2. Search in Kibana: `user_id: 123`
3. Click trace ID
4. View in Jaeger to see all requests
5. Check Grafana for performance during that time

### Debug a Slow Request
1. Find slow request in Prometheus:
   ```promql
   lume_http_request_duration_seconds_bucket{le="2"} > 1
   ```
2. Find request in Jaeger
3. Look for slowest spans
4. Check database queries in trace
5. Correlate with logs for more context

### Find Root Cause of Errors
1. Check error rate: `rate(lume_errors_total[5m])`
2. Search logs in Kibana: `level: "error"`
3. Find error type and time
4. View request trace in Jaeger from same time
5. Check database performance metrics

---

## 🔐 Security Notes (Local Dev Only)

⚠️ **Default credentials are ONLY for local development**
- Change all passwords in .env.local for production
- Never commit .env.local to git
- Use secret management system in production
- Disable authentication for services you only need locally

---

## 📚 More Information

```
Full setup guide:        docs/LOCAL_DEVELOPMENT.md
Architecture details:    docs/observability/OBSERVABILITY_ARCHITECTURE.md
Metric explanations:     docs/observability/METRICS_INTERPRETATION.md
Trace debugging guide:   docs/observability/TRACE_DEBUGGING_GUIDE.md
Log analysis guide:      docs/observability/LOGS_ANALYSIS_GUIDE.md
Troubleshooting:         docs/observability/TROUBLESHOOTING.md
Alert responses:         docs/observability/ALERTS_RESPONSE.md
```

---

## 💾 Useful Snippets

### Check all metrics names
```bash
curl http://localhost:9090/api/v1/label/__name__/values | jq '.data[] | select(startswith("lume"))'
```

### Count logs by level
```
In Kibana Discover, use:
field: level
Then click a level to filter
```

### Export dashboard JSON from Grafana
```
Dashboard menu → Export
Save JSON file
Share with team
```

### View backend metrics in raw format
```bash
curl http://localhost:3000/metrics | grep lume_http
```

### Test database connection
```bash
mysql -h localhost -u lume_dev -p -e "SELECT 1;"
# Password: lume123
```

---

**Last Updated**: 2026-04-30  
**Version**: 2.0.0  
**Next Step**: `./scripts/start-observability.sh start`
