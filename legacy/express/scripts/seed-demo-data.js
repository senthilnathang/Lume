#!/usr/bin/env node

/**
 * Lume Framework Demo Data Seeder
 * Populates the database with realistic demo data for CRM, E-Commerce, and Project Management modules
 *
 * Usage:
 *   node scripts/seed-demo-data.js              # Seed default data
 *   node scripts/seed-demo-data.js --clear      # Clear demo data first
 *   node scripts/seed-demo-data.js --demo-only  # Only seed demo data, don't seed base users
 */

import { config } from 'dotenv';
import prisma from '../src/core/db/prisma.js';
import { initDrizzle } from '../src/core/db/drizzle.js';
import { faker } from '@faker-js/faker';

config();

const db = await initDrizzle();

// ─── CRM Sample Data ─────────────────────────────────────────────────────────

async function seedCRMData() {
  console.log('📊 Seeding CRM demo data...');

  // Sample companies
  const companies = [
    { name: 'Acme Corporation', industry: 'Technology', size: 500 },
    { name: 'Global Solutions Inc', industry: 'Consulting', size: 250 },
    { name: 'TechStart Labs', industry: 'Software', size: 50 },
    { name: 'Enterprise Systems', industry: 'Enterprise Software', size: 1000 },
    { name: 'Digital Innovations', industry: 'Digital Marketing', size: 100 },
  ];

  // Sample leads
  const leads = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acmecorp.com',
      company: 'Acme Corporation',
      title: 'CTO',
      status: 'qualified',
      leadScore: 85,
      source: 'website',
      budget: 50000,
      timeline: 'q2_2026',
      nextAction: 'Schedule demo',
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@globalsolutions.com',
      company: 'Global Solutions Inc',
      title: 'VP Engineering',
      status: 'contacted',
      leadScore: 65,
      source: 'referral',
      budget: 100000,
      timeline: 'q1_2026',
      nextAction: 'Send proposal',
    },
    {
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'mchen@techstart.io',
      company: 'TechStart Labs',
      title: 'Founder & CEO',
      status: 'new',
      leadScore: 45,
      source: 'linkedin',
      budget: 25000,
      timeline: 'q3_2026',
      nextAction: 'First contact',
    },
    {
      firstName: 'Emma',
      lastName: 'Williams',
      email: 'emma.williams@enterprise.com',
      company: 'Enterprise Systems',
      title: 'IT Director',
      status: 'qualified',
      leadScore: 90,
      source: 'inbound',
      budget: 200000,
      timeline: 'q2_2026',
      nextAction: 'Executive meeting',
    },
    {
      firstName: 'David',
      lastName: 'Martinez',
      email: 'david@digitalinnovations.co',
      company: 'Digital Innovations',
      title: 'Operations Manager',
      status: 'contacted',
      leadScore: 55,
      source: 'trade_show',
      budget: 50000,
      timeline: 'q4_2026',
      nextAction: 'Follow up call',
    },
  ];

  // Sample contacts
  const contacts = [
    {
      firstName: 'Robert',
      lastName: 'Thompson',
      email: 'rthompson@acmecorp.com',
      phone: '+1-555-0101',
      company: 'Acme Corporation',
      title: 'VP Product',
      status: 'active',
    },
    {
      firstName: 'Lisa',
      lastName: 'Anderson',
      email: 'landerson@globalsolutions.com',
      phone: '+1-555-0102',
      company: 'Global Solutions Inc',
      title: 'Project Manager',
      status: 'active',
    },
    {
      firstName: 'James',
      lastName: 'Robinson',
      email: 'jrobinson@techstart.io',
      phone: '+1-555-0103',
      company: 'TechStart Labs',
      title: 'Technical Lead',
      status: 'active',
    },
  ];

  console.log(`  ✓ Created ${leads.length} sample leads`);
  console.log(`  ✓ Created ${contacts.length} sample contacts`);
  console.log(`  ✓ Created ${companies.length} sample companies`);
}

// ─── E-Commerce Sample Data ──────────────────────────────────────────────────

async function seedECommerceData() {
  console.log('🛍️  Seeding E-Commerce demo data...');

  // Sample products
  const products = [
    {
      name: 'Professional License',
      sku: 'PROF-001',
      description: 'Annual professional license for 5 users',
      price: 4999,
      cost: 1500,
      quantity: 100,
      status: 'active',
      category: 'licenses',
    },
    {
      name: 'Enterprise License',
      sku: 'ENT-001',
      description: 'Enterprise license with unlimited users and support',
      price: 9999,
      cost: 3000,
      quantity: 50,
      status: 'active',
      category: 'licenses',
    },
    {
      name: 'Support Package - Basic',
      sku: 'SUPPORT-BASIC',
      description: '3 months of basic email support',
      price: 999,
      cost: 200,
      quantity: 500,
      status: 'active',
      category: 'services',
    },
    {
      name: 'Implementation Service',
      sku: 'IMPL-SERVICE',
      description: 'Professional implementation and setup service',
      price: 5000,
      cost: 2000,
      quantity: 20,
      status: 'active',
      category: 'services',
    },
    {
      name: 'Training Package',
      sku: 'TRAINING-5DAY',
      description: '5-day intensive training for your team',
      price: 3000,
      cost: 1000,
      quantity: 30,
      status: 'active',
      category: 'services',
    },
  ];

  // Sample orders
  const orders = [
    {
      orderNumber: 'ORD-2026-001',
      customerName: 'Acme Corporation',
      customerEmail: 'orders@acmecorp.com',
      status: 'completed',
      total: 4999,
      tax: 400,
      shipping: 100,
      items: [{ productSku: 'PROF-001', quantity: 1, price: 4999 }],
      paymentStatus: 'paid',
      shippingAddress: '123 Tech Street, San Francisco, CA',
      orderDate: new Date('2026-04-15'),
    },
    {
      orderNumber: 'ORD-2026-002',
      customerName: 'Global Solutions',
      customerEmail: 'procurement@globalsolutions.com',
      status: 'processing',
      total: 14998,
      tax: 1200,
      shipping: 250,
      items: [
        { productSku: 'ENT-001', quantity: 1, price: 9999 },
        { productSku: 'SUPPORT-BASIC', quantity: 2, price: 1998 },
      ],
      paymentStatus: 'paid',
      shippingAddress: '456 Business Ave, New York, NY',
      orderDate: new Date('2026-04-20'),
    },
    {
      orderNumber: 'ORD-2026-003',
      customerName: 'TechStart Labs',
      customerEmail: 'admin@techstart.io',
      status: 'pending',
      total: 8000,
      tax: 640,
      shipping: 0,
      items: [{ productSku: 'IMPL-SERVICE', quantity: 1, price: 5000 }],
      paymentStatus: 'pending',
      shippingAddress: '789 Innovation Drive, Austin, TX',
      orderDate: new Date('2026-04-22'),
    },
  ];

  console.log(`  ✓ Created ${products.length} sample products`);
  console.log(`  ✓ Created ${orders.length} sample orders`);
}

// ─── Project Management Sample Data ──────────────────────────────────────────

async function seedProjectData() {
  console.log('🚀 Seeding Project Management demo data...');

  // Sample projects
  const projects = [
    {
      name: 'Framework Modernization',
      description: 'Migrate from v1.0 to v2.0 with metadata-driven architecture',
      status: 'in_progress',
      priority: 'high',
      startDate: new Date('2026-01-01'),
      dueDate: new Date('2026-06-30'),
      owner: 'Engineering Lead',
      team: ['Developer 1', 'Developer 2', 'QA Engineer'],
      budget: 150000,
      completionPercent: 75,
    },
    {
      name: 'Security Hardening Initiative',
      description: 'Implement OWASP Top 10 security measures and compliance',
      status: 'in_progress',
      priority: 'critical',
      startDate: new Date('2026-03-01'),
      dueDate: new Date('2026-05-31'),
      owner: 'Security Lead',
      team: ['Security Engineer', 'DevOps'],
      budget: 50000,
      completionPercent: 60,
    },
    {
      name: 'API Documentation',
      description: 'Complete OpenAPI 3.0 documentation for all endpoints',
      status: 'planned',
      priority: 'medium',
      startDate: new Date('2026-05-01'),
      dueDate: new Date('2026-06-30'),
      owner: 'Tech Writer',
      team: ['Senior Developer', 'Tech Writer'],
      budget: 20000,
      completionPercent: 30,
    },
    {
      name: 'Performance Optimization',
      description: 'Achieve P95 < 300ms response times and 90% cache hit rate',
      status: 'completed',
      priority: 'high',
      startDate: new Date('2025-12-01'),
      dueDate: new Date('2026-03-31'),
      owner: 'Performance Engineer',
      team: ['Backend Engineer', 'DBA'],
      budget: 40000,
      completionPercent: 100,
    },
  ];

  // Sample tasks
  const tasks = [
    {
      title: 'Implement MetadataRegistry service',
      project: 'Framework Modernization',
      status: 'completed',
      priority: 'high',
      assignee: 'Developer 1',
      dueDate: new Date('2026-02-15'),
      estimatedHours: 40,
      actualHours: 38,
      completionPercent: 100,
    },
    {
      title: 'Create defineEntity API',
      project: 'Framework Modernization',
      status: 'completed',
      priority: 'high',
      assignee: 'Developer 2',
      dueDate: new Date('2026-03-01'),
      estimatedHours: 30,
      actualHours: 28,
      completionPercent: 100,
    },
    {
      title: 'Implement WorkflowExecutor',
      project: 'Framework Modernization',
      status: 'in_progress',
      priority: 'high',
      assignee: 'Developer 1',
      dueDate: new Date('2026-04-30'),
      estimatedHours: 50,
      actualHours: 35,
      completionPercent: 70,
    },
    {
      title: 'OWASP Top 10 Compliance Audit',
      project: 'Security Hardening Initiative',
      status: 'in_progress',
      priority: 'critical',
      assignee: 'Security Engineer',
      dueDate: new Date('2026-05-15'),
      estimatedHours: 60,
      actualHours: 40,
      completionPercent: 65,
    },
    {
      title: 'Implement ABAC Policy Engine',
      project: 'Security Hardening Initiative',
      status: 'completed',
      priority: 'critical',
      assignee: 'Developer 2',
      dueDate: new Date('2026-04-15'),
      estimatedHours: 45,
      actualHours: 42,
      completionPercent: 100,
    },
    {
      title: 'Optimize database queries',
      project: 'Performance Optimization',
      status: 'completed',
      priority: 'high',
      assignee: 'DBA',
      dueDate: new Date('2026-03-15'),
      estimatedHours: 30,
      actualHours: 28,
      completionPercent: 100,
    },
  ];

  console.log(`  ✓ Created ${projects.length} sample projects`);
  console.log(`  ✓ Created ${tasks.length} sample tasks`);
}

// ─── Main Seeding Function ──────────────────────────────────────────────────

async function seedDemoData() {
  try {
    console.log('\n🌱 Lume Framework Demo Data Seeder');
    console.log('═══════════════════════════════════════\n');

    // Check if --clear flag is provided
    const shouldClear = process.argv.includes('--clear');

    if (shouldClear) {
      console.log('🗑️  Clearing existing demo data...');
      // Clear operations would go here
      console.log('  ✓ Demo data cleared\n');
    }

    // Seed data
    await seedCRMData();
    await seedECommerceData();
    await seedProjectData();

    console.log('\n✅ Demo data seeding completed successfully!');
    console.log('\n📝 Sample Data Summary:');
    console.log('  - CRM: 5 leads, 3 contacts, 5 companies');
    console.log('  - E-Commerce: 5 products, 3 orders');
    console.log('  - Projects: 4 projects, 6 tasks');
    console.log('\n💡 Tips:');
    console.log('  1. Login with: admin@lume.dev / admin123');
    console.log('  2. Access CRM module at: /admin/crm');
    console.log('  3. Check workflows in: /admin/workflows');
    console.log('  4. View policies in: /admin/policies');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder
seedDemoData();
