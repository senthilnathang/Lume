# Lume v2.0 Deployment Guide

**Last Updated:** April 28, 2026  
**Version:** 2.0.0

Production deployment guide for Lume covering Docker, cloud platforms, Kubernetes, SSL/TLS, monitoring, and backups.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Platforms](#cloud-platforms)
4. [Kubernetes](#kubernetes)
5. [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
6. [SSL/TLS Certificates](#ssltls-certificates)
7. [Database Setup](#database-setup)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Backups & Recovery](#backups--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Infrastructure

- [ ] Server provisioned (2+ CPU cores, 4+ GB RAM, 50+ GB storage)
- [ ] Database server ready (MySQL 8.0+ or PostgreSQL 13+)
- [ ] Redis server ready or included in deployment
- [ ] Domain registered and DNS configured
- [ ] SSL/TLS certificate obtained
- [ ] Backup storage configured (S3 or other)
- [ ] Monitoring service selected (Sentry, DataDog, etc.)

### Configuration

- [ ] Environment variables reviewed (database, JWT secrets, etc.)
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] CORS origins whitelisted
- [ ] Email SMTP configured
- [ ] Firewall rules configured

### Testing

- [ ] Installation tested on staging environment
- [ ] Database migrations tested
- [ ] Backups tested and verified
- [ ] Load testing completed (target: 1000 concurrent users)
- [ ] Security audit completed
- [ ] Performance benchmarking completed

---

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: lume-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backups:/backups
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: lume-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  lume:
    image: lumedev/lume:v2.0.0
    container_name: lume-app
    restart: always
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: mysql
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
      API_BASE_URL: ${API_BASE_URL}
      FRONTEND_URL: ${FRONTEND_URL}
      MAIL_HOST: ${MAIL_HOST}
      MAIL_USER: ${MAIL_USER}
      MAIL_PASSWORD: ${MAIL_PASSWORD}
      MAIL_FROM: ${MAIL_FROM}
      SENTRY_DSN: ${SENTRY_DSN}
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local
```

### Production Deployment Commands

```bash
# Create environment file
cp .env.example .env.production
# Edit with production values
nano .env.production

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f lume

# Perform database initialization
docker-compose -f docker-compose.prod.yml exec lume npm run db:init

# Create backup
docker-compose -f docker-compose.prod.yml exec mysql mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_NAME} > backup-$(date +%Y%m%d).sql

# Stop services gracefully
docker-compose -f docker-compose.prod.yml down

# Update to new version
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Cloud Platforms

### AWS Deployment

**RDS for Database:**
```bash
# Create RDS MySQL instance
aws rds create-db-instance \
  --db-instance-identifier lume-db \
  --db-instance-class db.t3.small \
  --engine mysql \
  --master-username admin \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 100 \
  --backup-retention-period 30
```

**EC2 for Application:**
```bash
# Launch EC2 instance (Ubuntu 22.04)
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Deploy using Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

**S3 for Backups:**
```bash
# Create S3 bucket
aws s3 mb s3://lume-backups

# Upload backup
aws s3 cp backup.sql s3://lume-backups/
```

**CloudFront for CDN:**
```bash
# Configure CloudFront distribution
# Point to S3 bucket or EC2 instance
# Enable caching for static assets
```

### DigitalOcean Deployment

```bash
# Create droplet
doctl compute droplet create lume-app \
  --region nyc3 \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb

# SSH into droplet
ssh root@<droplet-ip>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Configure DNS
doctl compute domain records create yourdomain.com \
  --record-type A \
  --record-name @ \
  --record-data <droplet-ip>
```

### Heroku Deployment

Heroku automatically manages deployment, databases, and scaling:

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create lume-app

# Add MySQL add-on
heroku addons:create cleardb:ignite -a lume-app

# Set environment variables
heroku config:set JWT_SECRET=$(openssl rand -base64 32) -a lume-app

# Deploy
git push heroku main

# View logs
heroku logs -a lume-app --tail
```

---

## Kubernetes

Use official Helm chart for production Kubernetes deployment:

```bash
# Add chart repository
helm repo add lume https://charts.lume.dev
helm repo update

# Install with custom values
helm install lume lume/lume \
  --namespace lume \
  --create-namespace \
  --values values.yaml

# values.yaml configuration
replicaCount: 3

image:
  repository: lumedev/lume
  tag: v2.0.0
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

database:
  type: mysql
  host: mysql.default.svc.cluster.local
  port: 3306
  user: lume
  password: ${DB_PASSWORD}
  database: lume

redis:
  enabled: true
  master:
    persistence:
      enabled: true
      size: 10Gi

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.yourdomain.com
      paths:
        - path: /
          pathType: Prefix

monitoring:
  enabled: true
  prometheusOperator: true
```

**Monitor Kubernetes deployment:**
```bash
# Check deployment status
kubectl get deployment -n lume

# Scale replicas
kubectl scale deployment lume -n lume --replicas=5

# View logs
kubectl logs -n lume -l app=lume -f

# Access pod shell
kubectl exec -it -n lume lume-xxxx -- /bin/sh
```

---

## Reverse Proxy (Nginx)

### Nginx Configuration

Create `/etc/nginx/sites-available/lume`:

```nginx
upstream lume_app {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL/TLS
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/lume-access.log;
    error_log /var/log/nginx/lume-error.log;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_vary on;
    gzip_disable "msie6";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=200 nodelay;

    location / {
        proxy_pass http://lume_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /static/ {
        alias /var/www/lume/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /health {
        access_log off;
        proxy_pass http://lume_app;
    }
}
```

**Enable and test:**
```bash
ln -s /etc/nginx/sites-available/lume /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## SSL/TLS Certificates

### Let's Encrypt (Automatic)

```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal (systemd timer)
systemctl enable certbot.timer
systemctl start certbot.timer

# Check renewal status
certbot renew --dry-run
```

### Manual Certificate Management

```bash
# Copy certificate to server
scp certificate.pem server:/etc/lume/ssl/
scp private.key server:/etc/lume/ssl/

# Update Nginx configuration
ssl_certificate /etc/lume/ssl/certificate.pem;
ssl_certificate_key /etc/lume/ssl/private.key;

# Test SSL/TLS
openssl s_client -connect yourdomain.com:443
```

---

## Database Setup

### MySQL Initial Setup

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE lume CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'lume'@'%' IDENTIFIED BY 'strong_password_here';

# Grant permissions
GRANT ALL PRIVILEGES ON lume.* TO 'lume'@'%';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### Automated Backups

Create `/usr/local/bin/backup-lume.sh`:

```bash
#!/bin/bash

DB_HOST=${DB_HOST:-localhost}
DB_USER=${DB_USER:-lume}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-lume}
BACKUP_DIR=${BACKUP_DIR:-/backups}
S3_BUCKET=${S3_BUCKET:-lume-backups}

# Create backup
BACKUP_FILE="${BACKUP_DIR}/lume-backup-$(date +%Y%m%d-%H%M%S).sql"
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_FILE s3://${S3_BUCKET}/

# Keep only last 30 days locally
find $BACKUP_DIR -name "lume-backup-*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

Add to crontab for daily execution:

```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/backup-lume.sh >> /var/log/lume-backup.log 2>&1
```

---

## Monitoring & Alerts

### Sentry (Error Tracking)

```bash
# Set Sentry DSN in environment
export SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Configure in Lume
# Errors automatically reported to Sentry
```

### Uptime Monitoring

Use Uptime Robot or similar:
```bash
# Health check endpoint
GET https://api.yourdomain.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2026-04-28T10:30:00Z"
}
```

### Log Aggregation

Configure ELK stack or similar:
```bash
# View logs
docker-compose logs -f lume

# Log to file
docker-compose logs lume > lume.log
```

---

## Troubleshooting

**Port Already in Use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database Connection Issues:**
```bash
# Test connection
mysql -h localhost -u lume -p
```

**SSL/TLS Errors:**
```bash
# Test certificate
openssl x509 -in certificate.pem -text -noout

# Renew if expired
certbot renew --force-renewal
```

**Performance Issues:**
```bash
# Check system resources
top
free -h
df -h

# Monitor MySQL
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads%';
```

---

**See [PUBLIC_ARCHITECTURE.md](PUBLIC_ARCHITECTURE.md) for system design details.**

