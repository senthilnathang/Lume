import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { GraphQLContextFactory } from './graphql.context';

export function createGraphQLConfig(
  contextFactory: GraphQLContextFactory,
  env: string,
  plugins: ApolloServerPlugin[] = [],
): ApolloDriverConfig {
  return {
    driver: ApolloDriver,
    autoSchemaFile: true,
    sortSchema: true,
    context: (ctx) => contextFactory.createContext(ctx),
    playground: env !== 'production',
    introspection: env !== 'production',
    formatError: (
      formattedError: GraphQLFormattedError,
      error: unknown,
    ): GraphQLFormattedError => {
      // Strip internal stack traces in production
      if (env === 'production') {
        const { extensions, message } = formattedError;
        return {
          message,
          extensions: {
            code: extensions?.code || 'INTERNAL_SERVER_ERROR',
          },
        };
      }
      return formattedError;
    },
    subscriptions: {
      'graphql-ws': {
        path: '/api/v2/graphql',
        onConnect: (ctx: any) => {
          // Extract JWT from connection_params for WebSocket auth
          const token = ctx.connectionParams?.authorization;
          if (!token && env === 'production') {
            throw new Error('Unauthorized');
          }
        },
      },
    },
    plugins,
  };
}
