import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { authenticate, authorize, optionalAuth } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';
import { PageService, MenuService, MediaService, SettingsService } from './services/page.service.js';

const router = Router();

const pageService = new PageService();
const menuService = new MenuService();
const mediaService = new MediaService();
const settingsService = new SettingsService();

// ─── Public API (no auth, for Nuxt.js SSR) ───

router.get('/public/pages', async (req, res) => {
  try {
    const result = await pageService.getPublishedPages();
    res.json(result);
  } catch (error) {
    console.error('Get published pages error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch pages'));
  }
});

router.get('/public/pages/:slug', async (req, res) => {
  try {
    const result = await pageService.findBySlug(req.params.slug);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get page by slug error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch page'));
  }
});

router.get('/public/menus/:location', async (req, res) => {
  try {
    const result = await menuService.getByLocation(req.params.location);
    res.json(result);
  } catch (error) {
    console.error('Get menu by location error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch menu'));
  }
});

router.get('/public/settings', async (req, res) => {
  try {
    const result = await settingsService.getAll();
    res.json(result);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch settings'));
  }
});

router.get('/public/sitemap', async (req, res) => {
  try {
    const pages = await pageService.getSitemap();
    res.json({ success: true, data: pages });
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to generate sitemap'));
  }
});

// Auth check for frontend live editing — returns user info if authenticated
router.get('/public/auth/check', optionalAuth, (req, res) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    return res.json(responseUtil.success({
      authenticated: true,
      user: { id: req.user.id, email: req.user.email, role: req.user.role },
    }));
  }
  res.json(responseUtil.success({ authenticated: false }));
});

router.post('/public/contact', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('phone').optional().trim(),
], validateRequest, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    // Log submission (could be extended to store in DB or send email)
    console.log(`[Contact Form] From: ${name} <${email}>, Subject: ${subject}`);
    res.json(responseUtil.success({ received: true }, 'Message received successfully. We will get back to you shortly.'));
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json(responseUtil.error('Failed to process contact form'));
  }
});

// ─── Admin Pages API ───

router.get('/pages', authenticate, async (req, res) => {
  try {
    const result = await pageService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      status: req.query.status,
      pageType: req.query.pageType,
    });
    res.json(result);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch pages'));
  }
});

router.get('/pages/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch page'));
  }
});

router.post('/pages', authenticate, [
  body('title').notEmpty().withMessage('Title is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await pageService.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json(result);
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json(responseUtil.error('Failed to create page'));
  }
});

router.put('/pages/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json(responseUtil.error('Failed to update page'));
  }
});

router.delete('/pages/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json(responseUtil.error('Failed to delete page'));
  }
});

router.post('/pages/:id/publish', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.publish(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Publish page error:', error);
    res.status(500).json(responseUtil.error('Failed to publish page'));
  }
});

router.post('/pages/:id/unpublish', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.unpublish(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Unpublish page error:', error);
    res.status(500).json(responseUtil.error('Failed to unpublish page'));
  }
});

// ─── Admin Menus API ───

router.get('/menus', authenticate, async (req, res) => {
  try {
    const result = await menuService.findAll();
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch menus'));
  }
});

router.get('/menus/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.findWithItems(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch menu'));
  }
});

router.post('/menus', authenticate, [body('name').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to create menu'));
  }
});

router.put('/menus/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update menu'));
  }
});

router.delete('/menus/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete menu'));
  }
});

router.post('/menus/:id/items', authenticate, [param('id').isInt(), body('label').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.addItem(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to add menu item'));
  }
});

router.put('/menu-items/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.updateItem(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update menu item'));
  }
});

router.delete('/menu-items/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.deleteItem(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete menu item'));
  }
});

// ─── Admin Media API ───

router.get('/media', authenticate, async (req, res) => {
  try {
    const result = await mediaService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      folder: req.query.folder,
      mimeType: req.query.mimeType,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch media'));
  }
});

router.post('/media', authenticate, async (req, res) => {
  try {
    const result = await mediaService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to upload media'));
  }
});

router.put('/media/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await mediaService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update media'));
  }
});

router.delete('/media/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await mediaService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete media'));
  }
});

// ─── Admin Settings API ───

router.get('/settings', authenticate, async (req, res) => {
  try {
    const result = await settingsService.getAll();
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch settings'));
  }
});

router.put('/settings', authenticate, async (req, res) => {
  try {
    const result = await settingsService.bulkSet(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to save settings'));
  }
});

export default router;
