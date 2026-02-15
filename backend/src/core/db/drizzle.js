import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

let pool;
let db;

export async function initDrizzle() {
  if (db) return db;

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'lume',
    user: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 10,
  });

  db = drizzle(pool);
  return db;
}

export function getDrizzle() {
  if (!db) throw new Error('Drizzle not initialized. Call initDrizzle() first.');
  return db;
}

export function getPool() {
  return pool;
}

export default { initDrizzle, getDrizzle, getPool };
