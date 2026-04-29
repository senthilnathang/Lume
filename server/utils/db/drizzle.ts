/**
 * Drizzle ORM Connection
 * Supports MySQL and PostgreSQL based on DB_TYPE environment variable.
 */

const DB_TYPE = (process.env.DB_TYPE || 'mysql').toLowerCase()
const isPostgres = DB_TYPE === 'postgresql' || DB_TYPE === 'postgres' || DB_TYPE === 'pg'

let pool: any
let db: any

export async function initDrizzle() {
  if (db) return db

  if (isPostgres) {
    const pg = await import('pg')
    const { drizzle } = await import('drizzle-orm/node-postgres')

    pool = new pg.default.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'lume',
      user: process.env.DB_USER || 'gawdesy',
      password: process.env.DB_PASSWORD || 'gawdesy',
      max: parseInt(process.env.DB_POOL_SIZE || '10'),
    })

    db = drizzle(pool)
  } else {
    const mysql = await import('mysql2/promise')
    const { drizzle } = await import('drizzle-orm/mysql2')

    pool = mysql.default.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'lume',
      user: process.env.DB_USER || 'gawdesy',
      password: process.env.DB_PASSWORD || 'gawdesy',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
    })

    db = drizzle(pool)
  }

  return db
}

export function getDrizzle() {
  if (!db) throw new Error('Drizzle not initialized. Call initDrizzle() first.')
  return db
}

export const getDb = getDrizzle

export function getPool() {
  return pool
}

export default { initDrizzle, getDrizzle, getDb, getPool }
