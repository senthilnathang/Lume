import { SchemaDirectiveVisitor } from '@apollo/server';
import { GraphQLField, GraphQLError } from 'graphql';

/**
 * @policy directive for attribute-based access control
 * Usage: @policy(resource: "users", action: "create") on FIELD_DEFINITION
 */
export class PolicyDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resource, action } = this.args;
    const originalResolve = field.resolve;

    field.resolve = async (source, args, context, info) => {
      // Check if user is authenticated
      if (!context.userId) {
        throw new GraphQLError('Unauthorized: User not authenticated', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        });
      }

      // Evaluate policy
      const allowed = await this.evaluatePolicy(
        context.userId,
        context.tenantId,
        resource,
        action,
        args,
      );

      if (!allowed) {
        throw new GraphQLError(
          `Access denied: ${resource}/${action}`,
          {
            extensions: {
              code: 'POLICY_DENIED',
              resource,
              action,
            },
          },
        );
      }

      // Execute the original resolver
      return originalResolve
        ? originalResolve(source, args, context, info)
        : source[info.fieldName];
    };
  }

  /**
   * Evaluate policy based on resource and action
   */
  private async evaluatePolicy(
    userId: string,
    tenantId: string,
    resource: string,
    action: string,
    args: any,
  ): Promise<boolean> {
    // This is a placeholder. In production, this would:
    // 1. Query policies from database based on userId, tenantId
    // 2. Match policies against resource/action
    // 3. Evaluate conditions (field-level, tenant-level, etc.)
    // 4. Return allow/deny decision

    // For now, allow all authenticated requests
    return true;
  }
}
