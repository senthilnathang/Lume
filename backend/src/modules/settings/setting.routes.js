import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { SettingService } from './setting.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();

const getSettingService = () => new SettingService();

const settingValidation = [
  body('key').notEmpty().withMessage('Setting key is required'),
  body('value').notEmpty().withMessage('Setting value is required')
];

router.get('/public', async (req, res) => {
  try {
    const result = await getSettingService().getPublic();
    res.json(result);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch public settings'));
  }
});

router.get('/', authenticate, authorize('settings', 'read'), async (req, res) => {
  try {
    const result = await getSettingService().getAll();
    res.json(result);
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch settings'));
  }
});

router.get('/category/:category', authenticate, authorize('settings', 'read'), async (req, res) => {
  try {
    const result = await getSettingService().getByCategory(req.params.category);
    res.json(result);
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch settings'));
  }
});

router.get('/:key', authenticate, authorize('settings', 'read'), [param('key').notEmpty().withMessage('Setting key is required')], validateRequest, async (req, res) => {
  try {
    const value = await getSettingService().get(req.params.key);
    if (value === null) {
      res.json(responseUtil.notFound('Setting'));
    } else {
      res.json(responseUtil.success({ key: req.params.key, value }));
    }
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch setting'));
  }
});

router.post('/', authenticate, authorize('settings', 'write'), settingValidation, validateRequest, async (req, res) => {
  try {
    const result = await getSettingService().set(req.body.key, req.body.value, req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json(responseUtil.error('Failed to create setting'));
  }
});

router.put('/:key', authenticate, authorize('settings', 'write'), [param('key').notEmpty().withMessage('Setting key is required')], validateRequest, async (req, res) => {
  try {
    const result = await getSettingService().set(req.params.key, req.body.value, req.body);
    res.json(result);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json(responseUtil.error('Failed to update setting'));
  }
});

router.delete('/:key', authenticate, authorize('settings', 'write'), [param('key').notEmpty().withMessage('Setting key is required')], validateRequest, async (req, res) => {
  try {
    const result = await getSettingService().delete(req.params.key);
    res.json(result);
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json(responseUtil.error('Failed to delete setting'));
  }
});

router.post('/bulk', authenticate, authorize('settings', 'write'), [body('settings').isArray().withMessage('Settings must be an array')], validateRequest, async (req, res) => {
  try {
    const result = await getSettingService().bulkSet(req.body.settings);
    res.json(result);
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json(responseUtil.error('Failed to update settings'));
  }
});

router.post('/initialize', authenticate, authorize('settings', 'write'), async (req, res) => {
  try {
    const result = await getSettingService().initializeDefaults();
    res.json(result);
  } catch (error) {
    console.error('Initialize default settings error:', error);
    res.status(500).json(responseUtil.error('Failed to initialize default settings'));
  }
});

export default router;
