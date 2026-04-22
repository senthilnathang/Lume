/**
 * Integration Test: Entity Records REST API Routes
 * Tests HTTP endpoints for record CRUD operations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import prisma from '../../src/core/db/prisma.js';
import express from 'express';
import createRoutes from '../../src/modules/base/api/index.js';
import { createServices } from '../../src/modules/base/services/index.js';

describe('Entity Records REST API Routes', () => {
  let app;
  let baseRouter;
  let testEntityId;
  let testRecordId;
  const testCompanyId = 1;
  const testUserId = 1;

  beforeAll(async () => {
    // Set up Express app
    app = express();
    app.use(express.json());

    // Mock middleware to set user and companyId
    app.use((req, res, next) => {
      req.user = { id: testUserId, companyId: testCompanyId };
      next();
    });

    // Mount routes
    const services = createServices({});
    baseRouter = createRoutes({}, services);
    app.use('/api', baseRouter);

    // Create test entity
    const entity = await prisma.entity.create({
      data: {
        name: 'test_api_entity',
        label: 'Test API Entity',
        description: 'Entity for testing API',
        createdBy: testUserId
      }
    });

    testEntityId = entity.id;

    // Add fields
    await prisma.entityField.createMany({
      data: [
        {
          entityId: testEntityId,
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          sequence: 0,
          slug: 'title'
        },
        {
          entityId: testEntityId,
          name: 'price',
          label: 'Price',
          type: 'number',
          required: false,
          sequence: 1,
          slug: 'price'
        }
      ]
    });

    // Clean up any existing test records
    await prisma.entityRecord.deleteMany({
      where: { entityId: testEntityId }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.entityRecord.deleteMany({
      where: { entityId: testEntityId }
    });

    await prisma.entityField.deleteMany({
      where: { entityId: testEntityId }
    });

    await prisma.entity.delete({
      where: { id: testEntityId }
    });
  });

  describe('POST /entities/:id/records', () => {
    it('creates a record with valid data', async () => {
      const response = await request(app)
        .post(`/api/entities/${testEntityId}/records`)
        .send({
          title: 'Test Product',
          price: 99.99
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.data.title).toBe('Test Product');
      expect(response.body.message).toBe('Record created successfully');

      testRecordId = response.body.data.id;
    });

    it('returns 400 for validation error (missing required field)', async () => {
      const response = await request(app)
        .post(`/api/entities/${testEntityId}/records`)
        .send({
          price: 50.00
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.title).toBeDefined();
    });

    it('returns 500 for non-existent entity', async () => {
      const response = await request(app)
        .post(`/api/entities/99999/records`)
        .send({
          title: 'Test'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /entities/:id/records', () => {
    it('lists records with pagination', async () => {
      const response = await request(app)
        .get(`/api/entities/${testEntityId}/records`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('supports custom pagination', async () => {
      const response = await request(app)
        .get(`/api/entities/${testEntityId}/records`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('parses filters from query', async () => {
      const filters = JSON.stringify([
        { field: 'title', operator: 'contains', value: 'Test' }
      ]);

      const response = await request(app)
        .get(`/api/entities/${testEntityId}/records`)
        .query({ filters });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /entities/:id/records/:recordId', () => {
    it('retrieves a single record', async () => {
      const response = await request(app)
        .get(`/api/entities/${testEntityId}/records/${testRecordId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testRecordId);
      expect(response.body.data.data.title).toBe('Test Product');
    });

    it('returns 404 for non-existent record', async () => {
      const response = await request(app)
        .get(`/api/entities/${testEntityId}/records/99999`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /entities/:id/records/:recordId', () => {
    it('updates a record', async () => {
      const response = await request(app)
        .put(`/api/entities/${testEntityId}/records/${testRecordId}`)
        .send({
          title: 'Updated Product',
          price: 149.99
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data.title).toBe('Updated Product');
      expect(response.body.data.data.price).toBe(149.99);
      expect(response.body.message).toBe('Record updated successfully');
    });

    it('returns 400 for validation error', async () => {
      const response = await request(app)
        .put(`/api/entities/${testEntityId}/records/${testRecordId}`)
        .send({
          title: '' // Empty required field
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('returns 404 for non-existent record', async () => {
      const response = await request(app)
        .put(`/api/entities/${testEntityId}/records/99999`)
        .send({
          title: 'Updated'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /entities/:id/records/:recordId', () => {
    it('soft deletes a record', async () => {
      // Create a record to delete
      const created = await prisma.entityRecord.create({
        data: {
          entityId: testEntityId,
          data: JSON.stringify({ title: 'To Delete' }),
          createdBy: testUserId,
          companyId: testCompanyId,
          visibility: 'private'
        }
      });

      const response = await request(app)
        .delete(`/api/entities/${testEntityId}/records/${created.id}`)
        .query({ hard: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Record deleted successfully');

      // Verify it's not accessible
      const getResponse = await request(app)
        .get(`/api/entities/${testEntityId}/records/${created.id}`);

      expect(getResponse.status).toBe(404);
    });

    it('hard deletes a record', async () => {
      // Create a record to delete
      const created = await prisma.entityRecord.create({
        data: {
          entityId: testEntityId,
          data: JSON.stringify({ title: 'To Hard Delete' }),
          createdBy: testUserId,
          companyId: testCompanyId,
          visibility: 'private'
        }
      });

      const response = await request(app)
        .delete(`/api/entities/${testEntityId}/records/${created.id}`)
        .query({ hard: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's completely gone
      const record = await prisma.entityRecord.findUnique({
        where: { id: created.id }
      });

      expect(record).toBeNull();
    });

    it('returns 404 for non-existent record', async () => {
      const response = await request(app)
        .delete(`/api/entities/${testEntityId}/records/99999`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Company Scoping', () => {
    it('scopes records to company from middleware', async () => {
      // Create a record
      const created = await prisma.entityRecord.create({
        data: {
          entityId: testEntityId,
          data: JSON.stringify({ title: 'Company Scoped' }),
          createdBy: testUserId,
          companyId: testCompanyId,
          visibility: 'private'
        }
      });

      // Create custom app with different company
      const app2 = express();
      app2.use(express.json());
      app2.use((req, res, next) => {
        req.user = { id: testUserId, companyId: 999 };
        next();
      });

      const services = createServices({});
      const router = createRoutes({}, services);
      app2.use('/api', router);

      // Try to access from different company
      const response = await request(app2)
        .get(`/api/entities/${testEntityId}/records/${created.id}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
