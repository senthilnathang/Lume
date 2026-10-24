import { jest } from '@jest/globals';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modulesDir = join(__dirname, '..', '..', 'src', 'modules');

// ─── Website Module Manifest Tests ───

describe('Website Module Manifest', () => {
  let manifest;

  beforeAll(async () => {
    const manifestPath = join(modulesDir, 'website', '__manifest__.js');
    expect(existsSync(manifestPath)).toBe(true);
    const imported = await import(pathToFileURL(manifestPath).href);
    manifest = imported.default || imported;
  });

  test('has correct technical name', () => {
    expect(manifest.technicalName).toBe('website');
  });

  test('has correct display name', () => {
    expect(manifest.name).toBe('Website');
  });

  test('is an application module (application: true)', () => {
    expect(manifest.application).toBe(true);
  });

  test('depends on base and editor', () => {
    expect(manifest.depends).toEqual(['base', 'editor']);
  });

  test('has 32 permissions', () => {
    expect(manifest.permissions).toHaveLength(32);
  });

  test('has page permissions', () => {
    expect(manifest.permissions).toContain('website.page.read');
    expect(manifest.permissions).toContain('website.page.create');
    expect(manifest.permissions).toContain('website.page.edit');
    expect(manifest.permissions).toContain('website.page.delete');
    expect(manifest.permissions).toContain('website.page.publish');
  });

  test('has menu permissions', () => {
    expect(manifest.permissions).toContain('website.menu.read');
    expect(manifest.permissions).toContain('website.menu.manage');
  });

  test('has media permissions', () => {
    expect(manifest.permissions).toContain('website.media.read');
    expect(manifest.permissions).toContain('website.media.upload');
    expect(manifest.permissions).toContain('website.media.delete');
  });

  test('has form and submission permissions', () => {
    expect(manifest.permissions).toContain('website.form.read');
    expect(manifest.permissions).toContain('website.form.create');
    expect(manifest.permissions).toContain('website.form.edit');
    expect(manifest.permissions).toContain('website.form.delete');
    expect(manifest.permissions).toContain('website.submission.read');
    expect(manifest.permissions).toContain('website.submission.delete');
  });

  test('has settings permissions', () => {
    expect(manifest.permissions).toContain('website.settings.read');
    expect(manifest.permissions).toContain('website.settings.edit');
  });

  test('has theme permissions', () => {
    expect(manifest.permissions).toContain('website.theme.read');
    expect(manifest.permissions).toContain('website.theme.create');
    expect(manifest.permissions).toContain('website.theme.edit');
    expect(manifest.permissions).toContain('website.theme.delete');
  });

  test('has popup permissions', () => {
    expect(manifest.permissions).toContain('website.popup.read');
    expect(manifest.permissions).toContain('website.popup.create');
    expect(manifest.permissions).toContain('website.popup.edit');
    expect(manifest.permissions).toContain('website.popup.delete');
  });

  test('has redirect permissions', () => {
    expect(manifest.permissions).toContain('website.redirect.read');
    expect(manifest.permissions).toContain('website.redirect.manage');
  });

  test('has category permissions', () => {
    expect(manifest.permissions).toContain('website.category.read');
    expect(manifest.permissions).toContain('website.category.manage');
  });

  test('has tag permissions', () => {
    expect(manifest.permissions).toContain('website.tag.read');
    expect(manifest.permissions).toContain('website.tag.manage');
  });

  test('has 10 menu children', () => {
    expect(manifest.frontend.menus).toHaveLength(1);
    expect(manifest.frontend.menus[0].children).toHaveLength(10);
  });

  test('menu children include Pages, Menus, Media, Forms, Theme Builder, Popups, Settings, Redirects, Categories, Tags', () => {
    const childNames = manifest.frontend.menus[0].children.map(c => c.name);
    expect(childNames).toEqual(['Pages', 'Menus', 'Media', 'Forms', 'Theme Builder', 'Popups', 'Settings', 'Redirects', 'Categories', 'Tags']);
  });

  test('has models, api, and services arrays', () => {
    expect(manifest.models).toEqual(['models/schema.js']);
    expect(manifest.api).toEqual(['website.routes.js']);
    expect(manifest.services).toEqual(['services/page.service.js']);
  });

  test('has a category', () => {
    expect(manifest.category).toBeDefined();
    expect(typeof manifest.category).toBe('string');
  });
});

// ─── Website Module File Structure Tests ───

describe('Website Module File Structure', () => {
  const websiteDir = join(modulesDir, 'website');

  // Core module files
  test('__manifest__.js exists', () => {
    expect(existsSync(join(websiteDir, '__manifest__.js'))).toBe(true);
  });

  test('models/schema.js exists', () => {
    expect(existsSync(join(websiteDir, 'models', 'schema.js'))).toBe(true);
  });

  test('services/page.service.js exists', () => {
    expect(existsSync(join(websiteDir, 'services', 'page.service.js'))).toBe(true);
  });

  test('website.routes.js exists', () => {
    expect(existsSync(join(websiteDir, 'website.routes.js'))).toBe(true);
  });

  test('seed-content.js exists', () => {
    expect(existsSync(join(websiteDir, 'seed-content.js'))).toBe(true);
  });

  // Views
  test('static/views/pages.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'pages.vue'))).toBe(true);
  });

  test('static/views/page-editor.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'page-editor.vue'))).toBe(true);
  });

  test('static/views/menus.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'menus.vue'))).toBe(true);
  });

  test('static/views/media.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'media.vue'))).toBe(true);
  });

  test('static/views/settings.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'settings.vue'))).toBe(true);
  });

  test('static/views/forms.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'forms.vue'))).toBe(true);
  });

  test('static/views/theme-builder.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'theme-builder.vue'))).toBe(true);
  });

  test('static/views/popups.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'popups.vue'))).toBe(true);
  });

  // Components
  test('static/components/RevisionHistoryDrawer.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'components', 'RevisionHistoryDrawer.vue'))).toBe(true);
  });

  test('static/components/MediaPickerModal.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'components', 'MediaPickerModal.vue'))).toBe(true);
  });

  test('static/components/DesignTokensEditor.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'components', 'DesignTokensEditor.vue'))).toBe(true);
  });

  test('static/components/MenuTreeNode.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'components', 'MenuTreeNode.vue'))).toBe(true);
  });

  // API
  test('static/api/index.ts exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'api', 'index.ts'))).toBe(true);
  });
});

// ─── Website Drizzle Schema Tests ───

describe('Website Drizzle Schema', () => {
  let schema;

  beforeAll(async () => {
    const schemaPath = join(modulesDir, 'website', 'models', 'schema.js');
    const imported = await import(pathToFileURL(schemaPath).href);
    schema = imported;
  });

  test('exports websitePages table', () => {
    expect(schema.websitePages).toBeDefined();
  });

  test('exports websiteMenus table', () => {
    expect(schema.websiteMenus).toBeDefined();
  });

  test('exports websiteMenuItems table', () => {
    expect(schema.websiteMenuItems).toBeDefined();
  });

  test('exports websiteMedia table', () => {
    expect(schema.websiteMedia).toBeDefined();
  });

  test('exports websitePageRevisions table', () => {
    expect(schema.websitePageRevisions).toBeDefined();
  });

  test('exports websiteForms table', () => {
    expect(schema.websiteForms).toBeDefined();
  });

  test('exports websiteFormSubmissions table', () => {
    expect(schema.websiteFormSubmissions).toBeDefined();
  });

  test('exports websiteThemeTemplates table', () => {
    expect(schema.websiteThemeTemplates).toBeDefined();
  });

  test('exports websitePopups table', () => {
    expect(schema.websitePopups).toBeDefined();
  });

  test('exports websiteSettings table', () => {
    expect(schema.websiteSettings).toBeDefined();
  });

  test('websitePages has expected columns', () => {
    const table = schema.websitePages;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('title');
    expect(columnNames).toContain('slug');
    expect(columnNames).toContain('content');
    expect(columnNames).toContain('contentHtml');
    expect(columnNames).toContain('pageType');
    expect(columnNames).toContain('isPublished');
    expect(columnNames).toContain('headScripts');
    expect(columnNames).toContain('bodyScripts');
    expect(columnNames).toContain('metaTitle');
  });

  test('websiteThemeTemplates has expected columns', () => {
    const table = schema.websiteThemeTemplates;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('type');
    expect(columnNames).toContain('content');
    expect(columnNames).toContain('conditions');
    expect(columnNames).toContain('priority');
    expect(columnNames).toContain('isActive');
  });

  test('websitePopups has expected columns', () => {
    const table = schema.websitePopups;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('content');
    expect(columnNames).toContain('triggerType');
    expect(columnNames).toContain('triggerValue');
    expect(columnNames).toContain('position');
    expect(columnNames).toContain('width');
    expect(columnNames).toContain('overlayClose');
    expect(columnNames).toContain('showOnce');
    expect(columnNames).toContain('isActive');
  });

  test('websiteForms has expected columns', () => {
    const table = schema.websiteForms;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('fields');
    expect(columnNames).toContain('settings');
    expect(columnNames).toContain('isActive');
    expect(columnNames).toContain('submissionCount');
  });
});

// ─── Website Service Class Tests ───

describe('Website Service Classes', () => {
  let PageService, SettingsService, MenuService, MediaService, RevisionService, FormService, SubmissionService, ThemeTemplateService, PopupService;

  beforeAll(async () => {
    const servicePath = join(modulesDir, 'website', 'services', 'page.service.js');
    const imported = await import(pathToFileURL(servicePath).href);
    PageService = imported.PageService;
    SettingsService = imported.SettingsService;
    MenuService = imported.MenuService;
    MediaService = imported.MediaService;
    RevisionService = imported.RevisionService;
    FormService = imported.FormService;
    SubmissionService = imported.SubmissionService;
    ThemeTemplateService = imported.ThemeTemplateService;
    PopupService = imported.PopupService;
  });

  // PageService
  test('PageService class is exported', () => {
    expect(PageService).toBeDefined();
    expect(typeof PageService).toBe('function');
  });

  test('PageService has expected methods', () => {
    const instance = new PageService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  // SettingsService
  test('SettingsService class is exported', () => {
    expect(SettingsService).toBeDefined();
    expect(typeof SettingsService).toBe('function');
  });

  test('SettingsService has expected methods', () => {
    const instance = new SettingsService();
    expect(typeof instance.getAll).toBe('function');
    expect(typeof instance.get).toBe('function');
    expect(typeof instance.set).toBe('function');
    expect(typeof instance.bulkSet).toBe('function');
  });

  // MenuService
  test('MenuService class is exported', () => {
    expect(MenuService).toBeDefined();
    expect(typeof MenuService).toBe('function');
  });

  test('MenuService has expected methods', () => {
    const instance = new MenuService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findWithItems).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  // MediaService
  test('MediaService class is exported', () => {
    expect(MediaService).toBeDefined();
    expect(typeof MediaService).toBe('function');
  });

  test('MediaService has expected methods', () => {
    const instance = new MediaService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.uploadFile).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  // RevisionService
  test('RevisionService class is exported', () => {
    expect(RevisionService).toBeDefined();
    expect(typeof RevisionService).toBe('function');
  });

  test('RevisionService has expected methods', () => {
    const instance = new RevisionService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.revert).toBe('function');
  });

  // FormService
  test('FormService class is exported', () => {
    expect(FormService).toBeDefined();
    expect(typeof FormService).toBe('function');
  });

  test('FormService has expected methods', () => {
    const instance = new FormService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  // SubmissionService
  test('SubmissionService class is exported', () => {
    expect(SubmissionService).toBeDefined();
    expect(typeof SubmissionService).toBe('function');
  });

  test('SubmissionService has expected methods', () => {
    const instance = new SubmissionService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.submit).toBe('function');
    expect(typeof instance.markRead).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  // ThemeTemplateService
  test('ThemeTemplateService class is exported', () => {
    expect(ThemeTemplateService).toBeDefined();
    expect(typeof ThemeTemplateService).toBe('function');
  });

  test('ThemeTemplateService has expected methods', () => {
    const instance = new ThemeTemplateService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  // PopupService
  test('PopupService class is exported', () => {
    expect(PopupService).toBeDefined();
    expect(typeof PopupService).toBe('function');
  });

  test('PopupService has expected methods', () => {
    const instance = new PopupService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });
});

// ─── Phase 17: Taxonomy Schema Tables ───

describe('Phase 17 Taxonomy Schema Tables', () => {
  let schema;

  beforeAll(async () => {
    const schemaPath = join(modulesDir, 'website', 'models', 'schema.js');
    const imported = await import(pathToFileURL(schemaPath).href);
    schema = imported;
  });

  test('exports websiteCategories table', () => {
    expect(schema.websiteCategories).toBeDefined();
  });

  test('exports websiteTags table', () => {
    expect(schema.websiteTags).toBeDefined();
  });

  test('exports websitePageCategories table', () => {
    expect(schema.websitePageCategories).toBeDefined();
  });

  test('exports websitePageTags table', () => {
    expect(schema.websitePageTags).toBeDefined();
  });

  test('websiteCategories has expected columns', () => {
    const table = schema.websiteCategories;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('slug');
    expect(columnNames).toContain('description');
    expect(columnNames).toContain('parentId');
    expect(columnNames).toContain('sequence');
  });

  test('websiteTags has expected columns', () => {
    const table = schema.websiteTags;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('slug');
  });

  test('websitePages has scheduling and access columns', () => {
    const table = schema.websitePages;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('publishAt');
    expect(columnNames).toContain('expireAt');
    expect(columnNames).toContain('visibility');
    expect(columnNames).toContain('passwordHash');
    expect(columnNames).toContain('lockedBy');
    expect(columnNames).toContain('lockedAt');
  });
});

// ─── Phase 17: CategoryService and TagService ───

describe('Phase 17 Taxonomy Services', () => {
  let CategoryService, TagService;

  beforeAll(async () => {
    const servicePath = join(modulesDir, 'website', 'services', 'page.service.js');
    const imported = await import(pathToFileURL(servicePath).href);
    CategoryService = imported.CategoryService;
    TagService = imported.TagService;
  });

  test('CategoryService class is exported', () => {
    expect(CategoryService).toBeDefined();
    expect(typeof CategoryService).toBe('function');
  });

  test('CategoryService has expected methods', () => {
    const instance = new CategoryService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findBySlug).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
    expect(typeof instance.findPagesByCategory).toBe('function');
    expect(typeof instance.reorder).toBe('function');
  });

  test('TagService class is exported', () => {
    expect(TagService).toBeDefined();
    expect(typeof TagService).toBe('function');
  });

  test('TagService has expected methods', () => {
    const instance = new TagService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findBySlug).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
    expect(typeof instance.findPagesByTag).toBe('function');
  });
});

// ─── Phase 17/18: PageService Advanced Methods ───

describe('Phase 17/18 PageService Advanced Methods', () => {
  let PageService;

  beforeAll(async () => {
    const servicePath = join(modulesDir, 'website', 'services', 'page.service.js');
    const imported = await import(pathToFileURL(servicePath).href);
    PageService = imported.PageService;
  });

  test('PageService has scheduling methods', () => {
    const instance = new PageService();
    expect(typeof instance.checkAndApplyScheduling).toBe('function');
  });

  test('PageService has access control methods', () => {
    const instance = new PageService();
    expect(typeof instance.verifyPagePassword).toBe('function');
  });

  test('PageService has page locking methods', () => {
    const instance = new PageService();
    expect(typeof instance.lockPage).toBe('function');
    expect(typeof instance.unlockPage).toBe('function');
  });

  test('PageService has breadcrumbs method', () => {
    const instance = new PageService();
    expect(typeof instance.getBreadcrumbs).toBe('function');
  });
});

// ─── Phase 17/18: New Website Admin Views ───

describe('Phase 17/18 New Website Admin Views', () => {
  const websiteDir = join(modulesDir, 'website');

  test('static/views/categories.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'categories.vue'))).toBe(true);
  });

  test('static/views/tags.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'tags.vue'))).toBe(true);
  });

  test('static/views/redirects.vue exists', () => {
    expect(existsSync(join(websiteDir, 'static', 'views', 'redirects.vue'))).toBe(true);
  });
});
