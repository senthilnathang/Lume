import { DataTypes } from 'sequelize';

export const Activity = (sequelize) => {
  const Activity = sequelize.define('Activity', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
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
    short_description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'short_description'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'completed', 'cancelled'),
      defaultValue: 'draft'
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
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    cover_image: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'cover_image'
    },
    gallery: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    registered_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'registered_count'
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
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at'
    }
  }, {
    tableName: 'activities',
    indexes: [
      { fields: ['slug'] },
      { fields: ['status'] },
      { fields: ['category'] },
      { fields: ['start_date'] },
      { fields: ['is_featured'] }
    ],
    hooks: {
      beforeCreate: (activity) => {
        if (!activity.slug && activity.title) {
          activity.slug = activity.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
      }
    }
  });

  return Activity;
};

export default Activity;
