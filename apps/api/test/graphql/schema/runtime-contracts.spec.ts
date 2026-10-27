import { GraphQLModule } from '@nestjs/graphql';
import { createGraphQLConfig } from '../../../src/graphql/graphql.config';
import type { GraphQLContextFactory } from '../../../src/graphql/graphql.context';
import { PubSub } from 'graphql-subscriptions';
import { ContentGridModule } from '../../../src/graphql/grids/content-grid/content-grid.module';
import { FlowGridModule } from '../../../src/graphql/grids/flow-grid/flow-grid.module';
import { EnterpriseGridModule } from '../../../src/graphql/grids/enterprise-grid/enterprise-grid.module';
import { FlowSubscriptionResolver } from '../../../src/graphql/grids/flow-grid/resolvers/flow-subscription.resolver';
import { PageResolver } from '../../../src/graphql/grids/content-grid/resolvers/page.resolver';
import { AuditLogResolver } from '../../../src/graphql/grids/enterprise-grid/resolvers/audit-log.resolver';
import { GqlJwtGuard, GqlRbacGuard } from '../../../src/graphql/guards';
import { SUBSCRIPTION_OPTIONS_METADATA } from '@nestjs/graphql/dist/graphql.constants';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory, Resolver, Query } from '@nestjs/graphql';
import { ApolloServer } from '@apollo/server';
import { graphql, parseValue, GraphQLSchema } from 'graphql';
import { JSONScalar } from '../../../src/graphql/scalars/json.scalar';
import { DateTimeScalar } from '../../../src/graphql/scalars/date-time.scalar';
import { Paginated } from '../../../src/graphql/shared/types/paginated.type';
import { PageType } from '../../../src/graphql/grids/content-grid/types/page.type';
import { FlowType } from '../../../src/graphql/grids/flow-grid/types/flow.type';
import { LoggingPlugin } from '../../../src/graphql/plugins/logging.plugin';
import { TracingPlugin } from '../../../src/graphql/plugins/tracing.plugin';
import { ComplexityPlugin } from '../../../src/graphql/plugins/complexity.plugin';
import { PrismaService } from '../../../src/core/services/prisma.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';
import { AuthService } from '../../../src/core/services/jwt.service';

@Resolver()
class ContractResolver {
  @Query(() => Paginated(PageType))
  pages() { return { items: [{ id: '1', title: 'Page', content: { valid: true } }], total: 1 }; }

  @Query(() => Paginated(FlowType))
  flows() { return { items: [], total: 0 }; }
}

describe('GraphQL runtime contracts', () => {
  it('preserves JSON values rather than stringifying objects or parsing strings', () => {
    const scalar = new JSONScalar();
    const value = { enabled: true, nested: { values: [1, null, 'two'] } };
    expect(scalar.serialize(value)).toEqual(value);
    expect(scalar.parseValue(value)).toEqual(value);
    expect(scalar.parseValue('ordinary string')).toBe('ordinary string');
    expect(scalar.parseLiteral(parseValue('{enabled: true, values: [1, null, "two"]}')))
      .toEqual({ enabled: true, values: [1, null, 'two'] });
    expect(scalar.parseLiteral(parseValue('$payload'), { payload: value })).toEqual(value);
  });

  it('converts DateTime inputs to Dates and serializes ISO output', () => {
    const scalar = new DateTimeScalar();
    const value = '2026-10-21T10:00:00.000Z';
    expect(scalar.parseValue(value)).toEqual(new Date(value));
    expect(scalar.parseLiteral(parseValue('"' + value + '"'))).toEqual(new Date(value));
    expect(scalar.serialize(new Date(value))).toBe(value);
  });

  it('reuses pagination types for the same model and separates different models', () => {
    expect(Paginated(PageType)).toBe(Paginated(PageType));
    expect(Paginated(PageType)).not.toBe(Paginated(FlowType));
  });

  it('builds and executes a schema with multiple paginated Node types', async () => {
    const module = await Test.createTestingModule({ imports: [GraphQLSchemaBuilderModule] }).compile();
    try {
      const schema = await module.get(GraphQLSchemaFactory).create([ContractResolver]);
      expect(schema).toBeInstanceOf(GraphQLSchema);
      const result = await graphql({
        schema,
        source: '{ pages { items { id title content } total } flows { items { id name } total } }',
        rootValue: {
          pages: () => ({ items: [{ id: '1', title: 'Page', content: { valid: true } }], total: 1 }),
          flows: () => ({ items: [], total: 0 }),
        },
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ pages: { items: [{ id: '1', title: 'Page', content: { valid: true } }], total: 1 }, flows: { items: [], total: 0 } });
    } finally { await module.close(); }
  });

  it('runs plugin callbacks through Apollo request lifecycle on success and errors', async () => {
    const plugins = [new LoggingPlugin(), new TracingPlugin(), new ComplexityPlugin()];
    const operationSpies = plugins.map(plugin => jest.spyOn(plugin, 'didResolveOperation'));
    const responseSpies = plugins.map(plugin => jest.spyOn(plugin, 'willSendResponse'));
    const errorSpy = jest.spyOn(plugins[1], 'didEncounterErrors');
    const server = new ApolloServer({
      typeDefs: 'type Query { value: String! fail: String! }',
      resolvers: { Query: { value: () => 'ok', fail: () => { throw new Error('test failure'); } } },
      plugins,
    });
    try {
      const result = await server.executeOperation({ query: '{ value }' });
      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') expect(result.body.singleResult.data).toEqual({ value: 'ok' });
      await server.executeOperation({ query: '{ fail }' });
      for (const spy of [...operationSpies, ...responseSpies]) expect(spy).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    } finally { await server.stop(); }
  });
});

describe('Subscription runtime wiring', () => {
  it('shares a working event bus across the content, flow and enterprise grids', async () => {
    const module = await Test.createTestingModule({ imports: [ContentGridModule, FlowGridModule, EnterpriseGridModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(DrizzleService).useValue({})
      .overrideProvider(AuthService).useValue({})
      .overrideGuard(GqlJwtGuard).useValue({ canActivate: () => true })
      .overrideGuard(GqlRbacGuard).useValue({ canActivate: () => true })
      .compile();
    const bus = module.get<PubSub>('PubSub');
    const subscriptions = [
      [module.get(FlowSubscriptionResolver).flowExecuted(), 'flowExecuted'],
      [module.get(PageResolver).pagePublished(1), 'PAGE_PUBLISHED'],
      [module.get(AuditLogResolver).auditLogCreated(undefined, 1), 'AUDIT_LOG_CREATED'],
    ] as const;
    try {
      for (const [iterator, event] of subscriptions) {
        const next = iterator.next();
        await bus.publish(event, { companyId: 1, event });
        await expect(next).resolves.toEqual({ value: { companyId: 1, event }, done: false });
      }
    } finally {
      for (const [iterator] of subscriptions) await iterator.return?.();
      await module.close();
    }
  });

  it.each([
    [PageResolver.prototype.pagePublished, 'pagePublished'],
    [AuditLogResolver.prototype.auditLogCreated, 'auditLogCreated'],
  ] as const)('isolates content/audit event payloads by tenant', async (handler, key) => {
    const { filter } = Reflect.getMetadata(SUBSCRIPTION_OPTIONS_METADATA, handler);
    expect(await filter({ [key]: { companyId: 1 } }, {}, { canReceiveTenantEvent: async id => id === 1 })).toBe(true);
    expect(await filter({ [key]: { companyId: 2 } }, {}, { canReceiveTenantEvent: async id => id === 1 })).toBe(false);
    expect(await filter({ [key]: {} }, {}, {})).toBe(false);
    expect(await filter({ [key]: { companyId: 1 } }, {}, { user: null })).toBe(false);
  });
});

describe('GraphQL HTTP endpoint', () => {
  it('serves the documented endpoint even when the REST prefix is set', async () => {
    const contextFactory = { createContext: ({ req }) => ({ req }) } as GraphQLContextFactory;
    const config = createGraphQLConfig(contextFactory, 'test');
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot(config)],
      providers: [ContractResolver],
    }).compile();
    const app = module.createNestApplication();
    app.setGlobalPrefix('api/v2');
    try {
      await app.listen(0, '127.0.0.1');
      const response = await fetch((await app.getUrl()) + '/api/v2/graphql', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ pages { items { id title content } total } }' }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { pages: { items: [{ id: '1', title: 'Page', content: { valid: true } }], total: 1 } } });
    } finally { await app.close(); }
  });
});
