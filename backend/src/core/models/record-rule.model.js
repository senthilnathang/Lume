import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const RecordRule = sequelize.define('RecordRule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    model_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        index: true
    },
    domain: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    scope: {
        type: DataTypes.ENUM('all', 'user', 'role', 'company'),
        defaultValue: 'user'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    apply_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    apply_write: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    company_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'record_rules',
    timestamps: true,
    underscored: true
});

export { RecordRule };
