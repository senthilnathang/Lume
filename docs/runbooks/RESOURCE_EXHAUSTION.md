# Incident Runbook: Resource Exhaustion

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Names** | Memory Usage > 90%, Disk Usage > 90%, CPU > 95% for 5 min |
| **Severity** | CRITICAL (P1) |
| **Response SLA** | 5 minutes |

---

## Immediate Actions (0-5 min)

### Step 1: Acknowledge Alert

### Step 2: Identify Which Resource

```bash
# Check memory
free -h
# Look for: Mem line, if Used close to Total → Memory issue

# Check disk
df -h /
# Look for: Use% column, if > 90% → Disk issue

# Check CPU
top -b -n 1 | head -15
# Look for: %CPU column, if > 95% → CPU issue
```

---

## Diagnosis (2-5 min)

### Memory Exhaustion

**Find process consuming memory:**

```bash
# Sort by memory usage
ps aux --sort=-%mem | head -20

# Look for node process consuming > 50% memory
# Example: node 45% RSS memory
```

**Find memory leak:**

```bash
# Check if memory increases over time
# Run command every minute for 5 minutes:
watch -n 60 'ps aux | grep node'

# If RSS grows: likely memory leak
# If RSS stable: normal operation or attack
```

**Diagnose with heap snapshot:**

```bash
# Start app with inspect flag
node --inspect dist/index.js &

# In browser, open: chrome://inspect
# Click "Inspect" on node process
# In DevTools: Memory → Take heap snapshot
# Sort by allocated size
# Look for: Arrays, Objects with unusual sizes
```

**Common memory leaks:**

```javascript
// Problem 1: Unbounded cache
const cache = {};
export function cacheData(key, value) {
  cache[key] = value;  // Never removed!
}

// Fix:
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });  // Auto-expire after 10 min

// Problem 2: Event listener leak
req.on('data', chunk => {
  processChunk(chunk);
});
// If handler never removes listener:
req.removeListener('data', handler);

// Problem 3: Growing array
export const requests = [];
app.use((req, res) => {
  requests.push(req);  // Never removed!
});

// Fix:
const requests = new LRU({ max: 1000 });  // Keep only 1000 most recent
```

### Disk Exhaustion

**Find what's using disk:**

```bash
# Top-level disk usage
du -sh /*

# In logs directory
du -sh logs/* | sort -rh | head -10

# Largest files
find / -type f -size +100M 2>/dev/null | head -20

# Check what's using inodes
df -i /
# If > 90%: Too many small files
```

**Solutions:**

```bash
# Clean up old log files
rm logs/*.1 logs/*.2 logs/*.3
# Or enable log rotation

# Clean up tmp files
rm -rf /tmp/*

# Clean up Docker
docker system prune -a  # Remove unused images

# Compress logs
gzip logs/*.log
# Reduces size by ~95%

# Move to external storage
# Or delete stale data from database
mysql -u gawdesy -p gawdesy -e "
  DELETE FROM audit_logs 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
"
```

### CPU Exhaustion

**Find process using CPU:**

```bash
# Real-time CPU usage
top -p $(pgrep -f "node.*index" | head -1)

# Watch for a minute
watch -n 1 top -p $(pgrep -f "node.*index" | head -1)

# If consistently > 95%: CPU-bound issue
```

**Identify CPU-bound code:**

```bash
# Enable profiling
node --prof dist/index.js &

# Generate isolate file after issue
# Then analyze:
node --prof-process isolate-*.log > processed.txt
head -50 processed.txt

# Look for: Functions taking longest time
```

**Common CPU issues:**

```javascript
// Problem 1: Synchronous heavy computation in request handler
app.get('/api/process', (req, res) => {
  const result = expensiveComputation();  // ← Blocks all requests!
  res.json(result);
});

// Fix:
app.get('/api/process', async (req, res) => {
  const result = await processInBackground();  // Queue as job
  res.json({ jobId: result.id });
});

// Problem 2: Infinite loop or recursion
function processTree(node) {
  if (node) {
    processTree(node.left);
    processTree(node.right);
    // Missing: Check for circular references!
  }
}

// Problem 3: Unbounded regex
const text = "aaa...aaa";  // 10MB string
text.match(/^(a+)+$/);  // Catastrophic backtracking!
```

---

## Mitigation (5-30 min)

### For Memory Exhaustion

**Option 1: Restart Application**

```bash
# Fastest mitigation
docker-compose restart lume-backend
# or
systemctl restart lume-backend
# or
pm2 restart lume-backend

# Wait 30 seconds for startup
sleep 30

# Verify memory is freed
free -h
```

**Option 2: Clear Caches**

If not restarting:

```javascript
// In application
export async function clearCaches() {
  // Clear all in-memory caches
  redisClient.flushdb();
  nodeCache.flushAll();
  
  logger.info('Caches cleared, memory should decrease');
}
```

Call via API:
```bash
curl -X POST http://localhost:3000/admin/clear-caches
```

**Option 3: Fix Memory Leak**

If you've identified the leak:

```javascript
// Example: Fix unbounded cache
import NodeCache from 'node-cache';
const cache = new NodeCache({ 
  stdTTL: 600,        // Expire after 10 minutes
  checkperiod: 60,    // Check every 60 seconds
  useClones: false    // Save memory
});

// Verify it works
setInterval(() => {
  const keys = cache.keys();
  console.log(`Cache size: ${keys.length}`);  // Should stay constant
}, 30000);
```

---

### For Disk Exhaustion

**Option 1: Clean Up Logs**

```bash
# Immediate action
rm logs/*.log.{1,2,3,4,5}  # Remove rotated logs

# Or compress
gzip logs/combined.log
# Typically reduces 100 MB → 2 MB

# How much space freed?
du -sh logs/
```

**Option 2: Enable Log Rotation**

```javascript
// In src/core/logger/winston.config.js
new winston.transports.File({
  filename: 'logs/combined.log',
  maxsize: 10485760,    // 10 MB per file
  maxFiles: 5,          // Keep 5 files (50 MB total)
  tailable: true,       // Log rotation
})
```

**Option 3: Delete Old Data**

```bash
# Find large tables
mysql -u gawdesy -p gawdesy -e "
  SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
  FROM information_schema.tables
  WHERE table_schema = 'lume'
  ORDER BY size_mb DESC
  LIMIT 10;
"

# Delete stale records
mysql -u gawdesy -p gawdesy -e "
  DELETE FROM audit_logs 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
"

# Reclaim space
mysql -u gawdesy -p gawdesy -e "OPTIMIZE TABLE audit_logs;"
```

**Option 4: Docker Cleanup**

```bash
# Remove unused images (saves GB)
docker images -a | grep "none" | awk '{print $3}' | xargs docker rmi

# Remove stopped containers
docker container prune -f

# Remove unused networks
docker network prune -f

# Total cleanup
docker system prune -a
```

---

### For CPU Exhaustion

**Option 1: Reduce Load**

```bash
# Enable rate limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW_MS=1000

# Disable expensive features
FEATURE_ANALYTICS=false
FEATURE_RECOMMENDATIONS=false
```

**Option 2: Scale Horizontally**

```bash
# Run 3 instances
docker-compose up -d --scale lume-backend=3 lume-backend

# Set up load balancing
docker-compose up -d nginx
```

**Option 3: Optimize Code**

If CPU issue is from loop:

```javascript
// BEFORE (processes 1M items, blocks CPU for 10 seconds)
const items = await db.query('SELECT * FROM items');
for (const item of items) {
  processItem(item);
}

// AFTER (processes in batches, yields to event loop)
const items = await db.query('SELECT * FROM items');
for (let i = 0; i < items.length; i++) {
  processItem(items[i]);
  
  // Yield to event loop every 100 items
  if (i % 100 === 0) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

// Or use worker threads for heavy computation
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-computation.js');
const result = await worker.computeAsync(data);
```

**Option 4: Kill Long-Running Process**

```bash
# Find process using CPU
ps aux --sort=-%cpu | head -5

# Check if it's legitimate
ps -p <PID> -o lstart=

# If rogue: kill it
kill -9 <PID>

# Restart application
systemctl restart lume-backend
```

---

## Verification

### Verify Resource is Freed

```bash
# Memory
free -h
# Used should decrease significantly

# Disk
df -h /
# Use% should decrease

# CPU
top -b -n 1 | grep node
# %CPU should drop to normal
```

### Monitor for Recurrence

```bash
# Watch metrics in Grafana
# Memory: Lume Backend → Memory Usage
# Disk: System → Disk Usage
# CPU: System → CPU Usage

# Check Prometheus:
# node_memory_MemAvailable_bytes
# node_filesystem_avail_bytes
# node_cpu_seconds_total
```

---

## Long-term Prevention

### 1. Memory Monitoring

```javascript
// src/core/monitoring/memory-monitor.js
setInterval(() => {
  const mem = process.memoryUsage();
  const heapUsedPercent = (mem.heapUsed / mem.heapTotal) * 100;
  
  logger.info('Memory usage', {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
    percent: heapUsedPercent.toFixed(1),
  });
  
  // Alert if > 80%
  if (heapUsedPercent > 80) {
    logger.warn('Heap usage high', { percent: heapUsedPercent });
    recordMetric('heap.usage.percent', heapUsedPercent);
  }
}, 30000);
```

### 2. Disk Monitoring

```javascript
// Check available disk space
import diskusage from 'diskusage';

setInterval(async () => {
  const info = await diskusage.check('/');
  const percentUsed = (info.used / info.total) * 100;
  
  recordMetric('disk.usage.percent', percentUsed);
  
  if (percentUsed > 80) {
    logger.warn('Disk usage high', { percentUsed });
  }
}, 60000);
```

### 3. CPU Monitoring

Add alert rule in Prometheus:

```yaml
- alert: HighCPUUsage
  expr: rate(node_cpu_seconds_total[5m]) > 0.95
  for: 5m
  severity: critical
  annotations:
    description: "CPU usage is {{ $value | humanizePercentage }}"
```

### 4. Automatic Memory Dump

```javascript
// On high memory, automatically create dump for later analysis
process.on('uncaughtException', (error) => {
  const memDump = {
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    error: error.message,
    stack: error.stack,
  };
  
  fs.writeFileSync(`memory-dump-${Date.now()}.json`, JSON.stringify(memDump));
  logger.error('Uncaught exception, memory dump created', memDump);
  
  // Graceful shutdown
  setTimeout(() => process.exit(1), 5000);
});
```

---

## Emergency Contacts

If resource exhaustion is severe (e.g., system down):

1. **Immediate:** Restart service (restarts free resources)
2. **5 min:** Page on-call engineer
3. **15 min:** Page team lead
4. **30 min:** Consider disabling non-critical features

---

## Related Runbooks

- **HIGH_ERROR_RATE.md**: Often caused by resource exhaustion
- **HIGH_LATENCY.md**: Can be symptom of exhausted resources
- **TROUBLESHOOTING.md**: Detailed resource debugging
