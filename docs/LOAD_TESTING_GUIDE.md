# Load Testing Guide for Lume Framework

## Overview

This guide covers load testing the Lume framework using k6, an open-source performance testing tool. Load testing validates system performance under various traffic patterns and identifies capacity limits.

## Prerequisites

### Install k6

```bash
# macOS (Homebrew)
brew install k6

# Linux (Ubuntu/Debian)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (Chocolatey)
choco install k6

# Or download from https://k6.io/open-source
```

### Setup Lume Backend

Ensure the Lume backend is running on `http://localhost:3000`:

```bash
cd /opt/Lume/backend
npm install
npm run dev
```

The database must be initialized with test data:

```bash
npm run db:init
```

This creates:
- Admin user: `admin@lume.dev` / `admin123`
- Test pages and content
- Required permissions

## Load Test Scenarios

### 1. Steady-State Test

**Purpose:** Measures system performance under constant, sustainable load

**File:** `backend/tests/load/steady-state.js`

**Load Profile:**
- Ramp up to 1000 concurrent users over 2 minutes
- Maintain 1000 users for 10 minutes (~5000 req/sec)
- Ramp down over 1 minute

**Operations Tested:**
- Read users list (25%)
- Read pages list (25%)
- Search data (15%)
- Health checks (10%)
- Create pages (15%)
- User workflows (10%)

**Metrics Tracked:**
- P50, P95, P99 latency
- Error rate
- Throughput (requests/sec)
- Connection times

**Running the Test:**

```bash
cd /opt/Lume/backend
k6 run tests/load/steady-state.js
```

**Expected Results:**
- P95 latency < 500ms
- Error rate < 1%
- Throughput ≥ 800 req/sec
- P99 latency < 1000ms

**Interpretation:**
- If latency increases during ramp-down: system handles load well
- If latencies spike midway: database indexing or connection pool issues
- If error rate increases: rate limiter or resource exhaustion

### 2. Spike Test

**Purpose:** Tests system's ability to handle sudden traffic spikes and recovery

**File:** `backend/tests/load/spike-test.js`

**Load Profile:**
- Normal load: 100 concurrent users for 5 minutes
- Sudden spike: 500 users (5x increase) over 10 seconds
- Maintain spike for 2 minutes
- Recovery: Drop to 100 users over 10 seconds
- Monitor recovery: 2 minutes at normal load

**Operations Tested:**
- Health checks (15%) - detect unresponsiveness
- User list reads (25%) - simple database queries
- Page reads (25%) - moderate complexity
- Search (20%) - complex queries
- Page creation (15%) - database writes

**Metrics Tracked:**
- Error rate during/after spike
- Peak latency during spike
- Recovery time to normal latency
- Connection errors

**Running the Test:**

```bash
k6 run tests/load/spike-test.js --vus 500 --duration 10m
```

**Expected Results:**
- Error rate spike < 5% during peak
- Return to < 1% error rate within 2 minutes
- P95 latency during spike < 2000ms
- No hanging connections after spike

**Interpretation:**
- Slow recovery: connection pooling or memory leak
- Sustained high errors: queue backlog or cascading failures
- Timeouts during spike: database timeout configuration too short
- Connection refused: max connections exceeded

### 3. Ramp-Up Test

**Purpose:** Identifies the system's capacity limits and breakdown point

**File:** `backend/tests/load/ramp-up.js`

**Load Profile:**
- Start: 10 concurrent users
- Increase by 50 users every minute for 8 minutes
- Final: 1000 users
- Each stage lasts 1 minute

**Stages:**
1. 10 VUs (50 req/sec)
2. 50 VUs (250 req/sec)
3. 100 VUs (500 req/sec)
4. 200 VUs (1000 req/sec)
5. 400 VUs (2000 req/sec)
6. 600 VUs (3000 req/sec)
7. 800 VUs (4000 req/sec)
8. 1000 VUs (5000 req/sec)

**Operations Tested:**
- Health checks (10%)
- User reads (30%)
- Page reads (25%)
- Search (15%)
- Page creation (12%)
- Complex workflows (8%)

**Running the Test:**

```bash
k6 run tests/load/ramp-up.js --out json=results.json
```

**Expected Results:**
- Identify knee point where latency increases exponentially
- Error rate should remain < 10% until breaking point
- Typical capacity: 600-1000 req/sec

**Interpretation:**
- Latency doubles between stage 4 and 5: database indexing issue
- Error rate jumps to 50%+ at stage 6: connection pool exhausted
- Consistent 50% error rate at higher stages: rate limiter activated
- System recovers quickly after ramp-down: no resource leaks

### 4. Sustained Load Test

**Purpose:** Validates long-term stability, detects memory leaks and resource degradation

**File:** `backend/tests/load/sustained-load.js`

**Load Profile:**
- Ramp up to 200 concurrent users over 2 minutes
- Maintain 200 users for 30 minutes (~1000 req/sec)
- Ramp down over 2 minutes

**Operations Tested:**
- Health checks (15%) - frequent monitoring
- User list reads (25%)
- Page list reads (30%)
- Search (15%)
- Page creation (8%)
- Extended workflows (5%)
- Write consistency checks (2%)

**Metrics Tracked:**
- Latency trend over 30 minutes
- Error rate consistency
- Memory usage (via system monitoring)
- GC pause impact
- Database connection pool stability

**Running the Test:**

```bash
# Basic run
k6 run tests/load/sustained-load.js

# With system metrics
k6 run tests/load/sustained-load.js --out json=sustained-results.json
```

**Expected Results:**
- Latency stable throughout test (< 10% variation)
- Error rate steady < 1%
- No memory growth > 50MB over 30 minutes
- GC pauses < 100ms

**Interpretation:**
- Latency increases over time: memory leak or query degradation
- Error rate increases after 15 minutes: connection pool leak
- Memory grows > 100MB: caching or accumulator issue
- Latency spikes every 2-3 minutes: GC pause pattern detected

## Running Tests with Docker

### Build Test Container

```dockerfile
FROM grafana/k6:latest
COPY backend/tests/load/ /scripts/
WORKDIR /scripts
```

### Run Tests

```bash
docker build -t lume-load-test .
docker run --network host lume-load-test run steady-state.js
```

## Monitoring During Tests

### Option 1: Terminal Output

k6 displays real-time metrics:

```
     checks.........................: 98.52% ✓ 9852 ✗ 148
     data_received..................: 5.2 MB 43 kB/s
     data_sent.......................: 892 kB 7.4 kB/s
     http_req_blocked...............: avg=1.2ms  p(95)=2.3ms
     http_req_connecting............: avg=0.8ms  p(95)=1.5ms
     http_req_duration..............: avg=245ms  p(95)=512ms p(99)=856ms
     http_req_failed................: 1.48%
     http_req_receiving.............: avg=12ms   p(95)=45ms
     http_req_sending...............: avg=8ms    p(95)=12ms
     http_req_tls_handshaking.......: avg=0ms    p(95)=0ms
     http_req_waiting...............: avg=225ms  p(95)=455ms
     http_requests..................: 10000  83.33/sec
     iteration_duration.............: avg=1.25s  p(95)=2.1s
     iterations......................: 10000  83.33/sec
     vus............................: 1000   min=1000 max=1000
     vus_max........................: 1000   min=1000 max=1000
```

### Option 2: JSON Output

Export results for analysis:

```bash
k6 run tests/load/steady-state.js --out json=results.json
```

Analyze with jq:

```bash
# Average response time
jq '.data.samples[] | select(.metric == "http_req_duration") | .value' results.json | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'

# Error count
jq '.data.samples[] | select(.metric == "http_req_failed") | .value' results.json | \
  grep -c "true"

# P95 latency
jq '.data.samples[] | select(.metric == "http_req_duration") | .value' results.json | \
  sort -n | awk '{a[NR]=$1} END {print a[int(NR*0.95)]}'
```

### Option 3: InfluxDB + Grafana Integration

Stream results to InfluxDB for live dashboards:

```bash
k6 run --out influxdb=http://localhost:8086/lume tests/load/steady-state.js
```

## Performance Tuning Checklist

If test results show performance degradation:

### Database Optimization

1. **Missing Indexes**
   ```sql
   -- Check slow query log
   SHOW ENGINE INNODB STATUS;
   
   -- Add indexes if needed
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_pages_status_created ON website_pages(status, created_at);
   ```

2. **Connection Pool**
   ```javascript
   // backend/src/core/db/prisma.js
   const prisma = new PrismaClient({
     log: ['info'],
   });
   ```

### Application Tuning

1. **Enable Response Caching**
   ```javascript
   // backend/src/core/middleware/cacheControl.js
   res.setHeader('Cache-Control', 'public, max-age=300');
   ```

2. **Increase Worker Processes**
   ```bash
   # Use clustering in production
   NODE_CLUSTER_WORKERS=4 npm start
   ```

3. **Tune Buffer Sizes**
   ```bash
   # backend/.env
   BODY_PARSER_LIMIT=50mb
   QUERY_STRING_LIMIT=50000
   ```

### Infrastructure Scaling

1. **Database Connection Pooling**
   ```
   Current: 5-10 connections per instance
   Target: 20-50 connections (monitor RAM)
   ```

2. **Horizontal Scaling**
   ```
   Single instance limit: ~1000 req/sec
   Add load balancer and scale to 3-5 instances
   ```

## Interpreting Results

### Success Criteria Met

```
✓ P95 latency < 500ms
✓ P99 latency < 1000ms
✓ Error rate < 1%
✓ No memory leaks
✓ Consistent throughput
```

**Action:** System is production-ready. Monitor in production.

### P95/P99 Latency High

**Cause:** Database slow, missing indexes, connection pool exhausted

**Action:**
1. Check slow query log
2. Review query execution plans
3. Add missing indexes
4. Increase connection pool size

### Error Rate > 1%

**Cause:** Rate limiter, resource exhaustion, or infrastructure issue

**Action:**
1. Check error types (429=rate limit, 503=overload)
2. Increase infrastructure resources
3. Add caching layer
4. Optimize queries

### Memory Growth Over Time

**Cause:** Memory leak in application or dependencies

**Action:**
1. Enable heap snapshots during test
2. Use Node.js `--inspect` flag
3. Profile memory usage
4. Check for circular references

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Load Tests

on: [workflow_dispatch]

jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: gawdesy
          MYSQL_DATABASE: lume

    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: backend/tests/load/steady-state.js
          cloud: true
          
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: results.json
```

### GitLab CI Example

```yaml
load_test:
  image: grafana/k6:latest
  stage: test
  script:
    - k6 run backend/tests/load/steady-state.js --out json=results.json
  artifacts:
    paths:
      - results.json
    reports:
      performance: results.json
```

## Advanced Topics

### Custom Metrics

Track application-specific metrics:

```javascript
import { Counter, Trend, Gauge } from 'k6/metrics';

const pageCreationTime = new Trend('page_creation_time');
const activeUsers = new Gauge('active_users');
const spamReports = new Counter('spam_reports');

response = http.post('/api/website/pages', payload);
pageCreationTime.add(response.timings.duration);
```

### Dynamic Workloads

Simulate realistic user behavior:

```javascript
// User ramp-up (new users coming online)
const rampUp = Math.floor(__VU / 100);
sleepWithJitter(rampUp, 50);

// Peak hours (80% of traffic)
const isPeakHour = (new Date().getHours() >= 9 && new Date().getHours() <= 17);
const peakMultiplier = isPeakHour ? 1.5 : 1;
```

### Distributed Testing

Run tests across multiple machines:

```bash
# Machine 1
k6 run --vus 333 --duration 10m steady-state.js

# Machine 2
k6 run --vus 333 --duration 10m steady-state.js

# Machine 3
k6 run --vus 334 --duration 10m steady-state.js
```

## Troubleshooting

### "Connection Refused" Errors

**Cause:** Backend not running

**Solution:**
```bash
cd /opt/Lume/backend
npm run dev
```

### "Too many connections" Errors

**Cause:** Database connection pool exhausted

**Solution:**
```javascript
// Increase pool size in .env
DB_POOL_MIN=10
DB_POOL_MAX=50
```

### "RangeError: Maximum call stack size exceeded"

**Cause:** Recursive function or circular reference

**Solution:**
1. Check for infinite loops in test scripts
2. Verify proper setup/teardown
3. Increase Node.js stack size: `NODE_OPTIONS="--stack-size=4096"`

### "Cannot read property 'token' of undefined"

**Cause:** Login failed (invalid credentials)

**Solution:**
```bash
# Verify test user exists
npm run db:init

# Check credentials in config.js
```

## Best Practices

1. **Run tests in controlled environment**
   - Isolated staging server
   - No other processes running
   - Network isolated from production

2. **Warm up the system**
   - Run a quick test first
   - Let caches populate
   - Then run the actual test

3. **Test incrementally**
   - Start with spike-test (quick 10 min)
   - Move to steady-state (20 min)
   - Finally sustained-load (30+ min)

4. **Document results**
   - Save JSON output
   - Record system metrics
   - Track performance over time

5. **Baseline establishment**
   - Run tests on clean environment
   - Record baseline metrics
   - Compare new deployments against baseline

## References

- [k6 Official Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/load-testing/)
- [HTTP Benchmarking Guide](https://en.wikipedia.org/wiki/Software_performance_testing)
- [Load Testing Checklist](https://k6.io/open-source/load-testing-checklist)

## Support

For issues or questions:

1. Check k6 documentation
2. Review Lume framework docs
3. Open issue on project repository
4. Contact DevOps team

---

**Last Updated:** 2026-04-30  
**Lume Version:** 2.0+  
**k6 Version:** Latest
