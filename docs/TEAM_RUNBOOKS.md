# Team Runbooks — Role-Specific Procedures

**Status**: Supporting documentation  
**Date**: 2026-04-22  
**Audience**: Engineering, DevOps, Business teams

---

## Engineering Team Runbook

### Daily Responsibilities

**Start of Day**:
```bash
# 1. Check deployment status
curl -s https://lume.dev/api/base/health | jq .

# 2. Review error logs
docker logs lume-prod-backend 2>&1 | grep -E "ERROR|WARN" | tail -20

# 3. Check alert dashboard
# Open: https://lume.dev/grafana

# 4. Review overnight issues
# Check Slack #production-migration channel

# 5. Standup with team
# Quick status: what changed, any issues, blockers
```

### Feature Development

**Setup Local Environment**:
```bash
# 1. Clone and prepare
git clone [repo] && cd Lume
git checkout -b feature/my-feature

# 2. Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# 3. Run tests
npm test

# 4. Start backend
cd backend && npm run dev

# 5. Start frontend
cd ../frontend/apps/web-lume && npm run dev
```

**Creating New Entity Field Type**:
```bash
# 1. Add to backend validation (src/core/services/job-processors.js)
case 'my-type':
  return value !== null && typeof value === 'string';

# 2. Add to frontend FieldRenderer.vue
<template v-else-if="field.type === 'my-type'">
  <a-input v-model="modelValue" />
</template>

# 3. Add to EntityFormView.vue validation
if (field.type === 'my-type') {
  rules.push({ type: 'string', message: 'Invalid format' });
}

# 4. Test locally
npm test

# 5. Create PR with tests
git add .
git commit -m "feat: add my-type field"
git push origin feature/my-feature
```

### Bug Investigation

**Reproduce Production Issue Locally**:
```bash
# 1. Get reproduction steps from issue
# Example: "Records not filtering by status"

# 2. Create test data
curl -X POST http://localhost:3000/api/entities \
  -d '{"name":"test_entity","label":"Test"}'

curl -X POST http://localhost:3000/api/entities/1/records \
  -d '{"name":"Test","status":"active"}'

# 3. Reproduce issue
curl 'http://localhost:3000/api/entities/1/records?filters=[{"field":"status","operator":"equals","value":"active"}]'

# 4. Enable debug logging
export DEBUG=*
npm run dev

# 5. Monitor logs while reproducing
tail -f backend/logs/debug.log

# 6. Fix in code
# ... make changes ...

# 7. Verify fix
npm test
curl 'http://localhost:3000/...' # retest

# 8. Commit fix
git add .
git commit -m "fix: filter by status working correctly"
```

### Code Review Checklist

When reviewing PRs:
- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security issues (SQL injection, XSS, etc.)
- [ ] Performance implications considered
- [ ] No breaking changes (or documented)
- [ ] Linting passes
- [ ] PR description clear

---

## DevOps Team Runbook

### Daily Monitoring

**Morning Checks** (Start of day):
```bash
# 1. System health
docker-compose -f docker-compose.prod.yml ps

# 2. Database status
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SHOW STATUS LIKE 'Threads%';"

# 3. Disk space
docker exec lume-prod-db df -h /var/lib/mysql

# 4. Backup status
ls -lh /mnt/backups/ | tail -3

# 5. Error rate
curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m])'

# 6. Check Grafana
# Open: https://lume.dev/grafana (dashboards)

# 7. Alert summary
# Check Prometheus: http://localhost:9090/alerts
```

**Escalation Response**:
```bash
# On-call alert received:

# 1. Acknowledge alert
# In Slack: "Investigating [alert-name]"

# 2. Gather metrics
curl -s http://localhost:9090/api/v1/query?query='[your-metric]'

# 3. Check logs
docker logs lume-prod-backend --tail 100 -f

# 4. Decision matrix:
# - Issue clear → Fix immediately
# - Issue unclear → Gather more data
# - Service critical → Consider rollback
# - Service degraded → Apply hotfix

# 5. Document
# Create incident report with:
# - Time triggered
# - Root cause
# - Actions taken
# - Resolution time
# - Prevention for future
```

### Database Maintenance

**Daily Backup Verification**:
```bash
# 1. Check latest backup
ls -lh /mnt/backups/lume_backup_*.sql.gz.enc | tail -1

# 2. Verify backup integrity
file /mnt/backups/lume_backup_latest.sql.gz.enc

# 3. Test restore (in staging)
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql < /backups/lume_backup_latest.sql

# 4. Verify data
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql lume -e "SELECT COUNT(*) FROM entity_records;"
```

**Weekly Optimization**:
```bash
# 1. Check slow queries
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p lume -e "SELECT * FROM mysql.slow_log LIMIT 10;" \
  | awk '{print $NF}' | sort | uniq -c | sort -rn

# 2. Add missing indexes
# Example: ALTER TABLE entity_records ADD INDEX idx_status ...

# 3. Analyze tables
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "ANALYZE TABLE entity_records;"

# 4. Check table fragmentation
# Example: if fragmentation >30%, rebuild table

# 5. Update statistics
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql lume -e "OPTIMIZE TABLE entity_records;"
```

### Deployment Procedures

**Deploy New Version**:
```bash
# 1. Build Docker images
cd backend && docker build -t lume/backend:v1.2.0 .
cd ../frontend && docker build -t lume/frontend:v1.2.0 .

# 2. Push to registry
docker push lume/backend:v1.2.0
docker push lume/frontend:v1.2.0

# 3. Update docker-compose.prod.yml
# Change IMAGE_TAG=v1.2.0

# 4. Deploy to staging first
docker-compose -f docker-compose.staging.yml pull
docker-compose -f docker-compose.staging.yml up -d

# 5. Run smoke tests on staging
curl http://staging.lume.dev/api/base/health

# 6. Get approval from engineering lead

# 7. Deploy to production (rolling update)
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 8. Monitor during rollout
docker-compose -f docker-compose.prod.yml ps
# Watch: backend replicas coming up one-by-one

# 9. Health checks
curl https://lume.dev/api/base/health
curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[1m])'

# 10. Rollback if needed
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d IMAGE_TAG=v1.1.0
```

### Scaling & Performance Tuning

**Scale Backend**:
```bash
# In docker-compose.prod.yml, increase replicas:
backend:
  deploy:
    replicas: 5  # was 3

# Apply scaling
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
```

**Tune Redis**:
```bash
# Current config in docker-compose.prod.yml:
redis:
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru

# Adjust based on memory available:
# - Increase if memory available: --maxmemory 4gb
# - Change eviction policy: --maxmemory-policy volatile-lru
```

---

## Business/Product Team Runbook

### Pre-Launch Preparation

**Week Before Go-Live**:
1. [ ] Confirm go-live date/time with all teams
2. [ ] Prepare user communication (email template)
3. [ ] Schedule post-launch support (24/7 rotation)
4. [ ] Brief customer success team
5. [ ] Update help documentation
6. [ ] Create FAQs for common questions

**Day Before Go-Live**:
1. [ ] Send user notification (go-live starting in 24 hours)
2. [ ] Brief support team on escalation procedures
3. [ ] Confirm all stakeholders can attend war room
4. [ ] Verify on-call schedule finalized
5. [ ] Test communication channels (Slack, email, phone)

### During Go-Live

**Timeline**:
```
01:50 UTC: War room opens
02:00 UTC: Maintenance page goes live
02:05 UTC: Migration starts
03:30 UTC: System comes online
04:00 UTC: Final validation
05:00 UTC: Announcement sent

Role during cutover:
├─ Product Manager: Customer communication, issue triage
├─ Support Lead: Monitor support channels
└─ Executive: Final decisions, stakeholder communication
```

**Issue Triage Matrix**:
```
Issue Category | Impact | Action
────────────────────────────────────────
Data loss      | Critical | ROLLBACK immediately
Performance    | High | Investigate, may rollback
Missing field  | Medium | Hotfix in production
UI glitch      | Low | Document, fix later
```

**User Communication Templates**:
```markdown
# At Start (02:00 UTC):
🔧 Planned Maintenance
We're upgrading our system. Expected completion: 05:00 UTC
Thank you for your patience!

# At Completion (05:00 UTC):
✅ Maintenance Complete
The upgrade is done. You can now log back in.
Let us know if you experience any issues!

# If Issues (on-demand):
⚠️ We're Investigating
We're aware of [issue]. Our team is working on it.
Updates every 15 minutes in this channel.
```

### Post-Launch Activities

**First 24 Hours**:
- [ ] Monitor support tickets
- [ ] Check user feedback on social media
- [ ] Triage critical issues
- [ ] Communicate with stakeholders every 4 hours

**First Week**:
- [ ] Collect user feedback
- [ ] Create feature request list
- [ ] Document "gotchas" for training
- [ ] Hold post-mortem with team

### Monthly Responsibilities

**Product Planning**:
- [ ] Review Entity Builder adoption metrics
- [ ] Gather customer feedback
- [ ] Prioritize feature requests
- [ ] Plan next release

**User Training**:
- [ ] Webinars on new features
- [ ] Video tutorials
- [ ] Help documentation updates
- [ ] Support ticket analysis

---

## Cross-Team Communication

### Daily Standup Format

**5 minutes, same time each day**:
```
Each person: "What I did, what I'm doing, blockers"

Engineering Lead:
  "Merged 2 PRs, working on performance optimization,
   need DevOps to check database indexes"

DevOps Lead:
  "Deployed v1.2.0 to staging, monitoring it,
   can help with indexes after deployment"

Product Manager:
  "Collected user feedback, 3 feature requests,
   all systems healthy so far"
```

### Incident Response Format

**On alert**:
```
[Incident Commander] Slack #incidents:
"🚨 INCIDENT: [alert-name]
 Severity: [S1/S2/S3]
 Impact: [what's affected]
 Status: INVESTIGATING
 Updates: every 15 min"

[DevOps] "Checking metrics..."
[Engineering] "Checking code changes..."
[Product] "Monitoring support tickets..."

[Incident Commander] "ROOT CAUSE FOUND: [cause]"
[Engineering] "Applying fix..."
[Incident Commander] "✅ RESOLVED at [time]
 Root cause: [analysis]
 Post-mortem: [scheduled for date/time]"
```

### Escalation Process

**L1 → L2** (if on-call can't resolve):
```
On-call → Engineering Lead → DevOps Lead
(max 5 min per level)
```

**L2 → L3** (if issue still unresolved):
```
Engineering Lead → CTO → VP Engineering
(max 10 min per level)
```

**L3 → L4** (if considering rollback/major decision):
```
CTO → CEO (for approval)
```

---

## Quick Reference

### Critical Commands

**Health Check**:
```bash
curl https://lume.dev/api/base/health
```

**View Logs**:
```bash
docker logs lume-prod-backend -f --tail 100
```

**Database Status**:
```bash
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p -e "SHOW STATUS LIKE 'Uptime';"
```

**Restart Service**:
```bash
docker-compose -f docker-compose.prod.yml restart backend
```

**View Metrics**:
```bash
# In Grafana: https://lume.dev/grafana
# Dashboard: Lume Production Overview
```

**Contact On-Call**:
```bash
# Check schedule: [on-call-schedule-link]
# Phone: [number]
# Slack: @on-call
```

---

## Support Hours

**24/7 During Go-Live Week**:
- Full team on-call
- War room available
- Fast escalation path

**Regular Support**:
- Business hours: Full team available
- After hours: On-call engineer + manager
- Critical issues: 15-minute response

---

## Training Checklist

**Before your first shift**:
- [ ] Read this runbook
- [ ] Know your role (Engineering/DevOps/Business)
- [ ] Know your escalation contact
- [ ] Test your communication methods
- [ ] Understand incident response process
- [ ] Know where to find documentation

**First week**:
- [ ] Shadow experienced team member
- [ ] Assist with monitoring
- [ ] Participate in standups
- [ ] Document questions/blockers

---

**This runbook is living documentation. Update as you learn!**

