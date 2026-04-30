# Alerts Response Guide

## Overview

This guide explains how to respond to alerts from PagerDuty, interpret severity levels, and follow escalation procedures.

---

## Alert Severity Levels

### CRITICAL (P1) — Page immediately

**Response SLA:** 5 minutes

**Examples:**
- Error rate > 5% for 5 minutes
- All requests timing out
- Database connection pool exhausted
- Out of memory crash
- Service returning 503 (down)

**Actions:**
1. Page on-call engineer
2. Page team lead after 2 minutes if not acknowledged
3. Escalate to director after 5 minutes if not resolved

**Expected outcome:** Resolution within 15-30 minutes

### HIGH (P2) — Notify with escalation

**Response SLA:** 15 minutes

**Examples:**
- Error rate 2-5% for 5 minutes
- p95 latency > 1000ms
- Database query time > 500ms
- Cache hit rate dropped below 60%
- Module failing to initialize

**Actions:**
1. Notify on-call engineer via Slack
2. Create incident ticket
3. Escalate to team lead if not resolved in 15 minutes

**Expected outcome:** Resolution within 1-4 hours

### MEDIUM — Create ticket

**Response SLA:** 8 hours (business hours only)

**Examples:**
- p95 latency 200-1000ms (but < alert threshold)
- Cache hit rate 40-60% (suboptimal but working)
- Slow but successful database queries
- Deprecation warnings

**Actions:**
1. Create Jira ticket
2. Assign to team
3. Include in next sprint planning

**Expected outcome:** Fix in next sprint or by next business day

### LOW — Dashboard only

**No notification**

**Examples:**
- p95 latency 100-200ms (healthy)
- Cache hit rate > 80%
- Module loading time normal

**Actions:** No action needed (informational only)

---

## PagerDuty Incident Workflow

### When Alert Fires

1. **PagerDuty notification arrives** (phone call, SMS, Slack)
2. **Open incident:** Click link in notification
3. **See incident details:**
   - Alert name
   - Severity level
   - Time triggered
   - Current value
   - Threshold

### Step 1: Acknowledge Alert (within 5 min for P1)

**In PagerDuty:**
1. Click "Acknowledge"
2. Select reason: "Looking into it"
3. Click "Acknowledge"

**Why:** Tells team someone is investigating, prevents escalation

### Step 2: Investigate (gather information)

**For P1 (Critical):**

```bash
# 1. Check alert details
# - Which metric triggered?
# - What's the current value?
# - What's the threshold?

# 2. Open Grafana dashboard
# - Navigate to relevant dashboard
# - Check the exact time of alert
# - Look for spike or sustained elevation

# 3. Check logs in Kibana
# - Set time range to ±5 min around alert time
# - Filter by level:error
# - Look for error patterns

# 4. Check Jaeger traces
# - Filter by http.status_code:500
# - Set min duration: 1000 (slow traces)
# - Identify which operation is failing

# 5. Check system resources
# df -h                           # Disk space
# free -h                         # Memory
# top -b -n 1 | head -20         # CPU/memory per process

# 6. Check database
# mysql -u gawdesy -p gawdesy \
#   -e "SHOW PROCESSLIST;" | grep -v Sleep

# 7. Check application logs
# tail -100 logs/error.log | jq .
```

### Step 3: Resolve Alert

**Two options:**

**Option A: Automatic resolution**
- Fix the underlying issue
- Alert self-resolves when metric normalizes
- Typically 1-5 minutes

**Option B: Manual resolution**
- If alert doesn't auto-resolve after 10 minutes:
  1. Click "Resolve" in PagerDuty
  2. Document what was done to fix
  3. Follow up with metrics to verify fix

### Step 4: Post-Incident

1. **Create incident summary** (for P1/P2):
   ```
   Alert: High Error Rate
   Duration: 8:15 AM - 8:23 AM UTC (8 minutes)
   Impact: 2,500 requests failed (3% error rate)
   Root cause: Database connection pool exhausted
   Fix: Increased pool size from 50 to 100
   ```

2. **Update alert threshold if needed:**
   - Was threshold too low? (false positives)
   - Was threshold too high? (missed real issues)
   - Coordinate with team before changing

3. **Add monitoring for prevention:**
   - If new failure type, add metric
   - If external service caused it, add dependency health check
   - If capacity issue, adjust scaling rules

---

## Alert Escalation Timeline

```
Time    Action                          Who
────────────────────────────────────────────────────
0 min   Alert fires                     PagerDuty
1 min   Page on-call engineer           PagerDuty
5 min   If not acked → page on-call     PagerDuty
10 min  If not acked → page backup      PagerDuty
15 min  If not resolved → page team     On-call duty
30 min  If not resolved → page director Team lead
```

---

## Common Alerts and Response Steps

### Alert: High Error Rate (> 5% for 5 min)

**Severity:** CRITICAL

**1. Acknowledge immediately**
```
Click: Acknowledge in PagerDuty
```

**2. Gather information (1-2 min)**
```promql
# What's the current error rate?
(sum(rate(lume_http_requests_total{status_group=~"4xx|5xx"}[5m])) / 
 sum(rate(lume_http_requests_total[5m]))) * 100

# Which endpoints are failing?
rate(lume_http_requests_total{status_group="5xx"}[1m]) by (path)

# Is it increasing or stable?
rate(lume_errors_total[5m])
```

**3. Check logs (1-2 min)**
```bash
# Kibana search:
level:error AND timestamp >= "2026-04-30T10:00:00Z"

# Or CLI:
tail -200 logs/error.log | jq '.' | head -20
```

**4. Identify root cause (2-5 min)**

**If database errors:**
```bash
mysql -u gawdesy -p gawdesy -e "SHOW PROCESSLIST;"
mysql -u gawdesy -p gawdesy -e "SHOW STATUS LIKE 'Threads%';"
```

**If external service errors:**
- Check service status page
- Check network latency: `ping external-service.com`
- Check DNS resolution: `nslookup external-service.com`

**If application errors:**
- Check recent deployments
- Rollback if deployed in last 10 minutes
- Increase log level to debug for more detail

**5. Mitigation options (5-15 min)**

- **Quick fix:** Scale up replicas (for connection pool exhaustion)
- **Rollback:** Revert recent deploy
- **Circuit break:** Disable problematic feature flag
- **Drain:** Gracefully shut down affected service

**6. Monitor recovery (5+ min)**
```promql
# Watch error rate decrease
lume_error_rate_percentage
# Should return to < 1% within 5-10 minutes
```

**7. Document incident**
```
Issue: User accounts module throwing 500 errors
Duration: 8:15 - 8:27 AM UTC (12 minutes)
Requests failed: ~3,000 (5.2% error rate)

Root cause: 
  Deployment v2.3.5 introduced N+1 database query
  in user list endpoint

Fix:
  Rolled back to v2.3.4

Prevention:
  Added query performance test to CI/CD pipeline
  Set alert for p95 query duration > 500ms
  Code review process to catch N+1 patterns
```

---

### Alert: High Latency (p95 > 1000ms for 5 min)

**Severity:** HIGH

**1. Acknowledge**
```
Click: Acknowledge in PagerDuty
```

**2. Check which endpoint is slow (1-2 min)**
```promql
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) by (path)
```

**3. Trace a slow request in Jaeger (2-5 min)**
```
1. Open https://jaeger.lume.dev
2. Service: lume-backend
3. Operation: affected endpoint
4. Min Duration: 1000 ms
5. Find slowest trace
6. Look for slow database query or external call
```

**4. Check database performance (2-5 min)**
```promql
# p95 query duration
histogram_quantile(0.95, rate(lume_db_query_duration_seconds_bucket[5m])) by (operation)

# Query rate
rate(lume_db_queries_total[1m]) by (operation)
```

**5. Mitigation**
- Add database index if needed
- Optimize slow query
- Scale database (if load-related)
- Cache results if applicable
- Batch operations

**6. Monitor improvement (5+ min)**
```promql
# p95 should return to < 500ms
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m]))
```

---

### Alert: Database Connection Pool Exhaustion

**Severity:** CRITICAL

**1. Acknowledge immediately**

**2. Check connection count (30 seconds)**
```promql
lume_db_connections_active
```

**3. See what's using connections (1 min)**
```bash
mysql -u gawdesy -p gawdesy -e "SHOW PROCESSLIST \G" | head -50
```

**4. Quick fixes (1-5 min)**

**Option A: Increase pool size**
```javascript
// In src/core/db/prisma.js
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL + "?max_pool_size=200&queue_strategy=queuing"
    }
  }
})
```
Then restart application

**Option B: Kill long-running queries**
```bash
mysql -u gawdesy -p gawdesy -e "KILL QUERY <process_id>;"
```

**Option C: Increase connection timeout**
```javascript
// In src/core/db/drizzle.js
mysql({
  host: 'localhost',
  port: 3306,
  user: 'gawdesy',
  password: 'gawdesy',
  database: 'lume',
  waitForConnections: true,
  connectionLimit: 200,        // Increase from 100
  queueLimit: 0
})
```

**Option D: Enable connection pooling**
- If using PgBouncer or ProxySQL, increase pool size there

**5. Monitor recovery**
```promql
# Should drop within 30 seconds
lume_db_connections_active
```

**6. Long-term fixes**
- Optimize slow queries
- Add caching to reduce queries
- Implement connection reuse
- Monitor for connection leaks

---

### Alert: Out of Memory

**Severity:** CRITICAL

**1. Acknowledge immediately**

**2. Check memory usage (30 seconds)**
```bash
free -h
top -b -n 1 | head -15
```

**3. Identify memory leak**
```bash
# Check process memory
ps aux | grep "node"
# Look for process with increasing RSS over time

# Check JavaScript heap
node --inspect dist/index.js &
# Then open chrome://inspect
```

**4. Quick fix: Restart application (1-2 min)**
```bash
pm2 restart lume-backend
# or
systemctl restart lume-backend
```

**5. Verify recovery**
```bash
free -h
ps aux | grep node | grep -v grep
```

**6. Investigate root cause (5-15 min)**
- Memory leak in application code?
- Cache growing without bounds?
- File handle leak?
- Use heap snapshots to identify

---

## Communication During Incidents

### To your team (Slack)

```
🚨 CRITICAL ALERT: High Error Rate
Service: lume-backend
Status: INVESTIGATING
Error rate: 5.2% (threshold: 5%)
Time started: 8:15 AM UTC
Current action: Checking logs and recent deployments
ETA to resolution: 10 minutes

Details: #incident-2026-04-30-high-error-rate
```

### To stakeholders (if long incident)

```
UPDATE (8:25 AM UTC)
⚠️ API experiencing elevated error rates since 8:15 AM
Impact: ~5% of requests failing (vs normal 0.5%)
Root cause: Deployment v2.3.5 has performance issue
Status: Rolling back to v2.3.4
ETA: 5 minutes back to normal

We apologize for the disruption.
```

### Post-incident to team

```
INCIDENT SUMMARY
Service: lume-backend
Duration: 8:15 - 8:27 AM UTC (12 minutes)
Severity: Critical
Impact: ~3,000 failed requests

Timeline:
- 8:15 AM: Alert fires (error rate > 5%)
- 8:16 AM: On-call engineer alerted
- 8:18 AM: Root cause identified (N+1 query in v2.3.5)
- 8:20 AM: Started rollback to v2.3.4
- 8:27 AM: Application restarted, error rate normalized

Lessons learned:
- Need query performance tests in CI/CD
- Reviewers should watch for N+1 patterns
- Could have detected faster with better monitoring

Action items:
1. Add query performance test to CI pipeline
2. Add p95 query duration alert (threshold: 500ms)
3. Update code review checklist
```

---

## Alert Tuning

### Problem: False Positives (alert when everything is fine)

**Solution:**
1. Increase alert threshold
2. Increase duration (e.g., "5 min" → "10 min")
3. Add conditions (e.g., "AND error_rate_increasing")

**Example:** If getting 5 false positives per week on latency alert
```promql
# Current rule (too sensitive)
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) > 500

# Better rule (requires sustained increase)
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[5m])) > 750
AND
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[1m])) > 
histogram_quantile(0.95, rate(lume_http_request_duration_seconds_bucket[10m])) * 1.2
```

### Problem: Missed Alerts (real issue, no alert)

**Solution:**
1. Decrease threshold
2. Decrease duration
3. Add new alert for edge cases

**Example:** Missing database crashes
```promql
# Add alert for connection pool going to 0
lume_db_connections_active == 0

# Add alert for failed connection attempts
rate(lume_db_connection_errors_total[1m]) > 0
```

---

## Resources

- **PagerDuty Documentation:** https://support.pagerduty.com/
- **Grafana Alerting Docs:** https://grafana.com/docs/grafana/latest/alerting/
- **Incident Post-Mortems:** See incident-reports/ directory

---

See also:
- **METRICS_INTERPRETATION.md**: Understanding the metrics
- **TROUBLESHOOTING.md**: Common issues
- **Runbooks:** HIGH_ERROR_RATE.md, HIGH_LATENCY.md, etc.
