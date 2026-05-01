# GraphQL Module Adapters — Integration Testing Guide

**Version:** 1.0  
**Status:** Testing Patterns  
**Last Updated:** May 2026

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Documents Module Tests](#documents-module-tests)
3. [Messages Module Tests](#messages-module-tests)
4. [Team Module Tests](#team-module-tests)
5. [Adapter Base Tests](#adapter-base-tests)
6. [Error Handling Tests](#error-handling-tests)
7. [Performance Tests](#performance-tests)

---

## Testing Strategy

### Three-Layer Testing Approach

```
┌─────────────────────────────────┐
│  E2E Tests (GraphQL Queries)    │ GraphQL operation testing
├─────────────────────────────────┤
│  Resolver Tests                 │ Authorization, validation
├─────────────────────────────────┤
│  Adapter Tests                  │ Service interaction, transformation
├─────────────────────────────────┤
│  Unit Tests (Services)          │ Business logic
└─────────────────────────────────┘
```

### Test Coverage Targets

- **Unit Tests**: 85%+ service method coverage
- **Adapter Tests**: 90%+ adapter method coverage
- **Resolver Tests**: 80%+ resolver endpoint coverage
- **E2E Tests**: Critical paths + error scenarios

---

## Documents Module Tests

### DocumentsAdapter Unit Tests

```typescript
// backend/src/core/graphql/adapters/__tests__/documents.adapter.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLError } from 'graphql';
import { DocumentsAdapter } from '../documents.adapter.js';
import { DocumentService } from '../../../services/document.service.js';

describe('DocumentsAdapter', () => {
  let adapter: DocumentsAdapter;
  let documentService: DocumentService;
  let module: TestingModule;

  const mockContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin'],
    ipAddress: '127.0.0.1',
  };

  const mockDocument = {
    id: 'doc-1',
    tenantId: 'tenant-1',
    title: 'Test Document',
    content: 'Lorem ipsum dolor sit amet',
    status: 'DRAFT',
    categoryId: 'cat-1',
    tags: ['test', 'draft'],
    metadata: { version: 1 },
    createdById: 'user-1',
    updatedById: null,
    publishedById: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    publishedAt: null,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DocumentsAdapter,
        {
          provide: DocumentService,
          useValue: {
            findById: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<DocumentsAdapter>(DocumentsAdapter);
    documentService = module.get<DocumentService>(DocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocument', () => {
    it('should return a document when found', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(mockDocument);

      const result = await adapter.getDocument('doc-1', mockContext);

      expect(result).toEqual(mockDocument);
      expect(documentService.findById).toHaveBeenCalledWith('doc-1', {
        where: { tenantId: 'tenant-1' },
      });
    });

    it('should throw NOT_FOUND when document does not exist', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(null);

      await expect(
        adapter.getDocument('doc-nonexistent', mockContext),
      ).rejects.toThrow(GraphQLError);

      const error = await adapter.getDocument('doc-nonexistent', mockContext).catch((e) => e);
      expect(error.extensions.code).toBe('NOT_FOUND');
    });

    it('should enforce tenant isolation', async () => {
      const wrongTenantContext = { ...mockContext, tenantId: 'tenant-2' };
      jest.spyOn(documentService, 'findById').mockResolvedValue(mockDocument);

      const result = await adapter.getDocument('doc-1', wrongTenantContext);

      expect(documentService.findById).toHaveBeenCalledWith('doc-1', {
        where: { tenantId: 'tenant-2' },
      });
    });
  });

  describe('listDocuments', () => {
    it('should list documents with pagination', async () => {
      const documents = [mockDocument];
      jest.spyOn(documentService, 'find').mockResolvedValue(documents);
      jest.spyOn(documentService, 'count').mockResolvedValue(5);

      const result = await adapter.listDocuments(
        {},
        { page: 1, limit: 10 },
        mockContext,
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.totalCount).toBe(5);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should filter by status', async () => {
      jest.spyOn(documentService, 'find').mockResolvedValue([mockDocument]);
      jest.spyOn(documentService, 'count').mockResolvedValue(1);

      await adapter.listDocuments(
        { status: 'DRAFT' },
        { page: 1, limit: 10 },
        mockContext,
      );

      expect(documentService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });

    it('should filter by tags', async () => {
      jest.spyOn(documentService, 'find').mockResolvedValue([mockDocument]);
      jest.spyOn(documentService, 'count').mockResolvedValue(1);

      await adapter.listDocuments(
        { tags: ['test'] },
        { page: 1, limit: 10 },
        mockContext,
      );

      expect(documentService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { hasSome: ['test'] } }),
        }),
      );
    });

    it('should support full-text search', async () => {
      jest.spyOn(documentService, 'find').mockResolvedValue([mockDocument]);
      jest.spyOn(documentService, 'count').mockResolvedValue(1);

      await adapter.listDocuments(
        { search: 'Test' },
        { page: 1, limit: 10 },
        mockContext,
      );

      expect(documentService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({ contains: 'Test' }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('createDocument', () => {
    it('should create a document with valid input', async () => {
      const input = {
        title: 'New Document',
        content: 'Content here',
        status: 'DRAFT',
      };
      jest.spyOn(documentService, 'create').mockResolvedValue(mockDocument);

      const result = await adapter.createDocument(input, mockContext);

      expect(result).toEqual(mockDocument);
      expect(documentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          createdById: 'user-1',
          ...input,
        }),
      );
    });

    it('should reject empty title', async () => {
      const input = {
        title: '',
        content: 'Content',
      };

      await expect(
        adapter.createDocument(input, mockContext),
      ).rejects.toThrow('Document title is required');
    });

    it('should reject title exceeding max length', async () => {
      const input = {
        title: 'a'.repeat(501),
        content: 'Content',
      };

      await expect(
        adapter.createDocument(input, mockContext),
      ).rejects.toThrow('Document title must be less than 500 characters');
    });
  });

  describe('updateDocument', () => {
    it('should update a document', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(mockDocument);
      jest.spyOn(documentService, 'update').mockResolvedValue({
        ...mockDocument,
        title: 'Updated',
      });

      const result = await adapter.updateDocument('doc-1', { title: 'Updated' }, mockContext);

      expect(result.title).toBe('Updated');
      expect(documentService.update).toHaveBeenCalledWith('doc-1', expect.anything());
    });

    it('should throw NOT_FOUND for non-existent document', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(null);

      await expect(
        adapter.updateDocument('doc-nonexistent', { title: 'Test' }, mockContext),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('publishDocument', () => {
    it('should publish a document with timestamp', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(mockDocument);
      jest.spyOn(documentService, 'update').mockResolvedValue({
        ...mockDocument,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });

      const result = await adapter.publishDocument('doc-1', mockContext);

      expect(result.status).toBe('PUBLISHED');
      expect(result.publishedAt).toBeDefined();
      expect(documentService.update).toHaveBeenCalledWith(
        'doc-1',
        expect.objectContaining({
          status: 'PUBLISHED',
          publishedById: 'user-1',
        }),
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(mockDocument);
      jest.spyOn(documentService, 'delete').mockResolvedValue(undefined);

      const result = await adapter.deleteDocument('doc-1', mockContext);

      expect(result).toBe(true);
      expect(documentService.delete).toHaveBeenCalledWith('doc-1');
    });

    it('should throw NOT_FOUND for non-existent document', async () => {
      jest.spyOn(documentService, 'findById').mockResolvedValue(null);

      await expect(
        adapter.deleteDocument('doc-nonexistent', mockContext),
      ).rejects.toThrow(GraphQLError);
    });
  });

  describe('transformToGraphQL', () => {
    it('should transform database document to GraphQL format', () => {
      const result = adapter['transformToGraphQL'](mockDocument);

      expect(result).toEqual(mockDocument);
      expect(result.id).toBe('doc-1');
      expect(result.status).toBe('DRAFT');
    });

    it('should return null for null input', () => {
      const result = adapter['transformToGraphQL'](null);

      expect(result).toBeNull();
    });
  });

  describe('transformFromGraphQL', () => {
    it('should transform GraphQL input to database format', () => {
      const input = {
        title: 'Test',
        content: 'Content',
        status: 'DRAFT',
      };

      const result = adapter['transformFromGraphQL'](input, mockContext);

      expect(result.title).toBe('Test');
      expect(result.status).toBe('DRAFT');
    });

    it('should set default status if not provided', () => {
      const input = { title: 'Test', content: 'Content' };

      const result = adapter['transformFromGraphQL'](input, mockContext);

      expect(result.status).toBe('DRAFT');
    });
  });
});
```

---

## Messages Module Tests

### MessagesAdapter Unit Tests

```typescript
// backend/src/core/graphql/adapters/__tests__/messages.adapter.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesAdapter } from '../messages.adapter.js';
import { MessageService } from '../../../services/message.service.js';

describe('MessagesAdapter', () => {
  let adapter: MessagesAdapter;
  let messageService: MessageService;

  const mockContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin'],
    ipAddress: '192.168.1.1',
  };

  const mockMessage = {
    id: 'msg-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    name: 'John Doe',
    subject: 'Test Subject',
    message: 'This is a test message',
    type: 'CONTACT',
    phone: '+1-555-0100',
    status: 'NEW',
    reply: null,
    metadata: {},
    ipAddress: '192.168.1.1',
    repliedById: null,
    repliedAt: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MessagesAdapter,
        {
          provide: MessageService,
          useValue: {
            findById: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<MessagesAdapter>(MessagesAdapter);
    messageService = module.get<MessageService>(MessageService);
  });

  describe('createMessage', () => {
    it('should create a message with valid input', async () => {
      const input = {
        email: 'user@example.com',
        name: 'John',
        message: 'Test message',
      };
      jest.spyOn(messageService, 'create').mockResolvedValue(mockMessage);

      const result = await adapter.createMessage(input, mockContext);

      expect(result).toEqual(mockMessage);
      expect(messageService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          tenantId: 'tenant-1',
        }),
      );
    });

    it('should validate email format', async () => {
      const input = {
        email: 'invalid-email',
        message: 'Test',
      };

      await expect(
        adapter.createMessage(input, mockContext),
      ).rejects.toThrow('Valid email address is required');
    });

    it('should reject empty message', async () => {
      const input = {
        email: 'user@example.com',
        message: '   ',
      };

      await expect(
        adapter.createMessage(input, mockContext),
      ).rejects.toThrow('Message content is required');
    });

    it('should reject oversized message', async () => {
      const input = {
        email: 'user@example.com',
        message: 'a'.repeat(5001),
      };

      await expect(
        adapter.createMessage(input, mockContext),
      ).rejects.toThrow('Message must be less than 5000 characters');
    });
  });

  describe('replyToMessage', () => {
    it('should reply to a message', async () => {
      jest.spyOn(messageService, 'findById').mockResolvedValue(mockMessage);
      jest.spyOn(messageService, 'update').mockResolvedValue({
        ...mockMessage,
        reply: 'Thank you for your message',
        status: 'REPLIED',
      });

      const result = await adapter.replyToMessage(
        'msg-1',
        'Thank you for your message',
        mockContext,
      );

      expect(result.reply).toBe('Thank you for your message');
      expect(result.status).toBe('REPLIED');
      expect(messageService.update).toHaveBeenCalledWith(
        'msg-1',
        expect.objectContaining({
          reply: 'Thank you for your message',
          repliedById: 'user-1',
        }),
      );
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status', async () => {
      jest.spyOn(messageService, 'findById').mockResolvedValue(mockMessage);
      jest.spyOn(messageService, 'update').mockResolvedValue({
        ...mockMessage,
        status: 'ARCHIVED',
      });

      const result = await adapter.updateMessageStatus('msg-1', 'ARCHIVED', mockContext);

      expect(result.status).toBe('ARCHIVED');
    });

    it('should reject invalid status', async () => {
      jest.spyOn(messageService, 'findById').mockResolvedValue(mockMessage);

      await expect(
        adapter.updateMessageStatus('msg-1', 'INVALID_STATUS', mockContext),
      ).rejects.toThrow('Invalid status');
    });
  });
});
```

---

## Team Module Tests

### TeamAdapter Unit Tests

```typescript
// backend/src/core/graphql/adapters/__tests__/team.adapter.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TeamAdapter } from '../team.adapter.js';
import { TeamService } from '../../../services/team.service.js';

describe('TeamAdapter', () => {
  let adapter: TeamAdapter;
  let teamService: TeamService;

  const mockContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin'],
    ipAddress: '127.0.0.1',
  };

  const mockMember = {
    id: 'member-1',
    tenantId: 'tenant-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Product manager',
    socialLinks: { linkedin: 'jane-doe' },
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TeamAdapter,
        {
          provide: TeamService,
          useValue: {
            findById: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<TeamAdapter>(TeamAdapter);
    teamService = module.get<TeamService>(TeamService);
  });

  describe('createTeamMember', () => {
    it('should create a team member with valid input', async () => {
      const input = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'MEMBER',
      };
      jest.spyOn(teamService, 'create').mockResolvedValue(mockMember);

      const result = await adapter.createTeamMember(input, mockContext);

      expect(result).toEqual(mockMember);
      expect(teamService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          email: 'jane@example.com',
        }),
      );
    });

    it('should validate email format', async () => {
      const input = {
        name: 'Jane',
        email: 'invalid-email',
      };

      await expect(
        adapter.createTeamMember(input, mockContext),
      ).rejects.toThrow('Valid email address is required');
    });

    it('should validate role', async () => {
      const input = {
        name: 'Jane',
        email: 'jane@example.com',
        role: 'INVALID_ROLE',
      };

      await expect(
        adapter.createTeamMember(input, mockContext),
      ).rejects.toThrow('Invalid role');
    });
  });

  describe('updateTeamMemberRole', () => {
    it('should update team member role', async () => {
      jest.spyOn(teamService, 'findById').mockResolvedValue(mockMember);
      jest.spyOn(teamService, 'update').mockResolvedValue({
        ...mockMember,
        role: 'LEAD',
      });

      const result = await adapter.updateTeamMemberRole('member-1', 'LEAD', mockContext);

      expect(result.role).toBe('LEAD');
      expect(teamService.update).toHaveBeenCalledWith('member-1', { role: 'LEAD' });
    });

    it('should validate role before updating', async () => {
      await expect(
        adapter.updateTeamMemberRole('member-1', 'INVALID', mockContext),
      ).rejects.toThrow('Invalid role');
    });
  });

  describe('updateTeamMemberStatus', () => {
    it('should update team member status', async () => {
      jest.spyOn(teamService, 'findById').mockResolvedValue(mockMember);
      jest.spyOn(teamService, 'update').mockResolvedValue({
        ...mockMember,
        status: 'INACTIVE',
      });

      const result = await adapter.updateTeamMemberStatus(
        'member-1',
        'INACTIVE',
        mockContext,
      );

      expect(result.status).toBe('INACTIVE');
    });

    it('should validate status before updating', async () => {
      await expect(
        adapter.updateTeamMemberStatus('member-1', 'INVALID_STATUS', mockContext),
      ).rejects.toThrow('Invalid status');
    });
  });
});
```

---

## Adapter Base Tests

### BaseModuleAdapter Unit Tests

```typescript
// backend/src/core/graphql/adapters/__tests__/base.adapter.spec.ts
import { GraphQLError } from 'graphql';
import { BaseModuleAdapter } from '../base.adapter.js';

class TestAdapter extends BaseModuleAdapter {
  protected transformToGraphQL(data: any): any {
    return data;
  }

  protected transformFromGraphQL(input: any): any {
    return input;
  }
}

describe('BaseModuleAdapter', () => {
  let adapter: TestAdapter;

  const mockContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['admin'],
  };

  beforeEach(() => {
    adapter = new TestAdapter('test');
  });

  describe('ensureTenantOwnership', () => {
    it('should pass for matching tenant', () => {
      const resource = { tenantId: 'tenant-1' };

      expect(() => adapter['ensureTenantOwnership'](resource, mockContext)).not.toThrow();
    });

    it('should throw for mismatched tenant', () => {
      const resource = { tenantId: 'tenant-2' };

      expect(() => adapter['ensureTenantOwnership'](resource, mockContext)).toThrow(
        GraphQLError,
      );
    });
  });

  describe('handleServiceError', () => {
    it('should handle GraphQLError', () => {
      const error = new GraphQLError('Test error', {
        extensions: { code: 'INVALID_INPUT' },
      });

      expect(() => adapter['handleServiceError'](error, 'testOp')).toThrow(GraphQLError);
    });

    it('should handle generic Error', () => {
      const error = new Error('Database error');

      expect(() => adapter['handleServiceError'](error, 'testOp')).toThrow();
    });

    it('should add module context to error message', () => {
      const error = new Error('Test error');

      try {
        adapter['handleServiceError'](error, 'testOp');
      } catch (e) {
        expect(e.message).toContain('test');
      }
    });
  });
});
```

---

## Error Handling Tests

### Error Scenario Tests

```typescript
describe('Adapter Error Handling', () => {
  describe('Tenant Isolation Violations', () => {
    it('should prevent cross-tenant data access', async () => {
      // User from tenant-1 tries to access tenant-2 resource
      const wrongTenantContext = { ...mockContext, tenantId: 'tenant-2' };

      await expect(
        adapter.getDocument('doc-1', wrongTenantContext),
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent cross-tenant creation', async () => {
      const wrongTenantContext = { ...mockContext, tenantId: 'tenant-2' };

      await expect(
        adapter.createDocument({ title: 'Test', content: 'Test' }, wrongTenantContext),
      ).rejects.toThrow();
    });
  });

  describe('Authorization Failures', () => {
    it('should reject unprivileged operations', async () => {
      const limitedContext = { ...mockContext, roles: ['viewer'] };

      await expect(
        adapter.createDocument({ title: 'Test', content: 'Test' }, limitedContext),
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Data Validation Errors', () => {
    it('should catch malformed input', async () => {
      const input = { title: null, content: '' };

      await expect(adapter.createDocument(input, mockContext)).rejects.toThrow();
    });

    it('should enforce field length limits', async () => {
      const input = { title: 'a'.repeat(1000), content: 'Test' };

      await expect(adapter.createDocument(input, mockContext)).rejects.toThrow(
        'title must be less than',
      );
    });
  });

  describe('Service Failures', () => {
    it('should handle database connection errors', async () => {
      jest.spyOn(documentService, 'findById').mockRejectedValue(
        new Error('Connection timeout'),
      );

      await expect(adapter.getDocument('doc-1', mockContext)).rejects.toThrow();
    });

    it('should handle service timeouts', async () => {
      jest.spyOn(documentService, 'find').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 30000)),
      );

      // Test with shorter timeout
    });
  });
});
```

---

## Performance Tests

### Load Testing

```typescript
describe('Adapter Performance', () => {
  describe('List Operations', () => {
    it('should handle large pagination efficiently', async () => {
      const documents = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDocument,
        id: `doc-${i}`,
      }));

      jest.spyOn(documentService, 'find').mockResolvedValue(documents.slice(0, 10));
      jest.spyOn(documentService, 'count').mockResolvedValue(1000);

      const start = performance.now();
      await adapter.listDocuments({}, { page: 1, limit: 10 }, mockContext);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk updates efficiently', async () => {
      // Test bulk operation performance
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated operations', async () => {
      for (let i = 0; i < 1000; i++) {
        await adapter.listDocuments({}, { page: 1, limit: 10 }, mockContext);
      }

      // Memory should not grow unbounded
    });
  });
});
```

---

## Best Practices

### Test Setup

1. **Mock Services Consistently**: Always mock the underlying service with full interface coverage
2. **Test Both Happy Path and Error Cases**: Every adapter method needs success and failure tests
3. **Validate Tenant Isolation**: Every query/mutation must test tenant boundary enforcement
4. **Check Authorization**: Test role-based and permission-based access control
5. **Validate Input**: Test all validation rules, boundary conditions, and edge cases

### Coverage Goals

| Component | Target | Method |
|-----------|--------|--------|
| Adapters | 90%+ | Unit + Integration tests |
| Resolvers | 80%+ | Unit + E2E tests |
| Services | 85%+ | Unit tests |
| Overall | 85%+ | Combined |

### Running Tests

```bash
# Run all adapter tests
npm test -- --testPathPattern="adapter"

# Run specific adapter tests
npm test -- documents.adapter.spec.ts

# Run with coverage
npm test -- --coverage --testPathPattern="adapter"

# Watch mode for development
npm test -- --watch --testPathPattern="adapter"
```

---

**Version:** 1.0  
**Status:** Complete  
**Last Updated:** May 2026
