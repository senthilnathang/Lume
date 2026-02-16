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
        {
          name: 'Hero Landing',
          description: 'Hero section with features grid and CTA',
          content: '<div data-type="sectionBlock" style="padding-top:60px;padding-bottom:60px"><h1 style="text-align:center">Your Headline Here</h1><p style="text-align:center">A compelling subtitle that explains your value proposition.</p><div data-type="buttonBlock" style="text-align:center"><a href="#">Get Started</a></div></div><div data-type="sectionBlock" style="padding-top:40px;padding-bottom:40px"><h2 style="text-align:center">Features</h2><div data-type="columnsBlock"><div data-type="columnBlock"><h3>Feature One</h3><p>Describe the first key feature.</p></div><div data-type="columnBlock"><h3>Feature Two</h3><p>Describe the second key feature.</p></div><div data-type="columnBlock"><h3>Feature Three</h3><p>Describe the third key feature.</p></div></div></div>',
          category: 'landing',
          isDefault: false,
        },
        {
          name: 'About Page',
          description: 'Company intro with team section',
          content: '<div data-type="sectionBlock"><h1>About Us</h1><p>Tell your company story here. Share your mission, vision, and values.</p></div><div data-type="sectionBlock"><h2>Our Team</h2><div data-type="columnsBlock"><div data-type="columnBlock"><p><strong>Team Member</strong></p><p>Role / Title</p></div><div data-type="columnBlock"><p><strong>Team Member</strong></p><p>Role / Title</p></div></div></div>',
          category: 'page',
          isDefault: false,
        },
        {
          name: 'Contact Page',
          description: 'Contact information layout',
          content: '<div data-type="sectionBlock"><h1>Contact Us</h1><p>We\'d love to hear from you. Get in touch using the information below.</p><div data-type="columnsBlock"><div data-type="columnBlock"><h3>Address</h3><p>123 Street Name<br>City, State 12345</p><h3>Email</h3><p>info@example.com</p></div><div data-type="columnBlock"><h3>Phone</h3><p>+1 (555) 123-4567</p><h3>Hours</h3><p>Mon-Fri: 9am - 5pm</p></div></div></div>',
          category: 'page',
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
