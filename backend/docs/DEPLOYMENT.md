# Lume Framework -- Deployment Documentation

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Production Environment Variables](#production-environment-variables)
- [Database Setup](#database-setup)
- [Running in Production](#running-in-production)
- [Docker Deployment](#docker-deployment)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [Health Checks](#health-checks)
- [Logging](#logging)
- [SSL/TLS Setup](#ssltls-setup)
- [Backup Strategy](#backup-strategy)

---

## Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] `NODE_ENV=production` is set.
- [ ] `JWT_SECRET` is set to a strong, unique value (at least 32 characters, random).
- [ ] `JWT_REFRESH_SECRET` is set to a different strong value.
- [ ] `SESSION_SECRET` is set to a strong value.
- [ ] `DATABASE_URL` points to the production MySQL instance.
- [ ] Database has been initialized: `npm run db:init`.
- [ ] Admin user has been created: `npm run db:admin`.
- [ ] `CORS_ORIGIN` is set to the frontend domain (e.g., `https://app.example.com`).
- [ ] `UPLOAD_DIR` directory exists and has write permissions.
- [ ] SMTP credentials are configured for email delivery.
- [ ] `ENABLE_RATE_LIMIT` is `true` (automatic in production).
- [ ] No default/development secrets remain in the `.env` file.
- [ ] File upload directory is not world-readable.
- [ ] Prisma client is generated: `npx prisma generate`.

---

## Production Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_TYPE=mysql
DB_HOST=db.internal.example.com
DB_PORT=3306
DB_NAME=lume_production
DB_USER=lume_app
DB_PASSWORD=<strong-random-password>
DB_POOL_SIZE=20
DB_LOGGING=false
DATABASE_URL="mysql://lume_app:<password>@db.internal.example.com:3306/lume_production"

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=<64-character-hex-string>
JWT_REFRESH_SECRET=<different-64-character-hex-string>
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://app.example.com

# Session
SESSION_SECRET=<strong-random-string>

# File uploads
UPLOAD_DIR=/var/lib/lume/uploads
MAX_FILE_SIZE=10485760

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=<smtp-password>
EMAIL_FROM=noreply@example.com

# Rate limiting (auto-enabled in production)
ENABLE_RATE_LIMIT=true

# Application
BACKEND_URL=https://api.example.com
FRONTEND_URL=https://app.example.com
APP_NAME=Lume
```

### Generating Secrets

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32
```

---

## Database Setup

### MySQL Production Configuration

1. Create the database and user:

```sql
CREATE DATABASE lume_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lume_app'@'%' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON lume_production.* TO 'lume_app'@'%';
FLUSH PRIVILEGES;
```

2. Run Prisma migrations:

```bash
npx prisma db push
```

3. Initialize seed data (roles, permissions, admin user):

```bash
npm run db:init
```

### Connection Pooling

Set `DB_POOL_SIZE` based on your expected concurrency. The default is 10. For high-traffic deployments, increase to 20-50 and ensure your MySQL server's `max_connections` can accommodate the pool.

Prisma uses its own connection pool. Configure it via the `DATABASE_URL` query parameter:

```
DATABASE_URL="mysql://user:pass@host:3306/db?connection_limit=20"
```

### MySQL Tuning Recommendations

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

---

## Running in Production

### Direct Node.js

```bash
NODE_ENV=production node src/index.js
```

### PM2 Process Manager (Recommended)

PM2 provides process management, auto-restart, clustering, and log management.

1. Install PM2 globally:

```bash
npm install -g pm2
```

2. Create an ecosystem file `ecosystem.config.cjs`:

```js
module.exports = {
  apps: [{
    name: 'lume-api',
    script: 'src/index.js',
    instances: 'max',          // Use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '500M',
    error_file: '/var/log/lume/pm2-error.log',
    out_file: '/var/log/lume/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
  }],
};
```

3. Start the application:

```bash
pm2 start ecosystem.config.cjs --env production
```

4. Enable startup on boot:

```bash
pm2 startup
pm2 save
```

5. Common PM2 commands:

```bash
pm2 status              # View running processes
pm2 logs lume-api       # View logs
pm2 restart lume-api    # Restart the app
pm2 reload lume-api     # Zero-downtime reload
pm2 stop lume-api       # Stop the app
pm2 monit               # Resource monitoring dashboard
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application source
COPY src ./src/

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Use non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_TYPE=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_NAME=lume
      - DB_USER=lume_app
      - DB_PASSWORD=${DB_PASSWORD}
      - DATABASE_URL=mysql://lume_app:${DB_PASSWORD}@db:3306/lume
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - UPLOAD_DIR=/app/uploads
    volumes:
      - uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=lume
      - MYSQL_USER=lume_app
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
  uploads:
```

### Running with Docker Compose

```bash
# Create a .env file with production secrets
cat > .env << 'EOF'
DB_PASSWORD=<strong-password>
MYSQL_ROOT_PASSWORD=<root-password>
JWT_SECRET=<jwt-secret>
JWT_REFRESH_SECRET=<refresh-secret>
SESSION_SECRET=<session-secret>
CORS_ORIGIN=https://app.example.com
EOF

# Build and start
docker compose up -d

# Initialize the database (first run only)
docker compose exec api npm run db:init

# View logs
docker compose logs -f api
```

---

## Nginx Reverse Proxy

Nginx sits in front of the Node.js server, handling SSL termination, static file serving, and proxying API requests.

### Configuration

```nginx
upstream lume_api {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    # SSL certificates (see SSL/TLS Setup section)
    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://lume_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;

        # Request body size limit
        client_max_body_size 10m;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://lume_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://lume_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Module static files (served by backend)
    location /modules/ {
        proxy_pass http://lume_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1h;
    }

    # Serve Vue.js frontend static files
    location / {
        root /var/www/lume/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Build the Frontend

```bash
cd frontend/apps/web-lume
npm run build
```

Copy the built files to the web root:

```bash
cp -r dist/* /var/www/lume/frontend/dist/
```

---

## Health Checks

### Endpoint

```
GET /health
```

Response:

```json
{
  "success": true,
  "message": "Lume Framework is running",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "version": "1.0.0",
  "framework": "Lume",
  "modular": true
}
```

### Using with Docker

The Dockerfile includes a healthcheck that polls `/health` every 30 seconds:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

### Using with Load Balancers

Configure your load balancer to check:

- **URL**: `http://<backend>:3000/health`
- **Expected status**: 200
- **Expected body**: `"success": true`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Unhealthy threshold**: 3 consecutive failures

---

## Logging

### Winston Logger

The application uses Winston for structured logging. In production:

- Logs are written to files with daily rotation.
- Console output uses JSON format for log aggregation tools.
- Error-level logs go to a separate file.

### Morgan HTTP Logging

Express uses Morgan for HTTP request logging in `combined` format (Apache-style). Morgan is disabled in test mode to reduce noise.

### Log Levels

| Level   | Description                    |
|---------|--------------------------------|
| `error` | Application errors, crashes.   |
| `warn`  | Deprecations, non-critical issues. |
| `info`  | Server startup, module loading, requests. |
| `debug` | Detailed diagnostic information. |

### Log Rotation

For production, configure log rotation using PM2 or a system tool:

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

Or use `logrotate` on Linux:

```
/var/log/lume/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 node node
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## SSL/TLS Setup

### Let's Encrypt (Recommended)

Use Certbot for free SSL certificates:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d app.example.com

# Auto-renewal is configured automatically
# Verify with:
sudo certbot renew --dry-run
```

### Manual Certificate

If using a purchased certificate:

1. Place the certificate files:
   - `/etc/ssl/certs/lume.crt` (certificate + chain)
   - `/etc/ssl/private/lume.key` (private key)

2. Update Nginx configuration:

```nginx
ssl_certificate     /etc/ssl/certs/lume.crt;
ssl_certificate_key /etc/ssl/private/lume.key;
```

### SSL Best Practices

- Use TLS 1.2+ only (`ssl_protocols TLSv1.2 TLSv1.3`).
- Enable HSTS (handled by Helmet in production: 1 year `max-age`).
- Redirect all HTTP traffic to HTTPS.
- Set `Strict-Transport-Security` header with `includeSubDomains`.

---

## Backup Strategy

### Database Backups

Schedule daily MySQL dumps:

```bash
#!/bin/bash
# /opt/lume/scripts/backup-db.sh

BACKUP_DIR="/var/backups/lume/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="lume_production"
DB_USER="lume_app"
DB_PASSWORD="<password>"

mkdir -p "$BACKUP_DIR"

# Create compressed dump
mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  --single-transaction \
  --routines \
  --triggers \
  | gzip > "$BACKUP_DIR/lume_${TIMESTAMP}.sql.gz"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: lume_${TIMESTAMP}.sql.gz"
```

Add to crontab:

```cron
# Daily database backup at 2:00 AM
0 2 * * * /opt/lume/scripts/backup-db.sh >> /var/log/lume/backup.log 2>&1
```

### Upload Directory Backups

Back up the file uploads directory alongside the database:

```bash
#!/bin/bash
# /opt/lume/scripts/backup-uploads.sh

BACKUP_DIR="/var/backups/lume/uploads"
UPLOAD_DIR="/var/lib/lume/uploads"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

tar czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C "$(dirname $UPLOAD_DIR)" "$(basename $UPLOAD_DIR)"

# Remove backups older than 14 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +14 -delete
```

### Restore from Backup

```bash
# Restore database
gunzip < /var/backups/lume/db/lume_20260215_020000.sql.gz | mysql -u lume_app -p lume_production

# Restore uploads
tar xzf /var/backups/lume/uploads/uploads_20260215_020000.tar.gz -C /var/lib/lume/
```

### Off-Site Backups

For disaster recovery, sync backups to remote storage:

```bash
# Sync to S3
aws s3 sync /var/backups/lume/ s3://my-bucket/lume-backups/ --delete

# Or rsync to a remote server
rsync -avz /var/backups/lume/ backup-server:/backups/lume/
```
