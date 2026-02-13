import { getDatabase, initializeDatabase } from '../config.js';
import { setupModels } from '../database/models/index.js';

const seedSampleData = async () => {
  try {
    const sequelize = await initializeDatabase();
    setupModels(sequelize);
    const db = getDatabase();
    const Activity = db.models.Activity;
    const TeamMember = db.models.TeamMember;
    const Message = db.models.Message;
    const Setting = db.models.Setting;

    // Seed Activities
    const activities = [
      {
        title: 'Annual Charity Gala 2026',
        slug: 'annual-charity-gala-2026',
        description: 'Join us for our biggest fundraising event of the year. An evening of elegance, entertainment, and philanthropy.',
        short_description: 'Our biggest fundraising event of the year',
        category: 'Fundraiser',
        status: 'published',
        start_date: new Date('2026-03-15T18:00:00Z'),
        end_date: new Date('2026-03-15T23:00:00Z'),
        location: 'Grand Ballroom, Downtown Hotel',
        capacity: 200,
        is_featured: true
      },
      {
        title: 'Community Clean-up Drive',
        slug: 'community-cleanup-drive',
        description: 'Help us make our community cleaner and greener. All ages welcome!',
        short_description: 'Join us in making our community cleaner',
        category: 'Community Service',
        status: 'published',
        start_date: new Date('2026-02-20T08:00:00Z'),
        end_date: new Date('2026-02-20T14:00:00Z'),
        location: 'Central Park Meeting Point',
        capacity: 100,
        is_featured: true
      },
      {
        title: 'Youth Leadership Workshop',
        slug: 'youth-leadership-workshop',
        description: 'A weekend workshop designed to develop leadership skills in young people.',
        short_description: 'Developing tomorrow\'s leaders today',
        category: 'Education',
        status: 'published',
        start_date: new Date('2026-02-28T09:00:00Z'),
        end_date: new Date('2026-02-28T17:00:00Z'),
        location: 'Community Center',
        capacity: 50,
        is_featured: false
      },
      {
        title: 'Food Distribution Program',
        slug: 'food-distribution-program',
        description: 'Weekly food distribution for families in need. Your support makes this possible.',
        short_description: 'Supporting families in our community',
        category: 'Social Service',
        status: 'published',
        start_date: new Date('2026-02-15T10:00:00Z'),
        end_date: new Date('2026-02-15T15:00:00Z'),
        location: 'Distribution Center',
        capacity: 150,
        is_featured: true
      },
      {
        title: 'Health Awareness Camp',
        slug: 'health-awareness-camp',
        description: 'Free health checkups and awareness programs for the community.',
        short_description: 'Free health checkups and awareness',
        category: 'Health',
        status: 'draft',
        start_date: new Date('2026-03-01T08:00:00Z'),
        end_date: new Date('2026-03-01T16:00:00Z'),
        location: 'Medical Camp Ground',
        capacity: 200,
        is_featured: false
      }
    ];

    for (const activity of activities) {
      await Activity.findOrCreate({
        where: { slug: activity.slug },
        defaults: activity
      });
    }
    console.log(`✅ Seeded ${activities.length} activities`);

    // Seed Team Members
    const teamMembers = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@gawdesy.org',
        phone: '+1-555-0101',
        position: 'Executive Director',
        department: 'Administration',
        bio: 'John has over 20 years of experience in non-profit management.',
        is_leader: true,
        is_active: true,
        order: 1
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@gawdesy.org',
        phone: '+1-555-0102',
        position: 'Programs Director',
        department: 'Programs',
        bio: 'Sarah leads our community outreach and program development.',
        is_leader: true,
        is_active: true,
        order: 2
      },
      {
        first_name: 'Michael',
        last_name: 'Williams',
        email: 'michael.williams@gawdesy.org',
        phone: '+1-555-0103',
        position: 'Fundraising Manager',
        department: 'Fundraising',
        bio: 'Michael oversees all fundraising initiatives and donor relations.',
        is_leader: false,
        is_active: true,
        order: 3
      },
      {
        first_name: 'Emily',
        last_name: 'Brown',
        email: 'emily.brown@gawdesy.org',
        phone: '+1-555-0104',
        position: 'Volunteer Coordinator',
        department: 'Operations',
        bio: 'Emily manages our volunteer program and community engagement.',
        is_leader: false,
        is_active: true,
        order: 4
      },
      {
        first_name: 'David',
        last_name: 'Lee',
        email: 'david.lee@gawdesy.org',
        phone: '+1-555-0105',
        position: 'Finance Manager',
        department: 'Finance',
        bio: 'David ensures transparent and efficient financial management.',
        is_leader: false,
        is_active: true,
        order: 5
      },
      {
        first_name: 'Jennifer',
        last_name: 'Martinez',
        email: 'jennifer.martinez@gawdesy.org',
        phone: '+1-555-0106',
        position: 'Communications Lead',
        department: 'Communications',
        bio: 'Jennifer handles all media relations and public communications.',
        is_leader: false,
        is_active: true,
        order: 6
      }
    ];

    for (const member of teamMembers) {
      await TeamMember.findOrCreate({
        where: { email: member.email },
        defaults: member
      });
    }
    console.log(`✅ Seeded ${teamMembers.length} team members`);

    // Seed Sample Messages
    const messages = [
      {
        subject: 'Inquiry about Volunteer Opportunities',
        content: 'Hi, I would like to know more about volunteer opportunities with your organization. I have experience in event management and community service.',
        sender_name: 'Alex Thompson',
        sender_email: 'alex.thompson@email.com',
        type: 'inquiry',
        status: 'new',
        priority: 'normal'
      },
      {
        subject: 'Donation Query',
        content: 'Hello, I am interested in making a donation to support your programs. Could you please provide information about how donations are used?',
        sender_name: 'Maria Garcia',
        sender_email: 'maria.garcia@email.com',
        type: 'support',
        status: 'new',
        priority: 'normal'
      },
      {
        subject: 'Partnership Proposal',
        content: 'We are a corporate entity looking to partner with NGOs for social responsibility programs. Would love to discuss potential collaboration.',
        sender_name: 'Robert Chen',
        sender_email: 'robert.chen@corporate.com',
        type: 'feedback',
        status: 'read',
        priority: 'high'
      }
    ];

    for (const message of messages) {
      await Message.create(message);
    }
    console.log(`✅ Seeded ${messages.length} messages`);

    // Seed Settings
    const settings = [
      { key: 'site_name', value: 'Gawdesy Foundation', type: 'string', category: 'general', description: 'Site name' },
      { key: 'site_description', value: 'Empowering communities through education, healthcare, and social services', type: 'string', category: 'general', description: 'Site description' },
      { key: 'contact_email', value: 'contact@gawdesy.org', type: 'string', category: 'contact', description: 'Contact email' },
      { key: 'contact_phone', value: '+1-555-0100', type: 'string', category: 'contact', description: 'Contact phone' },
      { key: 'address', value: '123 Community Lane, Cityville, ST 12345', type: 'string', category: 'contact', description: 'Organization address' },
      { key: 'facebook_url', value: 'https://facebook.com/gawdesy', type: 'string', category: 'social', description: 'Facebook page URL' },
      { key: 'twitter_url', value: 'https://twitter.com/gawdesy', type: 'string', category: 'social', description: 'Twitter profile URL' },
      { key: 'linkedin_url', value: 'https://linkedin.com/company/gawdesy', type: 'string', category: 'social', description: 'LinkedIn profile URL' },
      { key: 'currency', value: 'USD', type: 'string', category: 'localization', description: 'Default currency' },
      { key: 'timezone', value: 'America/New_York', type: 'string', category: 'localization', description: 'Default timezone' }
    ];

    for (const setting of settings) {
      await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
    }
    console.log(`✅ Seeded ${settings.length} settings`);

    console.log('\n🎉 Sample data seeded successfully!');
  } catch (error) {
    console.error('Error seeding sample data:', error);
    throw error;
  }
};

seedSampleData()
  .then(() => {
    console.log('Seeding complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
