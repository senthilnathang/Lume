import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2/driver';
import mysql from 'mysql2/promise';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private db: any;

  async onModuleInit() {
    const dbUser = process.env.DB_USER;
    const dbPass = process.env.DB_PASS;

    if (!dbUser || !dbPass) {
      throw new Error(
        'Database credentials must be set via environment variables: DB_USER and DB_PASS are required'
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: dbUser,
      password: dbPass,
      database: process.env.DB_NAME || 'lume',
    });

    this.db = drizzle(connection);
  }

  async onModuleDestroy() {
    if (this.db) {
      // Drizzle doesn't require explicit cleanup, but the pool will close when app exits
    }
  }

  getDrizzle() {
    return this.db;
  }
}
