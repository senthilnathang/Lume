# Phase 2: Master Execution Checklist

**Complete Database Migration from Legacy Schema to Entity Builder**

---

## Pre-Execution Requirements

### Infrastructure
- [ ] Docker and Docker Compose installed
- [ ] `/opt/Lume` directory accessible
- [ ] Production and staging configurations available
- [ ] Minimum 10GB free disk space for database backups
- [ ] Network connectivity between prod and staging

### Database
- [ ] Production database running (or backup available)
- [ ] Staging MySQL configured and ready
- [ ] Database credentials verified (user: `gawdesy`, password: `gawdesy`)
- [ ] Entity Builder schema files in place (`base/models/schema.js`)

### Migration Scripts
- [ ] `scripts/migrate-to-entity-builder.js` (450 lines) ✓ Present
- [ ] `scripts/validate-migration.js` (400 lines) ✓ Present
- [ ] `scripts/load-test.js` (400 lines) ✓ Present
- [ ] `scripts/staging-migration-setup.sh` ✓ Present
- [ ] `scripts/staging-migration-execute.sh` ✓ Present
- [ ] `scripts/staging-uat-tests.sh` ✓ Present
- [ ] `scripts/staging-rollback-test.sh` ✓ Present

### Team & Communication
- [ ] Engineering Lead assigned
- [ ] DevOps Lead assigned
- [ ] Incident Commander identified
- [ ] Slack channel created for migration updates
- [ ] On-call schedule coordinated
- [ ] Rollback procedures reviewed by team

### Documentation
- [ ] Phase 2 Quick Start read: `PHASE_2_QUICK_START.md`
- [ ] Full execution guide reviewed: `PHASE_2_STAGING_EXECUTION.md`
- [ ] Incident playbook available: `docs/INCIDENT_RESPONSE_PLAYBOOK.md`
- [ ] Runbooks available: `docs/TEAM_RUNBOOKS.md`

---

## Day 1: Setup & Preparation (Morning)

### 9:00 AM - Team Kickoff
- [ ] Confirm all prerequisites met
- [ ] Review timeline and risks
- [ ] Establish communication protocol
- [ ] Share this checklist with team

### 10:00 AM - Environment Setup
```bash
cd /opt/Lume
bash scripts/staging-migration-setup.sh
```

**Success Criteria:**
- [ ] Staging services running (7 services)
- [ ] All services show "healthy" status
- [ ] Production database cloned to staging
- [ ] Backup file exists: `/tmp/lume-migration/lume_prod_clone.sql`
- [ ] Configuration saved: `/tmp/lume-migration/migration-config.env`
- [ ] Legacy table count captured

**Logs to Review:**
- [ ] `/tmp/lume-migration/setup.log` (no errors)

### 11:00 AM - Pre-Migration Verification
```bash
# Verify counts
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e \
  "SELECT COUNT(*) as legacy_tables FROM INFORMATION_SCHEMA.TABLES \
   WHERE TABLE_SCHEMA='lume' AND TABLE_NAME NOT LIKE 'entity_%';"
```

- [ ] Legacy table count documented
- [ ] Database connectivity confirmed
- [ ] Backup tested (can be restored)
- [ ] Schema is valid

### 12:00 PM - Go/No-Go Decision
- [ ] All checks passed
- [ ] Team agrees to proceed
- [ ] Incident response team on standby
- [ ] Documentation updated with actual counts

---

## Day 2: Migration Execution (Early Morning)

### 2:00 AM - Migration Window Begins

**Communication**: 
- [ ] Slack notification posted
- [ ] All stakeholders notified
- [ ] War room channel active

### 2:05 AM - Start Migration
```bash
bash scripts/staging-migration-execute.sh
```

**Expected Duration**: 15-30 minutes (depends on data size)

**What to Monitor During Migration:**
- [ ] Terminal 1: `tail -f /tmp/lume-migration/migration_output.log`
- [ ] Terminal 2: `docker-compose -f docker-compose.staging.yml logs -f backend`
- [ ] Terminal 3: `docker stats --no-stream`
- [ ] Terminal 4: Database activity monitoring

**Expected Output Sequence:**
```
[timestamp] INFO: Starting entity schema migration
[timestamp] INFO: Discovered N legacy entity tables
[timestamp] INFO: Migrated entity: [table1]
[timestamp] INFO: Migrated entity: [table2]
...
[timestamp] INFO: Migration phase complete
[timestamp] INFO: Starting record migration
[timestamp] INFO: Migrated M records
[timestamp] INFO: Migration complete!
```

### 2:35 AM - Migration Complete
- [ ] No ERROR messages in logs
- [ ] ENTITIES_CREATED count matches legacy tables
- [ ] RECORDS_MIGRATED count matches total legacy records
- [ ] Migration completed in < 30 minutes

**If Migration Fails:**
- [ ] Review error message in logs
- [ ] Check database logs for errors
- [ ] Attempt rollback: `bash scripts/staging-rollback-test.sh`
- [ ] Document issue and escalate

### 2:40 AM - Validation Phase
```bash
# Validation runs automatically in migration-execute.sh
# but can be run manually:
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js
```

**Expected Results**: All 9 checks should pass
- [ ] Entity count matches legacy table count
- [ ] Record count preserved
- [ ] All field types valid
- [ ] No orphaned relationships
- [ ] Audit trail complete
- [ ] Company scoping intact
- [ ] Soft deletes preserved
- [ ] Field permissions valid
- [ ] Data integrity check passed

**If Validation Fails:**
- [ ] Review specific failure messages
- [ ] Check data quality in legacy tables
- [ ] May need data cleanup before retry
- [ ] Document issues for post-mortem

### 3:00 AM - Performance Baseline
- [ ] Baseline load test completed
- [ ] P50: < 150ms
- [ ] P95: < 500ms
- [ ] P99: < 1000ms
- [ ] Error rate: < 1%

**Baseline saved to**: `/tmp/lume-migration/load-test-baseline.log`

---

## Day 2-3: Testing Phase (9 AM - 5 PM)

### 9:00 AM - UAT Test Execution
```bash
bash scripts/staging-uat-tests.sh
```

**Expected Results**: 30 tests, 25-30 pass
- [ ] Entity Management: 4/4 passing
- [ ] Record Operations: 4/4 passing
- [ ] Filtering & Sorting: 3/3 passing
- [ ] Relationships: 2/2 passing
- [ ] Views: 2/2 passing
- [ ] Data Integrity: 3/3 passing
- [ ] Security & Access: 3/3 passing
- [ ] Performance: 3/3 passing
- [ ] Error Handling: 2/2 passing
- [ ] Data Export: 2/2 passing

**If Tests Fail:**
- [ ] Review specific test failure
- [ ] Verify test data exists
- [ ] Check API logs for errors
- [ ] Run individual test commands manually

**Results saved to**: `/tmp/lume-migration/uat-results.log`

### 11:00 AM - Manual UAT Spot Checks
Run 5-10 manual API calls to verify critical paths:

```bash
# Example: List entities
curl -X GET \
  -H "Authorization: Bearer [token]" \
  http://localhost:3001/api/entities

# Example: Get entity with fields
curl -X GET \
  -H "Authorization: Bearer [token]" \
  http://localhost:3001/api/entities/1

# Example: List records
curl -X GET \
  -H "Authorization: Bearer [token]" \
  "http://localhost:3001/api/entities/1/records?page=1&limit=20"

# Example: Filter records
curl -X GET \
  -H "Authorization: Bearer [token]" \
  "http://localhost:3001/api/entities/1/records?filters=[{\"field\":\"status\",\"operator\":\"equals\",\"value\":\"active\"}]"
```

- [ ] List entities returns all migrated entities
- [ ] Entity details include all field definitions
- [ ] Records are paginated correctly
- [ ] Filtering works on migrated data
- [ ] Timestamps preserved from legacy data
- [ ] No 404 errors for valid entities
- [ ] Response times acceptable (< 500ms)

### 1:00 PM - Load Testing (Increasing Intensity)

```bash
# Level 1: Light (50 RPS, 1 min)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=50 --duration=60

# Level 2: Moderate (100 RPS, 5 min)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=100 --duration=300

# Level 3: Heavy (250 RPS, 15 min)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=250 --duration=900
```

**Success Criteria Per Level:**
- [ ] Light: P95 < 500ms, Error rate < 1%
- [ ] Moderate: P95 < 750ms, Error rate < 2%
- [ ] Heavy: P95 < 1000ms, Error rate < 5%

**Stop if:**
- [ ] P95 > 2000ms
- [ ] Error rate > 10%
- [ ] Memory continuously grows
- [ ] Service crashes

### 5:00 PM - Review Test Results
- [ ] Compile all test results
- [ ] Document any issues found
- [ ] Identify performance optimization opportunities
- [ ] Create issue tickets for future work

---

## Day 3-4: Rollback Testing & Final Validation

### 9:00 AM - Rollback Procedure Testing
```bash
bash scripts/staging-rollback-test.sh
```

**What This Tests:**
- [ ] Services can be stopped cleanly
- [ ] Database backup is valid
- [ ] Restore completes successfully
- [ ] Services restart and become healthy
- [ ] Original data accessible after rollback

**Success Criteria:**
- [ ] Rollback duration < 30 seconds
- [ ] All services come back online
- [ ] Legacy tables restored
- [ ] Original data integrity verified

**If Rollback Fails:**
- [ ] Document failure mode
- [ ] Test manual recovery procedures
- [ ] Identify what needs to be fixed
- [ ] Create remediation plan

### 11:00 AM - Restore to Migrated State
After rollback test completes, restore to migrated state:
```bash
# Restore from migration backup
docker-compose -f docker-compose.staging.yml exec -T mysql \
  mysql -u root -p'gawdesy' lume < /tmp/lume-migration/lume_prod_clone.sql

# Re-run migration if needed
bash scripts/staging-migration-execute.sh
```

- [ ] Migration re-executed successfully
- [ ] All data re-migrated
- [ ] Validation passes again

### 1:00 PM - Final Sign-Off Meeting

Attendees:
- [ ] Engineering Lead
- [ ] DevOps Lead
- [ ] Product Manager
- [ ] Incident Commander

**Sign-Off Document**: `/tmp/lume-migration/PHASE_2_SIGN_OFF.md`

**Sign-Off Criteria:**
- [ ] All UAT tests passed
- [ ] All load tests met targets
- [ ] Rollback procedure tested and working
- [ ] Data integrity verified
- [ ] Performance baselines established
- [ ] Team confident in migration approach
- [ ] No showstoppers identified

**Sign-Offs:**
- [ ] Engineering Lead: ________________ Date: ________
- [ ] DevOps Lead: ________________ Date: ________
- [ ] Product Manager: ________________ Date: ________

---

## Phase 2 Completion Artifacts

Collect and preserve the following:

```bash
# Copy all logs to archive
mkdir -p ~/lume-phase-2-archive/$(date +%Y-%m-%d)
cp -r /tmp/lume-migration/* ~/lume-phase-2-archive/$(date +%Y-%m-%d)/

# Create summary report
cat > ~/lume-phase-2-archive/$(date +%Y-%m-%d)/SUMMARY.md << 'EOF'
# Phase 2 Execution Summary

**Date**: $(date)
**Duration**: [X hours]
**Status**: ✓ COMPLETE

## Metrics
- Legacy Tables Migrated: [N]
- Records Migrated: [M]
- Migration Duration: [Xs]
- Validation Status: [✓ PASS]
- Load Test Results: [✓ PASS]
- Rollback Test: [✓ PASS]

## Sign-Offs
- Engineering: [Name] ✓
- DevOps: [Name] ✓
- Product: [Name] ✓

## Issues Found & Resolved
1. [Issue 1] - [Resolution]
2. [Issue 2] - [Resolution]

## Lessons Learned
- [Learning 1]
- [Learning 2]

## Ready for Phase 3: ✓ YES
EOF
```

---

## Post-Phase-2 Activities

### Immediate (Day of Completion)
- [ ] Archive all logs and artifacts
- [ ] Notify stakeholders of successful completion
- [ ] Update documentation with actual metrics
- [ ] Create incident ticket if any issues found

### Within 24 Hours
- [ ] Team retrospective meeting
- [ ] Document lessons learned
- [ ] Update runbooks based on experience
- [ ] Begin Phase 3 preparation

### Within 1 Week
- [ ] Performance analysis and tuning opportunities identified
- [ ] Plan any necessary optimizations
- [ ] Schedule Phase 3: Security Testing & A/B Setup

---

## Phase 2 → Phase 3 Transition

Once all Phase 2 items are complete:

1. ✓ Sign-off obtained
2. ✓ All artifacts archived
3. ✓ Staging system left in migrated state (ready for Phase 3 A/B testing)

**Next Document**: `docs/PHASE_3_TESTING_VALIDATION.md`

**Phase 3 Goals**:
- Security validation (RBAC, data isolation, audit logging)
- Load testing with production profiles
- A/B testing setup (run both systems in parallel)
- User acceptance testing preparation

---

## Emergency Contacts

**If Things Go Wrong:**

| Severity | Action | Contact |
|----------|--------|---------|
| Migration stuck > 30 min | Check logs, may be normal | DevOps Lead |
| Data validation fails | Stop, review errors | Engineering Lead |
| Rollback needed | Execute rollback script | DevOps Lead + Incident Commander |
| Service down | Follow incident playbook | On-Call Engineer |
| Complete failure | Escalate to VP Engineering | CTO |

**Incident Response Channel**: `#incidents` (Slack)

---

## Quick Reference

### Key Files
- Quick start guide: `PHASE_2_QUICK_START.md`
- Detailed guide: `PHASE_2_STAGING_EXECUTION.md`
- Test cases: `docs/UAT_TEST_CASES.md`
- Incident playbook: `docs/INCIDENT_RESPONSE_PLAYBOOK.md`

### Key Commands
```bash
# Setup
bash scripts/staging-migration-setup.sh

# Execute
bash scripts/staging-migration-execute.sh

# Test
bash scripts/staging-uat-tests.sh

# Load test
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=100 --duration=300

# Rollback
bash scripts/staging-rollback-test.sh
```

### Key Logs
- Setup: `/tmp/lume-migration/setup.log`
- Migration: `/tmp/lume-migration/migration_output.log`
- Validation: `/tmp/lume-migration/validation_output.log`
- UAT: `/tmp/lume-migration/uat-results.log`
- Performance: `/tmp/lume-migration/load-test-*.log`

---

**Phase 2 Status**: ✓ PREPARED FOR EXECUTION

Ready to begin staging migration. Execute checklist items in order.
