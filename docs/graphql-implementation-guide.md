# GraphQL Implementation Guide for Lume Framework

**Version:** 1.0  
**Status:** Implementation Instructions  
**Last Updated:** May 2026

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Project Structure](#project-structure)
3. [Configuration](#configuration)
4. [Module Integration](#module-integration)
5. [Running the GraphQL API](#running-the-graphql-api)
6. [Debugging](#debugging)
7. [Troubleshooting](#troubleshooting)

---

## Setup & Installation

### Step 1: Install Dependencies

```bash
cd /opt/Lume/backend

# Install GraphQL and Apollo dependencies
npm install @nestjs/graphql @apollo/server @nestjs/apollo graphql dataloader

# Install type generation
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript

# Install query complexity analysis
npm install graphql-query-complexity
```

### Step 2: Add to package.json Scripts

```json
{
  "scripts": {
    "graphql:generate": "graphql-codegen --config codegen.ts",
    "graphql:validate": "graphql-schema-linter schema/*.graphql",
    "graphql:playground": "apollo-server",
    "test:graphql": "jest --testPathPattern=graphql"
  }
}
```

### Step 3: Update tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["ES2020"],
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## Project Structure

### Directory Layout

```
backend/src/
├── core/
│   └── graphql/
│       ├── graphql.module.ts            // Main GraphQL module
│       ├── graphql.service.ts           // Core service
│       ├── schema/
│       │   ├── base.schema.graphql      // Shared types
│       │   ├── data-grid.schema.graphql
│       │   ├── agent-grid.schema.graphql
│       │   ├── policy-grid.schema.graphql
│       │   └── flow-grid.schema.graphql
│       ├── resolvers/
│       │   ├── data-grid.resolver.ts
│       │   ├── agent-grid.resolver.ts
│       │   ├── policy-grid.resolver.ts
│       │   ├── flow-grid.resolver.ts
│       │   └── user.resolver.ts
│       ├── services/
│       │   ├── data-grid.service.ts
│       │   ├── agent-grid.service.ts
│       │   ├── policy-grid.service.ts
│       │   └── flow-grid.service.ts
│       ├── loaders/
│       │   └── dataloader.service.ts
│       ├── directives/
│       │   ├── auth.directive.ts
│       │   └── policy.directive.ts
│       └── generated/
│           └── graphql.types.ts         // Auto-generated types
```

---

## Configuration

### Step 1: Create GraphQL Configuration File

```typescript
// backend/src/core/graphql/graphql.config.ts
import { GraphQLModuleOptions } from '@nestjs/graphql';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

export const graphqlConfig = (): ApolloDriverConfig => ({
  // Schema files
  typePaths: [join(__dirname, 'schema', '**/*.graphql')],

  // Generated types
  definitions: {
    path: join(__dirname, 'generated', 'graphql.types.ts'),
    outputAs: 'class',
  },

  // Apollo settings
  playground: process.env.NODE_ENV !== 'production',
  introspection: process.env.NODE_ENV !== 'production',
  debug: process.env.DEBUG === 'true',

  // Context factory
  context: async ({ req, res, payload }) => ({
    req,
    res,
    userId: req?.user?.id,
    tenantId: req?.user?.tenantId,
    userRoles: req?.user?.roles?.map(r => r.name) || [],
  }),

  // Subscriptions
  subscriptions: {
    'graphql-ws': {
      onConnect: (context: any) => ({
        userId: context.connectionParams?.userId,
        tenantId: context.connectionParams?.tenantId,
        userRoles: context.connectionParams?.roles || [],
      }),
    },
  },

  // Performance
  persistedQueries: {
    ttl: 3600,
  },

  // Error handling
  formatError: (error: any) => ({
    message: error.message,
    code: error.extensions?.code,
    path: error.path,
  }),
});
```

### Step 2: Update app.module.ts

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLModuleConfig } from './core/graphql/graphql.module';
import { graphqlConfig } from './core/graphql/graphql.config';

@Module({
  imports: [
    NestGraphQLModule.forRoot(
      ApolloDriver,
      graphqlConfig(),
    ),
    GraphQLModuleConfig,
    // Other modules...
  ],
})
export class AppModule {}
```

### Step 3: Configure Code Generation

```typescript
// backend/codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/core/graphql/schema/**/*.graphql',
  generates: {
    './src/core/graphql/generated/graphql.types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        contextType: 'GraphQLContext',
        mappers: {
          User: '../db/prisma#User',
          Role: '../db/prisma#Role',
          Permission: '../db/prisma#Permission',
        },
      },
    },
    './schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
  },
};

export default config;
```

---

## Module Integration

### Step 1: Register GraphQL Module with NestJS

```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for GraphQL
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  await app.listen(3000);
  console.log('🚀 Server running on http://localhost:3000/graphql');
}

bootstrap();
```

### Step 2: Add Authentication Middleware

```typescript
// backend/src/core/graphql/middleware/auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface User {
      id: string;
      tenantId: string;
      roles: Array<{ name: string }>;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (token) {
      try {
        const decoded = verify(token, process.env.JWT_SECRET!) as any;
        req.user = {
          id: decoded.sub,
          tenantId: decoded.tenantId,
          roles: decoded.roles,
        };
      } catch (error) {
        // Token invalid, continue without user
      }
    }

    next();
  }
}
```

### Step 3: Register Middleware in App Module

```typescript
// backend/src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from './core/graphql/middleware/auth.middleware';

@Module({
  // ... imports, providers
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('graphql', 'api');
  }
}
```

---

## Running the GraphQL API

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# GraphQL Playground available at:
# http://localhost:3000/graphql

# Access GraphQL schema:
# http://localhost:3000/graphql?query={__schema{types{name}}}
```

### Generate TypeScript Types

```bash
# Generate types from GraphQL schema
npm run graphql:generate

# This creates:
# - src/core/graphql/generated/graphql.types.ts
# - schema.graphql (merged schema)
```

### Validate Schema

```bash
# Validate GraphQL schema files
npm run graphql:validate

# Check for issues like:
# - Unused types
# - Inconsistent naming
# - Missing descriptions
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Playground disabled in production
# Use Apollo Studio for introspection
```

---

## Debugging

### Enable Debug Logging

```bash
# Start with debug enabled
DEBUG=lume:graphql npm run dev

# Or set in .env
DEBUG=lume:*
```

### GraphQL Debug Tools

```typescript
// Temporary debug resolver
@Query('debug')
async debug(@Context() context: GraphQLContext) {
  return {
    userId: context.userId,
    tenantId: context.tenantId,
    userRoles: context.userRoles,
    timestamp: new Date(),
  };
}
```

### Check Query Complexity

```bash
# Test query complexity
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ dataGrids { edges { node { id } } } }"
  }' | jq '.extensions.complexity'
```

### Monitor Resolver Execution

```typescript
// Add to resolver
@Query('dataGrids')
async listDataGrids(
  @Args('input') input: any,
  @Context() context: GraphQLContext,
) {
  const startTime = Date.now();

  try {
    const result = await this.dataGridService.listDataGrids(input, context.tenantId);
    console.log(`Query executed in ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    console.error(`Query failed after ${Date.now() - startTime}ms`, error);
    throw error;
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@nestjs/graphql'"

```bash
# Solution: Install missing dependencies
npm install @nestjs/graphql @apollo/server

# Verify installation
npm ls @nestjs/graphql
```

#### 2. "GraphQL schema not found"

```typescript
// Verify schema paths in graphql.config.ts
typePaths: [
  join(__dirname, 'schema', '**/*.graphql'),
]

// Check file permissions
ls -la src/core/graphql/schema/
```

#### 3. "Resolver not found"

```typescript
// Ensure resolver is:
// 1. Decorated with @Resolver
// 2. Provided in GraphQL module
// 3. Exported from module

providers: [
  DataGridResolver,  // Add here
  DataGridService,
]
```

#### 4. "DataLoader returning undefined"

```typescript
// Ensure batch function returns items in correct order
const batch = async (ids: string[]) => {
  const items = await db.find({ id: { $in: ids } });
  
  // IMPORTANT: Return in same order as input
  return ids.map(id => items.find(item => item.id === id));
};
```

#### 5. "Authorization directive not working"

```typescript
// Ensure:
// 1. Directive registered in module
// 2. Query has @auth directive
// 3. User context populated

@Query('dataGrid')
@Auth(roles: ['user'])  // Add directive
async getDataGrid(
  @Args('id') id: string,
  @Context() context: GraphQLContext,
) {
  // ...
}
```

### Performance Debugging

#### Check N+1 Queries

```bash
# Enable Prisma logging
DATABASE_URL="mysql://user:pass@localhost/db?log=query" npm run dev

# Look for repeated queries in logs
```

#### Monitor Memory Usage

```bash
# Start with memory profiling
node --inspect-brk --expose-gc dist/main.js

# Open Chrome DevTools:
# chrome://inspect

# Take heap snapshots and compare
```

#### Measure Query Time

```bash
# Add to GraphQL config
formatError: (error: any, debug: boolean) => {
  console.time(`query-${error.path}`);
  // ... handle error
  console.timeEnd(`query-${error.path}`);
}
```

---

## Next Steps

After successful setup:

1. **Generate Types**
   ```bash
   npm run graphql:generate
   ```

2. **Test Queries**
   ```bash
   npm run test:graphql
   ```

3. **Deploy**
   - Configure environment variables
   - Set up production database
   - Enable introspection security
   - Configure rate limiting

4. **Monitor**
   - Set up OpenTelemetry
   - Configure Apollo Studio
   - Monitor query performance
   - Track errors

5. **Extend**
   - Add new grid modules
   - Implement custom directives
   - Add subscriptions
   - Integrate AI services

## Reference

- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [DataLoader](https://github.com/graphql/dataloader)

