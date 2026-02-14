/**
 * Auto CRUD Router Generator
 * Creates standard REST endpoints for any Sequelize model.
 * Eliminates boilerplate — get a full CRUD API with one line.
 *
 * Usage:
 *   import { createCrudRouter } from '../../core/router/crud-router.js';
 *   const router = createCrudRouter(Activity, { softDelete: true });
 *   app.use('/api/activities', router);
 *
 * Generated endpoints:
 *   GET    /          → Search with pagination, domain filtering
 *   GET    /fields    → Return model field definitions
 *   GET    /:id       → Read single record
 *   POST   /          → Create record
 *   PUT    /:id       → Update record
 *   DELETE /:id       → Delete record (soft or hard)
 *   POST   /bulk      → Bulk create
 *   DELETE /bulk      → Bulk delete
 */

import { Router } from 'express';
import { BaseService } from '../services/base.service.js';

export function createCrudRouter(model, options = {}) {
  const router = Router();
  const service = new BaseService(model, options);

  // GET / — Search with pagination
  router.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const orderBy = req.query.order_by || 'created_at';
      const orderDir = req.query.order || 'DESC';

      // Parse domain from query (JSON string)
      let domain = [];
      if (req.query.domain) {
        try {
          domain = JSON.parse(req.query.domain);
        } catch (e) { /* ignore parse errors */ }
      }

      // Simple field=value filters from query params
      const reserved = new Set(['page', 'limit', 'order_by', 'order', 'domain', 'fields']);
      for (const [key, value] of Object.entries(req.query)) {
        if (!reserved.has(key)) {
          domain.push([key, '=', value]);
        }
      }

      const result = await service.search({
        page,
        limit,
        domain,
        order: [[orderBy, orderDir]],
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /fields — Model schema introspection
  router.get('/fields', (req, res) => {
    try {
      const fields = service.fieldsGet();
      res.json({ success: true, data: fields });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /:id — Read single record
  router.get('/:id', async (req, res) => {
    try {
      const record = await service.read(req.params.id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST / — Create record
  router.post('/', async (req, res) => {
    try {
      const context = { userId: req.user?.id || req.user?.userId };
      const record = await service.create(req.body, context);
      res.status(201).json({ success: true, data: record });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // PUT /:id — Update record
  router.put('/:id', async (req, res) => {
    try {
      const context = { userId: req.user?.id || req.user?.userId };
      const record = await service.update(req.params.id, req.body, context);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      res.json({ success: true, data: record });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // DELETE /:id — Delete record
  router.delete('/:id', async (req, res) => {
    try {
      const context = { userId: req.user?.id || req.user?.userId };
      const deleted = await service.delete(req.params.id, context);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Record not found' });
      }
      res.json({ success: true, message: 'Record deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // POST /bulk — Bulk create
  router.post('/bulk', async (req, res) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ success: false, error: 'Request body must be an array' });
      }
      const context = { userId: req.user?.id || req.user?.userId };
      const records = await service.bulkCreate(req.body, context);
      res.status(201).json({ success: true, data: records });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // DELETE /bulk — Bulk delete
  router.delete('/bulk', async (req, res) => {
    try {
      const ids = req.body.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Request body must contain ids array' });
      }
      const context = { userId: req.user?.id || req.user?.userId };
      await service.bulkDelete(ids, context);
      res.json({ success: true, message: `${ids.length} records deleted` });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
}

export default createCrudRouter;
