import { ModuleManifest } from '@core/module/define-module';

export const PluginsModuleManifest: ModuleManifest = {
  name: 'plugins',
  displayName: 'Plugins & Marketplace',
  version: '1.0.0',
  description: 'Plugin management and marketplace system',

  dependencies: ['base'],

  permissions: [
    // Plugin management
    'plugins.list',
    'plugins.read',
    'plugins.install',
    'plugins.uninstall',
    'plugins.enable',
    'plugins.disable',

    // Marketplace
    'plugins.marketplace.read',
    'plugins.marketplace.browse',
    'plugins.marketplace.install',
    'plugins.marketplace.review',
    'plugins.marketplace.search',

    // Developer portal
    'plugins.developer.submit',
    'plugins.developer.manage',
    'plugins.developer.analytics',

    // Admin
    'plugins.admin.manage',
    'plugins.admin.approve',
    'plugins.admin.reject',
  ],

  staticViews: {
    marketplace: {
      path: 'static/views/MarketplaceView.vue',
      displayName: 'Plugin Marketplace',
      route: '/plugins/marketplace',
      icon: 'store',
    },
    marketplaceDetail: {
      path: 'static/views/MarketplacePluginDetail.vue',
      displayName: 'Plugin Details',
      route: '/plugins/marketplace/:name',
      icon: 'info-circle',
    },
  },

  apiEndpoints: [
    {
      path: 'api/marketplace/plugins',
      methods: ['GET'],
      description: 'List marketplace plugins',
    },
    {
      path: 'api/marketplace/plugins/:name',
      methods: ['GET'],
      description: 'Get plugin details',
    },
    {
      path: 'api/marketplace/categories',
      methods: ['GET'],
      description: 'Get plugin categories',
    },
    {
      path: 'api/marketplace/plugins/:name/install',
      methods: ['POST'],
      description: 'Install plugin',
    },
    {
      path: 'api/marketplace/plugins/:name/reviews',
      methods: ['GET', 'POST'],
      description: 'Get and submit reviews',
    },
    {
      path: 'api/marketplace/plugins/featured',
      methods: ['GET'],
      description: 'Get featured plugins',
    },
    {
      path: 'api/marketplace/plugins/trending',
      methods: ['GET'],
      description: 'Get trending plugins',
    },
  ],
};
