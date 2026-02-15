#!/usr/bin/env node
/**
 * Lume Create Admin User Script
 * Creates or updates the admin user with super_admin role
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../core/db/prisma.js';

const createAdminUser = async () => {
  try {
    await prisma.$connect();

    // Find super_admin role or create it
    let superAdminRole = await prisma.role.findFirst({ where: { name: 'super_admin' } });
    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: 'super_admin',
          display_name: 'Super Admin',
          description: 'Full system access',
          isActive: true,
          is_system: true,
          createdAt: new Date(),
        },
      });
      console.log('Created super_admin role');
    }

    // Check if admin user exists
    const existingAdmin = await prisma.user.findFirst({ where: { email: 'admin@gawdesy.org' } });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      // Update password and role (Prisma middleware hashes password on update)
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          password: 'admin123',
          role_id: superAdminRole.id,
        },
      });
      console.log('Admin password updated');
      return;
    }

    // Create admin user (password is auto-hashed by Prisma middleware)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@gawdesy.org',
        password: 'admin123',
        firstName: 'Super',
        lastName: 'Admin',
        role_id: superAdminRole.id,
        is_email_verified: true,
        isActive: true,
        createdAt: new Date(),
      },
    });

    console.log('Admin user created successfully:', admin.email);
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

createAdminUser()
  .then(async () => {
    console.log('Admin user setup complete.');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to create admin user:', error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
