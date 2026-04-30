/**
 * @fileoverview Entity Routes - Metadata endpoints for entity management
 * GET /api/entities - list all entities
 * GET /api/entities/:slug - get entity details
 * POST /api/entities - create entity dynamically
 * GET /api/entities/:slug/fields - entity fields
 * GET /api/entities/:slug/views - entity views
 */

import express from 'express';
import logger from '../core/services/logger.js';

/**
 * Create entity routes
 * @param {EntityStore} entityStore - Entity store
 * @param {MetadataRegistry} registry - Metadata registry
 * @returns {express.Router}
 */
function createEntityRoutes(entityStore, registry) {
  const router = express.Router();

  // GET /api/entities - List all entities
  router.get('/', async (req, res) => {
    try {
      const entities = await entityStore.list();
      res.json({
        success: true,
        data: entities,
      });
    } catch (error) {
      logger.error('[EntityRoutes] Error listing entities:', error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // GET /api/entities/:slug - Get entity details
  router.get('/:slug', async (req, res) => {
    try {
      const entity = await entityStore.get(req.params.slug);
      if (!entity) {
        return res.status(404).json({
          success: false,
          errors: [{ message: `Entity not found: ${req.params.slug}` }],
        });
      }

      res.json({
        success: true,
        data: entity,
      });
    } catch (error) {
      logger.error(`[EntityRoutes] Error getting entity ${req.params.slug}:`, error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // POST /api/entities - Create entity dynamically (runtime registration)
  router.post('/', async (req, res) => {
    try {
      const { defineEntity, entity: builderFunc } = await import('../domains/entity/entity-builder.js');
      const { entity: entityDef } = req.body;

      if (!entityDef) {
        return res.status(400).json({
          success: false,
          errors: [{ message: 'Entity definition required in request body' }],
        });
      }

      const registered = await entityStore.register(entityDef);

      res.status(201).json({
        success: true,
        data: registered,
      });
    } catch (error) {
      logger.error('[EntityRoutes] Error creating entity:', error.message);
      res.status(400).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // GET /api/entities/:slug/fields - Entity fields metadata
  router.get('/:slug/fields', async (req, res) => {
    try {
      const entity = await entityStore.get(req.params.slug);
      if (!entity) {
        return res.status(404).json({
          success: false,
          errors: [{ message: `Entity not found: ${req.params.slug}` }],
        });
      }

      // Include validation rules and config in response
      const fields = entity.fields.map(field => ({
        ...field,
        validationRules: field.validation || [],
      }));

      res.json({
        success: true,
        data: fields,
      });
    } catch (error) {
      logger.error(`[EntityRoutes] Error getting fields for ${req.params.slug}:`, error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // GET /api/entities/:slug/views - Entity views
  router.get('/:slug/views', async (req, res) => {
    try {
      const entity = await entityStore.get(req.params.slug);
      if (!entity) {
        return res.status(404).json({
          success: false,
          errors: [{ message: `Entity not found: ${req.params.slug}` }],
        });
      }

      const views = entity.views || [];

      res.json({
        success: true,
        data: views,
      });
    } catch (error) {
      logger.error(`[EntityRoutes] Error getting views for ${req.params.slug}:`, error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // GET /api/entities/:slug/permissions - Entity permissions
  router.get('/:slug/permissions', async (req, res) => {
    try {
      const entity = await entityStore.get(req.params.slug);
      if (!entity) {
        return res.status(404).json({
          success: false,
          errors: [{ message: `Entity not found: ${req.params.slug}` }],
        });
      }

      const permissions = entity.permissions || [];

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      logger.error(`[EntityRoutes] Error getting permissions for ${req.params.slug}:`, error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // PUT /api/entities/:slug - Update entity
  router.put('/:slug', async (req, res) => {
    try {
      const updated = await entityStore.update(req.params.slug, req.body);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error(`[EntityRoutes] Error updating entity ${req.params.slug}:`, error.message);
      res.status(400).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  // DELETE /api/entities/:slug - Delete entity
  router.delete('/:slug', async (req, res) => {
    try {
      await entityStore.unregister(req.params.slug);

      res.json({
        success: true,
        message: `Entity deleted: ${req.params.slug}`,
      });
    } catch (error) {
      logger.error(`[EntityRoutes] Error deleting entity ${req.params.slug}:`, error.message);
      res.status(400).json({
        success: false,
        errors: [{ message: error.message }],
      });
    }
  });

  logger.info('[EntityRoutes] Created entity routes');
  return router;
}

export default {
  createEntityRoutes,
};
