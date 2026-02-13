import { DataTypes } from 'sequelize';
import { getDatabase } from '../config.js';

// Base model with common fields
const createBaseModel = (sequelize) => {
  return {
    // Common fields for all models
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who created this record'
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who last updated this record'
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User who deleted this record (for soft delete)'
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Soft delete flag'
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of soft delete'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Creation timestamp'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Last update timestamp'
    }
  };
};

// Timestamp hooks for auto-updating updated_at
const addTimestampHooks = (model) => {
  model.addHook('beforeUpdate', (instance, options) => {
    instance.updated_at = new Date();
  });
  
  model.addHook('beforeCreate', (instance, options) => {
    if (!instance.created_at) {
      instance.created_at = new Date();
    }
    instance.updated_at = new Date();
  });
};

// Soft delete functionality
const addSoftDelete = (model) => {
  model.addScope('active', {
    where: {
      is_deleted: false
    }
  });
  
  model.addScope('deleted', {
    where: {
      is_deleted: true
    }
  });
  
  model.prototype.restore = async function (transaction) {
    this.is_deleted = false;
    this.deleted_at = null;
    this.deleted_by = null;
    return this.save({ transaction });
  };
  
  model.prototype.softDelete = async function (userId, transaction) {
    this.is_deleted = true;
    this.deleted_at = new Date();
    this.deleted_by = userId;
    return this.save({ transaction });
  };
};

// Common model utilities
const modelUtilities = {
  // Find active records
  findActive: async function (options = {}) {
    return this.findAll({
      where: { is_deleted: false },
      ...options
    });
  },
  
  // Find by ID (active only)
  findByIdActive: async function (id, options = {}) {
    return this.findOne({
      where: { id, is_deleted: false },
      ...options
    });
  },
  
  // Find deleted records
  findDeleted: async function (options = {}) {
    return this.findAll({
      where: { is_deleted: true },
      ...options
    });
  },
  
  // Count active records
  countActive: async function (options = {}) {
    return this.count({
      where: { is_deleted: false },
      ...options
    });
  }
};

export {
  createBaseModel,
  addTimestampHooks,
  addSoftDelete,
  modelUtilities
};

export default {
  createBaseModel,
  addTimestampHooks,
  addSoftDelete,
  modelUtilities
};