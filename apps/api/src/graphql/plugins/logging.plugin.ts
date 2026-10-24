import { Injectable, Logger } from '@nestjs/common';
import type { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener } from '@apollo/server';

@Injectable()
export class LoggingPlugin implements ApolloServerPlugin {
  private logger = new Logger('GraphQL');
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return {
      didResolveOperation: context => this.didResolveOperation(context),
      didEncounterErrors: context => this.didEncounterErrors(context),
      willSendResponse: context => this.willSendResponse(context),
    };
  }
  async didResolveOperation(context: GraphQLRequestContext<any>): Promise<void> {
    context.contextValue.requestStartTime = Date.now();
  }
  async didEncounterErrors(context: GraphQLRequestContext<any>): Promise<void> {
    this.logger.warn({ operationName: context.operationName, errorCount: context.errors?.length || 0 });
  }
  async willSendResponse(context: GraphQLRequestContext<any>): Promise<void> {
    const durationMs = Date.now() - (context.contextValue.requestStartTime ?? Date.now());
    this.logger.debug({ operationName: context.operationName, durationMs, errorCount: context.errors?.length || 0, queryComplexity: context.contextValue.queryComplexity });
    if (durationMs > 500) this.logger.warn(`Slow GraphQL query: "${context.operationName || 'anonymous'}" took ${durationMs}ms`);
  }
}
