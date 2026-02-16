import { jest } from '@jest/globals';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modulesDir = join(__dirname, '..', '..', 'src', 'modules');

// ─── Editor Module Manifest Tests ───

describe('Editor Module Manifest', () => {
  let manifest;

  beforeAll(async () => {
    const manifestPath = join(modulesDir, 'editor', '__manifest__.js');
    expect(existsSync(manifestPath)).toBe(true);
    const imported = await import(pathToFileURL(manifestPath).href);
    manifest = imported.default || imported;
  });

  test('has correct technical name', () => {
    expect(manifest.technicalName).toBe('editor');
  });

  test('has name and version', () => {
    expect(manifest.name).toBe('Editor');
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('is a utility module (application: false)', () => {
    expect(manifest.application).toBe(false);
  });

  test('auto-installs', () => {
    expect(manifest.autoInstall).toBe(true);
  });

  test('depends on base only', () => {
    expect(manifest.depends).toEqual(['base']);
  });

  test('has template permissions', () => {
    expect(manifest.permissions).toContain('editor.template.read');
    expect(manifest.permissions).toContain('editor.template.create');
    expect(manifest.permissions).toContain('editor.template.edit');
    expect(manifest.permissions).toContain('editor.template.delete');
  });

  test('has snippet permissions', () => {
    expect(manifest.permissions).toContain('editor.snippet.read');
    expect(manifest.permissions).toContain('editor.snippet.create');
    expect(manifest.permissions).toContain('editor.snippet.edit');
    expect(manifest.permissions).toContain('editor.snippet.delete');
  });

  test('has models, api, and services arrays', () => {
    expect(manifest.models).toEqual(['models/schema.js']);
    expect(manifest.api).toEqual(['api/index.js']);
    expect(manifest.services).toEqual(['services/editor.service.js']);
  });

  test('has a category', () => {
    expect(manifest.category).toBeDefined();
    expect(typeof manifest.category).toBe('string');
  });
});

// ─── Editor Module Files Existence Tests ───

describe('Editor Module File Structure', () => {
  const editorDir = join(modulesDir, 'editor');

  test('__manifest__.js exists', () => {
    expect(existsSync(join(editorDir, '__manifest__.js'))).toBe(true);
  });

  test('__init__.js exists', () => {
    expect(existsSync(join(editorDir, '__init__.js'))).toBe(true);
  });

  test('models/schema.js exists', () => {
    expect(existsSync(join(editorDir, 'models', 'schema.js'))).toBe(true);
  });

  test('services/editor.service.js exists', () => {
    expect(existsSync(join(editorDir, 'services', 'editor.service.js'))).toBe(true);
  });

  test('api/index.js exists', () => {
    expect(existsSync(join(editorDir, 'api', 'index.js'))).toBe(true);
  });

  test('static/components/RichEditor.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'RichEditor.vue'))).toBe(true);
  });

  test('static/components/CompactEditor.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'CompactEditor.vue'))).toBe(true);
  });

  test('static/components/EditorToolbar.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'EditorToolbar.vue'))).toBe(true);
  });

  test('static/components/index.ts exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'index.ts'))).toBe(true);
  });

  test('static/api/index.ts exists', () => {
    expect(existsSync(join(editorDir, 'static', 'api', 'index.ts'))).toBe(true);
  });

  test('static/views/templates.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'views', 'templates.vue'))).toBe(true);
  });

  // Page Builder components
  test('static/components/PageBuilder.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'PageBuilder.vue'))).toBe(true);
  });

  test('static/components/BlockPalette.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'BlockPalette.vue'))).toBe(true);
  });

  test('static/components/BlockSettings.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'BlockSettings.vue'))).toBe(true);
  });

  test('static/components/SlashCommandList.vue exists', () => {
    expect(existsSync(join(editorDir, 'static', 'components', 'SlashCommandList.vue'))).toBe(true);
  });
});

// ─── Page Builder Block Extensions ───

describe('Page Builder Block Extensions', () => {
  const extDir = join(modulesDir, 'editor', 'static', 'extensions');

  const extensions = [
    'SectionBlock.ts',
    'ColumnsBlock.ts',
    'ColumnBlock.ts',
    'ImageBlock.ts',
    'ButtonBlock.ts',
    'SpacerBlock.ts',
    'VideoBlock.ts',
    'CalloutBlock.ts',
    'HtmlBlock.ts',
    'SlashCommand.ts',
    'index.ts',
  ];

  test.each(extensions)('extension %s exists', (file) => {
    expect(existsSync(join(extDir, file))).toBe(true);
  });
});

// ─── Page Builder Block View Components ───

describe('Page Builder Block Views', () => {
  const blocksDir = join(modulesDir, 'editor', 'static', 'components', 'blocks');

  const views = [
    'SectionBlockView.vue',
    'ColumnsBlockView.vue',
    'ColumnBlockView.vue',
    'ImageBlockView.vue',
    'ButtonBlockView.vue',
    'SpacerBlockView.vue',
    'VideoBlockView.vue',
    'CalloutBlockView.vue',
    'HtmlBlockView.vue',
  ];

  test.each(views)('block view %s exists', (file) => {
    expect(existsSync(join(blocksDir, file))).toBe(true);
  });
});

// ─── Editor Schema Tests ───

describe('Editor Drizzle Schema', () => {
  let schema;

  beforeAll(async () => {
    const schemaPath = join(modulesDir, 'editor', 'models', 'schema.js');
    const imported = await import(pathToFileURL(schemaPath).href);
    schema = imported;
  });

  test('exports editorTemplates table', () => {
    expect(schema.editorTemplates).toBeDefined();
  });

  test('exports editorSnippets table', () => {
    expect(schema.editorSnippets).toBeDefined();
  });

  test('editorTemplates has expected columns', () => {
    const table = schema.editorTemplates;
    // Drizzle tables have a Symbol-based structure; check column names exist
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('content');
    expect(columnNames).toContain('category');
    expect(columnNames).toContain('isDefault');
    expect(columnNames).toContain('description');
    expect(columnNames).toContain('thumbnailUrl');
    expect(columnNames).toContain('createdBy');
    expect(columnNames).toContain('deletedAt'); // soft delete
  });

  test('editorSnippets has expected columns', () => {
    const table = schema.editorSnippets;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('content');
    expect(columnNames).toContain('category');
    expect(columnNames).toContain('icon');
    expect(columnNames).toContain('shortcut');
    expect(columnNames).toContain('createdBy');
    expect(columnNames).toContain('deletedAt'); // soft delete
  });
});

// ─── Editor Service Class Tests ───

describe('Editor Service Classes', () => {
  let EditorTemplateService, EditorSnippetService;

  beforeAll(async () => {
    const servicePath = join(modulesDir, 'editor', 'services', 'editor.service.js');
    const imported = await import(pathToFileURL(servicePath).href);
    EditorTemplateService = imported.EditorTemplateService;
    EditorSnippetService = imported.EditorSnippetService;
  });

  test('EditorTemplateService class is exported', () => {
    expect(EditorTemplateService).toBeDefined();
    expect(typeof EditorTemplateService).toBe('function');
  });

  test('EditorTemplateService has expected methods', () => {
    const instance = new EditorTemplateService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.getDefault).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });

  test('EditorSnippetService class is exported', () => {
    expect(EditorSnippetService).toBeDefined();
    expect(typeof EditorSnippetService).toBe('function');
  });

  test('EditorSnippetService has expected methods', () => {
    const instance = new EditorSnippetService();
    expect(typeof instance.findAll).toBe('function');
    expect(typeof instance.findById).toBe('function');
    expect(typeof instance.create).toBe('function');
    expect(typeof instance.update).toBe('function');
    expect(typeof instance.delete).toBe('function');
  });
});

// ─── Website Module Depends on Editor ───

describe('Website Module Editor Dependency', () => {
  let manifest;

  beforeAll(async () => {
    const manifestPath = join(modulesDir, 'website', '__manifest__.js');
    const imported = await import(pathToFileURL(manifestPath).href);
    manifest = imported.default || imported;
  });

  test('website depends on editor', () => {
    expect(manifest.depends).toContain('editor');
  });
});
