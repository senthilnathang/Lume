#!/usr/bin/env node
/**
 * Lume Reset Admin Password Script
 * Resets the admin user password
 *
 * Usage:
 *   node src/scripts/resetAdminPassword.js [newPassword]
 *   Default password: Admin@123
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../core/db/prisma.js';

const resetAdminPassword = async (newPassword = 'Admin@123') => {
  try {
    await prisma.$connect();

    const admin = await prisma.user.findFirst({ where: { email: 'admin@lume.dev' } });

    if (!admin) {
      console.log('Admin user not found (admin@lume.dev). Checking admin@gawdesy.org...');
      const altAdmin = await prisma.user.findFirst({ where: { email: 'admin@gawdesy.org' } });

      if (!altAdmin) {
        console.log('No admin user found. Creating new admin...');
        // Find admin role
        let adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
        if (!adminRole) {
          adminRole = await prisma.role.create({
            data: {
              name: 'admin',
              display_name: 'Administrator',
              description: 'System Administrator',
              isActive: true,
              is_system: true,
              createdAt: new Date(),
            },
          });
        }

        // Create admin user (password auto-hashed by Prisma middleware on create)
        await prisma.user.create({
          data: {
            email: 'admin@lume.dev',
            password: newPassword,
            firstName: 'System',
            lastName: 'Admin',
            role_id: adminRole.id,
            isActive: true,
            createdAt: new Date(),
          },
        });
        console.log('Admin user created with password:', newPassword);
      } else {
        // Prisma middleware auto-hashes password on update
        await prisma.user.update({
          where: { id: altAdmin.id },
          data: { password: newPassword },
        });
        console.log('Admin password reset to:', newPassword);
      }
    } else {
      // Prisma middleware auto-hashes password on update
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: newPassword },
      });
      console.log('Admin password reset to:', newPassword);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
};

const args = process.argv.slice(2);
const newPassword = args[0] || 'Admin@123';
resetAdminPassword(newPassword);
