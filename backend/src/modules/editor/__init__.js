import editorRoutes from './api/index.js';
import { getDb } from '../../core/db/drizzle.js';
import { editorTemplates } from './models/schema.js';

const initializeEditor = async (context) => {
  const { app } = context;

  // Register API routes
  app.use('/api/editor', editorRoutes);
  console.log('✅ Editor API routes registered: /api/editor');

  // Seed default templates if none exist
  try {
    const db = getDb();
    const existing = await db.select().from(editorTemplates).limit(1);
    if (existing.length === 0) {
      await db.insert(editorTemplates).values([
        {
          name: 'Blank Page',
          description: 'Empty page with no content',
          content: '',
          category: 'general',
          isDefault: true,
        },
        {
          name: 'Basic Page',
          description: 'Simple page with heading and paragraph',
          content: '<h1>Page Title</h1><p>Start writing your content here...</p>',
          category: 'general',
          isDefault: false,
        },
        {
          name: 'Landing Page',
          description: 'Hero section with call-to-action',
          content: '<div><h1>Welcome</h1><p>Your landing page content here...</p><p><a href="#">Get Started</a></p></div>',
          category: 'landing',
          isDefault: false,
        },
      ]);
      console.log('📝 Default editor templates seeded');
    }
  } catch (err) {
    console.warn('⚠️ Could not seed editor templates:', err.message);
  }

  console.log('✅ Editor Module initialized');
};

export default initializeEditor;
export { initializeEditor as init };
