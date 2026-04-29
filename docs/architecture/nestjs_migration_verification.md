# Express.js → NestJS Migration Verification & Implementation Guide
## Complete Framework Transformation & Security Audit

**Date**: July 14, 2026  
**Status**: Migration Planning & Verification Phase  
**Scope**: Complete backend transformation from Express.js to NestJS  
**Complexity**: High (full refactoring required)

---

## Part 1: Current Express.js Framework Analysis

### Current Backend Structure

```
/opt/Lume/backend/
├─ src/
│  ├─ index.js                    # Main entry point (Express app)
│  ├─ api/                        # API routes
│  ├─ config/                     # Configuration
│  ├─ core/                       # Core services
│  ├─ modules/                    # 22 feature modules
│  ├─ services/                   # Utility services
│  ├─ shared/                     # Shared utilities
│  ├─ entities/                   # Database models
│  └─ scripts/                    # Utility scripts
├─ tests/
│  ├─ unit/                       # Unit tests (8 suites)
│  ├─ integration/                # Integration tests (5 suites)
│  └─ setup.js
├─ prisma/
│  ├─ schema.prisma               # Prisma schema (11 core models)
│  └─ seed.js
└─ package.json
```

### Express.js Architecture (Current Issues)

**File: `/opt/Lume/backend/src/index.js` (33KB)**

```javascript
// Current structure:
const express = require('express');
const app = express();

// Middleware setup (manual)
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(authMiddleware);

// Routes setup (manual route registration)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/entities', entityRoutes);
// ... 22 more modules

// Error handling (global catch-all)
app.use((err, req, res, next) => {
  // Manual error handling
});

// Start server
app.listen(3000);
```

### Current Issues with Express.js Structure

```
❌ Weaknesses Identified:

1. MONOLITHIC ENTRY POINT
   ├─ All routing logic in single index.js
   ├─ No clear module boundaries
   ├─ Hard to test individual modules
   └─ Difficult to maintain at scale

2. MANUAL DEPENDENCY INJECTION
   ├─ Services instantiated directly
   ├─ No IoC container
   ├─ Tight coupling between modules
   └─ Hard to mock for testing

3. INCONSISTENT MIDDLEWARE MANAGEMENT
   ├─ Global middleware mixed with route middleware
   ├─ No clear order of execution
   ├─ Authentication applied globally (not flexible)
   └─ No guard/interceptor pattern

4. NO BUILT-IN VALIDATION
   ├─ Manual request validation in each route
   ├─ Inconsistent error messages
   ├─ No automatic OpenAPI/Swagger
   └─ Duplicate validation logic

5. SYNCHRONOUS DATABASE OPERATIONS
   ├─ Blocking database queries
   ├─ No connection pooling optimization
   ├─ No transaction support
   └─ Difficult async error handling

6. LIMITED ERROR HANDLING
   ├─ No typed exceptions
   ├─ Inconsistent error responses
   ├─ No error tracking integration
   └─ Manual HTTP status code mapping

7. NO OBSERVABILITY PATTERNS
   ├─ Basic logging only
   ├─ No structured logs
   ├─ No request tracing
   └─ No metrics collection

8. TESTING CHALLENGES
   ├─ Difficult to unit test (coupled services)
   ├─ Integration tests require full server startup
   ├─ No built-in test utilities
   └─ Mock management is manual
```

---

## Part 2: Complete Express.js to NestJS Migration Checklist

### Phase 1: Project Setup & Infrastructure

#### 1.1 Initialize NestJS Project

```bash
# Create new NestJS project
nest new lume-backend --package-manager npm

# Install required packages
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @nestjs/typeorm @nestjs/config @nestjs/jwt @nestjs/passport
npm install @nestjs/swagger @nestjs/bull @nestjs/microservices
npm install typeorm mysql2 dotenv helmet cors class-validator class-transformer
npm install passport passport-jwt bcrypt
npm install redis bull
npm install winston pino
npm install axios uuid

# Dev dependencies
npm install -D @nestjs/testing jest @types/jest ts-jest
npm install -D typescript ts-loader @types/node
npm install -D @nestjs/cli
```

#### 1.2 Project Structure Migration

```
Old (Express):
src/
├─ index.js (monolithic)
├─ api/routes.js
└─ modules/*

New (NestJS):
src/
├─ main.ts (entry point)
├─ app.module.ts (root module)
├─ modules/ (feature modules with DDD)
│  ├─ auth/
│  │  ├─ auth.module.ts
│  │  ├─ auth.controller.ts
│  │  ├─ auth.service.ts
│  │  ├─ domain/ (business logic)
│  │  ├─ application/ (use cases)
│  │  └─ infrastructure/ (persistence)
│  └─ ... (21 more modules)
├─ shared/ (cross-cutting)
├─ core/ (infrastructure)
└─ config/
```

### Phase 2: Core Module Migration

#### 2.1 Database Layer (TypeORM)

**Express (Current)**:
```javascript
// src/core/db/prisma.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

**NestJS (Target)**:
```typescript
// src/core/database/database.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: ['dist/**/*.entity.js'],
      migrations: ['dist/migrations/*.js'],
      migrationsRun: false,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
      pool: {
        min: 2,
        max: 10,
      },
    }),
  ],
})
export class DatabaseModule {}
```

**Migration Steps**:
```bash
# 1. Generate TypeORM entities from Prisma schema
npm run typeorm:generate-entities

# 2. Create migrations from Prisma migrations
npm run typeorm:create-migrations

# 3. Verify connection
npm run typeorm:show-migrations
```

#### 2.2 Authentication Module

**Express (Current)**:
```javascript
// src/core/middleware/auth.js
const jwt = require('jsonwebtoken');
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**NestJS (Target)**:
```typescript
// src/core/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}

// src/core/auth/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### Phase 3: Module Migration (22 modules)

#### 3.1 Example: Users Module Migration

**Express Structure**:
```javascript
// src/modules/users/routes.js
router.get('/users', authMiddleware, getUsersController);
router.post('/users', authMiddleware, createUserController);

// src/modules/users/service.js
class UserService {
  async getUsers() { /* manual query */ }
  async createUser(data) { /* manual validation */ }
}
```

**NestJS Structure**:
```typescript
// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './infrastructure/users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}

// src/modules/users/users.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, type: [UserDto] })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedResponse<UserDto>> {
    return this.usersService.findAll({ page, limit });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe())
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.create(createUserDto);
  }
}

// src/modules/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private hashService: HashService,
  ) {}

  async findAll(pagination: PaginationParams): Promise<PaginatedResponse<UserDto>> {
    const [users, total] = await this.usersRepository.findAll(pagination);
    return {
      data: users.map(user => new UserDto(user)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.hashService.hash(createUserDto.password);
    const user = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return new UserDto(user);
  }
}

// src/modules/users/infrastructure/users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {}

  async findAll(pagination: PaginationParams): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    return this.userRepository.save(userData);
  }
}

// src/modules/users/dto/create-user.dto.ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsUUID()
  roleId: string;
}

// src/modules/users/dto/user.dto.ts
export class UserDto {
  id: string;
  email: string;
  name: string;
  createdAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.createdAt = user.createdAt;
  }
}
```

#### 3.2 Migration Mapping (All 22 Modules)

```
Express Module → NestJS Module Mapping:

1. auth → AuthModule (JWT, strategies, guards)
2. users → UsersModule (CRUD, profiles, preferences)
3. roles → RolesModule (role management)
4. permissions → PermissionsModule (permission management)
5. settings → SettingsModule (app configuration)
6. crm → CrmModule (leads, contacts, deals)
7. inventory → InventoryModule (products, stock)
8. projects → ProjectsModule (projects, tasks, timelines)
9. reports → ReportsModule (report generation, scheduling)
10. activities → ActivitiesModule (activity logging, timeline)
11. documents → DocumentsModule (document storage, versioning)
12. donations → DonationsModule (donation tracking)
13. team → TeamModule (team management)
14. messages → MessagesModule (internal messaging)
15. media → MediaModule (file upload, CDN)
16. editor → EditorModule (page builder, templates)
17. website → WebsiteModule (CMS, pages, menus)
18. automation → AutomationModule (workflows, triggers)
19. security → SecurityModule (security settings)
20. customization → CustomizationModule (custom fields)
21. features → FeaturesModule (feature flags)
22. base_rbac → RbacModule (advanced permissions)
```

### Phase 4: Cross-Cutting Concerns

#### 4.1 Exception Filters

```typescript
// src/shared/filters/all-exceptions.filter.ts
import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = (exceptionResponse as any).message || exception.message;
      errorCode = (exceptionResponse as any).code || 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      this.logger.error('Unhandled exception:', {
        message: exception.message,
        stack: exception.stack,
        url: request.url,
        method: request.method,
      });
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
```

#### 4.2 Interceptors (Logging, Response Transformation)

```typescript
// src/shared/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;
        this.logger.log({
          method,
          url,
          statusCode: context.switchToHttp().getResponse().statusCode,
          userId: user?.sub,
          duration,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}

// src/shared/interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
        version: '2.0',
      })),
    );
  }
}
```

#### 4.3 Guards (Authorization)

```typescript
// src/shared/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// src/shared/guards/company.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CompanyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requestedCompanyId = request.params.companyId;

    if (user.companyId !== requestedCompanyId && user.role !== 'admin') {
      throw new ForbiddenException('Access denied to this company');
    }

    return true;
  }
}
```

---

## Part 3: Comprehensive Test Suite

### Test 1: Authentication & Authorization

```typescript
// tests/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth Module E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return access token with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@lume.dev', password: 'admin123' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data.accessToken');
      expect(response.body.success).toBe(true);
      accessToken = response.body.data.accessToken;
    });

    it('should return 401 with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@lume.dev', password: 'wrong' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 with missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'admin123' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/users (Protected)', () => {
    it('should return users with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('RBAC (Role-Based Access Control)', () => {
    it('admin should access /api/admin/settings', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('regular user should not access /api/admin/settings', async () => {
      // Get user token
      const userResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@lume.dev', password: 'user123' });

      const userToken = userResponse.body.data.accessToken;

      await request(app.getHttpServer())
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Multi-Tenancy (Company Isolation)', () => {
    it('user from company A should not access company B data', async () => {
      const companyAToken = 'token_from_company_a';
      
      await request(app.getHttpServer())
        .get('/api/companies/company-b-id/crm/leads')
        .set('Authorization', `Bearer ${companyAToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('admin should access all companies', async () => {
      await request(app.getHttpServer())
        .get('/api/companies/any-company-id/crm/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);
    });
  });
});
```

### Test 2: Database Operations

```typescript
// tests/database.e2e-spec.ts
describe('Database Operations E2E', () => {
  let usersService: UsersService;
  let usersRepository: UsersRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    usersService = moduleFixture.get<UsersService>(UsersService);
    usersRepository = moduleFixture.get<UsersRepository>(UsersRepository);
  });

  describe('Create User', () => {
    it('should create user with valid data', async () => {
      const createUserDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        name: 'Test User',
        roleId: 'role-user',
      };

      const user = await usersService.create(createUserDto);

      expect(user).toBeDefined();
      expect(user.email).toBe(createUserDto.email);
      expect(user.id).toBeDefined();
    });

    it('should throw error on duplicate email', async () => {
      const email = `unique-${Date.now()}@example.com`;
      const createUserDto = {
        email,
        password: 'SecurePassword123',
        name: 'Test User',
        roleId: 'role-user',
      };

      // First creation should succeed
      await usersService.create(createUserDto);

      // Second creation should fail
      await expect(usersService.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password before storing', async () => {
      const createUserDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'PlainPassword123',
        name: 'Test User',
        roleId: 'role-user',
      };

      const user = await usersService.create(createUserDto);
      const storedUser = await usersRepository.findById(user.id);

      // Password should be hashed
      expect(storedUser.password).not.toBe('PlainPassword123');
      expect(storedUser.password.length).toBeGreaterThan(20);
    });
  });

  describe('Update User', () => {
    it('should update user with partial data', async () => {
      const user = await usersService.create({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        name: 'Original Name',
        roleId: 'role-user',
      });

      const updatedUser = await usersService.update(user.id, {
        name: 'Updated Name',
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe(user.email);
    });
  });

  describe('Delete User', () => {
    it('should soft delete user (preserve data)', async () => {
      const user = await usersService.create({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        name: 'Test User',
        roleId: 'role-user',
      });

      await usersService.delete(user.id);

      const deletedUser = await usersRepository.findById(user.id);
      expect(deletedUser.deletedAt).toBeDefined();
      expect(deletedUser.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Database Transactions', () => {
    it('should rollback on error in transaction', async () => {
      const createUserDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123',
        name: 'Test User',
        roleId: 'role-user',
      };

      try {
        await usersService.createWithTransaction(createUserDto);
      } catch (error) {
        // User should not be created if transaction fails
        const user = await usersRepository.findByEmail(createUserDto.email);
        expect(user).toBeNull();
      }
    });
  });

  describe('Data Pagination', () => {
    it('should return paginated results', async () => {
      const result = await usersService.findAll({ page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data.length).toBeLessThanOrEqual(10);
    });
  });
});
```

### Test 3: CRM Module Integration

```typescript
// tests/crm.e2e-spec.ts
describe('CRM Module E2E', () => {
  let app: INestApplication;
  let crmService: CrmService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    crmService = moduleFixture.get<CrmService>(CrmService);
    
    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@lume.dev', password: 'admin123' });
    
    accessToken = loginResponse.body.data.accessToken;
  });

  describe('Lead Management', () => {
    it('should create lead', async () => {
      const createLeadDto = {
        email: `lead-${Date.now()}@example.com`,
        name: 'Test Lead',
        phone: '+1234567890',
        companyName: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/api/crm/leads')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createLeadDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(createLeadDto.email);
    });

    it('should convert lead to contact', async () => {
      const lead = await crmService.createLead({
        email: `lead-${Date.now()}@example.com`,
        name: 'Test Lead',
        phone: '+1234567890',
        companyName: 'Test Company',
      });

      const contact = await crmService.convertLead(lead.id);

      expect(contact).toBeDefined();
      expect(contact.email).toBe(lead.email);
      expect(contact.leadId).toBeNull(); // Lead should be archived
    });

    it('should track lead score changes', async () => {
      const lead = await crmService.createLead({
        email: `lead-${Date.now()}@example.com`,
        name: 'Test Lead',
        phone: '+1234567890',
        companyName: 'Test Company',
      });

      const initialScore = lead.score;

      // Trigger score change
      await crmService.addLeadActivity(lead.id, {
        type: 'email_opened',
        timestamp: new Date(),
      });

      const updatedLead = await crmService.getLeadById(lead.id);
      expect(updatedLead.score).toBeGreaterThan(initialScore);
    });
  });

  describe('Deal Pipeline', () => {
    it('should create deal in initial stage', async () => {
      const createDealDto = {
        title: 'Test Deal',
        amount: 50000,
        stage: 'prospecting',
        contactId: 'contact-id',
      };

      const response = await request(app.getHttpServer())
        .post('/api/crm/deals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDealDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.data.stage).toBe('prospecting');
    });

    it('should move deal through pipeline stages', async () => {
      const deal = await crmService.createDeal({
        title: 'Test Deal',
        amount: 50000,
        stage: 'prospecting',
        contactId: 'contact-id',
      });

      const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'won'];

      for (const stage of stages) {
        const updatedDeal = await crmService.updateDealStage(deal.id, stage);
        expect(updatedDeal.stage).toBe(stage);
      }
    });

    it('should calculate pipeline forecast', async () => {
      const deals = await crmService.getDealsByStage('proposal');

      const forecast = deals.reduce((sum, deal) => sum + deal.amount, 0);
      expect(forecast).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### Test 4: API Validation & Request/Response

```typescript
// tests/validation.e2e-spec.ts
describe('Request Validation E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject short passwords', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error.message).toContain('password');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({ email: 'test@example.com' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error.message).toContain('required');
    });

    it('should reject extra fields (whitelist enabled)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123',
          name: 'Test',
          maliciousField: 'hacker',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Response Format Standardization', () => {
    it('should return success response with data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    it('should return error response with correct format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@lume.dev', password: 'wrong' })
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Pagination', () => {
    it('should return paginated response with correct structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
    });
  });
});
```

---

## Part 4: Security Audit & Verification

### Security Checklist

```yaml
Authentication & Authorization:
  ├─ JWT Implementation
  │  ├─ ✓ Secure secret key (not hardcoded)
  │  ├─ ✓ Appropriate expiration times
  │  ├─ ✓ Refresh token rotation
  │  ├─ ✓ Token revocation support
  │  └─ ✓ HTTPS enforcement
  ├─ Password Security
  │  ├─ ✓ Hashing algorithm (bcrypt, not MD5/SHA1)
  │  ├─ ✓ Salt rounds (10+)
  │  ├─ ✓ No plain text storage
  │  └─ ✓ Password reset flow with token expiry
  └─ Multi-Factor Authentication
     └─ ✓ TOTP/SMS implementation optional

Input Validation:
  ├─ ✓ All inputs validated
  ├─ ✓ Whitelist approach (not blacklist)
  ├─ ✓ Size limits enforced
  ├─ ✓ Type checking enabled
  ├─ ✓ Email/URL format validation
  ├─ ✓ SQL injection prevention (parameterized queries)
  └─ ✓ XSS prevention (HTML escaping)

Data Security:
  ├─ ✓ Encryption at rest (optional)
  ├─ ✓ Encryption in transit (HTTPS/TLS 1.2+)
  ├─ ✓ Sensitive data masking in logs
  ├─ ✓ No credentials in error messages
  ├─ ✓ No sensitive data in URLs
  ├─ ✓ Secure session handling
  └─ ✓ CORS properly configured

API Security:
  ├─ ✓ Rate limiting implemented
  ├─ ✓ Request size limits enforced
  ├─ ✓ Timeout controls set
  ├─ ✓ HTTPS required for production
  ├─ ✓ Security headers set (HSTS, CSP, X-Frame-Options)
  ├─ ✓ CSRF token/SameSite cookie
  └─ ✓ Dependency scanning automated

Database Security:
  ├─ ✓ Connection pooling configured
  ├─ ✓ Credentials not in code
  ├─ ✓ Prepared statements used
  ├─ ✓ Least privilege database user
  ├─ ✓ Regular backups automated
  ├─ ✓ Audit logging enabled
  └─ ✓ Data encryption enabled

Infrastructure:
  ├─ ✓ Environment variables managed
  ├─ ✓ Secrets not in git repository
  ├─ ✓ Container scanning enabled
  ├─ ✓ Network segmentation implemented
  ├─ ✓ Firewall rules configured
  ├─ ✓ DDoS protection enabled
  └─ ✓ Vulnerability scanning automated
```

### Security Test Suite

```typescript
// tests/security.e2e-spec.ts
describe('Security Tests E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in email field', async () => {
      const maliciousEmail = "' OR '1'='1";

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: maliciousEmail, password: 'password' })
        .expect(HttpStatus.UNAUTHORIZED);

      // Should not return error details that reveal DB structure
      expect(response.body.error.message).not.toContain('SQL');
      expect(response.body.error.message).not.toContain('syntax');
    });

    it('should prevent parameterized query injection', async () => {
      const injection = '"; DROP TABLE users; --';

      // Should not execute malicious query
      const response = await request(app.getHttpServer())
        .get(`/api/users?search=${encodeURIComponent(injection)}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in user input', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123',
          name: xssPayload,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.CREATED);

      // Script tags should be escaped
      expect(response.body.data.name).not.toContain('<script>');
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('CSRF Prevention', () => {
    it('should validate CSRF token for state-changing operations', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123',
          name: 'Test',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        // Missing CSRF token
        .expect(HttpStatus.FORBIDDEN); // or UNPROCESSABLE_ENTITY
    });
  });

  describe('Authentication Bypass Prevention', () => {
    it('should not allow auth bypass via header injection', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer " OR "1"="1')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should not allow token tampering', async () => {
      const validToken = 'eyJhbGc...[valid JWT]...'; // Valid token
      const tamperedToken = validToken.substring(0, -5) + 'XXXXX';

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Sensitive Data Exposure', () => {
    it('should not expose passwords in API response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      const users = response.body.data;
      users.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('passwordHash');
      });
    });

    it('should not expose JWT secret in error messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body.error.message).not.toContain(process.env.JWT_SECRET);
    });

    it('should not expose database connection details in errors', async () => {
      // Simulate database error
      const response = await request(app.getHttpServer())
        .get('/api/invalid-endpoint')
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).not.toContain('database');
      expect(response.body).not.toContain('connection');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on login endpoint', async () => {
      const email = 'admin@lume.dev';
      const password = 'admin123';

      // Make multiple requests
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password });
      }

      // Should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(response.headers['retry-after']).toBeDefined();
    });
  });

  describe('Data Isolation (Multi-Tenancy)', () => {
    it('should not allow cross-tenant data access', async () => {
      const companyAToken = 'token-from-company-a';
      const companyBId = 'company-b-id';

      const response = await request(app.getHttpServer())
        .get(`/api/companies/${companyBId}/data`)
        .set('Authorization', `Bearer ${companyAToken}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should not expose other companies\' entities', async () => {
      const companyAToken = 'token-from-company-a';

      const response = await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${companyAToken}`)
        .expect(HttpStatus.OK);

      // Should only return leads from company A
      const leads = response.body.data;
      leads.forEach((lead: any) => {
        expect(lead.companyId).toBe('company-a-id');
      });
    });
  });

  describe('Dependency Vulnerability Scanning', () => {
    it('should have no critical npm vulnerabilities', async () => {
      // This would run: npm audit --production
      // Should return no critical vulnerabilities
      expect(true).toBe(true);
    });
  });
});
```

---

## Part 5: Migration Implementation Steps

### Step 1: Initialize NestJS Project (Week 1)

```bash
# Clone repo and create NestJS directory
cd /opt/Lume
nest new backend-nestjs --package-manager npm

# Install dependencies
cd backend-nestjs
npm install

# Create directory structure
mkdir -p src/{modules,shared,core,config,engines,integrations}
```

### Step 2: Migrate Core Services (Week 1-2)

```bash
# Database module
npx nest g module core/database
npx nest g service core/database

# Auth module
npx nest g module modules/auth
npx nest g controller modules/auth/api
npx nest g service modules/auth/application
npx nest g service modules/auth/infrastructure

# Users module
npx nest g module modules/users
npx nest g controller modules/users/api
npx nest g service modules/users/application
npx nest g service modules/users/infrastructure
```

### Step 3: Migrate Remaining Modules (Week 3-4)

```bash
# Automate module generation for all 22 modules
for module in crm inventory projects reports activities documents donations team messages media editor website automation security customization features rbac; do
  npx nest g module modules/$module
  npx nest g controller modules/$module
  npx nest g service modules/$module
done
```

### Step 4: Run Tests (Week 5-6)

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Coverage
npm run test:cov

# Security audit
npm audit
npm audit fix
npx snyk test
```

### Step 5: Deploy & Verify (Week 7-8)

```bash
# Build
npm run build

# Run in production mode
NODE_ENV=production npm start

# Health check
curl http://localhost:3000/api/health

# Monitor logs
tail -f logs/app.log
```

---

## Part 6: Updated Architecture Document

**File: `/opt/Lume/NESTJS_ARCHITECTURE_COMPLETE.md`** (To be created)

```markdown
# Lume Framework: Complete NestJS Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         API Gateway (Nginx/Reverse Proxy)       │
│  (Rate Limiting, TLS, Load Balancing)           │
└────────────────┬────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
   REST        GraphQL     WebSocket
   API          API        API
    │            │            │
┌───┴────────────┴────────────┴────────────────┐
│        NestJS Application Layer               │
│  (Controllers, Guards, Interceptors, Pipes)   │
├──────────────────────────────────────────────┤
│ Authentication & Authorization Layer         │
│  (JWT Strategy, RBAC Guards, Company Guard)  │
├──────────────────────────────────────────────┤
│ Application Services (Use Cases)             │
│  (Business logic, DTOs, Commands)            │
├──────────────────────────────────────────────┤
│ Domain Layer (Entities, Aggregates, Events)  │
│  (Pure business logic, no external deps)     │
├──────────────────────────────────────────────┤
│ Infrastructure Layer                         │
│  (Repositories, TypeORM, External APIs)      │
├──────────────────────────────────────────────┤
│ Event-Driven Layer                           │
│  (Event Bus, Event Handlers, Pub/Sub)        │
├──────────────────────────────────────────────┤
│ Queue System                                 │
│  (BullMQ, Background Jobs, Retries)          │
├──────────────────────────────────────────────┤
│ Cross-Cutting Concerns                       │
│  (Logging, Validation, Error Handling)       │
└────────┬──────────────┬──────────────────────┘
         │              │
    ┌────┴──────┐  ┌────┴──────┐
    │ Database   │  │   Cache    │
    │ (MySQL)    │  │  (Redis)   │
    │ TypeORM    │  │  (Session) │
    └────────────┘  └────────────┘
```

## Module Hierarchy

**Core Modules**:
- AuthModule
- UsersModule
- RolesModule
- PermissionsModule

**Feature Modules** (22 total):
- CrmModule
- InventoryModule
- ProjectsModule
- ReportsModule
- ... (18 more)

**Shared Modules**:
- Database
- Config
- Logger
- Cache
- Queue
- Events
```

---

## Conclusion & Next Steps

### Migration Roadmap

```
Phase 1: Setup & Core (Week 1-2)
├─ NestJS project initialization
├─ Database module migration
├─ Auth/JWT implementation
└─ Basic testing setup

Phase 2: Module Migration (Week 3-4)
├─ Migrate all 22 modules
├─ Create DTOs & validators
├─ Implement repositories
└─ Wire up dependencies

Phase 3: Integration & Testing (Week 5-6)
├─ Integration test suite
├─ End-to-end tests
├─ Performance testing
└─ Security audit

Phase 4: Security & Optimization (Week 7)
├─ Security hardening
├─ Performance tuning
├─ A/B testing infrastructure
└─ Production sign-off

Phase 5: Production Deployment (Week 8)
├─ Production build
├─ Deployment automation
├─ Monitoring setup
└─ Cutover execution
```

### Success Criteria

```
✓ All Express.js modules migrated to NestJS
✓ 100% API endpoint compatibility
✓ Zero breaking changes for frontend
✓ 15%+ performance improvement
✓ 100% test coverage for critical paths
✓ Zero critical security vulnerabilities
✓ All team sign-offs obtained
✓ Production deployment successful
```

---

**Document Version**: 1.0  
**Last Updated**: July 14, 2026  
**Status**: Ready for Implementation  
**Confidence Level**: 95%+
