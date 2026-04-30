# Incident Runbook: High Latency

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | High Latency (p95 > 1000ms) |
| **Alert Condition** | 95th percentile latency > 1000ms for 5 minutes |
| **Severity** | HIGH (P2) |
| **Response SLA** | 15 minutes |
| **Escalation** | +15 min: page team lead |

---

## Immediate Actions (0-5 min)

### Step 1: Acknowledge Alert (30 seconds)

```bash
# In PagerDuty:
1. Click the incident link
2. Click "Acknowledge"
3. Click "Acknowledge"
```

### Step 2: Verify Latency Issue (1-2 min)

**Grafana Dashboard (Latency):**
1. Open: Dashboards → HTTP Metrics
2. Find: "p95 Latency" panel
3. Check current value (should be > 1000ms)
4. Look at trend: Spike or sustained?

**Command-line verification:**
```bash
# Current p95 latency
curl 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m]))'

# Check by endpoint
curl 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) by (path)'
```

### Step 3: Identify Affected Endpoint (1-2 min)

**From Grafana panel, see which endpoint is slowest:**
```
/api/users: 1500ms  ← SLOWEST
/api/products: 800ms
/api/health: 5ms
```

**Or from Prometheus:**
```promql
# Top 5 slowest endpoints
topk(5, histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) by (path))
```

---

## Diagnosis (5-15 min)

### Step 1: Check Which Layer is Slow

**Get trace for slow request:**

1. **Open Jaeger** (http://localhost:16686)
2. **Service:** lume-backend
3. **Operation:** The slow endpoint (e.g., "GET /api/users")
4. **Min Duration:** 1000 (ms)
5. **Click on trace**

**In Jaeger, look at timeline:**
```
request (root span)
├─ middleware.auth (2 ms) ✓ Fast
├─ db.query (700 ms) ✗ SLOW!
├─ middleware.response (5 ms) ✓ Fast
└─ response.send (1 ms) ✓ Fast
```

**Conclusions from trace:**
- If database span is slowest → Database issue
- If external service span is slowest → Network/external issue
- If application code is slowest → Code/logic issue

### Step 2: Database Investigation

If database query is slow (> 500ms):

```promql
# Check p95 query time by operation
histogram_quantile(0.95, rate(lume_db_query_duration_seconds_bucket[5m])) by (operation)

# Check query rate
rate(lume_db_queries_total[1m]) by (operation)
```

**Connect to database and analyze:**

```bash
# Enable query log to find slow query
mysql -u gawdesy -p gawdesy -e "SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 0.5;"

# Run the slow query in client
mysql -u gawdesy -p gawdesy <<'EOF'
SELECT users.*, teams.* FROM users 
LEFT JOIN teams ON users.team_id = teams.id 
WHERE users.status = 'active';
EOF

# Check explain plan
EXPLAIN SELECT users.*, teams.* FROM users 
LEFT JOIN teams ON users.team_id = teams.id 
WHERE users.status = 'active' \G

# Look for:
# - type: ALL (full table scan) → Add index
# - rows: large number → Check WHERE clause
# - Using temporary; Using filesort → Add index on ORDER BY
```

**Quick fixes:**

```bash
# Missing index on WHERE clause?
mysql -u gawdesy -p gawdesy -e "CREATE INDEX idx_users_status ON users(status);"

# Check query statistics
mysql -u gawdesy -p gawdesy -e "SHOW INDEX FROM users;"

# Run ANALYZE to update statistics
mysql -u gawdesy -p gawdesy -e "ANALYZE TABLE users; ANALYZE TABLE teams;"
```

### Step 3: Application Code Investigation

If application logic is slow:

```bash
# Add debug spans to find where time is spent
# In Jaeger trace, look for which operation takes longest

# Example: Creating user is slow
handler.createUser (850 ms) ← slow
├─ validate.input (2 ms)
├─ db.insert (100 ms) ← OK
├─ email.send (700 ms) ← SLOW!
└─ response.send (1 ms)
```

**Fix: Move email to background job**

```javascript
// BEFORE (synchronous)
export async function createUser(userData) {
  const user = await db.users.create(userData);
  await emailService.send(user.email, 'Welcome!');  // ← Blocks response
  return user;
}

// AFTER (asynchronous)
export async function createUser(userData) {
  const user = await db.users.create(userData);
  // Send email asynchronously (don't await)
  emailService.send(user.email, 'Welcome!').catch(err => logger.error(err));
  return user;
}
```

### Step 4: External Service Investigation

If external service call is slow:

```bash
# Check external service response time
curl -w "Total: %{time_total}s\n" https://api.external-service.com/status

# Check DNS resolution time
nslookup api.external-service.com

# Check network latency
ping api.external-service.com
```

**Add timeout and circuit breaker:**

```javascript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(async (url) => {
  return await fetch(url, { timeout: 5000 });  // 5 second timeout
}, {
  timeout: 6000,                    // Circuit breaker timeout
  errorThresholdPercentage: 50,     // Open after 50% errors
  resetTimeout: 30000               // Try again after 30 seconds
});

export async function callExternalApi(url) {
  try {
    return await breaker.fire(url);
  } catch (error) {
    logger.error('External API call failed', { url, error });
    // Return cached data or default response
    return getCachedData(url) || getDefaultResponse();
  }
}
```

### Step 5: High Traffic Investigation

If load is high:

```promql
# Check request rate
rate(lume_http_requests_total[1m])

# Expected: ~100 req/sec under normal load
# If > 500 req/sec: Unusual spike

# Check if this is normal traffic or attack
# In Kibana: Group by IP, User-Agent, Path
```

**Check traffic sources:**

```bash
# Top IPs making requests
grep "Incoming" logs/combined.log | jq '.ip' | sort | uniq -c | sort -rn | head -20

# Top User-Agents
grep "Incoming" logs/combined.log | jq '.userAgent' | sort | uniq -c | sort -rn | head -10

# Top paths
grep "Incoming" logs/combined.log | jq '.path' | sort | uniq -c | sort -rn | head -20
```

---

## Mitigation (5-30 min)

### Option 1: Add Index to Database

**If trace shows slow database query:**

```bash
# Find the slow query in logs
grep "slow" logs/combined.log | jq '.query' | head -5

# Analyze it
mysql -u gawdesy -p gawdesy -e "EXPLAIN <query> \G"

# Create appropriate index
# If WHERE clause on 'status':
mysql -u gawdesy -p gawdesy -e "CREATE INDEX idx_users_status ON users(status);"

# If ORDER BY on 'created_at':
mysql -u gawdesy -p gawdesy -e "CREATE INDEX idx_users_created ON users(created_at DESC);"

# If JOIN condition:
mysql -u gawdesy -p gawdesy -e "CREATE INDEX idx_posts_user_id ON posts(user_id);"

# Verify index was created
mysql -u gawdesy -p gawdesy -e "SHOW INDEX FROM users \G"

# Re-run query to confirm improvement
# Time should drop from 700ms to < 100ms
```

**Before/after comparison:**

```bash
# Before index
time mysql -u gawdesy -p gawdesy -e "SELECT COUNT(*) FROM users WHERE status='active';"
# real    0m0.732s

# After index
time mysql -u gawdesy -p gawdesy -e "SELECT COUNT(*) FROM users WHERE status='active';"
# real    0m0.015s
```

---

### Option 2: Enable Caching

**If same query runs repeatedly:**

```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });  // 10 minute TTL

export async function getActiveUsers() {
  // Check cache first
  const cached = cache.get('active_users');
  if (cached) {
    return cached;
  }

  // If not cached, query database
  const users = await db.users.findMany({ where: { status: 'active' } });
  
  // Store in cache
  cache.set('active_users', users);
  
  return users;
}
```

**Verify cache is working:**

```promql
# Check cache hit rate
(rate(lume_cache_hits_total[5m]) / 
 (rate(lume_cache_hits_total[5m]) + rate(lume_cache_misses_total[5m]))) * 100

# Should increase from < 50% to > 80%
```

---

### Option 3: Query Optimization

**Example: N+1 Query Problem**

```javascript
// BEFORE (N+1 pattern)
const users = await db.users.findMany();
for (const user of users) {
  // This runs 100 separate queries for 100 users!
  user.team = await db.teams.findOne({ id: user.team_id });
}

// AFTER (JOIN)
const users = await db.raw(`
  SELECT u.*, t.* 
  FROM users u 
  LEFT JOIN teams t ON u.team_id = t.id
`);
```

**Check before/after latency:**

```promql
# Before optimization
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket{path="/api/users"}[5m]))
# Result: 800ms

# After optimization
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket{path="/api/users"}[5m]))
# Result: 50ms
```

---

### Option 4: Scale Up Resources

If database/application CPU maxed out:

```bash
# Check CPU usage
top -b -n 1 | head -15
# If node process > 90% CPU

# Check memory usage
free -h
# If available < 1GB
```

**Scale application:**

```bash
# Docker Compose: Run 3 instances
docker-compose up -d --scale lume-backend=3 lume-backend

# Load balance with nginx
docker-compose up -d nginx

# Kubernetes
kubectl scale deployment lume-backend --replicas=3
```

**Scale database:**

```bash
# Add read replica
# Or increase resource limits
docker update --cpus=4 --memory=8g mysql
docker restart mysql
```

---

### Option 5: Temporarily Reduce Load

If legitimate traffic spike:

```bash
# Rate limiting
npm install express-rate-limit

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100                   // 100 requests per minute
});

app.use('/api/', limiter);
```

Or disable non-critical features:

```bash
# Feature flag for expensive operations
FEATURE_EMAIL_NOTIFICATIONS=false  # Don't send emails
FEATURE_ANALYTICS=false             # Skip analytics collection
```

---

## Verification & Recovery (30+ min)

### Verify Latency Improvement

```promql
# Check p95 latency
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m]))
# Should be < 500ms

# Check by endpoint
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) by (path)
# Affected endpoint should improve most
```

**Synthetic test:**

```bash
# Time a few requests
for i in {1..10}; do
  time curl http://localhost:3000/api/users > /dev/null
done
# Should be 50-500ms now
```

### In PagerDuty

1. Once latency returns to < 500ms:
   - Alert auto-resolves
   - Or manually click "Resolve"

2. Document in incident summary:
```
Title: High Latency - N+1 Database Query
Severity: HIGH
Duration: 10:15 AM - 10:42 AM UTC (27 minutes)

Root Cause:
  New user listing feature (v2.3.4) introduced N+1 query pattern
  Fetched 100 users, then 100 separate team lookups
  Query time: 100ms * 100 = 10 seconds per request

Resolution:
  1. Identified in Jaeger traces (db.query taking 700ms)
  2. Optimized query with JOIN instead of loop
  3. Latency improved: 800ms → 50ms

Prevention:
  1. Query performance test added to CI pipeline
  2. Code review checklist updated
  3. Alert added for p95 query duration > 500ms
```

---

## Long-term Improvements (24+ hours)

### 1. Add Performance Tests

```javascript
// tests/integration/performance.test.js
import http from 'http';

describe('Performance', () => {
  it('GET /api/users should complete in < 500ms', async () => {
    const start = Date.now();
    const result = await fetch('/api/users');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
    expect(result.status).toBe(200);
  });

  it('should not have N+1 query pattern', async () => {
    const queries = [];
    const queryMonitor = (sql) => queries.push(sql);
    
    db.on('query', queryMonitor);
    await userService.listUsers();
    db.off('query', queryMonitor);
    
    // Should be 1 JOIN query, not 100+ queries
    expect(queries.length).toBeLessThan(5);
  });
});
```

Run in CI/CD before deployment.

### 2. Add Continuous Performance Monitoring

```javascript
// In metrics middleware
export const recordPerformanceMetrics = (req, res) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Record for each endpoint
    recordMetric('endpoint.duration', duration, {
      path: req.path,
      method: req.method,
      status: res.statusCode,
    });
    
    // Alert if slow
    if (duration > 1000) {
      logger.warn('Slow endpoint', {
        path: req.path,
        duration,
        threshold: 1000,
      });
    }
  });
};
```

### 3. Load Testing Before Release

```bash
# artillery load test
artillery run load-test.yml

# Metrics checked:
# - p95 latency < 500ms
# - Error rate < 1%
# - Database connections < 40
```

---

## Related Documents

- **TRACE_DEBUGGING_GUIDE.md**: How to debug slow traces
- **LOGS_ANALYSIS_GUIDE.md**: Finding slow requests in logs
- **METRICS_INTERPRETATION.md**: Understanding latency metrics
- **DATABASE_PERFORMANCE.md**: Detailed database debugging
