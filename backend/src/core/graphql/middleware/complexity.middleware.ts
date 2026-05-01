import { Injectable } from '@nestjs/common';
import { GraphQLRequestListener } from '@apollo/server';
import { getComplexity, simpleEstimator } from 'graphql-query-complexity';
import logger from '../../services/logger';

const MAX_QUERY_COMPLEXITY = 1000;

@Injectable()
export class GraphQLComplexityMiddleware implements GraphQLRequestListener {
  constructor(private schema: any) {}

  async requestDidStart() {
    return {
      didResolveOperation: (context: any) => {
        const { request, schema } = context;

        // Skip complexity check for introspection
        if (request.operationName === 'IntrospectionQuery') {
          return;
        }

        try {
          const complexity = getComplexity({
            schema,
            operationName: request.operationName,
            query: request.query,
            variables: request.variables,
            estimators: [simpleEstimator({ defaultComplexity: 1 })],
          });

          if (complexity > MAX_QUERY_COMPLEXITY) {
            logger.warn('Query Complexity Exceeded', {
              operation: request.operationName,
              complexity,
              maxAllowed: MAX_QUERY_COMPLEXITY,
            });

            throw new Error(
              `Query complexity (${complexity}) exceeds limit (${MAX_QUERY_COMPLEXITY})`,
            );
          }

          logger.debug('Query Complexity', {
            operation: request.operationName,
            complexity,
            percentOfMax: Math.round((complexity / MAX_QUERY_COMPLEXITY) * 100),
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('exceeds')) {
            throw error;
          }

          logger.error('Failed to calculate query complexity', error);
        }
      },
    };
  }
}
