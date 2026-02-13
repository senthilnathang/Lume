/**
 * RBAC Module Initialization
 */

import router from './api/index.js';

export default async function init(context) {
  const { app } = context;
  
  console.log('Initializing RBAC module...');
  
  app.use('/api/rbac', router);
  console.log('✅ RBAC API routes registered: /api/rbac');
  
  console.log('RBAC module initialized');
}
