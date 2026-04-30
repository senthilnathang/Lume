# Incident Runbook: High Error Rate

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | High Error Rate |
| **Alert Condition** | Error rate > 5% for 5 minutes |
| **Severity** | CRITICAL (P1) |
| **Response SLA** | 5 minutes |
| **Escalation** | +2 min: page backup, +5 min: page team lead |

---

## Immediate Actions (0-5 min)

### Step 1: Acknowledge Alert (30 seconds)

```bash
# In PagerDuty:
1. Click the incident link
2. Click "Acknowledge"
3. Select reason: "Looking into it"
4. Click "Acknowledge"
```

**Why:** Prevents escalation, signals investigation in progress

### Step 2: Gather Initial Information (1-2 min)

**Open monitoring dashboard:**

1. **Grafana Dashboard** (http://localhost:3000/grafana or https://grafana.lume.dev)
   - Navigate to: Dashboards → HTTP Metrics
   - Look at "Error Rate" panel
   - Check: Current value, trend, which endpoints

2. **Alert Details in PagerDuty:**
   - Note exact time alert fired
   - Check alert threshold (should be 5%)
   - See current metric value

**Command-line check:**
```bash
# Get current error rate
curl 'http://localhost:9090/api/v1/query?query=lume_error_rate_percentage'

# Get errors by status code
curl 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=rate(lume_http_requests_total{status_group="5xx"}[1m]) by (status)'
```

### Step 3: Identify Affected Endpoints (1-2 min)

**In Grafana:**
1. Open "HTTP Requests by Endpoint" panel
2. Filter by status: 5xx
3. Look for which endpoints are returning errors
4. Note pattern:
   - All endpoints? (systemic issue)
   - Specific endpoint? (targeted issue)
   - Multiple related? (service/database issue)

**Or in Prometheus:**
```promql
# Top 5 failing endpoints
topk(5, rate(lume_http_requests_total{status_group="5xx"}[1m]) by (path))

# Request rate by endpoint
rate(lume_http_requests_total[1m]) by (path)
```

**Example patterns:**
```
ALL endpoints returning 500   → Database down or app crash
/api/users failing, others OK → User service issue
/api/* 5xx, /health 200      → Middleware or routing issue
```

### Step 4: Check Recent Changes (1 min)

```bash
# Recent deployments
docker ps --format "table {{.Names}}\t{{.CreatedAt}}"

# Recent git commits
git log --oneline -5
# Check if any deployment in last 10 minutes?

# Process restart times
ps aux | grep node | grep -v grep | awk '{print $9, $10, $11}'
```

**Quick assessment:**
- ✅ Deployed in last 10 minutes? → Likely cause
- ✅ Process restarted in last 10 minutes? → Likely cause
- ✅ No recent changes? → External issue (database, external service)

---

## Investigation & Diagnosis (5-15 min)

### Path 1: Application Error (Check if it's the app)

**Get error details from logs:**

```bash
# Option A: Kibana (recommended)
1. Open Kibana: https://kibana.lume.dev
2. Discover → lume-logs-*
3. Filter: level:error AND timestamp >= "2026-04-30T10:00:00Z"
4. Look at error messages
5. Check: Are all errors same type? Different? 

# Option B: Command line
tail -200 logs/error.log | jq '.' | head -30

# Look for patterns:
# - "Connection timeout" → Database issue
# - "Cannot find module" → Missing dependency
# - "ReferenceError" → Code bug
# - "EACCES" → Permission issue
```

**Check application process:**
```bash
# Is application running?
ps aux | grep "node.*index\|node.*main" | grep -v grep

# Is it using excessive memory?
top -b -n 1 | grep node | awk '{print $4, $5, $6, $10, $11, $12}'
# Columns: %CPU, %MEM, VIRT, COMMAND

# Is it accepting connections?
curl -v http://localhost:3000/health
# Should return 200 OK quickly
```

**Action if application issue:**
- Check logs for error message
- Follow TROUBLESHOOTING.md for specific error
- Possibly rollback recent deployment

---

### Path 2: Database Issue (Check database health)

**Connect to database:**

```bash
# Check if database is running
mysql -u gawdesy -p gawdesy -e "SELECT 1;"
# Should return: 1

# Check active connections
mysql -u gawdesy -p gawdesy -e "SHOW STATUS LIKE 'Threads%';"
# Output example:
# Threads_connected    42
# Threads_created      1234
# Threads_running      5

# Check processlist for long-running queries
mysql -u gawdesy -p gawdesy -e "SHOW PROCESSLIST \G" | head -50
# Look for:
# - Queries running for > 60 seconds
# - "Locked" queries
# - Large number of queries

# Check database size
mysql -u gawdesy -p gawdesy -e "SELECT table_schema, ROUND(SUM(data_length) / 1024 / 1024) AS size_mb FROM information_schema.tables GROUP BY table_schema;"
```

**Check metrics:**
```promql
# Active connections
lume_db_connections_active

# Query duration
histogram_quantile(0.95, rate(lume_db_query_duration_seconds_bucket[1m]))

# Slow queries
rate(lume_db_query_duration_seconds{quantile="0.99"}[1m])
```

**Action if database issue:**
- If connections > 50: Kill long-running queries or restart database
- If queries slow: Check for missing indices, run ANALYZE
- If database down: Restart MySQL service

---

### Path 3: External Service Issue (Check dependencies)

**Check external service health:**

```bash
# Check if external services are responding
# Email service:
curl -v https://smtp.sendgrid.com:587 2>&1 | grep -i "connected\|refused\|timeout"

# Payment service:
curl -v https://api.stripe.com/ 2>&1 | grep -i "connected\|refused\|timeout"

# Any external APIs in use:
grep -r "fetch\|axios\|http.request" src/modules --include="*.js" | head -10
# Check those URLs
```

**Check logs for external service errors:**
```bash
# Kibana search:
level:error AND (message:*timeout* OR message:*ECONNREFUSED* OR message:*gateway*)

# Command line:
grep -i "timeout\|econnrefused\|gateway" logs/error.log | head -20
```

**Action if external service issue:**
- Check service status page
- Add circuit breaker to handle timeouts
- Fall back to cached data or graceful degradation
- Notify external service provider

---

### Path 4: Misconfiguration (Check config)

**Review critical configuration:**

```bash
# Database connection string
echo $DATABASE_URL

# Redis connection
echo $REDIS_URL

# API keys and secrets
grep -r "process.env\." src/config --include="*.js" | head -10

# Check environment variables
env | grep -i "host\|url\|port\|api\|key" | sort
```

**Common configuration issues:**
- Wrong hostname (localhost vs 0.0.0.0)
- Wrong database name
- Missing authentication credentials
- Wrong port number

---

## Mitigation (5-30 min)

### Option 1: Rollback Recent Deployment (fastest)

If deployed in last 10 minutes:

```bash
# Option A: Revert Docker image
docker-compose down
docker pull lume-backend:previous-tag
docker-compose up -d lume-backend
docker-compose logs -f lume-backend

# Option B: Git rollback
git log --oneline -5
git revert <commit-sha>
npm run build
npm start

# Option C: PM2 rollback
pm2 start ecosystem.config.js  # or pm2 restart lume-backend
```

**Verify fix:**
```bash
# Wait 30 seconds for startup
sleep 30

# Check error rate
curl 'http://localhost:9090/api/v1/query?query=lume_error_rate_percentage'
# Should be < 1%

# Check application health
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

---

### Option 2: Kill Long-Running Queries

If database is bottleneck:

```bash
# Find long-running queries
mysql -u gawdesy -p gawdesy -e "SELECT id, time, state, info FROM information_schema.PROCESSLIST WHERE time > 60 ORDER BY time DESC;"

# Kill specific query (replace ID with actual ID)
mysql -u gawdesy -p gawdesy -e "KILL QUERY 123;"

# Or kill entire connection
mysql -u gawdesy -p gawdesy -e "KILL CONNECTION 123;"

# Kill all non-system queries
mysql -u gawdesy -p gawdesy -e "SELECT CONCAT('KILL ', id, ';') FROM information_schema.PROCESSLIST WHERE user != 'system user' AND time > 60;" | mysql -u gawdesy -p gawdesy
```

---

### Option 3: Scale Up Resources

If under heavy load:

```bash
# Increase application instances (Docker Compose)
docker-compose up -d --scale lume-backend=3 lume-backend

# Or if using Kubernetes
kubectl scale deployment lume-backend --replicas=3

# Verify
docker-compose ps | grep lume-backend
# Should show 3 instances
```

**Load balance setup:**
```nginx
# nginx.conf
upstream lume_backend {
  server localhost:3000;
  server localhost:3001;
  server localhost:3002;
}

server {
  listen 80;
  location / {
    proxy_pass http://lume_backend;
  }
}
```

---

### Option 4: Enable Circuit Breaker

If external service failing:

```javascript
// src/core/circuit-breaker.js
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(async (url) => {
  return await fetch(url);
}, {
  timeout: 3000,           // 3 second timeout
  errorThresholdPercentage: 50,  // Open after 50% errors
  resetTimeout: 30000      // Try again after 30 seconds
});

export async function fetchWithCircuitBreaker(url) {
  try {
    return await breaker.fire(url);
  } catch (error) {
    logger.error('Circuit breaker open', { url, error: error.message });
    // Return cached data or fallback response
    return getCachedData(url);
  }
}
```

Enable:
```javascript
// In route handler
const result = await fetchWithCircuitBreaker(externalApiUrl);
```

---

### Option 5: Graceful Degradation

If can't fix immediately:

```javascript
// In request handler
try {
  const userData = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  return res.json({ success: true, data: userData });
} catch (error) {
  // Instead of returning 500, return 200 with cached data
  const cachedData = cache.get(`user:${userId}`);
  if (cachedData) {
    return res.json({ 
      success: true, 
      data: cachedData,
      note: 'Using cached data (database unavailable)'
    });
  }
  
  // Only return error if no cache available
  return res.status(503).json({ error: 'Database unavailable' });
}
```

---

## Verification & Recovery (30+ min)

### Verify Issue is Resolved

```bash
# 1. Check error rate is back to normal
curl 'http://localhost:9090/api/v1/query?query=lume_error_rate_percentage'
# Should be < 1%

# 2. Check all endpoints returning 2xx/3xx
curl 'http://localhost:9090/api/v1/query?query=rate(lume_http_requests_total{status_group="5xx"}[1m])'
# Should be close to 0

# 3. Check application health
curl http://localhost:3000/health
# Should return {"status":"ok"}

# 4. Smoke test critical endpoints
curl http://localhost:3000/api/users
curl http://localhost:3000/api/auth/login
curl http://localhost:3000/api/products

# 5. Check database
mysql -u gawdesy -p gawdesy -e "SELECT COUNT(*) FROM users;"
# Should return valid number
```

### In PagerDuty

1. Once metrics show resolution:
   - Alert auto-resolves (if metric stays below threshold)
   - Or manually click "Resolve" in incident

2. Add incident summary:
```
Title: High Error Rate - Database Connection Exhaustion
Severity: CRITICAL
Duration: 8:15 AM - 8:27 AM UTC (12 minutes)
Impact: ~3,000 failed requests

Root Cause:
  New feature deployed (v2.3.5) that didn't properly close database connections
  Led to connection pool exhaustion after ~30 requests
  Once pool exhausted, all subsequent requests failed

Resolution:
  1. Identified N+1 query pattern in user service
  2. Rolled back to v2.3.4
  3. Application restarted, connections normalized

Prevention:
  1. Added database connection leak test to CI pipeline
  2. Set alert for active connection count > 50
  3. Code review checklist updated to watch for connection management
```

---

## Post-Incident Tasks (within 24 hours)

### 1. Root Cause Analysis

```markdown
# Root Cause Analysis

## Timeline
- 8:15 AM: Error rate alert fired (5.2%)
- 8:16 AM: Engineer alerted
- 8:18 AM: Identified database connection exhaustion
- 8:20 AM: Started rollback
- 8:27 AM: Service recovered

## Root Cause
N+1 database query in new user listing feature (v2.3.5)
- Each user fetch queried database for team info separately
- With 100 users, 100+ database connections created
- Connection pool size: 50, so queries failed after pool exhausted

## Why It Wasn't Caught
- New feature didn't have performance tests
- Code review focused on business logic, not database access patterns
- No pre-production load testing

## Contributing Factors
- Metrics didn't alert on connection count (added now)
- No circuit breaker for database operations
- Feature deployed during peak traffic hours
```

### 2. Implement Preventions

```javascript
// 1. Add connection pool monitoring
export const monitorConnectionPool = () => {
  setInterval(async () => {
    const connections = await db.query("SHOW STATUS LIKE 'Threads_connected'");
    recordMetric('db.connections.active', connections[0].Value);
    
    // Alert if > 40
    if (connections[0].Value > 40) {
      logger.warn('Connection pool approaching limit', { connections: connections[0].Value });
    }
  }, 30000);  // Every 30 seconds
};

// 2. Add batch query pattern
export const getUsersWithTeams = async (userIds) => {
  // BEFORE (N+1):
  // for (const id of userIds) {
  //   user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  //   user.team = await db.query('SELECT * FROM teams WHERE id = ?', [user.team_id]);
  // }

  // AFTER (JOIN):
  const users = await db.query(`
    SELECT u.*, t.* 
    FROM users u 
    JOIN teams t ON u.team_id = t.id 
    WHERE u.id IN (?)
  `, [userIds]);
  
  return users;
};

// 3. Add query metrics
export const withQueryMetrics = async (sql, params, label) => {
  const start = Date.now();
  try {
    const result = await db.query(sql, params);
    recordMetric('db.query.duration', Date.now() - start, { label, status: 'success' });
    return result;
  } catch (error) {
    recordMetric('db.query.duration', Date.now() - start, { label, status: 'error' });
    throw error;
  }
};
```

### 3. Update Alert Rules

Add in Prometheus:
```yaml
- alert: DatabaseConnectionPoolNearing
  expr: lume_db_connections_active > 40
  for: 1m
  severity: warning
  annotations:
    description: "Database connections: {{ $value }}/50"

- alert: SlowDatabaseQueries
  expr: histogram_quantile(0.95, rate(lume_db_query_duration_seconds_bucket[1m])) > 0.5
  for: 2m
  severity: warning
  annotations:
    description: "p95 query time: {{ $value }}s"
```

### 4. Update Code Review Checklist

Add to code-review.md:
```markdown
## Database Query Review
- [ ] Check for N+1 query patterns
- [ ] All queries have indices on WHERE clauses
- [ ] Batch operations where possible (JOIN instead of loop)
- [ ] Connection pooling is released properly
- [ ] Large result sets are paginated
```

### 5. Schedule Load Testing

```bash
# Before next release
# 1000 concurrent users, 1 hour duration
artillery run load-test.yml

# Check metrics:
# - Error rate stays < 1%
# - p95 latency < 500ms
# - Database connections < 40
```

---

## Escalation Contact List

```
On-Call Engineer:    ${ON_CALL_ENGINEER}
Backup Engineer:     ${BACKUP_ENGINEER}
Team Lead:           ${TEAM_LEAD}
Director/Manager:    ${DIRECTOR}
VP Engineering:      ${VP_ENGINEERING}
```

---

## Related Documents

- **LOGS_ANALYSIS_GUIDE.md**: How to analyze error logs
- **TRACE_DEBUGGING_GUIDE.md**: How to debug with traces
- **METRICS_INTERPRETATION.md**: Understanding metrics
- **TROUBLESHOOTING.md**: Detailed troubleshooting steps
