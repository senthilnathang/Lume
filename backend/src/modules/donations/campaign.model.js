import { DataTypes } from 'sequelize';

export const Campaign = (sequelize) => {
  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    goal_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'goal_amount'
    },
    raised_amount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: 'raised_amount'
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'start_date'
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date'
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
      defaultValue: 'draft'
    },
    cover_image: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'cover_image'
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'campaigns',
    indexes: [
      { fields: ['slug'] },
      { fields: ['status'] }
    ]
  });

  return Campaign;
};

export default Campaign;
