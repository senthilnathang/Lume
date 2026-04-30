/**
 * @fileoverview View API Routes - Metadata and data endpoints for views
 * GET/POST/PUT/DELETE views, get view data
 */

import { Router } from 'express';
import logger from '../core/services/logger.js';

/**
 * Create view routes
 * @param {ViewStore} viewStore - ViewStore instance
 * @param {EntityStore} entityStore - EntityStore instance
 * @param {LumeRuntime} runtime - LumeRuntime instance
 * @returns {Router} Express router
 */
export function createViewRoutes(viewStore, entityStore, runtime) {
  const router = Router();

  /**
   * GET /api/{entity}/views - List all views for entity
   */
  router.get('/:entity/views', async (req, res) => {
    try {
      const { entity } = req.params;

      const views = await viewStore.getByEntity(entity);

      res.json({
        success: true,
        data: views.map(v => ({
          id: v.id,
          type: v.type,
          title: v.title || v.id,
          description: v.description,
          default: viewStore.defaultViews.get(entity) === v.id,
        })),
      });
    } catch (error) {
      logger.error('[ViewRoutes] Error listing views:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/{entity}/views/{viewId} - Get view definition
   */
  router.get('/:entity/views/:viewId', async (req, res) => {
    try {
      const { entity, viewId } = req.params;

      const view = await viewStore.get(entity, viewId);
      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found',
        });
      }

      res.json({
        success: true,
        data: view,
      });
    } catch (error) {
      logger.error('[ViewRoutes] Error getting view:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/{entity}/views/{viewId}/data - Get data for view
   * Request body: { filters, sort, page, pageSize }
   */
  router.post('/:entity/views/:viewId/data', async (req, res) => {
    try {
      const { entity, viewId } = req.params;
      const { filters, sort, page = 1, pageSize = 25 } = req.body;

      const view = await viewStore.get(entity, viewId);
      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found',
        });
      }

      // Build operation request for runtime
      const operationRequest = {
        entity,
        action: 'list',
        data: {
          filters,
          sort,
          pagination: { page, pageSize },
        },
        options: {
          // Include specific fields based on view type
          fields: this.getViewFields(view),
        },
      };

      const result = await runtime.execute(operationRequest, req);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.abortReason || 'Failed to fetch data',
        });
      }

      // Apply view-specific formatting
      const formatted = this.formatViewData(view, result.result);

      res.json({
        success: true,
        data: formatted,
        metadata: {
          viewType: view.type,
          pageSize,
          page,
        },
      });
    } catch (error) {
      logger.error('[ViewRoutes] Error getting view data:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/{entity}/views/{viewId}/export - Export view data
   * Query: format (csv, json, xlsx)
   */
  router.post('/:entity/views/:viewId/export', async (req, res) => {
    try {
      const { entity, viewId } = req.params;
      const { format = 'json', filters } = req.body;
      const { accept } = req.query;

      const view = await viewStore.get(entity, viewId);
      if (!view) {
        return res.status(404).json({
          success: false,
          error: 'View not found',
        });
      }

      // Get all data for export (no pagination)
      const operationRequest = {
        entity,
        action: 'list',
        data: { filters },
        options: {
          fields: this.getViewFields(view),
          limit: 10000, // Max export size
        },
      };

      const result = await runtime.execute(operationRequest, req);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.abortReason || 'Failed to fetch data',
        });
      }

      // Format based on requested type
      switch (format || accept?.includes('csv') ? 'csv' : 'json') {
        case 'csv':
          return this.exportCSV(res, view, result.result);
        case 'json':
        default:
          return res.json({
            success: true,
            data: result.result,
          });
      }
    } catch (error) {
      logger.error('[ViewRoutes] Error exporting view data:', error.message);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/{entity}/views/{viewId} - Update view definition
   */
  router.put('/:entity/views/:viewId', async (req, res) => {
    try {
      const { entity, viewId } = req.params;
      const updates = req.body;

      const updated = await viewStore.update(entity, viewId, updates);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error('[ViewRoutes] Error updating view:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/{entity}/views/{viewId} - Delete view
   */
  router.delete('/:entity/views/:viewId', async (req, res) => {
    try {
      const { entity, viewId } = req.params;

      await viewStore.unregister(entity, viewId);

      res.json({
        success: true,
        message: 'View deleted',
      });
    } catch (error) {
      logger.error('[ViewRoutes] Error deleting view:', error.message);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get fields to include for a view type
   * @private
   */
  router.getViewFields = function(view) {
    switch (view.type) {
      case 'table':
        return view.config.columns;
      case 'kanban':
        return [...(view.config.displayFields || []), view.config.groupBy];
      case 'calendar':
        return [view.config.dateField, view.config.titleField, view.config.endDateField].filter(Boolean);
      case 'timeline':
        return [view.config.startDateField, view.config.endDateField, view.config.titleField].filter(Boolean);
      case 'form':
      default:
        return view.config.fields?.map(f => f.name) || [];
    }
  };

  /**
   * Format data for view display
   * @private
   */
  router.formatViewData = function(view, data) {
    if (!Array.isArray(data)) {
      return data;
    }

    switch (view.type) {
      case 'kanban':
        return this.groupByField(data, view.config.groupBy);
      case 'calendar':
        return this.groupByDate(data, view.config.dateField);
      case 'timeline':
        return data.map(item => ({
          ...item,
          startDate: item[view.config.startDateField],
          endDate: item[view.config.endDateField],
        }));
      case 'table':
      case 'form':
      default:
        return data;
    }
  };

  /**
   * Group data by field value
   * @private
   */
  router.groupByField = function(data, field) {
    const grouped = {};

    for (const item of data) {
      const key = item[field] || 'Ungrouped';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return grouped;
  };

  /**
   * Group data by date field (by day)
   * @private
   */
  router.groupByDate = function(data, dateField) {
    const grouped = {};

    for (const item of data) {
      const date = item[dateField];
      if (!date) continue;

      const dateStr = new Date(date).toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(item);
    }

    return grouped;
  };

  /**
   * Export data as CSV
   * @private
   */
  router.exportCSV = function(res, view, data) {
    const fields = this.getViewFields(view);
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data to export',
      });
    }

    // Build CSV
    const headers = fields.join(',');
    const rows = data.map(item =>
      fields.map(field => {
        const value = item[field];
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="export.csv"`);
    res.send(csv);
  };

  return router;
}

export default createViewRoutes;
