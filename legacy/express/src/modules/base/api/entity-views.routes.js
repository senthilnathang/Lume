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

const createEntityViewsRoutes = () => {
  const router = Router({ mergeParams: true });

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
      let kanban = null;
      let calendar = null;
      const parseOptions = (f) => {
        try {
          if (!f?.selectOptions) return [];
          const p = typeof f.selectOptions === 'string' ? JSON.parse(f.selectOptions) : f.selectOptions;
          return Array.isArray(p) ? p : [];
        } catch { return []; }
      };

      if (view.type === 'list' || view.type === 'table') {
        const columnNames = config.columns || fields.map(f => f.name).slice(0, 5);
        columns = columnNames.map(name => {
          const n = name?.name || name;
          const field = fieldMap[n];
          if (!field) return null;
          return { name: n, label: field.label || n, type: field.type, width: config.columnWidths?.[n] || 150, sortable: true, filterable: true };
        }).filter(Boolean);
      } else if (view.type === 'kanban' || view.type === 'board') {
        const kcfg = config.kanban || {};
        const colField = fields.find(f => f.name === (kcfg.columnField || config.columnField))
          || fields.find(f => ['select', 'multi-select'].includes(f.type));
        const opts = parseOptions(colField).map(o => (typeof o === 'string' ? o : o.value ?? o.label));
        const ordered = Array.isArray(kcfg.columnOrder) && kcfg.columnOrder.length > 0 ? kcfg.columnOrder : opts;
        kanban = { columnField: colField?.name || null, columnFieldLabel: colField?.label || null, columns: ordered, columnWidths: kcfg.columnWidths || {}, showNoValue: kcfg.showNoValue ?? true };
        columns = (config.visibleFields || ['id']).map(n => fieldMap[n] ? { name: n, label: fieldMap[n].label, type: fieldMap[n].type } : null).filter(Boolean);
      } else if (view.type === 'calendar') {
        const ccfg = config.calendar || {};
        const dateField = fields.find(f => f.name === (ccfg.dateField || config.dateField)) || fields.find(f => ['date', 'datetime'].includes(f.type));
        calendar = { dateField: dateField?.name || null, endField: ccfg.endField || config.endField || null };
        columns = fields.slice(0, 5).map(f => ({ name: f.name, label: f.label, type: f.type }));
      } else if (view.type === 'grid' || view.type === 'gallery') {
        columns = fields.map(f => ({ name: f.name, label: f.label, type: f.type }));
      } else if (view.type === 'form') {
        columns = fields.map(f => ({ name: f.name, label: f.label, type: f.type, required: f.required, helpText: f.helpText }));
      }

      res.json({
        success: true,
        data: {
          id: view.id, name: view.name, type: view.type, isDefault: view.isDefault, columns,
          pageSize: config.pageSize || 20,
          defaultSort: config.defaultSort || config.sortBy || [{ field: 'createdAt', direction: 'desc' }],
          filters: config.filters || [], groupBy: config.groupBy || null,
          visibleFields: config.visibleFields || [], kanban, calendar,
          visibility: config.visibility || { profiles: [], recordTypes: [], devices: [] }
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
