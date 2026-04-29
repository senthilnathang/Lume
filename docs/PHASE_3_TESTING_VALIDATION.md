# Phase 3: Testing & Validation — Comprehensive Guide

**Status**: 🟡 Ready to Execute  
**Date**: 2026-04-22  
**Duration**: 1-2 weeks (staging → production validation)  
**Prerequisites**: Phase 2 migration complete and validated

---

## Overview

Phase 3 validates the Entity Builder system through comprehensive testing before production cutover:

1. **Staging Testing** - Full system validation in cloned production environment
2. **Load Testing** - Performance baseline and stress testing
3. **UAT** - User acceptance testing with business stakeholders
4. **Security Validation** - Access control, data isolation, encryption
5. **A/B Testing Setup** - Prepare for parallel running (optional)
6. **Go-Live Readiness** - Final checklist and approval

---

## Testing Strategy

### Timeline

```
Week 1: Staging Validation
├─ Day 1: Smoke tests & basic functionality
├─ Day 2: Comprehensive feature testing
├─ Day 3: UAT with stakeholders
├─ Day 4: Performance testing
└─ Day 5: Security validation & fixes

Week 2: Production Readiness
├─ Day 1: Parallel running setup (optional)
├─ Day 2-3: A/B testing with traffic split
├─ Day 4: Final validation
└─ Day 5: Go-live approval
```

### Test Levels

| Level | Scope | Owner | Duration |
|-------|-------|-------|----------|
| **Smoke Tests** | Core functionality | QA | 1-2 hours |
| **Feature Tests** | All entity builder features | QA | 2-3 days |
| **UAT** | Business requirements | Business Users | 2-3 days |
| **Load Tests** | Performance under stress | DevOps | 4-8 hours |
| **Security Tests** | Access control, data isolation | Security | 1-2 days |
| **Integration Tests** | API, webhooks, bulk ops | Engineering | 1 day |

---

## 1. Staging Testing

### 1.1 Smoke Tests (1-2 hours)

Quick validation that core functionality works.

**Test Cases**:
```bash
# 1. System Health
curl http://staging.lume.dev/api/base/health

# 2. Create Entity
curl -X POST http://staging.lume.dev/api/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test_entity",
    "label": "Test Entity",
    "description": "Smoke test entity"
  }'

# 3. Create Record
curl -X POST http://staging.lume.dev/api/entities/1/records \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Record"}'

# 4. List Records
curl http://staging.lume.dev/api/entities/1/records?limit=10

# 5. Update Record
curl -X PUT http://staging.lume.dev/api/entities/1/records/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Record"}'

# 6. Filter Records
curl 'http://staging.lume.dev/api/entities/1/records?filters=[{"field":"name","operator":"contains","value":"test"}]'

# 7. Delete Record
curl -X DELETE http://staging.lume.dev/api/entities/1/records/1

# 8. User Login
curl -X POST http://staging.lume.dev/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.dev","password":"testpass"}'

# 9. Check Audit Logs
curl http://staging.lume.dev/api/audit-logs?limit=10

# 10. Health check all services
docker-compose -f docker-compose.staging.yml ps
```

**Expected Results**: ✅ All endpoints respond with 200/201 status

### 1.2 Feature Testing (2-3 days)

Comprehensive test of all entity builder features.

**Test Coverage**:
```
Entity Management
├─ Create entity
├─ Update entity properties
├─ Delete entity (soft delete)
├─ Manage fields (add, edit, delete)
├─ Set field constraints (required, unique)
└─ Configure field permissions

Record Management
├─ Create record
├─ Update record
├─ Delete record (soft delete)
├─ Bulk create/import
├─ Bulk update
├─ Bulk delete
├─ Bulk export
└─ Restore deleted records

Filtering & Search
├─ Single filter
├─ Multiple filters (AND logic)
├─ Different operators (equals, contains, gt, etc.)
├─ Filter by relationship
├─ Save filter as view
└─ Clear filters

Relationships
├─ Create one-to-many relationship
├─ Create many-to-many relationship
├─ Link records
├─ Unlink records
├─ Traverse relationships
└─ Delete with relationship handling

Views
├─ Create list view
├─ Create grid view
├─ Create form view
├─ Configure columns
├─ Set default view
├─ Switch views
└─ Delete view

Sorting & Pagination
├─ Sort ascending/descending
├─ Multi-field sort
├─ Pagination navigation
├─ Configurable page size
└─ Performance with large datasets

Data Validation
├─ Required field validation
├─ Type validation (email, URL, number, date)
├─ Unique constraint validation
├─ Custom validation rules
└─ Error messages clear and helpful

Audit & Compliance
├─ Audit log creation
├─ User attribution
├─ Timestamp accuracy
├─ Change tracking
├─ Soft delete tracking
└─ Restore capability
```

**Documentation**: See `docs/UAT_TEST_CASES.md` for detailed test cases

### 1.3 User Acceptance Testing (2-3 days)

Business stakeholders validate requirements are met.

**Participants**:
- Product Manager
- Department Heads
- End Users (3-5 representatives)
- QA Lead

**Activities**:
1. System demonstration
2. Hands-on testing with test data
3. Requirement validation
4. Feedback collection
5. Issue identification
6. Sign-off documentation

**Test Case Coverage**: 30 UAT scenarios (see `docs/UAT_TEST_CASES.md`)

**Pass Criteria**:
- ✅ All critical test cases pass
- ✅ ≤2 non-critical issues
- ✅ Business requirements met
- ✅ User experience acceptable
- ✅ Stakeholder sign-off obtained

---

## 2. Load Testing

### 2.1 Baseline Testing

Establish performance baseline for Entity Builder.

**Script**: `scripts/load-test.js`

**Test Configuration**:
```bash
# Light load (baseline)
node scripts/load-test.js run \
  --target=http://staging.lume.dev \
  --duration=60 \
  --rps=50 \
  --concurrency=5

# Moderate load
node scripts/load-test.js run \
  --target=http://staging.lume.dev \
  --duration=300 \
  --rps=100 \
  --concurrency=10

# Heavy load (stress test)
node scripts/load-test.js run \
  --target=http://staging.lume.dev \
  --duration=600 \
  --rps=500 \
  --concurrency=50
```

**Test Scenarios**:
1. **List Entities** (30% weight)
   - GET /api/entities
   - Should be cached, very fast

2. **List Records** (40% weight)
   - GET /api/entities/1/records?page=1&limit=20
   - Most common operation

3. **Get Single Record** (15% weight)
   - GET /api/entities/1/records/1
   - Direct lookup

4. **Filter Records** (10% weight)
   - GET /api/entities/1/records?filters=[...]
   - Complex query

5. **Get Views** (5% weight)
   - GET /api/entities/1/views
   - Configuration data

**Performance Targets**:

| Metric | Target | Acceptable |
|--------|--------|------------|
| **P95 Latency** | <300ms | <500ms |
| **P99 Latency** | <500ms | <1000ms |
| **Error Rate** | <0.1% | <1% |
| **Availability** | 99.9% | 99.5% |
| **Throughput** | ≥100 RPS | ≥50 RPS |

**Success Criteria**:
```
✅ PASS if:
  - P95 latency < 500ms
  - P99 latency < 1000ms
  - Error rate < 1%
  - No timeout errors
  - No connection pool exhaustion

⚠️  INVESTIGATE if:
  - P95 latency 500-1000ms
  - Error rate 1-5%
  - Occasional timeout
  - Memory usage > 80%

❌ FAIL if:
  - P95 latency > 1000ms
  - Error rate > 5%
  - Frequent errors
  - Service crashes
  - Database connection pool exhausted
```

### 2.2 Stress Testing (Push to Limits)

**Test Configuration**:
```bash
# Stress test: 2x production load
node scripts/load-test.js run \
  --target=http://staging.lume.dev \
  --duration=600 \
  --rps=1000 \
  --concurrency=100
```

**Expected Behavior**:
- System should gracefully degrade (return 503 under extreme load)
- No data corruption
- Recovery possible after load reduction
- Audit logs complete even under stress

### 2.3 Sustained Load Testing

**Test Configuration**:
```bash
# 12-hour sustained load at 80% capacity
node scripts/load-test.js run \
  --target=http://staging.lume.dev \
  --duration=43200 \
  --rps=80 \
  --concurrency=10
```

**Monitoring**:
- Memory leaks detection
- Connection pool stability
- Database performance degradation
- Disk space usage
- Redis memory management

---

## 3. Security Validation

### 3.1 Access Control Testing

**Test Cases**:

```
1. Role-Based Access Control (RBAC)
   ├─ Admin can perform all operations
   ├─ Manager can read/write own entities
   ├─ Viewer can only read
   └─ Guest cannot access

2. Company Isolation
   ├─ User A sees only Company A records
   ├─ User B sees only Company B records
   ├─ Cross-company data access blocked
   └─ API enforces scoping

3. Field-Level Permissions
   ├─ Sensitive fields hidden from viewers
   ├─ Restricted fields show [REDACTED]
   ├─ Audit logs show field access
   └─ Permissions enforced in API

4. Record-Level Access
   ├─ Owner can modify own records
   ├─ Manager can modify team records
   ├─ Unauthorized users get 403
   └─ Audit logs track access attempts

5. API Authentication
   ├─ Valid JWT accepted
   ├─ Invalid JWT rejected
   ├─ Expired token rejected
   ├─ Missing auth header rejected
   └─ Token refresh works
```

### 3.2 Data Isolation Testing

**Test Cases**:

```
1. Database-Level Isolation
   ├─ company_id enforced in queries
   ├─ No cross-company data leakage
   └─ Soft deletes only for own company

2. API-Level Isolation
   ├─ Query parameters cannot bypass scoping
   ├─ Admin cannot access other companies
   └─ Relationships respect scoping

3. Audit Trail Isolation
   ├─ Users only see own audit entries
   └─ Audit log company_id matches
```

### 3.3 Encryption & Sensitive Data

**Test Cases**:

```
1. Data at Rest
   ├─ Sensitive fields encrypted in DB
   ├─ Passwords hashed and salted
   ├─ Database backups encrypted
   └─ No plaintext passwords in logs

2. Data in Transit
   ├─ HTTPS enforced (HTTP redirects)
   ├─ TLSv1.2+ required
   ├─ Strong cipher suites
   └─ HSTS headers present

3. Backup Security
   ├─ Backups encrypted with AES-256
   ├─ Backup files owned by restricted user
   ├─ Restore tested with encrypted backup
   └─ Encryption key secure
```

### 3.4 Injection & XSS Testing

**Test Cases**:

```
1. SQL Injection
   ├─ Filter with special chars: ' OR '1'='1
   ├─ No SQL errors, safe handling
   └─ Results still correct

2. NoSQL Injection
   ├─ Relationship IDs cannot be objects
   ├─ Comparison operators rejected
   └─ No data leakage

3. XSS Prevention
   ├─ Script tags in text fields escaped
   ├─ HTML entities rendered safely
   └─ No arbitrary JavaScript execution

4. CSRF Protection
   ├─ POST requests require CSRF token
   ├─ Token validated on server
   └─ Invalid token rejected
```

### 3.5 Audit & Logging

**Test Cases**:

```
1. Audit Trail Completeness
   ├─ All CRUD operations logged
   ├─ User and timestamp recorded
   ├─ IP address captured
   └─ Changes tracked in detail

2. Log Security
   ├─ No sensitive data in logs
   ├─ Password changes not logged
   ├─ Logs write-protected
   └─ Retention policy enforced

3. Log Accessibility
   ├─ Users see own audit entries
   ├─ Admins see all entries
   └─ Non-admin cannot modify logs
```

---

## 4. A/B Testing Setup (Optional)

For parallel running, set up traffic splitting:

### 4.1 Infrastructure Setup

```yaml
# Load Balancer Configuration
load_balancer:
  backend_legacy:
    - server1:3000 (weight: 100)
  
  backend_new:
    - server2:3000 (weight: 0)   # Start at 0%

# Traffic Split Progression
Week 1: Legacy 100%, New 0%
Week 2: Legacy 90%, New 10%
Week 3: Legacy 50%, New 50%
Week 4: Legacy 0%, New 100%
```

### 4.2 A/B Testing Implementation

```
Day 1: Setup
├─ Deploy Entity Builder alongside legacy
├─ Route 10% traffic to new system
├─ Monitor error rates
└─ Verify data consistency

Day 2-3: Gradual Shift
├─ 25% traffic to new system
├─ Monitor performance
├─ Gather user feedback
└─ Fix identified issues

Day 4-5: Majority Traffic
├─ 50% traffic to new system
├─ 50% traffic to legacy
├─ Performance parity check
└─ Business metrics comparison
```

### 4.3 Monitoring During A/B Testing

**Key Metrics**:
```
Legacy System:
├─ Request rate
├─ Error rate
├─ P95 latency
└─ User satisfaction

New System:
├─ Request rate
├─ Error rate
├─ P95 latency
└─ User satisfaction

Comparison:
├─ Performance delta <5%
├─ Error rate delta <1%
├─ User feedback positive
└─ Data consistency verified
```

---

## 5. Testing Checklist

### Pre-Testing

- [ ] Staging environment deployed
- [ ] Database migrated
- [ ] Migration validated
- [ ] Test data prepared
- [ ] Test users created
- [ ] Monitoring configured
- [ ] Alerts enabled
- [ ] Load test script ready
- [ ] Team briefed

### Smoke Tests

- [ ] Health check endpoints
- [ ] Create entity
- [ ] Create record
- [ ] Update record
- [ ] Delete record
- [ ] List operations
- [ ] Filter operations
- [ ] User authentication

### Feature Tests

- [ ] 30 UAT test cases
- [ ] All test cases documented
- [ ] Issues logged
- [ ] Non-critical issues <2
- [ ] Critical issues 0

### Load Testing

- [ ] Baseline test (50 RPS)
- [ ] Moderate test (100 RPS)
- [ ] Heavy test (500 RPS)
- [ ] Sustained test (12 hours)
- [ ] Results documented
- [ ] Performance targets met
- [ ] Issues resolved

### Security Testing

- [ ] RBAC verified
- [ ] Company isolation verified
- [ ] Data encryption verified
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Audit trail complete
- [ ] Security report signed off

### UAT Signoff

- [ ] All stakeholders participated
- [ ] All critical items approved
- [ ] Non-critical items documented
- [ ] Issues tracked
- [ ] Sign-off document signed
- [ ] Go-live approval obtained

---

## 6. Issues & Resolution

### How to Handle Test Failures

**Critical Issues** (Blocks Go-Live):
1. Document in detail
2. Assign to engineering
3. Fix in develop
4. Re-test in staging
5. Verify fix
6. Add regression test

**Non-Critical Issues** (Accepted Risk):
1. Document in risk register
2. Assign low priority
3. Schedule for post-launch
4. Mitigate impact
5. Communicate to users

**Common Issues & Solutions**:

| Issue | Cause | Resolution |
|-------|-------|-----------|
| High latency P95 >1s | N+1 queries | Add indexes, optimize queries |
| Occasional timeouts | Connection pool exhausted | Increase pool size |
| Memory leak | Unclosed connections | Review code, add cleanup |
| Data mismatch | Field mapping error | Update migration script |
| Audit log gaps | Middleware not firing | Verify middleware setup |

---

## 7. Success Criteria

### All Required

- ✅ 30 UAT test cases passed
- ✅ ≤2 non-critical issues
- ✅ Zero critical issues
- ✅ Load test targets met
- ✅ Security validation passed
- ✅ Stakeholder sign-off obtained

### Desirable

- ✅ P95 latency <300ms
- ✅ Error rate <0.1%
- ✅ A/B testing completed
- ✅ Team training completed
- ✅ Runbooks prepared

---

## 8. Deliverables

- [x] Load test script (`scripts/load-test.js`)
- [x] UAT test cases (`docs/UAT_TEST_CASES.md`)
- [ ] Load test results
- [ ] Security validation report
- [ ] UAT sign-off document
- [ ] Issues & resolution log
- [ ] Performance baseline document
- [ ] Go-live readiness checklist (signed)

---

## 9. Team Assignments

| Role | Responsibility | Duration |
|------|-----------------|----------|
| **QA Lead** | Run smoke tests, UAT coordination | 2 weeks |
| **DevOps** | Load testing, monitoring setup | 4-5 days |
| **Security** | Security validation, penetration testing | 2-3 days |
| **Engineering** | Issue resolution, hotfixes | As needed |
| **Product** | UAT facilitation, stakeholder communication | 2-3 days |
| **Business Users** | UAT participation, feedback | 2-3 days |

---

## Next Phase

Upon Phase 3 completion:
1. ✅ All test cases passed
2. ✅ Issues resolved
3. ✅ Performance verified
4. ✅ Security validated
5. ✅ Stakeholder approval
6. → **Proceed to Phase 4: Go-Live**

---

**Phase 3 Status**: 🟡 Ready for Staging Execution
**Estimated Start**: After Phase 2 migration validation
**Estimated Duration**: 1-2 weeks
**Critical Path Item**: Yes (blocks Phase 4)

