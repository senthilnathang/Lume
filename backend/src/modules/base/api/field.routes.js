/**
 * Entity Field CRUD REST API Routes
 *
 * Manages fields for custom entities.
 * All routes return JSON with format: { success: boolean, data?: any, message?: string, errors?: object }
 *
 * Routes:
 *   POST   /:entityId/fields       - Create field for entity
 *   GET    /:entityId/fields       - List fields for entity
 *   PUT    /:fieldId               - Update field
 *   DELETE /:fieldId               - Delete field
 */

import { Router } from 'express';
import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { EntityService } from '../../../core/services/entity.service.js';
import { customEntities, entityFields } from '../models/schema.js';

const createFieldRoutes = () => {
  const router = Router({ mergeParams: true });

  // Initialize service
  const entityAdapter = new DrizzleAdapter(customEntities);
  const fieldsAdapter = new DrizzleAdapter(entityFields);
  const entityService = new EntityService(entityAdapter, fieldsAdapter);

  // POST /:entityId/fields - Create field for entity
  router.post('/:entityId/fields', async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);

      // Check entity exists
      const entity = await entityService.getEntity(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      const field = await entityService.createField(entityId, req.body);

      res.status(201).json({
        success: true,
        data: field,
        message: 'Field created successfully',
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

  // GET /:entityId/fields - List fields for entity
  router.get('/:entityId/fields', async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);

      // Check entity exists
      const entity = await entityService.getEntity(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found',
        });
      }

      const fields = await entityService.getFieldsByEntity(entityId);

      res.json({
        success: true,
        data: fields,
        message: 'Fields retrieved successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // PUT /:fieldId - Update field
  router.put('/:fieldId', async (req, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);

      const field = await entityService.updateField(fieldId, req.body);

      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Field not found',
        });
      }

      res.json({
        success: true,
        data: field,
        message: 'Field updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // DELETE /:fieldId - Delete field
  router.delete('/:fieldId', async (req, res) => {
    try {
      const fieldId = parseInt(req.params.fieldId);

      const result = await entityService.deleteField(fieldId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Field not found',
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Field deleted successfully',
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

export default createFieldRoutes;
