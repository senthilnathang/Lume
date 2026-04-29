/**
 * Entity CRUD REST API Routes
 *
 * Provides full CRUD operations for custom entities with publish/unpublish actions.
 * All routes return JSON with format: { success: boolean, data?: any, message?: string, errors?: object }
 *
 * Routes:
 *   POST   /              - Create entity
 *   GET    /              - List entities with pagination
 *   GET    /:id           - Get entity by ID
 *   PUT    /:id           - Update entity
 *   DELETE /:id           - Delete entity (soft delete)
 *   POST   /:id/publish   - Publish entity
 *   POST   /:id/unpublish - Unpublish entity
 */

import { Router } from 'express';
import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { EntityService } from '../../../core/services/entity.service.js';
import { customEntities, entityFields } from '../models/schema.js';

const createEntityRoutes = () => {
  const router = Router();

  // Initialize service
  const entityAdapter = new DrizzleAdapter(customEntities);
  const fieldsAdapter = new DrizzleAdapter(entityFields);
  const entityService = new EntityService(entityAdapter, fieldsAdapter);

  // POST / - Create entity
  router.post('/', async (req, res) => {
    try {
      const entity = await entityService.createEntity(req.body);
      res.status(201).json({
        success: true,
        data: entity,
        message: 'Entity created successfully',
      });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // GET / - List entities with pagination
  router.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await entityService.listEntities({ page, limit });

      res.json({
        success: true,
        data: result.items,
        message: 'Entities retrieved successfully',
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // GET /:id - Get entity by ID
  router.get('/:id', async (req, res) => {
    try {
      const entity = await entityService.getEntity(parseInt(req.params.id));

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      res.json({
        success: true,
        data: entity,
        message: 'Entity retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PUT /:id - Update entity
  router.put('/:id', async (req, res) => {
    try {
      const entity = await entityService.updateEntity(parseInt(req.params.id), req.body);

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      res.json({
        success: true,
        data: entity,
        message: 'Entity updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // DELETE /:id - Delete entity (soft delete)
  router.delete('/:id', async (req, res) => {
    try {
      const entity = await entityService.deleteEntity(parseInt(req.params.id));

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      res.json({
        success: true,
        data: entity,
        message: 'Entity deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /:id/publish - Publish entity
  router.post('/:id/publish', async (req, res) => {
    try {
      const entity = await entityService.publishEntity(parseInt(req.params.id));

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      res.json({
        success: true,
        data: entity,
        message: 'Entity published successfully',
      });
    } catch (error) {
      if (error.code === 'NOT_PUBLISHABLE') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /:id/unpublish - Unpublish entity
  router.post('/:id/unpublish', async (req, res) => {
    try {
      const entity = await entityService.unpublishEntity(parseInt(req.params.id));

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      res.json({
        success: true,
        data: entity,
        message: 'Entity unpublished successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
};

export default createEntityRoutes;
