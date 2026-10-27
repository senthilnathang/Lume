import { HttpException } from '@nestjs/common';
import { unwrapResolverError } from '@apollo/server/errors';
import { JwtService } from '@nestjs/jwt';
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
    path: '/api/v2/graphql',
    autoSchemaFile: true,
    sortSchema: true,
    context: (ctx) => contextFactory.createContext({ req: ctx.req || ctx.extra?.request }),
    playground: env !== 'production',
    introspection: env !== 'production',
    formatError: (
      formattedError: GraphQLFormattedError,
      error: unknown,
    ): GraphQLFormattedError => {
      const exception = unwrapResolverError(error as Error);
      if (exception instanceof HttpException) {
        const codes = { 400: 'BAD_REQUEST', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'TOO_MANY_REQUESTS', 501: 'NOT_IMPLEMENTED' };
        formattedError = { ...formattedError, extensions: { ...formattedError.extensions, code: codes[exception.getStatus()] || 'INTERNAL_SERVER_ERROR' } };
      }
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
        onConnect: async (ctx: any) => {
          const authorization = ctx.connectionParams?.authorization;
          if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
          try {
            await new JwtService({ secret: process.env.JWT_SECRET }).verifyAsync(authorization.slice(7));
          } catch { return false; }
          ctx.extra.request.headers.authorization = authorization;
          if (ctx.connectionParams?.['x-org-id'] != null) ctx.extra.request.headers['x-org-id'] = ctx.connectionParams['x-org-id'];
        },
      },
    },
    plugins,
  };
}
