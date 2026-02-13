#!/usr/bin/env node

/**
 * Admin Password Reset Script
 * Reads MySQL credentials from .env file and resets admin password
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const ADMIN_EMAIL = 'admin@gawdesy.org';
const NEW_PASSWORD = 'GawdesyAdmin@2024!';

async function resetAdminPassword() {
  console.log('Admin Password Reset Tool');
  console.log('=========================\n');

  // Get credentials from environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'gawdesy',
    user: process.env.DB_USER || 'gawdesy',
    password: process.env.DB_PASSWORD || 'gawdesy',
  };

  console.log('Using database credentials from .env file:');
  console.log(`  Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log();

  let connection;

  try {
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!\n');

    // Check if admin user exists
    console.log(`Checking for admin user: ${ADMIN_EMAIL}`);
    const [rows] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      [ADMIN_EMAIL]
    );

    if (rows.length === 0) {
      console.error(`Admin user ${ADMIN_EMAIL} not found!`);
      process.exit(1);
    }

    const admin = rows[0];
    console.log(`Found admin user (ID: ${admin.id}, Role: ${admin.role})\n`);

    // Hash the new password
    console.log('Hashing new password...');
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);

    // Update password
    console.log('Updating password in database...');
    const [result] = await connection.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?',
      [hashedPassword, ADMIN_EMAIL]
    );

    if (result.affectedRows > 0) {
      console.log('\nPassword reset successful!');
      console.log('========================');
      console.log(`Email:    ${ADMIN_EMAIL}`);
      console.log(`Password: ${NEW_PASSWORD}`);
      console.log('\nYou can now log in with these credentials.');
    } else {
      console.error('\nFailed to update password. No rows affected.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the script
resetAdminPassword();
