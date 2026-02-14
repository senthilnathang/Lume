/**
 * BaseModel - Abstract base class for all models
 * Provides ORM functionality, timestamps, soft delete, and mixin support
 */

import { DataTypes } from 'sequelize';

export class BaseModel {
  constructor(sequelize, modelName, attributes, options = {}) {
    this.sequelize = sequelize;
    this.modelName = modelName;
    this.attributes = { ...attributes };
    this.options = { ...options };
    this.mixins = [];
    this.hooks = {};
    
    // Add default timestamps
    this.attributes.createdAt = {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    };
    this.attributes.updatedAt = {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    };
    
    // Add soft delete if enabled (default true)
    if (options.softDelete !== false) {
      this.attributes.deletedAt = {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
      };
    }
    
    // Add created_by and updated_by if trackUsers is enabled
    if (options.trackUsers) {
      this.attributes.createdBy = {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by'
      };
      this.attributes.updatedBy = {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'updated_by'
      };
    }
    
    // Create Sequelize model
    this.model = sequelize.define(modelName, this.attributes, {
      ...options,
      tableName: options.tableName || this._snakeCase(modelName) + 's',
      timestamps: true,
      paranoid: options.softDelete !== false,
      underscored: true,
      freezeTableName: false
    });
    
    // Apply mixins
    this.applyMixins();
  }
  
  /**
   * Convert camelCase to snake_case
   */
  _snakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
  
  /**
   * Apply registered mixins to the model
   */
  applyMixins() {
    for (const mixin of this.mixins) {
      if (typeof mixin === 'function') {
        mixin(this.model, this);
      }
    }
  }
  
  /**
   * Register a mixin
   */
  use(mixin) {
    this.mixins.push(mixin);
    // Apply mixin immediately since constructor already ran applyMixins()
    if (typeof mixin === 'function') {
      mixin(this.model, this);
    }
    return this;
  }
  
  /**
   * Get the Sequelize model instance
   */
  getModel() {
    return this.model;
  }
  
  /**
   * Associate with other models
   */
  associate(models) {
    // Override in subclasses
  }
}

/**
 * CRUD Mixin - Adds CRUD operations with record rules
 */
export const CrudMixin = (options = {}) => {
  return (model, baseModel) => {
    const securityService = options.securityService;
    
    // Create with record rules check
    model.createRecord = async (data, context = {}) => {
      // Check create permission
      if (securityService) {
        const canCreate = await securityService.checkPermission(
          context.userId,
          `${model.name.toLowerCase()}.create`
        );
        if (!canCreate) {
          throw new Error(`Permission denied: ${model.name}.create`);
        }
        
        // Check record rules
        await securityService.checkRecordRules(model.name, 'create', data, context);
      }
      
      // Add user tracking
      if (baseModel.options.trackUsers && context.userId) {
        data.createdBy = context.userId;
        data.updatedBy = context.userId;
      }
      
      return model.create(data);
    };
    
    // Read with record rules
    model.readRecord = async (id, context = {}) => {
      const record = await model.findByPk(id);
      
      if (record && securityService) {
        await securityService.checkRecordRules(model.name, 'read', record, context);
      }
      
      return record;
    };
    
    // Update with record rules
    model.updateRecord = async (id, data, context = {}) => {
      const record = await model.findByPk(id);
      
      if (!record) {
        throw new Error(`${model.name} not found`);
      }
      
      if (securityService) {
        const canWrite = await securityService.checkPermission(
          context.userId,
          `${model.name.toLowerCase()}.write`
        );
        if (!canWrite) {
          throw new Error(`Permission denied: ${model.name}.write`);
        }
        
        await securityService.checkRecordRules(model.name, 'write', record, context);
      }
      
      // Add user tracking
      if (baseModel.options.trackUsers && context.userId) {
        data.updatedBy = context.userId;
      }
      
      return record.update(data);
    };
    
    // Delete with record rules
    model.deleteRecord = async (id, context = {}) => {
      const record = await model.findByPk(id);
      
      if (!record) {
        throw new Error(`${model.name} not found`);
      }
      
      if (securityService) {
        const canDelete = await securityService.checkPermission(
          context.userId,
          `${model.name.toLowerCase()}.delete`
        );
        if (!canDelete) {
          throw new Error(`Permission denied: ${model.name}.delete`);
        }
        
        await securityService.checkRecordRules(model.name, 'unlink', record, context);
      }
      
      return record.destroy();
    };
    
    // Search with record rules
    model.searchRecords = async (query = {}, context = {}) => {
      let where = query.where || {};
      
      // Apply record rules filter
      if (securityService) {
        const domain = await securityService.getRecordRuleDomain(model.name, 'read', context);
        where = { ...where, ...domain };
      }
      
      const findOptions = {
        ...query,
        where,
        order: query.order || [['createdAt', 'DESC']]
      };
      
      if (query.page && query.pageSize) {
        findOptions.limit = query.pageSize;
        findOptions.offset = (query.page - 1) * query.pageSize;
      }
      
      const { count, rows } = await model.findAndCountAll(findOptions);
      
      return {
        items: rows,
        total: count,
        page: query.page || 1,
        pageSize: query.pageSize || rows.length,
        totalPages: Math.ceil(count / (query.pageSize || rows.length))
      };
    };
    
    // Bulk create
    model.bulkCreateRecords = async (dataArray, context = {}) => {
      if (baseModel.options.trackUsers && context.userId) {
        dataArray = dataArray.map(data => ({
          ...data,
          createdBy: context.userId,
          updatedBy: context.userId
        }));
      }
      
      return model.bulkCreate(dataArray);
    };
    
    // Bulk update
    model.bulkUpdateRecords = async (ids, data, context = {}) => {
      if (baseModel.options.trackUsers && context.userId) {
        data.updatedBy = context.userId;
      }
      
      return model.update(data, {
        where: { id: ids }
      });
    };
    
    // Bulk delete
    model.bulkDeleteRecords = async (ids, context = {}) => {
      return model.destroy({
        where: { id: ids }
      });
    };
  };
};

/**
 * Sequence Mixin - Auto-generates sequence numbers
 */
export const SequenceMixin = (fieldName = 'sequence', options = {}) => {
  return (model) => {
    model.beforeCreate(async (instance) => {
      if (!instance[fieldName]) {
        const lastRecord = await model.findOne({
          where: options.scope ? { [options.scope]: instance[options.scope] } : {},
          order: [[fieldName, 'DESC']],
          paranoid: false
        });
        
        const step = options.step || 10;
        instance[fieldName] = (lastRecord?.[fieldName] || 0) + step;
      }
    });
  };
};

/**
 * Audit Mixin - Logs all changes
 */
export const AuditMixin = (auditService) => {
  return (model) => {
    if (!auditService) return;
    
    model.afterCreate(async (instance, options) => {
      await auditService.log({
        action: 'create',
        model: model.name,
        recordId: instance.id,
        newValues: instance.toJSON(),
        userId: options.context?.userId
      });
    });
    
    model.afterUpdate(async (instance, options) => {
      await auditService.log({
        action: 'update',
        model: model.name,
        recordId: instance.id,
        oldValues: instance.previous(),
        newValues: instance.toJSON(),
        userId: options.context?.userId
      });
    });
    
    model.afterDestroy(async (instance, options) => {
      await auditService.log({
        action: 'delete',
        model: model.name,
        recordId: instance.id,
        oldValues: instance.toJSON(),
        userId: options.context?.userId
      });
    });
  };
};

/**
 * Timestamp Mixin - Adds additional timestamp fields
 */
export const TimestampMixin = (options = {}) => {
  return (model, baseModel) => {
    const fields = options.fields || ['publishedAt', 'archivedAt'];
    
    fields.forEach(fieldName => {
      const columnName = baseModel._snakeCase(fieldName);
      model.rawAttributes[fieldName] = {
        type: DataTypes.DATE,
        allowNull: true,
        field: columnName
      };
    });
    
    // Refresh model
    model.refreshAttributes();
  };
};

export default BaseModel;
