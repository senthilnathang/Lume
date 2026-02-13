import { initializeDatabase, getDatabase } from '../config.js';
import { setupModels } from '../database/models/index.js';
import bcrypt from 'bcryptjs';

const resetAdminPassword = async (newPassword = 'Admin@123') => {
  try {
    const sequelize = await initializeDatabase();
    setupModels(sequelize);
    const db = getDatabase();
    const User = db.models.User;

    const admin = await User.findOne({ where: { email: 'admin@gawdesy.org' } });
    
    if (!admin) {
      console.log('Admin user not found. Creating new admin...');
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await User.create({
        username: 'admin',
        email: 'admin@gawdesy.org',
        password: hashedPassword,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'admin',
        is_active: true
      });
      console.log('Admin user created with password:', newPassword);
    } else {
      admin.password = newPassword;
      await admin.save();
      console.log('Admin password reset to:', newPassword);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error);
    process.exit(1);
  }
};

const args = process.argv.slice(2);
const newPassword = args[0] || 'Admin@123';
resetAdminPassword(newPassword);
