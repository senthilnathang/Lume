import { DataTypes } from 'sequelize';

export const TeamMember = (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    photo: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    is_leader: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_leader'
    },
    social_links: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'team_members',
    indexes: [
      { fields: ['email'] },
      { fields: ['department'] },
      { fields: ['is_active'] },
      { fields: ['order'] }
    ]
  });

  TeamMember.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`;
  };

  return TeamMember;
};

export default TeamMember;
