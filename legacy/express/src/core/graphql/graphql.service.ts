import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GraphQLSchema, validate } from 'graphql';
import prisma from '../db/prisma';
import logger from '../services/logger';

interface GraphQLContext {
  userId?: string;
  tenantId?: string;
  userRoles: string[];
  req: any;
  res: any;
}

@Injectable()
export class GraphQLService {
  private readonly logger = new Logger(GraphQLService.name);
  private schema: GraphQLSchema | null = null;

  constructor() {
    this.logger.log('GraphQL Service initialized');
  }

  /**
   * Check if user has required role
   */
  hasRole(context: GraphQLContext, roles: string[]): boolean {
    if (!roles || roles.length === 0) return true;
    return roles.some(role => context.userRoles.includes(role));
  }

  /**
   * Check if user has required permission
   */
  async hasPermission(
    context: GraphQLContext,
    permissions: string[],
  ): Promise<boolean> {
    if (!permissions || permissions.length === 0) return true;

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

    if (!user) return false;

    const userPermissions = user.roles
      .flatMap(role => role.permissions)
      .map(perm => perm.name);

    return permissions.some(perm => userPermissions.includes(perm));
  }

  /**
   * Get tenant context from request
   */
  getTenantContext(context: GraphQLContext): {
    tenantId: string;
    userId: string;
  } {
    if (!context.tenantId || !context.userId) {
      throw new Error('Tenant context not found');
    }

    return {
      tenantId: context.tenantId,
      userId: context.userId,
    };
  }

  /**
   * Log GraphQL operation
   */
  logOperation(
    operationName: string,
    operationType: 'query' | 'mutation' | 'subscription',
    context: GraphQLContext,
    variables?: any,
  ) {
    logger.info(`GraphQL ${operationType}`, {
      operation: operationName,
      userId: context.userId,
      tenantId: context.tenantId,
      variables: JSON.stringify(variables),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log GraphQL mutation
   */
  logMutation(
    mutationName: string,
    context: GraphQLContext,
    input: any,
    result: any,
  ) {
    logger.info(`GraphQL Mutation`, {
      mutation: mutationName,
      userId: context.userId,
      tenantId: context.tenantId,
      input: JSON.stringify(input),
      success: result?.success,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Validate GraphQL query
   */
  validateQuery(schema: GraphQLSchema, documentAST: any): string[] {
    return validate(schema, documentAST);
  }

  /**
   * Get Prisma client
   */
  getPrisma(): PrismaClient {
    return prisma;
  }

  /**
   * Handle GraphQL error response
   */
  formatError(error: any) {
    this.logger.error('GraphQL Error', {
      message: error.message,
      code: error.extensions?.code,
      path: error.path,
    });

    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      path: error.path,
    };
  }

  /**
   * Create audit log for mutation
   */
  async createAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes?: any,
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          changes: changes ? JSON.stringify(changes) : null,
          ipAddress: null,
          userAgent: null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }
}
