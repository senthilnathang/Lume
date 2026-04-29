# Deployment Guide

Comprehensive guide for deploying Lume framework to production with all modules, databases, security, monitoring, and scaling considerations.

## Pre-Deployment Checklist

### System Requirements

**Server**:
- OS: Ubuntu 20.04 LTS or later
- CPU: 4+ cores (production) or 2+ cores (staging)
- RAM: 8GB minimum (production) or 4GB (staging)
- Storage: 50GB+ SSD
- Network: Public IP with fixed DNS

**Database**:
- MySQL 8.0+
- Credentials management via environment variables
- Automated backups enabled
- Replication/HA configured (production)

**Node.js**:
- Node 18.0+ (LTS recommended)
- npm 8.0+ or yarn 1.22+

**Frontend**:
- Node 18+ for build
- nginx 1.20+ for serving (recommended)

### Pre-Deployment Tasks

- [ ] Review and test all code on staging
- [ ] Perform security audit (OWASP checklist)
- [ ] Test database migration rollback
- [ ] Configure monitoring and alerts
- [ ] Set up backup procedures
- [ ] Plan maintenance window
- [ ] Prepare rollback plan
- [ ] Document all custom configurations
- [ ] Test DNS failover (if applicable)
- [ ] Verify SSL certificates valid for 30+ days

## Environment Configuration

### Backend (.env)

```bash
# Core Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com
LOG_LEVEL=info

# Database
DB_HOST=mysql.internal
DB_PORT=3306
DB_NAME=lume
DB_USER=lume_user
DB_PASSWORD=<strong-password>
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20

# JWT/Auth
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d
REFRESH_TOKEN_SECRET=<generate-strong-secret>

# Security
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Admin API
ADMIN_API_KEY=<generate-strong-key>
ADMIN_API_SECRET=<generate-strong-secret>

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
SMTP_FROM=noreply@your-domain.com

# AI/LLM
AI_PROVIDER=anthropic
AI_API_KEY=<anthropic-api-key>
AI_MODEL=claude-haiku-4-5

# File Storage (S3 or local)
STORAGE_TYPE=s3
AWS_S3_BUCKET=lume-uploads
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>

# Module Configuration
LOAD_EXAMPLE_MODULES=false
AUTO_MIGRATE_MODULES=true
VERBOSE_MODULE_LOGGING=false

# Monitoring
SENTRY_DSN=<sentry-dsn-url>
DATADOG_API_KEY=<datadog-api-key>
LOG_SERVICE=datadog

# Redis (optional, for caching/sessions)
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=<redis-password>

# Timezone
TZ=UTC
```

### Frontend (.env.production)

```bash
# API
VITE_API_URL=https://api.your-domain.com
VITE_PUBLIC_URL=https://your-domain.com

# Analytics
VITE_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
VITE_SENTRY_DSN=<sentry-dsn-url>

# Features
VITE_ENABLE_ADMIN_DASHBOARD=true
VITE_ENABLE_PLUGINS=true

# Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Nginx Configuration

```nginx
upstream lume_backend {
  server localhost:3000;
  server localhost:3001;  # optional second instance for HA
  keepalive 32;
}

# SSL redirect
server {
  listen 80;
  server_name your-domain.com www.your-domain.com;
  return 301 https://$server_name$request_uri;
}

# HTTPS
server {
  listen 443 ssl http2;
  server_name your-domain.com www.your-domain.com;

  # SSL certificates (use Let's Encrypt with certbot)
  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

  # SSL hardening
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Static files (frontend)
  location / {
    alias /var/www/lume/frontend/dist/;
    try_files $uri $uri/ /index.html;
    expires 1h;
    add_header Cache-Control "public, max-age=3600";
  }

  # API proxy (backend)
  location /api/ {
    proxy_pass http://lume_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Public API (if different)
  location /public-api/ {
    proxy_pass http://lume_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Health check endpoint
  location /health {
    proxy_pass http://lume_backend;
    access_log off;
  }
}
```

### Systemd Service Files

**Backend** (`/etc/systemd/system/lume-backend.service`):

```ini
[Unit]
Description=Lume Backend Service
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=lume
WorkingDirectory=/opt/lume/backend
EnvironmentFile=/opt/lume/.env
ExecStart=/usr/bin/node src/main.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Frontend** (`/etc/systemd/system/lume-frontend.service`):

```ini
[Unit]
Description=Lume Frontend Service (nginx)
After=network.target
Wants=lume-backend.service

[Service]
Type=notify
ExecStart=/usr/sbin/nginx -g "daemon off;"
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s QUIT $MAINPID
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

## Database Migration Strategy

### Pre-Migration Tasks

1. **Backup Current Database**

```bash
# Full backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > db_backup_$(date +%Y%m%d_%H%M%S).sql

# With compression
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > db_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD < db_backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Create Migration Staging Environment**

```bash
# Clone to staging
CREATE DATABASE lume_staging;
mysql lume_staging < db_backup_latest.sql

# Test migrations on staging
NODE_ENV=staging npm run db:migrate
```

3. **Test Rollback**

```bash
# Practice rollback on staging
npm run db:rollback
npm run db:migrate  # verify re-apply works
```

### Migration Execution

1. **Pre-Migration Window** (30 min before)

```bash
# Set maintenance mode
echo "MAINTENANCE_MODE=true" >> .env
systemctl restart lume-backend

# Notify users
# Email: "Scheduled maintenance 2:00 AM - 2:30 AM UTC"
```

2. **Execute Migrations**

```bash
# Run migrations
cd /opt/lume/backend
NODE_ENV=production npm run db:migrate

# Verify migration status
npm run db:status

# Check migration logs
tail -f /var/log/lume/migration.log
```

3. **Post-Migration Verification**

```bash
# Verify data integrity
npm run db:verify

# Check row counts (before vs after)
# SELECT COUNT(*) FROM entity_records;
# SELECT COUNT(*) FROM workflow_runs;
# SELECT COUNT(*) FROM policies;

# Test critical workflows
npm run test:smoke
```

4. **Resume Service**

```bash
# Disable maintenance mode
sed -i '/MAINTENANCE_MODE=true/d' .env
systemctl restart lume-backend

# Verify service is healthy
curl -f http://localhost:3000/health || systemctl status lume-backend
```

### Rollback Procedure

If migration fails:

```bash
# Stop application
systemctl stop lume-backend

# Restore backup
mysql lume < db_backup_2026-04-29_143000.sql

# Restart
systemctl start lume-backend

# Verify
curl http://localhost:3000/health
```

## Module Installation for Production

### Recommended Module List

**Core Modules** (always installed):
- base — Core functionality, user management, audit logs
- rbac — Role-based access control
- base_security — Security features, 2FA, sessions
- base_customization — Field/view/form customization
- base_features_data — Data import/export

**Optional Modules** (install as needed):
- crm — CRM with leads, contacts, opportunities (example)
- ecommerce — Products, orders, inventory (example)
- project_management — Projects, tasks, time tracking (example)
- website — CMS with page builder
- editor — TipTap visual editor
- activities — Activity logging and calendar
- documents — Document management
- messages — Internal messaging
- media — Media asset management
- donations — Donation tracking (nonprofits)
- team — Team/department management
- audit — Detailed audit logs
- advanced_features — Webhooks, notifications, tags
- base_automation — Workflow automation

### Installation Steps

1. **Pre-Installation**

```bash
cd /opt/lume/backend

# Enable module loading
echo "LOAD_EXAMPLE_MODULES=false" >> .env
echo "AUTO_MIGRATE_MODULES=true" >> .env

# Verify database is accessible
npm run db:check
```

2. **Install Modules via API**

```bash
# Login to admin account
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"admin123"}' > auth.json

TOKEN=$(jq -r '.data.accessToken' auth.json)

# Install module
curl -X POST http://localhost:3000/api/admin/modules/crm/install \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Verify installation
curl -X GET http://localhost:3000/api/admin/modules \
  -H "Authorization: Bearer $TOKEN"
```

3. **Post-Installation**

```bash
# Verify module is loaded
npm run test:module crm

# Check menu items added
# SELECT * FROM menus WHERE module_name = 'crm';

# Verify permissions registered
# SELECT * FROM permissions WHERE module_name = 'crm';
```

## Docker Deployment (Optional)

### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1000 app && adduser -D -u 1000 -G app app
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/package*.json ./
COPY --from=builder --chown=app:app /app/.env.example ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: lume
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_NAME=lume
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_HOST=redis
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  frontend:
    image: nginx:1.24-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

### Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate

# Check logs
docker-compose logs -f backend

# Stop and cleanup
docker-compose down -v
```

## Monitoring & Health Checks

### Health Check Endpoints

```bash
# Backend health
curl http://localhost:3000/health

# Response:
# {
#   "status": "ok",
#   "timestamp": "2026-04-29T10:00:00Z",
#   "database": "connected",
#   "redis": "connected",
#   "uptime": 3600
# }
```

### Prometheus Metrics

```bash
# Metrics endpoint
curl http://localhost:3000/metrics

# Key metrics:
# - http_requests_total{method="GET",path="/api/entities/Lead/records"}
# - http_request_duration_seconds
# - database_query_duration_seconds
# - workflow_execution_duration_seconds
# - cache_hit_rate
```

### Logging Strategy

**Log Levels**:
- **DEBUG** — Detailed application flow (dev only)
- **INFO** — Important events (logins, module loads)
- **WARN** — Recoverable issues (slow queries, retries)
- **ERROR** — Application errors (failed requests, exceptions)
- **FATAL** — System failure (database down, out of memory)

**Log Destinations**:
- **stdout** — All logs for container/docker environments
- **File** — `/var/log/lume/app.log` (rotated daily)
- **Sentry** — Errors and exceptions in production
- **Datadog** — Aggregated logs and metrics

**Monitoring Commands**:

```bash
# Tail application logs
tail -f /var/log/lume/app.log

# Find errors
grep "ERROR" /var/log/lume/app.log | tail -20

# Count requests by endpoint
grep "GET\|POST\|PUT\|DELETE" /var/log/lume/app.log | awk '{print $7}' | sort | uniq -c

# Monitor database queries
grep "duration_ms" /var/log/lume/app.log | sort -t'=' -k2 -rn | head -10
```

### Alert Rules

Configure alerts for:

| Alert | Condition | Action |
|-------|-----------|--------|
| High Error Rate | >5% 4xx/5xx errors | Page on-call engineer |
| Database Down | Health check fails | Immediate escalation |
| High Response Time | P95 > 1000ms | Investigate slow queries |
| Low Disk Space | < 10% available | Archive old logs |
| Memory Leak | Memory growth > 100MB/hour | Restart service |
| Failed Backup | Last backup > 24 hours ago | Alert ops team |

## Scaling Considerations

### Horizontal Scaling (Multiple Instances)

```bash
# Backend server 1
NODE_ENV=production PORT=3000 npm start

# Backend server 2
NODE_ENV=production PORT=3001 npm start

# Load balancer (nginx) distributes traffic
# upstream lume_backend {
#   server localhost:3000;
#   server localhost:3001;
# }
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_entity_record_entity_id ON entity_record(entity_id);
CREATE INDEX idx_entity_record_owner_id ON entity_record(owner_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_policies_entity ON policies(entity);
CREATE INDEX idx_record_versions_record_id ON record_versions(record_id);

-- Enable query cache
SET GLOBAL query_cache_type = ON;
SET GLOBAL query_cache_size = 268435456;  # 256MB

-- Optimize innodb
SET GLOBAL innodb_buffer_pool_size = 8589934592;  # 8GB (for 16GB server)
```

### Cache Strategy

```bash
# Redis cache configuration
# Cache common queries for 1 hour
CACHE_TTL=3600

# Cache module definitions indefinitely (restart on update)
CACHE_MODULES_TTL=0

# Cache user permissions for 30 min
CACHE_PERMISSIONS_TTL=1800

# Disable cache for real-time features
CACHE_WORKFLOWS=false
```

### Content Delivery

```nginx
# Cache static assets for 1 year (with versioning)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
  expires 365d;
  add_header Cache-Control "public, immutable";
}

# Cache HTML for 1 hour (to serve updates)
location ~* \.html?$ {
  expires 1h;
  add_header Cache-Control "public, max-age=3600";
}

# Don't cache API responses
location /api/ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## Backup & Recovery

### Daily Backup Schedule

```bash
#!/bin/bash
# /usr/local/bin/backup-lume.sh

BACKUP_DIR="/backups/lume"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="lume"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/lume/uploads/

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/lume/.env

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Verify backup
gunzip -t $BACKUP_DIR/db_$DATE.sql.gz && echo "Backup OK"
```

**Cron Job** (`/etc/cron.d/lume-backup`):

```
# Run daily at 2 AM
0 2 * * * root /usr/local/bin/backup-lume.sh
```

### Point-in-Time Recovery

```bash
# Restore database from backup
mysql $DB_NAME < backups/db_2026-04-29_020000.sql.gz

# Restore specific table (if partial restore needed)
mysqldump lume_backup table_name | mysql $DB_NAME

# Verify recovery
mysql -e "SELECT COUNT(*) FROM entity_records;" $DB_NAME
```

### Off-site Backup

```bash
#!/bin/bash
# Sync to AWS S3 daily

aws s3 sync /backups/lume s3://lume-backups/lume/ \
  --delete \
  --storage-class GLACIER \
  --sse AES256 \
  --region us-east-1
```

## Security Hardening

### Initial Setup

1. **SSH Hardening**

```bash
# Disable password auth, use keys only
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd
```

2. **Firewall Configuration**

```bash
# UFW rules
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH
ufw allow 80/tcp        # HTTP
ufw allow 443/tcp       # HTTPS
ufw allow 3306/tcp from 192.168.1.0/24  # MySQL (internal only)
ufw enable
```

3. **Fail2Ban**

```bash
# Install and configure
apt-get install fail2ban

# Create /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true
```

4. **Keep-Alive Security**

```bash
# Auto-update security patches
apt-get install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### Application Security

1. **Environment Variables**

```bash
# Never commit .env to git
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# Set proper permissions
chmod 600 /opt/lume/.env
chown lume:lume /opt/lume/.env

# Use AWS Secrets Manager in production
aws secretsmanager create-secret --name lume/database --secret-string file://db-secret.json
```

2. **Database Security**

```sql
-- Create restricted database user
CREATE USER 'lume_user'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON lume.* TO 'lume_user'@'localhost';
REVOKE ALL PRIVILEGES ON *.* FROM 'lume_user'@'localhost';
FLUSH PRIVILEGES;

-- Disable binary logging of sensitive data
SET SESSION binlog_format = 'ROW';
SET SESSION binlog_row_image = 'NOBLOB';
```

3. **API Security Checklist**

- [ ] All endpoints require authentication (except /login, /public-api)
- [ ] CORS configured to whitelist only your domain
- [ ] Rate limiting enabled (100 req/min per IP)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use parameterized queries)
- [ ] CSRF tokens validated
- [ ] XSS prevention headers (Content-Security-Policy)
- [ ] API keys rotated monthly
- [ ] Sensitive logs masked (passwords, tokens, emails)

## Performance Optimization

### Database Query Optimization

```sql
-- Use EXPLAIN to analyze slow queries
EXPLAIN SELECT * FROM entity_records WHERE owner_id = 1;

-- Add missing indexes
CREATE INDEX idx_owner_id ON entity_records(owner_id);

-- Use query cache
SELECT SQL_CACHE * FROM entity_records WHERE owner_id = 1;

-- Archive old records
INSERT INTO entity_records_archive SELECT * FROM entity_records WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
DELETE FROM entity_records WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

### Caching Strategy

```typescript
// Cache entity definitions (static, changes rare)
const entityDef = cache.get(`entity:${name}`) || 
  (await metadataRegistry.getEntity(name), cache.set(`entity:${name}`, def, TTL_INFINITE))

// Cache user permissions (changes occasionally)
const userPerms = cache.get(`perms:${userId}`) || 
  (await permissionService.get(userId), cache.set(`perms:${userId}`, perms, TTL_30_MIN))

// Don't cache real-time data
// workflow runs, user actions, notifications
```

### Frontend Optimization

```javascript
// Code splitting
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.vue'))
const ModulesManagement = lazy(() => import('./admin/ModulesManagement.vue'))

// Lazy load data
const { data, isLoading } = useQuery('modules', 
  () => api.get('/api/admin/modules'), 
  { staleTime: 5 * 60 * 1000 }  // 5 minutes
)

// Virtual scrolling for large lists
<virtual-list :items="workflows" :item-size="50">
  <template #default="{ item }">
    <WorkflowRow :workflow="item" />
  </template>
</virtual-list>
```

## Disaster Recovery Plan

### RTO & RPO Targets

| Component | RTO (Recovery Time) | RPO (Recovery Point) |
|-----------|-------------------|-------------------|
| Application | 30 minutes | None (stateless) |
| Database | 1 hour | 1 hour (daily backups) |
| Files | 4 hours | 1 day (daily backups) |
| Full Site | 4 hours | 1 day |

### Disaster Scenarios & Responses

**Scenario 1: Database Corruption**

1. Detect: Application errors or data inconsistency
2. Alert: Page on-call DBA
3. Assess: Run `CHECK TABLE` and `REPAIR TABLE`
4. Restore: If unfixable, restore from backup
5. Verify: Data integrity checks
6. Recover: Resume service (RTO: 1 hour)

**Scenario 2: Server Failure**

1. Detect: Health check fails
2. Alert: Page infrastructure team
3. Failover: Switch DNS to backup server
4. Restore: Boot new instance, restore from backup
5. Verify: All services operational
6. Recover: RTO 30 minutes (if backup server ready)

**Scenario 3: Data Breach**

1. Detect: Unusual access patterns or security alert
2. Alert: Immediately notify security team
3. Contain: Block suspicious IPs, revoke compromised tokens
4. Assess: Determine what data exposed
5. Notify: Users if personally identifiable data exposed
6. Recover: Patch vulnerability, rotate credentials

### Regular Testing

```bash
# Monthly backup restore test
- Restore database from backup to test environment
- Run smoke tests
- Verify data integrity
- Document results

# Quarterly failover test (if HA configured)
- Simulate primary server failure
- Verify automatic failover works
- Test DNS failover
- Document RTO achieved

# Annual disaster recovery exercise
- Full site restore from backups
- Test all recovery procedures
- Identify bottlenecks
- Update recovery playbook
```

## Rollback Procedures

### Zero-Downtime Rollback

```bash
# For stateless backend (easiest rollback)
# 1. Keep previous version deployed in parallel
# 2. Switch load balancer to previous version
# 3. If rollback needed, switch back immediately

# Load balancer config
upstream lume_current {
  server 10.0.1.10:3000;
}
upstream lume_previous {
  server 10.0.1.11:3000;
}

# Switch if needed
# server { proxy_pass http://lume_previous; }
```

### Database Rollback

```bash
# For major schema changes
# 1. Create migration rollback script
# 2. Test rollback on staging
# 3. Keep backup of pre-migration database
# 4. Prepare rollback command

# If rollback needed:
# mysql lume < backups/db_pre_migration_2026-04-29.sql

# Verify
# npm run db:verify
```

### API Versioning

```typescript
// Support multiple API versions
// /api/v1/entities/Lead/records (old)
// /api/v2/entities/Lead/records (new with breaking changes)

// Gradual migration:
// 1. Deploy v2 API alongside v1
// 2. Migrate frontend to v2
// 3. Keep v1 for 6 months
// 4. Deprecate v1
```

## Go-Live Checklist

**1 Week Before**:
- [ ] Final security audit
- [ ] Capacity testing
- [ ] Backup procedures verified
- [ ] Monitoring configured
- [ ] On-call schedule published
- [ ] User communication sent

**1 Day Before**:
- [ ] Database backup taken
- [ ] Team briefing completed
- [ ] Runbooks reviewed
- [ ] Rollback procedures tested
- [ ] Status page prepared

**Day Of** (early morning, low traffic):
- [ ] Maintenance window announced
- [ ] Database migrated
- [ ] Modules installed
- [ ] All tests passing
- [ ] Monitoring active
- [ ] Services online
- [ ] Smoke tests passed
- [ ] Status page updated

**24 Hours After**:
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Review logs for issues
- [ ] Confirm backups completed
- [ ] Get user feedback
- [ ] Team debrief/notes

**7 Days After**:
- [ ] Performance review
- [ ] Security incident review
- [ ] Update documentation
- [ ] Lessons learned session
- [ ] Next improvement planning

## Support & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 503 Service Unavailable | Backend down | Check systemd status, verify database connection |
| Slow queries | Missing indexes | Run EXPLAIN, add indexes, optimize queries |
| Memory leak | Resource not released | Check logs for warnings, restart service |
| Database connection refused | Network/firewall | Verify DB_HOST, check firewall rules |
| Modules not loading | Migration failed | Check migration logs, restore backup |
| API 403 errors | Missing permissions | Grant required permissions to role |
| SSL certificate error | Cert expired | Renew with certbot: `certbot renew` |

### Useful Commands

```bash
# Check service status
systemctl status lume-backend
systemctl status lume-frontend

# View logs
journalctl -u lume-backend -f
tail -f /var/log/nginx/access.log

# Database health
mysql -e "SELECT COUNT(*) FROM entity_records;" lume
mysql -e "SHOW PROCESSLIST;" lume

# System resources
top -u lume
df -h
free -h

# Network diagnostics
netstat -tlnp | grep 3000
curl -v http://localhost:3000/health
```

### Escalation Contacts

| Issue | Owner | Escalation |
|-------|-------|-----------|
| Application error | Backend team | Engineering manager |
| Database issue | DBA | Database manager |
| Infrastructure | DevOps team | Infrastructure manager |
| Security incident | Security team | CISO |
| High load/performance | DevOps | Capacity planning team |

## Next Steps

1. **Staging Deployment** — Deploy to staging environment first
2. **Production Deployment** — Follow this guide step-by-step
3. **Monitoring** — Set up alerts and dashboards
4. **Optimization** — Monitor performance, optimize slow queries
5. **Documentation** — Update internal runbooks with production details
6. **Training** — Brief support team on deployment and troubleshooting

## Additional Resources

- [Database Migration Guide](./MIGRATION_GUIDE.md)
- [OpenAPI Specification](./openapi/framework.openapi.yaml)
- [Module Integration Guide](./MODULE_INTEGRATION.md)
- [Frontend Integration Guide](./FRONTEND_INTEGRATION.md)
- [Monitoring Setup](./MONITORING.md) (to be created)
- [Performance Tuning](./PERFORMANCE_TUNING.md) (to be created)
