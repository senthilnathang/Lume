# Production Deployment Checklist

Date: __________ | Deployer: __________ | Reviewer: __________

## Pre-Deployment (7 Days Before)

### Code & Testing
- [ ] All features tested on staging
- [ ] Integration tests passing (100% pass rate)
- [ ] E2E tests passing
- [ ] Code review completed and approved
- [ ] No console errors or warnings
- [ ] Performance benchmarks acceptable (P95 < 1s)

### Security
- [ ] Security audit completed
- [ ] No critical vulnerabilities in dependencies
- [ ] OWASP top 10 checklist reviewed
- [ ] API authentication tested
- [ ] Database user permissions restricted
- [ ] SSL certificates valid for 30+ days
- [ ] SSH keys secured
- [ ] Secrets stored in secure vault (not .env files)

### Documentation
- [ ] Deployment guide reviewed
- [ ] Rollback procedures documented
- [ ] API documentation updated
- [ ] Configuration options documented
- [ ] Team runbooks prepared
- [ ] On-call procedures established

### Infrastructure
- [ ] Server capacity verified
- [ ] Database replication/HA configured
- [ ] Backup system tested
- [ ] Monitoring/alerting configured
- [ ] Log aggregation working
- [ ] DNS configured correctly
- [ ] SSL certificate installed

### Backup & Recovery
- [ ] Full database backup taken
- [ ] Backup tested (restore verification)
- [ ] Rollback procedure tested on staging
- [ ] Off-site backup copies verified
- [ ] Recovery time objective (RTO) confirmed
- [ ] Recovery point objective (RPO) confirmed

---

## 1 Day Before Deployment

### Final Verification
- [ ] Database backup completed
- [ ] No uncommitted changes in code
- [ ] All environment variables set correctly
- [ ] Secrets securely configured
- [ ] Load balancer configuration ready
- [ ] DNS failover tested (if applicable)
- [ ] Service restart procedures tested

### Team Preparation
- [ ] Team briefing completed
- [ ] On-call engineer assigned
- [ ] Escalation contacts listed
- [ ] Communication channels tested
- [ ] Status page template prepared
- [ ] User announcement drafted
- [ ] Maintenance window communicated

### Final Testing
- [ ] Smoke tests passing
- [ ] Database connection verified
- [ ] API endpoints responding
- [ ] Frontend build successful
- [ ] Admin dashboard functional
- [ ] All example modules testable
- [ ] Health checks working

**Sign-off**: Deployment Manager: __________ Date: __________

---

## Deployment Day

### Pre-Deployment Window (T-30 min)

#### System Checks
- [ ] Server CPU/Memory/Disk usage acceptable
- [ ] Database connections available
- [ ] Redis/cache operational
- [ ] Network connectivity verified
- [ ] All services running normally
- [ ] No active incidents

#### Notification
- [ ] User announcement sent
- [ ] Team notified (Slack/email)
- [ ] Status page maintenance mode activated
- [ ] Support team briefed
- [ ] Emergency contacts on standby

#### Backup
- [ ] Fresh database backup taken
- [ ] Backup verified (restore test)
- [ ] Uploads directory backed up
- [ ] Configuration backed up
- [ ] Backup location confirmed

**Checkpoint 1 Completed**: __________ at __:__ (Signature: __________)

---

### Deployment Window (T-0 min)

#### Service Shutdown
- [ ] Maintenance mode enabled (requests returning 503)
- [ ] No new user sessions allowed
- [ ] Active sessions gracefully closed
- [ ] Background jobs paused
- [ ] Workflow scheduler paused
- [ ] Wait 2 minutes for graceful shutdown

**Checkpoint 2 Completed**: __________ at __:__ (Signature: __________)

#### Database Migration
- [ ] Migration script reviewed
- [ ] Database locked (no external connections)
- [ ] Migration started
- [ ] Progress monitored in logs
- [ ] No errors or warnings observed
- [ ] Migration completed successfully
- [ ] Data integrity verified
- [ ] Row counts compared (before/after)

**Database Migration Status**: ✅ PASSED ⚠️ WARNINGS ❌ FAILED

If failed, execute ROLLBACK:
- [ ] Restore database from backup
- [ ] Verify restoration complete
- [ ] Resume services
- [ ] Re-attempt migration after investigating

**Checkpoint 3 Completed**: __________ at __:__ (Signature: __________)

#### Module Installation
- [ ] Core modules installed (base, rbac, security)
- [ ] Optional modules installed per plan
- [ ] Module dependencies verified
- [ ] Module permissions registered
- [ ] Module menus created
- [ ] No installation errors

Modules Installed:
- [ ] base
- [ ] rbac
- [ ] base_security
- [ ] base_customization
- [ ] base_features_data
- [ ] website
- [ ] editor
- [ ] crm (if applicable)
- [ ] ecommerce (if applicable)
- [ ] Other: _________________

**Checkpoint 4 Completed**: __________ at __:__ (Signature: __________)

#### Service Startup
- [ ] Backend service started
- [ ] Frontend service (nginx) started
- [ ] Wait 10 seconds for services to stabilize
- [ ] Health check passes
- [ ] Database connection successful
- [ ] All services operational

**Services Started**: __________ at __:__

#### Verification
- [ ] API health endpoint responds
- [ ] Frontend loads without errors
- [ ] Admin dashboard accessible
- [ ] Database queries responding
- [ ] No 503 errors
- [ ] Error logs clean
- [ ] Performance metrics normal

**Initial Verification**: ✅ PASS ❌ FAIL

If FAIL, analyze error and attempt remediation or ROLLBACK.

**Checkpoint 5 Completed**: __________ at __:__ (Signature: __________)

#### Maintenance Mode Off
- [ ] Maintenance mode disabled
- [ ] Status page updated to "operational"
- [ ] New user requests accepted
- [ ] Workflow scheduler resumed
- [ ] Background jobs resumed

**Deployment Complete**: __________ at __:__ (Signature: __________)

---

## Post-Deployment Verification (T+30 min)

### Smoke Testing
- [ ] Login flow works
- [ ] Create record works
- [ ] Update record works
- [ ] Delete record works
- [ ] Search/filtering works
- [ ] Admin dashboard accessible
- [ ] Workflows triggering correctly
- [ ] Email notifications sending
- [ ] File uploads working

**Smoke Test Result**: ✅ ALL PASS ⚠️ SOME WARNINGS ❌ FAILURES

If failures detected, log for investigation.

### Performance Monitoring
- [ ] Average response time < 500ms
- [ ] P95 response time < 1000ms
- [ ] Error rate < 0.5%
- [ ] Database query time acceptable
- [ ] API rate limits not exceeded
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Disk usage < 80%

**Performance Status**: ✅ ACCEPTABLE ⚠️ WATCH ❌ CRITICAL

### Error Monitoring
- [ ] Check error logs for exceptions
- [ ] Check Sentry for reported errors
- [ ] Check application logs for warnings
- [ ] Investigate and document any anomalies

Errors Found: _______________________________
Action Items: ________________________________

**Checkpoint 6 Completed**: __________ at __:__ (Signature: __________)

---

## Post-Deployment (24 Hours)

### Health Metrics
- [ ] No increase in error rates
- [ ] No memory leaks detected
- [ ] No database connection issues
- [ ] All workflows completed successfully
- [ ] Backup jobs executed on schedule
- [ ] Log files not growing abnormally
- [ ] Cache hit rate acceptable
- [ ] Database performance stable

### User Feedback
- [ ] No critical user-reported issues
- [ ] No login/access problems
- [ ] No data loss or corruption reported
- [ ] Feature functionality confirmed
- [ ] UI renders correctly
- [ ] Performance acceptable to users

### Documentation
- [ ] Deployment notes documented
- [ ] Any issues and resolutions recorded
- [ ] Lessons learned captured
- [ ] Runbooks updated if needed
- [ ] Team debriefing completed

**Post-Deployment Verification**: ✅ PASS ⚠️ MINOR ISSUES ❌ MAJOR ISSUES

---

## Rollback Procedure (If Needed)

### Decision Criteria
- [ ] Critical error impacting users
- [ ] Data integrity compromised
- [ ] System availability < 99%
- [ ] Security vulnerability discovered
- [ ] Performance unacceptable (P95 > 5s)

### Rollback Execution
- [ ] Notify team of rollback decision
- [ ] Enable maintenance mode
- [ ] Stop backend services
- [ ] Restore database from pre-deployment backup
- [ ] Restart services with previous version
- [ ] Verify rollback successful
- [ ] Disable maintenance mode
- [ ] Notify users

**Rollback Completed**: __________ at __:__ (Signature: __________)

### Rollback Investigation
- [ ] Document issue that triggered rollback
- [ ] Identify root cause
- [ ] Determine fix/mitigation
- [ ] Schedule re-deployment with fix
- [ ] Update deployment plan
- [ ] Brief team on learnings

---

## Sign-Offs

### Deployment Approval
Deployment Manager: _________________________ Date: _______
Operations Lead: ______________________________ Date: _______

### Deployment Execution
Deployed By: _________________________________ Date: _______
Technical Lead: _______________________________ Date: _______

### Post-Deployment Approval
QA/Testing Lead: ______________________________ Date: _______
Release Manager: ______________________________ Date: _______

---

## Post-Mortem (Completed Within 48 Hours)

### Deployment Summary
**Start Time**: __________ **End Time**: __________ **Duration**: __________
**Rollbacks**: ❌ No ✅ Yes (Count: ____)
**Issues**: ❌ None ⚠️ Minor ✅ Major (Count: ____)

### What Went Well
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### What Could Improve
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Action Items for Next Deployment
1. [ ] _________________________________________________________________
2. [ ] _________________________________________________________________
3. [ ] _________________________________________________________________

### Attendees
- _________________________________________________________________
- _________________________________________________________________
- _________________________________________________________________

**Post-Mortem Facilitator**: _____________________ **Date**: __________

---

## Quick Reference

### Useful Commands
```bash
# Check service status
systemctl status lume-backend
systemctl status lume-frontend

# View logs
journalctl -u lume-backend -f
tail -f /var/log/lume/app.log

# Database checks
mysql -e "SELECT COUNT(*) FROM entity_records;" lume
mysql -e "SHOW PROCESSLIST;" lume

# Health check
curl http://localhost:3000/health

# Restart services
systemctl restart lume-backend
systemctl restart lume-frontend

# Database rollback
mysql lume < /backups/db_pre_deployment.sql
```

### Contact Information
- **On-Call Engineer**: _________________________ Phone: __________
- **DevOps Lead**: ______________________________ Phone: __________
- **Database Admin**: ___________________________ Phone: __________
- **Security Contact**: _________________________ Phone: __________

### Emergency Escalation
1. Immediate: On-Call Engineer
2. If unavailable: DevOps Lead
3. If critical: Engineering Manager
4. If security: Security Lead

---

**Notes & Comments**
(Use this space for any additional notes during deployment)

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

