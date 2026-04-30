# Trace Debugging Guide

## Overview

Distributed tracing shows the complete path of a request through all services, databases, and external calls. This guide explains how to use Jaeger traces to debug performance issues and identify errors.

## Accessing Jaeger

**URL:** `https://jaeger.lume.dev` (or `http://localhost:16686` for local development)

**Default credentials:** (if using authentication)
- Username: admin
- Password: (check .env)

---

## Finding Traces

### Method 1: Search by Trace ID

**Scenario:** You found an error in logs with `requestId: "1725045045123-abc123"`

**Steps:**
1. Copy the requestId
2. In Jaeger, paste into the "Trace ID" field
3. Click "Find Traces"

**Result:** Single trace with all spans from that request

### Method 2: Search by Service

**Scenario:** "The /api/users endpoint is slow"

**Steps:**
1. Select "lume-backend" in Service dropdown
2. Select operation: "POST /api/users" or leave blank for all
3. Set time range: Last 15 minutes
4. Click "Find Traces"

**Optional filters:**
- Min Duration: 1000 (show only traces > 1 second)
- Max Duration: leave blank
- Tags: `http.status_code:500` (show only errors)

### Method 3: Search by Tags

**Scenario:** "Find all requests from a specific user that failed"

**Steps:**
1. Service: lume-backend
2. Tags: `user.id:user-123 http.status_code:500`
3. Time range: Last 1 hour
4. Click "Find Traces"

**Available tags:**
- `user.id`: User ID
- `user.email`: User email
- `http.method`: GET, POST, PUT, DELETE
- `http.status_code`: 200, 400, 401, 403, 404, 500, etc.
- `http.target`: Request path
- `error:true`: Only error traces
- `span.kind:internal`: Internal operations only

---

## Understanding Trace Structure

### Anatomy of a Trace

```
lume-backend: POST /api/users (root span)
├─ http.server.request (1.2 ms)
├─ express.request (1.1 ms)
│  ├─ query.parameters.parse (0.1 ms)
│  └─ request.body.parse (0.2 ms)
├─ middleware.auth (2.5 ms)
│  └─ db.query: SELECT * FROM users WHERE id=? (2.3 ms)
├─ handler.createUser (45.3 ms)
│  ├─ db.query: INSERT INTO users (...) (12.5 ms)
│  ├─ cache.set: set user:123 (8.2 ms)
│  ├─ email.send: confirmation (22.1 ms)
│  └─ cache.delete: users:list (2.5 ms)
└─ response.send (0.5 ms)
```

**Key observations:**
- Total trace duration: ~52 ms
- Slowest operation: email.send (22.1 ms)
- Sequential vs parallel: operations inside email.send look sequential

### Span Timeline View

Click on any trace to open **Timeline View**:

```
╔════════════════════════════════════════════╗
║ Time (ms)                                   ║
║ 0    10   20   30   40   50                ║
╠════════════════════════════════════════════╣
║ auth middleware           [████]            ║  2.5 ms
║ db.query: users          [███]              ║  2.3 ms
║ handler.createUser       [█████████████]    ║  45.3 ms
║   ├─ db.insert          [██]                ║  12.5 ms
║   ├─ cache.set          [██]                ║  8.2 ms
║   ├─ email.send         [████████]          ║  22.1 ms
║   └─ cache.delete       [█]                 ║  2.5 ms
╚════════════════════════════════════════════╝
```

**What to look for:**
- Long spans = bottleneck
- Gaps between spans = waiting/idle time
- Wide spans = slow sub-operations

---

## Debugging Patterns

### Pattern 1: Find Slow Database Query

**Scenario:** "POST /api/users is taking 50 seconds"

**Steps:**
1. Find the trace (high min duration: 50000 ms)
2. Look for orange/red spans (slow operations)
3. Expand the database spans
4. Click on the slowest span to see details

**Span Details Panel shows:**
```
Span Name:        db.query
Duration:         12,543 ms
Service:          lume-backend
Operation:        INSERT INTO users (...)
Status:           OK
Tags:
  db.system:      mysql
  db.operation:   INSERT
  db.statement:   INSERT INTO users (id, email, ...) VALUES (?, ?, ...)
  db.rows_affected: 1
  span.kind:       internal
```

**What to check:**
- ✅ Is the SQL query correct? (check `db.statement`)
- ✅ Is it using an index? (query plan in database)
- ✅ Are there N+1 queries? (many small queries instead of one large)
- ✅ Is table locked? (check MySQL `SHOW PROCESSLIST`)

### Pattern 2: Find Error Location

**Scenario:** "500 error on /api/users but logs don't show the error details"

**Steps:**
1. Filter traces: `http.status_code:500`
2. Click on a trace
3. Look for red spans (error status)
4. Click on the red span to see error details

**Error Details show:**
```
Span Name:        db.query
Status:           ERROR
Error Message:    "Unknown column 'user_role' in 'field list'"
Exception Type:   Error
Stack Trace:      at Query.<anonymous> (mysql2/lib/protocol/sequences/Query.js:77:15)
                  at Protocol._enqueue (mysql2/lib/protocol/Protocol.js:144:15)
                  ...
```

**Next steps:**
1. Check the stack trace (which function?)
2. Check the error message (what went wrong?)
3. Look at surrounding spans (what was the context?)
4. Use logs to find more details (search by trace ID)

### Pattern 3: Identify Dependency Chain

**Scenario:** "Need to understand the complete request flow"

**Steps:**
1. Click on root span (usually the longest)
2. Read the span name hierarchy from top to bottom
3. Identify critical path (dependencies that extend total duration)

**Example critical path:**
```
request received (0 ms)
  → auth middleware (2.5 ms) [BLOCKING]
    → db.query (2.3 ms)
  → handler.createUser (45 ms) [BLOCKING]
    → db.insert (12.5 ms)
    → email.send (22.1 ms) [BLOCKING]
  → response sent (47.5 ms total)
```

**Optimization opportunities:**
- Email can be sent asynchronously (move outside critical path)
- Auth query could be cached
- Batch database inserts if creating multiple records

### Pattern 4: Trace Cross-Service Request

**Scenario:** "Request goes to multiple services. Where's the latency?"

**Steps:**
1. Find trace with multiple services in dropdown
2. Expand all service sections
3. Look for time gaps between services (network latency)
4. Check which service is slowest

**Example multi-service trace:**
```
lume-backend: POST /api/users (45 ms)
├─ lume-backend: auth.validateToken (2 ms)
├─ lume-auth: validate_jwt (5 ms)      ← external service
│  └─ cache.check (1 ms)
│  └─ jwt.decode (3 ms)
├─ lume-backend: handler.createUser (20 ms)
├─ lume-notifications: send_email (15 ms)  ← external service
└─ lume-backend: response.send (3 ms)
```

**Network latency:** 5 ms to auth-service + 15 ms to notifications-service

---

## Reading Detailed Span Information

Click on any span to see:

### Tags (Span Attributes)
```
http.method:         GET
http.target:         /api/users?page=1
http.status_code:    200
http.response.content_length: 2048

db.system:           mysql
db.operation:        INSERT
db.statement:        INSERT INTO users (id, email) VALUES (?, ?)
db.rows_affected:    1

user.id:             user-123
user.email:          user@example.com
trace.id:            1725045045123-abc123
span.kind:           server/client/internal
```

### Events (Span Log Entries)
```
Event: exception_recorded
  exception.type:      Error
  exception.message:   "Connection timeout"
  exception.stacktrace: [...stack trace...]

Event: span_completed
  span.duration_ms: 1234
```

### Status
```
Status Code:   OK (0) | ERROR (2)
Status Message: (optional error description)
```

---

## Common Debugging Scenarios

### Scenario 1: Latency Spike at Specific Time

**Problem:** "API was slow between 2:00 PM and 2:15 PM"

**Steps:**
1. Set time range: 2:00 PM - 2:15 PM
2. Set min duration: 5000 ms (find slow traces)
3. Look at multiple traces:
   - Did they all start at same time? (coordinated issue)
   - Does latency get worse over time? (resource leak)
   - Are same endpoints affected? (specific code issue)

**Likely causes:**
- Database under load (check DB metrics)
- External service latency (check tags for service)
- Resource exhaustion (check CPU/memory)
- Traffic spike (check request count)

### Scenario 2: Error Rate Spike

**Problem:** "Suddenly got 500 errors"

**Steps:**
1. Filter: `http.status_code:500`
2. Set time range to ±10 minutes of spike
3. Look at multiple error traces
4. Do they share:
   - Same endpoint? (code issue)
   - Same error message? (database/service down)
   - Same user? (user-specific config)

**Quick checks:**
```
# In another terminal
# Check recent errors in logs
tail -100 logs/combined.log | jq 'select(.statusCode >= 500)'

# Check database connection status
mysql -u gawdesy -p gawdesy -e "SHOW PROCESSLIST;" | head -20
```

### Scenario 3: Memory Leak

**Problem:** "Memory usage keeps increasing. Where are we leaking?"

**Steps:**
1. Get traces from different times (e.g., 1 AM, 2 AM, 3 AM)
2. Compare span durations:
   - Are they increasing? (leak in operation itself)
   - Are new spans appearing? (new code path)
   - Is tree structure same? (consistent behavior)

**Better diagnosis:** Use metrics dashboard for memory trends over time

### Scenario 4: Request Fails Intermittently

**Problem:** "Sometimes user gets 500 error, sometimes it works"

**Steps:**
1. Find both success and error traces
2. Compare their span structures
3. Identify which span is different
4. Check tags for differences (connection ID, database version, etc.)

**Example:**
```
SUCCESS trace:
  db.query (2 ms) ✅
  external.api (50 ms) ✅
  
ERROR trace:
  db.query (1002 ms) [TIMEOUT!] ❌
  (external.api never called)
```

---

## Advanced Tracing Features

### View Trace in JSON

**Click gear icon → Show JSON:**

```json
{
  "traceID": "1725045045123-abc123",
  "spans": [
    {
      "traceID": "1725045045123-abc123",
      "spanID": "server-1",
      "operationName": "POST /api/users",
      "duration": 47500,
      "startTime": 1725045045123000,
      "tags": {
        "http.method": "POST",
        "http.target": "/api/users",
        "http.status_code": 200
      },
      "logs": []
    }
  ]
}
```

### Compare Traces

**Scenario:** "This slow trace looks different from a normal one"

**Steps:**
1. Open first trace
2. Right-click on second trace link → "Open in new tab"
3. Arrange windows side-by-side
4. Compare span structures and durations

### Create Custom Service Map

**Steps:**
1. Click "System Topology" (top menu)
2. Select time range
3. See visual map of service dependencies
4. Click on edges to see request volume and latency

---

## Correlation: Traces ↔ Logs ↔ Metrics

### From Alert → Trace → Log

**PagerDuty Alert fires:** "High Latency detected"

1. Note timestamp from alert (e.g., 2:15 PM UTC)
2. Open Jaeger
3. Set time range: 2:10 PM - 2:20 PM UTC
4. Set min duration: 1000 ms
5. Click on slowest trace
6. Copy trace ID from URL or span details
7. Open Kibana
8. Search: `requestId:<trace-id>`
9. See detailed logs for that request

### From Error → Metrics → Trace

**Grafana alert:** "Error rate > 5%"

1. Note time of alert
2. Open Kibana with same time range
3. Search: `level:error OR statusCode >= 400`
4. Identify which endpoint is failing
5. Open Jaeger
6. Filter: operation name = affected endpoint
7. Filter: tags `http.status_code:500` (or relevant code)
8. Click on error trace
9. See detailed span timeline

---

## Performance Optimization Examples

### Example 1: N+1 Query Problem

**Trace shows many similar database spans:**
```
handler.getUsers (100 ms)
  ├─ db.query: SELECT * FROM users (2 ms)
  ├─ db.query: SELECT * FROM teams WHERE id=1 (1 ms) ← first user
  ├─ db.query: SELECT * FROM teams WHERE id=2 (1 ms) ← second user
  ├─ db.query: SELECT * FROM teams WHERE id=3 (1 ms) ← third user
  └─ ... repeated 100 times
```

**Problem:** Selecting 100 users, then one query per user to get team
**Solution:** Use JOIN: `SELECT u.*, t.* FROM users u JOIN teams t ON u.team_id = t.id`

### Example 2: Synchronous Work in Critical Path

**Trace shows email sent before response:**
```
handler.createUser (50 ms)
  ├─ db.insert (5 ms)
  ├─ email.send (35 ms) ← BLOCKING
  └─ response.send (1 ms)
```

**Problem:** User waits 50 ms for email to send
**Solution:** Send email asynchronously
```javascript
// Instead of:
await emailService.send(user.email);

// Do:
emailService.send(user.email).catch(err => logger.error(err));
```

### Example 3: Missing Cache

**Trace shows repeated same queries:**
```
handler.listUsers (5000 ms)
  ├─ db.query: SELECT COUNT(*) FROM users (500 ms) ← user list
  ├─ iteration 1-100:
  │  └─ db.query: SELECT * FROM teams WHERE id=X (10 ms each)
```

**Problem:** Same teams queried 100 times
**Solution:** Cache team data
```javascript
const team = await cache.get(`team:${id}`) || await db.query(...);
```

---

## Exporting and Sharing Traces

### Export as JSON
1. Open trace
2. Click gear icon → "Show JSON"
3. Copy/paste into file

### Share via URL
Jaeger URLs are shareable:
```
https://jaeger.lume.dev/search?service=lume-backend&traceID=1725045045123
```

### Embed in Document
```markdown
[View trace in Jaeger](https://jaeger.lume.dev/search?service=lume-backend&traceID=1725045045123)
```

---

## Troubleshooting Trace Issues

### Issue: "No traces appearing for my service"

**Checklist:**
1. ✅ Is tracing initialized in main.js? (`await initTracing()`)
2. ✅ Is OTEL_EXPORTER_OTLP_ENDPOINT set? (check .env)
3. ✅ Can you reach Jaeger? (ping http://localhost:4317)
4. ✅ Wait 30 seconds for traces to propagate
5. ✅ Check: service name in Jaeger = OTEL_SERVICE_NAME in .env

**Fix:**
```bash
# Verify endpoint
curl http://localhost:4317/v1/traces -X POST -d "{}"

# Check logs for trace errors
grep -i "otel\|tracing" logs/combined.log
```

### Issue: "Traces are missing some operations"

**Cause:** Operations not auto-instrumented

**Solution:** Use manual spans
```javascript
import { createSpan, recordException } from './src/core/tracing/tracing.config.js';

const span = createSpan('custom-operation', { userId });
try {
  // do work
  span.addEvent('operation-complete', { itemsProcessed: 100 });
} catch (error) {
  recordException(error, span);
} finally {
  span.end();
}
```

### Issue: "Sampling is missing important traces"

**Problem:** 10% sampling means 90% of requests aren't traced

**Solution:** Use context-based sampling
```bash
# Trace all errors
OTEL_TRACE_ERRORS=true npm start

# Trace all requests > 1 second
OTEL_TRACE_SLOW_THRESHOLD_MS=1000 npm start
```

Or temporarily increase sampling during debugging:
```bash
OTEL_TRACES_SAMPLER_ARG=1.0 npm start
```

---

See also:
- **LOGS_ANALYSIS_GUIDE.md**: Complementary log analysis
- **METRICS_INTERPRETATION.md**: Metrics corresponding to traces
- **TROUBLESHOOTING.md**: Common issues and solutions
