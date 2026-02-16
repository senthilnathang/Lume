import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../../api/validators/validateRequest.js';
import { authenticate } from '../../../core/middleware/auth.js';
import { EditorTemplateService, EditorSnippetService } from '../services/editor.service.js';
import { responseUtil } from '../../../shared/utils/index.js';

const router = Router();
const templateService = new EditorTemplateService();
const snippetService = new EditorSnippetService();

// ─── Templates CRUD ───

router.get('/templates', authenticate, async (req, res) => {
  try {
    const result = await templateService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      search: req.query.search,
      category: req.query.category,
    });
    res.json(result);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch templates'));
  }
});

router.get('/templates/default', authenticate, async (req, res) => {
  try {
    const result = await templateService.getDefault();
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get default template error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch default template'));
  }
});

router.get('/templates/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await templateService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch template'));
  }
});

router.post('/templates', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await templateService.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json(result);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json(responseUtil.error('Failed to create template'));
  }
});

router.put('/templates/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await templateService.update(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json(responseUtil.error('Failed to update template'));
  }
});

router.delete('/templates/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await templateService.delete(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json(responseUtil.error('Failed to delete template'));
  }
});

// ─── Snippets CRUD ───

router.get('/snippets', authenticate, async (req, res) => {
  try {
    const result = await snippetService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      search: req.query.search,
      category: req.query.category,
    });
    res.json(result);
  } catch (error) {
    console.error('Get snippets error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch snippets'));
  }
});

router.get('/snippets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await snippetService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get snippet error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch snippet'));
  }
});

router.post('/snippets', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await snippetService.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json(result);
  } catch (error) {
    console.error('Create snippet error:', error);
    res.status(500).json(responseUtil.error('Failed to create snippet'));
  }
});

router.put('/snippets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await snippetService.update(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Update snippet error:', error);
    res.status(500).json(responseUtil.error('Failed to update snippet'));
  }
});

router.delete('/snippets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await snippetService.delete(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Delete snippet error:', error);
    res.status(500).json(responseUtil.error('Failed to delete snippet'));
  }
});

export default router;
