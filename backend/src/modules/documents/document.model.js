import { DataTypes } from 'sequelize';

export const Document = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'uploaded_by'
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_public'
    },
    downloads: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'documents',
    indexes: [
      { fields: ['type'] },
      { fields: ['category'] },
      { fields: ['uploaded_by'] },
      { fields: ['is_public'] }
    ]
  });

  return Document;
};

export default Document;
