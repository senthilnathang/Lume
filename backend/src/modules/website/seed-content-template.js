/**
 * Website Content Seed Template
 * Generic seed script that reads configuration from environment variables.
 * Supports optional demo page content seeding.
 * Run: node backend/src/modules/website/seed-content-template.js
 * Idempotent: checks if content exists before inserting.
 *
 * Environment Variables:
 *   WEBSITE_SEED_SITE_NAME - Site name (default: "My Website")
 *   WEBSITE_SEED_SITE_TAGLINE - Site tagline (default: empty)
 *   WEBSITE_SEED_SITE_DESCRIPTION - Site description (default: empty)
 *   WEBSITE_SEED_SITE_EMAIL - Primary email (default: "contact@example.com")
 *   WEBSITE_SEED_SITE_EMAIL_SALES - Sales email (default: same as primary)
 *   WEBSITE_SEED_SITE_PHONE - Primary phone (default: empty)
 *   WEBSITE_SEED_SITE_PHONE_SECONDARY - Secondary phone (default: empty)
 *   WEBSITE_SEED_SITE_PHONE_EMERGENCY - Emergency phone (default: empty)
 *   WEBSITE_SEED_SITE_ADDRESS - Address (default: empty)
 *   WEBSITE_SEED_SITE_PRIMARY_COLOR - Primary brand color (default: "#3B82F6")
 *   WEBSITE_SEED_DEMO_PAGES - Seed demo pages (default: "false")
 *   WEBSITE_SEED_DEMO_PAGES_CONTENT - Include demo page content (default: "true" if DEMO_PAGES=true)
 */

import { getDb, initDrizzle } from '../../core/db/drizzle.js';
import { websitePages, websiteMenus, websiteMenuItems, websiteSettings } from './models/schema.js';
import { eq } from 'drizzle-orm';

const config = {
  siteName: process.env.WEBSITE_SEED_SITE_NAME || 'My Website',
  siteTagline: process.env.WEBSITE_SEED_SITE_TAGLINE || '',
  siteDescription: process.env.WEBSITE_SEED_SITE_DESCRIPTION || '',
  email: process.env.WEBSITE_SEED_SITE_EMAIL || 'contact@example.com',
  emailSales: process.env.WEBSITE_SEED_SITE_EMAIL_SALES || process.env.WEBSITE_SEED_SITE_EMAIL || 'contact@example.com',
  phone: process.env.WEBSITE_SEED_SITE_PHONE || '',
  phoneSecondary: process.env.WEBSITE_SEED_SITE_PHONE_SECONDARY || '',
  phoneEmergency: process.env.WEBSITE_SEED_SITE_PHONE_EMERGENCY || '',
  address: process.env.WEBSITE_SEED_SITE_ADDRESS || '',
  primaryColor: process.env.WEBSITE_SEED_SITE_PRIMARY_COLOR || '#3B82F6',
  seedDemoPages: (process.env.WEBSITE_SEED_DEMO_PAGES || '').toLowerCase() === 'true',
  includePageContent: (process.env.WEBSITE_SEED_DEMO_PAGES_CONTENT ?? 'true').toLowerCase() === 'true',
};

async function seed() {
  await initDrizzle();
  const db = getDb();

  console.log('🌱 Seeding website content...');
  console.log(`   Site: ${config.siteName}`);
  console.log(`   Email: ${config.email}`);
  console.log(`   Demo Pages: ${config.seedDemoPages ? 'Yes' : 'No'}`);

  // ─── Settings ───
  const settings = [
    { key: 'site_name', value: config.siteName, type: 'string' },
    { key: 'site_tagline', value: config.siteTagline, type: 'string' },
    { key: 'site_description', value: config.siteDescription, type: 'string' },
    { key: 'logo_url', value: '', type: 'string' },
    { key: 'primary_color', value: config.primaryColor, type: 'string' },
    ...(config.phone ? [{ key: 'phone', value: config.phone, type: 'string' }] : []),
    ...(config.phoneSecondary ? [{ key: 'phone_secondary', value: config.phoneSecondary, type: 'string' }] : []),
    ...(config.phoneEmergency ? [{ key: 'emergency_phone', value: config.phoneEmergency, type: 'string' }] : []),
    { key: 'email', value: config.email, type: 'string' },
    { key: 'email_sales', value: config.emailSales, type: 'string' },
    ...(config.address ? [{ key: 'address', value: config.address, type: 'string' }] : []),
    { key: 'social_facebook', value: '', type: 'string' },
    { key: 'social_twitter', value: '', type: 'string' },
    { key: 'social_linkedin', value: '', type: 'string' },
    {
      key: 'business_hours',
      type: 'json',
      value: JSON.stringify([
        { day: 'Monday - Friday', time: '9:00 AM - 5:00 PM' },
        { day: 'Saturday', time: '10:00 AM - 3:00 PM' },
        { day: 'Sunday', time: 'Closed' },
        { day: 'Holidays', time: 'Closed' },
      ]),
    },
  ];

  for (const s of settings) {
    const existing = await db.select().from(websiteSettings).where(eq(websiteSettings.key, s.key));
    if (existing.length === 0) {
      await db.insert(websiteSettings).values(s);
      console.log(`  ✅ Setting: ${s.key}`);
    } else {
      console.log(`  ⏭️  Setting exists: ${s.key}`);
    }
  }

  // ─── Demo Pages (optional) ───
  if (config.seedDemoPages) {
    console.log('\n📄 Seeding demo pages...');

    const pages = [
      {
        title: 'Home',
        slug: 'home',
        pageType: 'home',
        metaTitle: `${config.siteName} - Home`,
        metaDescription: config.siteDescription || `Welcome to ${config.siteName}`,
        ogTitle: `${config.siteName}`,
        ogDescription: config.siteDescription || `Welcome to ${config.siteName}`,
        // Empty or minimal content - users can customize in editor
        content: config.includePageContent
          ? JSON.stringify({
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: `Welcome to ${config.siteName}` }],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Add your homepage content here.' }],
                },
              ],
            })
          : JSON.stringify({ type: 'doc', content: [] }),
        status: 'published',
        isHomePage: true,
      },
      {
        title: 'About',
        slug: 'about',
        pageType: 'default',
        metaTitle: `About ${config.siteName}`,
        metaDescription: `Learn more about ${config.siteName}`,
        ogTitle: `About ${config.siteName}`,
        ogDescription: `Learn more about ${config.siteName}`,
        content: config.includePageContent
          ? JSON.stringify({
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: `About ${config.siteName}` }],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Share your story and mission here.' }],
                },
              ],
            })
          : JSON.stringify({ type: 'doc', content: [] }),
        status: 'published',
      },
      {
        title: 'Services',
        slug: 'services',
        pageType: 'default',
        metaTitle: `Services - ${config.siteName}`,
        metaDescription: `Our services and offerings`,
        ogTitle: `Services - ${config.siteName}`,
        ogDescription: `Our services and offerings`,
        content: config.includePageContent
          ? JSON.stringify({
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: 'Our Services' }],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Describe your services here.' }],
                },
              ],
            })
          : JSON.stringify({ type: 'doc', content: [] }),
        status: 'published',
      },
      {
        title: 'Contact',
        slug: 'contact',
        pageType: 'contact',
        metaTitle: `Contact ${config.siteName}`,
        metaDescription: `Get in touch with ${config.siteName}`,
        ogTitle: `Contact ${config.siteName}`,
        ogDescription: `Get in touch with ${config.siteName}`,
        content: config.includePageContent
          ? JSON.stringify({
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: 'Contact Us' }],
                },
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: `Email: ${config.email}` }],
                },
              ],
            })
          : JSON.stringify({ type: 'doc', content: [] }),
        status: 'published',
      },
    ];

    for (const page of pages) {
      const existing = await db.select().from(websitePages).where(eq(websitePages.slug, page.slug));
      if (existing.length === 0) {
        await db.insert(websitePages).values(page);
        console.log(`  ✅ Page: ${page.title}`);
      } else {
        console.log(`  ⏭️  Page exists: ${page.title}`);
      }
    }

    // ─── Main Menu ───
    console.log('\n🍔 Seeding navigation menu...');
    const menuExisting = await db.select().from(websiteMenus).where(eq(websiteMenus.location, 'header'));
    if (menuExisting.length === 0) {
      const menuResult = await db.insert(websiteMenus).values({
        name: 'Header Menu',
        location: 'header',
        description: 'Main navigation menu',
      });

      // Get the inserted menu ID
      const menus = await db.select().from(websiteMenus).where(eq(websiteMenus.location, 'header'));
      const menuId = menus[0].id;

      // Create menu items
      const menuItems = [
        { menuId, label: 'Home', path: '/', sequence: 1 },
        { menuId, label: 'About', path: '/about', sequence: 2 },
        { menuId, label: 'Services', path: '/services', sequence: 3 },
        { menuId, label: 'Contact', path: '/contact', sequence: 4 },
      ];

      for (const item of menuItems) {
        await db.insert(websiteMenuItems).values(item);
      }
      console.log(`  ✅ Menu created with ${menuItems.length} items`);
    } else {
      console.log(`  ⏭️  Menu exists`);
    }
  }

  console.log('\n✅ Website seeding complete!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
