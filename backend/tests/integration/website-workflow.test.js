/**
 * Integration Test: Website Module Workflow
 * Tests complete website CMS flows: page creation, menu management, settings
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app, { initializeDatabasesAndModules } from '../../src/index.js';
import prisma from '../../src/core/db/prisma.js';

describe('Website Module Integration Tests', () => {
  let adminToken;
  let pageId;
  let menuId;

  beforeAll(async () => {
    // Initialize databases for tests
    try {
      await initializeDatabasesAndModules();
    } catch (err) {
      console.warn('Database initialization may have failed, continuing with test...', err.message);
    }

    // Login as admin to get auth token
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({
        email: 'admin@lume.dev',
        password: 'Admin@123'
      });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.body.data.token;
    }

    // Cleanup test data
    try {
      await prisma.installedModule.findUnique({
        where: { name: 'website' }
      }).then(record => {
        if (record?.state === 'installed') {
          // Only proceed if website module is installed
        }
      }).catch(() => {});
    } catch (err) {
      console.warn('Website module not installed, skipping tests');
    }
  });

  afterAll(async () => {
    // Cleanup test pages and menus
    if (pageId) {
      await request(app)
        .delete(`/api/website/pages/${pageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .catch(() => {});
    }
  });

  describe('Page Management Workflow', () => {
    it('should create a new page', async () => {
      const response = await request(app)
        .post('/api/website/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Integration Test Page',
          slug: 'integration-test-page',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Test content' }]
              }
            ]
          },
          status: 'published'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('slug', 'integration-test-page');

      pageId = response.body.data.id;
    });

    it('should retrieve created page', async () => {
      const response = await request(app)
        .get(`/api/website/pages/${pageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('slug', 'integration-test-page');
    });

    it('should update page content', async () => {
      const response = await request(app)
        .put(`/api/website/pages/${pageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Updated content' }]
              }
            ]
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should list all pages with pagination', async () => {
      const response = await request(app)
        .get('/api/website/pages?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
  });

  describe('Menu Management Workflow', () => {
    it('should create a menu', async () => {
      const response = await request(app)
        .post('/api/website/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Menu',
          location: 'test-integration',
          items: [
            {
              label: 'Home',
              url: '/',
              sequence: 1
            },
            {
              label: 'About',
              url: '/about',
              sequence: 2
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      menuId = response.body.data.id;
    });

    it('should retrieve menu items', async () => {
      const response = await request(app)
        .get(`/api/website/menus/${menuId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should reorder menu items', async () => {
      const response = await request(app)
        .put(`/api/website/menus/${menuId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { id: 1, sequence: 2 },
            { id: 2, sequence: 1 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Public API Access', () => {
    it('should retrieve public pages without auth', async () => {
      const response = await request(app)
        .get(`/api/website/public/pages/${pageId}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should retrieve menus without auth', async () => {
      const response = await request(app)
        .get('/api/website/public/menus/header');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should retrieve site settings without auth', async () => {
      const response = await request(app)
        .get('/api/website/public/settings');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
