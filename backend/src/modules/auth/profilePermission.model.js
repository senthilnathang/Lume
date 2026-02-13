import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const ProfilePermission = sequelize.define('ProfilePermission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    profile_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    object: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    permission: {
        type: DataTypes.ENUM('read', 'write', 'create', 'delete', 'admin'),
        allowNull: false
    },
    restrict_domain: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'profile_permissions',
    timestamps: true,
    underscored: true
});

export default ProfilePermission;
