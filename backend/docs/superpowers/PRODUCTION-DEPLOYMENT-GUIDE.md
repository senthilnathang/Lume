# Unified Runtime — Production Deployment Guide

## Pre-Deployment Checklist

### 1. System Requirements

**Server Infrastructure:**
- Node.js 18+ or 20 LTS
- MySQL 8.0+ (Lume database)
- Redis 6.0+ (caching, BullMQ)
- Minimum 2GB RAM
- 10GB disk space (initial)

**Network:**
- HTTPS enabled
- Port 3000 (Express API)
- Port 6379 (Redis, internal only)
- WebSocket support enabled (for real-time features)

### 2. Environment Setup

```bash
# Clone Lume framework
git clone https://github.com/your-org/lume.git
cd lume/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment
cat > .env << EOF
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=lume_user
DB_PASSWORD=your_secure_password
DB_NAME=lume

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# API Configuration
PORT=3000
NODE_ENV=production
API_URL=https://your-domain.com/api

# JWT
JWT_SECRET=your_long_random_secret_key_here
JWT_EXPIRY=24h

# Email (for audit alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
EOF
```

### 3. Database Initialization

```bash
# Create database and user
mysql -u root -p << EOF
CREATE DATABASE lume CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lume_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON lume.* TO 'lume_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Run database migrations
npm run db:init

# Verify database
mysql -u lume_user -p lume -e "SHOW TABLES;" | head -20
```

### 4. Redis Setup

```bash
# Start Redis server
redis-server --daemonize yes --port 6379

# Verify Redis connection
redis-cli ping
# Output: PONG

# Configure persistence (optional but recommended)
redis-cli CONFIG SET save "900 1 300 10 60 10000"
redis-cli CONFIG REWRITE
```

### 5. Runtime Configuration

```javascript
// config/runtime.js
export const RUNTIME_CONFIG = {
  // Core settings
  environment: 'production',
  debug: false,

  // Cache configuration
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 10000, // max cached items
    layers: {
      l1: { enabled: true, ttl: 300 }, // In-process, 5 min
      l2: { enabled: true, ttl: 1800 }, // Redis, 30 min
      l3: { enabled: true, ttl: 600 }, // Query cache, 10 min
      l4: { enabled: true }, // HTTP ETag
      l5: { enabled: true } // CDN headers
    }
  },

  // Database
  database: {
    maxConnections: 20,
    idleTimeout: 900000, // 15 min
    connectionTimeout: 10000 // 10 sec
  },

  // Audit logging
  audit: {
    enabled: true,
    retentionDays: 730, // 2 years
    suspicious: {
      rapidDeleteThreshold: 10, // 10 deletes in 1 hour
      bulkUpdateThreshold: 5,
      offHoursStart: 22,
      offHoursEnd: 6
    }
  },

  // Multi-tenancy
  tenancy: {
    enabled: false, // Set to true for SaaS
    isolationLevel: 'row', // 'row' or 'schema'
    maxTenantsPerInstance: 1000
  },

  // Analytics
  analytics: {
    enabled: true,
    sampleRate: 1.0, // 100% in production
    metricsRetention: 7 // days
  },

  // Rate limiting
  rateLimiting: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100 // per window per IP
  },

  // Security
  security: {
    jwtExpiry: '24h',
    refreshTokenExpiry: '7d',
    passwordMinLength: 12,
    corsOrigins: ['https://your-domain.com']
  }
};
```

## Deployment Steps

### 1. Application Startup

```bash
# Build (if needed)
npm run build

# Start application
npm start

# Verify startup
curl http://localhost:3000/api/health
# Output: {"status":"ok","timestamp":"2026-04-30T..."}
```

### 2. Enable HTTPS/SSL

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d your-domain.com

# Update Express config
// server.js
import https from 'https';
import fs from 'fs';

const cert = fs.readFileSync('/etc/letsencrypt/live/your-domain.com/fullchain.pem');
const key = fs.readFileSync('/etc/letsencrypt/live/your-domain.com/privkey.pem');

https.createServer({ key, cert }, app).listen(443);
```

### 3. Process Management

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lume-api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Set to auto-start on reboot
pm2 startup
pm2 save
```

### 4. Monitoring & Logging

```bash
# Install log aggregation (optional)
npm install winston winston-daily-rotate-file

# Configure structured logging
// config/logger.js
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxDays: '30'
    })
  ]
});

// Monitor runtime health
setInterval(async () => {
  const health = {
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: await checkRedisConnection(),
    database: await checkDatabaseConnection()
  };
  logger.info('Health check', health);
}, 60000); // Every minute
```

### 5. Backup Strategy

```bash
# Daily database backup
cat > backup-db.sh << EOF
#!/bin/bash
BACKUP_DIR="/backups/mysql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u lume_user -p $DB_PASSWORD lume > $BACKUP_DIR/lume_$TIMESTAMP.sql
gzip $BACKUP_DIR/lume_$TIMESTAMP.sql
find $BACKUP_DIR -name "lume_*.sql.gz" -mtime +30 -delete # Keep 30 days
EOF

chmod +x backup-db.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

### 6. CDN Configuration

```javascript
// Serve static assets via CDN
app.use(express.static('public', {
  maxAge: 31536000, // 1 year
  etag: false, // Let CDN handle
  lastModified: false
}));

// Set Cache-Control headers
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path.match(/\.(js|css|woff|woff2|eot|ttf|otf)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
  next();
});
```

## Performance Tuning

### 1. Database Optimization

```sql
-- Create indexes on frequently queried fields
CREATE INDEX idx_ticket_status ON tickets(status);
CREATE INDEX idx_ticket_assigned_to ON tickets(assigned_to_id);
CREATE INDEX idx_ticket_created_at ON tickets(created_at);
CREATE INDEX idx_audit_log_user ON audit_logs(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_logs(timestamp);

-- Enable query cache (if not using Redis)
SET GLOBAL query_cache_type = ON;
SET GLOBAL query_cache_size = 268435456; -- 256MB

-- Optimize table statistics
ANALYZE TABLE tickets;
ANALYZE TABLE audit_logs;
```

### 2. Connection Pooling

```javascript
// Configure connection pool
const pool = mysql.createPool({
  connectionLimit: 20,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});
```

### 3. Query Optimization

```javascript
// Enable query logging in development only
if (process.env.NODE_ENV !== 'production') {
  orm.on('query', (query) => {
    console.log('[QUERY]', query.sql);
  });
}

// Monitor slow queries
orm.on('slowQuery', (query, time) => {
  if (time > 1000) { // > 1 second
    logger.warn(`Slow query (${time}ms): ${query.sql}`);
  }
});
```

### 4. Redis Optimization

```bash
# Monitor Redis memory usage
redis-cli INFO memory

# Configure Redis for production
redis-cli CONFIG SET maxmemory 1gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET timeout 300
redis-cli CONFIG SET tcp-backlog 511
```

## Monitoring & Alerting

### 1. Key Metrics to Monitor

```javascript
// Metrics to track
const metrics = {
  requestsPerSecond: 0,
  averageResponseTime: 0,
  cacheHitRate: 0,
  errorRate: 0,
  databaseConnections: 0,
  redisMemoryUsage: 0,
  auditLogsPerDay: 0,
  suspiciousActivityCount: 0
};

// Set up alerts
if (metrics.errorRate > 0.05) { // > 5%
  alerting.sendAlert('High error rate', metrics);
}

if (metrics.cacheHitRate < 0.7) { // < 70%
  alerting.sendAlert('Low cache hit rate', metrics);
}

if (metrics.suspiciousActivityCount > 10) {
  alerting.sendAlert('Suspicious activity detected', metrics);
}
```

### 2. Health Checks

```bash
# Monitor endpoint
curl http://localhost:3000/api/health

# Deep health check (should run every 30 seconds)
curl -X POST http://localhost:3000/api/health/deep

# Response example:
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "redis": "connected",
    "api": "responding",
    "diskSpace": "adequate"
  },
  "metrics": {
    "requestsPerSecond": 125,
    "averageLatency": 45,
    "cacheHitRate": 0.87,
    "errorRate": 0.001
  }
}
```

## Security Hardening

### 1. CORS Configuration

```javascript
import cors from 'cors';

app.use(cors({
  origin: ['https://your-domain.com', 'https://www.your-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  }
});

app.use(limiter);
```

### 3. Input Validation

```javascript
// Validate all inputs
import { body, validationResult } from 'express-validator';

app.post('/api/ticket', [
  body('title').trim().notEmpty().isLength({ max: 255 }),
  body('status').isIn(['open', 'in_progress', 'closed']),
  body('priority').isInt({ min: 1, max: 5 })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
});
```

### 4. SQL Injection Prevention

```javascript
// Always use parameterized queries
// ✓ CORRECT
db.query('SELECT * FROM tickets WHERE id = ?', [id]);

// ✗ WRONG
db.query('SELECT * FROM tickets WHERE id = ' + id);
```

## Rollback Procedure

### If deployment fails:

```bash
# Revert to previous version
git revert HEAD --no-edit

# Reset database to previous backup
mysql -u lume_user -p lume < /backups/mysql/lume_PREVIOUS.sql

# Restart application
pm2 restart lume-api

# Verify rollback
curl http://localhost:3000/api/health
```

## Troubleshooting

### Common Issues

**1. High Memory Usage**
```bash
# Check Node process memory
ps aux | grep node

# If > 1GB, increase cache cleanup:
RUNTIME_CONFIG.cache.maxSize = 5000; // Reduce from 10000
```

**2. Database Connection Errors**
```bash
# Verify MySQL is running
sudo systemctl status mysql

# Check MySQL logs
tail -f /var/log/mysql/error.log

# Verify credentials
mysql -u lume_user -p lume -e "SELECT 1;"
```

**3. Redis Connection Failed**
```bash
# Check Redis is running
redis-cli ping

# Verify Redis config
redis-cli CONFIG GET "*"

# Clear Redis cache if needed
redis-cli FLUSHALL
```

**4. Slow Queries**
```bash
# Enable slow query log
mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"
mysql -u root -p -e "SET GLOBAL long_query_time = 2;"

# Check slow queries
tail -f /var/log/mysql/slow.log
```

## Post-Deployment Verification

- [ ] Health check passes
- [ ] Database connected
- [ ] Redis connected
- [ ] HTTPS working
- [ ] CORS configured
- [ ] Rate limiting active
- [ ] Audit logging working
- [ ] Caching working (hit rate > 70%)
- [ ] All tests passing
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Alerts configured

## Maintenance Schedule

**Daily:**
- Monitor error logs
- Check cache hit rate
- Review suspicious activity

**Weekly:**
- Verify backups completed
- Check database size
- Review slow query logs
- Update security patches

**Monthly:**
- Performance analysis
- Capacity planning review
- Security audit
- Database optimization

**Quarterly:**
- Load testing
- Disaster recovery drill
- Security review
- Architecture assessment

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-30  
**Status:** Ready for Production
