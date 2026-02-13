#!/usr/bin/env node
/**
 * Lume Database Initialization Script
 * Creates all tables and seeds initial data
 */

import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase, closeDatabase } from '../database/config.js';
import { setupModels } from '../database/models/index.js';

const seed = process.argv.includes('--seed');
const force = process.argv.includes('--force');

async function initDb() {
  console.log('🚀 Lume Database Initialization');
  console.log(`   Database: ${process.env.DB_NAME} (${process.env.DB_TYPE})`);
  console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  if (force) console.log('   ⚠️  FORCE mode: dropping existing tables');
  console.log('');

  try {
    const sequelize = await initializeDatabase(true);
    console.log('✅ Database connected');

    // Setup all models and associations
    const models = setupModels(sequelize);
    console.log('✅ Models registered');

    // Sync database
    await sequelize.sync({ force, alter: !force });
    console.log('✅ Database schema synchronized');

    if (seed) {
      console.log('\n🌱 Seeding initial data...');

      // Create default roles
      const { Role, Permission, RolePermission, User, Setting } = sequelize.models;

      const adminRole = await Role.findOrCreate({
        where: { name: 'admin' },
        defaults: { name: 'admin', display_name: 'Administrator', description: 'System Administrator', is_active: true, is_system: true }
      });

      const userRole = await Role.findOrCreate({
        where: { name: 'user' },
        defaults: { name: 'user', display_name: 'User', description: 'Standard User', is_active: true }
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
        await Permission.findOrCreate({
          where: { name: perm.name },
          defaults: perm
        });
      }
      console.log('   ✅ Permissions created');

      // Create admin user (password is auto-hashed by model beforeCreate hook)
      const [admin, created] = await User.findOrCreate({
        where: { email: 'admin@lume.dev' },
        defaults: {
          email: 'admin@lume.dev',
          password: 'Admin@123',
          first_name: 'System',
          last_name: 'Admin',
          role_id: adminRole[0].id,
          is_active: true
        }
      });

      if (created) {
        console.log('   ✅ Admin user created (admin@lume.dev / Admin@123)');
      } else {
        console.log('   ℹ️  Admin user already exists');
      }

      // Create default settings
      const defaultSettings = [
        { key: 'app_name', value: 'Lume', type: 'string', category: 'general' },
        { key: 'app_email', value: 'support@lume.dev', type: 'string', category: 'general' },
        { key: 'timezone', value: 'UTC', type: 'string', category: 'general' },
        { key: 'date_format', value: 'YYYY-MM-DD', type: 'string', category: 'general' },
        { key: 'max_upload_size', value: '10485760', type: 'number', category: 'uploads' },
      ];

      for (const setting of defaultSettings) {
        await Setting.findOrCreate({
          where: { key: setting.key },
          defaults: setting
        });
      }
      console.log('   ✅ Default settings created');
    }

    // Print summary
    const tableCount = Object.keys(sequelize.models).length;
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║     Lume Database Initialized            ║`);
    console.log(`╠══════════════════════════════════════════╣`);
    console.log(`║  Tables: ${String(tableCount).padEnd(31)}║`);
    console.log(`║  Seeded: ${seed ? 'Yes' : 'No '}${' '.repeat(28)}║`);
    console.log(`╚══════════════════════════════════════════╝`);

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    if (error.original) {
      console.error('   Cause:', error.original.message);
    }
    await closeDatabase().catch(() => {});
    process.exit(1);
  }
}

initDb();
