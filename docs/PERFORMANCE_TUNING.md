# Performance Tuning & Optimization Guide

**Status**: Post-launch optimization procedures  
**Date**: 2026-04-22  
**Audience**: DevOps, Backend Engineers, Database Administrators

---

## Performance Baseline

### Establish Baseline (First Week After Launch)

**Baseline Metrics** to capture:

```bash
# 1. Response times
curl -w "@curl-format.txt" -o /dev/null -s https://lume.dev/api/entities

# 2. Throughput
# Using load test script:
node scripts/load-test.js run --rps=100 --duration=300

# 3. Database metrics
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW STATUS LIKE '%query%';"

# 4. Memory profile
docker stats --no-stream | grep lume-prod

# 5. Resource utilization
docker exec lume-prod-backend top -bn1
```

**Create Performance Report**:
```markdown
# Baseline Performance Report (May 10, 2026)

## API Latency
- P50: 45ms
- P95: 280ms
- P99: 520ms
- Max: 1200ms

## Throughput
- Target RPS: 100
- Sustained RPS: 95
- Burst RPS: 120

## Resource Usage
- Backend CPU: 35% avg
- Backend Memory: 420MB avg (1GB max)
- Database CPU: 25% avg
- Database Memory: 800MB

## Database Performance
- Queries/sec: 2,500
- Slow queries: 0
- Connection count: 15 avg
- Lock waits: 0
```

---

## Weekly Optimization Tasks

### Monday Morning

```bash
#!/bin/bash
# 1. Review slow queries from weekend

docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;"

# Store top slow query
# Example: INSERT with default [json] takes 500ms

# 2. Check table fragmentation
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "
  SELECT 
    TABLE_NAME,
    ROUND(DATA_FREE / (1024*1024)) as fragmented_mb
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'lume'
  ORDER BY DATA_FREE DESC;
  "

# If >30% fragmented: OPTIMIZE TABLE

# 3. Review error logs
docker logs lume-prod-backend --since 7d 2>&1 | \
  grep -i error | wc -l
# Should be <100 errors/week

# 4. Check space usage
du -sh /var/lib/mysql/*

# 5. Create optimization ticket if needed
```

### Daily Checks

```bash
#!/bin/bash
# Quick 5-minute daily health check

echo "=== Database Health ==="
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW STATUS LIKE 'Threads%';"

echo "=== Top Connections ==="
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW PROCESSLIST;" | head -10

echo "=== Replication Status ==="
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW SLAVE STATUS\G" | grep -E "Seconds_Behind|Last_Error"

echo "=== Disk Usage ==="
df -h /var/lib/mysql | tail -1

echo "=== Memory Usage ==="
docker exec lume-prod-backend free -h | grep Mem
```

---

## Database Optimization

### Query Optimization

**Identify Slow Queries**:

```bash
# Enable slow query logging
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SET GLOBAL slow_query_log = 'ON';"

docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SET GLOBAL long_query_time = 0.5;"

# Let it run for 1 hour, then review
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 20;"
```

**Optimize Query** (Example):

```sql
-- Slow query
SELECT * FROM entity_records 
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
AND data->>'$.status' = 'active';
-- Query time: 1200ms

-- Add index
ALTER TABLE entity_records 
ADD INDEX idx_status_created (data->>'$.status', created_at);

-- Test again
-- Query time: 45ms (26x faster!)
```

**Common Optimization Patterns**:

```sql
-- 1. Index for filtering
CREATE INDEX idx_field ON table_name(field);

-- 2. Index for ordering
CREATE INDEX idx_field ON table_name(field ASC);

-- 3. Composite index
CREATE INDEX idx_multi ON table_name(field1, field2);

-- 4. Prefix index for JSON
CREATE INDEX idx_json ON table_name((JSON_EXTRACT(data, '$.field')));

-- 5. Full text search
CREATE FULLTEXT INDEX idx_text ON table_name(text_column);
```

### Table Optimization

```bash
# 1. Analyze table structure
ANALYZE TABLE entity_records;

# 2. Rebuild table (if fragmented >30%)
OPTIMIZE TABLE entity_records;
# This locks table during rebuild - do during off-peak

# 3. Update statistics
ANALYZE TABLE entity_records;

# 4. Check for unused indexes
SELECT * FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'lume'
AND SEQ_IN_INDEX = 1
ORDER BY STAT_VALUE DESC;

# Drop unused indexes
ALTER TABLE entity_records DROP INDEX idx_unused;
```

### Connection Pool Tuning

**Current Settings** (docker-compose.prod.yml):
```
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=30
```

**Tune Based on Usage**:

```bash
# Check current connection count
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW STATUS LIKE 'Threads_connected';"

# If approaching max (>25):
# Increase pool max
# DATABASE_POOL_MAX=50

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend

# Monitor for improvement
# Check error rate: should decrease
```

**Connection Pool Benchmarks**:
```
Light load (< 50 RPS):        Min=5,   Max=15
Medium load (50-200 RPS):      Min=10,  Max=30
Heavy load (200-500 RPS):      Min=20,  Max=50
Extreme load (500+ RPS):       Min=30,  Max=100
```

---

## Backend Optimization

### Node.js Memory Tuning

**Current**: `NODE_OPTIONS="--max-old-space-size=512"`

**Monitor Memory**:
```bash
# Check current usage
docker stats lume-prod-backend --no-stream

# If using >80% of allocated memory:
# Increase heap size
NODE_OPTIONS="--max-old-space-size=1024"

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

**Memory Leak Detection**:
```bash
# Monitor memory growth over time
watch -n 60 'docker stats lume-prod-backend --no-stream | grep -oP "\\d+\\.\d+MB"'

# If steadily increasing:
# Look for:
# - Unclosed database connections
# - Growing caches
# - Event listeners not cleaned up
```

### Application Code Optimization

**Profile Code**:
```javascript
// Add timing measurements
console.time('query-records');
const records = await recordService.listRecords(...);
console.timeEnd('query-records');
// Output: query-records: 125.5ms
```

**Cache Common Operations**:
```javascript
// Before: Queries DB every time
async function getEntity(id) {
  return await prisma.entity.findUnique({where: {id}});
}

// After: Cache with TTL
const entityCache = new Map();
async function getEntity(id) {
  if (entityCache.has(id)) {
    return entityCache.get(id);
  }
  const entity = await prisma.entity.findUnique({where: {id}});
  entityCache.set(id, entity);
  setTimeout(() => entityCache.delete(id), 60000); // 1min TTL
  return entity;
}
```

---

## Caching Strategy

### HTTP Caching (Nginx)

**Current**: 100MB cache zone, 10GB max

**Cache Configuration** (nginx.prod.conf):
```
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=lume_cache:100m max_size=10g;
proxy_cache_valid 200 10m;          # Cache 200 responses for 10 min
proxy_cache_valid 404 1m;           # Cache 404 for 1 min
proxy_cache_valid 500 0s;           # Don't cache 500 errors
```

**Monitor Cache** (Prometheus query):
```
# Cache hit ratio
sum(rate(nginx_cache_hits_total[5m])) / sum(rate(nginx_cache_requests_total[5m]))
# Target: >70% hit ratio
```

**Optimize Caching**:
```
Low cache hit? (< 50%)
├─ Increase cache key size (more time until eviction)
├─ Cache GET /entities (rarely changes)
├─ Cache user profile data
└─ Use Cache-Control headers in API response

High memory usage from cache?
├─ Reduce cache max size (10GB → 5GB)
├─ Decrease TTL (10min → 5min)
└─ Reduce cache key size
```

### Redis Caching (Application)

**Use Redis for**:
- Frequently accessed objects (entities, views)
- User sessions
- Temporary data (job results)

**Implementation**:
```javascript
// Check Redis first
const cached = await redis.get(`entity:${id}`);
if (cached) return JSON.parse(cached);

// Fetch from DB if not cached
const entity = await db.getEntity(id);

// Store in Redis with TTL
await redis.setex(`entity:${id}`, 300, JSON.stringify(entity)); // 5 min TTL

return entity;
```

---

## Load Balancing & Scaling

### Current Setup

```
Nginx → 3x Backend Replicas
Each replica: 512MB memory, 1 CPU
```

### When to Scale Up

**Metrics that trigger scaling**:

```
CPU Usage > 80% for 5+ minutes
├─ Add backend replica
└─ Monitor CPU drops

Memory Usage > 85% for 5+ minutes
├─ Increase Node memory limit
├─ Add backend replica
└─ Profile for memory leaks

P95 Latency > 1000ms for 5+ minutes
├─ Add backend replica
├─ Optimize slow query
└─ Check database connection pool

Connection Pool > 80% for 5+ minutes
├─ Increase pool max
├─ Add database replica
└─ Review for connection leaks
```

### Scaling Procedure

**Add Backend Replica**:
```bash
# In docker-compose.prod.yml, change:
deploy:
  replicas: 3    # Change to 4

# Apply scaling
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps | grep backend
# Should show 4 instances

# Monitor
# Check if metrics improve
```

**Add Database Replica** (Read-Only):
```bash
# 1. Create replica database instance
docker run -d \
  --name lume-prod-db-replica \
  -e MYSQL_ROOT_PASSWORD=... \
  mysql:8.0

# 2. Configure replication
# [Database replication setup]

# 3. Update backend to use replica for reads
DATABASE_REPLICA_URL=mysql://... # Add for read queries

# 4. Verify replication
SHOW SLAVE STATUS\G;
# Check: Seconds_Behind_Master should be 0
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

```
1. Response Time (P95)
   Target: < 500ms
   Alert: > 1000ms
   Action: Scale up, optimize queries

2. Error Rate
   Target: < 0.1%
   Alert: > 1%
   Action: Check logs, rollback if recent deploy

3. Database CPU
   Target: < 50%
   Alert: > 80%
   Action: Add index, scale replica

4. Memory Usage
   Target: < 70%
   Alert: > 85%
   Action: Profile leaks, restart, scale

5. Connection Pool
   Target: < 60%
   Alert: > 80%
   Action: Increase pool, check leaks

6. Disk Space
   Target: > 20% free
   Alert: < 15% free
   Action: Cleanup logs, archive data, expand

7. Cache Hit Ratio
   Target: > 70%
   Alert: < 50%
   Action: Review cache strategy
```

### Grafana Dashboard Setup

**Create custom dashboard**:
1. Open Grafana: https://lume.dev/grafana
2. New dashboard
3. Add panels for:
   - P95 latency (time series)
   - Error rate (graph)
   - Database CPU (gauge)
   - Memory usage (gauge)
   - Cache hit ratio (stat)

---

## Capacity Planning

### Growth Projections

**Based on entity data**:
```
Week 1: 24 entities, 15K records
Week 2: 48 entities, 50K records
Week 4: 96 entities, 250K records
Month 3: 192 entities, 1M records
```

**Resource Growth**:
```
Database Size:
  Week 1: 50MB
  Month 1: 200MB
  Month 3: 500MB
  Target: Keep < 10GB

Memory Usage:
  Week 1: 30% (150MB/512MB)
  Month 1: 50% (250MB/512MB)
  Month 3: 70% (350MB/512MB)
  Action: Increase to 1GB if approaching 80%

CPU Usage:
  Week 1: 20% avg
  Month 1: 40% avg
  Month 3: 60% avg
  Action: Add replica if approaching 80%
```

### Planning Future Growth

**Estimate when to scale**:
```
Current:    3 backend replicas, 30 max connections
Week 4:     Add 4th replica when P95 > 500ms
Month 2:    Add database replica for read scaling
Month 3:    Consider database sharding if > 1M records
```

---

## Production Optimization Checklist

**Weekly**:
- [ ] Review slow query log
- [ ] Check disk space usage
- [ ] Monitor error rate
- [ ] Check cache hit ratio

**Monthly**:
- [ ] Capacity planning review
- [ ] Performance report generation
- [ ] Index optimization review
- [ ] Database statistics update

**Quarterly**:
- [ ] Full performance audit
- [ ] Load testing with production data
- [ ] Architecture review for scaling
- [ ] Dependency updates and security patches

---

**Performance is a continuous process. Monitor, measure, optimize!**

