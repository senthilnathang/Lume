import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { BaseModuleAdapter, AdapterContext } from './base.adapter.js';
import { MessageService } from '../../services/message.service.js';

export interface MessageGqlInput {
  email: string;
  name?: string;
  subject?: string;
  message: string;
  type?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface MessageGqlFilter {
  email?: string;
  type?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
}

@Injectable()
export class MessagesAdapter extends BaseModuleAdapter {
  constructor(private messageService: MessageService) {
    super('messages');
  }

  async getMessage(id: string, context: AdapterContext) {
    try {
      this.ensureTenantOwnership({ tenantId: context.tenantId }, context);
      const message = await this.messageService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!message) {
        throw new GraphQLError('Message not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return this.transformToGraphQL(message);
    } catch (error) {
      this.handleServiceError(error, 'getMessage');
    }
  }

  async listMessages(
    filter: MessageGqlFilter,
    pagination: { page: number; limit: number },
    context: AdapterContext,
  ) {
    try {
      const where: any = { tenantId: context.tenantId };

      if (filter?.email) {
        where.email = {
          contains: filter.email,
          mode: 'insensitive',
        };
      }
      if (filter?.type) {
        where.type = filter.type;
      }
      if (filter?.status) {
        where.status = filter.status;
      }
      if (filter?.fromDate || filter?.toDate) {
        where.createdAt = {};
        if (filter.fromDate) {
          where.createdAt.gte = filter.fromDate;
        }
        if (filter.toDate) {
          where.createdAt.lte = filter.toDate;
        }
      }

      const skip = (pagination.page - 1) * pagination.limit;
      const [messages, total] = await Promise.all([
        this.messageService.find({
          where,
          skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.messageService.count({ where }),
      ]);

      return {
        edges: messages.map((msg) => ({
          node: this.transformToGraphQL(msg),
          cursor: Buffer.from(msg.id).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: skip + messages.length < total,
          hasPreviousPage: pagination.page > 1,
          startCursor: messages.length
            ? Buffer.from(messages[0].id).toString('base64')
            : null,
          endCursor: messages.length
            ? Buffer.from(messages[messages.length - 1].id).toString('base64')
            : null,
          totalCount: total,
        },
      };
    } catch (error) {
      this.handleServiceError(error, 'listMessages');
    }
  }

  async createMessage(input: MessageGqlInput, context: AdapterContext) {
    try {
      this.validateCreateInput(input);

      const messageData = this.transformFromGraphQL(input, context);
      messageData.tenantId = context.tenantId;
      messageData.ipAddress = context.ipAddress || null;

      const message = await this.messageService.create(messageData);
      return this.transformToGraphQL(message);
    } catch (error) {
      this.handleServiceError(error, 'createMessage');
    }
  }

  async replyToMessage(
    id: string,
    reply: string,
    context: AdapterContext,
  ) {
    try {
      const message = await this.messageService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!message) {
        throw new GraphQLError('Message not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(message, context);

      const updated = await this.messageService.update(id, {
        reply,
        repliedAt: new Date(),
        repliedById: context.userId,
        status: 'REPLIED',
      });

      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'replyToMessage');
    }
  }

  async updateMessageStatus(
    id: string,
    status: string,
    context: AdapterContext,
  ) {
    try {
      const validStatuses = ['NEW', 'READ', 'REPLIED', 'ARCHIVED'];
      if (!validStatuses.includes(status)) {
        throw new GraphQLError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, {
          extensions: { code: 'INVALID_INPUT' },
        });
      }

      const message = await this.messageService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!message) {
        throw new GraphQLError('Message not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(message, context);

      const updated = await this.messageService.update(id, { status });
      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'updateMessageStatus');
    }
  }

  async deleteMessage(id: string, context: AdapterContext) {
    try {
      const message = await this.messageService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!message) {
        throw new GraphQLError('Message not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(message, context);
      await this.messageService.delete(id);

      return true;
    } catch (error) {
      this.handleServiceError(error, 'deleteMessage');
    }
  }

  protected transformToGraphQL(data: any): any {
    if (!data) return null;

    return {
      id: data.id,
      tenantId: data.tenantId,
      email: data.email,
      name: data.name || null,
      subject: data.subject || null,
      message: data.message,
      type: data.type || 'CONTACT',
      phone: data.phone || null,
      status: data.status || 'NEW',
      reply: data.reply || null,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress || null,
      repliedById: data.repliedById || null,
      repliedAt: data.repliedAt || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  protected transformFromGraphQL(input: MessageGqlInput, context: AdapterContext): any {
    return {
      email: input.email.toLowerCase().trim(),
      name: input.name?.trim() || null,
      subject: input.subject?.trim() || null,
      message: input.message.trim(),
      type: input.type || 'CONTACT',
      phone: input.phone?.trim() || null,
      metadata: input.metadata || {},
    };
  }

  private validateCreateInput(input: MessageGqlInput): void {
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new GraphQLError('Valid email address is required', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (!input.message || input.message.trim().length === 0) {
      throw new GraphQLError('Message content is required', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (input.message.length > 5000) {
      throw new GraphQLError('Message must be less than 5000 characters', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (input.name && input.name.length > 200) {
      throw new GraphQLError('Name must be less than 200 characters', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }
  }
}
