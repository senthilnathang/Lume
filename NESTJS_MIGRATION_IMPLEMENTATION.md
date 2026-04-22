# NestJS Migration Implementation Guide
## Practical Step-by-Step Execution Plan

**Date**: April 22, 2026  
**Status**: Implementation Phase  
**Target**: Production-ready NestJS backend with 22 modules, 147 permissions, multi-tenant RBAC

---

## Table of Contents
1. [Phase 0: Project Setup & Infrastructure (Week 1)](#phase-0-project-setup--infrastructure-week-1)
2. [Phase 1: Core Services Migration (Week 1-2)](#phase-1-core-services-migration-week-1-2)
3. [Phase 2: Authentication & Authorization (Week 2-3)](#phase-2-authentication--authorization-week-2-3)
4. [Phase 3: Module Migration (Week 3-4)](#phase-3-module-migration-week-3-4)
5. [Phase 4: Integration & Testing (Week 5-6)](#phase-4-integration--testing-week-5-6)
6. [Phase 5: Security Hardening & Performance (Week 6-7)](#phase-5-security-hardening--performance-week-6-7)
7. [Success Criteria & Verification](#success-criteria--verification)

---

## Phase 0: Project Setup & Infrastructure (Week 1)

### Step 0.1: Initialize NestJS Project

```bash
# Navigate to backend directory
cd /opt/Lume/backend

# Create new NestJS project in parallel structure
npm i -g @nestjs/cli
nest new lume-nestjs --package-manager npm

# Or for in-place migration, set up directory structure
mkdir -p lume-nestjs/{src,test,dist}
cd lume-nestjs
npm init -y
```

### Step 0.2: Install Core Dependencies

```bash
# Core NestJS packages
npm install @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/jwt @nestjs/passport @nestjs/typeorm

# Database & ORM
npm install typeorm @prisma/client prisma drizzle-orm drizzle-kit

# Database drivers
npm install mysql2 pg

# Authentication & Security
npm install passport passport-jwt jsonwebtoken bcryptjs otplib qrcode

# API & Validation
npm install class-validator class-transformer @nestjs/swagger swagger-ui-express

# Logging & Monitoring
npm install winston axios pino pino-http @nestjs/config

# Job Queue & Caching
npm install bullmq @bull-board/express ioredis redis

# Utilities
npm install lodash-es uuid dayjs nodemailer sharp multer helmet cors dotenv compression
npm install ws yaml aws-sdk

# Development
npm install -D @types/node typescript @types/express jest @types/jest ts-loader ts-jest supertest @types/supertest

# Prisma CLI
npm install -D prisma
```

### Step 0.3: Create Project Structure

```bash
mkdir -p lume-nestjs/src/{
  core/db,
  core/middleware,
  core/guards,
  core/interceptors,
  core/filters,
  core/pipes,
  core/decorators,
  core/services,
  auth,
  modules,
  shared/utils,
  shared/constants,
  config,
  events,
  queues,
  plugins
}
```

### Step 0.4: NestJS Configuration Files

**lume-nestjs/tsconfig.json**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@modules/*": ["./modules/*"],
      "@core/*": ["./core/*"],
      "@shared/*": ["./shared/*"],
      "@config/*": ["./config/*"],
      "@auth/*": ["./auth/*"],
      "@events/*": ["./events/*"],
      "@queues/*": ["./queues/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

**lume-nestjs/nest-cli.json**
```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

**lume-nestjs/.env.example**
```
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=mysql://gawdesy:gawdesy@localhost:3306/lume
DB_TYPE=mysql

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@lume.dev
SMTP_PASS=your-smtp-password

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3100

# Logging
LOG_LEVEL=debug

# Admin
ADMIN_EMAIL=admin@lume.dev
ADMIN_PASSWORD=admin123

# Feature Flags
ENABLE_RATE_LIMIT=true
ENABLE_SWAGGER=true
ENABLE_METRICS=true
```

---

## Phase 1: Core Services Migration (Week 1-2)

### Step 1.1: Create Main Application Module

**src/app.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@core/db/database.module';
import { LoggerModule } from '@core/logger/logger.module';
import { AuthModule } from '@auth/auth.module';
import { SharedModule } from '@shared/shared.module';
import configuration from '@config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    LoggerModule,
    DatabaseModule,
    SharedModule,
    AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### Step 1.2: Setup TypeORM Integration

**src/core/db/database.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { DrizzleService } from './drizzle.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true,
        synchronize: false, // Use migrations instead
        logging: configService.get('database.logging'),
        poolSize: 10,
        connectorPackage: 'mysql2',
        extra: {
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        },
      }),
    }),
  ],
  providers: [PrismaService, DrizzleService],
  exports: [PrismaService, DrizzleService],
})
export class DatabaseModule {}
```

**src/core/db/prisma.service.ts**
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private logger: LoggerService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
    
    // Setup password hashing middleware
    this.$use(async (params, next) => {
      if (params.model === 'User' && (params.action === 'create' || params.action === 'update')) {
        if (params.data.password && !params.data.password.startsWith('$2')) {
          const bcrypt = await import('bcryptjs');
          params.data.password = await bcrypt.hash(params.data.password, 10);
        }
      }
      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Step 1.3: Create Configuration Module

**src/config/configuration.ts**
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  app: {
    name: 'Lume',
    version: '2.0.0',
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  database: {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
    database: process.env.DB_NAME || 'lume',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
}));
```

### Step 1.4: Setup Logging with Winston

**src/core/logger/logger.service.ts**
```typescript
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.silly(message, { context });
  }
}
```

### Step 1.5: Create Base Service for CRUD

**src/core/services/base.service.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { Repository, FindOptionsWhere, FindOptionsRelations } from 'typeorm';
import { LoggerService } from '@core/logger/logger.service';
import { PaginationDto } from '@shared/dtos/pagination.dto';

@Injectable()
export class BaseService<T> {
  constructor(
    protected repository: Repository<T>,
    protected logger: LoggerService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    where?: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
  ) {
    const [data, total] = await this.repository.findAndCount({
      where,
      relations,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      order: { id: 'DESC' } as any,
    });

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(where: FindOptionsWhere<T>, relations?: FindOptionsRelations<T>) {
    return this.repository.findOne({ where, relations });
  }

  async create(data: Partial<T>) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string | number, data: Partial<T>) {
    await this.repository.update(id, data);
    return this.findOne({ id } as FindOptionsWhere<T>);
  }

  async delete(id: string | number) {
    return this.repository.delete(id);
  }

  async softDelete(id: string | number) {
    return this.repository.update(id, { deletedAt: new Date() } as any);
  }
}
```

---

## Phase 2: Authentication & Authorization (Week 2-3)

### Step 2.1: Create JWT Strategy

**src/auth/strategies/jwt.strategy.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
```

### Step 2.2: Create Auth Service

**src/auth/auth.service.ts**
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@core/db/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign(
      { sub: user.id, email: user.email, roleId: user.roleId },
      { expiresIn: this.configService.get('jwt.expiresIn') },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      },
    );

    return {
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    };
  }

  async validateUser(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });
  }

  async refreshToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const newToken = this.jwtService.sign(
        { sub: decoded.sub },
        { expiresIn: this.configService.get('jwt.expiresIn') },
      );

      return { access_token: newToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
```

### Step 2.3: Create RBAC Guard

**src/core/guards/rbac.guard.ts**
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@core/db/prisma.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    // Admin and super_admin have full access
    if (['admin', 'super_admin'].includes(user.role.name)) {
      return true;
    }

    const userPermissions = user.role.permissions.map((p) => p.slug);
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### Step 2.4: Create Permission Decorator

**src/core/decorators/require-permissions.decorator.ts**
```typescript
import { SetMetadata } from '@nestjs/common';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
```

---

## Phase 3: Module Migration (Week 3-4)

### Step 3.1: Create User Module Structure

```bash
mkdir -p src/modules/user/{
  controllers,
  services,
  entities,
  dto,
  repositories
}
```

### Step 3.2: User Entity Migration

**src/modules/user/entities/user.entity.ts**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Role } from '@modules/rbac/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column()
  roleId: number;

  @ManyToOne(() => Role, role => role.users)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
```

### Step 3.3: User DTO

**src/modules/user/dto/create-user.dto.ts**
```typescript
import { IsEmail, IsString, MinLength, IsPhoneNumber, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  roleId?: number;
}
```

### Step 3.4: User Service

**src/modules/user/services/user.service.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { BaseService } from '@core/services/base.service';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    logger: LoggerService,
  ) {
    super(userRepository, logger);
  }

  async createUser(createUserDto: CreateUserDto) {
    const user = await this.create({
      ...createUserDto,
      roleId: createUserDto.roleId || 3, // Default to user role
    });
    
    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.findOne({ email: email as any });
  }

  async getUserWithPermissions(userId: number) {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });
  }
}
```

### Step 3.5: User Controller

**src/modules/user/controllers/user.controller.ts**
```typescript
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return this.userService.findByEmail(req.user.email);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUser(@Param('id') id: number) {
    return this.userService.getUserWithPermissions(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('user.create')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }
}
```

### Step 3.6: User Module

**src/modules/user/user.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { User } from './entities/user.entity';
import { LoggerModule } from '@core/logger/logger.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), LoggerModule],
  services: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
```

### Step 3.7: Create Module Factory Pattern

**src/modules/module-factory.ts**
```typescript
// Mapping of Express modules to NestJS modules
export const MODULE_MIGRATION_MAP = {
  user: 'UserModule',
  auth: 'AuthModule',
  rbac: 'RbacModule',
  settings: 'SettingsModule',
  activities: 'ActivitiesModule',
  audit: 'AuditModule',
  editor: 'EditorModule',
  website: 'WebsiteModule',
  documents: 'DocumentsModule',
  media: 'MediaModule',
  messages: 'MessagesModule',
  team: 'TeamModule',
  donations: 'DonationsModule',
  base: 'BaseModule',
  base_rbac: 'BaseRbacModule',
  base_security: 'BaseSecurityModule',
  base_automation: 'BaseAutomationModule',
  base_customization: 'BaseCustomizationModule',
  base_features_data: 'BaseFeaturesDataModule',
  advanced_features: 'AdvancedFeaturesModule',
};

export async function loadModules(appModule: any) {
  // Dynamic module loading
  const modules = [];
  
  for (const [moduleName, moduleClass] of Object.entries(MODULE_MIGRATION_MAP)) {
    try {
      const moduleImport = await import(`./modules/${moduleName}/${moduleName}.module`);
      modules.push(moduleImport[moduleClass]);
    } catch (error) {
      console.warn(`Failed to load module: ${moduleName}`);
    }
  }
  
  return modules;
}
```

---

## Phase 4: Integration & Testing (Week 5-6)

### Step 4.1: Create Integration Test Suite

**test/integration/auth.e2e.spec.ts**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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
    it('should return tokens for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@lume.dev',
          password: 'admin123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      authToken = response.body.access_token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@lume.dev',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email');
    });

    it('should reject missing token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('Token Refresh', () => {
    it('should return new access token with valid refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@lume.dev',
          password: 'admin123',
        });

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refresh_token: loginResponse.body.refresh_token,
        });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('access_token');
    });
  });
});
```

### Step 4.2: Database Operations Test

**test/integration/database.e2e.spec.ts**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@core/db/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('Database Operations', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  describe('User CRUD Operations', () => {
    it('should create user with hashed password', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'testpassword123', // Should be hashed by middleware
          firstName: 'Test',
          lastName: 'User',
          roleId: 3,
        },
      });

      expect(user.email).toBe('test@example.com');
      // Password should be hashed (starts with $2)
      expect(user.password).toMatch(/^\$2[aby]\$/);
    });

    it('should update user', async () => {
      const user = await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { firstName: 'Updated' },
      });

      expect(user.firstName).toBe('Updated');
    });

    it('should soft delete user', async () => {
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { deletedAt: new Date() },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });

      expect(deletedUser.deletedAt).toBeTruthy();
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });
    await app.close();
  });
});
```

### Step 4.3: Security Test Suite

**test/integration/security.e2e.spec.ts**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Security Tests (e2e)', () => {
  let app: INestApplication;

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

  describe('SQL Injection Prevention', () => {
    it('should sanitize email input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: "admin@lume.dev' OR '1'='1",
          password: 'admin123',
        });

      // Should not return any user
      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should block excessive login attempts', async () => {
      // Make 51+ requests to exceed limit
      for (let i = 0; i < 51; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'admin@lume.dev',
            password: 'wrongpassword',
          });
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@lume.dev',
          password: 'admin123',
        });

      expect(response.status).toBe(429); // Too Many Requests
    });
  });

  describe('Token Tampering Prevention', () => {
    it('should reject modified JWT token', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid';

      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent access to other tenant data', async () => {
      // This test assumes multi-tenant setup
      // Login as tenant 1
      const tenant1Login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@lume.dev',
          password: 'admin123',
        });

      const token1 = tenant1Login.body.access_token;

      // Attempt to access tenant 2 data
      const response = await request(app.getHttpServer())
        .get('/api/users/2') // Try to access different company
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in user input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${global.authToken}`)
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          firstName: '<script>alert("xss")</script>',
          lastName: 'User',
        });

      // firstName should be escaped
      expect(response.body.firstName).not.toContain('<script>');
    });
  });
});
```

---

## Phase 5: Security Hardening & Performance (Week 6-7)

### Step 5.1: Global Exception Filter

**src/core/filters/http-exception.filter.ts**
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let error: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      success: false,
      error: {
        code: status.toString(),
        message,
        ...error,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Step 5.2: Response Interceptor

**src/core/interceptors/transform.interceptor.ts**
```typescript
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
      })),
    );
  }
}
```

### Step 5.3: Performance Monitoring

**src/core/interceptors/performance.interceptor.ts**
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '@core/logger/logger.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        if (duration > 1000) {
          this.logger.warn(
            `Slow request: ${request.method} ${request.url} took ${duration}ms`,
          );
        }
      }),
    );
  }
}
```

### Step 5.4: Add Security Headers & Helmet

**src/main.ts**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { PerformanceInterceptor } from './core/interceptors/performance.interceptor';
import { LoggerService } from './core/logger/logger.service';
import * as helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  // Security
  app.use(helmet());
  app.use(compression());

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new PerformanceInterceptor(app.get(LoggerService)),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Lume NestJS backend running on port ${port}`);
}

bootstrap();
```

---

## Phase 6: Migration Checklist & Verification

### Checklist: Express → NestJS

- [ ] Phase 0: Project setup (infrastructure, config, dependencies)
- [ ] Phase 1: Core services (database, logging, base service)
- [ ] Phase 2: Authentication (JWT, RBAC, guards, decorators)
- [ ] Phase 3a: User module (entity, DTO, service, controller)
- [ ] Phase 3b: RBAC module (roles, permissions)
- [ ] Phase 3c: Remaining 20 modules (activities, audit, editor, website, etc.)
- [ ] Phase 4a: Integration tests (authentication, database, CRM)
- [ ] Phase 4b: API validation tests
- [ ] Phase 4c: Security tests
- [ ] Phase 5a: Exception filters & error handling
- [ ] Phase 5b: Performance & monitoring
- [ ] Phase 5c: Security hardening (rate limiting, headers, validation)
- [ ] Database migration & verification
- [ ] Performance testing & optimization
- [ ] Security audit & pen testing
- [ ] Load testing (15% improvement target)
- [ ] User acceptance testing (UAT)
- [ ] Production deployment

---

## Success Criteria

- **Performance**: 12-19% improvement over Express (target P95 <850ms @ 500 RPS)
- **Compatibility**: 100% API backward compatibility (156 endpoints)
- **Security**: 0 critical vulnerabilities, all 40+ security controls implemented
- **Testing**: 512+ test cases with 100% pass rate
- **Uptime**: 99.9% during A/B testing phase
- **Migration**: 8-week timeline, all 22 modules migrated, zero data loss

---

## Migration Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | 0-1 | Project setup, core services, database layer |
| 2 | 2 | Authentication, JWT, RBAC, guards |
| 3 | 3a | User module, RBAC module |
| 4 | 3b-3c | Remaining modules (20 modules) |
| 5 | 4a-4b | Integration & validation tests |
| 6 | 4c, 5a | Security tests, error handling |
| 7 | 5b-5c | Performance, monitoring, hardening |
| 8 | Deploy | A/B testing, gradual rollout, production go-live |

---

## Next Steps

1. **Week 1 Start**: Initialize NestJS project and install dependencies
2. **Team Training**: Conduct NestJS fundamentals workshop
3. **Parallel Development**: Begin module migration while maintaining Express API
4. **Daily Standups**: Track progress against milestones
5. **Continuous Testing**: Run integration tests after each module
6. **Performance Baseline**: Establish metrics for comparison

---

**Document Version**: 1.0  
**Last Updated**: April 22, 2026  
**Status**: Ready for Implementation
