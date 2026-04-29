import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

/**
 * End-to-end tests for complete project management workflows
 * Tests team collaboration from project creation through completion
 */
describe('Project Management Workflow E2E', () => {
  let app: INestApplication;
  let pmToken: string;
  let devToken: string;
  let devToken2: string;
  let pmId: number;
  let devId: number;
  let devId2: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as project manager
    const pmLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'pm@example.com',
        password: 'password123',
      },
    });

    const pmData = JSON.parse(pmLogin.body);
    pmToken = pmData.data.accessToken;
    pmId = pmData.data.user.id;

    // Login as developer 1
    const devLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'dev1@example.com',
        password: 'password123',
      },
    });

    const devData = JSON.parse(devLogin.body);
    devToken = devData.data.accessToken;
    devId = devData.data.user.id;

    // Login as developer 2
    const dev2Login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'dev2@example.com',
        password: 'password123',
      },
    });

    const dev2Data = JSON.parse(dev2Login.body);
    devToken2 = dev2Data.data.accessToken;
    devId2 = dev2Data.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Project Creation & Team Setup', () => {
    let projectId: number;

    it('should create a project (PM)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Project/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          name: 'Website Redesign',
          description: 'Redesign company website',
          projectManager: pmId,
          startDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          budget: 50000,
          category: 'Development',
          priority: 'high',
          teamMembers: [pmId, devId, devId2],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.teamMembers).toContain(pmId);

      projectId = data.data.id;
    });

    it('should compute project budget metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Project/records/${projectId}`,
        headers: { Authorization: `Bearer ${pmToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.remainingBudget).toBe(50000); // budget - spentAmount (0)
      expect(data.data.isOverBudget).toBe(false);
      expect(data.data.daysRemaining).toBeDefined();
      expect(data.data.daysRemaining).toBeGreaterThan(0);
    });

    it('should allow team members to view project', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${devToken}` },
        payload: {
          entity: 'Project',
          filters: [{ field: 'name', operator: '==', value: 'Website Redesign' }],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Task Management Workflow', () => {
    let projectId: number;
    let taskId: number;

    beforeAll(async () => {
      // Create project first
      const projResponse = await app.inject({
        method: 'POST',
        url: '/api/entities/Project/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          name: 'API Development',
          projectManager: pmId,
          teamMembers: [pmId, devId],
          budget: 30000,
        },
      });

      projectId = JSON.parse(projResponse.body).data.id;
    });

    it('should create tasks in project (PM)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/Task/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          title: 'Implement user authentication',
          description: 'Add JWT-based auth',
          projectId,
          status: 'todo',
          priority: 'high',
          createdBy: pmId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          estimatedHours: 8,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('todo');
      taskId = data.data.id;
    });

    it('should assign task to developer', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: { assignedTo: devId },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.assignedTo).toBe(devId);
    });

    it('should allow assignee to start task', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${devToken}` },
        payload: { status: 'in-progress' },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('in-progress');
    });

    it('should compute task completion metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${devToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.percentComplete).toBe(50); // in-progress = 50%
      expect(data.data.isOverdue).toBe(false);
    });

    it('should mark task done and trigger project completion check', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${devToken}` },
        payload: {
          status: 'done',
          actualHours: 7.5,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.status).toBe('done');
      expect(data.data.completedAt).toBeDefined();
    });

    it('should track task hours variance', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${pmToken}` },
      });

      const data = JSON.parse(response.body);
      expect(data.data.hoursVariance).toBe(-0.5); // 7.5 - 8
      expect(data.data.percentComplete).toBe(100);
    });
  });

  describe('Time Tracking', () => {
    let taskId: number;

    beforeAll(async () => {
      // Create a project and task
      const projResponse = await app.inject({
        method: 'POST',
        url: '/api/entities/Project/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          name: 'Mobile App',
          projectManager: pmId,
          budget: 40000,
        },
      });

      const projectId = JSON.parse(projResponse.body).data.id;

      const taskResponse = await app.inject({
        method: 'POST',
        url: '/api/entities/Task/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          title: 'UI Implementation',
          projectId,
          status: 'in-progress',
          createdBy: pmId,
          assignedTo: devId,
        },
      });

      taskId = JSON.parse(taskResponse.body).data.id;
    });

    it('should log time entry', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/entities/TimeEntry/records',
        headers: { Authorization: `Bearer ${devToken}` },
        payload: {
          taskId,
          projectId: 1,
          userId: devId,
          hours: 4,
          notes: 'Worked on dashboard UI',
          entryDate: new Date().toISOString().split('T')[0],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.hours).toBe(4);
    });

    it('should compute billable amount for time entry', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          entity: 'TimeEntry',
          filters: [{ field: 'userId', operator: '==', value: devId.toString() }],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      if (data.data.length > 0) {
        const entry = data.data[0];
        expect(entry.billableAmount).toBe(entry.hours * 150); // $150/hour
      }
    });

    it('should show time tracking reports by user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          entity: 'TimeEntry',
          groupBy: 'userId',
          aggregations: ['sum:hours', 'sum:billableAmount'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });
  });

  describe('Team Collaboration & Permissions', () => {
    let projectId: number;
    let taskId: number;

    beforeAll(async () => {
      // Create project
      const projResponse = await app.inject({
        method: 'POST',
        url: '/api/entities/Project/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          name: 'Backend Services',
          projectManager: pmId,
          teamMembers: [pmId, devId],
          budget: 25000,
        },
      });

      projectId = JSON.parse(projResponse.body).data.id;

      // Create task
      const taskResponse = await app.inject({
        method: 'POST',
        url: '/api/entities/Task/records',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          title: 'Database optimization',
          projectId,
          createdBy: pmId,
          assignedTo: devId,
        },
      });

      taskId = JSON.parse(taskResponse.body).data.id;
    });

    it('should allow project members to view tasks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${devToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should allow assignee to edit their task', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${devToken}` },
        payload: { status: 'in-progress' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should deny non-team-member from viewing project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/entities/Project/records/${projectId}`,
        headers: { Authorization: `Bearer ${devToken2}` }, // Not on team
      });

      expect(response.statusCode).toBe(403);
    });

    it('should allow PM to edit any task', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/entities/Task/records/${taskId}`,
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: { priority: 'critical' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Project Analytics', () => {
    it('should show project status distribution', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          entity: 'Project',
          groupBy: 'status',
          aggregations: ['count'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });

    it('should show task completion rates by project', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          entity: 'Task',
          groupBy: 'projectId',
          aggregations: ['count', 'sum:percentComplete'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });

    it('should show team workload distribution', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/query',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          entity: 'Task',
          filters: [{ field: 'status', operator: '!=', value: 'done' }],
          groupBy: 'assignedTo',
          aggregations: ['count', 'sum:estimatedHours'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.aggregations).toBeDefined();
    });
  });

  describe('Scheduled Reminders', () => {
    it('should have due-soon reminder workflow', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/workflows',
        headers: { Authorization: `Bearer ${pmToken}` },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const reminderWf = data.data.find(
        (w: any) => w.name === 'task-due-soon-reminder',
      );
      expect(reminderWf).toBeDefined();
      expect(reminderWf.trigger.type).toBe('schedule');
    });
  });
});
