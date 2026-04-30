# Logs Analysis Guide

## Overview

Lume logs are structured JSON documents that capture application events. This guide explains how to query, analyze, and troubleshoot using logs.

## Log Structure

Every log entry contains:

```json
{
  "timestamp": "2026-04-30T10:30:45.123Z",
  "level": "info",
  "type": "REQUEST|RESPONSE|ERROR|SLOW_REQUEST",
  "requestId": "1725045045123-abc123",
  "method": "GET|POST|PUT|DELETE",
  "path": "/api/users",
  "url": "/api/users?page=1",
  "query": { "page": "1" },
  "statusCode": 200,
  "durationMs": 45,
  "userId": "user-123",
  "userEmail": "user@example.com",
  "userRole": "admin",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100",
  "body": { /* sanitized request body */ },
  "message": "Incoming GET /api/users"
}
```

## Log Levels

| Level | Meaning | Use Case |
|-------|---------|----------|
| **error** | Unhandled exception or critical failure | Application crash, database connection lost |
| **warn** | Unexpected but handled condition | Slow request, rate limit exceeded, deprecated API |
| **info** | Normal operational event | Request received, response sent, user logged in |
| **debug** | Detailed diagnostic information | Variable values, function calls, performance metrics |

## Accessing Logs

### Option 1: Local Log Files

Logs are written to disk at:
```bash
./logs/combined.log        # All logs
./logs/error.log           # Errors and warnings only
```

**View recent logs:**
```bash
tail -100 logs/combined.log | jq .
```

**Search for specific request:**
```bash
grep "requestId" logs/combined.log | jq .
```

### Option 2: Kibana (Log Aggregation)

**Access:** `https://kibana.lume.dev`

**Login:** Use your Lume admin credentials

#### Basic Search

1. Click "Discover" in sidebar
2. Select index: `lume-logs-*`
3. Set time range: Last 15 minutes (top right)
4. Use search box to filter:

```
level:error                              # All errors
path:/api/users AND statusCode:500       # 500 errors on /api/users
userId:"user-123"                        # All requests from user
durationMs:[1000 TO *]                   # Requests > 1 second
type:SLOW_REQUEST                        # Slow requests
```

#### Advanced Queries (Kibana Query Language)

**Find all database errors in last hour:**
```
type:ERROR AND path:/api/* AND durationMs:[500 TO *]
```

**Find requests from specific IP:**
```
ip:"192.168.1.100"
```

**Find password-related errors (with context):**
```
level:error AND message:*password*
```

**Find API errors by status code:**
```
statusCode:400 OR statusCode:401 OR statusCode:403
```

## Common Analysis Patterns

### Pattern 1: Find all errors from a time window

**Problem:** "Our API returned errors between 10:00 and 10:15 AM"

**Kibana Steps:**
1. Set time range: 10:00 AM - 10:15 AM
2. Search: `level:error`
3. Click on each result to see full context

**Command line:**
```bash
# Filter logs for time window and level
jq 'select(.timestamp >= "2026-04-30T10:00:00Z" and 
           .timestamp < "2026-04-30T10:15:00Z" and 
           .level == "error")' logs/combined.log
```

### Pattern 2: Trace a specific request end-to-end

**Problem:** "User reported error on /api/users/123. What happened?"

**Steps:**
1. Find request ID from timing: search by timestamp + user ID
2. Filter all logs by that `requestId`
3. Follow the request through all middleware and services

**Kibana:**
```
requestId:"1725045045123-abc123"
```

**Result:** Should show REQUEST → (database queries) → RESPONSE entries

### Pattern 3: Find slow API endpoints

**Problem:** "API is slow. Which endpoints are the problem?"

**Kibana:**
```
type:SLOW_REQUEST
```

**Observe:**
- Which endpoints appear most frequently?
- Are slowdowns consistent or intermittent?
- What's the database usage during slowdowns?

**Command line:**
```bash
# Top 10 slowest endpoints
jq 'select(.type == "SLOW_REQUEST") | .path' logs/combined.log | 
  sort | uniq -c | sort -rn | head -10
```

### Pattern 4: Track specific user activity

**Problem:** "User reports 'I got a 403 error when trying to delete a file'"

**Kibana:**
```
userId:"user-123" AND statusCode:403 AND method:DELETE
```

**Examine:**
- Request path (which resource?)
- Request headers (authorization?)
- Response body (what was the error message?)
- User's role (admin, user, guest?)

### Pattern 5: Find database-related errors

**Problem:** "Database connection pool is exhausted. What's causing it?"

**Kibana:**
```
message:*database* OR message:*connection* OR message:*pool*
```

**Or look for query timeouts:**
```
message:*timeout* OR message:*ENOTFOUND* OR statusCode:500
```

## Sensitive Data Handling

### What's Masked
- Passwords
- Tokens (JWT, refresh tokens)
- API keys
- Credit card numbers
- OAuth credentials

**Example:**
```json
{
  "password": "[REDACTED]",
  "apiKey": "[REDACTED]",
  "authorization": "[REDACTED]"
}
```

### What's NOT Masked (needed for debugging)
- Email addresses
- Phone numbers
- User IDs
- IP addresses
- Request paths

**If you find a log with unmasked PII:**
1. Do NOT share it externally
2. Report to security team
3. Check log-sanitizer.js for missing patterns

## Log Query Examples

### 1. Top 10 endpoints by error rate
```
# Kibana: Create visualization
Visualization Type: Data Table
Metric: Count
Buckets: Terms (field: path)
Filters: statusCode >= 400
```

### 2. Error rate over time
```
# Kibana: Time series chart
X-axis: @timestamp (date histogram, 5m interval)
Y-axis: Count (with filter: level:error)
```

### 3. Response time percentiles
```
# Kibana: Percentile aggregation
Metric: Percentiles of durationMs
Buckets: Terms (field: path)
```

### 4. Top failing requests
```
# Kibana: Search
level:error
Sort by: durationMs descending
```

### 5. Requests by user role
```
# Kibana: Pie chart
Metric: Count
Buckets: Terms (field: userRole)
```

## Performance Tips

### Log Volume Management

**High-volume endpoints can overwhelm logs:**
- Health checks: `/health`, `/metrics`, `/api/health`
- Static assets: `/static/*`, `/css/*`, `/js/*`

**These are automatically skipped from logging:**
```javascript
const SKIP_LOGGING_PATHS = [
  '/health',
  '/metrics',
  '/api/health',
  '/api/lume/health',
];
```

**To skip additional endpoints, edit:**
```bash
src/core/middleware/logging.middleware.js
```

### Log Retention Policy

**Logs are rotated daily:**
```
logs/combined.log         # Current day
logs/combined.log.1       # Yesterday
logs/combined.log.2       # 2 days ago
# ... etc
```

**Retention:** 30 days (configurable via LOG_RETENTION)

**To view rotation:**
```bash
ls -lh logs/ | grep combined
```

## Correlation with Other Signals

### Correlate Logs with Traces

Every log entry includes `requestId`:
```json
{
  "requestId": "1725045045123-abc123"
}
```

Use this to find the corresponding trace in Jaeger:
1. Copy the `requestId`
2. Open Jaeger: `https://jaeger.lume.dev`
3. Search for trace ID: `1725045045123-abc123`

### Correlate Logs with Metrics

When you see high error rate in metrics:
1. Note the time window from Grafana alert
2. Set Kibana time range to that window
3. Search: `level:error OR statusCode >= 400`
4. Identify affected endpoints and root cause

## Troubleshooting Common Issues

### Issue: "No logs appearing"

**Checklist:**
1. ✅ Is logging middleware registered in Express setup?
2. ✅ Is `LOG_LEVEL` set correctly? (not "silent")
3. ✅ Check file permissions: `ls -la logs/`
4. ✅ Check disk space: `df -h`
5. ✅ Are you searching the right time range?

**Fix:**
```bash
# Restart with debug logging
LOG_LEVEL=debug npm start

# Check middleware registration
grep "loggingMiddleware" src/index.js
```

### Issue: "Logs are too verbose"

**Solution:** Adjust log level
```bash
# Only show errors and warnings
LOG_LEVEL=warn npm start
```

**Or filter in Kibana:**
```
level:(error OR warn)
```

### Issue: "Can't find a specific request"

**Try this combination:**
```
# Use both timestamp and user/IP
timestamp >= "10:00:00" AND timestamp < "10:01:00"
AND (userId:"user-123" OR ip:"192.168.1.100")
```

### Issue: "Kibana dashboard is slow"

**Solution:** Narrow the time window
- Instead of "Last 30 days", use "Last 4 hours"
- Add more specific filters (path, statusCode)
- Avoid wildcards that match thousands of logs

## Best Practices

1. **Always include requestId:** When asking for help, provide the requestId from logs
2. **Use structured fields:** Filter by `path`, `statusCode`, `userId` instead of full-text search
3. **Set appropriate time ranges:** Narrower ranges = faster queries
4. **Check both request and response:** A 500 error needs both REQUEST and RESPONSE entries
5. **Correlate with traces:** Slow logs should be traced in Jaeger
6. **Watch for patterns:** If same error appears 100x, likely a systemic issue

## Exporting Logs

**Export from Kibana:**
1. Search for desired logs
2. Click "Share" → "Export as CSV"
3. Download for external analysis

**Export from command line:**
```bash
# Export all errors from last hour
jq 'select(.level == "error")' logs/combined.log > errors.jsonl

# Export specific user activity
jq 'select(.userId == "user-123")' logs/combined.log > user-activity.jsonl
```

## Alert-Log Integration

When an alert fires in PagerDuty:
1. Note the alert name and timestamp
2. Open Kibana
3. Set time range to ±5 minutes of alert time
4. Search for related error patterns
5. Follow the troubleshooting guides in TROUBLESHOOTING.md

---

See also:
- **TRACE_DEBUGGING_GUIDE.md**: Use traces for deeper analysis
- **ALERTS_RESPONSE.md**: Responding to alerts
- **TROUBLESHOOTING.md**: Common issues and solutions
