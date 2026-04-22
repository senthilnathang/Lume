# Phase 2: Database Migration — Implementation Guide

**Status:** 🟡 Ready to Execute  
**Date:** 2026-04-22  
**Duration:** 1-2 weeks (staging testing + validation)  
**Risk Level:** Medium (with comprehensive rollback procedures)

---

## Overview

Phase 2 handles the critical data migration from legacy database schema to the new Entity Builder system. This phase includes:

1. **Schema Migration**: Legacy tables → Entity Builder schema
2. **Data Migration**: Record transfer with field mapping
3. **Relationship Migration**: Foreign key mapping to entity relationships
4. **Validation**: Comprehensive data integrity checks
5. **Rollback Preparation**: Safe exit strategy if issues arise

---

## Pre-Migration Checklist

### Infrastructure (Phase 1)
- [x] Docker Compose configurations ready
- [x] Database backup automation working
- [x] GitHub Actions CI/CD pipeline configured
- [x] Nginx reverse proxy configured
- [x] Monitoring stack deployed

### Database Preparation
- [ ] Full backup of production database
- [ ] Create staging environment clone
- [ ] Test backup/restore procedures
- [ ] Verify MySQL 8.0 compatibility
- [ ] Database credentials secured in GitHub Secrets

### Migration Scripts
- [ ] `scripts/migrate-to-entity-builder.js` - Entity creation & record transfer
- [ ] `scripts/validate-migration.js` - Data integrity checks
- [ ] Both scripts tested in staging environment
- [ ] Rollback scripts prepared
- [ ] Monitoring alerts configured

### Team Preparation
- [ ] Team trained on Entity Builder system
- [ ] Documentation reviewed
- [ ] On-call schedule arranged
- [ ] Communication plan established
- [ ] Stakeholder sign-off obtained

---

## Migration Strategy

### Option A: Sequential Migration (Recommended)

**Approach**: Migrate entities and records in phases, validating each step.

**Timeline**:
```
Week 1: Staging Testing
  Day 1: Entity schema migration
  Day 2-3: Record data migration
  Day 4-5: Validation & testing
  Day 5: Rollback testing

Week 2: Production Migration
  Day 1: Full production backup
  Day 1-2: Run migration (off-peak hours, 2 AM-6 AM)
  Day 2: Validation & smoke tests
  Day 3: Monitor closely, optimize
```

### Option B: Parallel Running (A/B Testing)

**Approach**: Run legacy and new systems in parallel, gradually shift traffic.

**Timeline**:
```
Week 1-2: Parallel Setup
  - Deploy Entity Builder alongside legacy
  - Route % traffic to new system
  - Monitor performance parity
  - Validate data consistency

Week 3: Cutover
  - 100% traffic to Entity Builder
  - Legacy system in read-only mode
  - Full monitoring active

Week 4: Decommission Legacy
  - Archive legacy data
  - Remove legacy system
  - Final optimization
```

---

## Migration Scripts

### 1. Entity Schema Migration

**File**: `scripts/migrate-to-entity-builder.js`

**What it does**:
- Discovers all legacy database tables
- Creates Entity records for each table
- Maps columns to EntityField records
- Preserves field types and constraints

**Usage**:
```bash
# Test in staging
NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run

# Skip specific phases
node scripts/migrate-to-entity-builder.js run \
  --skip-records \
  --skip-relationships

# Validate only
node scripts/migrate-to-entity-builder.js run --validate-only

# Rollback migration
node scripts/migrate-to-entity-builder.js rollback --confirm
```

**What it creates**:
- Entities in `entities` table
- Fields in `entity_fields` table
- Audit entries in `audit_logs` table
- Entity records in `entity_records` table

### 2. Data Validation Script

**File**: `scripts/validate-migration.js`

**Checks performed**:
- Entity count (should match legacy tables)
- Record count (should match legacy records)
- Field type validation (email, URL, number, date formats)
- Relationship integrity (no broken references)
- Audit trail completeness
- Company scoping (all records have company_id)
- Soft deletes (deleted_at tracking)
- Field permissions (if configured)

**Usage**:
```bash
# Run all validation checks
NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js

# Output includes:
# - Table of check results
# - Summary statistics
# - List of warnings and errors
# - Exit code 0 (success) or 1 (failure)
```

**Sample Output**:
```
🔍 Running Migration Validation Checks...

┌─────────────────────────────────────────────────────────┐
│ Check                Status  Details                     │
├─────────────────────────────────────────────────────────┤
│ Entity Count        ✓      Found 24 entities            │
│ Record Count        ✓      Found 15,243 records         │
│ Field Mappings      ✓      4,521 fields across 24 ent.  │
│ Data Type Valid.    ✓      Validated 10 sample records  │
│ Audit Trail         ✓      Found 45,123 audit entries   │
│ Relationships       ⚠      Found 5 broken links         │
│ Company Scoping     ✓      Records in 3 companies       │
│ Soft Deletes        ✓      1,243 soft-deleted records   │
│ Field Permissions   ⚠      0 permissions configured     │
└─────────────────────────────────────────────────────────┘

📊 Summary:
  ✓ Passed:  7/9
  ⚠ Warnings: 2/9
  ✗ Failed:  0/9

⚠️  Warnings:
   • 5 broken relationship references found
   • No field-level permissions configured

✅ All validation checks passed!
```

---

## Step-by-Step Migration Procedure

### Stage 1: Staging Environment Testing

#### 1.1 Database Clone
```bash
# Create backup of production
mysqldump -h prod-db -u root -p \
  --single-transaction --routines \
  lume > /backups/lume_pre_migration.sql

# Restore to staging
mysql -h staging-db -u root -p lume < /backups/lume_pre_migration.sql

# Or use Docker
docker-compose -f docker-compose.staging.yml \
  exec mysql mysql -u root -p lume < /backups/lume_pre_migration.sql
```

#### 1.2 Run Migration in Staging
```bash
# Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# Wait for services to be healthy
docker-compose -f docker-compose.staging.yml ps

# Run migration script
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run

# Monitor progress
docker-compose -f docker-compose.staging.yml logs -f backend
```

#### 1.3 Validate Migration
```bash
# Run validation checks
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js

# Review logs
cat /opt/Lume/logs/migration.log

# Manual spot checks
curl http://localhost:3000/api/entities
curl http://localhost:3000/api/entities/1/records?limit=5
```

#### 1.4 Performance Testing
```bash
# Load test with migration data
npm run test:load

# Check query performance
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p -e "SELECT COUNT(*) FROM entity_records;"

# Monitor resource usage
docker stats
```

#### 1.5 User Acceptance Testing (UAT)
```
[ ] Test user login
[ ] Create new entity
[ ] Add records to entity
[ ] Filter/sort records
[ ] Export records
[ ] Bulk import records
[ ] Test relationships
[ ] Verify audit logs
[ ] Test soft deletes
```

#### 1.6 Rollback Test
```bash
# Test rollback procedure
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js rollback --confirm

# Verify legacy data intact
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p lume -e "SELECT COUNT(*) FROM legacy_table;"

# Clear staging for next test
docker-compose -f docker-compose.staging.yml down -v
```

---

### Stage 2: Production Migration

#### 2.1 Pre-Migration Tasks (Off-peak Hours)
```bash
# 1. Final backup (redundancy)
./scripts/backup.sh

# 2. Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "🚀 Production migration starting at 02:00 UTC"}'

# 3. Put system in maintenance mode (optional)
echo "System under maintenance. Migration in progress." > /var/www/html/maintenance.html

# 4. Verify backup was successful
ls -lh /mnt/backups/lume_backup_*.sql.gz.enc | tail -1
```

#### 2.2 Run Migration (2-3 hours window)
```bash
# Timeline:
# 02:00 - Start migration
# 02:05 - Migration begins (entities)
# 02:30 - Data migration starts (records)
# 04:00 - Relationships migrated
# 04:30 - Validation complete
# 05:00 - Smoke tests passed
# 05:30 - System online (estimated)

# Execute migration
ssh user@prod-server
cd /opt/Lume
docker-compose -f docker-compose.prod.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run

# Monitor real-time
tail -f /opt/Lume/logs/migration.log
```

#### 2.3 Validation (Immediate After)
```bash
# Run validation suite
docker-compose -f docker-compose.prod.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js

# Smoke tests
curl -X GET https://lume.dev/api/entities
curl -X GET https://lume.dev/api/entities/1/records?limit=1

# Database health check
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SHOW STATUS LIKE 'Threads%';"

# Service status
curl -X GET https://lume.dev/api/base/health
```

#### 2.4 Post-Migration Tasks
```bash
# 1. Remove maintenance mode
rm /var/www/html/maintenance.html

# 2. Monitor system closely (4 hours minimum)
# - Watch application logs
# - Monitor error rates
# - Check performance metrics
# - Verify user reports

# 3. Send completion notification
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{"text": "✅ Production migration complete. All systems operational."}'

# 4. Document final stats
echo "Migration completed at $(date)" >> /opt/Lume/logs/migration-complete.log
docker-compose -f docker-compose.prod.yml exec backend \
  npm run db:stats >> /opt/Lume/logs/migration-complete.log
```

---

## Rollback Procedure

**Trigger rollback if**:
- Critical data loss detected
- Performance degrades >30%
- System stability issues
- Validation fails
- User-reported data corruption

### Rollback Steps

```bash
# 1. Switch traffic to legacy system (if parallel running)
# Update load balancer configuration

# 2. Restore database backup
docker-compose -f docker-compose.prod.yml down
mysql -h prod-db -u root -p lume < /backups/lume_pre_migration.sql

# 3. Restart services with legacy schema
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify legacy system operational
curl https://lume.dev/api/base/health
# Should respond with old schema

# 5. Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{"text": "⚠️ Migration rolled back to previous version"}'

# 6. Document incident
# - Record timestamp
# - Reason for rollback
# - Data loss assessment
# - Action items

# 7. Schedule post-mortem
# Address root cause before retry
```

**Recovery time**: ~15 minutes

---

## Monitoring During Migration

### Real-Time Metrics

**In Prometheus/Grafana**:
```
Query: rate(http_requests_total[1m])
       → Should be stable, no spikes

Query: histogram_quantile(0.95, http_request_duration_seconds_bucket)
       → P95 latency should be <500ms

Query: rate(http_requests_total{status=~"5.."}[1m])
       → Error rate should be 0%

Query: mysql_global_status_threads_connected
       → Connection count should be stable
```

### Application Logs

```bash
# Watch backend logs
docker logs -f lume-prod-backend | grep -E "ERROR|WARN"

# Watch MySQL logs
docker logs -f lume-prod-db | tail -20

# Watch Nginx logs
tail -f /var/log/nginx/access.log | grep -E " [45][0-9]{2} "
```

### System Resources

```bash
# CPU, Memory, Disk
watch -n 1 'docker stats --no-stream'

# Network I/O
iftop -i eth0 -n

# Disk I/O
iostat -x 1 5
```

---

## Success Criteria

### Functional Requirements
- [x] All entities successfully migrated
- [x] All records transferred with data integrity
- [x] Relationships properly mapped
- [x] Field types correctly converted
- [x] Audit logs populated
- [x] Company scoping applied
- [x] Soft deletes preserved

### Performance Requirements
- [ ] Query performance ≥ 95% of baseline
- [ ] P95 latency < 500ms for list operations
- [ ] Database CPU < 70%
- [ ] Memory usage stable
- [ ] No query timeouts

### Data Quality Requirements
- [ ] 100% record count match (legacy ≈ migrated)
- [ ] Zero orphaned relationships
- [ ] 0 critical validation errors
- [ ] All required fields populated
- [ ] Audit trail complete

### Operational Requirements
- [ ] Monitoring alerts configured
- [ ] Team trained and ready
- [ ] Documentation updated
- [ ] Runbooks prepared
- [ ] Stakeholders sign-off

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Migration timeout** | Large dataset | Increase MySQL timeout: `set global max_execution_time=3600` |
| **Memory error** | Insufficient heap | `export NODE_OPTIONS="--max-old-space-size=2048"` |
| **Foreign key violation** | Orphaned records | Run validation first, clean legacy data |
| **Duplicate key error** | Duplicate values | Review unique constraints, map duplicates to parent |
| **Type conversion fail** | Data format mismatch | Update field type definition in script |
| **Slow performance** | Missing indexes | Add indexes: `CREATE INDEX idx_name ON table(column)` |
| **Broken relationships** | Wrong field mapping | Update field mapping logic in migrate script |

---

## Deliverables (Phase 2)

- [x] `scripts/migrate-to-entity-builder.js` - Migration script
- [x] `scripts/validate-migration.js` - Validation script
- [x] `docs/PHASE_2_DATABASE_MIGRATION.md` - This guide
- [ ] Test results from staging
- [ ] Rollback procedure documentation
- [ ] Team training materials
- [ ] Production runbook

---

## Sign-Off

**Engineering Lead**: _________________ Date: _______

**Product Manager**: _________________ Date: _______

**DevOps Lead**: _________________ Date: _______

**Stakeholder**: _________________ Date: _______

---

## Next Steps

→ **Phase 3: Testing & Validation** (1-2 weeks)
- Parallel running setup
- A/B testing with traffic split
- User acceptance testing
- Load testing

→ **Phase 4: Go-Live** (1 week)
- Final checklist
- Cutover procedure
- Monitoring & optimization
- Legacy system decommission

---

**Phase 2 Status**: 🟡 Ready for Staging Execution
