# Incident Runbook: Database Performance Degradation

## Quick Reference

| Property | Value |
|----------|-------|
| **Alert Name** | Slow Database Queries (p95 > 500ms) |
| **Alert Condition** | Database query p95 > 500ms for 5 minutes |
| **Severity** | HIGH (P2) |
| **Response SLA** | 15 minutes |

---

## Immediate Actions (0-5 min)

### Step 1: Acknowledge Alert

### Step 2: Verify Database Health

```bash
# Check MySQL is running
mysql -u gawdesy -p gawdesy -e "SELECT 1;"
# Should return: 1

# Check active connections
mysql -u gawdesy -p gawdesy -e "SHOW STATUS LIKE 'Threads%';"

# Check for connection pool exhaustion
mysql -u gawdesy -p gawdesy -e "SHOW STATUS LIKE 'max_connections%';"
```

### Step 3: Find Slow Query

```bash
# Get slowest queries
mysql -u gawdesy -p gawdesy -e "SHOW PROCESSLIST;" | head -20

# Or use slow query log
mysql -u gawdesy -p gawdesy -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 5;"
```

---

## Diagnosis (5-15 min)

### Find the Slow Query

**From Jaeger traces:**

1. Open Jaeger: http://localhost:16686
2. Service: lume-backend
3. Search: `db.duration > 500`
4. Click on trace with slowest span
5. Click on db.query span
6. View Tags → `db.statement` (the SQL)

**From slow query log:**

```bash
# Enable if not already on
mysql -u gawdesy -p gawdesy -e "SET GLOBAL slow_query_log = 'ON';"
mysql -u gawdesy -p gawdesy -e "SET GLOBAL long_query_time = 0.1;"

# View slow queries
mysql -u gawdesy -p gawdesy -e "
  SELECT * FROM mysql.slow_log 
  WHERE query_time > 0.5 
  ORDER BY query_time DESC 
  LIMIT 10;
"

# Or from file
tail -50 /var/log/mysql/slow.log | grep "Query_time"
```

### Analyze the Query

```bash
# Copy the slow query, then:
mysql -u gawdesy -p gawdesy -e "EXPLAIN <query> \G"

# Look for:
# - type: ALL (full table scan) ← BAD
# - rows: large number ← BAD
# - Using temporary ← BAD
# - Using filesort ← BAD
# - key: NULL ← BAD (not using index)
```

### Check Indexes

```bash
# View all indexes on table
mysql -u gawdesy -p gawdesy -e "SHOW INDEX FROM users \G"

# Check which columns are used in WHERE clause
# If no index on WHERE column, that's the problem
```

---

## Mitigation (5-30 min)

### Option 1: Add Missing Index

**Identify missing index:**

```bash
# Example slow query:
# SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC

# Check: Is there an index on status?
mysql -u gawdesy -p gawdesy -e "SHOW INDEX FROM users;" | grep status
# If empty, no index

# Create index
mysql -u gawdesy -p gawdesy -e "
  CREATE INDEX idx_users_status_created 
  ON users(status, created_at DESC);
"

# Verify it was created
mysql -u gawdesy -p gawdesy -e "SHOW INDEX FROM users \G" | grep status
```

**Before/after comparison:**

```bash
# Before
mysql -u gawdesy -p gawdesy -e "SELECT COUNT(*) FROM users WHERE status='active';"
# real    0m2.340s

# After
mysql -u gawdesy -p gawdesy -e "SELECT COUNT(*) FROM users WHERE status='active';"
# real    0m0.015s
```

---

### Option 2: Optimize Query

**N+1 Pattern:**

```javascript
// BEFORE (N+1)
const users = await db.query('SELECT * FROM users LIMIT 10');
for (const user of users) {
  user.team = await db.query('SELECT * FROM teams WHERE id = ?', [user.team_id]);
}

// AFTER (JOIN)
const users = await db.query(`
  SELECT u.*, t.* 
  FROM users u 
  LEFT JOIN teams t ON u.team_id = t.id 
  LIMIT 10
`);
```

**Unnecessary Columns:**

```javascript
// BEFORE (fetches all columns)
const users = await db.query('SELECT * FROM users');

// AFTER (fetch only needed columns)
const users = await db.query('SELECT id, name, email FROM users');
```

**Large Result Sets:**

```javascript
// BEFORE (might return 1M rows)
const products = await db.query('SELECT * FROM products');

// AFTER (paginate)
const products = await db.query('SELECT * FROM products LIMIT 0, 50');
```

---

### Option 3: Update Statistics

```bash
# MySQL table statistics might be stale
mysql -u gawdesy -p gawdesy -e "ANALYZE TABLE users;"
mysql -u gawdesy -p gawdesy -e "ANALYZE TABLE teams;"
mysql -u gawdesy -p gawdesy -e "ANALYZE TABLE products;"

# Verify optimizer uses updated stats
mysql -u gawdesy -p gawdesy -e "EXPLAIN <query> \G"
# Should now use index instead of full scan
```

---

### Option 4: Kill Long-Running Queries

**If query is blocking others:**

```bash
# Find queries running > 30 seconds
mysql -u gawdesy -p gawdesy -e "
  SELECT id, user, time, state, info 
  FROM information_schema.PROCESSLIST 
  WHERE time > 30 
  ORDER BY time DESC;
"

# Kill specific query
mysql -u gawdesy -p gawdesy -e "KILL QUERY 123;"

# Or kill connection
mysql -u gawdesy -p gawdesy -e "KILL CONNECTION 123;"

# Emergency: Kill all non-system connections
mysql -u gawdesy -p gawdesy -e "
  SELECT CONCAT('KILL ', id, ';') 
  FROM information_schema.PROCESSLIST 
  WHERE user != 'system user' AND time > 60;
" | mysql -u gawdesy -p gawdesy
```

---

### Option 5: Reduce Query Complexity

**Example: Too many JOINs**

```javascript
// BEFORE (10 table joins - might be slow)
const result = await db.query(`
  SELECT u.*, t.*, p.*, c.*, o.*, i.*, s.*, r.*, d.*, n.*
  FROM users u
  JOIN teams t ON u.team_id = t.id
  JOIN projects p ON t.id = p.team_id
  JOIN clients c ON p.client_id = c.id
  JOIN orders o ON c.id = o.client_id
  JOIN invoices i ON o.id = i.order_id
  JOIN shipments s ON i.id = s.invoice_id
  JOIN returns r ON s.id = r.shipment_id
  JOIN documents d ON r.id = d.return_id
  JOIN notes n ON d.id = n.document_id
  WHERE u.id = 123
`);

// AFTER (fetch in steps)
const user = await db.query('SELECT * FROM users WHERE id = 123');
const team = await db.query('SELECT * FROM teams WHERE id = ?', [user.team_id]);
const projects = await db.query('SELECT * FROM projects WHERE team_id = ?', [team.id]);
// ... continue as needed

// Or use application-level JOIN logic
```

---

### Option 6: Enable Query Cache (MySQL 5.7 only)

```bash
# Check if query cache is available (MySQL 5.7 or older)
mysql -u gawdesy -p gawdesy -e "SHOW VARIABLES LIKE 'query_cache%';"

# Enable query cache
mysql -u gawdesy -p gawdesy -e "SET GLOBAL query_cache_size = 268435456;"  # 256MB

# Verify
mysql -u gawdesy -p gawdesy -e "SHOW VARIABLES LIKE 'query_cache_size';"
```

Note: Query cache removed in MySQL 8.0. Use application caching instead.

---

## Verification

### Verify Fix Applied

```bash
# Re-run the problematic query
time mysql -u gawdesy -p gawdesy -e "SELECT COUNT(*) FROM users WHERE status='active';"

# Should be much faster (< 100ms for indexed query)
```

### Check Metrics Improved

```promql
# Database query duration
histogram_quantile(0.95, rate(lume_db_query_duration_seconds_bucket[5m]))
# Should drop from 500ms+ to < 100ms

# Query rate
rate(lume_db_queries_total[1m])
# Should be consistent (if dropped, query was cached)
```

---

## Long-term Improvements

### 1. Index Strategy

```bash
# Audit existing indexes
mysql -u gawdesy -p gawdesy -e "
  SELECT 
    OBJECT_SCHEMA, 
    OBJECT_NAME, 
    INDEX_NAME, 
    STAT_NAME, 
    STAT_VALUE 
  FROM performance_schema.table_io_waits_by_index_usage 
  WHERE OBJECT_SCHEMA != 'mysql' 
  ORDER BY COUNT_STAR DESC;
"

# This shows which indexes are actually used
# Remove unused indexes to improve INSERT/UPDATE performance
```

### 2. Query Optimization Checklist

Create code-review guidelines:

```markdown
## Database Query Review Checklist

- [ ] Query has WHERE clause with indexed columns
- [ ] Large result sets are paginated
- [ ] No N+1 query pattern (loop of queries)
- [ ] Uses JOIN instead of application loop
- [ ] SELECT only needed columns (not *)
- [ ] ORDER BY uses indexed column
- [ ] No GROUP BY on non-indexed column
- [ ] Tested with EXPLAIN PLAN
- [ ] Query time < 500ms on normal data size
```

### 3. Monitoring

```javascript
// Add slow query alert
if (queryTime > 500) {
  logger.warn('Slow query detected', {
    query: sanitizedQuery,
    duration: queryTime,
    threshold: 500,
    stack: new Error().stack,
  });
  
  recordMetric('db.slow_query', 1, {
    table: extractTable(query),
  });
}
```

### 4. Load Testing

```bash
# Simulate production load
artillery run load-test.yml

# Monitor database metrics during test
# - Query time should stay < 500ms
# - No lock timeouts
# - Connection pool not exhausted
```

---

## Emergency: Database Down

If database completely unavailable:

```bash
# Check if MySQL is running
ps aux | grep mysql

# Restart MySQL
systemctl restart mysql
# or
docker restart mysql

# Wait 30 seconds for startup
sleep 30

# Check status
mysql -u gawdesy -p gawdesy -e "SELECT 1;"
```

---

## Prevention Measures

### 1. Automated Index Recommendations

```javascript
// Auto-detect missing indexes from slow query log
export async function suggestIndexes() {
  const slowQueries = await getSlowQueries();
  
  for (const query of slowQueries) {
    const table = extractTableName(query);
    const whereColumns = extractWhereColumns(query);
    
    for (const column of whereColumns) {
      const hasIndex = await checkIndexExists(table, column);
      if (!hasIndex) {
        console.log(`Suggest: CREATE INDEX idx_${table}_${column} ON ${table}(${column});`);
      }
    }
  }
}
```

### 2. Pre-deployment Performance Test

```javascript
// tests/integration/database-performance.test.js
describe('Database Performance', () => {
  it('critical queries should complete in < 500ms', async () => {
    const queries = [
      'SELECT * FROM users WHERE status="active"',
      'SELECT * FROM products WHERE category_id = 1 LIMIT 50',
      'SELECT u.*, t.* FROM users u JOIN teams t ON u.team_id = t.id',
    ];

    for (const query of queries) {
      const start = Date.now();
      await db.query(query);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    }
  });
});
```

### 3. Connection Pool Monitoring

```javascript
// Monitor pool utilization
setInterval(() => {
  const pool = db.getPool();
  const free = pool._freeConnections.length;
  const total = pool.config.connectionLimit;
  const utilized = total - free;
  
  recordMetric('db.connections.utilized', utilized, { total });
  
  if (utilized > total * 0.8) {
    logger.warn('Database connection pool approaching limit', {
      utilized,
      total,
      percentUtilized: (utilized / total * 100).toFixed(1),
    });
  }
}, 30000);
```

---

## Related Runbooks

- **HIGH_LATENCY.md**: When application latency is high (may be database-related)
- **RESOURCE_EXHAUSTION.md**: When database connections/memory exhausted
- **TROUBLESHOOTING.md**: General troubleshooting
