/**
 * @fileoverview Phase 9 Advanced Features Tests
 * Tests for real-time subscriptions, GraphQL, OpenAPI, search, files, and batch operations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import WebSocketManager from '../../src/core/realtime/websocket-manager.js';
import GraphQLSchemaGenerator from '../../src/core/graphql/graphql-schema-generator.js';
import OpenAPIGenerator from '../../src/core/docs/openapi-generator.js';
import FullTextSearch from '../../src/core/search/full-text-search.js';
import FileStorage from '../../src/core/storage/file-storage.js';
import BatchOptimizer from '../../src/core/batch/batch-optimizer.js';

describe('Phase 9: Advanced Features', () => {
  describe('WebSocket Manager (Real-time Subscriptions)', () => {
    let wsManager;

    beforeEach(() => {
      wsManager = new WebSocketManager();
    });

    it('should create subscription', () => {
      const subId = wsManager.subscribe('ticket', 'user1');

      expect(subId).toMatch(/^sub_\d+_\d+$/);
      expect(wsManager.subscriptions.size).toBe(1);
    });

    it('should unsubscribe', () => {
      const subId = wsManager.subscribe('ticket', 'user1');
      wsManager.unsubscribe(subId);

      expect(wsManager.subscriptions.size).toBe(0);
    });

    it('should index subscriptions by user', () => {
      const subId1 = wsManager.subscribe('ticket', 'user1');
      const subId2 = wsManager.subscribe('task', 'user1');

      const userSubs = wsManager.getUserSubscriptions('user1');

      expect(userSubs).toHaveLength(2);
    });

    it('should index subscriptions by entity', () => {
      wsManager.subscribe('ticket', 'user1');
      wsManager.subscribe('ticket', 'user2');
      wsManager.subscribe('task', 'user3');

      const ticketSubs = wsManager.getEntitySubscriptions('ticket');

      expect(ticketSubs).toHaveLength(2);
    });

    it('should filter records by subscription filter', () => {
      const subId = wsManager.subscribe('ticket', 'user1', { status: 'open' });
      const sub = wsManager.subscriptions.get(subId);

      const openTicket = { id: 1, status: 'open' };
      const closedTicket = { id: 2, status: 'closed' };

      expect(wsManager.matchesFilter(openTicket, sub.filter)).toBe(true);
      expect(wsManager.matchesFilter(closedTicket, sub.filter)).toBe(false);
    });

    it('should broadcast entity changes', async () => {
      wsManager.subscribe('ticket', 'user1');
      wsManager.subscribe('ticket', 'user2');

      await wsManager.broadcast('ticket', 'create', { id: 1, title: 'New' }, {});

      expect(wsManager.subscriptions.size).toBe(2);
    });

    it('should get connection statistics', () => {
      wsManager.subscribe('ticket', 'user1');
      wsManager.subscribe('ticket', 'user2');
      wsManager.subscribe('task', 'user1');

      const stats = wsManager.getStats();

      expect(stats.totalSubscriptions).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.uniqueEntities).toBe(2);
    });

    it('should clear all subscriptions', () => {
      wsManager.subscribe('ticket', 'user1');
      wsManager.subscribe('task', 'user2');

      wsManager.clear();

      expect(wsManager.subscriptions.size).toBe(0);
      expect(wsManager.userConnections.size).toBe(0);
      expect(wsManager.entitySubscribers.size).toBe(0);
    });
  });

  describe('GraphQL Schema Generator', () => {
    let mockEntity;

    beforeEach(() => {
      mockEntity = {
        slug: 'ticket',
        label: 'Ticket',
        tableName: 'tickets',
        auditable: true,
        softDelete: true,
        fields: [
          { name: 'title', type: 'text', required: true, description: 'Ticket title' },
          { name: 'status', type: 'select', required: true, validation: [{ rule: 'enum', values: ['open', 'closed'] }] },
          { name: 'priority', type: 'number' },
          { name: 'computed', type: 'text', computed: true },
        ],
        relations: [
          { name: 'assignedTo', type: 'many-to-one', required: false },
        ],
      };
    });

    it('should generate GraphQL type', () => {
      const type = GraphQLSchemaGenerator.generateType(mockEntity);

      expect(type).toContain('type Ticket');
      expect(type).toContain('id: ID!');
      expect(type).toContain('title: String!');
      expect(type).toContain('status: String!');
      expect(type).toContain('createdAt: DateTime!');
      expect(type).toContain('deletedAt: DateTime');
      expect(type).not.toContain('computed');
    });

    it('should generate create input', () => {
      const input = GraphQLSchemaGenerator.generateCreateInput(mockEntity);

      expect(input).toContain('input CreateTicketInput');
      expect(input).toContain('title: String!');
      expect(input).toContain('status: String!');
      expect(input).not.toContain('createdAt');
      expect(input).not.toContain('id:');
    });

    it('should generate update input', () => {
      const input = GraphQLSchemaGenerator.generateUpdateInput(mockEntity);

      expect(input).toContain('input UpdateTicketInput');
      expect(input).toContain('title: String');
      expect(input).toContain('status: String');
      expect(input).not.toContain('title: String!');
    });

    it('should generate queries', () => {
      const queries = GraphQLSchemaGenerator.generateQueries(mockEntity);

      expect(queries).toContain('ticket(id: ID!): Ticket');
      expect(queries).toContain('tickets(');
      expect(queries).toContain('ticketCount(');
    });

    it('should generate mutations', () => {
      const mutations = GraphQLSchemaGenerator.generateMutations(mockEntity);

      expect(mutations).toContain('createTicket(');
      expect(mutations).toContain('updateTicket(');
      expect(mutations).toContain('deleteTicket(');
      expect(mutations).toContain('deleteTickets(');
    });

    it('should generate full schema', () => {
      const schema = GraphQLSchemaGenerator.generateFullSchema([mockEntity]);

      expect(schema).toContain('scalar DateTime');
      expect(schema).toContain('type Ticket');
      expect(schema).toContain('input CreateTicketInput');
      expect(schema).toContain('type Query');
      expect(schema).toContain('type Mutation');
    });
  });

  describe('OpenAPI Generator', () => {
    let mockEntity;

    beforeEach(() => {
      mockEntity = {
        slug: 'ticket',
        label: 'Ticket',
        description: 'Support ticket',
        tableName: 'tickets',
        auditable: true,
        softDelete: true,
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'status', type: 'select', required: true },
        ],
        relations: [],
      };
    });

    it('should generate OpenAPI spec', () => {
      const spec = OpenAPIGenerator.generateSpec([mockEntity], {
        title: 'API',
        version: '1.0.0',
      });

      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBe('API');
      expect(spec.paths).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
    });

    it('should generate schema with properties', () => {
      const spec = OpenAPIGenerator.generateSpec([mockEntity]);
      const schema = spec.components.schemas.TicketType;

      expect(schema.type).toBe('object');
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.title).toBeDefined();
      expect(schema.properties.status).toBeDefined();
      expect(schema.properties.createdAt).toBeDefined();
    });

    it('should generate CRUD paths', () => {
      const spec = OpenAPIGenerator.generateSpec([mockEntity]);

      expect(spec.paths['/ticket']).toBeDefined();
      expect(spec.paths['/ticket/{id}']).toBeDefined();
      expect(spec.paths['/ticket'].get).toBeDefined();
      expect(spec.paths['/ticket'].post).toBeDefined();
      expect(spec.paths['/ticket/{id}'].put).toBeDefined();
      expect(spec.paths['/ticket/{id}'].delete).toBeDefined();
    });
  });

  describe('Full-Text Search', () => {
    let search;

    beforeEach(() => {
      search = new FullTextSearch();
    });

    it('should index document', async () => {
      await search.indexDocument('ticket', 1, {
        title: 'Login issue',
        description: 'Cannot login to system',
      });

      const stats = search.getStats('ticket');

      expect(stats.documents).toBe(1);
    });

    it('should tokenize text', async () => {
      const data = { title: 'Hello World Test' };
      const tokens = search.tokenize(data, ['title']);

      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
      expect(tokens).toContain('test');
    });

    it('should search documents', async () => {
      await search.indexDocument('ticket', 1, { title: 'Login issue', description: 'Cannot login' });
      await search.indexDocument('ticket', 2, { title: 'Payment problem', description: 'Invoice error' });

      const results = search.search('ticket', 'login');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].docId).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should perform phrase search', async () => {
      await search.indexDocument('ticket', 1, { title: 'Cannot login to system' });
      await search.indexDocument('ticket', 2, { title: 'System cannot start' });

      const results = search.phraseSearch('ticket', 'cannot login');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].docId).toBe(1);
    });

    it('should provide autocomplete suggestions', async () => {
      await search.indexDocument('ticket', 1, { title: 'Login issue' });
      await search.indexDocument('ticket', 2, { title: 'Logout error' });

      const suggestions = search.autocomplete('ticket', 'log');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('login');
    });

    it('should remove document from index', async () => {
      await search.indexDocument('ticket', 1, { title: 'Test' });
      await search.removeDocument('ticket', 1);

      const stats = search.getStats('ticket');

      expect(stats.documents).toBe(0);
    });

    it('should get statistics', async () => {
      await search.indexDocument('ticket', 1, { title: 'Test' });

      const stats = search.getStats();

      expect(stats.totalEntities).toBeGreaterThan(0);
      expect(stats.totalDocuments).toBeGreaterThan(0);
    });
  });

  describe('File Storage', () => {
    let storage;
    let mockFile;

    beforeEach(() => {
      storage = new FileStorage({
        maxFileSize: 1000000,
        allowedMimes: ['text/plain', 'application/json'],
      });

      mockFile = {
        buffer: Buffer.from('test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 12,
      };
    });

    it('should upload file', async () => {
      const metadata = await storage.upload(mockFile, {
        entity: 'ticket',
        recordId: 1,
        userId: 'user1',
      });

      expect(metadata.id).toMatch(/^file_/);
      expect(metadata.originalName).toBe('test.txt');
      expect(metadata.mimeType).toBe('text/plain');
      expect(metadata.size).toBe(12);
    });

    it('should reject oversized files', async () => {
      const bigFile = {
        ...mockFile,
        size: 2000000,
      };

      await expect(storage.upload(bigFile)).rejects.toThrow('File too large');
    });

    it('should reject disallowed MIME types', async () => {
      const badFile = {
        ...mockFile,
        mimetype: 'application/exe',
      };

      await expect(storage.upload(badFile)).rejects.toThrow('File type not allowed');
    });

    it('should get file metadata', async () => {
      const metadata = await storage.upload(mockFile);
      const retrieved = storage.getMetadata(metadata.id);

      expect(retrieved).toEqual(metadata);
    });

    it('should list files by entity', async () => {
      await storage.upload(mockFile, { entity: 'ticket', recordId: 1 });
      await storage.upload(mockFile, { entity: 'ticket', recordId: 2 });
      await storage.upload(mockFile, { entity: 'task', recordId: 1 });

      const ticketFiles = storage.listFiles('ticket');

      expect(ticketFiles).toHaveLength(2);
    });

    it('should list files by record', async () => {
      await storage.upload(mockFile, { entity: 'ticket', recordId: 1 });
      await storage.upload(mockFile, { entity: 'ticket', recordId: 1 });
      await storage.upload(mockFile, { entity: 'ticket', recordId: 2 });

      const recordFiles = storage.listFiles('ticket', 1);

      expect(recordFiles).toHaveLength(2);
    });

    it('should get storage statistics', async () => {
      await storage.upload(mockFile);
      await storage.upload(mockFile);

      const stats = storage.getStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBe(24);
    });

    it('should delete file', async () => {
      const metadata = await storage.upload(mockFile);
      await storage.delete(metadata.id);

      expect(storage.getMetadata(metadata.id)).toBeUndefined();
    });
  });

  describe('Batch Optimizer', () => {
    let optimizer;
    let mockAdapter;

    beforeEach(() => {
      optimizer = new BatchOptimizer();
      mockAdapter = {
        create: async (entity, record) => ({ id: 1, ...record }),
        update: async (entity, id, data) => ({ id, ...data }),
        delete: async (entity, id) => true,
      };
    });

    it('should estimate batch performance', () => {
      const estimate = optimizer.estimatePerformance(1000, 'insert');

      expect(estimate.operation).toBe('insert');
      expect(estimate.recordCount).toBe(1000);
      expect(estimate.improvement).toMatch(/\d+%/);
    });

    it('should optimize batch insert', async () => {
      const records = [
        { title: 'Test 1' },
        { title: 'Test 2' },
        { title: 'Test 3' },
      ];

      const results = await optimizer.optimizeBatchInsert(mockAdapter, 'ticket', records);

      expect(results).toHaveLength(3);
    });

    it('should handle empty batch insert', async () => {
      const results = await optimizer.optimizeBatchInsert(mockAdapter, 'ticket', []);

      expect(results).toHaveLength(0);
    });

    it('should optimize batch update', async () => {
      const updates = [
        { id: 1, data: { status: 'closed' } },
        { id: 2, data: { status: 'open' } },
      ];

      const count = await optimizer.optimizeBatchUpdate(mockAdapter, 'ticket', updates);

      expect(count).toBe(2);
    });

    it('should optimize batch delete', async () => {
      const ids = [1, 2, 3];

      const count = await optimizer.optimizeBatchDelete(mockAdapter, 'ticket', ids);

      expect(count).toBe(3);
    });

    it('should estimate performance for different operations', () => {
      const insertEst = optimizer.estimatePerformance(1000, 'insert');
      const updateEst = optimizer.estimatePerformance(1000, 'update');
      const deleteEst = optimizer.estimatePerformance(1000, 'delete');

      expect(insertEst.operation).toBe('insert');
      expect(updateEst.operation).toBe('update');
      expect(deleteEst.operation).toBe('delete');
    });
  });
});
