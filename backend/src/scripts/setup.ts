#!/usr/bin/env node
/**
 * Lume Framework First-Time Setup Script
 * Orchestrates database initialization and seeding
 * Run with: npm run init
 */

import { existsSync, copyFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '../..');
const ENV_FILE = join(ROOT_DIR, '.env');
const ENV_EXAMPLE = join(ROOT_DIR, '.env.example');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const banner = () => {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset}       ${colors.bright}Lume Framework v2.0 - First-Time Setup${colors.reset}${colors.cyan}          ║${colors.reset}
${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}
  `);
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}❌${colors.reset} ${msg}`),
};

const setupEnv = () => {
  log.info('Checking .env file...');

  if (!existsSync(ENV_FILE)) {
    log.warn('.env not found, creating from .env.example');
    copyFileSync(ENV_EXAMPLE, ENV_FILE);
    log.success('.env created');
    log.warn('⚠️  Please edit .env and set your database credentials before continuing');
    process.exit(1);
  }

  dotenv.config({ path: ENV_FILE });
  log.success('.env loaded');
};

const validateEnv = () => {
  log.info('Validating environment variables...');

  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(', ')}`);
    log.info('Please set these in your .env file and try again');
    process.exit(1);
  }

  log.success('All required env vars are set');
};

const checkDatabaseConnectivity = async () => {
  log.info('Checking database connectivity...');

  try {
    const prisma = (await import('../core/db/prisma.js')).default;
    await prisma.$connect();
    log.success('Database connection successful');
    await prisma.$disconnect();
  } catch (error) {
    log.error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
    log.info('Check your DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD settings');
    process.exit(1);
  }
};

const initializeDatabases = async () => {
  log.info('Initializing database schemas...');

  try {
    // Run Prisma db push (safe - creates tables if they don't exist)
    log.info('Running Prisma migrations...');
    execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    });
    log.success('Prisma schemas created/updated');
  } catch (error) {
    log.error(`Prisma initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  try {
    // Initialize Drizzle
    log.info('Initializing Drizzle module schemas...');
    const { initDrizzle } = await import('../core/db/drizzle.js');
    await initDrizzle();
    log.success('Drizzle schemas initialized');
  } catch (error) {
    log.warn(`Drizzle initialization skipped or failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const seedCoreData = async () => {
  log.info('Seeding core data (roles, permissions, admin user)...');

  try {
    const prisma = (await import('../core/db/prisma.js')).default;

    // Seed roles
    const roles = [
      { name: 'super_admin', display_name: 'Super Admin', description: 'Full system access', is_system: true },
      { name: 'admin', display_name: 'Administrator', description: 'System administrator', is_system: true },
      { name: 'manager', display_name: 'Manager', description: 'Team manager', is_system: false },
      { name: 'staff', display_name: 'Staff', description: 'Staff member', is_system: false },
      { name: 'user', display_name: 'User', description: 'Regular user', is_system: false },
      { name: 'viewer', display_name: 'Viewer', description: 'Read-only access', is_system: false },
      { name: 'guest', display_name: 'Guest', description: 'Guest user', is_system: false }
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        create: { ...role, isActive: true, createdAt: new Date() },
        update: {}
      });
    }
    log.success(`Seeded ${roles.length} roles`);

    // Seed admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lume.dev';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Lume!1';
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });

    if (superAdminRole) {
      await prisma.user.upsert({
        where: { email: adminEmail },
        create: {
          email: adminEmail,
          password: adminPassword,
          firstName: 'Super',
          lastName: 'Admin',
          role_id: superAdminRole.id,
          is_email_verified: true,
          isActive: true,
          createdAt: new Date()
        },
        update: {}
      });
      log.success(`Admin user created/verified: ${adminEmail}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    log.error(`Core data seeding failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};

const printSummary = () => {
  console.log(`
${colors.green}╔═══════════════════════════════════════════════════════╗${colors.reset}
${colors.green}║${colors.reset}              ${colors.bright}Setup Complete!${colors.reset}${colors.green}                     ║${colors.reset}
${colors.green}╚═══════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Next steps:${colors.reset}

1. Seed sample data (optional):
   ${colors.cyan}npm run seed${colors.reset}

2. Start the development server:
   ${colors.cyan}npm run dev${colors.reset}

3. Admin login credentials:
   Email:    ${process.env.ADMIN_EMAIL || 'admin@lume.dev'}
   Password: ${process.env.ADMIN_PASSWORD || 'Admin@Lume!1'}

   ${colors.yellow}Change this password immediately after first login!${colors.reset}

4. Access the frontend at:
   http://localhost:5173

${colors.cyan}Happy coding! 🚀${colors.reset}
  `);
};

const main = async () => {
  try {
    banner();
    setupEnv();
    validateEnv();
    await checkDatabaseConnectivity();
    await initializeDatabases();
    await seedCoreData();
    printSummary();
  } catch (error) {
    log.error(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};

main();
