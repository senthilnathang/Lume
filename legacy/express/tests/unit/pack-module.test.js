import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { collectModuleFiles, installPack } from '../../src/scripts/pack-module.js';

function makeModules() {
  const dir = mkdtempSync(join(tmpdir(), 'lume-pack-'));
  const mod = join(dir, 'demo');
  mkdirSync(join(mod, 'api'), { recursive: true });
  writeFileSync(join(mod, '__manifest__.js'), 'export default {}');
  writeFileSync(join(mod, 'api', 'routes.js'), 'export default {}');
  return { dir, mod };
}

describe('module packager (F5.1)', () => {
  test('collects manifest plus module dirs only', () => {
    const { dir } = makeModules();
    const { files } = collectModuleFiles(dir, 'demo');
    expect(files).toContain('__manifest__.js');
    expect(files).toContain(join('api', 'routes.js'));
    rmSync(dir, { recursive: true, force: true });
  });

  test('refuses to overwrite existing directories', async () => {
    const { dir } = makeModules();
    await expect(installPack(join(dir, 'missing.tgz'), dir, {
      descriptor: { technicalName: 'demo', depends: [], sha256: 'x' },
    })).rejects.toThrow(/overwrite/);
    rmSync(dir, { recursive: true, force: true });
  });

  test('rejects missing dependencies before extracting', async () => {
    const { dir } = makeModules();
    const target = join(dir, 'newmod');
    await expect(installPack(join(dir, 'x.tgz'), dir, {
      descriptor: { technicalName: 'newmod', depends: ['ghost_dep'], sha256: 'x' },
    })).rejects.toThrow(/Missing dependencies: ghost_dep/);
    expect(existsSync(target)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});
