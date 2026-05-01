import { ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

/**
 * GraphQL Configuration Factory
 * Provides Apollo Server configuration based on environment
 */
export function getGraphQLConfig(): ApolloDriverConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Schema configuration
    typePaths: [join(__dirname, '../schema', '**/*.graphql')],
    definitions: {
      path: join(__dirname, '../generated', 'graphql.types.ts'),
      outputAs: 'class',
      skipResolverArgs: false,
    },

    // Context configuration
    context: async ({ req, res }) => ({
      req,
      res,
      userId: req?.user?.id,
      tenantId: req?.user?.tenantId,
      userRoles: req?.user?.roles?.map((r: any) => r.name) || [],
      requestId: req?.id || generateRequestId(),
    }),

    // Apollo server settings
    playground: !isProduction,
    introspection: !isProduction,
    debug: isDevelopment,

    // HTTP settings
    bodyParserConfig: {
      limit: '10mb',
    },

    // Subscriptions
    subscriptions: {
      'graphql-ws': {
        onConnect: (context: any) => {
          const { connectionParams } = context;
          const token = connectionParams?.authorization?.split('Bearer ')[1];

          return {
            userId: connectionParams?.userId,
            tenantId: connectionParams?.tenantId,
            userRoles: connectionParams?.roles || [],
            token,
          };
        },
        onDisconnect: (context: any) => {
          // Cleanup subscription
        },
      },
    },

    // Caching
    persistedQueries: {
      ttl: 3600, // 1 hour
    },

    // Error formatting
    formatError: (error: any) => {
      // Don't leak internal error details in production
      if (isProduction && !error.extensions?.code) {
        return {
          message: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        };
      }

      return {
        message: error.message,
        code: error.extensions?.code || 'GRAPHQL_ERROR',
        path: isDevelopment ? error.path : undefined,
        extensions: isDevelopment ? error.extensions : undefined,
      };
    },

    // Gateway (for federation, if needed in future)
    gateway: undefined,

    // Schema directives
    schemaDirectiveVisitorMap: {
      auth: undefined, // Loaded from module
      policy: undefined, // Loaded from module
      cache: undefined, // Loaded from module
    },

    // Plugin configuration
    plugins: [],

    // Query limits
    ...(isProduction && {
      maxQueryDepth: 10,
      maxQueryComplexity: 1000,
      maxTokens: 10000,
    }),
  };
}

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate GraphQL environment variables
 */
export function validateGraphQLConfig(): void {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for GraphQL: ${missing.join(', ')}`,
    );
  }
}

/**
 * GraphQL environment configuration
 */
export const graphqlEnv = {
  // Query complexity
  MAX_QUERY_COMPLEXITY: parseInt(process.env.MAX_QUERY_COMPLEXITY || '1000', 10),
  MAX_QUERY_DEPTH: parseInt(process.env.MAX_QUERY_DEPTH || '10', 10),

  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // per minute

  // Mutation limits
  MUTATION_RATE_LIMIT: parseInt(process.env.MUTATION_RATE_LIMIT || '50', 10),

  // DataLoader settings
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '100', 10),

  // Caching
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
  CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',

  // Subscriptions
  SUBSCRIPTIONS_ENABLED: process.env.SUBSCRIPTIONS_ENABLED !== 'false',
  SUBSCRIPTION_TIMEOUT: parseInt(process.env.SUBSCRIPTION_TIMEOUT || '3600000', 10), // 1 hour

  // Performance
  POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  QUERY_TIMEOUT: parseInt(process.env.QUERY_TIMEOUT || '30000', 10), // 30 seconds

  // Features
  ENABLE_INTROSPECTION: process.env.ENABLE_INTROSPECTION !== 'false',
  ENABLE_PLAYGROUND: process.env.ENABLE_PLAYGROUND !== 'false',
  ENABLE_TRACING: process.env.ENABLE_TRACING !== 'false',

  // Semantics & AI
  ENABLE_SEMANTIC_QUERIES: process.env.ENABLE_SEMANTIC_QUERIES === 'true',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
