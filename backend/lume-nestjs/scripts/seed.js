import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  try {
    // 1. Create roles if they don't exist
    console.log('Seeding roles...');
    const roles = [
      { name: 'admin', display_name: 'Administrator', description: 'Full system access' },
      { name: 'super_admin', display_name: 'Super Administrator', description: 'Super admin access' },
      { name: 'user', display_name: 'User', description: 'Regular user' },
    ];

    for (const role of roles) {
      const existingRole = await prisma.Role.findUnique({
        where: { name: role.name },
      });

      if (!existingRole) {
        await prisma.Role.create({
          data: {
            name: role.name,
            display_name: role.display_name,
            description: role.description,
            isActive: true,
          },
        });
        console.log(`✓ Created role: ${role.name}`);
      } else {
        console.log(`✓ Role already exists: ${role.name}`);
      }
    }

    // 2. Create permissions if they don't exist
    console.log('\nSeeding permissions...');
    const permissions = [
      // Users module
      { name: 'users.read', display_name: 'View Users', category: 'user', description: 'View users' },
      { name: 'users.write', display_name: 'Edit Users', category: 'user', description: 'Edit users' },
      { name: 'users.delete', display_name: 'Delete Users', category: 'user', description: 'Delete users' },

      // Activities module
      { name: 'activities.read', display_name: 'View Activities', category: 'activities', description: 'View activities' },
      { name: 'activities.write', display_name: 'Edit Activities', category: 'activities', description: 'Edit activities' },
      { name: 'activities.delete', display_name: 'Delete Activities', category: 'activities', description: 'Delete activities' },

      // Settings module
      { name: 'settings.read', display_name: 'View Settings', category: 'settings', description: 'View settings' },
      { name: 'settings.write', display_name: 'Edit Settings', category: 'settings', description: 'Edit settings' },

      // General permissions
      { name: 'dashboard.read', display_name: 'View Dashboard', category: 'general', description: 'View dashboard' },
      { name: 'audit.read', display_name: 'View Audit Logs', category: 'general', description: 'View audit logs' },
    ];

    for (const permission of permissions) {
      const existingPerm = await prisma.Permission.findUnique({
        where: { name: permission.name },
      });

      if (!existingPerm) {
        await prisma.Permission.create({
          data: {
            name: permission.name,
            display_name: permission.display_name,
            description: permission.description,
            category: permission.category,
            isActive: true,
          },
        });
        console.log(`✓ Created permission: ${permission.name}`);
      } else {
        console.log(`✓ Permission already exists: ${permission.name}`);
      }
    }

    // 3. Assign all permissions to admin role
    console.log('\nAssigning permissions to admin role...');
    const adminRole = await prisma.Role.findUnique({
      where: { name: 'admin' },
    });

    const allPermissions = await prisma.Permission.findMany();
    for (const permission of allPermissions) {
      const existing = await prisma.RolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
      });

      if (!existing) {
        await prisma.RolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }
    console.log(`✓ Assigned all ${allPermissions.length} permissions to admin role`);

    // 4. Create or update admin user
    console.log('\nSeeding admin user...');
    const adminUser = await prisma.User.findUnique({
      where: { email: 'admin@lume.dev' },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.User.create({
        data: {
          email: 'admin@lume.dev',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          role_id: adminRole.id,
          isActive: true,
          is_email_verified: true,
        },
      });
      console.log('✓ Created admin user: admin@lume.dev / admin123');
    } else {
      console.log('✓ Admin user already exists: admin@lume.dev');
    }

    // 5. Create default settings
    console.log('\nSeeding default settings...');
    const defaultSettings = [
      { key: 'app_name', value: 'Lume Framework', category: 'general' },
      { key: 'app_version', value: '2.0.0', category: 'general' },
      { key: 'support_email', value: 'support@lume.dev', category: 'contact' },
    ];

    for (const setting of defaultSettings) {
      const existing = await prisma.Setting.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        await prisma.Setting.create({
          data: {
            key: setting.key,
            value: setting.value,
            category: setting.category,
          },
        });
        console.log(`✓ Created setting: ${setting.key}`);
      } else {
        console.log(`✓ Setting already exists: ${setting.key}`);
      }
    }

    console.log('\n✓ Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
