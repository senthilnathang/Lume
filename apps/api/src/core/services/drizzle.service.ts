import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2/driver';
import mysql from 'mysql2/promise';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private db: any;
  private pool: mysql.Pool;

  constructor() {
    const dbUser = process.env.DB_USER;
    const dbPass = process.env.DB_PASS ?? process.env.DB_PASSWORD;

    if (!process.env.DATABASE_URL && (!dbUser || dbPass === undefined)) {
      throw new Error(
        'Database credentials must be set via environment variables: DB_USER and DB_PASS are required'
      );
    }

    this.pool = process.env.DATABASE_URL ? mysql.createPool(process.env.DATABASE_URL) : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: dbUser,
      password: dbPass,
      database: process.env.DB_NAME || 'lume',
      port: Number(process.env.DB_PORT || 3306),
      connectionLimit: 5,
    });

    // Consumers request Drizzle in their constructors, before onModuleInit.
    this.db = drizzle(this.pool);
  }

  async onModuleInit() { await this.pool.query('SELECT 1'); }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getDrizzle() {
    return this.db;
  }
}
