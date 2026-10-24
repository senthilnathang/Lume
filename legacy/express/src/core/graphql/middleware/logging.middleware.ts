import { Injectable, Logger } from '@nestjs/common';
import { GraphQLRequestListener } from '@apollo/server';
import logger from '../../services/logger';

@Injectable()
export class GraphQLLoggingMiddleware implements GraphQLRequestListener {
  private readonly logger = new Logger(GraphQLLoggingMiddleware.name);

  async requestDidStart() {
    const startTime = Date.now();

    return {
      didResolveOperation: (context: any) => {
        const { operationName } = context;
        logger.debug('GraphQL Operation', {
          operation: operationName,
          type: context.operation?.operation || 'unknown',
          timestamp: new Date().toISOString(),
        });
      },

      didEncounterErrors: (context: any) => {
        const duration = Date.now() - startTime;

        context.errors.forEach((error: any) => {
          logger.error('GraphQL Error', {
            operation: context.operationName,
            message: error.message,
            path: error.path?.join('.'),
            code: error.extensions?.code,
            duration,
            timestamp: new Date().toISOString(),
          });
        });
      },

      willSendResponse: (context: any) => {
        const duration = Date.now() - startTime;
        const size = JSON.stringify(context.response).length;

        logger.info('GraphQL Response', {
          operation: context.operationName,
          duration,
          size,
          status: context.response.errors ? 'error' : 'success',
          timestamp: new Date().toISOString(),
        });
      },
    };
  }
}
