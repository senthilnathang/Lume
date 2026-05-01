import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { MessagesAdapter, MessageGqlInput, MessageGqlFilter } from '../adapters/messages.adapter.js';
import { GraphQLService } from '../graphql.service.js';
import { AuthGuard } from '../guards/auth.guard.js';

export interface Message {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  subject?: string;
  message: string;
  type: string;
  phone?: string;
  status: string;
  reply?: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  repliedById?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageConnection {
  edges: Array<{ node: Message; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount: number;
  };
}

@Resolver('Message')
@UseGuards(AuthGuard)
export class MessagesResolver {
  constructor(
    private messagesAdapter: MessagesAdapter,
    private graphqlService: GraphQLService,
  ) {}

  @Query('message')
  async getMessage(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<Message> {
    this.graphqlService.logOperation('getMessage', { id }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to view messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.messagesAdapter.getMessage(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Query('messages')
  async listMessages(
    @Args('filter', { nullable: true }) filter?: MessageGqlFilter,
    @Args('page', { type: () => Int, defaultValue: 1 }) page?: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit?: number,
    @Context() context?: any,
  ): Promise<MessageConnection> {
    this.graphqlService.logOperation('listMessages', { filter, page, limit }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to view messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.messagesAdapter.listMessages(filter || {}, { page, limit }, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('createMessage')
  async createMessage(
    @Args('input') input: MessageGqlInput,
    @Context() context: any,
  ): Promise<Message> {
    this.graphqlService.logOperation('createMessage', { input }, context);
    this.graphqlService.createAuditLog('CREATE', 'messages', 'N/A', input, context);

    return this.messagesAdapter.createMessage(input, {
      userId: context.user?.id || 'anonymous',
      tenantId: context.user?.tenantId,
      roles: context.user?.roles || [],
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('replyToMessage')
  async replyToMessage(
    @Args('id') id: string,
    @Args('reply') reply: string,
    @Context() context: any,
  ): Promise<Message> {
    this.graphqlService.logOperation('replyToMessage', { id, reply }, context);
    this.graphqlService.createAuditLog('REPLY', 'messages', id, { reply }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to reply to messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.messagesAdapter.replyToMessage(id, reply, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('updateMessageStatus')
  async updateMessageStatus(
    @Args('id') id: string,
    @Args('status') status: string,
    @Context() context: any,
  ): Promise<Message> {
    this.graphqlService.logOperation('updateMessageStatus', { id, status }, context);
    this.graphqlService.createAuditLog('UPDATE_STATUS', 'messages', id, { status }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to update message status', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.messagesAdapter.updateMessageStatus(id, status, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('deleteMessage')
  async deleteMessage(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    this.graphqlService.logOperation('deleteMessage', { id }, context);
    this.graphqlService.createAuditLog('DELETE', 'messages', id, {}, context);

    if (!this.graphqlService.hasRole(['admin'], context)) {
      throw new GraphQLError('Insufficient permissions to delete messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.messagesAdapter.deleteMessage(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }
}
