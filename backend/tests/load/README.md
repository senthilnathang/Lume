# k6 Load Testing Suite for Lume Framework

This directory contains load testing scenarios using k6 for performance validation and capacity planning.

## Quick Start

### 1. Install k6

```bash
# macOS
brew install k6

# Linux (Ubuntu/Debian)
sudo apt-get install k6

# Full setup: see ../../../docs/LOAD_TESTING_GUIDE.md
```

### 2. Start Lume Backend

```bash
cd /opt/Lume/backend
npm install
npm run dev
```

Initialize database with test data:

```bash
npm run db:init
```

### 3. Run a Test

```bash
# Steady-state load test (20 minutes total)
k6 run steady-state.js

# Spike test (10 minutes)
k6 run spike-test.js

# Ramp-up test (8 minutes)
k6 run ramp-up.js

# Sustained load test (30 minutes)
k6 run sustained-load.js
```

## Test Scenarios

### 1. steady-state.js
**Duration:** ~13 minutes (2m ramp + 10m steady + 1m down)  
**Load:** 1000 concurrent users (~5000 req/sec)  
**Purpose:** Validate performance under constant sustainable load

```bash
k6 run steady-state.js
```

**Expected Results:**
- P95 latency < 500ms
- Error rate < 1%
- Throughput ≥ 800 req/sec

### 2. spike-test.js
**Duration:** ~10 minutes  
**Load:** 100 → 500 users (5x spike) → 100 users  
**Purpose:** Test system's ability to handle traffic spikes

```bash
k6 run spike-test.js
```

**Expected Results:**
- Error rate spike < 5% during peak
- Recovery < 2 minutes to normal error rate
- P95 latency during spike < 2000ms

### 3. ramp-up.js
**Duration:** ~8 minutes  
**Load:** 10 → 1000 users (incremental)  
**Purpose:** Identify system capacity limits

```bash
k6 run ramp-up.js
```

**Expected Results:**
- Identifies knee point of latency increase
- Error rate remains < 10% until breaking point
- Typical capacity: 600-1000 req/sec

### 4. sustained-load.js
**Duration:** ~34 minutes (2m ramp + 30m steady + 2m down)  
**Load:** 200 concurrent users (~1000 req/sec)  
**Purpose:** Detect memory leaks and long-term stability issues

```bash
k6 run sustained-load.js
```

**Expected Results:**
- Latency stable throughout (< 10% variation)
- Error rate steady < 1%
- No memory growth > 50MB
- GC pauses < 100ms

## Common Commands

### Run with Custom Settings

```bash
# Set base URL
k6 run steady-state.js --env BASE_URL=http://staging.example.com

# Save results
k6 run spike-test.js --out json=results.json

# Run with specific VU count
k6 run ramp-up.js --vus 500 --duration 5m

# Combine options
k6 run steady-state.js --out json=results.json --env BASE_URL=http://localhost:3000
```

### Analyze Results

```bash
# View summary
k6 run spike-test.js --summary-export=summary.json

# Stream to InfluxDB
k6 run steady-state.js --out influxdb=http://localhost:8086/lume

# Multiple outputs
k6 run ramp-up.js --out json=results.json --out cloud
```

## File Structure

```
tests/load/
├── config.js              # Shared configuration and helpers
├── steady-state.js        # Constant load test (1000 VUs)
├── spike-test.js          # Traffic spike test (100 → 500 VUs)
├── ramp-up.js             # Capacity identification (10-1000 VUs)
├── sustained-load.js      # Long-running stability test (200 VUs, 30m)
└── README.md              # This file
```

## Configuration

### Shared Helpers (config.js)

All tests use shared utilities:

```javascript
import {
  BASE_URL,                  // 'http://localhost:3000'
  API_URL,                   // BASE_URL + '/api'
  getAuthToken,             // Login and return JWT
  getAuthHeaders,           // Return auth headers
  randomString,             // Generate random string
  generatePagePayload,      // Create test page data
  checkResponse,            // Validate HTTP response
  sleepWithJitter,          // Realistic think time
  METRICS_THRESHOLDS,       // Performance targets
  setupTest,                // Initialize test
  teardownTest              // Cleanup after test
} from './config.js';
```

### API Endpoints Tested

- `GET /api/users` - List users (read-heavy)
- `GET /api/website/pages` - List pages (moderate)
- `GET /api/base/search` - Complex search (database intensive)
- `POST /api/website/pages` - Create pages (write-heavy)
- `GET /health` - System health (baseline)

### Test User Account

All tests use:
- **Email:** `admin@lume.dev`
- **Password:** `admin123`

Created automatically by `npm run db:init`

## Performance Metrics

### Key Metrics Tracked

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| P95 Latency | < 500ms | 95% of requests complete within |
| P99 Latency | < 1000ms | 99% of requests complete within |
| Error Rate | < 1% | Percentage of failed requests |
| Throughput | ≥ 800 req/sec | Requests per second |
| Connection Time | < 1000ms | TCP connection establishment |

### Interpreting Results

**Good Results:**
- Latencies increase gradually with load
- Error rate stays < 1% until breaking point
- Recovery is quick after load decrease

**Warning Signs:**
- Sudden latency spike (indexing issue)
- Error rate jumps without proportional load change (resource exhaustion)
- Latency increases after ramp-down (memory leak)
- Increasing tail latency (P99 > P95 + 2x)

## Troubleshooting

### "Connection Refused"
```bash
# Backend not running?
cd /opt/Lume/backend && npm run dev
```

### "Cannot find module 'k6'"
```bash
# k6 not installed?
brew install k6  # macOS
sudo apt-get install k6  # Linux
```

### "Authentication failed"
```bash
# Test user doesn't exist?
cd /opt/Lume/backend && npm run db:init
```

### "Too many connections"
```bash
# Database connection pool exhausted
# Reduce load or increase pool size in .env
DB_POOL_MAX=50
```

### Memory Issues During Test
```bash
# Monitor Node.js memory
node --max-old-space-size=4096 src/index.js

# Or check system resources
watch -n 1 'free -h && ps aux | grep node'
```

## Advanced Usage

### Custom Metrics

Track application-specific metrics:

```javascript
import { Counter, Trend } from 'k6/metrics';

const pageCreationTime = new Trend('page_creation_time');

response = http.post('/api/website/pages', payload);
pageCreationTime.add(response.timings.duration);
```

### Distributed Testing

Run load test across multiple machines:

```bash
# Machine 1: 333 VUs
k6 run ramp-up.js --vus 333

# Machine 2: 333 VUs
k6 run ramp-up.js --vus 333

# Machine 3: 334 VUs
k6 run ramp-up.js --vus 334

# Total: 1000 VUs
```

### CI/CD Integration

```yaml
# .github/workflows/load-test.yml
name: Load Tests
on: [workflow_dispatch]
jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: backend/tests/load/steady-state.js
```

## Documentation

For detailed setup, interpretation, and best practices, see:

📖 **[LOAD_TESTING_GUIDE.md](../../../docs/LOAD_TESTING_GUIDE.md)**

Topics covered:
- Full k6 installation guide
- Detailed test scenario explanations
- Performance tuning checklist
- Memory leak detection
- Database optimization
- Distributed testing
- CI/CD integration examples
- Troubleshooting advanced issues

## Resources

- [k6 Official Docs](https://k6.io/docs/)
- [HTTP Load Testing](https://k6.io/docs/testing-guides/load-testing/)
- [Performance Best Practices](https://k6.io/open-source/)

## Support

For issues or questions:
1. Check [LOAD_TESTING_GUIDE.md](../../../docs/LOAD_TESTING_GUIDE.md)
2. Review test files for examples
3. Check k6 documentation
4. Review backend logs during test

---

**Last Updated:** 2026-04-30  
**Lume Version:** 2.0+
