# Base Module Architecture Plan
## Gawdesy Modular Framework

### 1. Overview

Replicate FastVue's modular architecture with a **Base Module** that provides:
- Core ORM functionality with mixin support
- Module registry and state management
- CRUD operations inheritance
- Security framework (record rules, permissions)
- Admin settings UI

### 2. Directory Structure

```
backend/src/modules/base/
├── __manifest__.js          # Base module manifest
├── __init__.js              # Module initialization
├── models/
│   ├── index.js             # Export all models
│   ├── base.model.js        # Abstract BaseModel with ORM
│   ├── installed-module.model.js  # Track installed modules
│   ├── menu.model.js        # Menu items storage
│   ├── permission.model.js  # Permission definitions
│   ├── role.model.js        # User roles
│   ├── group.model.js       # User groups
│   └── user.model.js        # Extended user model
├── services/
│   ├── index.js             # Export all services
│   ├── crud.mixin.js        # CRUD operations mixin
│   ├── module.service.js    # Module management
│   ├── menu.service.js      # Menu aggregation
│   ├── permission.service.js # Permission checking
│   └── security.service.js  # Record rules & security
├── api/
│   ├── index.js             # Express routes
│   ├── modules.routes.js    # Module management API
│   ├── menus.routes.js      # Menu API
│   ├── permissions.routes.js # Permission API
│   └── users.routes.js      # User management API
├── middleware/
│   └── module.middleware.js # Module context middleware
└── static/                  # Frontend assets (Vue)
    └── views/
        ├── modules.vue      # Module management UI
        ├── permissions.vue  # Permission management
        ├── roles.vue        # Role management
        ├── groups.vue       # Group management
        ├── menus.vue        # Menu editor
        └── users.vue        # User management
```

### 3. Base Module Manifest

```javascript
// backend/src/modules/base/__manifest__.js
export default {
  name: 'Base',
  technicalName: 'base',
  version: '1.0.0',
  summary: 'Core base module with ORM, security, and module management',
  description: 'Provides foundational functionality for all modules',
  
  // Base module has no dependencies but all others depend on it
  depends: [],
  
  // Auto-install on system startup
  autoInstall: true,
  
  // Core models that all modules inherit from
  models: ['models/index.js'],
  
  // Core services
  services: ['services/index.js'],
  
  // Admin API routes
  api: ['api/index.js'],
  
  // Admin UI menus
  frontend: {
    menus: [
      {
        name: 'Settings',
        path: '/settings',
        icon: 'lucide:settings',
        sequence: 100,
        children: [
          {
            name: 'Modules',
            path: '/settings/modules',
            icon: 'lucide:package',
            sequence: 1,
            permission: 'base.modules.manage'
          },
          {
            name: 'Menus',
            path: '/settings/menus',
            icon: 'lucide:menu',
            sequence: 2,
            permission: 'base.menus.manage'
          },
          {
            name: 'Users',
            path: '/settings/users',
            icon: 'lucide:users',
            sequence: 3,
            permission: 'base.users.manage'
          },
          {
            name: 'Groups',
            path: '/settings/groups',
            icon: 'lucide:users-round',
            sequence: 4,
            permission: 'base.groups.manage'
          },
          {
            name: 'Roles',
            path: '/settings/roles',
            icon: 'lucide:shield',
            sequence: 5,
            permission: 'base.roles.manage'
          },
          {
            name: 'Permissions',
            path: '/settings/permissions',
            icon: 'lucide:key',
            sequence: 6,
            permission: 'base.permissions.manage'
          },
          {
            name: 'Record Rules',
            path: '/settings/record-rules',
            icon: 'lucide:shield-check',
            sequence: 7,
            permission: 'base.record_rules.manage'
          },
          {
            name: 'Sequences',
            path: '/settings/sequences',
            icon: 'lucide:list-ordered',
            sequence: 8,
            permission: 'base.sequences.manage'
          },
          {
            name: 'System',
            path: '/settings/system',
            icon: 'lucide:server',
            sequence: 9,
            permission: 'base.system.manage'
          }
        ]
      }
    ]
  },
  
  // Core permissions
  permissions: [
    // Module management
    'base.modules.read',
    'base.modules.write',
    'base.modules.manage',
    
    // Menu management
    'base.menus.read',
    'base.menus.write',
    'base.menus.manage',
    
    // User management
    'base.users.read',
    'base.users.write',
    'base.users.manage',
    
    // Group management
    'base.groups.read',
    'base.groups.write',
    'base.groups.manage',
    
    // Role management
    'base.roles.read',
    'base.roles.write',
    'base.roles.manage',
    
    // Permission management
    'base.permissions.read',
    'base.permissions.write',
    'base.permissions.manage',
    
    // Record rules
    'base.record_rules.read',
    'base.record_rules.write',
    'base.record_rules.manage',
    
    // Sequences
    'base.sequences.read',
    'base.sequences.write',
    'base.sequences.manage',
    
    // System settings
    'base.system.read',
    'base.system.write',
    'base.system.manage'
  ]
}
```

### 4. BaseModel with ORM & Mixins

```javascript
// backend/src/modules/base/models/base.model.js

/**
 * Abstract BaseModel - All models inherit from this
 * Provides: ORM, timestamps, soft delete, CRUD mixin support
 */
export class BaseModel {
  constructor(sequelize, modelName, attributes, options = {}) {
    this.sequelize = sequelize;
    this.modelName = modelName;
    this.attributes = attributes;
    this.options = options;
    this.mixins = [];
    
    // Add default timestamps
    this.attributes.createdAt = {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    };
    this.attributes.updatedAt = {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    };
    
    // Add soft delete if enabled
    if (options.softDelete !== false) {
      this.attributes.deletedAt = {
        type: DataTypes.DATE,
        allowNull: true
      };
    }
    
    // Create Sequelize model
    this.model = sequelize.define(modelName, this.attributes, {
      ...options,
      timestamps: true,
      paranoid: options.softDelete !== false
    });
    
    // Apply mixins
    this.applyMixins();
  }
  
  /**
   * Apply registered mixins to the model
   */
  applyMixins() {
    for (const mixin of this.mixins) {
      if (typeof mixin === 'function') {
        mixin(this.model);
      }
    }
  }
  
  /**
   * Register a mixin
   */
  use(mixin) {
    this.mixins.push(mixin);
    return this;
  }
  
  /**
   * Get the Sequelize model instance
   */
  getModel() {
    return this.model;
  }
}

/**
 * Model mixin for CRUD operations
 */
export const CrudMixin = (options = {}) => {
  return (model) => {
    // Add CRUD methods to model
    
    model.createRecord = async (data, context = {}) => {
      // Check record rules
      await checkRecordRules(model.name, 'create', data, context);
      return model.create(data);
    };
    
    model.readRecord = async (id, context = {}) => {
      const record = await model.findByPk(id);
      if (record) {
        await checkRecordRules(model.name, 'read', record, context);
      }
      return record;
    };
    
    model.updateRecord = async (id, data, context = {}) => {
      const record = await model.findByPk(id);
      if (record) {
        await checkRecordRules(model.name, 'write', record, context);
        return record.update(data);
      }
      return null;
    };
    
    model.deleteRecord = async (id, context = {}) => {
      const record = await model.findByPk(id);
      if (record) {
        await checkRecordRules(model.name, 'unlink', record, context);
        return record.destroy();
      }
      return false;
    };
    
    model.searchRecords = async (query = {}, context = {}) => {
      // Apply record rules to query
      const domain = await getRecordRuleDomain(model.name, 'read', context);
      const where = { ...query.where, ...domain };
      return model.findAll({ ...query, where });
    };
  };
};

/**
 * Model mixin for sequence/numbering
 */
export const SequenceMixin = (fieldName = 'sequence', options = {}) => {
  return (model) => {
    model.beforeCreate(async (instance) => {
      if (!instance[fieldName]) {
        const lastRecord = await model.findOne({
          order: [[fieldName, 'DESC']]
        });
        instance[fieldName] = (lastRecord?.[fieldName] || 0) + (options.step || 10);
      }
    });
  };
};

/**
 * Model mixin for audit logging
 */
export const AuditMixin = (options = {}) => {
  return (model) => {
    model.afterCreate(async (instance, options) => {
      await logAudit('create', model.name, instance.id, instance.toJSON(), options);
    });
    
    model.afterUpdate(async (instance, options) => {
      await logAudit('write', model.name, instance.id, instance.toJSON(), options);
    });
    
    model.afterDestroy(async (instance, options) => {
      await logAudit('unlink', model.name, instance.id, instance.toJSON(), options);
    });
  };
};
```

### 5. InstalledModule Model

```javascript
// backend/src/modules/base/models/installed-module.model.js

export default (sequelize, DataTypes) => {
  const InstalledModule = sequelize.define('InstalledModule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    displayName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    state: {
      type: DataTypes.ENUM('uninstalled', 'installed', 'to_upgrade', 'to_remove'),
      defaultValue: 'uninstalled'
    },
    depends: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    manifestCache: {
      type: DataTypes.JSON,
      allowNull: true
    },
    modulePath: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    installedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'installed_modules',
    timestamps: true,
    underscored: true
  });

  return InstalledModule;
};
```

### 6. Updated Module Dependency System

```javascript
// backend/src/core/modules/__loader__.js (Updated)

/**
 * Resolve module dependencies ensuring base loads first
 */
const resolveDependencies = (modules) => {
  const resolved = [];
  const visiting = new Set();
  const visited = new Set();
  
  const visit = (module, path = []) => {
    if (visiting.has(module.name)) {
      console.warn(`⚠️  Circular dependency: ${path.join(' -> ')} -> ${module.name}`);
      return;
    }
    
    if (visited.has(module.name)) {
      return;
    }
    
    visiting.add(module.name);
    
    // Get dependencies - default to ['base'] if not specified
    const deps = module.manifest?.depends || ['base'];
    
    // Visit dependencies first
    for (const dep of deps) {
      // Skip 'core' - it's legacy
      if (dep === 'core') continue;
      
      const depModule = modules.find(m => m.name === dep || m.manifest?.technicalName === dep);
      if (depModule) {
        visit(depModule, [...path, module.name]);
      } else if (dep !== 'base') {
        console.warn(`⚠️  Module ${module.name} depends on ${dep} which is not found`);
      }
    }
    
    visiting.delete(module.name);
    visited.add(module.name);
    resolved.push(module);
  };
  
  // First pass: ensure base module loads first if present
  const baseModule = modules.find(m => m.name === 'base');
  if (baseModule) {
    visit(baseModule);
  }
  
  // Second pass: load all other modules
  modules.forEach(m => {
    if (!visited.has(m.name)) {
      visit(m);
    }
  });
  
  return resolved;
};
```

### 7. Settings Module Menu Structure

```javascript
// backend/src/modules/settings/__manifest__.js (Updated)
export default {
  name: 'Settings',
  technicalName: 'settings',
  version: '1.0.0',
  summary: 'Application settings and configuration',
  
  // Depends on base for core functionality
  depends: ['base'],
  
  frontend: {
    menus: [
      {
        name: 'General Settings',
        path: '/settings/general',
        icon: 'lucide:sliders',
        sequence: 1,
        children: [
          { name: 'Site Configuration', path: '/settings/general/site', sequence: 1 },
          { name: 'Appearance', path: '/settings/general/appearance', sequence: 2 },
          { name: 'Localization', path: '/settings/general/localization', sequence: 3 },
          { name: 'Email Settings', path: '/settings/general/email', sequence: 4 }
        ]
      },
      {
        name: 'System Management',
        path: '/settings/system',
        icon: 'lucide:server',
        sequence: 2,
        permission: 'base.system.manage',
        children: [
          { name: 'Modules', path: '/settings/modules', icon: 'lucide:package', sequence: 1 },
          { name: 'Menus', path: '/settings/menus', icon: 'lucide:menu', sequence: 2 },
          { name: 'Sequences', path: '/settings/sequences', icon: 'lucide:list-ordered', sequence: 3 },
          { name: 'Audit Logs', path: '/settings/audit', icon: 'lucide:activity', sequence: 4 }
        ]
      },
      {
        name: 'User Management',
        path: '/settings/users',
        icon: 'lucide:users',
        sequence: 3,
        permission: 'base.users.manage',
        children: [
          { name: 'Users', path: '/settings/users/list', icon: 'lucide:user', sequence: 1 },
          { name: 'Groups', path: '/settings/groups', icon: 'lucide:users-round', sequence: 2 },
          { name: 'Roles', path: '/settings/roles', icon: 'lucide:shield', sequence: 3 },
          { name: 'Permissions', path: '/settings/permissions', icon: 'lucide:key', sequence: 4 }
        ]
      },
      {
        name: 'Security',
        path: '/settings/security',
        icon: 'lucide:shield-check',
        sequence: 4,
        permission: 'base.security.manage',
        children: [
          { name: 'Record Rules', path: '/settings/record-rules', sequence: 1 },
          { name: 'Field Security', path: '/settings/field-security', sequence: 2 },
          { name: 'API Keys', path: '/settings/api-keys', sequence: 3 }
        ]
      }
    ]
  }
}
```

### 8. Implementation Steps

1. **Create base module structure**
   - Create `/backend/src/modules/base/` directory
   - Create manifest, models, services, api folders

2. **Implement BaseModel**
   - Create abstract BaseModel class
   - Implement mixin system
   - Add CRUD mixin, Sequence mixin, Audit mixin

3. **Create InstalledModule model**
   - Track module state in database
   - Store manifest cache

4. **Update module loader**
   - Ensure base module loads first
   - Add dependency resolution with base as default

5. **Update all existing modules**
   - Change `depends: ['core']` to `depends: ['base']`
   - Inherit models from BaseModel

6. **Update settings module**
   - Add admin submenu structure
   - Create Vue views for each settings page

7. **Create frontend views**
   - Module management UI
   - User/Group/Role management
   - Permission matrix
   - Menu editor
   - Record rules editor

### 9. API Endpoints

```javascript
// Base module API routes

// Modules
GET    /api/base/modules              // List all modules
GET    /api/base/modules/:name        // Get module details
POST   /api/base/modules/:name/install    // Install module
POST   /api/base/modules/:name/upgrade    // Upgrade module
POST   /api/base/modules/:name/uninstall  // Uninstall module

// Menus
GET    /api/base/menus                // Get all menus
POST   /api/base/menus                // Create menu
PUT    /api/base/menus/:id            // Update menu
DELETE /api/base/menus/:id            // Delete menu
POST   /api/base/menus/reorder        // Reorder menus

// Users
GET    /api/base/users                // List users
POST   /api/base/users                // Create user
GET    /api/base/users/:id            // Get user
PUT    /api/base/users/:id            // Update user
DELETE /api/base/users/:id            // Delete user

// Groups
GET    /api/base/groups               // List groups
POST   /api/base/groups               // Create group
// ... CRUD operations

// Roles
GET    /api/base/roles                // List roles
POST   /api/base/roles                // Create role
// ... CRUD operations

// Permissions
GET    /api/base/permissions          // List all permissions
GET    /api/base/permissions/matrix   // Get permission matrix
PUT    /api/base/permissions/role/:id // Update role permissions

// Record Rules
GET    /api/base/record-rules         // List record rules
POST   /api/base/record-rules         // Create record rule
// ... CRUD operations
```

### 10. Frontend UI Structure

```
frontend/apps/web-lume/src/views/settings/
├── index.vue                    # Settings layout
├── modules/
│   ├── index.vue               # Module list
│   └── detail.vue              # Module details
├── menus/
│   ├── index.vue               # Menu editor
│   └── editor.vue              # Menu item editor
├── users/
│   ├── index.vue               # User list
│   └── form.vue                # User form
├── groups/
│   ├── index.vue               # Group list
│   └── form.vue                # Group form
├── roles/
│   ├── index.vue               # Role list
│   └── form.vue                # Role form
├── permissions/
│   └── matrix.vue              # Permission matrix
└── record-rules/
    ├── index.vue               # Record rules list
    └── form.vue                # Record rule form
```

## Next Steps

1. Shall I proceed with implementing the base module?
2. Which component should I start with first?
   - BaseModel with mixins
   - InstalledModule model
   - Module loader updates
   - Settings UI
