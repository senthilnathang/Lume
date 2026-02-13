import { getDatabase, initializeDatabase } from '../config.js';
import { setupModels } from '../database/models/index.js';
import bcrypt from 'bcryptjs';

const createAdminUser = async () => {
  try {
    const sequelize = await initializeDatabase();
    setupModels(sequelize);
    const db = getDatabase();
    const User = db.models.User;
    const Role = db.models.Role;

    // Find super_admin role or create it
    let superAdminRole = await Role.findOne({ where: { name: 'super_admin' } });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: 'super_admin',
        display_name: 'Super Admin',
        description: 'Full system access'
      });
      console.log('Created super_admin role');
    }

    // Check if admin user exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@gawdesy.org' } });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      // Update password anyway
      existingAdmin.password = await bcrypt.hash('admin123', 12);
      existingAdmin.role_id = superAdminRole.id;
      await existingAdmin.save();
      console.log('Admin password updated');
      return existingAdmin;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      email: 'admin@gawdesy.org',
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role_id: superAdminRole.id,
      is_email_verified: true,
      is_active: true
    });

    console.log('Admin user created successfully:', admin.email);
    return admin;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

createAdminUser()
  .then(() => {
    console.log('Admin user setup complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  });
