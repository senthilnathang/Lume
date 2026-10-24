import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
} from '@nestjs/graphql';
import { GraphQLService } from '../graphql.service';
import prisma from '../../db/prisma';

interface GraphQLContext {
  userId: string;
  tenantId: string;
  userRoles: string[];
}

@Resolver('User')
export class UserResolver {
  constructor(
    private graphqlService: GraphQLService,
  ) {}

  @Query('me')
  async getMe(@Context() context: GraphQLContext) {
    this.graphqlService.logOperation('me', 'query', context, {});

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
      include: {
        roles: true,
      },
    });

    return user;
  }

  @Query('user')
  async getUser(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
      },
    });

    if (!user || user.tenantId !== context.tenantId) {
      throw new Error('User not found');
    }

    return user;
  }

  @Query('users')
  async listUsers(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    const { page = 1, pageSize = 20, filter } = input;
    const skip = (page - 1) * pageSize;

    const where: any = { tenantId: context.tenantId };
    if (filter) {
      where.OR = [
        { email: { contains: filter } },
        { firstName: { contains: filter } },
        { lastName: { contains: filter } },
      ];
    }

    const total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      include: { roles: true },
    });

    return {
      edges: users.map(node => ({
        node,
        cursor: Buffer.from(node.id).toString('base64'),
      })),
      pageInfo: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  @Mutation('createUser')
  async createUser(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    this.graphqlService.logOperation('createUser', 'mutation', context, input);

    try {
      const user = await prisma.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          tenantId: context.tenantId,
          roles: {
            connect: input.roleIds.map((id: string) => ({ id })),
          },
        },
        include: { roles: true },
      });

      await this.graphqlService.createAuditLog(
        context.userId,
        'CREATE_USER',
        'user',
        user.id,
        { input },
      );

      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  @Mutation('updateUser')
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    this.graphqlService.logOperation('updateUser', 'mutation', context, { id, input });

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          status: input.status,
          roles: input.roleIds ? {
            set: input.roleIds.map((roleId: string) => ({ id: roleId })),
          } : undefined,
        },
        include: { roles: true },
      });

      await this.graphqlService.createAuditLog(
        context.userId,
        'UPDATE_USER',
        'user',
        id,
        { input },
      );

      return user;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  @Mutation('deleteUser')
  async deleteUser(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    this.graphqlService.logOperation('deleteUser', 'mutation', context, { id });

    try {
      await prisma.user.delete({
        where: { id },
      });

      await this.graphqlService.createAuditLog(
        context.userId,
        'DELETE_USER',
        'user',
        id,
        {},
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}
