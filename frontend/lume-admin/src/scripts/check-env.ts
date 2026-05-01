#!/usr/bin/env node
/**
 * Frontend Environment Setup Checker
 * Validates that required Vite environment variables are configured
 * Run with: npm run setup
 */

import { existsSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '../..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

const checkEnv = () => {
  log.info('Checking frontend environment setup...');

  const envFile = join(appRoot, '.env');
  const envExample = join(appRoot, '.env.example');

  if (!existsSync(envFile)) {
    log.warn('.env.local not found, creating from .env.example');
    if (existsSync(envExample)) {
      copyFileSync(envExample, envFile);
      log.success('.env created');
    } else {
      log.warn('No .env.example found - using defaults');
    }
  } else {
    log.success('.env configured');
  }

  // Check for required env vars
  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    log.warn('VITE_API_URL not set - using default: http://localhost:3000');
  } else {
    log.success(`API URL configured: ${apiUrl}`);
  }

  console.log(`
${colors.green}✅ Frontend environment check complete!${colors.reset}

You can now:
  1. Start the dev server: npm run dev
  2. Build for production: npm run build
  3. Preview production build: npm run preview
  `);
};

checkEnv();
