import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'gawdesy_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  pool: {
    max: parseInt(process.env.DB_POOL_SIZE) || 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(msg);
    }
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};
