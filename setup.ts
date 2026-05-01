#!/usr/bin/env node
/**
 * Lume Framework Full-Stack Setup Script
 * Orchestrates backend and frontend initialization
 * Run with: npx tsx setup.ts
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const BACKEND_DIR = join(ROOT_DIR, 'backend');
const FRONTEND_DIR = join(ROOT_DIR, 'frontend/lume-admin');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}❌${colors.reset} ${msg}`),
};

const banner = () => {
  console.log(`
${colors.cyan}╔═════════════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset}    ${colors.bright}Lume Framework v2.0 - Full-Stack Setup${colors.reset}${colors.cyan}              ║${colors.reset}
${colors.cyan}╚═════════════════════════════════════════════════════════════╝${colors.reset}
  `);
};

const setupBackend = () => {
  log.info('Setting up backend...');

  if (!existsSync(BACKEND_DIR)) {
    log.error(`Backend directory not found: ${BACKEND_DIR}`);
    process.exit(1);
  }

  try {
    log.info('Running backend initialization (npm run init)');
    execFileSync('npm', ['run', 'init'], {
      cwd: BACKEND_DIR,
      stdio: 'inherit'
    });
    log.success('Backend initialized successfully');
  } catch (error) {
    log.error(`Backend initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};

const setupFrontend = () => {
  log.info('Setting up frontend...');

  if (!existsSync(FRONTEND_DIR)) {
    log.warn(`Frontend directory not found: ${FRONTEND_DIR} - skipping frontend setup`);
    return;
  }

  try {
    log.info('Running frontend environment check (npm run setup)');
    execFileSync('npm', ['run', 'setup'], {
      cwd: FRONTEND_DIR,
      stdio: 'inherit'
    });
    log.success('Frontend environment configured');
  } catch (error) {
    log.warn(`Frontend setup skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const printSummary = () => {
  console.log(`
${colors.green}╔═════════════════════════════════════════════════════════════╗${colors.reset}
${colors.green}║${colors.reset}              ${colors.bright}Setup Complete!${colors.reset}${colors.green}                          ║${colors.reset}
${colors.green}╚═════════════════════════════════════════════════════════════╝${colors.reset}

${colors.bright}Next steps:${colors.reset}

1. ${colors.bright}Seed sample data (optional):${colors.reset}
   cd backend
   ${colors.cyan}npm run seed${colors.reset}

2. ${colors.bright}Start the backend:${colors.reset}
   cd backend
   ${colors.cyan}npm run dev${colors.reset}

3. ${colors.bright}Start the frontend (in a new terminal):${colors.reset}
   cd frontend/lume-admin
   ${colors.cyan}npm run dev${colors.reset}

4. ${colors.bright}Access the applications:${colors.reset}
   Frontend: ${colors.cyan}http://localhost:5173${colors.reset}
   Backend:  ${colors.cyan}http://localhost:3000${colors.reset}

5. ${colors.bright}Admin login:${colors.reset}
   Email:    ${colors.yellow}admin@lume.dev${colors.reset}
   Password: ${colors.yellow}Admin@Lume!1${colors.reset}

   ${colors.red}Change this password immediately after first login!${colors.reset}

${colors.cyan}Happy coding! 🚀${colors.reset}
  `);
};

const main = async () => {
  try {
    banner();
    setupBackend();
    setupFrontend();
    printSummary();
  } catch (error) {
    log.error(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};

main();
