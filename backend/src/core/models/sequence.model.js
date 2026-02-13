import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const Sequence = sequelize.define('Sequence', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    prefix: {
        type: DataTypes.STRING(50),
        defaultValue: ''
    },
    suffix: {
        type: DataTypes.STRING(50),
        defaultValue: ''
    },
    padding: {
        type: DataTypes.INTEGER,
        defaultValue: 4
    },
    sequence_next: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    step: {
        type: DataTypes.INTEGER,
        defaultValue: 1
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
    tableName: 'sequences',
    timestamps: true,
    underscored: true
});

export { Sequence };
