# Phase 2: Quick Start Guide

**Complete Phase 2 staging migration in 5 commands**

---

## One-Time Setup (5 minutes)

```bash
cd /opt/Lume

# 1. Setup staging environment
bash scripts/staging-migration-setup.sh

# Verifies:
# ✓ Docker environment ready
# ✓ Staging services started
# ✓ Production DB cloned to staging
# ✓ Migration scripts available
```

**Output**: 
- Staging environment running (7 services)
- Production database cloned 
- Config saved to `/tmp/lume-migration/migration-config.env`

---

## Migration Execution (30-45 minutes)

```bash
# 2. Run migration script
bash scripts/staging-migration-execute.sh

# Executes:
# ✓ Migration (entity creation + field mapping + record transfer)
# ✓ Data validation (9-point integrity check)
# ✓ Performance baseline (load test)
# ✓ Statistics collection
```

**Expected output**:
```
✓ Migration script completed
✓ Validation completed successfully
✓ Baseline performance test completed

Migration Statistics:
  Entities Created:    [N]
  Records Migrated:    [M]
  Fields Created:      [F]
  Duration:           [Xs]
```

**Logs available at**: `/tmp/lume-migration/`
- `migration_output.log` - Migration script output
- `validation_output.log` - Validation results
- `load-test-baseline.log` - Performance baseline

---

## UAT Testing (30-60 minutes)

```bash
# 3. Run automated UAT tests
bash scripts/staging-uat-tests.sh

# Tests:
# ✓ Entity management (list, get, fields)
# ✓ Record operations (create, read, filter)
# ✓ Filtering & sorting
# ✓ Relationships
# ✓ Views
# ✓ Data integrity
# ✓ Security & access
# ✓ Performance
# ✓ Error handling
# ✓ Data export
```

**Expected output**:
```
✓ PASSED: 25-30 tests
✗ FAILED: 0
⊘ SKIPPED: 0-5 (tests needing specific data)

✓ UAT TESTS PASSED
Ready for Phase 3
```

**Note**: If you have an auth token for the staging API, set it first:
```bash
export STAGING_AUTH_TOKEN='your-token-here'
bash scripts/staging-uat-tests.sh
```

---

## Load Testing (2-4 hours)

```bash
# Run different load levels in sequence

# Light load (50 RPS for 1 minute)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=50 --duration=60

# Moderate load (100 RPS for 5 minutes)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=100 --duration=300

# Heavy load (250 RPS for 15 minutes)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=250 --duration=900
```

**Success criteria**:
- P95 latency < 500ms (light)
- P95 latency < 750ms (moderate)
- P95 latency < 1000ms (heavy)
- Error rate < 5%
- No memory leaks

**Results saved to**: `/tmp/lume-migration/load-test-*.log`

---

## Rollback Testing (15-30 minutes)

```bash
# 4. Test rollback procedure
bash scripts/staging-rollback-test.sh

# Verifies:
# ✓ Backup file exists and valid
# ✓ Services can be stopped cleanly
# ✓ Database restore completes successfully
# ✓ Services restart and become healthy
# ✓ Original data accessible after rollback
```

**Expected output**:
```
✓ Rollback completed in 18s
✓ Legacy tables restored
✓ Data integrity verified

✓ ROLLBACK TEST PASSED (< 30s recovery)
```

**Success criteria**:
- Rollback completes in < 60 seconds
- All services come back online
- Legacy tables accessible
- Original data intact

---

## Final Sign-Off

```bash
# 5. Verify all Phase 2 requirements met
cat > /tmp/lume-migration/PHASE_2_SIGN_OFF.md << 'EOF'
# Phase 2 Sign-Off

## ✓ Pre-Migration
- [x] Staging environment verified
- [x] Production database cloned
- [x] Backup created and tested

## ✓ Migration Execution
- [x] Migration script completed without errors
- [x] Data validation passed (all 9 checks)
- [x] Entity count matches legacy tables
- [x] Record count preserved
- [x] Relationships intact

## ✓ Testing
- [x] UAT tests passed (30/30)
- [x] Performance baseline established
- [x] Load testing completed (all thresholds met)
- [x] Error scenarios tested

## ✓ Rollback
- [x] Rollback procedure tested
- [x] Recovery time < 60 seconds
- [x] Data integrity verified post-rollback

## Status: ✓ APPROVED FOR PHASE 3

**Approvals:**
- Engineering Lead: ___________
- DevOps Lead: ___________
- Product Manager: ___________

**Date**: $(date)
EOF

cat /tmp/lume-migration/PHASE_2_SIGN_OFF.md
```

---

## Monitoring During Execution

While migration runs, monitor in separate terminals:

```bash
# Terminal 1: Watch migration progress
tail -f /tmp/lume-migration/migration_output.log

# Terminal 2: Monitor database activity
watch -n 1 'docker-compose -f docker-compose.staging.yml exec mysql mysql -u root -p"gawdesy" -e "SHOW PROCESSLIST\G" | head -20'

# Terminal 3: Monitor system resources
docker stats --no-stream

# Terminal 4: Check service logs
docker-compose -f docker-compose.staging.yml logs -f backend | grep -E "ERROR|WARN|migrat"
```

---

## Troubleshooting

### Migration stuck or slow

```bash
# Check progress
tail -100 /tmp/lume-migration/migration_output.log

# Check database locks
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' -e "SHOW PROCESSLIST\G"

# Restart if needed
docker-compose -f docker-compose.staging.yml restart backend
```

### Validation failures

```bash
# Review detailed errors
cat /tmp/lume-migration/validation_output.log

# Check for data inconsistencies
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT * FROM entity_fields WHERE type IS NULL LIMIT 10;"
```

### Load test failures

```bash
# Check API health
curl http://localhost:3001/api/base/health

# Check error logs
docker-compose -f docker-compose.staging.yml logs backend | grep ERROR

# Check database connections
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' -e "SHOW STATUS LIKE 'Threads%';"
```

---

## Timeline Summary

| Phase | Duration | Command |
|-------|----------|---------|
| Setup | 5 min | `bash scripts/staging-migration-setup.sh` |
| Migration | 15-30 min | `bash scripts/staging-migration-execute.sh` |
| UAT | 30-60 min | `bash scripts/staging-uat-tests.sh` |
| Load Testing | 2-4 hours | Manual per load level |
| Rollback Test | 15-30 min | `bash scripts/staging-rollback-test.sh` |
| **Total** | **3-5 hours** | All steps |

---

## Logs & Artifacts

All Phase 2 outputs saved to `/tmp/lume-migration/`:

```
/tmp/lume-migration/
├── migration-config.env              # Configuration & results
├── lume_prod_clone.sql               # Database backup
├── docker-compose.staging.backup.yml # Staging config snapshot
├── setup.log                         # Setup execution log
├── migration_output.log              # Migration script output
├── validation_output.log             # Data validation results
├── load-test-baseline.log            # Performance baseline
├── uat-results.log                   # UAT test results
└── rollback-test.log                 # Rollback test results
```

---

## Next Steps

Upon successful Phase 2 completion:

1. ✓ All tests pass
2. ✓ Sign-off document completed
3. ✓ Team reviews results
4. **→ Proceed to Phase 3: Security Testing & A/B Setup**

See: `docs/PHASE_3_TESTING_VALIDATION.md`

---

## Detailed Documentation

For comprehensive details on each phase:
- Full execution guide: `PHASE_2_STAGING_EXECUTION.md`
- Entity Builder architecture: `docs/ARCHITECTURE.md`
- Database migration details: `docs/PHASE_2_DATABASE_MIGRATION.md`
- Test cases: `docs/UAT_TEST_CASES.md`

