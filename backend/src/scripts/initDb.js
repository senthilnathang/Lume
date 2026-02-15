#!/usr/bin/env node
/**
 * Lume Database Initialization Script
 * Seeds initial data using Prisma
 *
 * Usage:
 *   node src/scripts/initDb.js --seed          # Seed initial data
 *   node src/scripts/initDb.js --force --seed  # Reset schema (via prisma db push) + seed
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../core/db/prisma.js';

const seed = process.argv.includes('--seed');
const force = process.argv.includes('--force');

async function initDb() {
  console.log('🚀 Lume Database Initialization');
  console.log(`   Database: ${process.env.DB_NAME || 'lume'}`);
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
  if (force) {
    console.log('   ⚠️  FORCE mode: schema management is handled by `npx prisma db push --force-reset`');
    console.log('   Run `npx prisma db push --force-reset` separately to reset the schema.');
  }
  console.log('');

  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    if (seed) {
      console.log('\n🌱 Seeding initial data...');

      // Create default roles
      const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        create: {
          name: 'admin',
          display_name: 'Administrator',
          description: 'System Administrator',
          isActive: true,
          is_system: true,
          createdAt: new Date(),
        },
        update: {},
      });

      await prisma.role.upsert({
        where: { name: 'user' },
        create: {
          name: 'user',
          display_name: 'User',
          description: 'Standard User',
          isActive: true,
          is_system: false,
          createdAt: new Date(),
        },
        update: {},
      });

      console.log('   ✅ Roles created');

      // Create default permissions
      const defaultPermissions = [
        { name: 'users.read', display_name: 'View Users', description: 'View users', category: 'user' },
        { name: 'users.write', display_name: 'Edit Users', description: 'Edit users', category: 'user' },
        { name: 'users.delete', display_name: 'Delete Users', description: 'Delete users', category: 'user' },
        { name: 'activities.read', display_name: 'View Activities', description: 'View activities', category: 'activities' },
        { name: 'activities.write', display_name: 'Edit Activities', description: 'Edit activities', category: 'activities' },
        { name: 'donations.read', display_name: 'View Donations', description: 'View donations', category: 'donations' },
        { name: 'donations.write', display_name: 'Edit Donations', description: 'Edit donations', category: 'donations' },
        { name: 'documents.read', display_name: 'View Documents', description: 'View documents', category: 'documents' },
        { name: 'documents.write', display_name: 'Upload Documents', description: 'Upload documents', category: 'documents' },
        { name: 'settings.read', display_name: 'View Settings', description: 'View settings', category: 'settings' },
        { name: 'settings.write', display_name: 'Edit Settings', description: 'Edit settings', category: 'settings' },
        { name: 'audit.read', display_name: 'View Audit Logs', description: 'View audit logs', category: 'audit' },
      ];

      for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
          where: { name: perm.name },
          create: {
            ...perm,
            isActive: true,
            createdAt: new Date(),
          },
          update: {},
        });
      }
      console.log('   ✅ Permissions created');

      // Create admin user (password is auto-hashed by Prisma middleware)
      const admin = await prisma.user.upsert({
        where: { email: 'admin@lume.dev' },
        create: {
          email: 'admin@lume.dev',
          password: 'Admin@123',
          firstName: 'System',
          lastName: 'Admin',
          role_id: adminRole.id,
          isActive: true,
          createdAt: new Date(),
        },
        update: {},
      });

      if (admin) {
        console.log('   ✅ Admin user created (admin@lume.dev / Admin@123)');
      }

      // Create default settings
      const defaultSettings = [
        { key: 'app_name', value: 'Lume', type: 'string', category: 'general', description: 'Application name' },
        { key: 'app_email', value: 'support@lume.dev', type: 'string', category: 'general', description: 'Support email' },
        { key: 'timezone', value: 'UTC', type: 'string', category: 'general', description: 'Default timezone' },
        { key: 'date_format', value: 'YYYY-MM-DD', type: 'string', category: 'general', description: 'Date format' },
        { key: 'max_upload_size', value: '10485760', type: 'number', category: 'uploads', description: 'Max upload size in bytes' },
      ];

      for (const setting of defaultSettings) {
        await prisma.setting.upsert({
          where: { key: setting.key },
          create: {
            ...setting,
            isPublic: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
          update: {},
        });
      }
      console.log('   ✅ Default settings created');
    }

    // Print summary
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║     Lume Database Initialized            ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Seeded: ${seed ? 'Yes' : 'No '}${' '.repeat(28)}║`);
    console.log(`╚══════════════════════════════════════════╝`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    if (error.meta) {
      console.error('   Meta:', JSON.stringify(error.meta));
    }
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

initDb();
