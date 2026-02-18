import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../../api/validators/validateRequest.js';
import { authenticate } from '../../../core/middleware/auth.js';
import { EditorTemplateService, EditorSnippetService, EditorPresetService, GlobalWidgetService, NoteService } from '../services/editor.service.js';
import { responseUtil } from '../../../shared/utils/index.js';

const router = Router();
const templateService = new EditorTemplateService();
const snippetService = new EditorSnippetService();
const presetService = new EditorPresetService();
const globalWidgetService = new GlobalWidgetService();
const noteService = new NoteService();

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

// ─── Presets CRUD ───

router.get('/presets', authenticate, async (req, res) => {
  try {
    const { blockType } = req.query;
    if (blockType) {
      const result = await presetService.findByBlockType(blockType);
      return res.json(result);
    }
    const result = await presetService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      search: req.query.search,
      blockType: req.query.blockType,
    });
    res.json(result);
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch presets'));
  }
});

router.get('/presets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await presetService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get preset error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch preset'));
  }
});

router.post('/presets', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
  body('blockType').notEmpty().withMessage('Block type is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await presetService.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json(result);
  } catch (error) {
    console.error('Create preset error:', error);
    res.status(500).json(responseUtil.error('Failed to create preset'));
  }
});

router.put('/presets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await presetService.update(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Update preset error:', error);
    res.status(500).json(responseUtil.error('Failed to update preset'));
  }
});

router.delete('/presets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await presetService.delete(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json(responseUtil.error('Failed to delete preset'));
  }
});

// ─── Global Widgets CRUD ───

router.get('/global-widgets', authenticate, async (req, res) => {
  try {
    const result = await globalWidgetService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      search: req.query.search,
    });
    res.json(result);
  } catch (error) {
    console.error('Get global widgets error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch global widgets'));
  }
});

router.get('/global-widgets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await globalWidgetService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get global widget error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch global widget'));
  }
});

router.post('/global-widgets', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
  body('content').notEmpty().withMessage('Content is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await globalWidgetService.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json(result);
  } catch (error) {
    console.error('Create global widget error:', error);
    res.status(500).json(responseUtil.error('Failed to create global widget'));
  }
});

router.put('/global-widgets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await globalWidgetService.update(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Update global widget error:', error);
    res.status(500).json(responseUtil.error('Failed to update global widget'));
  }
});

router.delete('/global-widgets/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await globalWidgetService.delete(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Delete global widget error:', error);
    res.status(500).json(responseUtil.error('Failed to delete global widget'));
  }
});

// ─── Notes / Collaboration API ───

router.get('/notes/:pageId', authenticate, [param('pageId').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await noteService.findByPage(req.params.pageId);
    res.json(result);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch notes'));
  }
});

router.post('/notes', authenticate, [
  body('pageId').isInt().withMessage('pageId is required'),
  body('content').notEmpty().withMessage('content is required'),
  body('authorId').isInt().withMessage('authorId is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await noteService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json(responseUtil.error('Failed to create note'));
  }
});

router.post('/notes/:id/reply', authenticate, [
  param('id').isInt(),
  body('content').notEmpty().withMessage('content is required'),
  body('authorId').isInt().withMessage('authorId is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await noteService.reply(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.status(201).json(result);
  } catch (error) {
    console.error('Reply note error:', error);
    res.status(500).json(responseUtil.error('Failed to add reply'));
  }
});

router.put('/notes/:id/resolve', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await noteService.resolve(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Resolve note error:', error);
    res.status(500).json(responseUtil.error('Failed to resolve note'));
  }
});

router.delete('/notes/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await noteService.delete(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json(responseUtil.error('Failed to delete note'));
  }
});

export default router;
