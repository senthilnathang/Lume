#!/usr/bin/env node
/**
 * Lume Database Refresh Script (Development)
 * Drops all tables and recreates the schema
 *
 * WARNING: This destroys all data. For development use only.
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../core/db/prisma.js';

const refreshDatabase = async () => {
  try {
    console.log('🔄 Starting database refresh...');
    await prisma.$connect();

    // Get all table names from the database
    console.log('📋 Dropping all tables...');

    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

    // Query all tables in the current database
    const dbName = process.env.DB_NAME || 'lume';
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME as tableName
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ${dbName}
        AND TABLE_TYPE = 'BASE TABLE'
    `;

    for (const table of tables) {
      const tableName = table.tableName;
      // Skip prisma migration table
      if (tableName === '_prisma_migrations') continue;
      console.log(`   Dropping table: ${tableName}`);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

    console.log('✅ All tables dropped.');

    console.log('\n🎉 Database refresh complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npx prisma db push     (recreate schema)');
    console.log('   2. Run: npm run db:admin        (create admin user)');
    console.log('   3. Run: npm run db:seed          (seed sample data)');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error refreshing database:', error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
};

refreshDatabase();
