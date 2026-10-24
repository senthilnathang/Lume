import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { BaseModuleAdapter, AdapterContext } from './base.adapter.js';
import { DocumentService } from '../../services/document.service.js';

export interface DocumentsGqlInput {
  title?: string;
  content?: string;
  status?: string;
  categoryId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentsGqlFilter {
  status?: string;
  categoryId?: string;
  tags?: string[];
  search?: string;
}

@Injectable()
export class DocumentsAdapter extends BaseModuleAdapter {
  constructor(private documentService: DocumentService) {
    super('documents');
  }

  async getDocument(id: string, context: AdapterContext) {
    try {
      this.ensureTenantOwnership({ tenantId: context.tenantId }, context);
      const document = await this.documentService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!document) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return this.transformToGraphQL(document);
    } catch (error) {
      this.handleServiceError(error, 'getDocument');
    }
  }

  async listDocuments(
    filter: DocumentsGqlFilter,
    pagination: { page: number; limit: number },
    context: AdapterContext,
  ) {
    try {
      const where: any = { tenantId: context.tenantId };

      if (filter?.status) {
        where.status = filter.status;
      }
      if (filter?.categoryId) {
        where.categoryId = filter.categoryId;
      }
      if (filter?.tags?.length) {
        where.tags = { hasSome: filter.tags };
      }
      if (filter?.search) {
        where.OR = [
          { title: { contains: filter.search, mode: 'insensitive' } },
          { content: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const skip = (pagination.page - 1) * pagination.limit;
      const [documents, total] = await Promise.all([
        this.documentService.find({
          where,
          skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.documentService.count({ where }),
      ]);

      return {
        edges: documents.map((doc) => ({
          node: this.transformToGraphQL(doc),
          cursor: Buffer.from(doc.id).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: skip + documents.length < total,
          hasPreviousPage: pagination.page > 1,
          startCursor: documents.length
            ? Buffer.from(documents[0].id).toString('base64')
            : null,
          endCursor: documents.length
            ? Buffer.from(documents[documents.length - 1].id).toString('base64')
            : null,
          totalCount: total,
        },
      };
    } catch (error) {
      this.handleServiceError(error, 'listDocuments');
    }
  }

  async createDocument(input: DocumentsGqlInput, context: AdapterContext) {
    try {
      this.validateCreateInput(input);

      const documentData = this.transformFromGraphQL(input, context);
      documentData.tenantId = context.tenantId;
      documentData.createdById = context.userId;

      const document = await this.documentService.create(documentData);
      return this.transformToGraphQL(document);
    } catch (error) {
      this.handleServiceError(error, 'createDocument');
    }
  }

  async updateDocument(
    id: string,
    input: DocumentsGqlInput,
    context: AdapterContext,
  ) {
    try {
      const document = await this.documentService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!document) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(document, context);

      const updateData = this.transformFromGraphQL(input, context);
      updateData.updatedById = context.userId;

      const updated = await this.documentService.update(id, updateData);
      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'updateDocument');
    }
  }

  async deleteDocument(id: string, context: AdapterContext) {
    try {
      const document = await this.documentService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!document) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(document, context);
      await this.documentService.delete(id);

      return true;
    } catch (error) {
      this.handleServiceError(error, 'deleteDocument');
    }
  }

  async publishDocument(id: string, context: AdapterContext) {
    try {
      const document = await this.documentService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!document) {
        throw new GraphQLError('Document not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(document, context);

      const updated = await this.documentService.update(id, {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: context.userId,
      });

      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'publishDocument');
    }
  }

  protected transformToGraphQL(data: any): any {
    if (!data) return null;

    return {
      id: data.id,
      tenantId: data.tenantId,
      title: data.title,
      content: data.content,
      status: data.status,
      categoryId: data.categoryId,
      tags: data.tags || [],
      metadata: data.metadata || {},
      createdById: data.createdById,
      updatedById: data.updatedById,
      publishedById: data.publishedById,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      publishedAt: data.publishedAt,
    };
  }

  protected transformFromGraphQL(input: DocumentsGqlInput, context: AdapterContext): any {
    return {
      title: input.title,
      content: input.content,
      status: input.status || 'DRAFT',
      categoryId: input.categoryId,
      tags: input.tags || [],
      metadata: input.metadata || {},
    };
  }

  private validateCreateInput(input: DocumentsGqlInput): void {
    if (!input.title || input.title.trim().length === 0) {
      throw new GraphQLError('Document title is required', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (input.title.length > 500) {
      throw new GraphQLError('Document title must be less than 500 characters', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }
  }
}
