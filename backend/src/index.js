import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { getDatabase, initializeDatabase } from './config.js';
import { responseUtil, jwtUtil } from './shared/utils/index.js';
import { setupModels } from './database/models/index.js';
import { errorHandler, notFoundHandler } from './core/middleware/errorHandler.js';
import { requestLogger } from './core/middleware/requestLogger.js';

// Module loader
import {
  initializeModuleSystem,
  getAllModules,
  getAllMenus,
  getAllPermissions,
  runInstallHook,
  runUninstallHook
} from './core/modules/__loader__.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security: JWT Secret Validation ─────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'jwt-secret') {
  console.warn('⚠️  WARNING: JWT_SECRET is not set or uses default value. Set a strong secret in production!');
}

// ─── Security: Rate Limiting ─────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const enableRateLimit = isProduction || process.env.ENABLE_RATE_LIMIT === 'true';

const limiter = enableRateLimit ? rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
}) : (req, res, next) => next();

// Auth rate limiter is ALWAYS enabled to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 50,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many login attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Security: Helmet HTTP Headers ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// ─── Security: CORS ──────────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? false : '*');
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(requestLogger);
app.use(limiter);

// ─── Security: Authentication Middleware ──────────────────────────────────────
// Paths that never require authentication
const publicApiPaths = [
  '/health',
  '/api/users/login',
  '/api/users/register',
  '/api/auth/refresh-token',
];

// Paths that optionally parse auth token but don't require it
// (modules handle their own auth via route-level middleware)
const optionalAuthPaths = [
  '/api/menus',
  '/api/modules',
  '/api/permissions',
  '/api/lume/health',
  '/api/gawdesy/health',
  '/api/base/health',
  '/api/base_automation/health',
  '/api/base_features_data/health',
  '/api/base_security/health',
  '/api/base_customization/health',
  '/api/advanced_features/health',
];

app.use((req, res, next) => {
  // Public paths skip auth entirely
  const isPublicPath = publicApiPaths.some(path =>
    req.path === path
  );
  if (isPublicPath) {
    return next();
  }

  // Optional auth paths - parse token if present, but don't require it
  const isOptionalAuth = optionalAuthPaths.some(path =>
    req.path === path || req.path.startsWith(path + '/')
  );

  // For API routes, try to parse the auth token
  if (req.path.startsWith('/api/')) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwtUtil.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      } else if (!isOptionalAuth) {
        return res.status(401).json(responseUtil.unauthorized('Invalid or expired token'));
      }
    } else if (!isOptionalAuth) {
      // Module routes handle their own auth - only block truly protected routes
      // For now, pass through to let module-level middleware handle auth
    }
  }

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Lume Framework is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    framework: 'Lume',
    modular: true
  });
});

// Serve module static files (views) - FastVue style
// Views are served from: /modules/{moduleName}/static/views/{viewName}.vue
const modulesDir = join(__dirname, 'modules');
app.use('/modules', express.static(modulesDir, {
  index: false,
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.vue')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
  }
}));

// Module management endpoints
app.get('/api/modules', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const modules = getAllModules();
  const InstalledModule = app.locals.baseModels?.InstalledModule;

  // Build a map of persisted states from DB
  let dbStates = {};
  if (InstalledModule) {
    try {
      const records = await InstalledModule.findAll();
      for (const r of records) {
        dbStates[r.name] = { state: r.state, installedAt: r.installedAt };
      }
    } catch (e) { /* fallback to in-memory */ }
  }

  res.json({
    success: true,
    data: modules.map(m => {
      const manifest = m.manifest || {};
      const dbRecord = dbStates[m.name];
      const state = dbRecord ? dbRecord.state : (m.initialized ? 'installed' : 'uninstalled');
      return {
        name: m.name,
        display_name: manifest.name || m.name,
        version: manifest.version || '1.0.0',
        summary: manifest.summary || '',
        description: manifest.description || '',
        author: manifest.author || '',
        website: manifest.website || '',
        category: manifest.category || 'Uncategorized',
        license: manifest.license || 'MIT',
        application: manifest.application || false,
        installable: manifest.installable !== false,
        state,
        depends: manifest.depends || [],
        installed_at: dbRecord?.installedAt || (m.initialized ? new Date().toISOString() : null),
        module_path: `modules/${m.name}`,
        loaded: m.loaded,
        initialized: m.initialized,
      };
    })
  });
});

app.get('/api/modules/:name', async (req, res) => {
  const module = getAllModules().find(m => m.name === req.params.name);
  if (!module) {
    return res.status(404).json(responseUtil.notFound('Module'));
  }
  const manifest = module.manifest || {};
  const InstalledModule = app.locals.baseModels?.InstalledModule;

  let state = module.initialized ? 'installed' : 'uninstalled';
  let installedAt = module.initialized ? new Date().toISOString() : null;
  if (InstalledModule) {
    try {
      const record = await InstalledModule.findOne({ where: { name: module.name } });
      if (record) {
        state = record.state;
        installedAt = record.installedAt;
      }
    } catch (e) { /* fallback to in-memory */ }
  }

  res.json({
    success: true,
    data: {
      name: module.name,
      display_name: manifest.name || module.name,
      version: manifest.version || '1.0.0',
      summary: manifest.summary || '',
      description: manifest.description || '',
      author: manifest.author || '',
      website: manifest.website || '',
      category: manifest.category || 'Uncategorized',
      license: manifest.license || 'MIT',
      application: manifest.application || false,
      installable: manifest.installable !== false,
      state,
      depends: manifest.depends || [],
      installed_at: installedAt,
      module_path: `modules/${module.name}`,
      loaded: module.loaded,
      initialized: module.initialized,
      permissions: manifest.permissions || [],
    }
  });
});

app.post('/api/modules/:name/install', async (req, res) => {
  try {
    const moduleName = req.params.name;
    const module = getAllModules().find(m => m.name === moduleName);
    if (!module) {
      return res.status(404).json({ success: false, error: `Module "${moduleName}" not found` });
    }

    const InstalledModule = app.locals.baseModels?.InstalledModule;
    if (!InstalledModule) {
      // Fallback: in-memory only
      module.initialized = true;
      return res.json({ success: true, message: `Module "${moduleName}" installed (in-memory only)` });
    }

    // Check dependencies are installed
    const deps = module.manifest?.depends || [];
    for (const dep of deps) {
      if (dep === 'base') continue;
      const depRecord = await InstalledModule.findOne({ where: { name: dep } });
      if (!depRecord || depRecord.state !== 'installed') {
        return res.status(400).json({ success: false, error: `Dependency "${dep}" is not installed` });
      }
    }

    // Upsert InstalledModule record
    const [record, created] = await InstalledModule.findOrCreate({
      where: { name: moduleName },
      defaults: {
        displayName: module.manifest?.name || moduleName,
        version: module.manifest?.version || '1.0.0',
        state: 'installed',
        depends: deps,
        modulePath: `modules/${moduleName}`,
        installedAt: new Date(),
      }
    });
    if (!created) {
      await record.update({
        state: 'installed',
        version: module.manifest?.version || record.version,
        installedAt: record.installedAt || new Date(),
      });
    }

    // Update in-memory state
    module.initialized = true;

    // Run install hook if defined
    await runInstallHook(module, app.locals.moduleContext || {});

    res.json({
      success: true,
      message: `Module "${module.manifest?.name || moduleName}" installed successfully`,
      data: { name: moduleName, state: 'installed' }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/modules/:name/uninstall', async (req, res) => {
  try {
    const moduleName = req.params.name;
    const module = getAllModules().find(m => m.name === moduleName);
    if (!module) {
      return res.status(404).json({ success: false, error: `Module "${moduleName}" not found` });
    }
    if (moduleName === 'base') {
      return res.status(400).json({ success: false, error: 'Cannot uninstall the base module' });
    }

    const InstalledModule = app.locals.baseModels?.InstalledModule;
    if (!InstalledModule) {
      module.initialized = false;
      return res.json({ success: true, message: `Module "${moduleName}" uninstalled (in-memory only)` });
    }

    // Check no installed modules depend on this one
    const allRecords = await InstalledModule.findAll({ where: { state: 'installed' } });
    const dependents = [];
    for (const r of allRecords) {
      const deps = Array.isArray(r.depends) ? r.depends : (typeof r.depends === 'string' ? JSON.parse(r.depends || '[]') : []);
      if (deps.includes(moduleName) && r.name !== moduleName) {
        dependents.push(r.name);
      }
    }
    if (dependents.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot uninstall: required by ${dependents.join(', ')}. Uninstall them first.`
      });
    }

    // Run uninstall hook before changing state
    await runUninstallHook(module, app.locals.moduleContext || {});

    // Update DB state
    const record = await InstalledModule.findOne({ where: { name: moduleName } });
    if (record) {
      await record.update({ state: 'uninstalled' });
    }

    // Update in-memory state
    module.initialized = false;

    res.json({
      success: true,
      message: `Module "${module.manifest?.name || moduleName}" uninstalled`,
      data: { name: moduleName, state: 'uninstalled' }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/modules/:name/upgrade', async (req, res) => {
  try {
    const moduleName = req.params.name;
    const module = getAllModules().find(m => m.name === moduleName);
    if (!module) {
      return res.status(404).json({ success: false, error: `Module "${moduleName}" not found` });
    }
    res.json({
      success: true,
      message: `Module "${module.manifest?.name || moduleName}" upgraded to v${module.manifest?.version || '1.0.0'}`,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get all menus from modules (merges children when same path declared by multiple modules)
// Only returns menus from installed modules
app.get('/api/menus', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Get installed module names from DB (if available)
  const InstalledModule = app.locals.baseModels?.InstalledModule;
  let installedModuleNames = null;
  if (InstalledModule) {
    try {
      const installedRecords = await InstalledModule.findAll({ where: { state: 'installed' } });
      installedModuleNames = new Set(installedRecords.map(r => r.name));
    } catch (e) { /* fallback to in-memory check */ }
  }

  const menuMap = new Map();

  for (const module of getAllModules()) {
    // Skip modules that are not installed
    if (installedModuleNames) {
      if (!installedModuleNames.has(module.name)) continue;
    } else {
      if (!module.initialized) continue;
    }

    const menus = module.manifest?.menus || module.manifest?.frontend?.menus || [];

    for (const menu of menus) {
      const path = menu.path;

      if (menuMap.has(path)) {
        // Merge children from multiple modules declaring the same parent path
        const existing = menuMap.get(path);
        const newChildren = (menu.children || []).map(child => ({
          ...child,
          name: child.name || child.title,
          module: module.name
        }));
        const childPaths = new Set((existing.children || []).map(c => c.path));
        for (const child of newChildren) {
          if (!childPaths.has(child.path)) {
            existing.children = existing.children || [];
            existing.children.push(child);
          }
        }
        if (existing.children) {
          existing.children.sort((a, b) => (a.sequence || 99) - (b.sequence || 99));
        }
      } else {
        const enrichedMenu = {
          ...menu,
          name: menu.name || menu.title,
          module: module.name,
        };

        if (menu.children && menu.children.length > 0) {
          enrichedMenu.children = menu.children.map(child => ({
            ...child,
            name: child.name || child.title,
            module: module.name
          }));
        }

        menuMap.set(path, enrichedMenu);
      }
    }
  }

  const allMenus = Array.from(menuMap.values());
  allMenus.sort((a, b) => (a.sequence || 10) - (b.sequence || 10));

  res.json({
    success: true,
    data: allMenus
  });
});

// FastVue-compatible /modules/installed/menus endpoint
// Only returns menus from installed modules
app.get('/modules/installed/menus', async (req, res) => {
  const InstalledModule = app.locals.baseModels?.InstalledModule;
  let installedModuleNames = null;
  if (InstalledModule) {
    try {
      const installedRecords = await InstalledModule.findAll({ where: { state: 'installed' } });
      installedModuleNames = new Set(installedRecords.map(r => r.name));
    } catch (e) { /* fallback */ }
  }

  const allMenus = [];

  for (const module of getAllModules()) {
    if (installedModuleNames) {
      if (!installedModuleNames.has(module.name)) continue;
    } else {
      if (!module.initialized) continue;
    }

    const menus = module.manifest?.menus || module.manifest?.frontend?.menus || [];

    for (const menu of menus) {
      const enrichedMenu = {
        ...menu,
        name: menu.name || menu.title,
        title: menu.name || menu.title,
        module: module.name,
      };

      if (menu.children && menu.children.length > 0) {
        enrichedMenu.children = menu.children.map(child => ({
          ...child,
          name: child.name || child.title,
          title: child.name || child.title,
          module: module.name
        }));
      }

      allMenus.push(enrichedMenu);
    }
  }

  allMenus.sort((a, b) => (a.sequence || 10) - (b.sequence || 10));

  res.json(allMenus);
});

// Get all permissions (only from installed modules)
app.get('/api/permissions', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Get installed module names from DB
  const InstalledModule = app.locals.baseModels?.InstalledModule;
  let installedModuleNames = null;
  if (InstalledModule) {
    try {
      const installedRecords = await InstalledModule.findAll({ where: { state: 'installed' } });
      installedModuleNames = new Set(installedRecords.map(r => r.name));
    } catch (e) { /* fallback */ }
  }

  const permissionsData = getAllPermissions();
  const allPermissions = [];

  for (const permGroup of permissionsData) {
    // Skip permissions from uninstalled modules
    if (installedModuleNames && !installedModuleNames.has(permGroup.module)) continue;

    for (const perm of permGroup.permissions) {
      if (typeof perm === 'string') {
        allPermissions.push(perm);
      } else if (perm.name) {
        allPermissions.push(perm.name);
      }
    }
  }

  res.json({
    success: true,
    data: allPermissions
  });
});

// Dashboard Stats Endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  try {
    const sequelize = getDatabase();
    
    const [
      totalUsers,
      activeUsers,
      totalActivities,
      publishedActivities,
      totalDonations,
      totalDonors,
      totalMessages,
      unreadMessages,
      totalDocuments,
      totalTeamMembers
    ] = await Promise.all([
      sequelize.models.User?.count() || 0,
      sequelize.models.User?.count({ where: { is_active: true } }) || 0,
      sequelize.models.Activity?.count() || 0,
      sequelize.models.Activity?.count({ where: { status: 'published' } }) || 0,
      sequelize.models.Donation?.count({ where: { status: 'completed' } }) || 0,
      sequelize.models.Donor?.count() || 0,
      sequelize.models.Message?.count() || 0,
      sequelize.models.Message?.count({ where: { status: 'new' } }) || 0,
      sequelize.models.Document?.count() || 0,
      sequelize.models.TeamMember?.count() || 0
    ]);

    const totalDonationAmount = await sequelize.models.Donation?.sum('amount', { 
      where: { status: 'completed' } 
    }) || 0;

    // Get recent activities
    let recentActivities = [];
    if (sequelize.models.Activity) {
      recentActivities = await sequelize.models.Activity.findAll({
        where: { status: 'published' },
        order: [['start_date', 'ASC']],
        limit: 5
      });
    }

    // Get recent donations
    let recentDonations = [];
    if (sequelize.models.Donation) {
      recentDonations = await sequelize.models.Donation.findAll({
        where: { status: 'completed' },
        include: [{ model: sequelize.models.Donor }],
        order: [['created_at', 'DESC']],
        limit: 5
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalActivities,
          publishedActivities,
          totalDonations,
          totalDonationAmount,
          totalDonors,
          totalMessages,
          unreadMessages,
          totalDocuments,
          totalTeamMembers
        },
        recentActivities: recentActivities.map(a => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          start_date: a.start_date,
          status: a.status
        })),
        recentDonations: recentDonations.map(d => ({
          id: d.id,
          amount: d.amount,
          donor: d.Donor ? `${d.Donor.first_name} ${d.Donor.last_name}` : 'Anonymous',
          created_at: d.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch dashboard statistics'));
  }
});

// Mount core module routes (users, auth, etc.)
app.use('/api/users', (await import('./modules/user/index.js')).userRoutes);
app.use('/api/auth', authLimiter, (await import('./modules/auth/index.js')).authRoutes);

// Mount other module routes
app.use('/api/activities', (await import('./modules/activities/index.js')).activityRoutes);
app.use('/api/donations', (await import('./modules/donations/index.js')).donationRoutes);
app.use('/api/documents', (await import('./modules/documents/index.js')).documentRoutes);
app.use('/api/team', (await import('./modules/team/index.js')).teamRoutes);
app.use('/api/messages', (await import('./modules/messages/index.js')).messageRoutes);
app.use('/api/settings', (await import('./modules/settings/index.js')).settingRoutes);
app.use('/api/audit', (await import('./modules/audit/index.js')).auditRoutes);
app.use('/api/media', (await import('./modules/media/index.js')).mediaRoutes);

// Module routes (base_automation, base_security, base_features_data, base_customization, advanced_features)
// are registered by the module system via their __init__.js during initialization

// Gawdesy routes
const gawdesyRouter = Router();
gawdesyRouter.get('/health', (req, res) => res.json({ success: true, status: 'healthy', module: 'gawdesy' }));
gawdesyRouter.get('/info', (req, res) => res.json({ success: true, data: { name: 'Gawdesy', version: '1.0.0' } }));
gawdesyRouter.get('/statistics', (req, res) => res.json({ success: true, data: { users: 0, donations: 0, activities: 0 } }));
gawdesyRouter.get('/modules', (req, res) => res.json({ success: true, data: [] }));
gawdesyRouter.get('/menus', (req, res) => res.json({ success: true, data: [] }));
gawdesyRouter.get('/permissions', (req, res) => res.json({ success: true, data: [] }));
gawdesyRouter.get('/settings', (req, res) => res.json({ success: true, data: {} }));
app.use('/api/gawdesy', gawdesyRouter);

// Lume routes
const lumeRouter = Router();
lumeRouter.get('/health', (req, res) => res.json({ success: true, status: 'healthy', module: 'lume' }));
app.use('/api/lume', lumeRouter);
app.use('/api/rbac', (await import('./modules/rbac/api/index.js')).default);

// Error handling — registered after module system init in startServer()
// (moved to end of startServer so module-registered routes aren't shadowed)

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Lume Modular Backend...');
    
    // Initialize database (skip initial sync - will sync after all models loaded)
    const sequelize = await initializeDatabase(true);
    console.log('✅ Database connected');
    
    // Setup existing models
    setupModels(sequelize);
    console.log('✅ Legacy models loaded');
    
    // Sync database - create any missing tables without altering existing ones
    await sequelize.sync({ alter: false });
    console.log('✅ Database synced');

    // Initialize module system (base module creates models, services, routes via __init__.js)
    const modulesDir = join(__dirname, 'modules');
    const moduleContext = { sequelize, database: sequelize, app };
    await initializeModuleSystem(modulesDir, moduleContext);
    console.log('✅ Module system initialized');

    // Sync again to create any tables defined by modules (including base models)
    await sequelize.sync({ alter: false });
    console.log('✅ Module tables synced');

    // Store base models globally for install/uninstall endpoints
    const baseModels = moduleContext.baseModels || {};
    const InstalledModule = baseModels.InstalledModule;

    // Sync module state to installed_modules table
    if (InstalledModule) {
      for (const mod of getAllModules()) {
        try {
          const [record, created] = await InstalledModule.findOrCreate({
            where: { name: mod.name },
            defaults: {
              displayName: mod.manifest?.name || mod.name,
              version: mod.manifest?.version || '1.0.0',
              state: 'installed',
              depends: mod.manifest?.depends || [],
              modulePath: `modules/${mod.name}`,
              installedAt: new Date(),
            }
          });
          // Respect persisted state on subsequent runs
          mod.initialized = record.state === 'installed';
          if (created) {
            console.log(`📦 Registered module: ${mod.name} (installed)`);
          } else if (record.state !== 'installed') {
            console.log(`📦 Module ${mod.name} state: ${record.state}`);
          }
        } catch (err) {
          console.warn(`⚠️  Failed to sync module state for ${mod.name}:`, err.message);
        }
      }
      console.log('✅ Module states synced to database');
    } else {
      console.warn('⚠️  InstalledModule model not available — module state not persisted');
    }

    // Make base models accessible to route handlers
    app.locals.baseModels = baseModels;
    app.locals.moduleContext = moduleContext;

    // Register error handlers AFTER module routes (so module routes aren't shadowed)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║              Lume Framework v1.0.0                        ║`);
      console.log(`╠════════════════════════════════════════════════════════════╣`);
      console.log(`║  Server:        http://localhost:${PORT}                  ║`);
      console.log(`║  API Base:      http://localhost:${PORT}/api               ║`);
      console.log(`║  Modules:       ${String(getAllModules().length).padEnd(28)}║`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
