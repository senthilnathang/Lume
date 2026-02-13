import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Profile = sequelize.define('Profile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(255)
    },
    profile_type: {
        type: DataTypes.ENUM('system', 'custom'),
        defaultValue: 'custom'
    },
    login_hours_start: {
        type: DataTypes.TIME
    },
    login_hours_end: {
        type: DataTypes.TIME
    },
    login_ip_ranges: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'profiles',
    timestamps: true,
    underscored: true
});

export default Profile;
