# Phase 4: Go-Live — Production Cutover Guide

**Status**: 🟡 Final Phase  
**Date**: 2026-04-22  
**Duration**: 1 week (cutover + stabilization)  
**Prerequisites**: Phase 3 approval required  
**Window**: Saturday 02:00-06:00 UTC (off-peak)

---

## Overview

Phase 4 is the final production migration. This phase involves:

1. **Pre-Cutover** - Final validation and backup
2. **Cutover Execution** - Run migration during maintenance window
3. **Post-Cutover** - Health checks, smoke tests, optimization
4. **Monitoring** - 24/7 support and performance tracking
5. **Stabilization** - Address issues, optimize, document learnings

---

## Critical Information

### Go-Live Window

```
Date: Saturday, May 10, 2026
Time: 02:00-06:00 UTC (Midnight-4 AM EDT / 9 PM-1 AM PDT)
Duration: 2-3 hours (includes backup, migration, validation)
Support: 24/7 on-call team
Communication: Slack channel #production-migration
```

### Stakeholder Approvals Required

Before proceeding with cutover:

- [ ] Engineering Lead - Technical readiness
- [ ] Product Manager - Business requirements met
- [ ] DevOps Lead - Infrastructure validated
- [ ] CEO/Executive - Final approval

---

## Pre-Cutover Checklist (48 Hours Before)

### Infrastructure Verification

- [ ] Production environment healthy
  ```bash
  curl https://lume.dev/api/base/health
  ```

- [ ] Database responsive
  ```bash
  docker-compose -f docker-compose.prod.yml exec mysql \
    mysql -u root -p -e "SELECT 1;"
  ```

- [ ] Redis cluster operational
  ```bash
  docker-compose -f docker-compose.prod.yml exec redis \
    redis-cli ping
  ```

- [ ] Nginx reverse proxy responding
  ```bash
  curl -I https://lume.dev
  ```

- [ ] Monitoring stack operational
  ```bash
  curl http://localhost:9090/-/healthy
  ```

### Backup Verification

- [ ] Latest production backup exists
  ```bash
  ls -lh /mnt/backups/lume_backup_*.sql.gz.enc | tail -1
  ```

- [ ] Backup integrity verified
  ```bash
  ./scripts/backup.sh --verify
  ```

- [ ] Backup restoration tested
  ```bash
  # In staging, restore from latest production backup
  # Verify all data present
  ```

- [ ] Backup encryption verified
  ```bash
  # Decrypt test backup
  openssl enc -aes-256-cbc -d -in backup.sql.gz.enc | gunzip | head -20
  ```

### Code & Deployment Verification

- [ ] All Phase 3 test cases passed
- [ ] Migration scripts tested end-to-end
- [ ] Validation script passes in staging
- [ ] Docker images built and pushed to registry
- [ ] GitHub Actions workflow validated
- [ ] Feature flags set correctly
- [ ] Environment variables verified
- [ ] SSL certificates valid (not expired)

### Team Preparation

- [ ] Team roster and contact info distributed
- [ ] On-call schedule confirmed
- [ ] War room/Slack channel created
- [ ] Communication plan reviewed
- [ ] Runbooks distributed to team
- [ ] Escalation procedures clear

### User Communication

- [ ] Maintenance window announced (3+ days prior)
- [ ] Expected downtime communicated (4 hours)
- [ ] Rollback plan communicated
- [ ] Support contact info provided
- [ ] Post-launch communication plan ready

---

## Go-Live Day — Hour by Hour

### T-30 Minutes (01:30 UTC)

**Actions**:
1. Team arrives in war room
2. Slack channel activation
3. Production access verified
4. Communication channels open (Slack, email, phone)
5. System status verified (green checks on all services)

**Verification**:
```bash
# Quick health check
curl -s https://lume.dev/api/base/health | jq .
docker-compose -f docker-compose.prod.yml ps

# Verify database is responsive
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SELECT COUNT(*) FROM users;"
```

### T-15 Minutes (01:45 UTC)

**Actions**:
1. All team members ready and standing by
2. Final backup of current system
3. Notify on-call team
4. Begin monitoring dashboard recording

**Final Backup**:
```bash
./scripts/backup.sh
# Verify backup completed
ls -lh /mnt/backups/lume_backup_*.sql.gz.enc | tail -1
```

### T-0 Minutes (02:00 UTC) — GO-LIVE START

**Actions**:
1. Announce start in Slack: "🚀 Production migration starting"
2. Put system in maintenance mode
3. Stop accepting new requests (or queue them)

**Maintenance Mode**:
```bash
# Create maintenance page
echo "System under maintenance. Migration in progress. Est. completion: 05:00 UTC" \
  > /var/www/html/maintenance.html

# Redirect traffic (Nginx config)
# Return 503 with maintenance page
```

### T+5 Minutes (02:05 UTC) — Migration Start

**Actions**:
1. Execute migration script
2. Monitor logs in real-time
3. Track progress

**Execute Migration**:
```bash
ssh user@prod-server
cd /opt/Lume

# Start migration with timestamp
echo "Migration started at $(date)" > /opt/Lume/logs/cutover-2026-05-10.log

# Run migration
docker-compose -f docker-compose.prod.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run \
  2>&1 | tee -a /opt/Lume/logs/cutover-2026-05-10.log

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration failed, initiating rollback"
fi
```

**Monitor Progress** (Real-Time):
```bash
# Watch migration logs
tail -f /opt/Lume/logs/migration.log

# Monitor database growth
watch -n 5 'docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SELECT COUNT(*) as record_count FROM entity_records;"'

# Monitor system resources
docker stats

# Check Slack for updates every 2 minutes
```

### T+30 Minutes (02:30 UTC) — Migration Progress Check

**Actions**:
1. Check migration status
2. Verify database operations
3. Monitor error logs
4. Report progress to stakeholders

**Status Check**:
```bash
# Check migration checkpoint
cat /opt/Lume/logs/migration-checkpoint.json

# Count records migrated
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "SELECT COUNT(*) FROM entity_records;"

# Check for errors in logs
tail -100 /opt/Lume/logs/migration.log | grep -i error
```

**Slack Update**:
```
[02:30 UTC] ⏳ Status Update:
  • Entities created: 24/24 ✅
  • Records migrated: 15,000/15,243 (98%)
  • Errors: 2 (non-critical)
  • ETA: 03:00 UTC
```

### T+60 Minutes (03:00 UTC) — Validation Phase

**Actions**:
1. Wait for migration completion
2. Run validation script
3. Verify data integrity
4. Run smoke tests

**Execute Validation**:
```bash
# Wait for migration to complete
docker-compose -f docker-compose.prod.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js

# Expected output:
# ✓ Passed:  9/9
# ✅ All validation checks passed!
```

**Smoke Tests**:
```bash
# Test critical endpoints
echo "Testing API endpoints..."

# 1. Health check
curl -s https://lume.dev/api/base/health | jq '.status'

# 2. List entities
curl -s https://lume.dev/api/entities | jq '.length'

# 3. List records
curl -s https://lume.dev/api/entities/1/records?limit=1 | jq '.records | length'

# 4. Create test record
curl -X POST https://lume.dev/api/entities/1/records \
  -H "Content-Type: application/json" \
  -d '{"name":"Cutover Test Record"}' | jq '.id'

# 5. User login
curl -X POST https://lume.dev/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"PASSWORD"}' | jq '.token'

echo "✅ All smoke tests passed"
```

### T+90 Minutes (03:30 UTC) — System Online

**Actions**:
1. Remove maintenance mode
2. System live
3. Begin real-time monitoring
4. Open system for traffic

**Go Live**:
```bash
# Remove maintenance page
rm /var/www/html/maintenance.html

# Verify system responding
curl -I https://lume.dev
# Should return 200 OK

# Check all services
docker-compose -f docker-compose.prod.yml ps
# All services should show "Up"

# Announce in Slack
echo "✅ PRODUCTION MIGRATION COMPLETE - SYSTEM ONLINE"
```

### T+120 Minutes (04:00 UTC) — Validation & Monitoring

**Actions**:
1. Monitor error rates
2. Check performance metrics
3. Monitor user activity
4. Test user functionality

**Real-Time Monitoring**:
```bash
# Watch error rate
curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[1m])'

# Check database queries
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "SHOW PROCESSLIST;"

# Memory usage
docker stats lume-prod-backend

# User sessions
curl -s https://lume.dev/api/users/active | jq '.count'
```

### T+150 Minutes (04:30 UTC) — Final Validation

**Actions**:
1. Confirm all systems stable
2. Performance acceptable
3. Error rates normal
4. User reports positive

**Final Checks**:
```bash
# Performance check
ab -n 100 -c 10 https://lume.dev/api/entities
# Should show P95 <500ms

# Error logs
docker logs lume-prod-backend 2>&1 | tail -20 | grep -i error

# Database status
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "STATUS;" | grep "Threads connected"

# User feedback (manual)
# Check support email/Slack for issues
```

### T+180 Minutes (05:00 UTC) — GO-LIVE COMPLETE ✅

**Actions**:
1. Declare cutover successful
2. Transition to support mode
3. Document any issues
4. Schedule post-mortem

**Announcement**:
```
🎉 PRODUCTION GO-LIVE SUCCESSFUL

Timeline:
  Start:    02:00 UTC
  Complete: 05:00 UTC
  Duration: 3 hours

Migration Stats:
  Entities:     24 created
  Records:      15,243 migrated
  Relationships: 3,421 created
  Audit Logs:   Complete

System Status:
  ✅ All services online
  ✅ Performance targets met
  ✅ Error rate <0.1%
  ✅ User feedback positive

Next:
  • 24/7 support continues
  • Monitor closely (24 hours)
  • Post-mortem scheduled
  • Thank you to the team! 🙏
```

---

## Post-Cutover Procedures

### Hours 0-6 (Immediate Post-Cutover)

**Actions**:
1. Monitor system continuously
2. Watch for errors and anomalies
3. Support user issues immediately
4. Track metrics

**Monitoring Focus**:
- Error rate (target: <0.1%)
- P95 latency (target: <500ms)
- Database connections (target: <70% of pool)
- Memory usage (target: <80%)
- Disk space (target: >20% free)

**Team Roles**:
- **Incident Commander**: Reports status, makes decisions
- **Database Engineer**: Monitors MySQL, indexes, queries
- **Backend Engineer**: Monitors API, error logs, services
- **Frontend Engineer**: Tests UI, reports UX issues
- **DevOps**: Monitors infrastructure, services, alerting

### Hours 6-24 (First Day Stabilization)

**Actions**:
1. Continue monitoring (8 AM - 5 PM local time team)
2. Address any issues found
3. Optimize based on real metrics
4. Verify user feedback positive

**Optimization Tasks**:
```bash
# 1. Check slow queries
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "SELECT * FROM mysql.slow_log LIMIT 10;"

# 2. Review indexes
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "SHOW INDEXES FROM entity_records;"

# 3. Monitor connection pool
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "SHOW STATUS LIKE 'Threads%';"

# 4. Review error logs
docker logs lume-prod-backend 2>&1 | grep -E "ERROR|WARN" | tail -50

# 5. Check cache hit ratio
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli INFO stats | grep keyspace_hits
```

### Days 2-7 (Post-Launch Support)

**Activities**:
1. Normal support operations
2. Performance optimization
3. Bug fixes for production issues
4. Legacy system decommission (optional)
5. Post-mortem and lessons learned

**Decommission Legacy** (If doing full cutover):
```bash
# After 7 days of stable operation:

# 1. Final backup of Entity Builder system
./scripts/backup.sh

# 2. Archive legacy database
mysqldump lume_legacy > /backups/lume_legacy_archive.sql

# 3. Disable legacy API endpoints
# Update load balancer/reverse proxy
# Return 410 Gone for legacy endpoints

# 4. Notify users of legacy system shutdown
# Clear any cached references

# 5. Monitor for legacy traffic
# Handle any remaining connections

# 6. After 30 days, drop legacy tables (optional)
# mysql -e "DROP DATABASE lume_legacy;"
```

---

## Rollback Procedure (If Needed)

**Trigger rollback if**:
- Critical data loss detected
- Data corruption found
- Performance >50% worse than baseline
- System instability
- User-reported data issues

**Rollback Steps** (~15 minutes):

```bash
# 1. Announce rollback decision
echo "🚨 INITIATING ROLLBACK - Entity Builder migration"

# 2. Stop accepting new requests
# Update load balancer to return 503

# 3. Restore from pre-migration backup
docker-compose -f docker-compose.prod.yml down

# Restore database
mysql -h prod-db -u root -p lume < /backups/lume_pre_migration.sql

# 4. Restart with previous schema
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify legacy system operational
curl https://lume.dev/api/base/health

# 6. Notify stakeholders
echo "✅ ROLLBACK COMPLETE - Legacy system restored"
```

**Recovery Time**: ~15 minutes  
**Data Loss**: None (using backup)  
**User Impact**: ~15 minute downtime

---

## Post-Go-Live Monitoring

### 24/7 Monitoring (First 7 Days)

**On-Call Schedule**:
```
Sat May 10 - Sun May 11: Full team
Sun May 11 - Mon May 12: Engineering lead + DevOps (3-person rotation)
Mon May 12 - Fri May 16: Standard on-call
```

**Alert Thresholds**:
| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | >0.5% | >5% |
| P95 Latency | >1000ms | >3000ms |
| Database CPU | >80% | >95% |
| Memory Usage | >80% | >95% |
| Disk Space | <15% | <5% |

### Production Optimization

**Week 1 Optimizations**:
1. Add missing indexes based on slow queries
2. Tune database connection pool
3. Optimize hot query paths
4. Configure caching headers
5. Adjust alert thresholds

**Example**:
```bash
# Add index on frequently queried field
ALTER TABLE entity_records ADD INDEX idx_status (data->>'$.status');

# Update connection pool
SET GLOBAL max_connections = 1000;
SET GLOBAL max_user_connections = 100;

# Cache settings
PRAGMA query_only = ON;
SET global_read_lock = 1;
```

---

## Post-Mortem & Documentation

### Post-Mortem Meeting (Within 48 Hours)

**Attendees**:
- Engineering lead
- DevOps lead
- Database engineer
- Product manager
- QA lead

**Agenda**:
1. Review what went well
2. Identify issues/problems
3. Root cause analysis
4. Action items for improvement
5. Document lessons learned

**Template**:
```markdown
# Go-Live Post-Mortem

## Timing
- Planned: 02:00-06:00 UTC (4 hours)
- Actual: 02:00-05:15 UTC (3.25 hours)
- **Status**: ✅ AHEAD OF SCHEDULE

## What Went Well
- [ ] Migration script performed well
- [ ] Validation script caught issues
- [ ] Team communication excellent
- [ ] Monitoring alerts functional
- [ ] No data loss

## Issues Encountered
1. [Issue 1]: [Description]
   - Root Cause: [Analysis]
   - Resolution: [Action]
   - Prevention: [Future improvement]

2. [Issue 2]: [Description]
   ...

## Metrics
- Records migrated: 15,243
- Relationships created: 3,421
- Data integrity: 100%
- User impact: Minimal (3-hour maintenance window)

## Action Items
- [ ] Add index on `entity_records.data->>'$.status'`
- [ ] Increase database connection pool from 30 to 50
- [ ] Update load test scenarios
- [ ] Add integration tests for migration
- [ ] Document lessons learned

## Follow-Up
- Next review: May 17, 2026
- Performance baseline: [Metrics]
- Optimization targets: [Goals]
```

### Documentation Updates

After go-live, update:
- [ ] Production deployment runbook
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Performance baselines
- [ ] Security audit findings

---

## Success Criteria

✅ **Go-Live is successful when**:

1. **Cutover Execution**
   - Migration completed in <4 hours
   - All data migrated with 100% accuracy
   - Zero critical issues

2. **System Stability**
   - Error rate <0.1% for first 24 hours
   - P95 latency <500ms
   - No timeout errors
   - No connection pool exhaustion

3. **Data Integrity**
   - 100% record count match
   - Zero orphaned relationships
   - Audit logs complete
   - Soft deletes preserved

4. **User Experience**
   - Users can log in
   - Can create/edit/delete records
   - Filtering and sorting work
   - Bulk import/export functional

5. **Team**
   - No team member burnout
   - Effective communication
   - Quick issue resolution
   - Good post-mortem documented

---

## Escalation Path

If issues arise:

```
Level 1: Engineering lead on-call
  ↓ (if needs help)
Level 2: Database engineer + Backend engineer
  ↓ (if needs help)
Level 3: CTO / VP Engineering
  ↓ (if needs rollback decision)
Level 4: CEO (business decision)
```

**Contact Info**:
- Slack channel: `#production-migration`
- War room: [Meeting link]
- On-call phone: [Numbers]
- Email escalation: [Address]

---

## Celebration 🎉

After successful go-live (once systems stable for 24 hours):
1. Team celebration (virtual or in-person)
2. Thank you message to all participants
3. Post-launch retrospective
4. Update stakeholders
5. Plan next improvements

---

## Related Documentation

- [Phase 1: Infrastructure](PHASE_1_INFRASTRUCTURE.md)
- [Phase 2: Database Migration](PHASE_2_DATABASE_MIGRATION.md)
- [Phase 3: Testing & Validation](PHASE_3_TESTING_VALIDATION.md)
- [Migration Status](MIGRATION_STATUS.md)
- [Entity Builder Complete](ENTITY_BUILDER_COMPLETE.md)

---

**Phase 4 Status**: 🟡 Ready for Execution  
**Next Step**: Obtain Phase 3 approval, schedule cutover window  
**Critical Success Factor**: Team preparation and clear communication

