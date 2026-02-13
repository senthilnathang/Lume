// Prisma Seed Script
// Run with: npm run db:seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gawdesy.org' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@gawdesy.org',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create sample organization
  const org = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Gandhian Welfare and Development Society',
      description: 'Empowering underprivileged communities through education, health, and socio-economic development programs.',
      address: '123, Main Road, City - 123456',
      phone: '+91 9876543210',
      email: 'contact@gawdesy.org',
      website: 'https://gawdesy.org',
      isActive: true,
    },
  });
  console.log('✅ Organization created:', org.name);

  // Create sample team members
  const teamMembers = [
    {
      name: 'Dr. John Smith',
      position: 'Chairman',
      bio: 'Visionary leader with 20+ years of experience in social work.',
      email: 'chairman@gawdesy.org',
    },
    {
      name: 'Jane Doe',
      position: 'Secretary',
      bio: 'Dedicated to community development and empowerment.',
      email: 'secretary@gawdesy.org',
    },
    {
      name: 'Robert Johnson',
      position: 'Treasurer',
      bio: 'Financial expert ensuring transparent fund management.',
      email: 'treasurer@gawdesy.org',
    },
  ];

  for (const member of teamMembers) {
    await prisma.teamMember.upsert({
      where: { id: teamMembers.indexOf(member) + 1 },
      update: {},
      create: {
        ...member,
        organizationId: org.id,
        isActive: true,
        order: teamMembers.indexOf(member),
      },
    });
  }
  console.log('✅ Team members created');

  // Create sample programmes
  const programmes = [
    {
      title: 'Education for All',
      slug: 'education-for-all',
      shortDescription: 'Providing quality education to underprivileged children.',
      description: 'Our flagship education program aims to provide quality education to children from economically weaker sections of society.',
      category: 'Education',
      status: 'ACTIVE',
      targetAmount: 500000,
      beneficiaryCount: 500,
      isFeatured: true,
    },
    {
      title: 'Healthcare Initiative',
      slug: 'healthcare-initiative',
      shortDescription: 'Free medical camps and healthcare awareness programs.',
      description: 'Organizing health camps and providing free medical checkups in rural areas.',
      category: 'Healthcare',
      status: 'ACTIVE',
      targetAmount: 300000,
      beneficiaryCount: 1000,
      isFeatured: true,
    },
    {
      title: 'Women Empowerment',
      slug: 'women-empowerment',
      shortDescription: 'Skill development and self-help groups for women.',
      description: 'Empowering women through vocational training and self-help groups.',
      category: 'Women Empowerment',
      status: 'ACTIVE',
      targetAmount: 200000,
      beneficiaryCount: 300,
      isFeatured: false,
    },
  ];

  for (const prog of programmes) {
    await prisma.programme.upsert({
      where: { slug: prog.slug },
      update: {},
      create: prog,
    });
  }
  console.log('✅ Programmes created');

  // Create sample activities
  const activities = [
    {
      title: 'Free Health Camp',
      slug: 'free-health-camp',
      description: 'A free health camp offering basic medical checkups.',
      location: 'Community Hall, Main Market',
      status: 'PUBLISHED',
      beneficiaryCount: 150,
    },
    {
      title: 'School Supplies Distribution',
      slug: 'school-supplies-distribution',
      description: 'Distributing books, uniforms, and bags to students.',
      location: 'Government School, Village',
      status: 'PUBLISHED',
      beneficiaryCount: 200,
    },
  ];

  for (const activity of activities) {
    await prisma.activity.upsert({
      where: { slug: activity.slug },
      update: {},
      create: activity,
    });
  }
  console.log('✅ Activities created');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
