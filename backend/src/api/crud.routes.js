/**
 * @fileoverview CRUD Routes - Auto-generated REST API endpoints for all entities
 * Dynamically mounts routes based on registered entities
 * Routes flow through LumeRuntime.execute()
 */

import express from 'express';
import logger from '../core/services/logger.js';

/**
 * Create CRUD router for an entity
 * @param {string} slug - Entity slug
 * @param {LumeRuntime} runtime - Runtime instance
 * @param {Object} options - Router options
 * @returns {express.Router}
 */
function createEntityRouter(slug, runtime, options = {}) {
  const router = express.Router();

  /**
   * Helper to execute operation and send response
   */
  const executeOperation = async (req, res, action, extraData = {}) => {
    try {
      const result = await runtime.execute(
        {
          entity: slug,
          action,
          context: req.user ? { userId: req.user.id, roles: req.user.roles || [] } : undefined,
          data: { ...req.body, ...extraData, ...req.params },
          options: {
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            filters: req.query.filters ? JSON.parse(req.query.filters) : undefined,
            sort: req.query.sort ? JSON.parse(req.query.sort) : undefined,
            search: req.query.search,
            includeRelations: req.query.relations ? req.query.relations.split(',') : undefined,
          },
        },
        req
      );

      const statusCode = result.success ? (action === 'create' ? 201 : 200) : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error(`[CRUD] Error executing ${action} on ${slug}:`, error.message);
      res.status(500).json({
        success: false,
        errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
      });
    }
  };

  // POST /api/{slug} - Create
  router.post('/', (req, res) => executeOperation(req, res, 'create'));

  // GET /api/{slug} - List
  router.get('/', (req, res) => executeOperation(req, res, 'list'));

  // GET /api/{slug}/:id - Read (retrieve single record)
  router.get('/:id', (req, res) => executeOperation(req, res, 'read'));

  // PUT /api/{slug}/:id - Update
  router.put('/:id', (req, res) => {
    const data = { ...req.body, id: req.params.id };
    executeOperation(req, res, 'update', { id: req.params.id });
  });

  // DELETE /api/{slug}/:id - Delete
  router.delete('/:id', (req, res) => executeOperation(req, res, 'delete', { id: req.params.id }));

  // POST /api/{slug}/bulk - Bulk create/update/delete
  router.post('/bulk', (req, res) => executeOperation(req, res, 'bulk_create'));

  // POST /api/{slug}/search - Full-text search
  router.post('/search', (req, res) => executeOperation(req, res, 'search'));

  // GET /api/{slug}/views - List available views
  router.get('/views', async (req, res) => {
    try {
      const result = await runtime.execute(
        {
          entity: slug,
          action: 'views',
          context: req.user ? { userId: req.user.id, roles: req.user.roles || [] } : undefined,
        },
        req
      );
      res.json(result);
    } catch (error) {
      logger.error(`[CRUD] Error getting views for ${slug}:`, error.message);
      res.status(500).json({ success: false, errors: [{ message: error.message }] });
    }
  });

  // GET /api/{slug}/views/:viewId - Get view data
  router.get('/views/:viewId', (req, res) => {
    const viewId = req.params.viewId;
    executeOperation(req, res, 'view', { viewId });
  });

  // GET /api/{slug}/fields - Field metadata
  router.get('/fields', async (req, res) => {
    try {
      const result = await runtime.execute(
        {
          entity: slug,
          action: 'fields',
          context: req.user ? { userId: req.user.id, roles: req.user.roles || [] } : undefined,
        },
        req
      );
      res.json(result);
    } catch (error) {
      logger.error(`[CRUD] Error getting fields for ${slug}:`, error.message);
      res.status(500).json({ success: false, errors: [{ message: error.message }] });
    }
  });

  // GET /api/{slug}/:id/{relation} - Get related records
  router.get('/:id/:relation', (req, res) => {
    const { id, relation } = req.params;
    executeOperation(req, res, 'read_relation', { id, relation });
  });

  // POST /api/{slug}/:id/{relation} - Create related record
  router.post('/:id/:relation', (req, res) => {
    const { id, relation } = req.params;
    executeOperation(req, res, 'create_relation', { id, relation });
  });

  logger.info(`[CRUD] Created router for entity: ${slug}`);
  return router;
}

/**
 * Register CRUD routes for all entities
 * @param {express.Application} app - Express application
 * @param {LumeRuntime} runtime - Runtime instance
 * @param {EntityStore} entityStore - Entity store
 * @param {Object} options - Router options
 */
export async function registerCRUDRoutes(app, runtime, entityStore, options = {}) {
  const entities = await entityStore.list();

  for (const entity of entities) {
    const router = createEntityRouter(entity.slug, runtime, options);
    const basePath = options.basePath || '/api';
    app.use(`${basePath}/${entity.slug}`, router);

    logger.info(`[CRUD] Registered routes for entity: ${entity.slug}`);
  }
}

/**
 * Mount CRUD routes middleware
 * @param {Object} options - Options
 * @returns {Function} Express middleware
 */
export function crudRoutesMiddleware(options = {}) {
  return async (req, res, next) => {
    // Store options in request for route handlers
    req.crudOptions = options;
    next();
  };
}

export default {
  createEntityRouter,
  registerCRUDRoutes,
  crudRoutesMiddleware,
};
