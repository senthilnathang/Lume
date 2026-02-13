import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { AuthService } from './auth.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';
import { getDatabase } from '../../config.js';

const router = Router();

const getAuthService = () => new AuthService();

const roleValidation = [
  body('name').notEmpty().withMessage('Role name is required'),
  body('display_name').notEmpty().withMessage('Display name is required')
];

router.post('/roles', authenticate, authorize('role_management', 'write'), roleValidation, validateRequest, async (req, res) => {
  try {
    const result = await getAuthService().createRole(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json(responseUtil.error('Failed to create role'));
  }
});

router.get('/roles', authenticate, authorize('role_management', 'read'), async (req, res) => {
  try {
    const result = await getAuthService().getAllRoles();
    res.json(result);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch roles'));
  }
});

router.get('/roles/:id', authenticate, authorize('role_management', 'read'), [param('id').isInt().withMessage('Role ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getAuthService().getRoleById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch role'));
  }
});

router.put('/roles/:id', authenticate, authorize('role_management', 'write'), [param('id').isInt().withMessage('Role ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getAuthService().updateRole(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json(responseUtil.error('Failed to update role'));
  }
});

router.delete('/roles/:id', authenticate, authorize('role_management', 'delete'), [param('id').isInt().withMessage('Role ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getAuthService().deleteRole(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json(responseUtil.error('Failed to delete role'));
  }
});

router.post('/refresh-token', [body('refresh_token').notEmpty().withMessage('Refresh token is required')], validateRequest, async (req, res) => {
  try {
    const result = await getAuthService().refreshToken(req.body.refresh_token);
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json(responseUtil.error('Failed to refresh token'));
  }
});

router.get('/permissions', authenticate, authorize('role_management', 'read'), async (req, res) => {
  try {
    const db = getDatabase();
    const permissions = await db.models.Permission.findAll({ where: { is_active: true } });
    res.json(responseUtil.success(permissions));
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch permissions'));
  }
});

export default router;
