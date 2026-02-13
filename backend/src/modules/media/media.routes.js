import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { MediaService } from './media.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();
let mediaService;

const getMediaService = () => {
  if (!mediaService) {
    mediaService = new MediaService();
  }
  return mediaService;
};

router.get('/stats', authenticate, authorize('documents', 'read'), async (req, res) => {
  try {
    const result = await getMediaService().getStats();
    res.json(result);
  } catch (error) {
    console.error('Get media stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch statistics'));
  }
});

router.get('/featured', async (req, res) => {
  try {
    const result = await getMediaService().getFeatured();
    res.json(result);
  } catch (error) {
    console.error('Get featured media error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch featured media'));
  }
});

router.get('/category/:category', async (req, res) => {
  try {
    const result = await getMediaService().getByCategory(req.params.category);
    res.json(result);
  } catch (error) {
    console.error('Get media by category error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch media'));
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getMediaService().findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.query.type,
      category: req.query.category,
      search: req.query.search,
      is_public: req.query.is_public,
      is_featured: req.query.is_featured
    });
    res.json(result);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch media'));
  }
});

router.get('/:id', [param('id').isInt().withMessage('Media ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMediaService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch media'));
  }
});

router.post('/', authenticate, authorize('documents', 'write'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('filename').notEmpty().withMessage('Filename is required'),
  body('path').notEmpty().withMessage('File path is required'),
  body('type').optional().isIn(['image', 'video', 'document', 'audio', 'other'])
], validateRequest, async (req, res) => {
  try {
    const result = await getMediaService().create({ ...req.body, uploaded_by: req.user.id });
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create media error:', error);
    res.status(500).json(responseUtil.error('Failed to create media'));
  }
});

router.put('/:id', authenticate, authorize('documents', 'write'), [param('id').isInt().withMessage('Media ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMediaService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json(responseUtil.error('Failed to update media'));
  }
});

router.delete('/:id', authenticate, authorize('documents', 'delete'), [param('id').isInt().withMessage('Media ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMediaService().delete(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json(responseUtil.error('Failed to delete media'));
  }
});

router.post('/:id/download', [param('id').isInt().withMessage('Media ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMediaService().incrementDownloads(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Increment downloads error:', error);
    res.status(500).json(responseUtil.error('Failed to update downloads'));
  }
});

export default router;
