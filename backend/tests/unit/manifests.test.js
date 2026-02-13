import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modulesDir = join(__dirname, '..', '..', 'src', 'modules');
const coreModulesDir = join(__dirname, '..', '..', 'src', 'core', 'modules');

// Dynamically discover all modules with manifests
const discoverModules = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(e => existsSync(join(dir, e.name, '__manifest__.js')))
    .map(e => ({ name: e.name, path: join(dir, e.name, '__manifest__.js') }));
};

const appModules = discoverModules(modulesDir);
const coreModules = discoverModules(coreModulesDir);
const allModules = [...appModules, ...coreModules];

describe('Module Manifests', () => {
  test('at least one module exists', () => {
    expect(allModules.length).toBeGreaterThan(0);
  });

  // Test each module manifest
  for (const mod of allModules) {
    describe(`Module: ${mod.name}`, () => {
      let manifest;

      beforeAll(async () => {
        const url = pathToFileURL(mod.path).href;
        const imported = await import(url);
        manifest = imported.default || imported;
      });

      test('has a name', () => {
        expect(manifest.name || manifest.technicalName).toBeDefined();
      });

      test('has a version', () => {
        expect(manifest.version).toBeDefined();
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
      });

      test('has a summary or description', () => {
        expect(manifest.summary || manifest.description).toBeDefined();
      });

      test('depends is an array', () => {
        const deps = manifest.depends || [];
        expect(Array.isArray(deps)).toBe(true);
      });

      test('permissions is array or undefined', () => {
        if (manifest.permissions) {
          expect(Array.isArray(manifest.permissions)).toBe(true);
        }
      });

      test('permission entries have a name', () => {
        const perms = manifest.permissions || [];
        for (const perm of perms) {
          if (typeof perm === 'object') {
            expect(perm.name).toBeDefined();
          } else {
            expect(typeof perm).toBe('string');
          }
        }
      });

      test('base module has no dependencies', () => {
        if (mod.name === 'base') {
          expect(manifest.depends || []).toEqual([]);
        }
      });
    });
  }
});

describe('Base Module Manifest', () => {
  let manifest;

  beforeAll(async () => {
    const basePath = join(modulesDir, 'base', '__manifest__.js');
    const url = pathToFileURL(basePath).href;
    const imported = await import(url);
    manifest = imported.default || imported;
  });

  test('has system category', () => {
    expect(manifest.category).toBe('System');
  });

  test('has settings schema', () => {
    expect(manifest.settings).toBeDefined();
    expect(manifest.settings.company_name).toBeDefined();
    expect(manifest.settings.timezone).toBeDefined();
  });

  test('has frontend menus', () => {
    const menus = manifest.frontend?.menus;
    expect(menus).toBeDefined();
    expect(menus.length).toBeGreaterThan(0);
  });

  test('has module management permissions', () => {
    const permNames = manifest.permissions.map(p => typeof p === 'string' ? p : p.name);
    expect(permNames).toContain('base.modules.manage');
    expect(permNames).toContain('base.users.manage');
    expect(permNames).toContain('base.roles.manage');
  });
});

describe('Lume Core Module Manifest', () => {
  let manifest;

  beforeAll(async () => {
    const lumePath = join(coreModulesDir, 'lume', '__manifest__.js');
    if (!existsSync(lumePath)) return;
    const imported = await import(pathToFileURL(lumePath).href);
    manifest = imported.default || imported;
  });

  test('has lume name', () => {
    expect(manifest.name).toBe('lume');
  });

  test('has settings', () => {
    expect(manifest.settings).toBeDefined();
    expect(manifest.settings.app_name).toBe('Lume');
  });

  test('has menus', () => {
    expect(manifest.menus.length).toBeGreaterThan(0);
  });

  test('has hook definitions', () => {
    expect(manifest.hooks).toBeDefined();
    expect(manifest.hooks.pre_init_hook).toBe('preInit');
  });

  test('has admin permissions', () => {
    const permNames = manifest.permissions.map(p => p.name);
    expect(permNames).toContain('lume.admin');
    expect(permNames).toContain('lume.hooks.manage');
    expect(permNames).toContain('lume.sequences.manage');
  });
});
