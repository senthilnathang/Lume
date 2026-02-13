import User from '../../modules/user/user.model.js';
import Role from '../../modules/auth/role.model.js';
import Permission from '../../modules/auth/permission.model.js';
import RolePermission from '../../modules/auth/rolePermission.model.js';
import Activity from '../../modules/activities/activity.model.js';
import Donation from '../../modules/donations/donation.model.js';
import Donor from '../../modules/donations/donor.model.js';
import Campaign from '../../modules/donations/campaign.model.js';
import Document from '../../modules/documents/document.model.js';
import TeamMember from '../../modules/team/teamMember.model.js';
import Message from '../../modules/messages/message.model.js';
import Setting from '../../modules/settings/setting.model.js';
import MediaLibrary from '../../modules/media/media.model.js';
// AuditLog is handled by the Base module to avoid model conflicts

export const setupModels = (sequelize) => {
  const UserModel = User(sequelize);
  const RoleModel = Role(sequelize);
  const PermissionModel = Permission(sequelize);
  const RolePermissionModel = RolePermission(sequelize);
  const ActivityModel = Activity(sequelize);
  const DonationModel = Donation(sequelize);
  const DonorModel = Donor(sequelize);
  const CampaignModel = Campaign(sequelize);
  const DocumentModel = Document(sequelize);
  const TeamMemberModel = TeamMember(sequelize);
  const MessageModel = Message(sequelize);
  const SettingModel = Setting(sequelize);
  const MediaLibraryModel = MediaLibrary(sequelize);

  RolePermissionModel.belongsTo(RoleModel, { foreignKey: 'role_id' });
  RolePermissionModel.belongsTo(PermissionModel, { foreignKey: 'permission_id' });
  RoleModel.hasMany(RolePermissionModel, { foreignKey: 'role_id' });
  PermissionModel.hasMany(RolePermissionModel, { foreignKey: 'permission_id' });

  UserModel.belongsTo(RoleModel, { foreignKey: 'role_id' });
  RoleModel.hasMany(UserModel, { foreignKey: 'role_id' });

  DonationModel.belongsTo(DonorModel, { foreignKey: 'donor_id' });
  DonorModel.hasMany(DonationModel, { foreignKey: 'donor_id' });

  DonationModel.belongsTo(CampaignModel, { foreignKey: 'campaign_id' });
  CampaignModel.hasMany(DonationModel, { foreignKey: 'campaign_id' });

  ActivityModel.belongsTo(UserModel, { foreignKey: 'created_by', as: 'creator' });
  UserModel.hasMany(ActivityModel, { foreignKey: 'created_by', as: 'activities' });

  DocumentModel.belongsTo(UserModel, { foreignKey: 'uploaded_by' });
  UserModel.hasMany(DocumentModel, { foreignKey: 'uploaded_by' });

  return sequelize.models;
};
