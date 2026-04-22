/**
 * Entity Records CRUD REST API Routes
 *
 * Provides full CRUD operations for records of custom entities with company scoping.
 * All routes return JSON with format: { success: boolean, data?: any, message?: string, errors?: object }
 *
 * Routes:
 *   POST   /entities/:id/records              - Create record
 *   GET    /entities/:id/records              - List records with pagination
 *   GET    /entities/:id/records/:recordId    - Get record by ID
 *   PUT    /entities/:id/records/:recordId    - Update record
 *   DELETE /entities/:id/records/:recordId    - Delete record
 */

import { Router } from 'express';
import prisma from '../../../core/db/prisma.js';
import { RecordService } from '../services/record.service.js';

const createEntityRecordsRoutes = () => {
  const router = Router({ mergeParams: true });

  // Initialize service
  const recordService = new RecordService(prisma);

  // Middleware to extract companyId from request
  router.use((req, res, next) => {
    req.companyId = req.user?.companyId || 1;
    next();
  });

  // POST /entities/:id/records - Create record
  router.post('/:id/records', async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const companyId = req.companyId;
      const userId = req.user?.id || 1;

      const record = await recordService.createRecord(
        entityId,
        req.body,
        companyId,
        userId
      );

      res.status(201).json({
        success: true,
        data: record,
        message: 'Record created successfully'
      });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /entities/:id/records - List records with pagination
  router.get('/:id/records', async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);
      const companyId = req.companyId;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      // Parse filters from query string if provided
      let filters = [];
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters);
        } catch (e) {
          // Ignore invalid filters JSON
        }
      }

      // Parse sort from query string if provided
      let sort = {};
      if (req.query.sort) {
        try {
          sort = JSON.parse(req.query.sort);
        } catch (e) {
          // Ignore invalid sort JSON
        }
      }

      const result = await recordService.listRecords(entityId, companyId, {
        page,
        limit,
        filters,
        sort
      });

      res.json({
        success: true,
        data: result.records,
        pagination: result.pagination
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // GET /entities/:id/records/:recordId - Get record by ID
  router.get('/:id/records/:recordId', async (req, res) => {
    try {
      const recordId = parseInt(req.params.recordId);
      const companyId = req.companyId;

      const record = await recordService.getRecord(recordId, companyId);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found or access denied'
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // PUT /entities/:id/records/:recordId - Update record
  router.put('/:id/records/:recordId', async (req, res) => {
    try {
      const recordId = parseInt(req.params.recordId);
      const companyId = req.companyId;

      const record = await recordService.updateRecord(recordId, req.body, companyId);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found or access denied'
        });
      }

      res.json({
        success: true,
        data: record,
        message: 'Record updated successfully'
      });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // DELETE /entities/:id/records/:recordId - Delete record
  router.delete('/:id/records/:recordId', async (req, res) => {
    try {
      const recordId = parseInt(req.params.recordId);
      const companyId = req.companyId;
      const softDelete = req.query.hard !== 'true';

      const deleted = await recordService.deleteRecord(recordId, softDelete, companyId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Record not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Record deleted successfully'
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

export default createEntityRecordsRoutes;
