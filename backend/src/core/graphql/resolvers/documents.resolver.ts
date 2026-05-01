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
import { DocumentsAdapter, DocumentsGqlInput, DocumentsGqlFilter } from '../adapters/documents.adapter.js';
import { GraphQLService } from '../graphql.service.js';
import { AuthGuard } from '../guards/auth.guard.js';

export interface Document {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  status: string;
  categoryId?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdById: string;
  updatedById?: string;
  publishedById?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface DocumentConnection {
  edges: Array<{ node: Document; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount: number;
  };
}

@Resolver('Document')
@UseGuards(AuthGuard)
export class DocumentsResolver {
  constructor(
    private documentsAdapter: DocumentsAdapter,
    private graphqlService: GraphQLService,
  ) {}

  @Query('document')
  async getDocument(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<Document> {
    this.graphqlService.logOperation('getDocument', { id }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions to view documents', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.documentsAdapter.getDocument(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Query('documents')
  async listDocuments(
    @Args('filter', { nullable: true }) filter?: DocumentsGqlFilter,
    @Args('page', { type: () => Int, defaultValue: 1 }) page?: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit?: number,
    @Context() context?: any,
  ): Promise<DocumentConnection> {
    this.graphqlService.logOperation('listDocuments', { filter, page, limit }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor', 'viewer'], context)) {
      throw new GraphQLError('Insufficient permissions to view documents', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.documentsAdapter.listDocuments(filter || {}, { page, limit }, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('createDocument')
  async createDocument(
    @Args('input') input: DocumentsGqlInput,
    @Context() context: any,
  ): Promise<Document> {
    this.graphqlService.logOperation('createDocument', { input }, context);
    this.graphqlService.createAuditLog('CREATE', 'documents', 'N/A', input, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions to create documents', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.documentsAdapter.createDocument(input, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('updateDocument')
  async updateDocument(
    @Args('id') id: string,
    @Args('input') input: DocumentsGqlInput,
    @Context() context: any,
  ): Promise<Document> {
    this.graphqlService.logOperation('updateDocument', { id, input }, context);
    this.graphqlService.createAuditLog('UPDATE', 'documents', id, input, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions to update documents', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.documentsAdapter.updateDocument(id, input, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('publishDocument')
  async publishDocument(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<Document> {
    this.graphqlService.logOperation('publishDocument', { id }, context);
    this.graphqlService.createAuditLog('PUBLISH', 'documents', id, {}, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'editor'], context)) {
      throw new GraphQLError('Insufficient permissions to publish documents', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.documentsAdapter.publishDocument(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('deleteDocument')
  async deleteDocument(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    this.graphqlService.logOperation('deleteDocument', { id }, context);
    this.graphqlService.createAuditLog('DELETE', 'documents', id, {}, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to delete documents', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.documentsAdapter.deleteDocument(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }
}
