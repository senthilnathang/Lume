import { jest } from '@jest/globals';
import { AdminModulesController } from '../../../src/modules/base/controllers/admin-modules.controller';

describe('deployed module catalog', () => {
  class WebsiteModule {}
  class UnrelatedModule {}
  const definition = { name: 'extension', version: '1.0.0' };
  const loader = { isLoaded: (name: string) => name === 'extension',
    reloadModule: jest.fn(async () => { throw new Error('Module reload requires an application restart; runtime reload is not supported.'); }),
    installModule: jest.fn(), uninstallModule: jest.fn(), loadModule: jest.fn() };
  const registry = { listModules: () => [definition], getModule: () => definition };
  const modules = new Map([['website', { metatype: WebsiteModule }], ['other', { metatype: UnrelatedModule }]]);
  const controller = new AdminModulesController(loader as any, registry as any, modules as any);

  it('lists only instantiated builtins and reports lifecycle capabilities', async () => {
    const { data } = await controller.listModules();
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ name: 'website', state: 'installed', managedBy: 'deployment', actions: [] });
    expect(data[1]).toMatchObject({ name: 'extension', managedBy: 'runtime', actions: ['uninstall'] });
    expect((await controller.getModule('website')).data).toMatchObject({ name: 'website' });
  });

  it('rejects every runtime lifecycle mutation of a builtin', async () => {
    for (const operation of ['installModule', 'uninstallModule', 'reloadModule'] as const) {
      await expect(controller[operation]('website')).rejects.toThrow('managed by application deployment');
    }
    expect(loader.installModule).not.toHaveBeenCalled();
    expect(loader.uninstallModule).not.toHaveBeenCalled();
    expect(loader.loadModule).not.toHaveBeenCalled();
  });
  it('does not report a reload when the loader would merely skip the loaded module', async () => {
    const result = await controller.reloadModule('extension');
    expect(result.success).toBe(false);
    expect(result.message).toContain('runtime reload is not supported');
    expect(loader.loadModule).not.toHaveBeenCalled();
  });
  it('does not use reload to bypass installation hooks on a pending module', async () => {
    const pendingLoader = { ...loader, isLoaded: () => false };
    const pending = new AdminModulesController(pendingLoader as any, registry as any, modules as any);
    expect((await pending.reloadModule('extension')).success).toBe(false);
    expect(pendingLoader.loadModule).not.toHaveBeenCalled();
  });
});
