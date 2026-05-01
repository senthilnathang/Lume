import { Injectable } from '@nestjs/common';
import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLRequestContext } from '@apollo/server/plugin/base';

/**
 * TracingPlugin
 * OpenTelemetry integration for GraphQL observability
 * Creates operation-level spans with field-level child spans for N+1 detection
 * Exports traces to configured OpenTelemetry backend (Jaeger, Datadog, etc.)
 */
@Injectable()
export class TracingPlugin implements ApolloServerPlugin {
  // TODO: Inject @opentelemetry/api tracer via LoggerService or dedicated TraceProvider

  async requestDidResolveOperation?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // TODO: Create root span for operation:
    // const span = tracer.startSpan('graphql.operation', {
    //   attributes: {
    //     'graphql.operation.name': requestContext.operationName,
    //     'graphql.operation.type': requestContext.operation.operation,
    //     'tenant.company_id': requestContext.context.companyId,
    //     'user.id': requestContext.context.user?.sub,
    //     'http.client_ip': requestContext.request.http?.headers.get('x-forwarded-for'),
    //   }
    // });
    // Store span in requestContext.context for child resolver spans
  }

  async willResolveField?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // TODO: Create child span for each resolver field:
    // const parentSpan = requestContext.context.currentSpan;
    // const fieldSpan = tracer.startSpan(`graphql.field.${info.parentType.name}.${info.fieldName}`, {
    //   parent: parentSpan,
    //   attributes: {
    //     'graphql.field.name': info.fieldName,
    //     'graphql.field.type': info.parentType.name,
    //     'graphql.field.return_type': info.returnType.toString(),
    //   }
    // });
    // Store fieldSpan in context for N+1 detection (multiple field spans → single DB span)
  }

  async didResolveField?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // TODO: End field span with result/error attributes
    // if (error) fieldSpan.recordException(error);
    // fieldSpan.end();
  }

  async didEncounterErrors?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // TODO: Record errors in root operation span:
    // requestContext.context.currentSpan.addEvent('graphql.error', {
    //   'error.count': requestContext.errors?.length || 0,
    //   'error.message': requestContext.errors?.[0]?.message,
    // });
  }

  async willSendResponse?(
    requestContext: GraphQLRequestContext<any>,
  ): Promise<void> {
    // TODO: End root operation span with operation result attributes:
    // span.setAttribute('graphql.execution_time_ms', Date.now() - startTime);
    // span.setAttribute('graphql.success', !requestContext.errors?.length);
    // span.end();
  }
}
