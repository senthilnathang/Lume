import { Injectable } from '@nestjs/common';
import { GraphQLRequestListener } from '@apollo/server';
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('graphql-layer');

@Injectable()
export class GraphQLTracingMiddleware implements GraphQLRequestListener {
  async requestDidStart() {
    const requestSpan = tracer.startSpan('graphql.request');

    return {
      didResolveOperation: (ctx: any) => {
        const operationSpan = tracer.startSpan('graphql.operation', {
          attributes: {
            'graphql.operation': ctx.operationName,
            'graphql.type': ctx.operation?.operation || 'unknown',
            'graphql.query.length': ctx.request.query.length,
          },
        });

        ctx.operationSpan = operationSpan;
      },

      didEncounterErrors: (ctx: any) => {
        ctx.errors?.forEach((error: any, index: number) => {
          const errorSpan = tracer.startSpan('graphql.error', {
            attributes: {
              'error.type': error.extensions?.code || 'GRAPHQL_ERROR',
              'error.message': error.message,
              'error.path': error.path?.join('.'),
              'error.index': index,
            },
          });

          errorSpan.recordException(error);
          errorSpan.end();
        });

        if (ctx.operationSpan) {
          ctx.operationSpan.recordException(ctx.errors[0]);
        }
      },

      willSendResponse: (ctx: any) => {
        if (ctx.operationSpan) {
          ctx.operationSpan.addEvent('response.sent', {
            'response.hasErrors': !!ctx.response.errors,
            'response.size': JSON.stringify(ctx.response).length,
          });
          ctx.operationSpan.end();
        }

        requestSpan.end();
      },
    };
  }
}
