import { SchemaDirectiveVisitor } from '@apollo/server';
import { GraphQLField, GraphQLError } from 'graphql';
import prisma from '../../db/prisma';

/**
 * @auth directive for role-based access control
 * Usage: @auth(roles: ["admin"]) on FIELD_DEFINITION
 */
export class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { roles, permissions } = this.args;
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

      // Check roles
      if (roles && roles.length > 0) {
        const hasRole = context.userRoles.some((role: string) =>
          roles.includes(role),
        );

        if (!hasRole) {
          throw new GraphQLError(
            `Forbidden: Required roles - ${roles.join(', ')}`,
            {
              extensions: {
                code: 'FORBIDDEN',
                requiredRoles: roles,
                userRoles: context.userRoles,
              },
            },
          );
        }
      }

      // Check permissions
      if (permissions && permissions.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: context.userId },
          include: {
            roles: {
              include: {
                permissions: true,
              },
            },
          },
        });

        const userPermissions = user?.roles
          .flatMap(role => role.permissions)
          .map(perm => perm.name) || [];

        const hasPermission = permissions.some((perm: string) =>
          userPermissions.includes(perm),
        );

        if (!hasPermission) {
          throw new GraphQLError(
            `Forbidden: Required permissions - ${permissions.join(', ')}`,
            {
              extensions: {
                code: 'FORBIDDEN_PERMISSION',
                requiredPermissions: permissions,
                userPermissions,
              },
            },
          );
        }
      }

      // Execute the original resolver
      return originalResolve
        ? originalResolve(source, args, context, info)
        : source[info.fieldName];
    };
  }
}
