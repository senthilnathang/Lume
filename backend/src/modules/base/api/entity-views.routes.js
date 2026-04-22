/**
 * Entity Views Render REST API Routes
 *
 * Provides view rendering and metadata endpoints for list/grid/form views
 * All routes return JSON with format: { success: boolean, data?: any, message?: string, errors?: object }
 *
 * Routes:
 *   GET /entities/:id/views/:viewId/render - Render view with metadata
 */

import { Router } from 'express';
import prisma from '../../../core/db/prisma.js';
import { ViewRendererService } from '../../../core/services/view-renderer.service.js';

const createEntityViewsRoutes = () => {
  const router = Router({ mergeParams: true });

  // Initialize service
  const viewRendererService = new ViewRendererService(prisma);

  // GET /entities/:id/views/:viewId/render - Render view with metadata
  router.get('/:id/views/:viewId/render', async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const viewId = parseInt(req.params.viewId);

      // Get view from database
      const view = await prisma.entityView.findUnique({
        where: { id: viewId }
      });

      if (!view || view.entityId !== entityId) {
        return res.status(404).json({
          success: false,
          message: 'View not found'
        });
      }

      // Get entity fields
      const fields = await prisma.entityField.findMany({
        where: { entityId, deletedAt: null },
        orderBy: { sequence: 'asc' }
      });

      // Build view metadata based on type
      const config = view.config ? JSON.parse(view.config) : {};
      const fieldMap = {};
      fields.forEach(f => {
        fieldMap[f.name] = f;
      });

      let columns = [];

      if (view.type === 'list') {
        const columnNames = config.columns || fields.map(f => f.name).slice(0, 5);
        columns = columnNames.map(name => {
          const field = fieldMap[name];
          if (!field) return null;
          return {
            name,
            label: field.label || name,
            type: field.type,
            width: config.columnWidths?.[name] || 150,
            sortable: true,
            filterable: true
          };
        }).filter(Boolean);
      } else if (view.type === 'grid') {
        columns = fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type
        }));
      } else if (view.type === 'form') {
        columns = fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          helpText: f.helpText
        }));
      }

      res.json({
        success: true,
        data: {
          id: view.id,
          name: view.name,
          type: view.type,
          isDefault: view.isDefault,
          columns,
          pageSize: config.pageSize || 20,
          defaultSort: config.defaultSort || [{ field: 'createdAt', direction: 'desc' }],
          filters: config.filters || []
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /entities/:id/views - List all views for entity
  router.get('/:id/views', async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);

      const views = await prisma.entityView.findMany({
        where: { entityId },
        orderBy: { createdAt: 'asc' }
      });

      res.json({
        success: true,
        data: views.map(view => ({
          id: view.id,
          name: view.name,
          type: view.type,
          isDefault: view.isDefault,
          config: view.config ? JSON.parse(view.config) : {}
        }))
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  return router;
};

export default createEntityViewsRoutes;
