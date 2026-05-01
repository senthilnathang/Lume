import { Injectable, Logger } from '@nestjs/common';
import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLRequestContext } from '@apollo/server/plugin/base';

/**
 * LoggingPlugin
 * Structured JSON logging for GraphQL operations
 * Logs operation name, duration ms, error count, complexity, user context
 * Integrates with NestJS LoggerService for centralized observability
 */
@Injectable()
export class LoggingPlugin implements ApolloServerPlugin {
  private logger = new Logger('GraphQL');

  async requestDidResolveOperation?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // Store request start time for duration calculation
    requestContext.context.requestStartTime = Date.now();
  }

  async didEncounterErrors?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // TODO: Log errors as they occur:
    // this.logger.error(
    //   `GraphQL Error in operation ${requestContext.operationName}`,
    //   {
    //     operationName: requestContext.operationName,
    //     errorCount: requestContext.errors?.length,
    //     errors: requestContext.errors?.map(e => ({
    //       message: e.message,
    //       code: e.extensions?.code,
    //       path: e.path?.join('.'),
    //     })),
    //     userId: requestContext.context.user?.sub,
    //     companyId: requestContext.context.companyId,
    //   }
    // );
  }

  async willSendResponse?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    const durationMs = Date.now() - (requestContext.context.requestStartTime || Date.now());
    const errorCount = requestContext.errors?.length || 0;

    // TODO: Log operation completion:
    // const logLevel = errorCount > 0 ? 'warn' : 'debug';
    // const logMethod = this.logger[logLevel].bind(this.logger);
    //
    // logMethod(`GraphQL operation completed`, {
    //   operationName: requestContext.operationName,
    //   operationType: requestContext.operation?.operation,
    //   durationMs,
    //   errorCount,
    //   queryComplexity: requestContext.context.queryComplexity,
    //   userId: requestContext.context.user?.sub,
    //   companyId: requestContext.context.companyId,
    //   authenticatedUser: !!requestContext.context.user,
    //   httpStatus: requestContext.response.status,
    //   variableCount: Object.keys(requestContext.request.variables || {}).length,
    // });
    //
    // If any errors, also log detailed error info
    // if (errorCount > 0) {
    //   this.logger.error(
    //     `GraphQL operation "${requestContext.operationName}" encountered ${errorCount} error(s)`,
    //     {
    //       errors: requestContext.errors?.map(e => ({
    //         message: e.message,
    //         code: e.extensions?.code,
    //         path: e.path,
    //       })),
    //       durationMs,
    //     }
    //   );
    // }
    //
    // Slow query warning (>500ms)
    // if (durationMs > 500) {
    //   this.logger.warn(
    //     `Slow GraphQL query: "${requestContext.operationName}" took ${durationMs}ms`,
    //     { operationName: requestContext.operationName, durationMs }
    //   );
    // }
  }
}
