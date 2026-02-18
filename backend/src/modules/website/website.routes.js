import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { authenticate, authorize, optionalAuth } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';
import { PageService, MenuService, MediaService, SettingsService, RevisionService, FormService, SubmissionService, ThemeTemplateService, PopupService, QueryService, FontService, IconService, RedirectService, CategoryService, TagService } from './services/page.service.js';
import { AiService } from './services/ai.service.js';
import multer from 'multer';

const router = Router();

const pageService = new PageService();
const menuService = new MenuService();
const mediaService = new MediaService();
const settingsService = new SettingsService();
const revisionService = new RevisionService();
const formService = new FormService();
const submissionService = new SubmissionService();
const themeTemplateService = new ThemeTemplateService();
const popupService = new PopupService();
const fontService = new FontService();
const iconService = new IconService();
const aiService = new AiService();
const redirectService = new RedirectService();
const categoryService = new CategoryService();
const tagService = new TagService();

// Multer config for file uploads (memory storage for sharp processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    const allowed = /^(image|video|audio|application)\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

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
    const passwordToken = req.headers['x-page-password'] || req.query.password_token;
    const result = await pageService.findBySlug(req.params.slug, { passwordToken });
    if (!result.success) {
      const code = result.error?.code;
      const status = code === 'NOT_FOUND' ? 404 : code === 'PAGE_PRIVATE' ? 403 : 404;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Get page by slug error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch page'));
  }
});

router.post('/public/pages/:slug/verify-password', [body('password').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.verifyPagePassword(req.params.slug, req.body.password);
    if (!result.success) {
      const code = result.error?.code;
      const status = code === 'NOT_FOUND' ? 404 : code === 'NOT_PROTECTED' ? 400 : 401;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Verify page password error:', error);
    res.status(500).json(responseUtil.error('Failed to verify password'));
  }
});

router.get('/public/pages/:slug/breadcrumbs', async (req, res) => {
  try {
    const result = await pageService.getBreadcrumbs(req.params.slug);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Breadcrumbs error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch breadcrumbs'));
  }
});

router.get('/public/menus/:location', async (req, res) => {
  try {
    const result = await menuService.getByLocationNested(req.params.location);
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

router.get('/public/theme/:type', async (req, res) => {
  try {
    // Support preview_id: bypass condition matching and return a specific template directly
    if (req.query.preview_id) {
      const result = await themeTemplateService.findById(parseInt(req.query.preview_id));
      return res.json(result);
    }
    // Build context from query params for condition matching
    const context = {
      pageType: req.query.pageType || null,
      slug: req.query.slug || null,
      pageId: req.query.pageId || null,
      authorId: req.query.authorId || null,
      taxonomy: req.query.taxonomy || null,
    };
    const result = await themeTemplateService.getActiveTemplate(req.params.type, context);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch theme template'));
  }
});

// Explicit public endpoints for new template types
router.get('/public/theme/single-post', async (req, res, next) => {
  try {
    const context = {
      pageType: 'post',
      slug: req.query.slug || null,
      pageId: req.query.pageId || null,
      authorId: req.query.authorId || null,
    };
    const result = await themeTemplateService.getActiveTemplate('single-post', context);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/theme/archive', async (req, res, next) => {
  try {
    const context = {
      pageType: 'archive',
      taxonomy: req.query.taxonomy || null,
    };
    const result = await themeTemplateService.getActiveTemplate('archive', context);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/theme/404', async (req, res, next) => {
  try {
    const result = await themeTemplateService.getActiveTemplate('error-404', {});
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/theme/search', async (req, res, next) => {
  try {
    const context = {
      pageType: 'search',
      query: req.query.q || null,
    };
    const result = await themeTemplateService.getActiveTemplate('search-results', context);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/popups', async (req, res) => {
  try {
    const result = await popupService.getActivePopups();
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch popups'));
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

router.get('/public/sitemap.xml', async (req, res) => {
  try {
    const pages = await pageService.getSitemap();
    const siteUrl = process.env.SITE_URL || 'http://localhost:3100';

    const urlEntries = pages.map(p => {
      const priority = p.slug === '' || p.slug === 'home' ? '1.0' : p.parentId ? '0.6' : '0.8';
      const loc = siteUrl + '/' + p.slug;
      const lastmod = (p.updatedAt || p.createdAt || new Date()).toISOString().split('T')[0];
      return '  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + lastmod + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>' + priority + '</priority>\n  </url>';
    }).join('\n');

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urlEntries + '\n</urlset>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

router.get('/public/robots.txt', async (req, res) => {
  try {
    const settings = await settingsService.getAll();
    const s = {};
    for (const row of settings) s[row.key] = row.value;
    const siteUrl = process.env.SITE_URL || 'http://localhost:3100';
    const robotsTxt = s['robots_txt'] || 'User-agent: *\nAllow: /\nSitemap: ' + siteUrl + '/sitemap.xml';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(robotsTxt);
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send('User-agent: *\nAllow: /');
  }
});

// GET /api/website/public/query — dynamic content query for Loop blocks
router.get('/public/query', async (req, res, next) => {
  try {
    const qs = new QueryService();
    const results = await qs.execute(req.query);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
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

// Public form submission (no auth)
router.post('/public/forms/:id/submit', [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await submissionService.submit(req.params.id, req.body, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      pageSlug: req.body._pageSlug,
    });
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json(responseUtil.error('Failed to submit form'));
  }
});

// CSS design tokens endpoint
router.get('/public/styles.css', async (req, res) => {
  try {
    const settings = await settingsService.getAll();
    const s = {};
    for (const row of settings) s[row.key] = row.value;

    const primary = s['color_primary'] || '#1677ff';
    const secondary = s['color_secondary'] || '#0050b3';
    const accent = s['color_accent'] || '#faad14';
    const neutral = s['color_neutral'] || '#6b7280';
    const fontHeading = s['font_heading'] || "'Inter', sans-serif";
    const fontBody = s['font_body'] || "'Inter', sans-serif";

    // Parse design_tokens JSON — shape: { colors: {...}, typography: {...} }
    let tokens = { colors: {}, typography: {} };
    try { tokens = { colors: {}, typography: {}, ...JSON.parse(s['design_tokens'] || '{}') }; } catch {}

    // Flatten token groups into CSS custom properties
    const tokenLines = [];
    for (const [k, v] of Object.entries(tokens.colors || {})) {
      tokenLines.push(`  --lume-color-${k}: ${v};`);
    }
    for (const [k, v] of Object.entries(tokens.typography || {})) {
      // camelCase keys → kebab-case: headingFont → heading-font
      const kebab = k.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      tokenLines.push(`  --lume-type-${kebab}: ${v}${typeof v === 'number' ? 'px' : ''};`);
    }

    const css = `:root {
  --lume-primary: ${tokens.colors?.primary || primary};
  --lume-secondary: ${tokens.colors?.secondary || secondary};
  --lume-accent: ${tokens.colors?.accent || accent};
  --lume-neutral: ${tokens.colors?.neutral || neutral};
  --lume-font-heading: ${fontHeading};
  --lume-font-body: ${fontBody};
${tokenLines.join('\n')}
}`;

    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(css);
  } catch (err) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.send(':root {}');
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
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : undefined,
      tagId: req.query.tagId ? parseInt(req.query.tagId) : undefined,
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
    const result = await pageService.update(req.params.id, req.body, req.user?.id);
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

// ─── Page Revisions API ───

router.get('/pages/:id/revisions', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await revisionService.findAll(req.params.id, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  } catch (error) {
    console.error('Get revisions error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch revisions'));
  }
});

router.get('/pages/:id/revisions/:revId', authenticate, [param('id').isInt(), param('revId').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await revisionService.findById(req.params.revId);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get revision error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch revision'));
  }
});

router.post('/pages/:id/revisions/:revId/revert', authenticate, [param('id').isInt(), param('revId').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await revisionService.revert(req.params.id, req.params.revId);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Revert revision error:', error);
    res.status(500).json(responseUtil.error('Failed to revert revision'));
  }
});

router.post('/pages/:id/autosave', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await revisionService.create(Number(req.params.id), {
      content: req.body.content,
      contentHtml: req.body.contentHtml,
      createdBy: req.user?.id,
      isAutoSave: true,
      changeDescription: 'Auto-save',
    });
    res.json(result);
  } catch (error) {
    console.error('Autosave error:', error);
    res.status(500).json(responseUtil.error('Failed to autosave'));
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

router.put('/menus/:id/reorder', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await menuService.reorderItems(req.params.id, req.body.items || []);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to reorder menu items'));
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

router.post('/media/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(responseUtil.error('No file provided'));
    const result = await mediaService.uploadFile(req.file, req.user?.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json(responseUtil.error('Failed to upload media'));
  }
});

router.post('/media/upload-multiple', authenticate, upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json(responseUtil.error('No files provided'));
    const results = [];
    for (const file of req.files) {
      const result = await mediaService.uploadFile(file, req.user?.id);
      if (result.success) results.push(result.data);
    }
    res.status(201).json(responseUtil.success(results, `${results.length} files uploaded`));
  } catch (error) {
    console.error('Multiple media upload error:', error);
    res.status(500).json(responseUtil.error('Failed to upload media'));
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

// ─── Admin Forms API ───

router.get('/forms', authenticate, async (req, res) => {
  try {
    const result = await formService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch forms'));
  }
});

router.get('/forms/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await formService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch form'));
  }
});

router.post('/forms', authenticate, [body('name').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await formService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to create form'));
  }
});

router.put('/forms/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await formService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update form'));
  }
});

router.delete('/forms/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await formService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete form'));
  }
});

// ─── Form Submissions API ───

router.get('/forms/:id/submissions', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await submissionService.findAll(req.params.id, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch submissions'));
  }
});

router.post('/forms/:id/submissions/:subId/read', authenticate, [param('id').isInt(), param('subId').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await submissionService.markRead(req.params.subId);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to mark submission as read'));
  }
});

router.delete('/forms/:id/submissions/:subId', authenticate, [param('id').isInt(), param('subId').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await submissionService.delete(req.params.subId);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete submission'));
  }
});

// ─── Admin Theme Templates API ───

router.get('/theme-templates', authenticate, async (req, res) => {
  try {
    const result = await themeTemplateService.findAll({ type: req.query.type });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch theme templates'));
  }
});

router.get('/theme-templates/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await themeTemplateService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch theme template'));
  }
});

router.post('/theme-templates', authenticate, [body('name').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await themeTemplateService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to create theme template'));
  }
});

router.put('/theme-templates/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await themeTemplateService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update theme template'));
  }
});

router.delete('/theme-templates/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await themeTemplateService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete theme template'));
  }
});

// ─── Admin Popups API ───

router.get('/popups', authenticate, async (req, res) => {
  try {
    const result = await popupService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch popups'));
  }
});

router.get('/popups/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await popupService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch popup'));
  }
});

router.post('/popups', authenticate, [body('name').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await popupService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to create popup'));
  }
});

router.put('/popups/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await popupService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update popup'));
  }
});

router.delete('/popups/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await popupService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete popup'));
  }
});

// ─── Page Import/Export ───

router.get('/pages/:id/export', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await pageService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    const page = result.data;
    const exportData = {
      _version: '1.0',
      _type: 'lume_page_export',
      title: page.title,
      slug: page.slug,
      content: page.content,
      contentHtml: page.contentHtml,
      excerpt: page.excerpt,
      template: page.template,
      pageType: page.pageType,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      customCss: page.customCss,
      headScripts: page.headScripts,
      bodyScripts: page.bodyScripts,
    };
    res.setHeader('Content-Disposition', `attachment; filename="${page.slug || 'page'}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(responseUtil.success(exportData));
  } catch (error) {
    console.error('Export page error:', error);
    res.status(500).json(responseUtil.error('Failed to export page'));
  }
});

router.post('/pages/import', authenticate, async (req, res) => {
  try {
    const importData = req.body;
    if (!importData || importData._type !== 'lume_page_export') {
      return res.status(400).json(responseUtil.error('Invalid import format'));
    }
    const { _version, _type, ...pageData } = importData;
    // Ensure unique slug
    pageData.slug = pageData.slug ? `${pageData.slug}-imported-${Date.now()}` : `imported-${Date.now()}`;
    pageData.title = pageData.title ? `${pageData.title} (Imported)` : 'Imported Page';
    pageData.isPublished = false;
    pageData.createdBy = req.user?.id;
    const result = await pageService.create(pageData);
    res.status(201).json(result);
  } catch (error) {
    console.error('Import page error:', error);
    res.status(500).json(responseUtil.error('Failed to import page'));
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

// ─── Custom Fonts API ───

router.get('/fonts', authenticate, async (req, res) => {
  try {
    const result = await fontService.findAll({ search: req.query.search });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch fonts'));
  }
});

router.get('/fonts/google-search', authenticate, async (req, res) => {
  try {
    const result = await fontService.searchGoogleFonts(req.query.q || '');
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to search Google Fonts'));
  }
});

router.get('/fonts/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await fontService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch font'));
  }
});

router.post('/fonts/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(responseUtil.error('No file provided'));
    const result = await fontService.uploadFont(req.file);
    res.status(201).json(result);
  } catch (error) {
    console.error('Font upload error:', error);
    res.status(500).json(responseUtil.error('Failed to upload font'));
  }
});

router.put('/fonts/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await fontService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update font'));
  }
});

router.delete('/fonts/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await fontService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete font'));
  }
});

// ─── Custom Icons API ───

router.get('/icons', authenticate, async (req, res) => {
  try {
    const result = await iconService.findAll({ search: req.query.search, setName: req.query.setName });
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch icons'));
  }
});

router.get('/icons/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await iconService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to fetch icon'));
  }
});

router.post('/icons/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(responseUtil.error('No file provided'));
    const result = await iconService.uploadIcon(req.file);
    res.status(201).json(result);
  } catch (error) {
    console.error('Icon upload error:', error);
    res.status(500).json(responseUtil.error('Failed to upload icon'));
  }
});

router.post('/icons/upload-multiple', authenticate, upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json(responseUtil.error('No files provided'));
    const result = await iconService.uploadMultipleIcons(req.files);
    res.status(201).json(result);
  } catch (error) {
    console.error('Icon upload error:', error);
    res.status(500).json(responseUtil.error('Failed to upload icons'));
  }
});

router.post('/icons', authenticate, [body('name').notEmpty(), body('svgContent').notEmpty()], validateRequest, async (req, res) => {
  try {
    const result = await iconService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to create icon'));
  }
});

router.put('/icons/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await iconService.update(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to update icon'));
  }
});

router.delete('/icons/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await iconService.delete(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(responseUtil.error('Failed to delete icon'));
  }
});

// ─── AI Generation API ───

router.post('/ai/generate-text', authenticate, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
], validateRequest, async (req, res) => {
  try {
    const { prompt, tone, length, maxTokens } = req.body;
    const result = await aiService.generateText(prompt, { tone, length, maxTokens });
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    console.error('AI generate text error:', error);
    res.status(500).json(responseUtil.error('Failed to generate text'));
  }
});

router.post('/ai/generate-code', authenticate, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
], validateRequest, async (req, res) => {
  try {
    const { prompt, language } = req.body;
    const result = await aiService.generateCode(prompt, language || 'html');
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    console.error('AI generate code error:', error);
    res.status(500).json(responseUtil.error('Failed to generate code'));
  }
});

// ─── Admin Redirects API ───

router.get('/redirects', authenticate, async (req, res) => {
  try {
    const result = await redirectService.findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
    });
    res.json(result);
  } catch (error) {
    console.error('Get redirects error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch redirects'));
  }
});

router.get('/redirects/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await redirectService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Get redirect error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch redirect'));
  }
});

router.post('/redirects', authenticate, [
  body('sourcePath').notEmpty().withMessage('Source path is required'),
  body('targetPath').notEmpty().withMessage('Target path is required'),
], validateRequest, async (req, res) => {
  try {
    const result = await redirectService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create redirect error:', error);
    res.status(500).json(responseUtil.error('Failed to create redirect'));
  }
});

router.put('/redirects/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await redirectService.update(req.params.id, req.body);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Update redirect error:', error);
    res.status(500).json(responseUtil.error('Failed to update redirect'));
  }
});

router.delete('/redirects/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res) => {
  try {
    const result = await redirectService.delete(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (error) {
    console.error('Delete redirect error:', error);
    res.status(500).json(responseUtil.error('Failed to delete redirect'));
  }
});


// ─── Public Categories & Tags API ───

router.get('/public/categories', async (req, res, next) => {
  try {
    const result = await categoryService.findAll({ search: req.query.search });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/categories/:slug', async (req, res, next) => {
  try {
    const result = await categoryService.findBySlug(req.params.slug);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/categories/:slug/pages', async (req, res, next) => {
  try {
    const cat = await categoryService.findBySlug(req.params.slug);
    if (!cat.success) return res.status(404).json(cat);
    const pages = await categoryService.findPagesByCategory(cat.data.id);
    res.json(pages);
  } catch (err) { next(err); }
});

router.get('/public/tags', async (req, res, next) => {
  try {
    const result = await tagService.findAll({ search: req.query.search });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/tags/:slug', async (req, res, next) => {
  try {
    const result = await tagService.findBySlug(req.params.slug);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/public/tags/:slug/pages', async (req, res, next) => {
  try {
    const tag = await tagService.findBySlug(req.params.slug);
    if (!tag.success) return res.status(404).json(tag);
    const pages = await tagService.findPagesByTag(tag.data.id);
    res.json(pages);
  } catch (err) { next(err); }
});

// ─── Admin Categories API ───

router.put('/categories/reorder', authenticate, async (req, res, next) => {
  try {
    const result = await categoryService.reorder(req.body.items || []);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const result = await categoryService.findAll({ search: req.query.search });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/categories/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await categoryService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/categories', authenticate, [body('name').notEmpty()], validateRequest, async (req, res, next) => {
  try {
    const result = await categoryService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/categories/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await categoryService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/categories/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await categoryService.delete(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Admin Tags API ───

router.get('/tags', authenticate, async (req, res, next) => {
  try {
    const result = await tagService.findAll({ search: req.query.search });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/tags/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await tagService.findById(req.params.id);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/tags', authenticate, [body('name').notEmpty()], validateRequest, async (req, res, next) => {
  try {
    const result = await tagService.create(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.put('/tags/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await tagService.update(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/tags/:id', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await tagService.delete(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Page Locking ───

router.get('/pages/:id/lock', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await pageService.getLockStatus(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/pages/:id/lock', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await pageService.lockPage(req.params.id, req.user?.id);
    if (!result.success && result.error?.code === 'PAGE_LOCKED') return res.status(409).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/pages/:id/unlock', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await pageService.unlockPage(req.params.id, req.user?.id);
    if (!result.success && result.error?.code === 'FORBIDDEN') return res.status(403).json(result);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── Page Taxonomy ───

router.get('/pages/:id/categories', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await categoryService.getPageCategories(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/pages/:id/categories', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await categoryService.setPageCategories(req.params.id, req.body.categoryIds || []);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/pages/:id/tags', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await tagService.getPageTags(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/pages/:id/tags', authenticate, [param('id').isInt()], validateRequest, async (req, res, next) => {
  try {
    const result = await tagService.setPageTags(req.params.id, req.body.tagIds || []);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
