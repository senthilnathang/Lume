/**
 * Module Service
 * Manages module lifecycle and operations using Prisma
 */

import prisma from '../../../core/db/prisma.js';

export class ModuleService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Get all installed modules
   */
  async getInstalledModules() {
    return prisma.installedModule.findMany({
      where: { state: 'installed' },
      orderBy: { sequence: 'asc' },
    });
  }

  /**
   * Get module by name
   */
  async getModule(name) {
    return prisma.installedModule.findUnique({ where: { name } });
  }

  /**
   * Install a module
   */
  async installModule(moduleInfo) {
    // Check dependencies
    const deps = moduleInfo.manifest?.depends || [];
    for (const dep of deps) {
      if (dep === 'base') continue; // Base is always available
      const depModule = await this.getModule(dep);
      if (!depModule || depModule.state !== 'installed') {
        throw new Error(`Dependency ${dep} is not installed`);
      }
    }

    return prisma.installedModule.upsert({
      where: { name: moduleInfo.name },
      create: {
        name: moduleInfo.name,
        displayName: moduleInfo.manifest?.name || moduleInfo.name,
        version: moduleInfo.manifest?.version || '1.0.0',
        state: 'installed',
        depends: JSON.stringify(deps),
        modulePath: `modules/${moduleInfo.name}`,
        installedAt: new Date(),
      },
      update: {
        state: 'installed',
        version: moduleInfo.manifest?.version || '1.0.0',
        installedAt: new Date(),
      },
    });
  }

  /**
   * Uninstall a module
   */
  async uninstallModule(name) {
    return prisma.installedModule.update({
      where: { name },
      data: { state: 'uninstalled' },
    });
  }

  /**
   * Upgrade a module
   */
  async upgradeModule(name, newVersion, newManifest) {
    return prisma.installedModule.update({
      where: { name },
      data: {
        version: newVersion,
        manifestCache: newManifest || undefined,
        state: 'installed',
      },
    });
  }

  /**
   * Get all menus from installed modules
   */
  async getAllMenus() {
    return prisma.menu.findMany({
      orderBy: [{ sequence: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get all permissions from installed modules
   */
  async getAllPermissions() {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped = {};
    permissions.forEach(p => {
      const group = p.category || 'Other';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(p);
    });

    return grouped;
  }

  /**
   * Sync module permissions
   * Creates any missing permissions from module manifest
   */
  async syncPermissions(moduleName, manifest) {
    const permissions = manifest.permissions || [];

    for (const perm of permissions) {
      const permName = typeof perm === 'string' ? perm : perm.name;
      const permData = typeof perm === 'string'
        ? { name: perm, display_name: perm, description: '', category: moduleName }
        : { name: perm.name, display_name: perm.display_name || perm.name, description: perm.description || '', category: perm.category || moduleName };

      const existing = await prisma.permission.findUnique({ where: { name: permName } });

      if (!existing) {
        await prisma.permission.create({ data: permData });
      }
    }
  }

  /**
   * Sync module menus
   * Creates menu items from module manifest
   */
  async syncMenus(moduleName, manifest) {
    const menus = manifest.frontend?.menus || manifest.menus || [];

    for (const menu of menus) {
      await this.syncMenuItem(moduleName, menu);
    }
  }

  /**
   * Sync a single menu item
   */
  async syncMenuItem(moduleName, menu, parentId = null) {
    const menuData = {
      name: menu.name || menu.title,
      title: menu.title || menu.name,
      path: menu.path,
      icon: menu.icon,
      module: moduleName,
      permission: menu.permission,
      viewName: menu.viewName,
      hideInMenu: menu.hideInMenu || false,
      sequence: menu.sequence || 10,
      parentId,
    };

    // Check if menu exists
    const existing = await prisma.menu.findFirst({
      where: { path: menu.path, module: moduleName },
    });

    let menuId;
    if (existing) {
      await prisma.menu.update({ where: { id: existing.id }, data: menuData });
      menuId = existing.id;
    } else {
      const created = await prisma.menu.create({ data: menuData });
      menuId = created.id;
    }

    // Sync children
    if (menu.children && menu.children.length > 0) {
      for (const child of menu.children) {
        await this.syncMenuItem(moduleName, child, menuId);
      }
    }

    return menuId;
  }

  /**
   * Get module dependency tree
   */
  async getDependencyTree(name) {
    const mod = await prisma.installedModule.findUnique({ where: { name } });
    if (!mod) return null;

    const deps = Array.isArray(mod.depends) ? mod.depends : JSON.parse(mod.depends || '[]');
    const tree = { name: mod.name, version: mod.version, state: mod.state, depends: [] };

    for (const dep of deps) {
      const depTree = await this.getDependencyTree(dep);
      if (depTree) tree.depends.push(depTree);
    }

    return tree;
  }
}

export default ModuleService;
