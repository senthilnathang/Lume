# Migration & Production Deployment Roadmap

**Phase:** Post-Development  
**Timeline:** 2-4 weeks  
**Status:** Planning  
**Target:** Production-ready with 99.9% uptime SLA

---

## 📋 Executive Summary

Lume v2.0 is feature-complete with:
- ✅ 23-module architecture
- ✅ Entity Builder with dynamic CRUD
- ✅ BullMQ job queues
- ✅ Vue 3 + Nuxt 3 frontend
- ✅ Express.js backend (optimal architecture)
- ✅ Comprehensive documentation

**Next Phase:** Production migration and deployment

---

## 🎯 Migration Goals

1. **Zero-Downtime Migration** - Move existing data without service interruption
2. **Data Integrity** - Ensure 100% data accuracy during migration
3. **Performance Baseline** - Establish monitoring and metrics
4. **Security Hardening** - Production-grade security configuration
5. **Scalability Ready** - Infrastructure that scales horizontally
6. **Team Readiness** - Documentation and runbooks for operations

---

## 📊 Migration Architecture

```
Current State (Lume v1.x)          Target State (Lume v2.0)
──────────────────────────          ──────────────────────────
Existing App                    ──→  Lume v2.0
├── Old Backend                      ├── Express backend
├── Legacy Frontend                  ├── Vue 3 + Nuxt 3
└── Database (MySQL)                 ├── Entity Builder
                                     ├── BullMQ Jobs
                                     ├── Redis cache
                                     └── MySQL + Drizzle

Migration Strategy:
  Phase 1: Prepare infrastructure
  Phase 2: Database migration
  Phase 3: Parallel running (A/B testing)
  Phase 4: Cutover to v2.0
  Phase 5: Monitor & optimize
```

---

## 🔄 Phase 1: Infrastructure Preparation (Week 1)

### 1.1 Environment Setup

**Development Environment:**
```bash
# Already ready
✅ Node 20.12.0+
✅ MySQL 8.0+
✅ Redis 7.0+
✅ Git + GitHub

# Verify
node --version  # v20.12.0+
mysql --version # 8.0.0+
redis-cli ping  # PONG
```

**Staging Environment:**
- [ ] Provision staging server (Railway/Render/AWS)
- [ ] Configure MySQL replication
- [ ] Set up Redis cluster
- [ ] SSL certificates (Let's Encrypt)
- [ ] Domain/subdomain routing

**Production Environment:**
- [ ] Provision primary database server
- [ ] Provision backup database server
- [ ] Set up Redis cluster (3+ nodes)
- [ ] Load balancer configuration
- [ ] CDN setup (for static assets)
- [ ] S3/blob storage for media files

### 1.2 Docker Containerization

Already in place (from phase-5):
```bash
# Build containers
docker build -t lume:v2.0 backend/
docker build -t lume-web:v2.0 frontend/

# Verify
docker images | grep lume
```

**Checklist:**
- [x] Backend Dockerfile
- [x] Frontend Dockerfile  
- [x] docker-compose.prod.yml
- [x] Health check endpoints
- [x] Logging configuration

### 1.3 CI/CD Pipeline

**GitHub Actions Setup:**
- [ ] Automated testing on push
- [ ] Docker image build & push to registry
- [ ] Staging deployment on PR
- [ ] Production deployment on merge to main
- [ ] Rollback strategy

**Example Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      - run: npm run build
      
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: deploy-to-staging.sh
      
  deploy-production:
    needs: deploy-staging
    if: github.event.pull_request.merged
    runs-on: ubuntu-latest
    steps:
      - run: deploy-to-production.sh
```

---

## 📊 Phase 2: Database Migration (Week 1-2)

### 2.1 Schema Migration

**Step 1: Backup Production Database**
```bash
mysqldump -u root -p lume > lume_backup_$(date +%Y%m%d).sql
```

**Step 2: Run Prisma Migrations**
```bash
cd backend
npx prisma migrate deploy --name "add_entity_builder_tables"
```

**Step 3: Verify New Tables**
```sql
SELECT * FROM entity_relationships;
SELECT * FROM entity_relationship_records;
SELECT * FROM entity_field_permissions;
```

### 2.2 Data Migration (if from Lume v1.x)

**Step 1: Create Migration Script**
```javascript
// backend/scripts/migrate-v1-to-v2.js
import prisma from '../src/core/db/prisma.js';

export async function migrateUsers() {
  const oldUsers = await oldDb.User.findAll();
  for (const user of oldUsers) {
    await prisma.user.create({
      data: {
        // Map old fields to new schema
      }
    });
  }
}

// Similar functions for each model
```

**Step 2: Run Migration in Staging**
```bash
npm run migrate:staging -- --dry-run  # Preview changes
npm run migrate:staging                 # Execute
```

**Step 3: Validate Data Integrity**
```bash
npm run validate:migration  # Custom script to verify
```

### 2.3 Database Backup Strategy

**Automated Backups:**
- [ ] Daily automated backups (3 retained)
- [ ] Weekly archival to S3
- [ ] Test restores monthly
- [ ] Point-in-time recovery capability

**Backup Command:**
```bash
# Production backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | \
  gzip > /backups/lume_$TIMESTAMP.sql.gz
aws s3 cp /backups/lume_$TIMESTAMP.sql.gz s3://lume-backups/
```

---

## 🔀 Phase 3: Parallel Running (Week 2-3)

### 3.1 A/B Testing Setup

Run both v1.x and v2.0 simultaneously:

```
Traffic Split:
├── 10% → Lume v2.0 (Early adopters)
├── 90% → Lume v1.x (Stable)
│
│ Monitor for 1 week...
│
├── 25% → Lume v2.0
├── 75% → Lume v1.x
│
│ Monitor for 1 week...
│
└── 100% → Lume v2.0 (Full cutover)
```

**Implementation with Load Balancer:**
```nginx
upstream lume_v1 {
    server v1.app:3000;
}

upstream lume_v2 {
    server v2.app:3000;
}

server {
    listen 80;
    server_name api.lume.app;
    
    location / {
        # 10% to v2.0, 90% to v1.x
        if ($random < 0.1) {
            proxy_pass http://lume_v2;
        } else {
            proxy_pass http://lume_v1;
        }
    }
}
```

### 3.2 Monitoring & Metrics

**Key Metrics to Track:**

```
Performance:
├── API response time (target: <200ms p95)
├── Database query time (target: <50ms p95)
├── Job processing time (target: <1s avg)
├── Error rate (target: <0.1%)
└── Uptime (target: 99.9%)

Business:
├── User logins per minute
├── Entity records created
├── Workflow executions
├── API requests per second
└── Queue job throughput
```

**Monitoring Stack:**
- [x] Prometheus (metrics collection)
- [x] Grafana (dashboards)
- [x] ELK Stack (logging)
- [x] DataDog/NewRelic (optional, for APM)

**Grafana Dashboard:**
- Request rate (API calls/sec)
- Response time (p50, p95, p99)
- Error rate percentage
- Database connections
- Redis memory usage
- Queue job status

### 3.3 Testing During Parallel Run

**User Acceptance Testing (UAT):**
- [ ] Run through core workflows on v2.0
- [ ] Verify all entity builder features
- [ ] Test bulk import/export
- [ ] Verify automation workflows
- [ ] Check report generation

**Performance Testing:**
- [ ] Load test with 1000 concurrent users
- [ ] Stress test with 10,000+ jobs in queue
- [ ] Database query performance analysis
- [ ] Memory usage under load

**Security Testing:**
- [ ] OWASP top 10 vulnerability scan
- [ ] SQL injection testing
- [ ] Cross-site scripting (XSS) testing
- [ ] CSRF token validation
- [ ] API rate limiting

---

## ✂️ Phase 4: Cutover & Go-Live (Week 3-4)

### 4.1 Pre-Cutover Checklist

**24 Hours Before:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Final staging deployment successful
- [ ] Backups verified
- [ ] Team trained on runbooks
- [ ] Incident response plan reviewed
- [ ] Rollback plan documented
- [ ] Status page updated

**Communications:**
- [ ] Notify stakeholders of maintenance window
- [ ] Scheduled downtime (30-60 minutes)
- [ ] Prepare status page messages
- [ ] Have on-call team ready

### 4.2 Cutover Procedure

**T-0: Start of maintenance window**

```bash
# 1. Stop all job processors
docker stop lume-workers-1 lume-workers-2 lume-workers-3

# 2. Close new connections
# Update load balancer to reject new connections

# 3. Wait for in-flight requests
# Monitor and wait for all requests to complete (~30s)

# 4. Database migration (if needed)
cd backend
npx prisma migrate deploy

# 5. Start v2.0
docker up -d lume-v2:latest
docker up -d lume-workers-v2:latest

# 6. Verify health
curl http://localhost:3000/api/base/health

# 7. Update routing
# Load balancer: 100% traffic to v2.0

# 8. Announce completion
# Update status page
```

### 4.3 Rollback Plan

If something goes wrong:

```bash
# 1. Revert routing to v1.x
# Load balancer: 100% traffic back to v1.x

# 2. Investigate issue
# Check logs, metrics, database state

# 3. Option A: Fix and retry cutover
# Fix issue in v2.0
# Schedule new cutover

# 4. Option B: Restore from backup
# If data corruption:
mysql -u root -p lume < lume_backup_YYYYMMDD.sql

# 5. Restart services
docker restart lume-v1
```

**Success Criteria:**
- ✅ Zero data loss
- ✅ No user requests failed
- ✅ All metrics normal
- ✅ Queue processing resumed
- ✅ Workflows executing

---

## 📈 Phase 5: Post-Deployment (Ongoing)

### 5.1 Monitoring (Week 1 Post-Launch)

**Critical Metrics:**
```
Hour 1:  Check every 5 minutes
Hour 2-4: Check every 15 minutes
Day 1:   Check every hour
Week 1:  Check 3x daily
Week 2+: Daily checks
```

**Automated Alerts:**
```
CRITICAL:
├── API error rate > 1%
├── Response time p95 > 1s
├── Database replication lag > 5s
├── Queue backlog > 10,000 jobs
└── Disk usage > 90%

WARNING:
├── API error rate > 0.5%
├── Response time p95 > 500ms
├── Memory usage > 80%
└── 5xx errors spike
```

### 5.2 Optimization Week 1

**Database:**
- [ ] Analyze slow queries
- [ ] Add indexes if needed
- [ ] Optimize query patterns
- [ ] Monitor connection pool

**Application:**
- [ ] Profile hot code paths
- [ ] Optimize N+1 query problems
- [ ] Improve cache hit rate
- [ ] Reduce bundle size

**Infrastructure:**
- [ ] Tune server parameters
- [ ] Optimize network config
- [ ] Review resource allocation
- [ ] Test auto-scaling

### 5.3 Bug Fix & Patch Process

**If critical bug found:**

```
1. Reproduction in staging
   └─ Deploy buggy code to staging
   
2. Fix implementation
   └─ Create PR with fix
   
3. Verify in staging
   └─ All tests pass
   
4. Deploy to production
   └─ Use standard CI/CD
   
5. Verify in production
   └─ Monitor metrics
   
6. Notify stakeholders
   └─ Issue postmortem
```

---

## 🔐 Security Configuration

### 5.1 Environment Variables (Production)

```env
# .env.production
NODE_ENV=production
PORT=3000
REDIS_HOST=redis-cluster.prod.internal
REDIS_PORT=6379
DATABASE_URL=mysql://user:pass@db-prod:3306/lume
JWT_SECRET=<generate-new-secure-key>
API_KEY_SECRET=<generate-new-secure-key>

# Bull Board (restrict access)
BULLBOARD_USERNAME=admin
BULLBOARD_PASSWORD=<secure-password>

# Webhooks
WEBHOOK_SECRET=<generate-secure-secret>

# CORS (restrict to your domain)
CORS_ORIGIN=https://app.lume.app
```

### 5.2 Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.lume.app;
    
    ssl_certificate /etc/letsencrypt/live/api.lume.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lume.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://lume_backend;
    }
}
```

### 5.3 Database Security

```sql
-- Create application user (not root)
CREATE USER 'lume_app'@'localhost' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON lume.* TO 'lume_app'@'localhost';
FLUSH PRIVILEGES;

-- Enable audit logging
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'FILE';
```

---

## 📚 Documentation & Training

### 6.1 Team Documentation

**Required Documentation:**
- [ ] Architecture diagram (keep current)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Deployment runbook
- [ ] Incident response guide
- [ ] Troubleshooting guide

**Generate API Docs:**
```bash
# Using Swagger/OpenAPI
npm install -g swagger-jsdoc

# Document endpoints with JSDoc
/**
 * @swagger
 * /api/entities/{id}/records:
 *   get:
 *     summary: List entity records
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 */
```

### 6.2 Operations Team Training

**Checklist:**
- [ ] How to monitor system health
- [ ] How to scale servers
- [ ] How to handle alerts
- [ ] How to debug issues
- [ ] How to perform backups/restores
- [ ] How to deploy patches
- [ ] How to communicate incidents

---

## ✅ Go-Live Checklist

### Final Verification (Day Of)

**Pre-Launch (T-2 hours):**
- [ ] Backups current and tested
- [ ] All servers in green status
- [ ] Load balancers configured
- [ ] SSL certificates valid
- [ ] Monitoring active
- [ ] Team assembled
- [ ] Status page updated
- [ ] Communication channels open

**Launch (T-0):**
- [ ] Database migrated
- [ ] v2.0 deployed
- [ ] Health checks passing
- [ ] Traffic routed to v2.0
- [ ] Metrics normal
- [ ] Errors < 0.1%

**Post-Launch (T+1 hour):**
- [ ] No critical errors
- [ ] User logins successful
- [ ] Workflows executing
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] Announce success

---

## 📊 Success Metrics

**Technical:**
- 99.9% uptime SLA
- < 200ms API p95 latency
- < 0.1% error rate
- < 5s database replication lag
- > 95% cache hit rate

**Business:**
- Zero data loss
- No user disruption
- Feature parity with v1.x
- New features enabled (entity builder, automation)
- Cost optimization achieved

---

## 🚀 Beyond Production

**Post-Launch Roadmap (Next 3 months):**

**Month 1:**
- [ ] Performance optimization
- [ ] User feedback incorporation
- [ ] Analytics refinement

**Month 2:**
- [ ] Feature enhancements
- [ ] Third-party integrations
- [ ] Advanced automation

**Month 3:**
- [ ] Scaling to 1M+ records
- [ ] Multi-region deployment
- [ ] Advanced security features

---

## 📞 Support & Escalation

**During Migration:**
- **Lead:** DevOps Engineer
- **Backup:** Platform Engineer
- **Communication:** Slack + Status Page
- **Escalation:** CTO on standby

**24/7 Monitoring:**
- Error rate spikes
- Database connection failures
- Redis cluster issues
- Job queue stalls

---

## 🎓 Next Steps

1. **Infrastructure Setup** (Week 1)
   - [ ] Provision servers
   - [ ] Configure databases
   - [ ] Set up monitoring

2. **Database Migration** (Week 2)
   - [ ] Test migration scripts
   - [ ] Perform backup
   - [ ] Execute migration

3. **Parallel Testing** (Week 2-3)
   - [ ] A/B test with traffic split
   - [ ] Monitor metrics
   - [ ] User testing

4. **Go-Live** (Week 4)
   - [ ] Final cutover
   - [ ] Monitor closely
   - [ ] Optimize performance

**Timeline: 2-4 weeks to production**

You now have Lume v2.0 with:
- ✅ Complete entity builder
- ✅ Full-featured admin UI
- ✅ Production-ready architecture
- ✅ Comprehensive documentation
- ✅ Migration & deployment roadmap

Ready to transform your application platform! 🚀

