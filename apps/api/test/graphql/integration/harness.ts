import { FlowRunsController } from '../../../src/modules/base_automation/controllers/flow-runs.controller';
import { BaseRbacController } from '../../../src/modules/base_rbac/controllers/base-rbac.controller';
import { BaseRbacService } from '../../../src/modules/base_rbac/services/base-rbac.service';
import { AccountController } from '../../../src/modules/auth/controllers/account.controller';
import { SettingsService } from '../../../src/modules/settings/services/settings.service';
import { ValidationPipe } from '@nestjs/common';
import { AuditService } from '../../../src/modules/audit/services/audit.service';
import { TenantRegistryService } from '../../../src/core/services/tenant-registry.service';
import { TenantResolver } from '../../../src/graphql/grids/enterprise-grid/resolvers/tenant.resolver';
import { AuditController } from '../../../src/modules/audit/controllers/audit.controller';
import { AuditLogResolver } from '../../../src/graphql/grids/enterprise-grid/resolvers/audit-log.resolver';
import { SettingsController } from '../../../src/modules/settings/controllers/settings.controller';
import { SystemSettingResolver } from '../../../src/graphql/grids/meta-grid/resolvers/system-setting.resolver';
import { FlowRunsService } from '../../../src/modules/base_automation/services/flow-runs.service';
import { WorkflowSchedulesController } from '../../../src/modules/base_automation/controllers/workflow-schedules.controller';
import { WorkflowSchedulesService } from '../../../src/modules/base_automation/services/workflow-schedules.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { WorkflowStateController } from '../../../src/modules/base_automation/controllers/workflow-state.controller';
import { WorkflowStateEngineService } from '../../../src/modules/base_automation/services/workflow-state-engine.service';
import { AutomationController } from '../../../src/modules/base_automation/controllers/automation.controller';
import { AutomationService } from '../../../src/modules/base_automation/services/automation.service';
import { SearchController } from '../../../src/modules/base/controllers/search.controller';
import { SearchService } from '../../../src/modules/base/services/search.service';
import { SecurityService } from '../../../src/modules/base/services/security.service';
// Real Nest/Apollo/Passport/services and Prisma against a uniquely named disposable MySQL database.
// Only databases created by this helper are dropped. No application database is reset or migrated.
import 'reflect-metadata';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { RollupEngineService } from '../../../src/modules/base_automation/services/rollup-engine.service';
import { PubSub } from 'graphql-subscriptions';
import request from 'supertest';
import { PrismaService } from '../../../src/core/services/prisma.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { RbacService } from '../../../src/core/services/rbac.service';
import { JwtStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { EntityService } from '../../../src/modules/base/services/entity.service';
import { RecordService } from '../../../src/modules/base/services/record.service';
import { EntityRecordsController } from '../../../src/modules/base/controllers/entity-records.controller';
import { RelationshipService } from '../../../src/modules/base/services/relationship.service';
import { ApprovalChainEngineService } from '../../../src/modules/base_automation/services/approval-chain-engine.service';
import { ApprovalRequestsController } from '../../../src/modules/base_automation/controllers/approval-requests.controller';
import { ApprovalTriggerService } from '../../../src/modules/base_automation/services/approval-trigger.service';
import { AdvancedFeaturesService } from '../../../src/modules/advanced_features/services/advanced-features.service';
import { AdvancedFeaturesController } from '../../../src/modules/advanced_features/controllers/advanced-features.controller';
import { FormulaService } from '../../../src/modules/base/services/formula.service';
import { FieldPermissionService } from '../../../src/modules/base/services/field-permission.service';
import { RoleManagementService } from '../../../src/modules/base/services/role-management.service';
import { RecordRuleManagementService } from '../../../src/modules/base/services/record-rule-management.service';
import { RecordRuleResolver } from '../../../src/graphql/grids/policy-grid/resolvers/record-rule.resolver';
import { EntityResolver } from '../../../src/graphql/grids/data-grid/resolvers/entity.resolver';
import { EntityRecordResolver } from '../../../src/graphql/grids/data-grid/resolvers/entity-record.resolver';
import { RoleResolver } from '../../../src/graphql/grids/policy-grid/resolvers/role.resolver';
import { PermissionResolver } from '../../../src/graphql/grids/policy-grid/resolvers/permission.resolver';
import { FieldPermissionResolver } from '../../../src/graphql/grids/policy-grid/resolvers/field-permission.resolver';
import { FlowSubscriptionResolver } from '../../../src/graphql/grids/flow-grid/resolvers/flow-subscription.resolver';
import { GraphQLContextFactory } from '../../../src/graphql/graphql.context';
import { createGraphQLConfig } from '../../../src/graphql/graphql.config';
import { ComplexityPlugin } from '../../../src/graphql/plugins/complexity.plugin';
import { LoggingPlugin } from '../../../src/graphql/plugins/logging.plugin';
import { SequenceResolver } from '../../../src/graphql/grids/meta-grid/resolvers/sequence.resolver';
import { AdminSettingsService } from '../../../src/modules/base/services/admin-settings.service';

export async function createHarness(options: { rollups?: boolean; approvals?: boolean; sequences?: boolean; schedules?: boolean; frameworkSettings?: boolean; auditQueries?: boolean; tenants?: boolean } = {}) {
  config({ quiet: true });
  const url = new URL(process.env.GRAPHQL_TEST_DATABASE_URL || process.env.DATABASE_URL!);
  const database = `lume_gql_test_${randomUUID().replaceAll('-', '')}`;
  const configDb = { host: url.hostname, port: Number(url.port) || 3306, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), connectTimeout: 5000 };
  const admin = await mysql.createConnection(configDb);
  let created = false, prisma: any, pool: any, app: any;
  const previousSecret = process.env.JWT_SECRET;
  const secret = randomUUID();
  process.env.JWT_SECRET = secret;
  const queries: string[] = [];
  const settings = { slowQueries: false };
  const pubsub = new PubSub();
  async function close() {
    await app?.close();
    await prisma?.$disconnect();
    await pool?.end();
    if (created && /^lume_gql_test_[a-f0-9]{32}$/.test(database)) await admin.query(`DROP DATABASE \`${database}\``);
    await admin.end();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
  try {
    await admin.query(`CREATE DATABASE \`${database}\``);
    created = true;
    url.pathname = `/${database}`;
    execFileSync(resolve('node_modules/.bin/prisma'), ['db', 'push', '--schema', resolve('prisma/schema.prisma'), '--skip-generate'], {
      env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'pipe', timeout: 60000,
    });
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [{ emit: 'event', level: 'query' }] });
    prisma.$on('query', (event: any) => queries.push(event.query));
    await prisma.$connect();
    prisma.$use(async (params: any, next: any) => {
      if (settings.slowQueries && params.model === 'Entity' && params.action === 'findMany') await prisma.$queryRawUnsafe('SELECT SLEEP(0.6)');
      return next(params);
    });
    pool = mysql.createPool({ ...configDb, database });
    const dbService = { getDrizzle: () => drizzle(pool) };
    const context = new GraphQLContextFactory(prisma, dbService as any);
    const module = await Test.createTestingModule({
      imports: [...(options.rollups || options.approvals ? [EventEmitterModule.forRoot()] : []), PassportModule, GraphQLModule.forRoot({ ...createGraphQLConfig(context, 'test', [new ComplexityPlugin(), new LoggingPlugin()]), driver: ApolloDriver })],
      providers: [
        ...(options.tenants ? [TenantRegistryService, TenantResolver] : []),
        ...(options.auditQueries ? [AuditService, AuditLogResolver] : []),
        ...(options.frameworkSettings ? [SettingsService, SystemSettingResolver] : []),
        BaseRbacService,
        ...(options.schedules ? [WorkflowSchedulesService, MetadataRegistryService] : []),
        FlowRunsService, SearchService, SecurityService, AutomationService, WorkflowStateEngineService,
        ...(options.sequences ? [SequenceResolver, AdminSettingsService] : []),
        RelationshipService, ApprovalChainEngineService, AdvancedFeaturesService,
        EntityResolver, EntityRecordResolver, RoleResolver, PermissionResolver, FieldPermissionResolver, FlowSubscriptionResolver, RecordRuleResolver, RecordRuleManagementService,
        EntityService, RecordService, FormulaService, FieldPermissionService, RoleManagementService, RbacService, JwtStrategy,
        { provide: PrismaService, useValue: prisma }, { provide: DrizzleService, useValue: dbService },
        ...(options.rollups ? [RollupEngineService] : []),
        ...(options.approvals ? [ApprovalTriggerService] : []),
        ...(!options.rollups && !options.approvals ? [{ provide: EventEmitter2, useValue: new EventEmitter2() }] : []), { provide: 'PubSub', useValue: pubsub },
      ],
      controllers: [...(options.auditQueries ? [AuditController] : []), ...(options.frameworkSettings ? [SettingsController] : []), BaseRbacController, AccountController, FlowRunsController, ...(options.schedules ? [WorkflowSchedulesController] : []), WorkflowStateController, AutomationController, SearchController, EntityRecordsController, ApprovalRequestsController, AdvancedFeaturesController],
    }).compile();
    app = module.createNestApplication();
    if (options.auditQueries || options.tenants) app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(0, '127.0.0.1');
    const jwt = new JwtService({ secret });
    const token = (role = 'admin', company: number | null = 1, expiresIn = 60) => jwt.sign({ sub: role === 'admin' ? 1 : role === 'member' ? 2 : 3, email: `${role}@test.local`, role_id: role === 'admin' ? 1 : role === 'member' ? 2 : 3, role_name: role, ...(company == null ? {} : { company_id: company }) }, { expiresIn });
    const query = async (query: string, bearer: string | null = token(), variables?: any, tenant?: string) => {
      let req = request(app.getHttpServer()).post('/api/v2/graphql');
      if (bearer) req = req.auth(bearer, { type: 'bearer' });
      if (tenant != null) req = req.set('x-org-id', tenant);
      return req.send({ query, variables });
    };
    async function seed() {
      await prisma.entityFieldPermission.deleteMany();
      await prisma.entityRecord.deleteMany();
      await prisma.entityField.deleteMany();
      await prisma.entity.deleteMany();
      await prisma.rolePermission.deleteMany();
      await prisma.permission.deleteMany();
      await prisma.user.deleteMany();
      await prisma.role.deleteMany();
      for (const [index, role] of ['admin', 'member', 'none'].entries()) {
        await prisma.role.create({ data: { id: index + 1, name: role, display_name: role } });
        await prisma.user.create({ data: { id: index + 1, role_id: index + 1, email: `${role}@test.local`, password: 'test-only', firstName: role, lastName: 'Test' } });
      }
      for (const name of ['base.entities.read', 'base.entity_records.read', 'base.entity_records.create', 'base.entity_records.update']) {
        const permission = await prisma.permission.create({ data: { name, display_name: name } });
        await prisma.rolePermission.create({ data: { roleId: 2, permissionId: permission.id } });
      }
      await prisma.entity.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ id: i + 1, name: `entity_${i + 1}`, label: `Entity ${i + 1}`, createdBy: 1 })) });
      await prisma.entityField.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ id: i + 1, entityId: i + 1, name: 'name', slug: 'name', label: 'Name', type: 'string', required: true })) });
      for (const [i, name] of ['secret', 'readonly', 'masked'].entries()) {
        await prisma.entityField.create({ data: { id: 200 + i, entityId: 1, name, slug: name, label: name, type: 'string' } });
        await prisma.entityFieldPermission.create({ data: { fieldId: 200 + i, roleId: 2, canRead: name !== 'secret', canWrite: name !== 'readonly', isMasked: name === 'masked' } });
      }
      for (let id = 1; id <= 4; id++) await prisma.entityRecord.create({ data: { id, entityId: 1, companyId: id === 4 ? 2 : 1, createdBy: 1, data: JSON.stringify({ name: `Record ${id}`, secret: 'hidden', readonly: 'fixed', masked: '1234' }) } });
      queries.length = 0;
    }
    await seed();
    return { app, prisma, pubsub, queries, settings, token, query, seed, close, wsUrl: (await app.getUrl()).replace('http:', 'ws:') + '/api/v2/graphql' };
  } catch (error) { await close(); throw error; }
}
export type Harness = Awaited<ReturnType<typeof createHarness>>;
