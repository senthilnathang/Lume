/**
 * Module Service
 * Manages module lifecycle and operations
 */

export class ModuleService {
  constructor(models) {
    this.models = models;
  }
  
  /**
   * Get all installed modules
   */
  async getInstalledModules() {
    return this.models.InstalledModule.findInstalled();
  }
  
  /**
   * Get module by name
   */
  async getModule(name) {
    return this.models.InstalledModule.findByName(name);
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
    
    return this.models.InstalledModule.install(moduleInfo);
  }
  
  /**
   * Uninstall a module
   */
  async uninstallModule(name) {
    return this.models.InstalledModule.uninstall(name);
  }
  
  /**
   * Upgrade a module
   */
  async upgradeModule(name, newVersion, newManifest) {
    return this.models.InstalledModule.upgrade(name, newVersion, newManifest);
  }
  
  /**
   * Get all menus from installed modules
   */
  async getAllMenus() {
    return this.models.Menu.findAll({
      order: [['sequence', 'ASC'], ['name', 'ASC']]
    });
  }
  
  /**
   * Get all permissions from installed modules
   */
  async getAllPermissions() {
    const permissions = await this.models.Permission.findAll({
      where: { isActive: true },
      order: [['group', 'ASC'], ['name', 'ASC']]
    });
    
    // Group by module/group
    const grouped = {};
    permissions.forEach(p => {
      const group = p.group || p.module || 'Other';
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
        ? { name: perm, description: '', group: moduleName }
        : { ...perm, module: moduleName };
      
      const existing = await this.models.Permission.findOne({
        where: { name: permName }
      });
      
      if (!existing) {
        await this.models.Permission.create(permData);
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
      parentId
    };
    
    // Check if menu exists
    const existing = await this.models.Menu.findOne({
      where: {
        path: menu.path,
        module: moduleName
      }
    });
    
    let menuId;
    if (existing) {
      await existing.update(menuData);
      menuId = existing.id;
    } else {
      const created = await this.models.Menu.create(menuData);
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
    return this.models.InstalledModule.getDependencyTree(name);
  }
}

export default ModuleService;
