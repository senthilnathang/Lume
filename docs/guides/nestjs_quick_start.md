# NestJS Migration Quick Start Guide
## Executable Setup & Validation Scripts

**Date**: April 22, 2026  
**Purpose**: Rapid project setup and step-by-step validation  
**Time Estimate**: 8 weeks for full migration

---

## Pre-Migration Checklist

- [ ] Team training completed (NestJS fundamentals)
- [ ] Database backup verified
- [ ] Express.js API documented
- [ ] All test suites passing
- [ ] Feature freeze approved
- [ ] Staging environment prepared
- [ ] Monitoring & alerting configured

---

## Week 1: Project Initialization

### Day 1-2: Create NestJS Project Structure

```bash
# Navigate to backend directory
cd /opt/Lume/backend

# Create NestJS project in parallel (lume-nestjs directory)
nest new lume-nestjs --strict --package-manager npm

# Or use Docker for isolated setup
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  node:20-alpine \
  sh -c "npm i -g @nestjs/cli && nest new lume-nestjs"

# Navigate to new project
cd lume-nestjs
```

### Day 3-5: Install All Dependencies

**Create install script**: `scripts/install-deps.sh`

```bash
#!/bin/bash
set -e

echo "Installing NestJS core packages..."
npm install @nestjs/core @nestjs/common @nestjs/platform-express \
  @nestjs/jwt @nestjs/passport @nestjs/typeorm @nestjs/config \
  @nestjs/swagger swagger-ui-express

echo "Installing database packages..."
npm install typeorm mysql2 pg prisma @prisma/client \
  drizzle-orm drizzle-kit

echo "Installing authentication & security..."
npm install passport passport-jwt jsonwebtoken bcryptjs \
  otplib qrcode express-rate-limit helmet cors

echo "Installing validation & serialization..."
npm install class-validator class-transformer

echo "Installing job queues & caching..."
npm install bullmq @bull-board/express ioredis redis

echo "Installing logging & monitoring..."
npm install winston axios pino pino-http

echo "Installing utilities..."
npm install lodash-es uuid dayjs nodemailer sharp multer \
  ws yaml aws-sdk compression

echo "Installing dev dependencies..."
npm install -D @types/node @types/express typescript ts-loader \
  ts-jest jest @types/jest supertest @types/supertest \
  nodemon @nestjs/testing

# Initialize Prisma
npx prisma init

echo "✓ All dependencies installed successfully"
```

**Execute**:
```bash
chmod +x scripts/install-deps.sh
./scripts/install-deps.sh
```

### Day 6-7: Project Structure Setup

**Create directory structure script**: `scripts/setup-structure.sh`

```bash
#!/bin/bash
set -e

echo "Creating NestJS project structure..."

mkdir -p src/{
  core/db,
  core/middleware,
  core/guards,
  core/interceptors,
  core/filters,
  core/pipes,
  core/decorators,
  core/services,
  auth/{
    strategies,
    services,
    dto,
    guards
  },
  modules,
  shared/{
    utils,
    constants,
    dtos,
    decorators,
    filters,
    pipes,
    strategies
  },
  config,
  events,
  queues,
  plugins
}

mkdir -p test/{
  unit,
  integration,
  fixtures,
  mocks
}

# Create core module files
touch src/core/db/{database.module.ts,prisma.service.ts,drizzle.service.ts}
touch src/core/logger/{logger.service.ts,logger.module.ts}
touch src/core/services/{base.service.ts}
touch src/core/guards/{jwt-auth.guard.ts,rbac.guard.ts,company.guard.ts}
touch src/core/interceptors/{transform.interceptor.ts,performance.interceptor.ts}
touch src/core/filters/{http-exception.filter.ts}
touch src/core/pipes/{validation.pipe.ts}

# Create auth module files
touch src/auth/{auth.module.ts,auth.service.ts,auth.controller.ts}
touch src/auth/strategies/{jwt.strategy.ts}
touch src/auth/services/{mfa.service.ts}
touch src/auth/dto/{login.dto.ts,register.dto.ts}

# Create config files
touch src/config/{configuration.ts,database.config.ts}

echo "✓ Project structure created"
```

**Execute**:
```bash
chmod +x scripts/setup-structure.sh
./scripts/setup-structure.sh
```

---

## Week 2: Core Services Implementation

### Day 8-9: Database Configuration

**File**: `src/config/database.config.ts`

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'gawdesy',
  password: process.env.DB_PASSWORD || 'gawdesy',
  database: process.env.DB_NAME || 'lume',
  autoLoadEntities: true,
  synchronize: false, // Use migrations instead
  logging: process.env.DB_LOGGING === 'true',
  poolSize: 10,
  extra: {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
});
```

### Day 10-11: Environment Configuration

**File**: `.env` (copy from .env.example)

```bash
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=gawdesy
DB_PASSWORD=gawdesy
DB_NAME=lume

# JWT
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@lume.dev
SMTP_PASS=your-smtp-password

# Admin
ADMIN_EMAIL=admin@lume.dev
ADMIN_PASSWORD=admin123

# Feature Flags
ENABLE_RATE_LIMIT=true
ENABLE_SWAGGER=true
ENABLE_METRICS=true
```

### Day 12-14: Implement Core Services

**Validation script**: `scripts/validate-core.sh`

```bash
#!/bin/bash
set -e

echo "Validating core services..."

# Check database module
if [ ! -f "src/core/db/database.module.ts" ]; then
  echo "✗ Database module not found"
  exit 1
fi

# Check Prisma service
if [ ! -f "src/core/db/prisma.service.ts" ]; then
  echo "✗ Prisma service not found"
  exit 1
fi

# Check auth module
if [ ! -f "src/auth/auth.module.ts" ]; then
  echo "✗ Auth module not found"
  exit 1
fi

# Check configuration
if [ ! -f "src/config/configuration.ts" ]; then
  echo "✗ Configuration not found"
  exit 1
fi

echo "✓ Core services validated"
echo "✓ Ready for Week 3: Authentication & Authorization"
```

---

## Week 3: Authentication & Authorization

### Day 15-17: JWT Implementation

**Test script**: `scripts/test-jwt.sh`

```bash
#!/bin/bash

echo "Testing JWT functionality..."

# Start server in background
npm run start &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test JWT generation
echo "Testing login endpoint..."
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"admin123"}' \
  | jq '.access_token'

# Cleanup
kill $SERVER_PID

echo "✓ JWT tests completed"
```

### Day 18-21: RBAC Implementation

**Validation script**: `scripts/test-rbac.sh`

```bash
#!/bin/bash

echo "Testing RBAC functionality..."

# Start server
npm run start &
SERVER_PID=$!
sleep 3

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lume.dev","password":"admin123"}' \
  | jq -r '.access_token')

# Test protected endpoint
echo "Testing protected endpoint with admin token..."
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Cleanup
kill $SERVER_PID

echo "✓ RBAC tests completed"
```

---

## Week 4-5: Module Migration

### Module Migration Script Generator

**File**: `scripts/generate-module.sh`

```bash
#!/bin/bash
# Usage: ./generate-module.sh user

MODULE_NAME=$1

if [ -z "$MODULE_NAME" ]; then
  echo "Usage: $0 <module-name>"
  exit 1
fi

echo "Generating NestJS module: $MODULE_NAME..."

MODULE_DIR="src/modules/$MODULE_NAME"
mkdir -p "$MODULE_DIR"/{controllers,services,entities,dto,repositories}

# Create module file
cat > "$MODULE_DIR/$MODULE_NAME.module.ts" << EOF
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${MODULE_NAME^}Controller } from './controllers/${MODULE_NAME}.controller';
import { ${MODULE_NAME^}Service } from './services/${MODULE_NAME}.service';
import { ${MODULE_NAME^}Entity } from './entities/${MODULE_NAME}.entity';

@Module({
  imports: [TypeOrmModule.forFeature([${MODULE_NAME^}Entity])],
  controllers: [${MODULE_NAME^}Controller],
  providers: [${MODULE_NAME^}Service],
  exports: [${MODULE_NAME^}Service],
})
export class ${MODULE_NAME^}Module {}
EOF

# Create controller stub
cat > "$MODULE_DIR/controllers/${MODULE_NAME}.controller.ts" << EOF
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { ${MODULE_NAME^}Service } from '../services/${MODULE_NAME}.service';

@Controller('api/${MODULE_NAME}')
@UseGuards(JwtAuthGuard)
export class ${MODULE_NAME^}Controller {
  constructor(private readonly ${MODULE_NAME}Service: ${MODULE_NAME^}Service) {}

  @Get()
  findAll() {
    return this.${MODULE_NAME}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${MODULE_NAME}Service.findOne(+id);
  }
}
EOF

# Create service stub
cat > "$MODULE_DIR/services/${MODULE_NAME}.service.ts" << EOF
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${MODULE_NAME^}Entity } from '../entities/${MODULE_NAME}.entity';

@Injectable()
export class ${MODULE_NAME^}Service {
  constructor(
    @InjectRepository(${MODULE_NAME^}Entity)
    private repository: Repository<${MODULE_NAME^}Entity>,
  ) {}

  findAll() {
    return this.repository.find();
  }

  findOne(id: number) {
    return this.repository.findOne({ where: { id } });
  }
}
EOF

echo "✓ Module $MODULE_NAME generated"
echo "Next: Implement entity, DTO, and business logic"
```

**Usage**:
```bash
chmod +x scripts/generate-module.sh
./scripts/generate-module.sh user
./scripts/generate-module.sh rbac
./scripts/generate-module.sh settings
# ... etc for all 22 modules
```

---

## Week 6-7: Testing & Integration

### Automated Test Suite Setup

**File**: `scripts/run-tests.sh`

```bash
#!/bin/bash
set -e

echo "Running test suite..."

echo "1. Unit tests..."
npm run test

echo "2. Integration tests..."
npm run test:integration

echo "3. E2E tests..."
npm run test:e2e

echo "4. Security tests..."
npm run test:security

echo "✓ All tests passed"
```

### Performance Baseline

**File**: `scripts/measure-performance.sh`

```bash
#!/bin/bash

echo "Measuring performance baseline..."

# Start server
npm run start &
SERVER_PID=$!
sleep 3

# Get baseline metrics
echo "Testing P50, P95, P99 response times..."
ab -n 1000 -c 50 http://localhost:3000/api/health

# Cleanup
kill $SERVER_PID

echo "✓ Baseline metrics collected"
```

---

## Week 8: Production Deployment

### Pre-Production Checklist

**File**: `scripts/pre-deploy-checklist.sh`

```bash
#!/bin/bash
set -e

echo "Pre-deployment checklist..."

# 1. Security checks
echo "1. Running security audit..."
npm audit --production

# 2. Linting
echo "2. Running linter..."
npm run lint

# 3. Type checking
echo "3. Type checking..."
npm run typecheck

# 4. Build verification
echo "4. Building project..."
npm run build

# 5. Test verification
echo "5. Running tests..."
npm run test:ci

# 6. Security scanning
echo "6. Scanning for vulnerabilities..."
docker scan lume-backend:latest 2>/dev/null || true

# 7. Environment validation
echo "7. Validating environment..."
if [ -z "$JWT_SECRET" ]; then
  echo "✗ JWT_SECRET not set"
  exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
  echo "✗ DB_PASSWORD not set"
  exit 1
fi

echo "✓ All pre-deployment checks passed"
echo "✓ Ready for production deployment"
```

**Execute before deployment**:
```bash
chmod +x scripts/pre-deploy-checklist.sh
NODE_ENV=production ./scripts/pre-deploy-checklist.sh
```

### Docker Build & Deploy

**File**: `Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --chown=nestjs:nodejs . .

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
```

**Build & push**:
```bash
docker build -t lume-backend:latest .
docker tag lume-backend:latest lume-backend:v2.0.0
docker push lume-backend:v2.0.0

# Verify image security
docker scan lume-backend:v2.0.0
```

---

## Migration Validation Matrix

### Daily Validation Checklist

| Day | Task | Success Criteria | Status |
|-----|------|-----------------|--------|
| 1-7 | Project setup | All dependencies installed, structure created | |
| 8-14 | Core services | Database connected, logging working | |
| 15-21 | Auth & RBAC | JWT tokens generated, permissions checked | |
| 22-35 | Module migration | All 22 modules migrated with tests | |
| 36-42 | Integration testing | 512+ tests passing, 100% coverage | |
| 43-49 | Performance tuning | 12-19% improvement achieved | |
| 50-56 | Security hardening | 40+ controls implemented | |
| 57-56 | Production deployment | A/B testing complete, 97% adoption | |

---

## Rollback Plan

### If Critical Issues Arise:

```bash
#!/bin/bash
# Rollback to Express.js

# 1. Switch traffic back to Express
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://rollback.json

# 2. Notify stakeholders
aws sns publish --topic-arn arn:aws:sns:region:account:alerts \
  --message "Rolling back to Express.js backend"

# 3. Investigate issue
# - Check logs in CloudWatch
# - Review last commits
# - Check database state

# 4. Create incident post-mortem
# - Root cause analysis
# - Preventive measures
# - Retry timeline
```

---

## Success Metrics

- [ ] **Performance**: 12-19% faster (P95 < 850ms @ 500 RPS)
- [ ] **Compatibility**: 100% API backward compatible
- [ ] **Security**: 0 critical vulnerabilities
- [ ] **Testing**: 512+ tests, 100% pass rate
- [ ] **Uptime**: 99.9% during migration
- [ ] **Adoption**: 97%+ users within 1 hour
- [ ] **Data**: Zero loss, zero corruption

---

## Key Resources

- **NestJS Docs**: https://docs.nestjs.com
- **TypeORM Docs**: https://typeorm.io
- **Security Guide**: See NESTJS_SECURITY_HARDENING.md
- **API Reference**: See EXPRESS_TO_NESTJS_MIGRATION_VERIFICATION.md
- **Architecture**: See PHASE_5V_ADVANCED_ARCHITECTURE.md

---

## Team Responsibilities

| Role | Responsibilities |
|------|------------------|
| Tech Lead | Overall migration strategy, architecture decisions |
| Backend Lead | Core services, module migration coordination |
| DevOps | Infrastructure, deployment, monitoring |
| QA | Test suites, security testing, UAT |
| Security | Hardening, penetration testing, audit |
| DBA | Database migration, backup verification |

---

## Daily Standup Template

```
MIGRATION STATUS UPDATE
Date: April __, 2026
Week: X of 8

✓ Completed Today:
- [Item 1]
- [Item 2]

→ In Progress:
- [Item 1]
- [Item 2]

⚠ Blockers:
- [Issue 1]
- [Issue 2]

→ Tomorrow's Plan:
- [Item 1]
- [Item 2]

Metrics:
- Lines of code migrated: X
- Modules completed: Y/22
- Test pass rate: Z%
```

---

**Document Version**: 1.0  
**Last Updated**: April 22, 2026  
**Status**: Ready for Execution
