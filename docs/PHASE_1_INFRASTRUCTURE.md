# Phase 1: Infrastructure Preparation — Complete ✅

**Status:** Complete  
**Date:** 2026-04-22  
**Duration:** Part of 4-week migration roadmap

## Overview

Phase 1 establishes all infrastructure required for production deployment of the Lume Framework entity builder. The infrastructure supports **high availability, automated backups, monitoring, and zero-downtime deployments**.

---

## Deliverables

### 1. GitHub Actions CI/CD Workflow

**File:** `.github/workflows/deploy.yml`

**Features:**
- **Test Backend**: Node.js 20.12.0 + MySQL 8.0 service
  - Dependency caching for faster builds
  - Codecov integration
  - Lint checks

- **Test Frontend**: Vue 3 + TypeScript builds
  - Dependency caching
  - Build verification
  - Coverage reporting

- **Build & Push**: Docker image creation
  - Backend image to container registry
  - Frontend image to container registry
  - Metadata tags (git branch, commit SHA, semantic version)
  - GitHub Container Registry (GHCR) integration

- **Staging Deployment** (on `framework` branch):
  - SSH key-based deployment
  - Automated pull of latest Docker images
  - Database-agnostic (docker-compose up)
  - Health check validation (30 attempts × 10s)
  - Slack notifications on failure

- **Production Deployment** (on `main` branch):
  - Automated database backup before deployment
  - Prisma migrations (npx prisma migrate deploy)
  - Multi-replica backend update
  - Health checks (60 attempts × 10s for production)
  - Smoke tests (API endpoint verification)
  - Slack notifications (success & failure)
  - **Security**: All secrets via GitHub Secrets, environment variables in shell scripts

### 2. Docker Compose Configurations

#### Production (`docker-compose.prod.yml`)

**Services:**
- **MySQL 8.0**: Primary database
  - 2GB volume for persistence
  - Health checks every 30s
  - Max connections: configurable
  - Logging: JSON format, 10MB files, 3 rotations

- **Redis 7**: Cache & BullMQ queue
  - Persistence (RDB + AOF)
  - 2GB max memory with LRU eviction
  - Password authentication
  - Health checks every 30s

- **Backend (Node.js)**:
  - 3 replicas for high availability
  - Database pool: 10-30 connections
  - Rolling update strategy (1 at a time, 30s delay)
  - Health checks with 40s startup period
  - JSON logging

- **Frontend (Vue 3)**:
  - SPA service
  - Depends on backend
  - Health checks every 30s

- **Nginx Alpine**:
  - Reverse proxy + load balancer
  - SSL/TLS termination
  - Cache management
  - Rate limiting

- **Prometheus**: Metrics collection
  - 90-day retention
  - Real-time scraping (15s interval)

- **Grafana**: Dashboard visualization
  - Admin user configurable
  - Sign-up disabled
  - Auto-provisioned datasources

- **Bull Board**: Job queue monitoring
  - Password-protected
  - Redis integration

#### Staging (`docker-compose.staging.yml`)

**Simplified Setup:**
- Single instances of all services
- Development-friendly settings
- 30s metrics collection interval
- Local volume storage

### 3. Monitoring & Alerting

**Prometheus Configuration** (`monitoring/prometheus.prod.yml`):
- **Backend Metrics**: Request rate, latency, error rates
- **MySQL**: Connection pools, slow queries, replication lag
- **Redis**: Connected clients, memory usage, evictions
- **Node**: CPU, memory, disk, network
- **Docker**: Container CPU/memory via cAdvisor

**Alert Rules** (`monitoring/prometheus_alert_rules.yml`):
- **Backend**: Service down, high latency (>1s P95), high error rate (>5%)
- **Database**: Connection pool exhaustion, slow queries, replication lag
- **Redis**: High connections, high memory (>90%), evictions
- **System**: High CPU (>85%), high memory (>85%), low disk (<15%)
- **Network**: High traffic (>1GB/s in/out)

**Grafana Dashboards**: Pre-configured with:
- Service health overview
- Performance metrics
- Error tracking
- Resource utilization

### 4. Nginx Reverse Proxy

#### Production (`nginx.prod.conf`)

**Features:**
- HTTPS/SSL with TLSv1.2 + TLSv1.3
- HTTP/2 support
- Security headers (HSTS, CSP, X-Frame-Options)
- gzip compression (level 6)
- Request caching (100MB zone, 10GB max)
- Rate limiting (100r/s API, 30r/s general)
- Least-conn load balancing

**Virtual Hosts:**
- `lume.dev` → Frontend + Backend
- `grafana.lume.dev` → Monitoring dashboard
- `queue.lume.dev` → Bull Board monitoring

**Caching Strategy:**
- GET `/api/*` cached for 10 minutes
- Static assets (JS/CSS/images) cached for 30 days
- HTTP 404 cached for 1 minute

#### Staging (`nginx.staging.conf`)

Simplified configuration for testing with HTTP/2 + gzip.

### 5. Database Backup Automation

**Script:** `scripts/backup.sh`

**Capabilities:**
- **Backup Format**: Full database dump
  - `--single-transaction` for consistency
  - Routines and triggers included
  - Single-threaded for safety

- **Compression**: gzip (level 9) compression
  - 50-70% size reduction typical

- **Encryption** (Optional): AES-256-CBC
  - Command: `openssl enc -aes-256-cbc`
  - Only if `BACKUP_ENCRYPTION_KEY` provided

- **Retention**: Configurable retention (default 30 days)
  - Auto-cleanup of old backups
  - Manifest file generation with checksums

- **Notifications**: Slack webhook integration
  - Backup completion status
  - File size and checksum

**Integration:**
- Run via Docker volume mount
- Cron scheduling: `0 2 * * *` (daily at 2 AM)
- Can be called from GitHub Actions pre-deployment

---

## Environment Variables

### Production (`.env.production`)

```bash
# Database
DATABASE_URL=mysql://lume_prod:PASSWORD@prod-db:3306/lume
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=30

# Redis (Cluster)
REDIS_URL=redis://:PASSWORD@prod-redis-cluster:6379/0
REDIS_SENTINEL_ENABLED=true

# JWT & Sessions
JWT_SECRET=<64-char random key>
SESSION_SECRET=<64-char random key>

# Backups
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=<encryption key>

# Monitoring
SENTRY_DSN=https://key@sentry.io/PROJECT_ID
DATADOG_ENABLED=true

# Storage
STORAGE_DRIVER=s3
AWS_ACCESS_KEY_ID=prod_key
AWS_SECRET_ACCESS_KEY=prod_secret
CLOUDFRONT_DOMAIN=https://cdn.lume.dev
```

### Staging (`.env.staging`)

Identical structure to production but with staging credentials and debug mode enabled.

---

## Deployment Flow

### 1. Local Development
```
✓ Code changes on `framework` branch
✓ Git push to remote
```

### 2. Staging Pipeline
```
↓ GitHub Actions triggered (framework branch)
✓ Run backend + frontend tests
✓ Build Docker images
✓ Push to container registry
✓ SSH into staging server
✓ docker-compose pull & up
✓ Health check validation
✓ Slack notification
```

### 3. Production Pipeline
```
↓ Code reviewed and merged to `main`
↓ GitHub Actions triggered (main branch)
✓ All tests pass
✓ Docker images built
✓ **Create database backup** (before deployment!)
✓ SSH into production server
✓ Prisma migrations run
✓ docker-compose pull & up (rolling update)
✓ Health check validation (60 attempts)
✓ Smoke tests verify endpoints
✓ Slack notification with backup file info
```

---

## Security Considerations

### GitHub Actions

- ✅ All secrets stored in GitHub Secrets
- ✅ Environment variables passed via CI context (not hardcoded)
- ✅ SSH keys managed securely
- ✅ Database passwords never logged
- ✅ Deployment limited to `main` and `framework` branches

### Nginx

- ✅ SSL/TLS only (HTTP redirects to HTTPS)
- ✅ Strong cipher suites (TLSv1.2+)
- ✅ Security headers (HSTS, X-Frame-Options, CSP)
- ✅ Rate limiting enabled
- ✅ DDoS protection via rate zones

### Docker

- ✅ Image signing (with GitHub Container Registry)
- ✅ No root user in containers
- ✅ Read-only filesystems (where possible)
- ✅ Secrets via environment variables, not files
- ✅ Health checks with automatic restarts

### Database

- ✅ Encrypted backups (AES-256)
- ✅ Connection pooling (prevents exhaustion)
- ✅ Regular retention (30-day backups)
- ✅ Checksums for integrity verification

---

## Monitoring & Observability

### Metrics Collected

| Service | Metrics | Interval |
|---------|---------|----------|
| **Backend** | Requests, latency, errors, memory, CPU | 10s |
| **MySQL** | Connections, slow queries, replication | 30s |
| **Redis** | Clients, memory, evictions, commands | 30s |
| **Node** | CPU, memory, disk, network, load | 30s |
| **Nginx** | Requests, cache hit rate, upstream latency | 30s |

### Dashboards

**Grafana** provides:
- Real-time service health
- Request/error rate trends
- Resource utilization
- Cache performance
- Database query analysis

**Bull Board** provides:
- Job queue status
- Failed job inspection
- Manual job retry
- Scheduled job management

---

## Testing & Validation

### Pre-Deployment Checklist

```bash
# 1. Lint & test all code
npm run lint && npm test

# 2. Build Docker images locally
docker-compose -f docker-compose.staging.yml build

# 3. Verify environment configuration
source .env.staging
docker-compose -f docker-compose.staging.yml config

# 4. Check database migrations
npm run db:migrate:status

# 5. Verify backup script
./scripts/backup.sh --dry-run

# 6. Test health endpoints
curl http://localhost:3000/api/base/health
```

### Post-Deployment Validation

```bash
# 1. Health check
curl https://lume.dev/health

# 2. API test
curl https://lume.dev/api/entities

# 3. Admin panel load
curl https://lume.dev/admin

# 4. Verify monitoring
curl https://lume.dev/metrics

# 5. Queue status
curl https://queue.lume.dev

# 6. Database backup completion
ls -la /mnt/backups/lume_backup_*.sql.gz.enc
```

---

## Troubleshooting

### Deployment Failure

1. **Check GitHub Actions logs**: GitHub UI → Actions tab
2. **Verify secrets**: GitHub → Settings → Secrets
3. **Test SSH connection**: `ssh -i key user@host`
4. **Verify Docker registry access**: `docker login ghcr.io`
5. **Check disk space**: `df -h` on deployment server

### Health Check Failures

1. **Backend not starting**: Check logs: `docker logs lume-prod-backend`
2. **Port already in use**: `lsof -i :3000`
3. **DNS resolution**: `ping backend` from nginx container
4. **Database connection**: Verify DATABASE_URL environment variable

### Backup Issues

1. **Permission denied**: Verify `/mnt/backups` ownership
2. **Disk full**: Check disk space: `df -h`
3. **Encryption failure**: Verify BACKUP_ENCRYPTION_KEY is set
4. **Compression slow**: Check available CPU and disk I/O

---

## Next Steps

**Phase 2: Database Migration** (following)
- Create migration scripts
- Test in staging environment
- Validate data integrity
- Prepare rollback procedures

**Phase 3: Testing & Validation**
- A/B testing with traffic split
- User acceptance testing (UAT)
- Performance testing
- Load testing

**Phase 4: Go-Live**
- Pre-cutover checklist
- Execute migration procedure
- Monitor closely
- Performance optimization
- Decommission old system

---

## References

- Infrastructure as Code: `docker-compose.*.yml`
- CI/CD Pipeline: `.github/workflows/deploy.yml`
- Monitoring Config: `monitoring/prometheus.*.yml`
- Backup Strategy: `scripts/backup.sh`
- Deployment Roadmap: `docs/MIGRATION_PRODUCTION_ROADMAP.md`

---

**Phase 1 Status: ✅ COMPLETE**

All infrastructure files created, tested, and committed. Ready to proceed with Phase 2: Database Migration.
