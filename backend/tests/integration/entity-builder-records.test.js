/**
 * Integration Test: Entity Records CRUD REST API Routes
 * Tests record creation, retrieval, updating, deletion with company scoping
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import prisma from '../../src/core/db/prisma.js';
import { EntityBuilderService } from '../../src/modules/base/services/entity-builder.service.js';
import { RecordService } from '../../src/modules/base/services/record.service.js';

describe('Entity Records CRUD Operations', () => {
  let builderService;
  let recordService;
  let testEntityId;
  let testRecordId;
  let testUserId = 1;
  let testCompanyId = 1;
  let anotherCompanyId = 2;

  beforeAll(async () => {
    builderService = new EntityBuilderService(prisma);
    recordService = new RecordService(prisma);

    // Clean up test data
    try {
      await prisma.entityRecord.deleteMany({
        where: { entity: { name: { startsWith: 'test_record_entity' } } }
      });
    } catch (e) {
      // Ignore
    }

    try {
      await prisma.entity.deleteMany({
        where: { name: { startsWith: 'test_record_entity' } }
      });
    } catch (e) {
      // Ignore
    }

    // Create a test entity
    const entity = await builderService.createEntity(testCompanyId, testUserId, {
      name: 'test_record_entity',
      label: 'Test Record Entity',
      description: 'Entity for testing records'
    });

    testEntityId = entity.id;

    // Add fields to entity
    await builderService.addField(testEntityId, {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true
    });

    await builderService.addField(testEntityId, {
      name: 'description',
      label: 'Description',
      type: 'text',
      required: false
    });

    await builderService.addField(testEntityId, {
      name: 'price',
      label: 'Price',
      type: 'number',
      required: false
    });

    await builderService.addField(testEntityId, {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: false
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.entityRecord.deleteMany({
        where: { entity: { name: { startsWith: 'test_record_entity' } } }
      });
    } catch (e) {
      // Ignore
    }

    try {
      await prisma.entity.deleteMany({
        where: { name: { startsWith: 'test_record_entity' } }
      });
    } catch (e) {
      // Ignore
    }
  });

  describe('POST /entities/:id/records - Create record', () => {
    it('creates a new record with valid data', async () => {
      const record = await recordService.createRecord(
        testEntityId,
        {
          title: 'Test Product',
          description: 'A test product',
          price: 99.99,
          email: 'test@example.com'
        },
        testCompanyId,
        testUserId
      );

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.entityId).toBe(testEntityId);
      expect(record.companyId).toBe(testCompanyId);
      expect(record.createdBy).toBe(testUserId);
      expect(record.data.title).toBe('Test Product');
      expect(record.data.price).toBe(99.99);
      expect(record.deletedAt).toBeNull();

      testRecordId = record.id;
    });

    it('creates a record with required fields only', async () => {
      const record = await recordService.createRecord(
        testEntityId,
        {
          title: 'Minimal Product'
        },
        testCompanyId,
        testUserId
      );

      expect(record).toBeDefined();
      expect(record.data.title).toBe('Minimal Product');
      expect(record.data.description).toBeUndefined();
    });

    it('throws validation error when required field is missing', async () => {
      await expect(
        recordService.createRecord(
          testEntityId,
          {
            description: 'Missing title'
          },
          testCompanyId,
          testUserId
        )
      ).rejects.toThrow('Validation failed');
    });

    it('throws validation error for invalid email', async () => {
      await expect(
        recordService.createRecord(
          testEntityId,
          {
            title: 'Test',
            email: 'not-an-email'
          },
          testCompanyId,
          testUserId
        )
      ).rejects.toThrow('Validation failed');
    });

    it('throws validation error for invalid number', async () => {
      await expect(
        recordService.createRecord(
          testEntityId,
          {
            title: 'Test',
            price: 'not-a-number'
          },
          testCompanyId,
          testUserId
        )
      ).rejects.toThrow('Validation failed');
    });

    it('throws error if entity does not exist', async () => {
      await expect(
        recordService.createRecord(
          99999,
          { title: 'Test' },
          testCompanyId,
          testUserId
        )
      ).rejects.toThrow('Entity not found');
    });
  });

  describe('GET /entities/:id/records - List records', () => {
    it('lists records with default pagination', async () => {
      const result = await recordService.listRecords(testEntityId, testCompanyId);

      expect(result).toBeDefined();
      expect(result.records).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBeGreaterThanOrEqual(2);
      expect(result.pagination.hasMore).toBeDefined();
    });

    it('respects custom page and limit', async () => {
      const result = await recordService.listRecords(testEntityId, testCompanyId, {
        page: 1,
        limit: 1
      });

      expect(result.records.length).toBeLessThanOrEqual(1);
      expect(result.pagination.limit).toBe(1);
    });

    it('returns empty array for non-existent entity', async () => {
      const result = await recordService.listRecords(99999, testCompanyId);

      expect(result.records).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('does not return records from other companies', async () => {
      const result = await recordService.listRecords(testEntityId, anotherCompanyId);

      expect(result.records).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('excludes soft-deleted records', async () => {
      // Create a record
      const record = await recordService.createRecord(
        testEntityId,
        { title: 'To Be Deleted' },
        testCompanyId,
        testUserId
      );

      // Soft delete it
      await recordService.deleteRecord(record.id, true, testCompanyId);

      // List records
      const result = await recordService.listRecords(testEntityId, testCompanyId);

      // Should not include deleted record
      const deletedRecord = result.records.find(r => r.id === record.id);
      expect(deletedRecord).toBeUndefined();
    });
  });

  describe('GET /entities/:id/records/:recordId - Get record', () => {
    it('retrieves a record by ID', async () => {
      const record = await recordService.getRecord(testRecordId, testCompanyId);

      expect(record).toBeDefined();
      expect(record.id).toBe(testRecordId);
      expect(record.entityId).toBe(testEntityId);
      expect(record.data).toBeDefined();
    });

    it('returns null if record not found', async () => {
      const record = await recordService.getRecord(99999, testCompanyId);

      expect(record).toBeNull();
    });

    it('returns null for wrong company', async () => {
      const record = await recordService.getRecord(testRecordId, anotherCompanyId);

      expect(record).toBeNull();
    });

    it('returns null for soft-deleted record', async () => {
      // Create and soft delete a record
      const created = await recordService.createRecord(
        testEntityId,
        { title: 'To Delete' },
        testCompanyId,
        testUserId
      );

      await recordService.deleteRecord(created.id, true, testCompanyId);

      // Try to get it
      const record = await recordService.getRecord(created.id, testCompanyId);

      expect(record).toBeNull();
    });
  });

  describe('PUT /entities/:id/records/:recordId - Update record', () => {
    it('updates record fields', async () => {
      const updated = await recordService.updateRecord(
        testRecordId,
        {
          description: 'Updated description',
          price: 149.99
        },
        testCompanyId
      );

      expect(updated).toBeDefined();
      expect(updated.id).toBe(testRecordId);
      expect(updated.data.description).toBe('Updated description');
      expect(updated.data.price).toBe(149.99);
      // Original field should remain
      expect(updated.data.title).toBe('Test Product');
    });

    it('throws validation error for invalid updates', async () => {
      await expect(
        recordService.updateRecord(
          testRecordId,
          { email: 'invalid-email' },
          testCompanyId
        )
      ).rejects.toThrow('Validation failed');
    });

    it('returns null if record not found', async () => {
      const updated = await recordService.updateRecord(
        99999,
        { title: 'Updated' },
        testCompanyId
      );

      expect(updated).toBeNull();
    });

    it('returns null for wrong company', async () => {
      const updated = await recordService.updateRecord(
        testRecordId,
        { title: 'Hacked' },
        anotherCompanyId
      );

      expect(updated).toBeNull();
    });
  });

  describe('DELETE /entities/:id/records/:recordId - Delete record', () => {
    it('soft deletes a record', async () => {
      // Create a record
      const record = await recordService.createRecord(
        testEntityId,
        { title: 'To Soft Delete' },
        testCompanyId,
        testUserId
      );

      // Soft delete
      const deleted = await recordService.deleteRecord(record.id, true, testCompanyId);

      expect(deleted).toBe(true);

      // Verify it's not accessible
      const retrieved = await recordService.getRecord(record.id, testCompanyId);
      expect(retrieved).toBeNull();
    });

    it('hard deletes a record', async () => {
      // Create a record
      const record = await recordService.createRecord(
        testEntityId,
        { title: 'To Hard Delete' },
        testCompanyId,
        testUserId
      );

      // Hard delete
      const deleted = await recordService.deleteRecord(record.id, false, testCompanyId);

      expect(deleted).toBe(true);

      // Verify it's gone from database
      const retrieved = await prisma.entityRecord.findUnique({
        where: { id: record.id }
      });
      expect(retrieved).toBeNull();
    });

    it('returns false if record not found', async () => {
      const deleted = await recordService.deleteRecord(99999, true, testCompanyId);

      expect(deleted).toBe(false);
    });

    it('returns false for wrong company', async () => {
      // Create a record
      const record = await recordService.createRecord(
        testEntityId,
        { title: 'Protected' },
        testCompanyId,
        testUserId
      );

      // Try to delete from different company
      const deleted = await recordService.deleteRecord(record.id, true, anotherCompanyId);

      expect(deleted).toBe(false);

      // Verify it still exists
      const retrieved = await recordService.getRecord(record.id, testCompanyId);
      expect(retrieved).toBeDefined();
    });
  });

  describe('Company Scoping', () => {
    it('isolates records by company ID', async () => {
      // Create records in different companies
      const record1 = await recordService.createRecord(
        testEntityId,
        { title: 'Company 1 Record' },
        testCompanyId,
        testUserId
      );

      const record2 = await recordService.createRecord(
        testEntityId,
        { title: 'Company 2 Record' },
        anotherCompanyId,
        testUserId
      );

      // Company 1 should see only their record
      const company1List = await recordService.listRecords(testEntityId, testCompanyId);
      const company1Has2 = company1List.records.some(r => r.id === record2.id);
      expect(company1Has2).toBe(false);

      // Company 2 should see only their record
      const company2List = await recordService.listRecords(testEntityId, anotherCompanyId);
      const company2Has1 = company2List.records.some(r => r.id === record1.id);
      expect(company2Has1).toBe(false);
    });

    it('prevents cross-company access via getRecord', async () => {
      // Create a record
      const record = await recordService.createRecord(
        testEntityId,
        { title: 'Secret' },
        testCompanyId,
        testUserId
      );

      // Another company cannot access it
      const retrieved = await recordService.getRecord(record.id, anotherCompanyId);
      expect(retrieved).toBeNull();
    });

    it('prevents cross-company updates', async () => {
      // Create a record
      const record = await recordService.createRecord(
        testEntityId,
        { title: 'Protected' },
        testCompanyId,
        testUserId
      );

      // Try to update from different company
      const updated = await recordService.updateRecord(
        record.id,
        { title: 'Hacked' },
        anotherCompanyId
      );

      expect(updated).toBeNull();

      // Verify original content
      const retrieved = await recordService.getRecord(record.id, testCompanyId);
      expect(retrieved.data.title).toBe('Protected');
    });
  });
});
