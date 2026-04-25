# Phase 3: Security Testing & A/B Setup — Quick Start Guide

**Complete Phase 3 security validation and A/B testing in 5-7 days**

---

## Overview

Phase 3 extends Phase 2 with:
- **Security validation** (RBAC, data isolation, audit logging, penetration testing)
- **Extended load testing** (production-level profiles)
- **A/B testing setup** (run both legacy and Entity Builder systems in parallel)
- **Integration testing** (all modules together)
- **User acceptance testing** (business team validation)

**Timeline**: 5-7 days  
**Effort**: Full team coordination  
**Risk Level**: Medium (live testing in staging, not production yet)

---

## Prerequisites

### From Phase 2
- [ ] Phase 2 sign-off obtained
- [ ] Staging migration complete and validated
- [ ] Performance baselines established
- [ ] All UAT tests passing
- [ ] Rollback procedure tested

### New Requirements
- [ ] Security testing tools installed (OWASP ZAP, SQLMap, etc.)
- [ ] Load testing infrastructure ready (k6, Apache JMeter)
- [ ] A/B testing proxy/router configured (or manual routing)
- [ ] Database replication configured for A/B setup
- [ ] Security audit team assigned
- [ ] Business team available for UAT

---

## Day 1: Security Validation Setup

### Morning (2 hours)
```bash
# 1. Review security test plan
cat docs/PHASE_3_TESTING_VALIDATION.md | grep -A 50 "Security"

# 2. Verify RBAC is working
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/security-audit.js verify-rbac

# 3. Check audit logging
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/security-audit.js check-audit-logs

# 4. Verify company isolation
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/security-audit.js verify-company-isolation
```

### Afternoon (2 hours)
```bash
# 5. Run penetration test scanner (light scan)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3001 \
  -r /tmp/zap-baseline-report.html

# 6. Check for SQL injection vulnerabilities
sqlmap -u "http://localhost:3001/api/entities/1/records" \
  --batch --risk=1 --level=1

# 7. Verify HTTPS/TLS configuration
docker-compose -f docker-compose.staging.yml exec nginx \
  openssl s_client -connect localhost:443 -showcerts
```

**Success Criteria**:
- ✓ RBAC verified (roles, permissions, access checks)
- ✓ Audit logging working (all actions logged)
- ✓ Company isolation confirmed (no data leakage)
- ✓ No critical vulnerabilities found
- ✓ TLS configured correctly

---

## Day 2: Extended Load Testing

### Setup (1 hour)
```bash
# 1. Create production-like load profile
cat > /tmp/load-profile.yaml << 'EOF'
stages:
  - duration: 2m
    target: 50      # Light baseline
  - duration: 5m
    target: 150     # Moderate increase
  - duration: 10m
    target: 300     # Heavy load
  - duration: 15m
    target: 500     # Sustained stress
  - duration: 5m
    target: 0       # Cooldown
EOF

# 2. Start monitoring dashboard
docker-compose -f docker-compose.staging.yml exec prometheus \
  curl -X POST http://localhost:9090/api/v1/admin/tsdb/clean_tombstones
```

### Execution (8 hours)
```bash
# 3. Run extended load test (k6)
k6 run --vus 100 --duration 30m \
  --env STAGING_API=http://localhost:3001 \
  scripts/load-test-extended.js

# 4. Monitor in real-time
# In separate terminal:
watch -n 5 'docker-compose -f docker-compose.staging.yml exec prometheus \
  curl -s http://localhost:9090/api/v1/query?query="rate(http_requests_total[5m])"'

# 5. Check for degradation
docker stats --no-stream
```

**Success Criteria**:
- ✓ P95 latency < 1000ms at 300 RPS
- ✓ Error rate < 5% under stress
- ✓ No memory leaks (memory stable over 8 hours)
- ✓ Database connections stable
- ✓ No cascading failures

---

## Day 3: A/B Testing Setup

### Infrastructure Setup (4 hours)
```bash
# 1. Create A/B routing configuration
cat > /tmp/ab-routing.conf << 'EOF'
# Route 10% traffic to Entity Builder (B)
# Route 90% traffic to Legacy system (A)

upstream legacy {
  server legacy-db:3000 weight=9;
}

upstream entity-builder {
  server staging-backend:3001 weight=1;
}

server {
  location /api/ {
    # Split routing based on user_id hash
    set $routing_target legacy;
    if ($cookie_user_id ~ "^[0-9]$") {
      set $routing_target entity-builder;
    }
    proxy_pass http://$routing_target;
  }
}
EOF

# 2. Configure database dual-write capability
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/configure-dual-write.js --enable

# 3. Setup comparison logging
cat > /tmp/comparison-logging.js << 'EOF'
// Log all API responses to compare between systems
module.exports = (req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const log = {
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      status: res.statusCode,
      duration_ms: duration,
      system: req.query.system || 'default'
    };
    console.log(JSON.stringify(log));
  });
  next();
};
EOF

# 4. Start collecting comparison metrics
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/ab-test-monitor.js start
```

### Traffic Shift Plan (scheduled)
```
Day 3:   10% to Entity Builder, 90% Legacy
Day 4:   25% to Entity Builder, 75% Legacy
Day 5:   50% to Entity Builder, 50% Legacy
Day 6:   75% to Entity Builder, 25% Legacy
Day 7:  100% to Entity Builder, 0% Legacy (cutover complete)
```

---

## Day 4: Integration Testing

### Full System Integration (6 hours)
```bash
# 1. Test all modules together
bash scripts/phase3-integration-tests.sh

# 2. Verify data flows between modules
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/integration-audit.js

# 3. Test background job processing (BullMQ)
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/test-queue-processing.js

# 4. Verify webhooks and external integrations
curl -X POST http://localhost:3001/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Integration Points to Verify**:
- ✓ Entity Builder ↔ Notifications module
- ✓ Entity Builder ↔ Automation module
- ✓ Entity Builder ↔ Reports module
- ✓ Entity Builder ↔ Website CMS (if used)
- ✓ API ↔ External integrations
- ✓ Background jobs ↔ Entity Builder
- ✓ Webhooks ↔ External systems

---

## Day 5-6: User Acceptance Testing (Business Team)

### Setup & Training (2 hours)
```bash
# 1. Provide test environment access
# Give business team credentials and staging URL
# http://staging.lume.dev (or localhost:8082)

# 2. Brief on Entity Builder interface
# Show how to:
#   - Create/edit records
#   - Apply filters
#   - Use views
#   - Export data
#   - Manage relationships
```

### Test Execution (8 hours)
Business team runs through UAT test cases from Phase 2:
- [ ] Entity Management (create, update, delete entities)
- [ ] Record Operations (create, edit, bulk import records)
- [ ] Filtering & Sorting (complex queries, sorting)
- [ ] Relationships (link/unlink entities)
- [ ] Views (create custom views, save filters)
- [ ] Data Accuracy (verify migrated data is correct)
- [ ] Performance (system responsiveness)
- [ ] Error Recovery (system behavior under errors)

**Success Criteria**:
- ✓ All business workflows functional
- ✓ Data accuracy verified
- ✓ Performance acceptable
- ✓ No blockers identified
- ✓ Team sign-off obtained

---

## Day 7: Final Validation & Sign-Off

### Final Checks (4 hours)
```bash
# 1. Run full test suite one final time
bash scripts/staging-uat-tests.sh

# 2. Verify performance hasn't degraded
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/load-test.js run --rps=100 --duration=300

# 3. Check all logs for errors
docker-compose -f docker-compose.staging.yml logs backend | grep -c ERROR
# Expected: 0

# 4. Verify A/B comparison metrics
cat /tmp/ab-comparison-report.json | jq '.summary'
```

### Sign-Off Process (2 hours)
```bash
# Create final sign-off document
cat > /tmp/lume-migration/PHASE_3_SIGN_OFF.md << 'EOF'
# Phase 3 Sign-Off

## ✓ Security Validation
- [x] RBAC verified and working
- [x] Company isolation confirmed
- [x] Audit logging complete
- [x] Penetration testing passed
- [x] No critical vulnerabilities

## ✓ Load Testing
- [x] 500 RPS sustained for 15+ minutes
- [x] P95 latency < 1000ms
- [x] Error rate < 5%
- [x] No memory leaks detected
- [x] Database stable under load

## ✓ A/B Testing
- [x] 10% → 25% → 50% → 75% → 100% traffic shift
- [x] Comparison metrics collected
- [x] No significant differences in error rates
- [x] User experience comparable
- [x] Ready for production cutover

## ✓ Integration Testing
- [x] All modules tested together
- [x] Data flows verified
- [x] Background jobs functional
- [x] External integrations tested

## ✓ Business Acceptance
- [x] Business team completed UAT
- [x] All workflows validated
- [x] Data accuracy confirmed
- [x] Performance acceptable
- [x] No blockers identified

## Status: ✓ APPROVED FOR PHASE 4 (PRODUCTION GO-LIVE)

**Sign-Offs:**
- Engineering Lead: _________________ Date: _______
- Security Lead: _________________ Date: _______
- DevOps Lead: _________________ Date: _______
- Business Owner: _________________ Date: _______

Ready for production cutover on [DATE].
EOF

cat /tmp/lume-migration/PHASE_3_SIGN_OFF.md
```

---

## Quick Commands Reference

### Security Testing
```bash
# RBAC validation
docker-compose -f docker-compose.staging.yml exec backend \
  node scripts/security-audit.js verify-rbac

# Penetration test
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3001

# Check audit logs
docker-compose -f docker-compose.staging.yml exec mysql \
  mysql -u root -p'gawdesy' lume -e "SELECT COUNT(*) FROM audit_logs WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR);"
```

### Load Testing
```bash
# Extended load test
k6 run --duration 30m --vus 100 scripts/load-test-extended.js

# Monitor live metrics
watch -n 5 'docker stats --no-stream | head -5'

# Check P95 latency
curl -s http://localhost:9090/api/v1/query?query='histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))'
```

### A/B Testing
```bash
# Check traffic split
curl http://localhost:3001/api/admin/ab-status | jq '.traffic_split'

# View comparison metrics
cat /tmp/ab-comparison-report.json | jq '.metrics'

# Shift traffic percentage
curl -X POST http://localhost:3001/api/admin/ab-shift \
  -d '{"entity_builder_percentage": 25}'
```

---

## Timeline Summary

| Day | Phase | Duration | Key Activities |
|-----|-------|----------|-----------------|
| 1 | Security | 4h | RBAC, audit logs, pen test |
| 2 | Load Testing | 8h | 500 RPS sustained, performance check |
| 3 | A/B Setup | 4h | Routing config, traffic split, monitoring |
| 4 | Integration | 6h | Full system testing, module verification |
| 5-6 | UAT | 8h | Business team acceptance testing |
| 7 | Final Validation | 4h | Full test suite, sign-off |

**Total Phase 3 Duration**: 5-7 days (34-38 hours total effort)

---

## Monitoring During Phase 3

### Real-Time Dashboards
- Prometheus: http://localhost:9090 (metrics)
- Grafana: http://localhost:3000 (dashboards)
- Bull Board: http://localhost:3002 (job queue)
- API Health: http://localhost:3001/api/base/health

### Key Metrics to Watch
- P95 Latency (target: < 1000ms)
- Error Rate (target: < 5%)
- Memory Usage (should be stable)
- Database Connections (should not spike)
- A/B Traffic Split (should show % routing correctly)

---

## Success Criteria

Phase 3 is **COMPLETE** when:

- ✓ Security validation passed (no critical vulnerabilities)
- ✓ Load testing targets met (P95 < 1000ms, error < 5%)
- ✓ A/B testing successfully shifted 100% traffic
- ✓ Integration testing passed (all modules working together)
- ✓ Business team UAT signed off
- ✓ All team sign-offs obtained
- ✓ Ready for Phase 4 production cutover

---

## Next Steps (Phase 4)

Upon Phase 3 completion:

1. **Schedule Production Go-Live**
   - Saturday 02:00-06:00 UTC (off-peak window)
   - 4-hour maintenance window
   - All teams on standby

2. **Prepare Go-Live Procedures**
   - Review `docs/PHASE_4_GO_LIVE.md`
   - Brief all teams on their roles
   - Verify backup procedures
   - Test rollback one final time

3. **Execute Cutover**
   - Enable maintenance mode
   - Verify all systems healthy
   - Open to users
   - Monitor continuously for 24 hours

4. **Post-Launch**
   - Stabilization period (Days 2-7)
   - Performance monitoring
   - User feedback collection
   - Issues triage and resolution

---

## Support & Escalation

### If Tests Fail
1. **Check logs**: `/tmp/lume-migration/phase3-*.log`
2. **Isolate issue**: Review specific test output
3. **Rollback if needed**: Use Phase 2 rollback procedure
4. **Document and retry**: Fix issue, re-run test

### If Performance Degrades
1. **Check resource usage**: Memory, CPU, disk
2. **Review slow queries**: Database query performance
3. **Add indexes if needed**: Optimize slow queries
4. **Scale if needed**: Add backend replicas

### If Security Issues Found
1. **Severity assessment**: Critical vs. non-critical
2. **Immediate mitigation**: Fix or patch
3. **Re-test**: Verify fix resolves issue
4. **Document**: Add to post-launch items if minor

### Escalation Path
- Level 1: Test Engineer / DevOps
- Level 2: Engineering Lead / Security Lead
- Level 3: VP Engineering / CTO
- Level 4: CEO (if considering delay)

---

## Key Documents

- **Full Details**: `docs/PHASE_3_TESTING_VALIDATION.md` (400+ pages)
- **Test Cases**: `docs/UAT_TEST_CASES.md` (30 scenarios)
- **Security Guide**: `docs/INCIDENT_RESPONSE_PLAYBOOK.md` (disaster recovery)
- **Next Phase**: `docs/PHASE_4_GO_LIVE.md` (production cutover)

---

**Phase 3 Timeline**: 5-7 days  
**Estimated Success Probability**: 90%+ (based on Phase 2 success)  
**Next Milestone**: Production go-live (Phase 4)

Ready to begin Phase 3 after Phase 2 sign-off.
