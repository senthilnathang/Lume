#!/usr/bin/env node
/**
 * Lume Framework Demo Data Seeder
 * Populates database with sample activities, team members, messages, and settings
 * Run with: npm run seed
 */

import dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  const prisma = (await import('../core/db/prisma.js')).default;

  try {
    console.log('🌱 Seeding demo data...');
    await prisma.$connect();

    // Seed activities
    console.log('📌 Seeding activities...');
    const activities = [
      {
        slug: 'community-cleanup-2026',
        title: 'Community Cleanup Drive',
        category: 'Community Service',
        status: 'published',
        description: 'Join us for a community-wide cleanup initiative',
        startDate: new Date('2026-05-15'),
        endDate: new Date('2026-05-15'),
        capacity: 100,
        is_featured: true
      },
      {
        slug: 'education-workshop-2026',
        title: 'Educational Workshop Series',
        category: 'Education',
        status: 'published',
        description: 'Learn new skills and knowledge',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        capacity: 50,
        is_featured: true
      },
      {
        slug: 'fundraiser-summer-2026',
        title: 'Summer Fundraiser',
        category: 'Fundraiser',
        status: 'published',
        description: 'Raise funds for our mission',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-31'),
        capacity: 200,
        is_featured: false
      },
      {
        slug: 'health-camp-2026',
        title: 'Health and Wellness Camp',
        category: 'Health',
        status: 'draft',
        description: 'Free health checkup and wellness activities',
        startDate: new Date('2026-08-15'),
        endDate: new Date('2026-08-20'),
        capacity: 150,
        is_featured: false
      },
      {
        slug: 'social-service-initiative-2026',
        title: 'Social Service Initiative',
        category: 'Social Service',
        status: 'published',
        description: 'Community support and social welfare programs',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-30'),
        capacity: 75,
        is_featured: true
      }
    ];

    for (const activity of activities) {
      await prisma.activity.upsert({
        where: { slug: activity.slug },
        create: activity,
        update: activity
      });
    }
    console.log(`✅ Seeded ${activities.length} activities`);

    // Seed team members
    console.log('👥 Seeding team members...');
    const teamMembers = [
      {
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh@example.com',
        position: 'Executive Director',
        department: 'Leadership',
        bio: 'Visionary leader with 15+ years of experience',
        is_leader: true
      },
      {
        firstName: 'Priya',
        lastName: 'Singh',
        email: 'priya@example.com',
        position: 'Program Manager',
        department: 'Programs',
        bio: 'Dedicated to community development',
        is_leader: true
      },
      {
        firstName: 'Amit',
        lastName: 'Patel',
        email: 'amit@example.com',
        position: 'Operations Manager',
        department: 'Operations',
        bio: 'Ensuring smooth operations',
        is_leader: false
      },
      {
        firstName: 'Sneha',
        lastName: 'Gupta',
        email: 'sneha@example.com',
        position: 'Communications Officer',
        department: 'Communications',
        bio: 'Sharing stories of impact',
        is_leader: false
      },
      {
        firstName: 'Vikram',
        lastName: 'Reddy',
        email: 'vikram@example.com',
        position: 'Finance Manager',
        department: 'Finance',
        bio: 'Managing resources responsibly',
        is_leader: false
      },
      {
        firstName: 'Anjali',
        lastName: 'Sharma',
        email: 'anjali@example.com',
        position: 'Volunteer Coordinator',
        department: 'Volunteers',
        bio: 'Mobilizing community support',
        is_leader: false
      }
    ];

    for (const member of teamMembers) {
      await prisma.team.upsert({
        where: { email: member.email },
        create: member,
        update: member
      });
    }
    console.log(`✅ Seeded ${teamMembers.length} team members`);

    // Seed messages (upsert to prevent duplicates)
    console.log('💬 Seeding sample messages...');
    const messages = [
      {
        email: 'contact@example.com',
        name: 'Example User',
        type: 'inquiry',
        subject: 'General Inquiry',
        message: 'I would like to know more about your programs',
        status: 'new',
        priority: 'normal'
      },
      {
        email: 'support@example.com',
        name: 'Support Request',
        type: 'support',
        subject: 'Technical Support Needed',
        message: 'I am having trouble accessing the portal',
        status: 'new',
        priority: 'high'
      },
      {
        email: 'feedback@example.com',
        name: 'Feedback Provider',
        type: 'feedback',
        subject: 'Website Feedback',
        message: 'Great work on the new website design',
        status: 'read',
        priority: 'normal'
      }
    ];

    for (const msg of messages) {
      await prisma.message.upsert({
        where: {
          email_type: {
            email: msg.email,
            type: msg.type
          }
        },
        create: { ...msg, createdAt: new Date() },
        update: msg
      });
    }
    console.log(`✅ Seeded ${messages.length} messages`);

    // Seed settings
    console.log('⚙️  Seeding settings...');
    const settings = [
      { key: 'organization_name', value: 'Lume Organization', category: 'general' },
      { key: 'organization_email', value: 'info@lume.dev', category: 'general' },
      { key: 'organization_phone', value: '+1-800-LUME-ORG', category: 'contact' },
      { key: 'organization_address', value: '123 Main Street, City, Country', category: 'contact' },
      { key: 'website_url', value: 'https://www.example.com', category: 'general' },
      { key: 'social_facebook', value: 'https://facebook.com/example', category: 'social' },
      { key: 'social_twitter', value: 'https://twitter.com/example', category: 'social' },
      { key: 'default_timezone', value: 'UTC', category: 'localization' },
      { key: 'default_language', value: 'en', category: 'localization' },
      { key: 'currency', value: 'USD', category: 'localization' }
    ];

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        create: setting,
        update: setting
      });
    }
    console.log(`✅ Seeded ${settings.length} settings`);

    console.log(`
✅ Demo data seeding complete!

Sample data has been populated:
  • 5 activities
  • 6 team members
  • 3 messages
  • 10 settings

You can now:
  1. Start the backend: npm run dev
  2. Login with: admin@lume.dev / Admin@Lume!1
  3. View and interact with the seeded data
    `);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

main();
