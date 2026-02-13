import { Sequelize, Options } from 'sequelize';
import { join } from 'path';

let sequelizeInstance: Sequelize | null = null;

/**
 * Get or create the singleton Sequelize instance.
 * Supports SQLite (default for dev), MySQL, and PostgreSQL via DB_TYPE env var.
 */
export function useDB(): Sequelize {
  if (sequelizeInstance) {
    return sequelizeInstance;
  }

  const config = useRuntimeConfig();

  const dbType = (config.dbType || 'sqlite') as string;

  if (dbType === 'sqlite') {
    const storagePath = process.env.DB_STORAGE || join(process.cwd(), 'data', 'lume.sqlite');
    sequelizeInstance = new Sequelize({
      dialect: 'sqlite',
      storage: storagePath,
      logging: config.dbLogging ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    });
    return sequelizeInstance;
  }

  const dialect = dbType === 'postgres' ? 'postgres' : 'mysql';
  const port = config.dbPort || (dialect === 'postgres' ? 5432 : 3306);

  const options: Options = {
    host: config.dbHost || 'localhost',
    port,
    dialect,
    logging: config.dbLogging ? console.log : false,
    pool: {
      max: config.dbPoolSize || 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    dialectOptions: dialect === 'postgres'
      ? {
          ssl: process.env.DB_SSL === 'true'
            ? { require: true, rejectUnauthorized: false }
            : false,
        }
      : {
          charset: 'utf8mb4',
        },
  };

  sequelizeInstance = new Sequelize(
    config.dbName || 'lume_db',
    config.dbUser || 'root',
    config.dbPassword || '',
    options,
  );

  return sequelizeInstance;
}

/**
 * Close the database connection.
 */
export async function closeDB(): Promise<void> {
  if (sequelizeInstance) {
    await sequelizeInstance.close();
    sequelizeInstance = null;
  }
}

/**
 * Test the database connection.
 */
export async function testDBConnection(): Promise<boolean> {
  try {
    const db = useDB();
    await db.authenticate();
    console.log(`[DB] Connected to ${db.getDialect()} database successfully`);
    return true;
  } catch (error) {
    console.error('[DB] Unable to connect to the database:', error);
    return false;
  }
}
