import { DataTypes } from 'sequelize';
import { getDatabase } from '../../config.js';
import bcrypt from 'bcryptjs';

export const User = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'User email address'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Hashed password'
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name'
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Avatar URL'
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5, // Default to 'user' role
      field: 'role_id'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts'
    },
    lock_until: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lock_until'
    },
    refresh_token: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'refresh_token'
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_reset_token'
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['role_id'] },
      { fields: ['is_active'] }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      }
    }
  });
  
  // Instance methods
  User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };
  
  User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    delete values.refresh_token;
    delete values.password_reset_token;
    delete values.password_reset_expires;
    return values;
  };
  
  User.prototype.getFullName = function() {
    return `${this.first_name} ${this.last_name}`;
  };
  
  User.prototype.isLocked = function() {
    return this.lock_until && this.lock_until > new Date();
  };
  
  User.prototype.incrementLoginAttempts = async function() {
    const maxAttempts = 5;
    const lockDuration = 30 * 60 * 1000; // 30 minutes
    
    if (this.login_attempts >= maxAttempts) {
      this.lock_until = new Date(Date.now() + lockDuration);
    }
    this.login_attempts += 1;
    await this.save();
  };
  
  User.prototype.resetLoginAttempts = async function() {
    this.login_attempts = 0;
    this.lock_until = null;
    await this.save();
  };
  
  return User;
};

export default User;