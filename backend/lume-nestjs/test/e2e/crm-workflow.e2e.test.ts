import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

/**
 * End-to-end tests for complete CRM workflows
 * Tests real user journeys from lead creation through conversion
 */
describe('CRM Workflow E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login and get auth token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'salesman@example.com',
        password: 'password123',
      },
    });

    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.data.accessToken;
    userId = loginData.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Lead Lifecycle Workflow', () => {
    let leadId: number;

    it('should create a new lead with auto-assignment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Lead/records',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          firstName: 'John',
          lastName: 'Prospect',
          email: 'john@prospect.com',
          company: 'Acme Corp',
          industry: 'Technology',
          source: 'web',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.owner).toBeDefined(); // Auto-assigned

      leadId = data.data.id;
    });

    it('should retrieve the created lead', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Lead/records/${leadId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.firstName).toBe('John');
      expect(data.data.lastName).toBe('Prospect');
      expect(data.data.fullName).toBe('John Prospect'); // Computed field
    });

    it('should update lead status to interested (triggers workflow)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Lead/records/${leadId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          status: 'interested',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('interested');
    });

    it('should verify lead-scoring workflow ran and updated score', async () => {
      // Wait for async workflow
      await new Promise((resolve) => setTimeout(resolve, 500));

      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Lead/records/${leadId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.leadScore).toBe(50); // Set by workflow for 'interested' status
    });

    it('should update lead to qualified and trigger opportunity creation', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Lead/records/${leadId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          status: 'qualified',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('qualified');
      expect(data.data.leadScore).toBe(100); // Updated by workflow
    });

    it('should verify opportunity was created by workflow', async () => {
      // Query for opportunities created for this lead
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          entity: 'Opportunity',
          filters: [
            { field: 'owner', operator: '==', value: userId.toString() },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBeGreaterThan(0);

      const opp = data.data[0];
      expect(opp.stage).toBe('prospect');
      expect(opp.probability).toBe(0);
    });

    it('should track lead version history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Lead/records/${leadId}/versions`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBeGreaterThanOrEqual(2); // At least create + update
      expect(data.data[0].changeType).toBe('create');
      expect(data.data[1].changeType).toBe('update');
    });
  });

  describe('Lead Access Control', () => {
    let otherUserId: number;
    let otherUserToken: string;
    let myLeadId: number;

    beforeAll(async () => {
      // Create a lead as salesman
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Lead/records',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          firstName: 'MyLead',
          lastName: 'Owned',
          email: 'my@lead.com',
          company: 'MyCompany',
        },
      });
      myLeadId = JSON.parse(response.body).data.id;

      // Login as different user
      const otherLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'other.salesman@example.com',
          password: 'password123',
        },
      });

      const otherData = JSON.parse(otherLogin.body);
      otherUserToken = otherData.data.accessToken;
      otherUserId = otherData.data.user.id;
    });

    it('should allow owner to read their own lead', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Lead/records/${myLeadId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny non-owner from reading lead (ABAC policy)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Lead/records/${myLeadId}`,
        headers: { Authorization: `Bearer ${otherUserToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should deny non-owner from writing lead', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Lead/records/${myLeadId}`,
        headers: { Authorization: `Bearer ${otherUserToken}` },
        payload: { status: 'lost' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow admin to read any lead (admin bypass)', async () => {
      // Login as admin
      const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@example.com',
          password: 'admin123',
        },
      });

      const adminData = JSON.parse(adminLogin.body);
      const adminToken = adminData.data.accessToken;

      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Lead/records/${myLeadId}`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Advanced Queries', () => {
    it('should query leads by multiple filters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          entity: 'Lead',
          filters: [
            { field: 'status', operator: '!=', value: 'closed' },
            { field: 'leadScore', operator: '>', value: '25' },
          ],
          pagination: { page: 1, limit: 10 },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.pagination).toBeDefined();
    });

    it('should search leads by text', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          entity: 'Lead',
          search: 'Acme',
          pagination: { page: 1, limit: 25 },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should group and aggregate leads', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          entity: 'Lead',
          groupBy: 'status',
          aggregations: ['count', 'avg:leadScore'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });
  });

  describe('Workflow Execution', () => {
    it('should manually execute lead-assignment workflow', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/workflows/lead-assignment/execute',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          recordId: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('completed');
    });

    it('should test workflow with sample data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/workflows/test/lead-scoring',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          sampleData: {
            status: 'qualified',
            leadScore: 50,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
    });
  });

  describe('AI-Powered Queries', () => {
    it('should ask natural language questions about leads', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/ask',
        headers: { Authorization: `Bearer ${authToken}` },
        payload: {
          entity: 'Lead',
          question: 'Show me my qualified leads with score above 75',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.answer).toBeDefined();
      expect(Array.isArray(data.data.records)).toBe(true);
    });
  });

  describe('Admin Operations', () => {
    it('should list all loaded modules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/modules',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.some((m: any) => m.name === 'crm')).toBe(true);
    });

    it('should list all available workflows', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/workflows',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.some((w: any) => w.name === 'lead-assignment')).toBe(true);
    });

    it('should list all policies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/policies',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.some((p: any) => p.name === 'lead-viewer-policy')).toBe(true);
    });
  });
});
