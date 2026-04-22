# Incident Response & Disaster Recovery Playbook

**Status**: Operational procedures  
**Date**: 2026-04-22  
**Severity Levels**: S1 (Critical) → S4 (Minor)

---

## Incident Severity Levels

| Level | Impact | Response Time | Examples |
|-------|--------|---|----------|
| **S1 - Critical** | Service down, data loss | <5 min | Service unreachable, data corruption, security breach |
| **S2 - High** | Partial outage, major feature broken | <15 min | API errors, slow performance (>5s), cannot create records |
| **S3 - Medium** | Feature degraded, <1% users affected | <1 hour | Slow filter, occasional timeout, UI glitch |
| **S4 - Minor** | Cosmetic issue, workaround exists | <4 hours | Typo, layout issue, help text error |

---

## S1: Critical — Service Down (5 min response)

### Initial Response (Minute 0-1)

**Upon Alert**:
1. Acknowledge in Slack: "🚨 S1 INCIDENT: [Service] down"
2. Open #incidents channel
3. Notify on-call team (ping @on-call)
4. Start incident war room [link]

**Incident Commander** (assign immediately):
- Coordinates response
- Reports every 5 minutes
- Makes escalation decisions

### Diagnosis (Minute 1-3)

**Immediate Checks**:
```bash
# 1. Service status
docker-compose -f docker-compose.prod.yml ps
# Expected: All services "Up"

# 2. Health endpoint
curl https://lume.dev/api/base/health
# Expected: {"status":"ok"}

# 3. Error logs (last 5 min)
docker logs lume-prod-backend --since 5m 2>&1 | head -50

# 4. Resource utilization
docker stats
# Check: CPU <90%, Memory <90%, Disk >20%

# 5. Database connectivity
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SELECT 1;"

# 6. Recent changes
git log --oneline -5
# Check: Any recent deployments?
```

**Decision Tree**:
```
Is service running?
├─ YES → Go to "Service Degraded" path
└─ NO → Service crashed
        ├─ Restart service
        ├─ If restart fails → Database issue?
        │  ├─ Check database logs
        │  ├─ Check disk space (df -h)
        │  └─ If full → Cleanup old logs, try again
        └─ If still fails → ROLLBACK needed
```

### Remediation (Minute 3-5)

**Quick Fixes** (Try in order):

1. **Restart Service**:
```bash
docker-compose -f docker-compose.prod.yml restart backend
# Wait 30 seconds
curl https://lume.dev/api/base/health
```

2. **Restart All Services**:
```bash
docker-compose -f docker-compose.prod.yml restart
# Wait 1 minute
curl https://lume.dev/api/base/health
```

3. **Check Recent Deployment**:
```bash
git log -1
# If deployment in last 15 min and caused issue:
# ROLLBACK
```

4. **Free Disk Space** (if full):
```bash
# Clear old logs
docker exec lume-prod-backend \
  find /app/logs -mtime +7 -delete

# Clear old backups
rm /mnt/backups/lume_backup_*_old.sql.gz.enc
```

### Critical Decision: Rollback?

**ROLLBACK if**:
- Service still down after 5 minutes
- Can't identify root cause
- Multiple services crashing
- Data corruption detected

**Execute Rollback** (Minute 5-15):
```bash
# 1. Stop current deployment
docker-compose -f docker-compose.prod.yml stop

# 2. Restore database from backup
docker-compose -f docker-compose.prod.yml down
mysql -h prod-db -u root -p lume < /backups/lume_backup_latest.sql.gz | gunzip

# 3. Start with previous version
export IMAGE_TAG=v1.1.0  # Previous stable version
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify health
curl https://lume.dev/api/base/health

# 5. Announce rollback
Slack: "✅ ROLLBACK COMPLETE. System restored to v1.1.0"

# 6. Incident summary
Post in #incidents:
"S1 INCIDENT RESOLVED
 Duration: X minutes
 Impact: Full service down
 Root Cause: [TBD - investigate later]
 Resolution: Rolled back to v1.1.0
 Postmortem: [Scheduled for tomorrow]"
```

---

## S2: High — Major Feature Broken (15 min response)

### Examples
- Cannot create records (filtering broken)
- API returning 500 errors for specific operations
- Slow performance (>5 seconds)
- Data not saving

### Investigation

```bash
# 1. Identify affected feature
# Example: "Users cannot filter by status"

# 2. Check recent changes
git log --oneline -10 | grep -i "filter\|status"

# 3. Database query analysis
# Enable slow query logging temporarily
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"

# 4. Reproduce issue
# Try to filter in staging environment
# Compare behavior between prod and staging

# 5. Check error logs
docker logs lume-prod-backend --since 15m -f | grep -E "ERROR|filter"

# 6. Metrics check
# P95 latency, error rate, database CPU
```

### Resolution Path

**Quick Fix (if code issue)**:
```bash
# 1. Fix code locally
# [Make the change]

# 2. Test fix
npm test

# 3. Build and deploy to staging
docker build -t lume/backend:hotfix-v1 .
docker-compose -f docker-compose.staging.yml pull
docker-compose -f docker-compose.staging.yml up -d

# 4. Verify fix in staging
curl http://staging.lume.dev/api/entities/1/records?filters=...

# 5. Deploy to production (rolling)
docker push lume/backend:hotfix-v1
docker-compose -f docker-compose.prod.yml up -d

# 6. Monitor
# Watch error rate drop
```

**If Database Issue**:
```bash
# 1. Check query performance
EXPLAIN SELECT * FROM entity_records WHERE data->'$.status' = 'active';

# 2. Add missing index
ALTER TABLE entity_records ADD INDEX idx_status (data->'$.status');

# 3. Analyze table
ANALYZE TABLE entity_records;

# 4. Monitor performance
# Check query latency improves
```

---

## S3: Medium — Feature Degraded (1 hour response)

### Examples
- Occasional timeout errors
- Slow performance for specific operations
- UI glitch in form
- One user reporting issue

### Triage

```bash
# 1. Reproduce issue
# Try 5 times to confirm consistency

# 2. Isolate scope
# Is it affecting all users or specific user?
# Is it affecting all records or specific records?

# 3. Check if workaround exists
# Can user accomplish goal differently?

# 4. Gather metrics
# Error rate: curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total[5m])'
# Latency: Check Grafana dashboard
```

### Action

- **Workaround exists**: Document it, create issue for fix
- **Affecting multiple users**: Escalate to S2
- **Intermittent**: Increase monitoring, create issue
- **Reproducible**: Schedule for next sprint

---

## S4: Minor — Cosmetic Issue (<4 hours)

### Examples
- Typo in UI
- Button alignment off
- Help text unclear
- Color not matching design

### Action

1. Create issue in backlog
2. Assign to team
3. Fix in next sprint
4. No emergency response needed

---

## Disaster Recovery Procedures

### Scenario 1: Complete Database Failure

**Recovery Steps**:

```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml stop

# 2. Restore from latest backup
BACKUP_FILE="/mnt/backups/lume_backup_latest.sql.gz.enc"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"

# Decrypt and restore
openssl enc -aes-256-cbc -d -in "$BACKUP_FILE" -pass pass:"$ENCRYPTION_KEY" | \
  gunzip | \
  mysql -h prod-db -u root -p lume

# 3. Verify data
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "SELECT COUNT(*) FROM entity_records;"

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify health
curl https://lume.dev/api/base/health
```

**Data Loss**: Depends on backup frequency
- Daily backup: Max 24 hours data loss
- Hourly backup: Max 1 hour data loss

### Scenario 2: Corrupted Data

**Detection**:
```bash
# If validation script reports errors:
docker-compose -f docker-compose.prod.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js
  # If shows "❌ FAIL", data corruption suspected
```

**Recovery**:

```bash
# 1. Identify corruption
# Check audit logs for when it started
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;"

# 2. Find clean backup before corruption
# Check backup timestamps
ls -lh /mnt/backups/ | grep -E "(2026-05-10|2026-05-09)"

# 3. Restore to point before corruption
# Example: Corrupt data detected at 15:00 UTC, restore from 14:00 backup
BACKUP_FILE="/mnt/backups/lume_backup_2026-05-10_1400.sql.gz.enc"

openssl enc -aes-256-cbc -d -in "$BACKUP_FILE" -pass pass:"$ENCRYPTION_KEY" | \
  gunzip | \
  mysql lume

# 4. Verify clean
docker-compose -f docker-compose.prod.yml exec backend \
  node scripts/validate-migration.js
  # Should show all checks pass

# 5. Notify users
"We restored from backup at 2:00 PM.
 Any changes after that time may be lost.
 If you made changes between 2-3 PM, please resubmit."

# 6. Post-mortem
# Investigate root cause of corruption
```

### Scenario 3: Security Breach

**Detection**:
- Unauthorized access logged
- Suspicious API calls detected
- Data exfiltration noticed
- Malware detected

**Immediate Actions**:

```bash
# 1. Isolate affected systems
docker-compose -f docker-compose.prod.yml stop backend

# 2. Preserve evidence
# Don't delete logs, keep everything
tar -czf /backups/security-incident-$(date +%s).tar.gz /opt/Lume/logs

# 3. Notify security team
# [Call immediately]

# 4. Change credentials
# Update database password
# Update API keys
# Rotate JWT secrets

# 5. Check for damage
# Review access logs for what was accessed
# Query to check for unauthorized modifications:
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "SELECT * FROM audit_logs WHERE created_at > '[BREACH_TIME]';"

# 6. Determine recovery path
# - If read-only breach: Just update credentials
# - If writes occurred: Restore from backup
# - If all data compromised: Contact authorities
```

**Long-Term**:
- Full security audit
- Penetration testing
- Update security practices
- User notification if data exposed

### Scenario 4: Complete Infrastructure Failure

**Backup Data Center Ready**?

**If YES** (standby ready):
```bash
# 1. Update DNS to point to backup DC
# [Update DNS records]

# 2. Start backup cluster
docker-compose -f docker-compose.prod.yml up -d \
  -H ssh://backup-dc-host

# 3. Verify all services online
curl https://backup-lume.dev/api/base/health
```

**If NO** (rebuild from scratch):
```bash
# 1. Provision new infrastructure
# [Cloud provider provisioning]

# 2. Deploy docker stack to new servers
docker-compose -f docker-compose.prod.yml up -d

# 3. Restore database
mysql lume < /offline-backups/lume_latest.sql

# 4. Update DNS (point to new IP)
# [Update DNS records]

# 5. Verify
curl https://lume.dev/api/base/health

# Estimated recovery time: 2-4 hours
```

---

## Post-Incident Activities

### Immediate (Within 1 hour)

```
1. [ ] Service fully restored
2. [ ] Users notified
3. [ ] Incident documented (what happened, impact, resolution)
4. [ ] Root cause identified
5. [ ] Post-mortem scheduled (within 24 hours)
```

### Post-Mortem (Within 24 hours)

**Attendees**:
- Incident Commander
- Engineering Lead
- DevOps Lead
- Product Manager

**Questions**:
1. What happened?
2. Why did it happen?
3. How did we detect it?
4. How did we resolve it?
5. How do we prevent recurrence?
6. What can we improve in our processes?

**Output**:
```markdown
# Incident Post-Mortem

## Summary
[1-2 sentence overview]

## Timeline
- 15:00 UTC: Alert triggered (database CPU high)
- 15:05 UTC: Identified slow query
- 15:15 UTC: Added index
- 15:20 UTC: Performance returned to normal

## Root Cause
[Analysis of why it happened]

## Impact
- Duration: 20 minutes
- Users affected: ~500 (10% of active users)
- Data loss: None
- Revenue impact: ~$X

## Prevention
[What changes prevent this in future]
- [ ] Add monitoring for this query
- [ ] Document index requirements
- [ ] Review slow query logs weekly

## Follow-Up
- Owner: [Name]
- Due date: [Date]
- Target: Deploy index optimization to prod
```

---

## Common Incidents & Solutions

### Database Connection Pool Exhausted

**Symptoms**: 
- API returns "connection timeout"
- Error rate spikes
- No obvious service issues

**Fix**:
```bash
# 1. Check connections
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW STATUS LIKE 'Threads_connected';"

# 2. Increase pool size (docker-compose.prod.yml)
DATABASE_POOL_MAX=50  # Increase from 30

# 3. Kill idle connections (temporary)
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -e "SHOW PROCESSLIST;"
  # Look for idle (Sleep) connections >5 min
  # KILL [process-id]

# 4. Restart backend to apply new pool size
docker-compose -f docker-compose.prod.yml restart backend

# 5. Monitor
# Check if connection count returns to normal
```

### Slow Queries

**Symptoms**:
- P95 latency >1000ms
- Timeout errors from API
- CPU usage >90%

**Fix**:
```bash
# 1. Identify slow query
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "SELECT * FROM mysql.slow_log LIMIT 5;"

# 2. Analyze query
EXPLAIN [query];

# 3. Add index if needed
ALTER TABLE [table] ADD INDEX idx_name (column);

# 4. Optimize query (if code issue)
# Rewrite query to be more efficient

# 5. Monitor improvement
# Check if P95 latency improves after index
```

### Memory Leak

**Symptoms**:
- Memory usage increases over time
- Service eventually crashes
- Restart temporarily fixes it

**Fix**:
```bash
# 1. Monitor memory over time
docker stats lume-prod-backend --no-stream --interval 60

# 2. Check for resource leaks
# Review code for:
# - Unclosed connections
# - Growing arrays/caches
# - Event listener cleanup

# 3. Temporary: Restart on schedule
# Add cron job to restart service daily at 3 AM
# This buys time while investigating

# 4. Permanent: Fix leak
# Update code to properly cleanup resources

# 5. Deploy fix and monitor
```

---

## Escalation Contact Tree

```
Level 1: On-Call Engineer
  - Phone: [number]
  - Slack: @on-call
  - Max wait: 5 minutes
  - Authority: Tactical decisions

Level 2: Engineering Lead
  - Phone: [number]
  - Slack: @eng-lead
  - Authority: Code deployment, rollback

Level 3: VP Engineering/CTO
  - Phone: [number]
  - Authority: Major decisions

Level 4: CEO
  - Phone: [number]
  - Authority: Business decisions, user communication
```

---

## Communication Templates

### To Users (Service Down)

```
⚠️ SERVICE DOWN - We're investigating
We're aware of issues accessing [service].
Our team is working on it.

Next update: 15 minutes
Status page: https://status.lume.dev
```

### To Users (Issue Identified)

```
🔧 ROOT CAUSE IDENTIFIED
We found the issue: [cause]
We're applying a fix now.
ETA: 15 minutes

Thank you for your patience!
```

### To Users (Issue Resolved)

```
✅ RESOLVED
The issue is fixed. Everything is back to normal.
You can resume work now.

We apologize for the disruption.
```

### Post-Incident User Email

```
Subject: Service Incident - Post-Mortem

We experienced a [X-minute] outage on [date] at [time].

What happened:
[Explanation in plain English]

What we've done:
[Changes made to prevent recurrence]

What you should do:
[Any required actions from users]

Questions?
Contact: support@lume.dev
Status page: https://status.lume.dev
```

---

**Keep this playbook accessible and updated regularly.**

