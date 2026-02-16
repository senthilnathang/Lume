/**
 * Website Content Seed Script
 * Seeds all RIAGRI website content into the database.
 * Run: node backend/src/modules/website/seed-content.js
 * Idempotent: checks if content exists before inserting.
 */
import { getDb, initDrizzle } from '../../core/db/drizzle.js';
import { websitePages, websiteMenus, websiteMenuItems, websiteSettings } from './models/schema.js';
import { eq } from 'drizzle-orm';

async function seed() {
  await initDrizzle();
  const db = getDb();

  console.log('🌱 Seeding website content...');

  // ─── Settings ───
  const settings = [
    { key: 'site_name', value: 'RIAGRI', type: 'string' },
    { key: 'site_tagline', value: 'Agricultural Equipment & Transport Solutions', type: 'string' },
    { key: 'site_description', value: 'Premium agricultural equipment, reliable transport devices, and expert service solutions to help your farm thrive in every season.', type: 'string' },
    { key: 'logo_url', value: '', type: 'string' },
    { key: 'primary_color', value: '#16a34a', type: 'string' },
    { key: 'phone', value: '+1 (234) 567-890', type: 'string' },
    { key: 'phone_secondary', value: '+1 (234) 567-891', type: 'string' },
    { key: 'emergency_phone', value: '+1 (234) 567-899', type: 'string' },
    { key: 'email', value: 'info@riagri.com', type: 'string' },
    { key: 'email_sales', value: 'sales@riagri.com', type: 'string' },
    { key: 'address', value: '123 Agriculture Road, Farmington, AG 54321', type: 'string' },
    { key: 'social_facebook', value: '#', type: 'string' },
    { key: 'social_twitter', value: '#', type: 'string' },
    { key: 'social_linkedin', value: '#', type: 'string' },
    {
      key: 'business_hours', type: 'json',
      value: JSON.stringify([
        { day: 'Monday - Friday', time: '8:00 AM - 6:00 PM' },
        { day: 'Saturday', time: '9:00 AM - 4:00 PM' },
        { day: 'Sunday', time: 'Closed', closed: true },
        { day: 'Public Holidays', time: 'Closed', closed: true },
      ]),
    },
    {
      key: 'footer_products', type: 'json',
      value: JSON.stringify(['Tractors & Machinery', 'Transport Equipment', 'Harvesters', 'Irrigation Systems', 'Spare Parts', 'Accessories']),
    },
    {
      key: 'footer_services', type: 'json',
      value: JSON.stringify(['Equipment Sales', 'Maintenance & Repair', 'Parts Supply', 'Training & Support', 'Consultation', 'Financing Options']),
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

  // ─── Pages ───
  const pages = [
    {
      title: 'Home',
      slug: 'home',
      pageType: 'home',
      metaTitle: 'RIAGRI - Agricultural Equipment & Transport Solutions',
      metaDescription: 'RIAGRI provides premium agricultural equipment, transport devices, and expert service solutions for modern farming. 15+ years of trusted service.',
      ogTitle: 'RIAGRI - Agricultural Equipment & Transport Solutions',
      ogDescription: 'Premium agricultural equipment, transport devices, and expert service solutions for modern farming.',
      content: JSON.stringify({
        heroStats: [
          { value: '15+', label: 'Years Experience' },
          { value: '500+', label: 'Happy Clients' },
          { value: '1000+', label: 'Machines Sold' },
        ],
        productCategories: [
          {
            title: 'Tractors & Machinery',
            description: 'High-performance tractors and farming machinery from leading manufacturers, built to handle any terrain and task.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V9l4-4h5l3 4h5v8h-3"/><path d="M10 5v6h7"/></svg>',
          },
          {
            title: 'Transport Equipment',
            description: 'Reliable trailers, carriers, and transport solutions designed for agricultural logistics and heavy-duty hauling.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="15" height="10" rx="1"/><path d="M16 10h4l3 3v3h-7V10z"/><circle cx="6" cy="18" r="2"/><circle cx="20" cy="18" r="2"/></svg>',
          },
          {
            title: 'Spare Parts & Accessories',
            description: 'Genuine spare parts and premium accessories to keep your equipment running at peak performance year-round.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
          },
        ],
        features: [
          {
            title: 'Expert Service',
            description: 'Our certified technicians bring decades of combined experience to every job.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
          },
          {
            title: 'Genuine Parts',
            description: 'Only authentic manufacturer parts ensuring longevity and optimal performance.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>',
          },
          {
            title: 'Nationwide Delivery',
            description: 'Fast and secure delivery to your doorstep, no matter where your farm is located.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>',
          },
          {
            title: '24/7 Support',
            description: 'Round-the-clock customer support to keep your operations running smoothly.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
          },
        ],
        featuredProducts: [
          { name: 'PowerTrac 5500', category: 'Tractor', specs: '55 HP, 4WD, Power Steering', price: '$28,500', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="22" cy="55" r="14"/><circle cx="58" cy="55" r="10"/><path d="M12 55H6V35l14-14h18l10 14h18v20h-8"/><path d="M36 21v20h28"/><circle cx="22" cy="55" r="5"/><circle cx="58" cy="55" r="4"/></svg>' },
          { name: 'HarvestMax 3000', category: 'Harvester', specs: '300 HP, 6m Header Width', price: '$145,000', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="15" y="20" width="40" height="30" rx="4"/><circle cx="20" cy="58" r="8"/><circle cx="50" cy="58" r="8"/><path d="M55 35h15v15H55"/><rect x="5" y="38" width="10" height="12" rx="2"/></svg>' },
          { name: 'AquaFlow Pro', category: 'Irrigation', specs: '50m Range, Solar Powered', price: '$3,200', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M40 15c-8 12-16 20-16 30a16 16 0 0032 0c0-10-8-18-16-30z"/><path d="M32 42c0 4.4 3.6 8 8 8s8-3.6 8-8"/></svg>' },
          { name: 'CargoHaul 12T', category: 'Trailer', specs: '12 Ton Capacity, Hydraulic Tip', price: '$12,800', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="10" y="25" width="50" height="25" rx="2"/><path d="M60 30h10l6 10v10H60"/><circle cx="22" cy="58" r="7"/><circle cx="48" cy="58" r="7"/><circle cx="70" cy="58" r="5"/><line x1="5" y1="50" x2="10" y2="50"/></svg>' },
        ],
        testimonials: [
          { quote: "RIAGRI transformed our farming operation. Their PowerTrac series is incredibly reliable and their service team is always just a call away. Best investment we've made.", name: 'James Mwangi', location: 'Nakuru County', initials: 'JM' },
          { quote: "We've been sourcing all our spare parts from RIAGRI for 5 years. Genuine parts, fair prices, and delivery is always on time. They truly understand farmers' needs.", name: 'Sarah Odhiambo', location: 'Kisumu Region', initials: 'SO' },
          { quote: 'The transport equipment we bought has been a game changer for our logistics. The CargoHaul trailers are built to last and handle our rough terrain perfectly.', name: 'Peter Kamau', location: 'Eldoret Valley', initials: 'PK' },
        ],
      }),
      isPublished: true,
      publishedAt: new Date(),
      sequence: 0,
    },
    {
      title: 'Products',
      slug: 'products',
      pageType: 'page',
      metaTitle: 'Products - RIAGRI Agricultural Equipment',
      metaDescription: "Browse RIAGRI's complete range of agricultural equipment including tractors, harvesters, irrigation systems, transport trailers, and genuine spare parts.",
      ogTitle: 'Products - RIAGRI Agricultural Equipment',
      ogDescription: 'Complete range of agricultural equipment, transport solutions, and spare parts.',
      content: JSON.stringify({
        filters: ['All Products', 'Tractors', 'Harvesters', 'Irrigation', 'Transport', 'Parts'],
        categories: [
          { title: 'Tractors', description: 'From compact utility tractors to high-horsepower row-crop models, our tractor lineup delivers power, comfort, and efficiency for any farm size.', count: '24', gradient: 'from-primary-600 to-primary-800', tags: ['2WD & 4WD', '25-120 HP', 'Diesel'], icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><circle cx="28" cy="66" r="16"/><circle cx="68" cy="66" r="12"/><path d="M16 66H8V42l16-16h20l12 16h20v24h-8"/><path d="M44 26v28h32"/><circle cx="28" cy="66" r="6"/><circle cx="68" cy="66" r="5"/></svg>' },
          { title: 'Harvesters', description: 'State-of-the-art combine harvesters and specialized crop harvesting equipment designed for maximum yield with minimum crop loss.', count: '12', gradient: 'from-accent-500 to-accent-700', tags: ['Combine', 'Forage', 'Self-Propelled'], icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><rect x="20" y="24" width="48" height="36" rx="4"/><circle cx="26" cy="70" r="10"/><circle cx="62" cy="70" r="10"/><path d="M68 42h18v18H68"/><rect x="8" y="44" width="12" height="16" rx="3"/></svg>' },
          { title: 'Irrigation Systems', description: 'Water-efficient irrigation solutions from drip systems to center pivots, helping you optimize water usage while maximizing crop productivity.', count: '18', gradient: 'from-blue-500 to-blue-700', tags: ['Drip', 'Sprinkler', 'Solar-Powered'], icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><path d="M48 16c-10 16-20 26-20 38a20 20 0 0040 0c0-12-10-22-20-38z"/><path d="M38 50c0 5.5 4.5 10 10 10s10-4.5 10-10"/></svg>' },
          { title: 'Transport Trailers', description: 'Heavy-duty agricultural trailers built for reliable hauling. Flatbeds, tipping trailers, and specialized crop transport solutions.', count: '15', gradient: 'from-gray-600 to-gray-800', tags: ['Flatbed', 'Tipping', '5-20 Ton'], icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><rect x="12" y="30" width="56" height="28" rx="3"/><path d="M68 38h14l8 12v10H68"/><circle cx="26" cy="68" r="8"/><circle cx="56" cy="68" r="8"/><circle cx="82" cy="68" r="6"/></svg>' },
          { title: 'Spare Parts', description: 'Genuine OEM and high-quality aftermarket parts for all major equipment brands. Engines, filters, hydraulics, and electrical components.', count: '200+', gradient: 'from-red-500 to-red-700', tags: ['OEM', 'Filters', 'Hydraulics'], icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><path d="M56 24l-8 8-8-8-8 8v16l8 8 8-8 8 8 8-8V32l-8-8z"/><circle cx="48" cy="40" r="6"/><path d="M28 60h40v16H28z" rx="3"/></svg>' },
          { title: 'Accessories', description: 'Essential farming accessories including GPS guidance systems, lighting kits, safety equipment, and operator comfort upgrades.', count: '85', gradient: 'from-purple-500 to-purple-700', tags: ['GPS', 'Safety', 'Lighting'], icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="40" r="20"/><path d="M48 20v-8m20 28h8M48 60v8m-20-28h-8"/><path d="M62.14 25.86l5.66-5.66M62.14 54.14l5.66 5.66M33.86 54.14l-5.66 5.66M33.86 25.86l-5.66-5.66"/><circle cx="48" cy="40" r="8"/></svg>' },
        ],
        topProducts: [
          { name: 'PowerTrac 5500', category: 'Tractor', description: '55 HP, 4WD with power steering and hydraulic PTO.', price: '$28,500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V9l4-4h5l3 4h5v8h-3"/></svg>' },
          { name: 'AquaFlow Elite', category: 'Irrigation', description: 'Smart drip irrigation with solar-powered pump and app control.', price: '$4,800', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3c-3 5-6 8-6 12a6 6 0 0012 0c0-4-3-7-6-12z"/></svg>' },
          { name: 'CargoHaul 12T', category: 'Trailer', description: '12 Ton hydraulic tipping trailer with reinforced chassis.', price: '$12,800', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="15" height="10" rx="1"/><path d="M16 10h4l3 3v3h-7V10z"/><circle cx="6" cy="18" r="2"/><circle cx="20" cy="18" r="2"/></svg>' },
          { name: 'GreenGuard GPS', category: 'Accessory', description: 'Precision GPS guidance system with auto-steer capability.', price: '$2,100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>' },
        ],
      }),
      isPublished: true,
      publishedAt: new Date(),
      sequence: 1,
    },
    {
      title: 'Services',
      slug: 'services',
      pageType: 'page',
      metaTitle: 'Services - RIAGRI Agricultural Solutions',
      metaDescription: 'RIAGRI offers equipment sales consultation, maintenance and repair, spare parts supply, and technical training for agricultural businesses.',
      ogTitle: 'Services - RIAGRI Agricultural Solutions',
      ogDescription: 'Complete agricultural equipment services: sales, maintenance, repairs, parts supply, and training.',
      content: JSON.stringify({
        services: [
          { title: 'Equipment Sales & Consultation', description: 'Our experienced sales team helps you choose the right equipment for your specific farming needs, terrain, and budget. We provide detailed comparisons, demo sessions, and financing guidance.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>', features: ['Personalized equipment recommendations', 'On-site demonstrations and test drives', 'Flexible financing and leasing options', 'Trade-in and upgrade programs'] },
          { title: 'Maintenance & Repair', description: 'Keep your equipment running at peak performance with our comprehensive maintenance programs. From routine servicing to complex repairs, our certified technicians handle it all.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>', features: ['Scheduled preventive maintenance plans', 'Emergency breakdown repair service', 'Engine and transmission overhauls', 'Hydraulic system diagnostics and repair'] },
          { title: 'Spare Parts Supply', description: 'Access to a vast inventory of genuine OEM parts and high-quality aftermarket alternatives. Fast sourcing and delivery for any make and model of agricultural equipment.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>', features: ['Genuine OEM parts for all major brands', 'Quality aftermarket alternatives', 'Express delivery for urgent orders', 'Parts warranty and return policy'] },
          { title: 'Training & Support', description: 'Maximize your equipment investment with operator training programs, safety workshops, and ongoing technical support from our expert agricultural engineers.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path d="M12 14l9-5-9-5-9 5 9 5zm0 0v7"/></svg>', features: ['Operator certification programs', 'Safety and compliance training', 'Equipment optimization workshops', '24/7 phone and on-site technical support'] },
        ],
        processSteps: [
          { title: 'Consultation', description: 'Tell us about your farming operation, challenges, and goals. We listen and assess your needs thoroughly.' },
          { title: 'Selection', description: 'We recommend the best equipment and service packages tailored to your specific requirements and budget.' },
          { title: 'Delivery', description: 'Professional delivery, installation, and setup with hands-on operator training at your farm.' },
          { title: 'After-Sales', description: 'Ongoing maintenance plans, parts supply, and dedicated support to keep everything running smoothly.' },
        ],
        guarantees: [
          { title: '12-Month Warranty', description: 'All new equipment comes with a comprehensive 12-month manufacturer warranty covering parts and labor.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>' },
          { title: '48-Hour Response', description: 'We guarantee a technician visit within 48 hours for any service request within our coverage area.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
          { title: 'Satisfaction Guaranteed', description: 'If you are not completely satisfied with our service, we will make it right at no additional cost to you.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>' },
        ],
      }),
      isPublished: true,
      publishedAt: new Date(),
      sequence: 2,
    },
    {
      title: 'About',
      slug: 'about',
      pageType: 'page',
      metaTitle: 'About Us - RIAGRI Agricultural Equipment',
      metaDescription: "Learn about RIAGRI's 15+ year journey in providing premium agricultural equipment, transport solutions, and expert service to farming communities.",
      ogTitle: 'About Us - RIAGRI Agricultural Equipment',
      ogDescription: 'Dedicated to advancing agriculture through reliable equipment and unwavering commitment to our farming community.',
      content: JSON.stringify({
        story: [
          'Founded in 2009, RIAGRI began as a small family-owned equipment dealership with a simple mission: to provide farmers with access to reliable, high-quality agricultural machinery at fair prices.',
          'Over the past 15 years, we have grown into one of the region\'s most trusted agricultural equipment providers, serving over 500 farming operations across the country. Our growth has been driven by a commitment to understanding the unique challenges that modern farmers face.',
          'Today, RIAGRI offers a comprehensive range of products and services, from heavy-duty tractors and harvesters to precision irrigation systems and genuine spare parts. We are not just an equipment dealer, we are a partner in your farming success.',
        ],
        mvv: [
          { title: 'Our Mission', description: 'To empower farmers and agricultural businesses with access to reliable, high-performance equipment and exceptional service that drives productivity, profitability, and sustainable growth.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>', bgColor: 'bg-primary-50', iconColor: 'text-primary-600' },
          { title: 'Our Vision', description: 'To be the most trusted and innovative agricultural equipment partner in the region, setting the standard for product quality, customer service, and farming technology adoption.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>', bgColor: 'bg-accent-50', iconColor: 'text-accent-600' },
          { title: 'Our Values', description: 'Integrity in every transaction. Quality in every product. Excellence in every service. Community in every relationship. Innovation in every solution we deliver.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>', bgColor: 'bg-red-50', iconColor: 'text-red-500' },
        ],
        teamMembers: [
          { name: 'David Kariuki', role: 'Founder & CEO', initials: 'DK', bio: '20+ years in agricultural engineering with a passion for modernizing farming across Africa.' },
          { name: 'Grace Wanjiru', role: 'Head of Operations', initials: 'GW', bio: 'Supply chain expert ensuring seamless equipment delivery and inventory management nationwide.' },
          { name: 'Michael Omondi', role: 'Chief Technical Officer', initials: 'MO', bio: 'Certified agricultural mechanic leading our service team with 15 years of hands-on experience.' },
          { name: 'Amina Hassan', role: 'Sales Director', initials: 'AH', bio: 'Agricultural economics graduate driving strategic growth and building lasting client relationships.' },
        ],
        stats: [
          { value: '15+', label: 'Years in Business' },
          { value: '500+', label: 'Happy Clients' },
          { value: '3,000+', label: 'Machines Serviced' },
          { value: '8', label: 'Service Centers' },
        ],
      }),
      isPublished: true,
      publishedAt: new Date(),
      sequence: 3,
    },
    {
      title: 'Contact',
      slug: 'contact',
      pageType: 'page',
      metaTitle: 'Contact Us - RIAGRI Agricultural Equipment',
      metaDescription: 'Get in touch with RIAGRI for equipment quotes, service requests, spare parts inquiries, or technical support. Visit our showroom or call us today.',
      ogTitle: 'Contact Us - RIAGRI Agricultural Equipment',
      ogDescription: 'Contact RIAGRI for agricultural equipment quotes, service requests, and technical support.',
      content: JSON.stringify({
        subjects: [
          { value: 'quote', label: 'Request a Quote' },
          { value: 'sales', label: 'Product Inquiry' },
          { value: 'service', label: 'Service Request' },
          { value: 'parts', label: 'Spare Parts' },
          { value: 'support', label: 'Technical Support' },
          { value: 'other', label: 'Other' },
        ],
      }),
      isPublished: true,
      publishedAt: new Date(),
      sequence: 4,
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

  // ─── Menus ───
  const existingMenus = await db.select().from(websiteMenus);
  if (existingMenus.length === 0) {
    // Header menu
    const [headerMenu] = await db.insert(websiteMenus).values({ name: 'Main Navigation', location: 'header', isActive: true }).$returningId();
    const headerMenuId = headerMenu.id;
    const headerItems = [
      { menuId: headerMenuId, label: 'Home', url: '/', sequence: 0, isActive: true },
      { menuId: headerMenuId, label: 'Products', url: '/products', sequence: 1, isActive: true },
      { menuId: headerMenuId, label: 'Services', url: '/services', sequence: 2, isActive: true },
      { menuId: headerMenuId, label: 'About', url: '/about', sequence: 3, isActive: true },
      { menuId: headerMenuId, label: 'Contact', url: '/contact', sequence: 4, isActive: true },
    ];
    for (const item of headerItems) {
      await db.insert(websiteMenuItems).values(item);
    }
    console.log(`  ✅ Header menu with ${headerItems.length} items`);

    // Footer menu
    const [footerMenu] = await db.insert(websiteMenus).values({ name: 'Footer Navigation', location: 'footer', isActive: true }).$returningId();
    const footerMenuId = footerMenu.id;
    const footerItems = [
      { menuId: footerMenuId, label: 'Products', url: '/products', sequence: 0, isActive: true },
      { menuId: footerMenuId, label: 'Services', url: '/services', sequence: 1, isActive: true },
      { menuId: footerMenuId, label: 'About Us', url: '/about', sequence: 2, isActive: true },
      { menuId: footerMenuId, label: 'Contact', url: '/contact', sequence: 3, isActive: true },
      { menuId: footerMenuId, label: 'Privacy Policy', url: '/privacy', sequence: 4, isActive: true },
      { menuId: footerMenuId, label: 'Terms of Service', url: '/terms', sequence: 5, isActive: true },
    ];
    for (const item of footerItems) {
      await db.insert(websiteMenuItems).values(item);
    }
    console.log(`  ✅ Footer menu with ${footerItems.length} items`);
  } else {
    console.log(`  ⏭️  Menus already exist (${existingMenus.length} menus)`);
  }

  console.log('\n✅ Website content seeded successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
