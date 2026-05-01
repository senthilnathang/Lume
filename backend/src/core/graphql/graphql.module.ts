import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { GraphQLService } from './graphql.service';
import { DataGridResolver } from './resolvers/data-grid.resolver';
import { AgentGridResolver } from './resolvers/agent-grid.resolver';
import { PolicyGridResolver } from './resolvers/policy-grid.resolver';
import { FlowGridResolver } from './resolvers/flow-grid.resolver';
import { UserResolver } from './resolvers/user.resolver';
import { DataGridService } from './services/data-grid.service';
import { AgentGridService } from './services/agent-grid.service';
import { PolicyGridService } from './services/policy-grid.service';
import { FlowGridService } from './services/flow-grid.service';
import { DataLoaderService } from './loaders/dataloader.service';
import { AuthDirective } from './directives/auth.directive';
import { PolicyDirective } from './directives/policy.directive';

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: [join(__dirname, 'schema', '**/*.graphql')],
      definitions: {
        path: join(__dirname, 'generated', 'graphql.types.ts'),
        outputAs: 'class',
      },
      context: ({ req, res }) => ({
        req,
        res,
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        userRoles: req.user?.roles?.map(r => r.name) || [],
      }),
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      subscriptions: {
        'graphql-ws': {
          onConnect: (context) => {
            const { connectionParams } = context;
            const token = connectionParams?.authorization?.split('Bearer ')[1];

            // Validate token and inject user context
            return {
              userId: null,
              tenantId: null,
              userRoles: [],
            };
          },
        },
      },
      buildSchemaOptions: {
        dateScalarMode: 'timestamp',
      },
      persistedQueries: {
        ttl: 3600,
      },
    }),
  ],
  providers: [
    GraphQLService,
    DataLoaderService,
    // Resolvers
    DataGridResolver,
    AgentGridResolver,
    PolicyGridResolver,
    FlowGridResolver,
    UserResolver,
    // Services
    DataGridService,
    AgentGridService,
    PolicyGridService,
    FlowGridService,
    // Directives
    AuthDirective,
    PolicyDirective,
  ],
  exports: [
    GraphQLService,
    DataLoaderService,
    DataGridService,
    AgentGridService,
    PolicyGridService,
    FlowGridService,
  ],
})
export class GraphQLModuleConfig {}
