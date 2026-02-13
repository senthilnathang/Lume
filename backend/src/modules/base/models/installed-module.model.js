/**
 * InstalledModule Model
 * Tracks the state of all installed modules in the system
 */

import { DataTypes } from 'sequelize';
import { BaseModel, CrudMixin, SequenceMixin } from './base.model.js';

export default (sequelize, securityService) => {
  const attributes = {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        is: /^[a-z][a-z0-9_]*$/i
      }
    },
    displayName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'display_name'
    },
    version: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '1.0.0'
    },
    state: {
      type: DataTypes.ENUM('uninstalled', 'installed', 'to_upgrade', 'to_remove', 'error'),
      defaultValue: 'uninstalled',
      allowNull: false
    },
    depends: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: false
    },
    manifestCache: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'manifest_cache'
    },
    modulePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'module_path'
    },
    installedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'installed_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at'
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  };
  
  const options = {
    tableName: 'installed_modules',
    timestamps: true,
    underscored: true,
    paranoid: false, // Don't soft delete modules
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['state']
      },
      {
        fields: ['sequence']
      }
    ]
  };
  
  const baseModel = new BaseModel(sequelize, 'InstalledModule', attributes, options);
  
  // Apply mixins
  baseModel
    .use(CrudMixin({ securityService }))
    .use(SequenceMixin('sequence'));
  
  const model = baseModel.getModel();
  
  // Class methods using model directly
  model.findByName = async (name) => {
    return model.findOne({ where: { name } });
  };
  
  model.findInstalled = async () => {
    return model.findAll({
      where: { state: 'installed' },
      order: [['sequence', 'ASC']]
    });
  };
  
  return { model, baseModel };
};
