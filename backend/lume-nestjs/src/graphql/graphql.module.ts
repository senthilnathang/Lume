import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { ApolloDriver } from '@nestjs/apollo';
import { PrismaService } from '../core/services/prisma.service';
import { DrizzleService } from '../core/services/drizzle.service';
import { ScalarsModule } from './scalars/scalars.module';
import { GraphQLGuardsModule } from './guards/guards.module';
import { DataGridModule } from './grids/data-grid/data-grid.module';
import { PolicyGridModule } from './grids/policy-grid/policy-grid.module';
import { FlowGridModule } from './grids/flow-grid/flow-grid.module';
import { AgentGridModule } from './grids/agent-grid/agent-grid.module';
import { PluginsModule } from './plugins/plugins.module';
import { TracingPlugin } from './plugins/tracing.plugin';
import { ComplexityPlugin } from './plugins/complexity.plugin';
import { LoggingPlugin } from './plugins/logging.plugin';
import { GraphQLContextFactory } from './graphql.context';
import { createGraphQLConfig } from './graphql.config';

@Module({
  imports: [
    ScalarsModule,
    GraphQLGuardsModule,
    DataGridModule,
    PolicyGridModule,
    FlowGridModule,
    AgentGridModule,
    PluginsModule,
    GraphQLModule.forRootAsync<any>({
      driver: ApolloDriver,
      imports: [ScalarsModule, PluginsModule],
      inject: [
        ConfigService,
        PrismaService,
        DrizzleService,
        TracingPlugin,
        ComplexityPlugin,
        LoggingPlugin,
      ],
      useFactory: (
        configService: ConfigService,
        prismaService: PrismaService,
        drizzleService: DrizzleService,
        tracingPlugin: TracingPlugin,
        complexityPlugin: ComplexityPlugin,
        loggingPlugin: LoggingPlugin,
      ) => {
        const contextFactory = new GraphQLContextFactory(
          prismaService,
          drizzleService,
        );
        return createGraphQLConfig(
          contextFactory,
          configService.get('NODE_ENV') || 'development',
          [tracingPlugin, complexityPlugin, loggingPlugin],
        );
      },
    }),
  ],
  providers: [GraphQLContextFactory],
  exports: [GraphQLContextFactory],
})
export class GraphQLCoreModule {}
