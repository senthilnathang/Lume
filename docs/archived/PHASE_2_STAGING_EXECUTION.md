# Phase 2 — Staging Migration Execution Guide

**Status**: Ready to Execute  
**Date**: 2026-04-22  
**Environment**: Staging (docker-compose.staging.yml)

---

## Pre-Execution Checklist

### 1. Verify Staging Environment

```bash
# Start staging services
docker-compose -f docker-compose.staging.yml up -d

# Wait 30 seconds for health checks
sleep 30

# Check all services
docker-compose -f docker-compose.staging.yml ps
# Expected: All 7 services "Up (healthy)"
```

**Services Expected**:
- ✓ MySQL (port 3307)
- ✓ Redis (port 6380)
- ✓ Backend (port 3001)
- ✓ Frontend (port 8081)
- ✓ Nginx (port 8082)
- ✓ Prometheus (port 9091)
- ✓ Bull Board (port 3002)

### 2. Clone Production Database to Staging

```bash
# Create backup directory
mkdir -p /tmp/lume-migration

# From current environment (assumes prod DB running)
docker-compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p'gawdesy' \
  --single-transaction \
  --quick \
  lume > /tmp/lume-migration/lume_prod_clone.sql

# Verify backup file
ls -lh /tmp/lume-migration/lume_prod_clone.sql
# Expected: Size > 1MB (actual database size)
```

### 3. Restore to Staging Database

```bash
# Restore to staging MySQL
docker-compose -f docker-compose.staging.yml exec -T mysql \
  mysql -u root -p'gawdesy' lume < /tmp/lume-migration/lume_prod_clone.sql

# Verify data was restored
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "SELECT COUNT(*) as total_tables FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='lume';"
```

**Expected Output**: Row count of legacy tables (activities, api_keys, attachments, etc.)

### 4. Verify Entity Builder Tables Exist

```bash
# Check entity tables created in staging
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA='lume' 
  AND TABLE_NAME IN ('entities', 'entity_fields', 'entity_views', 'entity_records')
  ORDER BY TABLE_NAME;
  "
```

**Expected Output**: All 4 tables present

---

## Migration Execution

### Step 1: Pre-Migration Validation (10 min)

```bash
# Count legacy tables
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT COUNT(*) as legacy_table_count 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA='lume'
  AND TABLE_NAME NOT LIKE 'entity_%'
  AND TABLE_NAME NOT IN ('users', 'roles', 'permissions', 'role_permissions', 'settings', 'audit_logs', 'installed_modules', 'menu', 'groups', 'record_rules', 'sequences');
  "
```

**Save this number as**: `LEGACY_TABLE_COUNT`

### Step 2: Run Migration Script (15-30 min)

```bash
cd /opt/Lume

# Run migration with logging
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run \
  2>&1 | tee /tmp/lume-migration/migration_output.log

# Expected output pattern:
# [timestamp] INFO: Starting entity schema migration
# [timestamp] INFO: Discovered X legacy entity tables
# [timestamp] INFO: Migrated entity: [table_name]
# [timestamp] INFO: Migration complete
```

**Watch for**:
- ✓ Entities created count matches `LEGACY_TABLE_COUNT`
- ✓ No ERROR lines (warnings are OK)
- ✓ Final summary shows completion

### Step 3: Validate Migration (10-15 min)

```bash
# Run validation script
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js \
  2>&1 | tee /tmp/lume-migration/validation_output.log
```

**Expected validation results**:
```
✓ Entity count matches legacy table count
✓ Record count preserved
✓ All field types valid
✓ No orphaned relationships
✓ Audit trail complete
✓ Company scoping intact
✓ Soft deletes preserved
✓ Field permissions valid
✓ Data integrity check passed
```

**If any ✗ errors appear**: 
- Review error details in log
- May need data cleanup in legacy tables
- Do NOT proceed to UAT until all checks pass

### Step 4: Verify Data in Entities

```bash
# Check entity count
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT COUNT(*) as entity_count FROM entities;
  "

# Check record count
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT COUNT(*) as total_records FROM entity_records;
  "

# Check field count
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT COUNT(*) as total_fields FROM entity_fields;
  "
```

**Expected**: 
- Entities ≈ LEGACY_TABLE_COUNT
- Records should match sum of all legacy table rows
- Fields should be significant (multiple per entity)

---

## UAT Execution (2-3 days)

### Test 1-5: Entity Management

```bash
# Using staging API (port 3001)
STAGING_API="http://localhost:3001/api"

# 1. List all entities
curl -X GET \
  -H "Authorization: Bearer [staging-token]" \
  $STAGING_API/entities
# Expected: 200 OK, array of entity objects

# 2. Get single entity with fields
curl -X GET \
  -H "Authorization: Bearer [staging-token]" \
  $STAGING_API/entities/1
# Expected: 200 OK, entity with fields array

# 3. Create new entity
curl -X POST \
  -H "Authorization: Bearer [staging-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_entity",
    "label": "Test Entity",
    "description": "UAT test"
  }' \
  $STAGING_API/entities
# Expected: 201 Created, returns entity object
```

### Test 6-10: Record Operations

```bash
# 1. Create record
curl -X POST \
  -H "Authorization: Bearer [staging-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": 1,
    "data": {
      "field1": "value1",
      "field2": "value2"
    }
  }' \
  $STAGING_API/entities/1/records
# Expected: 201 Created

# 2. List records
curl -X GET \
  -H "Authorization: Bearer [staging-token]" \
  "$STAGING_API/entities/1/records?page=1&limit=20"
# Expected: 200 OK, paginated records

# 3. Filter records
curl -X GET \
  -H "Authorization: Bearer [staging-token]" \
  "$STAGING_API/entities/1/records?filters=[{\"field\":\"status\",\"operator\":\"equals\",\"value\":\"active\"}]"
# Expected: 200 OK, filtered results
```

### Test 11-15: Performance Checks

```bash
# Baseline performance (no load)
curl -X GET \
  -H "Authorization: Bearer [staging-token]" \
  -w "Time: %{time_total}s\n" \
  -o /dev/null \
  $STAGING_API/entities/1/records
# Expected: < 200ms

# Check metrics in Prometheus
# http://localhost:9091/graph
# Query: rate(http_requests_total[1m])
```

### Test 16-20: Relationship Validation

```bash
# Check relationships were preserved
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT 
    COUNT(*) as total_relations
  FROM entity_fields 
  WHERE type='relationship' AND lookup_entity_id IS NOT NULL;
  "
# Expected: Count > 0 (at least some relationships migrated)
```

---

## Load Testing (4-8 hours)

### Baseline Load Test

```bash
# 100 requests/sec for 5 minutes
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run \
  --rps=100 \
  --duration=300 \
  2>&1 | tee /tmp/lume-migration/load-test-baseline.log
```

**Success Criteria**:
- P50 < 150ms
- P95 < 500ms  
- P99 < 1000ms
- Error rate < 1%

### Moderate Load Test

```bash
# 250 requests/sec for 10 minutes
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run \
  --rps=250 \
  --duration=600
```

**Success Criteria**:
- P95 < 750ms
- Error rate < 2%

### Heavy Load Test

```bash
# 500 requests/sec for 15 minutes
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run \
  --rps=500 \
  --duration=900
```

**Success Criteria**:
- P95 < 1000ms
- Error rate < 5%

### Sustained Load Test (12 hours)

```bash
# Run overnight to check for memory leaks
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run \
  --rps=100 \
  --duration=43200 \
  &

# Monitor memory growth
watch -n 300 'docker-compose -f docker-compose.staging.yml exec backend docker stats --no-stream | grep memory'
```

**Success Criteria**:
- Memory usage stable (not increasing >5% per hour)
- Service availability 99.9%+

---

## Rollback Testing

### Test Complete Rollback (30 min)

```bash
# 1. Stop all services
docker-compose -f docker-compose.staging.yml stop

# 2. Get pre-migration backup
ls -lh /tmp/lume-migration/lume_prod_clone.sql

# 3. Restore original schema
docker-compose -f docker-compose.staging.yml exec -T mysql \
  mysql -u root -p'gawdesy' lume < /tmp/lume-migration/lume_prod_clone.sql

# 4. Restart services
docker-compose -f docker-compose.staging.yml up -d

# 5. Verify original schema restored
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "SHOW TABLES LIKE 'activities';"
# Expected: activities table exists (old schema back)

# 6. Verify entity builder tables removed
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "SELECT COUNT(*) FROM entities;"
# Expected: Error (table doesn't exist) — OK, this is expected
```

---

## Sign-Off

Once all phases complete successfully, document:

```markdown
# Phase 2 Staging Migration Sign-Off

## Execution Summary
- Migration Date: [DATE]
- Duration: [TIME]
- Entities Created: [COUNT]
- Records Migrated: [COUNT]
- Validation Result: ✓ PASS

## Test Results
- Entity Management: ✓ PASS (5/5 tests)
- Record Operations: ✓ PASS (5/5 tests)
- Performance Checks: ✓ PASS (5/5 tests)
- Relationship Validation: ✓ PASS (5/5 tests)
- Load Testing: ✓ PASS (all targets met)

## Performance Baselines Established
- P50: [value]ms
- P95: [value]ms
- P99: [value]ms
- Error Rate: [value]%

## Rollback Validation
- ✓ Rollback procedure tested
- ✓ Recovery time: [seconds]
- ✓ Data integrity verified

## Sign-Off
- [Name] - Engineering Lead: ___________
- [Name] - DevOps Lead: ___________
- [Name] - Product Manager: ___________

**Status**: ✓ APPROVED FOR PHASE 3
```

---

## Troubleshooting

### Migration Stuck or Slow

```bash
# Check migration progress in logs
tail -f /tmp/lume-migration/migration_output.log

# Check backend service status
docker-compose -f docker-compose.staging.yml logs -f backend | grep -E "migrate|error"

# Check database activity
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' -e "SHOW PROCESSLIST;"
```

### Validation Errors

```bash
# Review detailed validation errors
tail -100 /tmp/lume-migration/validation_output.log

# Check for data issues in specific tables
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "
  SELECT * FROM entity_fields WHERE label IS NULL LIMIT 10;
  "
```

### Load Test Failures

```bash
# Check backend health
curl http://localhost:3001/api/base/health

# Check error logs during load
docker-compose -f docker-compose.staging.yml logs -f backend | grep ERROR

# Check database connections
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' -e "SHOW STATUS LIKE 'Threads%';"
```

---

**Next Steps**: Upon successful Phase 2 completion, proceed to Phase 3 Testing & Validation.
