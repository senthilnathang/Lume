import { Injectable } from '@nestjs/common';
import type { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError, getNamedType } from 'graphql';
import { getComplexity } from 'graphql-query-complexity';

@Injectable()
export class ComplexityPlugin implements ApolloServerPlugin {
  private readonly limits = { production: 100, development: 1000, test: 5000 };

  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return { didResolveOperation: context => this.didResolveOperation(context), willSendResponse: context => this.willSendResponse(context) };
  }

  async willSendResponse(context: GraphQLRequestContext<any>): Promise<void> {
    if (context.response.body?.kind === 'single' && context.contextValue.queryComplexity != null) {
      const result = context.response.body.singleResult;
      result.extensions = { ...result.extensions, queryComplexity: context.contextValue.queryComplexity };
    }
  }

  async didResolveOperation(context: GraphQLRequestContext<any>): Promise<void> {
    if (!context.document) return;
    const complexity = getComplexity({
      schema: context.schema,
      query: context.document,
      operationName: context.operationName || undefined,
      variables: context.request.variables,
      estimators: [({ field, args, childComplexity }) => {
        const weight = getNamedType(field.type).name === 'JSON' ? 5 : 1;
        // Root pagination bounds the rows fetched; count their nested selections per row.
        const requested = args.pagination?.limit;
        const multiplier = 'pagination' in args || field.args.some(arg => arg.name === 'pagination')
          ? Math.min(Math.max(Number(requested ?? 20), 1), 100) : 1;
        return weight + multiplier * childComplexity;
      }],
    });
    const limit = this.limits[process.env.NODE_ENV || 'development'] ?? this.limits.production;
    context.contextValue.queryComplexity = complexity;
    if (complexity > limit) throw new GraphQLError(`Query too complex: ${complexity}/${limit}. Simplify your query.`, {
      extensions: { code: 'QUERY_COMPLEXITY_EXCEEDED' },
    });
  }
}
