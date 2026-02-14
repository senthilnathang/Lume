/**
 * Common Module Initialization
 *
 * Shared utilities for all Gawdesy modules.
 * This module provides frontend static files only (composables, components, locales, utils).
 * No backend models, services, or API routes.
 */

const initializeCommon = async (context) => {
  console.log('🔧 Initializing Common Module...');
  console.log('✅ Common Module initialized (frontend-only)');

  return { models: {}, services: {} };
};

export default initializeCommon;
