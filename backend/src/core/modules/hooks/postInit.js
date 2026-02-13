/**
 * Core Module Post-Initialization Hook
 */

const postInitCore = async (context) => {
  const { database } = context;
  
  console.log('🔧 Running Core Module post-initialization...');
  
  try {
    // Seed default roles if not exists
    const Role = database.models.Role;
    const roles = [
      { name: 'super_admin', display_name: 'Super Admin', description: 'Full system access', is_system: true },
      { name: 'admin', display_name: 'Administrator', description: 'Administrative access', is_system: true },
      { name: 'manager', display_name: 'Manager', description: 'Management access', is_system: true },
      { name: 'staff', display_name: 'Staff', description: 'Staff access', is_system: true },
      { name: 'user', display_name: 'User', description: 'Regular user', is_system: true },
      { name: 'guest', display_name: 'Guest', description: 'Guest access', is_system: true }
    ];
    
    for (const role of roles) {
      await Role.findOrCreate({
        where: { name: role.name },
        defaults: role
      });
    }
    
    console.log('✅ Default roles seeded');
    
    // Seed default permissions
    const Permission = database.models.Permission;
    const permissions = [
      // User management
      { name: 'user_management.read', display_name: 'View Users', category: 'user_management' },
      { name: 'user_management.write', display_name: 'Edit Users', category: 'user_management' },
      { name: 'user_management.delete', display_name: 'Delete Users', category: 'user_management' },
      { name: 'user_management.create', display_name: 'Create Users', category: 'user_management' },
      
      // Role management
      { name: 'role_management.read', display_name: 'View Roles', category: 'role_management' },
      { name: 'role_management.write', display_name: 'Edit Roles', category: 'role_management' },
      { name: 'role_management.delete', display_name: 'Delete Roles', category: 'role_management' },
      { name: 'role_management.create', display_name: 'Create Roles', category: 'role_management' },
      
      // Activities
      { name: 'activities.read', display_name: 'View Activities', category: 'activities' },
      { name: 'activities.write', display_name: 'Manage Activities', category: 'activities' },
      { name: 'activities.delete', display_name: 'Delete Activities', category: 'activities' },
      { name: 'activities.create', display_name: 'Create Activities', category: 'activities' },
      
      // Donations
      { name: 'donations.read', display_name: 'View Donations', category: 'donations' },
      { name: 'donations.write', display_name: 'Manage Donations', category: 'donations' },
      { name: 'donations.delete', display_name: 'Delete Donations', category: 'donations' },
      { name: 'donations.create', display_name: 'Create Donations', category: 'donations' },
      
      // Documents
      { name: 'documents.read', display_name: 'View Documents', category: 'documents' },
      { name: 'documents.write', display_name: 'Manage Documents', category: 'documents' },
      { name: 'documents.delete', display_name: 'Delete Documents', category: 'documents' },
      { name: 'documents.create', display_name: 'Upload Documents', category: 'documents' },
      
      // Team
      { name: 'team.read', display_name: 'View Team', category: 'team' },
      { name: 'team.write', display_name: 'Manage Team', category: 'team' },
      { name: 'team.delete', display_name: 'Delete Team Members', category: 'team' },
      { name: 'team.create', display_name: 'Add Team Members', category: 'team' },
      
      // Messages
      { name: 'messages.read', display_name: 'View Messages', category: 'messages' },
      { name: 'messages.write', display_name: 'Manage Messages', category: 'messages' },
      { name: 'messages.delete', display_name: 'Delete Messages', category: 'messages' },
      
      // Settings
      { name: 'settings.read', display_name: 'View Settings', category: 'settings' },
      { name: 'settings.write', display_name: 'Manage Settings', category: 'settings' },
      
      // Audit
      { name: 'audit.read', display_name: 'View Audit Logs', category: 'audit' },
      { name: 'audit.delete', display_name: 'Delete Audit Logs', category: 'audit' }
    ];
    
    for (const perm of permissions) {
      await Permission.findOrCreate({
        where: { name: perm.name },
        defaults: perm
      });
    }
    
    console.log('✅ Default permissions seeded');
    
    // Seed default settings
    const Setting = database.models.Setting;
    const settings = [
      { key: 'site_name', value: 'Gawdesy Foundation', type: 'string', category: 'general', description: 'Site name' },
      { key: 'site_description', value: 'Empowering communities', type: 'string', category: 'general', description: 'Site description' },
      { key: 'contact_email', value: 'contact@gawdesy.org', type: 'string', category: 'contact', description: 'Contact email' },
      { key: 'currency', value: 'USD', type: 'string', category: 'localization', description: 'Default currency' },
      { key: 'timezone', value: 'UTC', type: 'string', category: 'localization', description: 'Default timezone' }
    ];
    
    for (const setting of settings) {
      await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
    }
    
    console.log('✅ Default settings seeded');
    
    return true;
  } catch (error) {
    console.error('❌ Error in Core post-init:', error.message);
    throw error;
  }
};

export { postInitCore };
export default postInitCore;
