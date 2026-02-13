import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { ActivityService } from './activity.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';

const router = Router();

const getActivityService = () => new ActivityService();

const createActivityValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer')
];

const updateActivityValidation = [
  param('id').isInt().withMessage('Activity ID must be an integer'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty')
];

router.get('/', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      category: req.query.category,
      search: req.query.search,
      is_featured: req.query.is_featured
    };
    const result = await getActivityService().findAll(options);
    res.json(result);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch activities'));
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const result = await getActivityService().getUpcoming({ limit: parseInt(req.query.limit) || 10 });
    res.json(result);
  } catch (error) {
    console.error('Get upcoming activities error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch upcoming activities'));
  }
});

router.get('/stats', authenticate, authorize('activities', 'read'), async (req, res) => {
  try {
    const result = await getActivityService().getStats();
    res.json(result);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch statistics'));
  }
});

router.get('/:id', [param('id').isInt().withMessage('Activity ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getActivityService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch activity'));
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const result = await getActivityService().findBySlug(req.params.slug);
    res.json(result);
  } catch (error) {
    console.error('Get activity by slug error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch activity'));
  }
});

router.post('/', authenticate, authorize('activities', 'write'), createActivityValidation, validateRequest, async (req, res) => {
  try {
    const result = await getActivityService().create({ ...req.body, created_by: req.user.id });
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json(responseUtil.error('Failed to create activity'));
  }
});

router.put('/:id', authenticate, authorize('activities', 'write'), updateActivityValidation, validateRequest, async (req, res) => {
  try {
    const result = await getActivityService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json(responseUtil.error('Failed to update activity'));
  }
});

router.delete('/:id', authenticate, authorize('activities', 'delete'), [param('id').isInt().withMessage('Activity ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getActivityService().delete(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json(responseUtil.error('Failed to delete activity'));
  }
});

router.post('/:id/publish', authenticate, authorize('activities', 'write'), [param('id').isInt().withMessage('Activity ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getActivityService().publish(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Publish activity error:', error);
    res.status(500).json(responseUtil.error('Failed to publish activity'));
  }
});

router.post('/:id/cancel', authenticate, authorize('activities', 'write'), [param('id').isInt().withMessage('Activity ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getActivityService().cancel(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Cancel activity error:', error);
    res.status(500).json(responseUtil.error('Failed to cancel activity'));
  }
});

export default router;
