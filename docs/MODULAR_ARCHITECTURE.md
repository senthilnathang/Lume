# Gawdesy Modular Architecture Plan

## Overview

Transform the Gawdesy backend into a modular framework similar to FastVue, enabling:
- Dynamic module loading and registration
- Frontend-NuxtJS integration with shared types
- Auto-discovery of modules from backend
- Dynamic menu generation from module manifests
- Shared TypeScript types between backend and frontend

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Gawdesy Modular Framework                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────────────────────┐    │
│  │   NuxtJS Frontend │◄──┤ Shared Types & API Contracts   │    │
│  │   (Port 5173)    │    │ (TypeScript/JSON Schema)        │    │
│  └────────┬────────┘    └─────────────────────────────────┘    │
│           │                                                      │
│           │ API Calls                                            │
│           ▼                                                      │
│  ┌─────────────────┐    ┌─────────────────────────────────┐    │
│  │  Express Backend  │    │   Module System                   │    │
│  │  (Port 3000)     │    │                                 │    │
│  │                  │    │  ┌───────────────────────────┐   │    │
│  │  ┌─────────────┐ │    │  │ Module Manifest           │   │    │
│  │  │ Core Module │ │    │  │ - Metadata               │   │    │
│  │  └─────────────┘ │    │  │ - Dependencies          │   │    │
│  │                  │    │  │ - Routes                │   │    │
│  │  ┌─────────────┐ │    │  │ - Permissions           │   │    │
│  │  │  Modules    │ │    │  │ - Menus                │   │    │
│  │  │ ┌─────────┐ │ │    │  │ - Views (Vue)          │   │    │
│  │  │ │User     │ │ │    │  │ - Demo Data            │   │    │
│  │  │ ├─────────┤ │ │    │  └───────────────────────────┘   │    │
│  │  │ │Activities│ │ │    │                                 │    │
│  │  │ ├─────────┤ │ │    │  ┌───────────────────────────┐   │    │
│  │  │ │Donations│ │ │    │  │ Core Module               │   │    │
│  │  │ ├─────────┤ │ │    │  │ - User Auth               │   │    │
│  │  │ │Team     │ │ │    │  │ - RBAC                   │   │    │
│  │  │ ├─────────┤ │ │    │  │ - Settings               │   │    │
│  │  │ │Messages │ │ │    │  │ - Audit Logs            │   │    │
│  │  │ └─────────┘ │ │    │  └───────────────────────────┘   │    │
│  │  └─────────────┘ │    │                                 │    │
│  └────────┬────────┘    └─────────────────────────────────┘    │
│           │                                                      │
│           │ Sequelize ORM                                        │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Database (MySQL/PostgreSQL)                 │    │
│  │  users │ roles │ permissions │ activities │ donations │ ... │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

### Backend Module (Express.js)

```
backend/src/modules/{module-name}/
├── __manifest__.js          # Module metadata and configuration
├── __init__.js              # Module initialization
├── index.js                 # Module exports
├── models/                  # Sequelize models
│   ├── index.js
│   └── {model}.js
├── api/                     # API routes
│   ├── index.js
│   └── {routes}.js
├── services/               # Business logic
│   ├── index.js
│   └── {service}.js
├── data/                   # Demo data
│   └── demo.json
├── hooks/                   # Lifecycle hooks
│   ├── preInit.js
│   ├── postInit.js
│   └── preDelete.js
└── static/                  # Static assets
    └── {files}
```

### Frontend Module (NuxtJS)

```
frontend/apps/web-gawdesy/modules/{module-name}/
├── manifest.json            # Module metadata
├── views/                   # Vue components
│   ├── list.vue
│   ├── form.vue
│   ├── detail.vue
│   └── dashboard.vue
├── composables/             # Vue composables
│   └── use{Module}.ts
├── stores/                  # Pinia stores
│   └── {module}.ts
├── components/             # Vue components
│   └── {Component}.vue
├── locales/                # i18n files
│   ├── en.json
│   └── {lang}.json
├── assets/                 # Static assets
│   └── {files}
└── routes.ts                # Module routes
```

### Module Manifest (__manifest__.js)

```javascript
export default {
  // Module Metadata
  name: 'Activities',
  technicalName: 'activities',
  version: '1.0.0',
  summary: 'Activity and event management',
  description: '# Activities Module\n\nComprehensive activity management...',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
  license: 'MIT',
  category: 'Content',
  
  // Configuration
  application: true,
  installable: true,
  autoInstall: false,
  
  // Dependencies
  depends: ['core'],
  
  // Components
  models: ['models/index.js'],
  api: ['api/index.js'],
  services: ['services/index.js'],
  data: ['data/demo.json'],
  
  // Frontend integration
  frontend: {
    routes: ['routes.ts'],
    views: ['views/list.vue', 'views/detail.vue'],
    components: ['components/ActivityCard.vue'],
    stores: ['stores/activity.ts'],
    composables: ['composables/useActivities.ts'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Activities',
        path: '/activities',
        icon: 'lucide:calendar',
        sequence: 5,
        children: [
          { name: 'All Activities', path: '/activities' },
          { name: 'Upcoming', path: '/activities/upcoming' },
          { name: 'Calendar', path: '/activities/calendar' }
        ]
      }
    ]
  },
  
  // Permissions
  permissions: [
    'activities.read',
    'activities.write',
    'activities.delete',
    'activities.publish'
  ],
  
  // Lifecycle hooks
  preInit: 'hooks/preInit.js',
  postInit: 'hooks/postInit.js'
}
```

## Implementation Phases

### Phase 1: Core Module System
1. Create module loader system in backend
2. Implement module manifests
3. Create dynamic route registration
4. Build module discovery system

### Phase 2: Frontend Integration  
1. Create NuxtJS module loader
2. Build shared TypeScript types
3. Implement dynamic menu generation
4. Create API client with module support

### Phase 3: Module Templates
1. Create module scaffolding template
2. Build CLI tool for module generation
3. Document module creation process

### Phase 4: Testing & Documentation
1. Write module tests
2. Create integration tests
3. Build documentation
4. Create example modules

## File Structure

```
/opt/gawdesy.com/
├── backend/
│   ├── src/
│   │   ├── index.js              # Main entry with module loader
│   │   ├── config.js
│   │   ├── core/                  # Core module (required)
│   │   │   ├── __manifest__.js
│   │   │   ├── __init__.js
│   │   │   ├── models/
│   │   │   ├── api/
│   │   │   └── services/
│   │   ├── modules/              # All modules
│   │   │   ├── __loader.js        # Module loader
│   │   │   ├── activities/
│   │   │   ├── donations/
│   │   │   ├── team/
│   │   │   └── ...
│   │   └── shared/               # Shared code
│   │       ├── types/            # TypeScript types
│   │       ├── utils/
│   │       └── constants/
│   └── package.json
│
├── frontend/
│   └── apps/
│       └── web-gawdesy/
│           ├── modules/          # Frontend modules
│           │   ├── __loader.ts   # Module loader
│           │   ├── activities/
│           │   ├── donations/
│           │   └── team/
│           ├── composables/
│           ├── stores/
│           └── nuxt.config.ts
│
└── shared/                        # Shared between frontend/backend
    └── types/
        ├── module.ts
        ├── user.ts
        ├── activities.ts
        └── ...
```

## API Endpoints for Module Management

```
GET  /api/modules              # List all modules
GET  /api/modules/:name         # Get module manifest
POST /api/modules/:name/install # Install module
POST /api/modules/:name/uninstall # Uninstall module
GET  /api/menus                # Get dynamic menus
GET  /api/permissions           # Get all permissions
```

## Module Loading Flow

```
1. Server Startup
   ├── Load Core Module
   ├── Discover All Modules (scan modules/ directory)
   ├── Load Module Manifests
   ├── Check Dependencies
   ├── Initialize Modules (in dependency order)
   │   ├── Register Models
   │   ├── Register API Routes
   │   ├── Register Services
   │   └── Run Lifecycle Hooks
   └── Start Server

2. Frontend Load
   ├── Fetch Module List from Backend
   ├── Load Module Manifests
   ├── Register Dynamic Routes
   ├── Load Vue Components
   ├── Initialize Stores
   └── Build Navigation Menus
```

## Shared Types Example

```typescript
// shared/types/module.ts
export interface ModuleManifest {
  name: string;
  technicalName: string;
  version: string;
  category: string;
  dependencies: string[];
  permissions: string[];
  menus: MenuItem[];
}

export interface MenuItem {
  name: string;
  path: string;
  icon?: string;
  sequence?: number;
  children?: MenuItem[];
}

// shared/types/activities.ts
export interface Activity {
  id: number;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityDTO {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  capacity?: number;
}
```

## Benefits of Modular Architecture

1. **Separation of Concerns** - Each module is self-contained
2. **Reusability** - Modules can be easily reused across projects
3. **Scalability** - Add new modules without modifying core
4. **Maintainability** - Changes confined to specific modules
5. **Team Collaboration** - Teams can work on different modules
6. **Plugin System** - Third-party modules possible
7. **Dynamic Loading** - Enable/disable modules at runtime

## Next Steps

1. Implement Phase 1: Core Module System
2. Build module loader and manifest system
3. Create Express integration
4. Move existing modules to new structure
5. Test and iterate
