/**
 * Base Security Models
 */

import { DataTypes } from 'sequelize';

export const ApiKeyModel = (sequelize) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired'),
      defaultValue: 'active'
    },
    scopes: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true
  });

  return ApiKey;
};

export const SessionModel = (sequelize) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_activity_at'
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'revoked'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'sessions',
    timestamps: true,
    underscored: true
  });

  return Session;
};

export const IpAccessModel = (sequelize) => {
  const IpAccess = sequelize.define('IpAccess', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: true,
      field: 'ip_address'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('whitelist', 'blacklist'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'ip_access',
    timestamps: true,
    underscored: true
  });

  return IpAccess;
};

export const TwoFactorModel = (sequelize) => {
  const TwoFactor = sequelize.define('TwoFactor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id'
    },
    secret: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    backupCodes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'backup_codes'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at'
    }
  }, {
    tableName: 'two_factor',
    timestamps: true,
    underscored: true
  });

  return TwoFactor;
};

export const SecurityLogModel = (sequelize) => {
  const SecurityLog = sequelize.define('SecurityLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id'
    },
    event: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent'
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'blocked'),
      defaultValue: 'success'
    }
  }, {
    tableName: 'security_logs',
    timestamps: true,
    underscored: true
  });

  return SecurityLog;
};

export default {
  ApiKeyModel,
  SessionModel,
  IpAccessModel,
  TwoFactorModel,
  SecurityLogModel
};
