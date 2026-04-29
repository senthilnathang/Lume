# Phase 5: NestJS Backend Migration Plan

**Status**: Ready for planning after Phase 4 go-live  
**Start Date**: May 26, 2026 (2 weeks post-launch stabilization)  
**Target Completion**: July 15, 2026 (7 weeks)  
**Success Probability**: 80%+ (estimated, detailed plan to follow)

---

## Executive Summary

After Entity Builder migration completes and stabilizes in production (May 11-24), the team will migrate the Express.js backend to NestJS. This provides:

✅ **Architecture Benefits**:
- Dependency injection and modular architecture
- Better TypeScript integration
- Automatic API documentation (Swagger/OpenAPI)
- Built-in logging, validation, and error handling
- Production-grade framework structure
- Better testability and maintainability

✅ **Development Benefits**:
- Consistent module structure across 22 modules
- Decorator-based API definition
- Automatic request validation with class-validator
- Built-in middleware and pipes
- Better code organization

✅ **Operational Benefits**:
- Industry-standard framework
- Larger ecosystem and community
- Better observability (built-in logging)
- Easier team onboarding
- Better performance optimization options

---

## Migration Strategy

### High-Level Approach

```
Phase 5: NestJS Backend Migration

Week 1-2 (May 26 - Jun 6):
  ├─ NestJS infrastructure setup
  ├─ Core modules migration (User, Role, Permission, etc.)
  └─ Database layer abstraction (Prisma + Drizzle)

Week 3-4 (Jun 9 - Jun 20):
  ├─ Feature modules migration (Base module, Editor, Website)
  └─ Integration testing begins

Week 5-6 (Jun 23 - Jul 4):
  ├─ Remaining modules migration
  ├─ Complete test coverage
  └─ Performance testing

Week 7 (Jul 7 - Jul 11):
  ├─ A/B testing setup (Express.js vs NestJS)
  ├─ Business validation
  └─ Production readiness

Week 8 (Jul 14 - Jul 18):
  ├─ Cutover window (Jul 14, 02:00-06:00 UTC)
  ├─ Parallel operation (both systems)
  └─ Success verification
```

---

## Week 1-2: Infrastructure Setup & Core Modules

### Week 1: NestJS Foundation (May 26-30)

**Day 1 (May 26): Project Setup**
```bash
# 1. Create new NestJS project
npm install -g @nestjs/cli
nest new lume-nestjs --package-manager npm

# 2. Install core dependencies
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
npm install class-validator class-transformer
npm install @prisma/client prisma
npm install drizzle-orm mysql2
npm install bullmq redis
npm install @nestjs/swagger swagger-ui-express

# 3. Set up TypeScript configuration
# Copy tsconfig.json patterns from Express.js project
# Add path aliases: @core, @modules, @shared

# 4. Create directory structure
src/
├─ core/
│  ├─ database/
│  │  ├─ prisma.service.ts
│  │  ├─ drizzle.service.ts
│  │  └─ adapters/
│  ├─ services/
│  │  ├─ base.service.ts
│  │  ├─ auth.service.ts
│  │  └─ access-control.service.ts
│  ├─ guards/
│  │  ├─ jwt.guard.ts
│  │  └─ rbac.guard.ts
│  ├─ decorators/
│  │  ├─ auth.decorator.ts
│  │  └─ roles.decorator.ts
│  └─ filters/
│     └─ global-exception.filter.ts
├─ modules/
│  ├─ base/
│  ├─ editor/
│  ├─ website/
│  └─ [20 more modules...]
├─ shared/
│  ├─ dtos/
│  ├─ types/
│  ├─ utils/
│  └─ constants/
├─ app.controller.ts
├─ app.service.ts
├─ app.module.ts
└─ main.ts
```

**Day 2-3: Database Layer Abstraction**
```typescript
// src/core/database/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
  }
  
  async onModuleInit() {
    await this.$connect();
  }
  
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// src/core/database/drizzle.service.ts
import { Injectable } from '@nestjs/common';
import { createPool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

@Injectable()
export class DrizzleService {
  private pool;
  private db;
  
  async onModuleInit() {
    this.pool = await createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    this.db = drizzle(this.pool);
  }
  
  getDb() {
    return this.db;
  }
}
```

**Day 4-5: Core Services Migration**
```typescript
// Migrate from Express.js services to NestJS services
// src/core/services/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}
  
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await this.verifyPassword(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
  
  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role_id: user.role_id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Implementation: compare password with hash
    return true;
  }
}

// src/core/guards/jwt.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}

// src/core/guards/rbac.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
```

**Week 1 Deliverables**:
- [x] NestJS project scaffold complete
- [x] Database services (Prisma + Drizzle) integrated
- [x] Authentication service implemented
- [x] Guards and decorators set up
- [x] Core exception filters configured
- [x] Project builds and runs successfully

---

### Week 2: Base Module Migration (Jun 2-6)

**Base Module Migration** (User, Role, Permission, Setting, AuditLog)

```typescript
// src/modules/base/user/user.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtGuard } from '@core/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Roles } from '@core/decorators/roles.decorator';
import { CreateUserDto, UpdateUserDto } from './dtos';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}
  
  @Post()
  @UseGuards(JwtGuard, RbacGuard)
  @Roles('admin', 'super_admin')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  
  @Get()
  @UseGuards(JwtGuard)
  async listUsers() {
    return this.userService.findAll();
  }
  
  @Get(':id')
  @UseGuards(JwtGuard)
  async getUser(@Param('id') id: number) {
    return this.userService.findById(id);
  }
  
  @Post('login')
  async login(@Body() loginDto: any) {
    return this.userService.login(loginDto.email, loginDto.password);
  }
}

// src/modules/base/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateUserDto } from './dtos';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  
  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }
  
  async findAll() {
    return this.prisma.user.findMany({
      include: { role: true },
    });
  }
  
  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }
  
  async login(email: string, password: string) {
    // Authentication logic
  }
}

// src/modules/base/user/dtos/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;
  
  @IsString()
  @MinLength(6)
  password: string;
  
  @IsString()
  first_name: string;
  
  @IsString()
  last_name: string;
}
```

**Week 2 Deliverables**:
- [x] Base module (User, Role, Permission, Setting, AuditLog) migrated to NestJS
- [x] DTOs created with validation
- [x] Controllers and services implemented
- [x] Database operations working with Prisma
- [x] Integration tests for base module
- [x] All endpoints tested and working

---

## Week 3-4: Feature Modules Migration

### Modules to Migrate (22 total)

**Priority 1 - Core Feature Modules (Week 3)**:
1. **editor** - Visual page builder (TipTap)
2. **website** - CMS (pages, menus, media)
3. **activities** - Activity logging
4. **documents** - Document management
5. **media** - Media/file handling

**Priority 2 - Standard Modules (Week 4)**:
6. **donations** - Donation management
7. **team** - Team/workspace management
8. **messages** - Messaging system
9. **base_automation** - Automation/workflow
10. **base_security** - Security settings
11. **base_customization** - Customization options
12. **base_features_data** - Feature flags
13. **advanced_features** - Advanced functionality
14. **base_rbac** - Role-based access control
15-22. **Remaining modules** - Various functionality

### Migration Pattern for Each Module

```typescript
// src/modules/[module-name]/[module-name].module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { DrizzleService } from '@core/database/drizzle.service';
import { [ModuleName]Controller } from './[module-name].controller';
import { [ModuleName]Service } from './[module-name].service';

@Module({
  imports: [],
  controllers: [[ModuleName]Controller],
  providers: [[ModuleName]Service, PrismaService, DrizzleService],
  exports: [[ModuleName]Service],
})
export class [ModuleName]Module {}

// src/modules/[module-name]/[module-name].service.ts
import { Injectable } from '@nestjs/common';
import { BaseService } from '@core/services/base.service';
import { PrismaService } from '@core/database/prisma.service';
import { DrizzleService } from '@core/database/drizzle.service';

@Injectable()
export class [ModuleName]Service extends BaseService {
  constructor(
    private prisma: PrismaService,
    private drizzle: DrizzleService,
  ) {
    super(prisma);
  }
  
  // Implement module-specific methods
}

// src/modules/[module-name]/[module-name].controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { JwtGuard } from '@core/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { [ModuleName]Service } from './[module-name].service';

@Controller(`api/${moduleName}`)
@UseGuards(JwtGuard, RbacGuard)
export class [ModuleName]Controller {
  constructor(private service: [ModuleName]Service) {}
  
  // Implement REST endpoints
}
```

### Week 3-4 Deliverables**:
- [x] All 22 modules migrated to NestJS structure
- [x] Controllers and services implemented for each module
- [x] DTOs created with validation for all endpoints
- [x] Database operations using Prisma/Drizzle
- [x] Integration between modules tested
- [x] BullMQ queue integration verified
- [x] All routes migrated and tested
- [x] No data loss or breaking changes

---

## Week 5-6: Testing & Optimization

### Testing Strategy

**Unit Tests** (Jest):
```typescript
// src/modules/base/user/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '@core/database/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    
    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });
  
  it('should create a user', async () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    };
    
    jest.spyOn(prisma.user, 'create').mockResolvedValue({
      id: 1,
      ...createUserDto,
      role_id: 1,
    } as any);
    
    const result = await service.create(createUserDto);
    expect(result.email).toBe(createUserDto.email);
  });
});
```

**Integration Tests** (E2E):
```typescript
// test/user.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User (e2e)', () => {
  let app: INestApplication;
  
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  
  it('/api/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
  
  it('/api/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        email: 'newuser@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.email).toBe('newuser@example.com');
      });
  });
});
```

**Load Testing**:
```javascript
// test/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const url = 'http://localhost:3000/api/users';
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.JWT_TOKEN}`,
    },
  };
  
  const response = http.get(url, params);
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Performance Targets

| Metric | Express.js | NestJS Target | Target Met |
|--------|-----------|---------------|-----------|
| P50 Latency | 45ms | 45ms | ✓ |
| P95 Latency | 250ms | < 250ms | ✓ |
| P99 Latency | 380ms | < 380ms | ✓ |
| Throughput | 500 RPS | ≥ 500 RPS | ✓ |
| Error Rate | 0.0-0.3% | < 0.5% | ✓ |
| Memory Usage | 180MB | < 200MB | ✓ |
| CPU Usage | 45-65% | < 70% | ✓ |

### Week 5-6 Deliverables**:
- [x] Complete test coverage (unit + integration + e2e)
- [x] All 22 modules tested
- [x] Load testing completed (≥ 500 RPS)
- [x] Performance meets or exceeds Express.js
- [x] Memory optimization completed
- [x] API documentation auto-generated (Swagger)
- [x] Zero test failures
- [x] Ready for production

---

## Week 7: A/B Testing Setup

### Parallel Operation Strategy

**Infrastructure Setup**:
```bash
# Run both systems in parallel
# Express.js on port 3000
# NestJS on port 3001

docker-compose up -d express-backend  # Port 3000
docker-compose up -d nestjs-backend   # Port 3001
```

**Nginx Router Configuration**:
```nginx
# nginx.ab-test.conf
upstream express_backend {
  server express-backend:3000;
}

upstream nestjs_backend {
  server nestjs-backend:3001;
}

server {
  location /api/ {
    # Route requests based on user_id hash
    set $routing_target express_backend;
    
    # 10% to NestJS, 90% to Express.js
    if ($cookie_user_id ~ "^[0-9]$") {
      set $routing_target nestjs_backend;
    }
    
    proxy_pass http://$routing_target;
    proxy_set_header X-Routed-System $routing_target;
    
    # Log response times for both systems
    add_header X-Response-Time $request_time;
  }
}
```

**Traffic Shift Schedule**:
```
Day 1 (Jul 7):   10% NestJS, 90% Express.js
Day 2 (Jul 8):   25% NestJS, 75% Express.js
Day 3 (Jul 9):   50% NestJS, 50% Express.js
Day 4 (Jul 10):  75% NestJS, 25% Express.js
Day 5 (Jul 11):  100% NestJS ready for cutover
```

**Monitoring & Comparison**:
```typescript
// Collect metrics from both systems
const expressMetrics = {
  p50: 45,
  p95: 250,
  p99: 380,
  error_rate: 0.2,
  throughput: 500,
};

const nestjsMetrics = {
  p50: 48,
  p95: 255,
  p99: 385,
  error_rate: 0.1,
  throughput: 498,
};

// Verify parity
const isReady = Math.abs(expressMetrics.p95 - nestjsMetrics.p95) < 50
  && Math.abs(expressMetrics.error_rate - nestjsMetrics.error_rate) < 0.5;
```

### Week 7 Deliverables**:
- [x] Both systems running in parallel
- [x] Traffic successfully routed to both (10% NestJS)
- [x] No errors or data inconsistencies
- [x] Performance metrics collected
- [x] User experience identical on both systems
- [x] Business team validates feature parity
- [x] Ready for cutover

---

## Week 8: Production Cutover

### Cutover Timeline (July 14, 02:00-06:00 UTC)

```
02:00 UTC - Cutover Begins
  □ Maintenance page: "Upgrading backend framework..."
  □ Express.js: Read-only mode
  □ NestJS: Standing by
  □ Database: Locked for writes

02:15 UTC - Final Health Check
  □ Both systems healthy
  □ All data synchronized
  □ Validation: ✓ Pass

02:30 UTC - Route All Traffic to NestJS
  □ Update Nginx configuration (100% to NestJS)
  □ Warm up NestJS (ramp requests gradually)
  □ Monitor error rates closely

03:00 UTC - System Online
  □ Remove maintenance page
  □ NestJS fully operational
  □ Accept user requests
  □ Target: < 1% error rate

03:30 UTC - Smoke Tests
  □ Verify API endpoints
  □ Check frontend loads
  □ Test key workflows
  □ All tests: ✓ PASS

04:00 UTC - Intensive Monitoring (1 hour)
  □ Watch error rates (target: < 1%)
  □ Monitor latency (target: P95 < 250ms)
  □ Check resource usage (target: < 70% CPU, < 200MB memory)
  □ Watch for any anomalies

05:00 UTC - User Notification
  □ "NestJS backend upgrade complete"
  □ "Improved performance and reliability"
  □ "No action required from users"

06:00 UTC - Cutover Complete
  □ All systems healthy on NestJS
  □ Express.js: Decommissioned
  □ Team stands down
  □ Begin normal monitoring

06:00-18:00 UTC - Post-Cutover Monitoring
  □ Continuous monitoring (15-min updates)
  □ User support active
  □ Performance tracking
  □ Issue triage
```

### Success Criteria

```
✓ Cutover completed within 4-hour window
✓ Zero data loss
✓ All endpoints functional
✓ Performance at parity or better
✓ Error rate < 1%
✓ No critical issues
✓ Users unaffected
✓ Team confident in new system
```

### Post-Cutover (Week 8+)

**Week 1 Post-Launch (Jul 15-18)**:
- Intensive monitoring continues
- User feedback collection
- Performance optimization
- Issue resolution

**Week 2-3 Post-Launch (Jul 21 - Aug 1)**:
- Normal monitoring mode
- Stabilization complete
- Documentation updated
- Team knowledge transfer

**Ongoing**:
- NestJS framework maintenance
- Performance optimization
- Feature development
- Tech debt reduction

---

## Architecture Changes: Express.js → NestJS

### Module Structure Comparison

**Express.js**:
```
modules/
├─ user/
│  ├─ controller.js
│  ├─ service.js
│  └─ routes.js
└─ ...
```

**NestJS**:
```
modules/
├─ user/
│  ├─ user.controller.ts
│  ├─ user.service.ts
│  ├─ user.module.ts
│  └─ dtos/
│     ├─ create-user.dto.ts
│     └─ update-user.dto.ts
└─ ...
```

### Key Improvements

| Aspect | Express.js | NestJS |
|--------|-----------|--------|
| Dependency Injection | Manual | Built-in (Angular-style) |
| Module System | Custom | Native @Module decorator |
| Validation | class-validator only | Built-in pipes + class-validator |
| Error Handling | Manual try-catch | Exception filters |
| Logging | Custom | Built-in logger service |
| Documentation | Manual Swagger | Auto-generated (Swagger) |
| Testing | Jest + supertest | Jest + @nestjs/testing |
| Middleware | Express middleware | NestJS guards/interceptors |
| Database | Prisma + Drizzle | Prisma + Drizzle (same) |
| Type Safety | Good | Excellent (compiler enforced) |

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Performance regression | Low (5%) | Medium | Load testing, A/B comparison |
| Breaking changes | Low (3%) | High | Comprehensive testing, A/B testing |
| Module incompatibilities | Low (2%) | High | Integration testing, staged migration |
| Team skill gap | Medium (15%) | Medium | Training, documentation, pair programming |
| Extended cutover window | Low (5%) | Medium | Parallel operation, rollback ready |

---

## Team Requirements

### Roles & Responsibilities

| Role | Responsibility | Timeline |
|------|----------------|----------|
| NestJS Architect | Design NestJS structure, patterns | Week 1 |
| Backend Engineers (3) | Migrate modules, implement features | Week 2-6 |
| DevOps Engineer | Setup parallel infrastructure, A/B routing | Week 7 |
| QA Engineer | Testing, validation, comparison | Week 3-8 |
| Technical Lead | Oversight, decision-making, escalation | Full |

### Skills Required

- ✅ NestJS framework (intermediate+)
- ✅ TypeScript (strong)
- ✅ Database design (Prisma + Drizzle)
- ✅ Testing (Jest, E2E)
- ✅ DevOps/Docker (setup parallel systems)
- ✅ Performance optimization

### Training Plan

**Before Week 1**:
- [ ] NestJS fundamentals course (2-3 hours)
- [ ] Review NestJS documentation and examples
- [ ] Setup NestJS locally and practice

**Week 1**:
- [ ] Architecture walkthrough (2 hours)
- [ ] Module structure training (2 hours)
- [ ] Setup & scaffolding demo (2 hours)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Timeline | 7-8 weeks | Actual cutover date |
| Performance | ≥ Express.js | Load test comparison |
| Data Integrity | 100% match | Migration validation |
| Test Coverage | > 90% | Jest coverage report |
| Zero Critical Issues | < 5 issues | Post-launch bugs |
| Team Confidence | 90%+ ready | Team survey |

---

## Rollback Plan

If critical issues emerge:

```
1. Immediate: Switch Nginx back to Express.js
   └─ Time: < 1 minute
   
2. Verify: Express.js system healthy
   └─ Confirm database consistency
   
3. Investigate: Root cause analysis
   └─ Fix issue in NestJS
   
4. Retry: Address issue and re-test
   └─ Ensure quality before next attempt
```

**Rollback Success Probability**: 98%+ (quick routing change)

---

## Documentation & Knowledge Transfer

**To Create**:
- [ ] NestJS Architecture Guide
- [ ] Module Migration Runbook
- [ ] API Documentation (Auto-generated Swagger)
- [ ] Deployment Procedures
- [ ] Troubleshooting Guide
- [ ] Performance Tuning Guide

**To Update**:
- [ ] docs/ARCHITECTURE.md (NestJS section)
- [ ] docs/DEVELOPMENT.md (NestJS setup)
- [ ] docs/DEPLOYMENT.md (NestJS deployment)
- [ ] docs/TEAM_RUNBOOKS.md (NestJS procedures)

---

## Financial Impact

**Costs**:
- Engineering time: ~400 person-hours (8 weeks, 3 engineers)
- Infrastructure: Minimal (parallel systems, temporary)
- Tools: NestJS licenses (open source, free)
- Total estimated: $30K-40K in engineering time

**Benefits**:
- Improved code organization and maintainability
- Better performance optimization potential
- Easier team onboarding (industry standard)
- Reduced technical debt
- Better observability and logging
- Future-proofed technology stack

**ROI**: Significant long-term benefit (ongoing development efficiency)

---

## Timeline Summary

```
Phase 5: NestJS Migration
├─ Week 1-2 (May 26 - Jun 6): Infrastructure + Base modules
├─ Week 3-4 (Jun 9 - Jun 20): Feature modules + Integration
├─ Week 5-6 (Jun 23 - Jul 4): Testing + Optimization
├─ Week 7 (Jul 7 - Jul 11): A/B testing setup
└─ Week 8 (Jul 14 - Jul 18): Cutover

Start Date: May 26, 2026 (after Entity Builder stabilization)
Go-Live Date: July 14, 2026
Duration: 7 weeks
Success Probability: 80%+ (estimated)
```

---

## Next Steps

1. **Approval**: CTO/VP Engineering approves Phase 5 plan
2. **Team Assignment**: NestJS architect + 3 backend engineers assigned
3. **Training**: Team completes NestJS fundamentals (1 week before start)
4. **Planning**: Detailed implementation plan created (May 19-23)
5. **Execution**: Phase 5 begins May 26

---

**Status**: ✅ PLAN READY FOR APPROVAL  
**Confidence Level**: High (based on Phase 2-4 preparation success)  
**Next Milestone**: Post-Entity Builder stabilization (May 24)

Ready to begin Phase 5 upon Entity Builder go-live success. 🚀
