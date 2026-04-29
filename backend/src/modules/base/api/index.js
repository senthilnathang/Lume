/**
 * Base Module API Routes
 */

import { Router } from 'express';
import prisma from '../../../core/db/prisma.js';
import { createCrudRouter } from '../../../core/router/crud-router.js';
import { PrismaAdapter } from '../../../core/db/adapters/prisma-adapter.js';
import createEntityRoutes from './entity.routes.js';
import createFieldRoutes from './field.routes.js';
import createEntityRecordsRoutes from './entity-records.routes.js';
import createEntityViewsRoutes from './entity-views.routes.js';
import createQueueRoutes from './queue.routes.js';

const createRoutes = (models, services) => {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Base module is running',
      timestamp: new Date().toISOString()
    });
  });

  // Module routes via service
  router.get('/modules', async (req, res) => {
    try {
      const modules = await services.moduleService.getInstalledModules();
      res.json({ success: true, data: modules });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/modules/:name', async (req, res) => {
    try {
      const module = await services.moduleService.getModule(req.params.name);
      if (!module) {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
      res.json({ success: true, data: module });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/modules/:name/install', async (req, res) => {
    try {
      const result = await services.moduleService.installModule(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  router.post('/modules/:name/uninstall', async (req, res) => {
    try {
      await services.moduleService.uninstallModule(req.params.name);
      res.json({ success: true, message: `Module ${req.params.name} uninstalled` });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Mount CRUD routers for core models (no soft delete — core tables lack deleted_at)
  const noSoftDelete = { softDelete: false };
  router.use('/menus', createCrudRouter(new PrismaAdapter('Menu'), noSoftDelete));
  router.use('/roles', createCrudRouter(new PrismaAdapter('Role'), noSoftDelete));
  router.use('/groups', createCrudRouter(new PrismaAdapter('Group'), noSoftDelete));
  router.use('/record-rules', createCrudRouter(new PrismaAdapter('RecordRule'), noSoftDelete));
  router.use('/sequences', createCrudRouter(new PrismaAdapter('Sequence'), noSoftDelete));

  // Permission routes via service
  router.get('/permissions', async (req, res) => {
    try {
      const permissions = await services.moduleService.getAllPermissions();
      res.json({ success: true, data: permissions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Sequence next number (custom endpoint)
  router.get('/sequences/:code/next', async (req, res) => {
    try {
      const sequence = await prisma.sequence.findUnique({ where: { code: req.params.code } });
      if (!sequence) {
        return res.status(404).json({ success: false, error: 'Sequence not found' });
      }
      const number = `${sequence.prefix || ''}${String(sequence.nextNumber).padStart(sequence.padding, '0')}${sequence.suffix || ''}`;

      // Increment for next call
      await prisma.sequence.update({
        where: { code: req.params.code },
        data: { nextNumber: sequence.nextNumber + sequence.increment },
      });

      res.json({ success: true, data: { number } });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Entity records routes (must be mounted before /entities to work with /:id/records paths)
  const recordsRoutes = createEntityRecordsRoutes();
  router.use('/entities', recordsRoutes);

  // Entity views routes (render view definitions)
  const viewsRoutes = createEntityViewsRoutes();
  router.use('/entities', viewsRoutes);

  // Entity routes (admin CRUD API)
  const entityRoutes = createEntityRoutes();
  router.use('/entities', entityRoutes);
  router.use('/entities/:entityId/fields', createFieldRoutes());

  // Field routes (can also be accessed directly via /entity-fields/:fieldId)
  router.use('/entity-fields', createFieldRoutes());

  // Queue management routes
  router.use('/queue', createQueueRoutes());

  return router;
};

export default createRoutes;
