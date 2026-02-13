import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { DocumentService } from './document.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();

const getDocumentService = () => new DocumentService();

const createDocumentValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
  body('filename')
    .notEmpty().withMessage('Filename is required')
    .isLength({ min: 1, max: 255 }).withMessage('Filename must be between 1 and 255 characters'),
  body('path')
    .notEmpty().withMessage('File path is required')
    .isLength({ min: 1, max: 500 }).withMessage('Path must be between 1 and 500 characters'),
  body('type')
    .optional()
    .isIn(['image', 'video', 'document', 'audio', 'other'])
    .withMessage('Type must be one of: image, video, document, audio, other')
];

router.get('/stats', authenticate, authorize('documents', 'read'), async (req, res) => {
  try {
    const result = await getDocumentService().getStats();
    res.json(result);
  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch statistics'));
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getDocumentService().findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.query.type,
      category: req.query.category,
      search: req.query.search,
      is_public: req.query.is_public
    });
    res.json(result);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch documents'));
  }
});

router.get('/:id', [param('id').isInt().withMessage('Document ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDocumentService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch document'));
  }
});

router.post('/', authenticate, authorize('documents', 'write'), createDocumentValidation, validateRequest, async (req, res) => {
  try {
    const result = await getDocumentService().create({ ...req.body, uploaded_by: req.user.id });
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json(responseUtil.error('Failed to create document'));
  }
});

router.put('/:id', authenticate, authorize('documents', 'write'), [param('id').isInt().withMessage('Document ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDocumentService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json(responseUtil.error('Failed to update document'));
  }
});

router.delete('/:id', authenticate, authorize('documents', 'delete'), [param('id').isInt().withMessage('Document ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDocumentService().delete(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json(responseUtil.error('Failed to delete document'));
  }
});

router.post('/:id/download', [param('id').isInt().withMessage('Document ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDocumentService().incrementDownloads(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Increment downloads error:', error);
    res.status(500).json(responseUtil.error('Failed to update downloads'));
  }
});

export default router;
