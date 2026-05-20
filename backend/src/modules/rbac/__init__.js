/**
 * RBAC Module Initialization
 */

import {
  rbacRoles,
  rbacPermissions,
  rbacAccessRules
} from '../base_rbac/models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
// Phase 3.1 batch 3: `router` + `app` document the module-init contract
// but the current rbac init does not mount routes (handled elsewhere by
// the auto-loader). Underscored to keep the shape visible.
import _router from './api/index.js';

export default async function init(context) {
  const { app: _app } = context;

  console.log('Initializing RBAC module...');

  const adapters = {
    Role: new DrizzleAdapter(rbacRoles),
    Permission: new DrizzleAdapter(rbacPermissions),
    AccessRule: new DrizzleAdapter(rbacAccessRules)
  };
  console.log(`✅ RBAC adapters created: ${Object.keys(adapters).join(', ')}`);

  // Router is already mounted in index.js at /api/rbac
  // Just store adapters for potential use by other modules
  console.log('✅ RBAC API routes available at: /api/rbac');

  console.log('RBAC module initialized');

  return { models: adapters };
}
