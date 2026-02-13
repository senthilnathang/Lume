/**
 * Base Features Data Models
 */

import { DataTypes } from 'sequelize';

export const FeatureFlagModel = (sequelize) => {
  const FeatureFlag = sequelize.define('FeatureFlag', {
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
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    enabledFor: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'enabled_for'
    },
    disabledFor: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'disabled_for'
    },
    config: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    sequence: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    }
  }, {
    tableName: 'feature_flags',
    timestamps: true,
    underscored: true
  });

  return FeatureFlag;
};

export const DataImportModel = (sequelize) => {
  const DataImport = sequelize.define('DataImport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'file_name'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'file_path'
    },
    mapping: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    totalRows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_rows'
    },
    processedRows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'processed_rows'
    },
    successRows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'success_rows'
    },
    failedRows: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_rows'
    },
    errors: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    importedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'imported_by'
    }
  }, {
    tableName: 'data_imports',
    timestamps: true,
    underscored: true
  });

  return DataImport;
};

export const DataExportModel = (sequelize) => {
  const DataExport = sequelize.define('DataExport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    filters: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    fields: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    format: {
      type: DataTypes.ENUM('csv', 'json', 'xlsx'),
      defaultValue: 'csv'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size'
    },
    recordCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'record_count'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    exportedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'exported_by'
    }
  }, {
    tableName: 'data_exports',
    timestamps: true,
    underscored: true
  });

  return DataExport;
};

export const BackupModel = (sequelize) => {
  const Backup = sequelize.define('Backup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('full', 'partial', 'incremental'),
      defaultValue: 'full'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'file_path'
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'file_size'
    },
    tables: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'backups',
    timestamps: true,
    underscored: true
  });

  return Backup;
};

export default {
  FeatureFlagModel,
  DataImportModel,
  DataExportModel,
  BackupModel
};
