import { DataTypes } from 'sequelize';

export const MediaLibrary = (sequelize) => {
  const MediaLibrary = sequelize.define('MediaLibrary', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'original_name'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('image', 'video', 'document', 'audio', 'other'),
      defaultValue: 'document'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'thumbnail_url'
    },
    alt_text: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'alt_text'
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'uploaded_by'
    },
    downloads: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_public'
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
    tableName: 'media_library',
    indexes: [
      { fields: ['type'] },
      { fields: ['category'] },
      { fields: ['uploaded_by'] },
      { fields: ['is_public'] },
      { fields: ['is_featured'] }
    ]
  });

  return MediaLibrary;
};

export default MediaLibrary;
