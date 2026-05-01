# GraphQL API Deployment Guide

**Version:** 1.0  
**Status:** Deployment Instructions  
**Last Updated:** May 2026

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Environment Setup](#production-environment-setup)
3. [Database Preparation](#database-preparation)
4. [Security Hardening](#security-hardening)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring & Observability](#monitoring--observability)
7. [Deployment Strategies](#deployment-strategies)
8. [Rollback Procedures](#rollback-procedures)
9. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests pass (unit, integration, E2E)
- [ ] Code coverage >= 80%
- [ ] No security vulnerabilities (npm audit)
- [ ] TypeScript compilation without errors
- [ ] ESLint/Prettier formatting applied
- [ ] Code review completed

### Documentation

- [ ] API documentation up-to-date
- [ ] README with deployment instructions
- [ ] Environment variables documented
- [ ] Known issues/limitations listed
- [ ] Runbooks created for common tasks

### Database

- [ ] Migration scripts created and tested
- [ ] Rollback scripts prepared
- [ ] Data backup strategy defined
- [ ] Schema validated against production requirements

### Infrastructure

- [ ] Server capacity calculated
- [ ] Load balancing configured
- [ ] SSL/TLS certificates obtained
- [ ] Firewall rules configured
- [ ] Backup systems tested

### Monitoring

- [ ] Alerting rules configured
- [ ] Dashboards created
- [ ] Logging aggregation set up
- [ ] Performance baselines established

---

## Production Environment Setup

### 1. Environment Variables

```bash
# Production .env file
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=mysql://[user]:[pass]@[host]:3306/lume
DB_POOL_SIZE=20
QUERY_TIMEOUT=30000

# Authentication
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)

# GraphQL
ENABLE_PLAYGROUND=false
ENABLE_INTROSPECTION=false
ENABLE_TRACING=true
MAX_QUERY_COMPLEXITY=1000
RATE_LIMIT_MAX=100

# Redis
REDIS_HOST=redis-cluster-prod
REDIS_PORT=6379
REDIS_PASSWORD=$(aws secretsmanager get-secret-value --secret-id redis-prod-password)

# CORS
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=$(aws secretsmanager get-secret-value --secret-id sendgrid-api-key)

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com
OTEL_SERVICE_NAME=lume-graphql-prod
LOG_LEVEL=info
```

### 2. Secrets Management

```bash
# Store secrets in AWS Secrets Manager or HashiCorp Vault
aws secretsmanager create-secret --name lume/graphql/jwt-secret --secret-string "$JWT_SECRET"
aws secretsmanager create-secret --name lume/graphql/db-password --secret-string "$DB_PASSWORD"
aws secretsmanager create-secret --name lume/graphql/sendgrid-key --secret-string "$SENDGRID_KEY"

# Retrieve in application
const secret = await secretsManager.getSecretValue('lume/graphql/jwt-secret');
```

### 3. Docker Setup

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
```

### 4. Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lume-graphql
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lume-graphql
  template:
    metadata:
      labels:
        app: lume-graphql
    spec:
      containers:
      - name: lume-graphql
        image: registry.example.com/lume-graphql:latest
        imagePullPolicy: IfNotPresent
        
        ports:
        - containerPort: 3000
          name: http
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        
        # Secrets from AWS Secrets Manager / Kubernetes Secrets
        envFrom:
        - secretRef:
            name: lume-graphql-secrets
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        
        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        # Volume mounts
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      
      volumes:
      - name: logs
        emptyDir: {}
      
      # Pod disruption budget
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - lume-graphql
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: lume-graphql
  namespace: production
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  selector:
    app: lume-graphql
```

---

## Database Preparation

### 1. Pre-Migration Backup

```bash
# Full backup before migration
mysqldump -h [host] -u [user] -p lume > /backups/lume-pre-migration-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
mysql -h [host] -u [user] -p lume < /backups/lume-pre-migration-*.sql --test
```

### 2. Run Migrations

```bash
# In production environment
npx prisma migrate deploy

# Verify all migrations applied
npx prisma migrate status

# Check schema
npx prisma db push --skip-generate
```

### 3. Performance Tuning

```sql
-- Add indexes for GraphQL queries
ALTER TABLE data_grid ADD INDEX idx_tenant_created (tenant_id, created_at);
ALTER TABLE grid_row ADD INDEX idx_grid_status (grid_id, status);
ALTER TABLE workflow_execution ADD INDEX idx_status_created (status, created_at);

-- Optimize query plans
ANALYZE TABLE data_grid;
ANALYZE TABLE grid_row;
ANALYZE TABLE workflow_execution;
```

---

## Security Hardening

### 1. HTTPS/TLS

```bash
# Generate SSL certificate
certbot certonly --standalone -d graphql.example.com

# Configure Nginx
server {
    listen 443 ssl http2;
    server_name graphql.example.com;
    
    ssl_certificate /etc/letsencrypt/live/graphql.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/graphql.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name graphql.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. Rate Limiting

```nginx
# Nginx rate limiting
limit_req_zone $binary_remote_addr zone=graphql_limit:10m rate=10r/s;
limit_req_status 429;

location /graphql {
    limit_req zone=graphql_limit burst=20 nodelay;
    proxy_pass http://localhost:3000;
}
```

### 3. Security Headers

```typescript
// Add to Express middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'",
  );
  
  // HSTS (HTTPS Strict Transport Security)
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  
  next();
});
```

### 4. Query Validation

```typescript
// Disable introspection in production
const config = {
  introspection: process.env.NODE_ENV !== 'production',
  playground: false,
};

// Enable persisted queries
const persistedQueries = {
  ttl: 3600,
};
```

---

## Performance Optimization

### 1. Caching Strategy

```typescript
// Redis caching
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Cache GraphQL responses
app.use(async (req, res, next) => {
  if (req.method === 'GET') {
    const cacheKey = `gql:${req.url}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  }
  next();
});
```

### 2. Query Analysis

```bash
# Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2; // 2 seconds

# View slow queries
SHOW VARIABLES LIKE 'slow_query_log_file';
tail -f /var/log/mysql/slow-query.log
```

### 3. Connection Pooling

```typescript
// Prisma with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=10`,
    },
  },
});
```

---

## Monitoring & Observability

### 1. OpenTelemetry Setup

```typescript
// Jaeger exporter
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger-collector:14250',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new GraphQLInstrumentation(),
  ],
});

sdk.start();
```

### 2. Prometheus Metrics

```typescript
// Expose Prometheus metrics
import promClient from 'prom-client';

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### 3. ELK Stack

```yaml
# docker-compose.yml for local logging
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
```

---

## Deployment Strategies

### 1. Blue-Green Deployment

```bash
#!/bin/bash

# Deploy new version to "green" environment
kubectl set image deployment/lume-graphql-green \
  lume-graphql=registry.example.com/lume-graphql:v2.0.0

# Wait for rollout
kubectl rollout status deployment/lume-graphql-green

# Switch traffic from blue to green
kubectl patch service lume-graphql \
  -p '{"spec":{"selector":{"deployment":"lume-graphql-green"}}}'

# Keep blue environment running for quick rollback
```

### 2. Canary Deployment

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: lume-graphql
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10  # 10% traffic to new version
      - pause: {duration: 15m}
      - setWeight: 50
      - pause: {duration: 15m}
      - setWeight: 100
```

---

## Rollback Procedures

### 1. Immediate Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/lume-graphql

# Verify rollback
kubectl rollout status deployment/lume-graphql

# Check version
kubectl describe pods | grep Image
```

### 2. Database Rollback

```bash
# List migrations
npx prisma migrate status

# Resolve migration issues (only in dev/staging)
npx prisma migrate resolve --rolled-back migration_name

# For production: restore from backup
mysql -h [host] -u [user] -p lume < /backups/lume-pre-migration-*.sql
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Verify service health
curl https://graphql.example.com/health

# Check GraphQL introspection (if enabled)
curl -X POST https://graphql.example.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

### 2. Performance Baseline

```bash
# Run load test
npm run test:load

# Monitor metrics
open https://grafana.example.com/d/api-performance
```

### 3. Error Monitoring

```bash
# Check logs for errors
kubectl logs -l app=lume-graphql --tail=100

# Monitor error rate
open https://prometheus.example.com/graph?expr=rate(graphql_errors_total[5m])
```

### 4. User Acceptance Testing

- [ ] Test critical workflows
- [ ] Verify authentication/authorization
- [ ] Check bulk operations
- [ ] Test error handling
- [ ] Verify real-time subscriptions

---

## Troubleshooting

### High Database Connection Usage

```bash
# Check active connections
SHOW PROCESSLIST;

# Find long-running queries
SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST 
WHERE TIME > 300 
ORDER BY TIME DESC;

# Kill idle connections
KILL CONNECTION process_id;
```

### GraphQL Resolver Timeouts

```typescript
// Add request timeout
const timeout = setTimeout(() => {
  throw new Error('Query timeout');
}, 30000);

// Clear on completion
try {
  return await resolverFunction();
} finally {
  clearTimeout(timeout);
}
```

### Memory Leaks

```bash
# Generate heap dump
kill -USR2 $(pidof node)

# Analyze with clinic.js
npx clinic doctor -- node dist/main.js
```

---

## Rollout Timeline

- **T-1 day:** Final testing, backup verification
- **T-0:** Deploy to staging, run tests
- **T+0:** Blue-green deployment to production
- **T+15 min:** Monitor metrics, verify health
- **T+1 hour:** Run acceptance tests
- **T+24 hours:** Monitor for issues, keep rollback ready

---

## Contact & Support

For deployment issues:
1. Check logs: `kubectl logs -l app=lume-graphql`
2. Review monitoring: Check Grafana dashboards
3. Contact on-call: Page GraphQL team
4. Rollback if needed: Follow rollback procedures

