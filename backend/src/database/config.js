import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';
import pg from 'pg';

dotenv.config();

// Database configuration
const dbConfig = {
  // Database type: 'mysql' or 'postgres'
  type: process.env.DB_TYPE || 'mysql',
  
  // MySQL configuration
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'gawdesy',
    username: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
    dialect: 'mysql',
    dialectModule: mysql2,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  
  // PostgreSQL configuration
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'gawdesy',
    username: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
    dialect: 'postgres',
    dialectModule: pg,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    timezone: '+00:00',
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    // PostgreSQL specific settings
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};

// Get active database configuration
const getActiveConfig = () => {
  return dbConfig.type === 'postgres' ? dbConfig.postgres : dbConfig.mysql;
};

// Create Sequelize instance
const createSequelize = () => {
  const config = getActiveConfig();
  
  return new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      dialectModule: config.dialectModule,
      pool: config.pool,
      logging: config.logging,
      timezone: config.timezone,
      define: config.define,
      ...(config.dialectOptions && { dialectOptions: config.dialectOptions })
    }
  );
};

// Database connection
let sequelize = null;

// Initialize database connection
const initializeDatabase = async (skipSync = false) => {
  if (sequelize) {
    return sequelize;
  }
  
  try {
    sequelize = createSequelize();
    
    // Test connection
    await sequelize.authenticate();
    console.log(`✅ Database connection established successfully (${dbConfig.type.toUpperCase()})`);
    
    // Sync models (skip if told to, for modular initialization)
    if (!skipSync && (process.env.NODE_ENV === 'development' || process.env.DB_SYNC === 'true')) {
      await sequelize.sync({ 
        alter: process.env.DB_ALTER === 'true',
        force: process.env.DB_FORCE === 'true'
      });
      console.log('✅ Database models synchronized');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    throw error;
  }
};

// Get database instance
const getDatabase = () => {
  if (!sequelize) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return sequelize;
};

// Get database type
const getDatabaseType = () => dbConfig.type;

// Close database connection
const closeDatabase = async () => {
  if (sequelize) {
    await sequelize.close();
    sequelize = null;
    console.log('✅ Database connection closed');
  }
};

// Export utilities
export {
  dbConfig,
  initializeDatabase,
  getDatabase,
  getDatabaseType,
  closeDatabase,
  createSequelize
};

export default {
  dbConfig,
  initializeDatabase,
  getDatabase,
  getDatabaseType,
  closeDatabase,
  createSequelize
};