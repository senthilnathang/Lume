/**
 * Website Module Initialization
 */

import websiteRoutes from './website.routes.js';

const initializeWebsite = async (context) => {
  const { app } = context;

  // Register API routes
  app.use('/api/website', websiteRoutes);
  console.log('✅ Website API routes registered: /api/website');

  console.log('✅ Website Module initialized');
};

export default initializeWebsite;
export { initializeWebsite as init };
