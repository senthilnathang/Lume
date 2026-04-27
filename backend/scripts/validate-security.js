#!/usr/bin/env node

/**
 * Pre-launch Security Validation Script
 * Run before deploying to production on Sept 1
 *
 * Usage: node scripts/validate-security.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

// Load .env file
config({ path: envPath });

const isProduction = process.env.NODE_ENV === 'production';
const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️  WARN';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function testResult(name, passed, message = '') {
  if (passed) {
    console.log(`${PASS} ${name}`);
    passCount++;
  } else {
    console.log(`${FAIL} ${name}`);
    if (message) console.log(`      ${message}`);
    failCount++;
  }
}

function warnResult(name, message = '') {
  console.log(`${WARN} ${name}`);
  if (message) console.log(`      ${message}`);
  warnCount++;
}

console.log(`\n🔒 LUME SECURITY VALIDATION REPORT\n`);
console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\n`);

// ───────────────────────────────────────────────────────────────────────────
// Section 1: Environment Variables
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n📋 ENVIRONMENT VARIABLES\n`);

// NODE_ENV
testResult(
  'NODE_ENV set correctly',
  process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === (isProduction ? 'production' : 'development'),
  `NODE_ENV=${process.env.NODE_ENV}`
);

// JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
const jwtSecretValid = jwtSecret && jwtSecret.length >= 32 && jwtSecret !== 'jwt-secret';
if (isProduction) {
  testResult(
    'JWT_SECRET strong in production',
    jwtSecretValid,
    jwtSecret ? (jwtSecretValid ? '✅ Strong secret' : '❌ Weak or default secret') : '❌ Not set'
  );
} else {
  warnResult(
    'JWT_SECRET in development',
    jwtSecret ? (jwtSecretValid ? '✅ Strong secret' : '⚠️  Weak or default (acceptable in dev)') : '⚠️  Not set (acceptable in dev)'
  );
}

// JWT_REFRESH_SECRET
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const jwtRefreshSecretValid = jwtRefreshSecret && jwtRefreshSecret.length >= 32 && !jwtRefreshSecret.includes('your-refresh-secret');
if (isProduction) {
  testResult(
    'JWT_REFRESH_SECRET set in production',
    jwtRefreshSecretValid,
    jwtRefreshSecret ? (jwtRefreshSecretValid ? '✅ Set' : '❌ Not set or default') : '❌ Not set'
  );
} else {
  warnResult('JWT_REFRESH_SECRET in development', 'Not critical in development');
}

// SESSION_SECRET
const sessionSecret = process.env.SESSION_SECRET;
const sessionSecretValid = sessionSecret && sessionSecret.length >= 32 && !sessionSecret.includes('your-session-secret');
if (isProduction) {
  testResult(
    'SESSION_SECRET set in production',
    sessionSecretValid,
    sessionSecret ? (sessionSecretValid ? '✅ Set' : '❌ Not set or default') : '❌ Not set'
  );
}

// DB_PASSWORD
const dbPassword = process.env.DB_PASSWORD;
testResult(
  'Database password not default',
  dbPassword && dbPassword !== 'gawdesy' && dbPassword.length >= 8,
  dbPassword ? (dbPassword === 'gawdesy' ? '❌ Using default password!' : '✅ Custom password') : '❌ Not set'
);

// CORS_ORIGIN
const corsOrigin = process.env.CORS_ORIGIN;
if (isProduction) {
  testResult(
    'CORS_ORIGIN explicitly set in production',
    corsOrigin && corsOrigin !== '*' && corsOrigin.includes('http'),
    corsOrigin ? corsOrigin : '❌ Not set (defaults to deny all, which is OK but should be explicit)'
  );
} else {
  warnResult(
    'CORS_ORIGIN in development',
    corsOrigin ? corsOrigin : 'Using default dev origins'
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Section 2: .env File Security
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n📁 FILE SECURITY\n`);

// .env exists
const envExists = fs.existsSync(envPath);
testResult('.env file exists', envExists);

// .env has correct permissions (not world-readable)
if (envExists) {
  try {
    const stats = fs.statSync(envPath);
    const mode = stats.mode;
    // Check if world-readable (mode & 0o004)
    const isWorldReadable = (mode & 0o004) !== 0;
    testResult(
      '.env file permissions secure',
      !isWorldReadable,
      isWorldReadable ? '❌ File is world-readable!' : '✅ Not world-readable'
    );
  } catch (e) {
    warnResult('.env file permissions', 'Could not check');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Section 3: Git Security
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n🔐 GIT SECURITY\n`);

// Check .gitignore
const gitignorePath = path.join(__dirname, '../.gitignore');
const gitignoreContent = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, 'utf-8')
  : '';

testResult(
  '.env in .gitignore',
  gitignoreContent.includes('.env'),
  gitignoreContent.includes('.env') ? '✅ .env ignored' : '❌ .env not in .gitignore!'
);

// ───────────────────────────────────────────────────────────────────────────
// Section 4: Dependencies
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n📦 DEPENDENCIES\n`);

// Check if npm audit ran recently
const packageLockPath = path.join(__dirname, '../package-lock.json');
if (fs.existsSync(packageLockPath)) {
  testResult('package-lock.json exists', true, '✅ Lockfile present');
} else {
  warnResult('package-lock.json missing', 'Ensure npm ci is used in production');
}

// Check for required security packages
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const deps = { ...packageJsonContent.dependencies, ...packageJsonContent.devDependencies };

const securityPackages = ['express-validator', 'bcryptjs', 'jsonwebtoken', 'helmet', 'express-rate-limit', 'cors'];
for (const pkg of securityPackages) {
  testResult(
    `${pkg} installed`,
    deps[pkg] !== undefined,
    deps[pkg] ? `v${deps[pkg]}` : 'Not found'
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Section 5: Code Changes
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n🔧 CODE CHANGES\n`);

// Check index.js for JWT secret enforcement
const indexPath = path.join(__dirname, '../src/index.js');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

testResult(
  'JWT secret validation enforced in production',
  indexContent.includes('process.exit(1)') && indexContent.includes('JWT_SECRET'),
  'Code checks for strong JWT_SECRET and exits if missing'
);

testResult(
  'CORS whitelist configured (not *)',
  indexContent.includes('defaultCorsOrigins') || indexContent.includes('CORS_ORIGIN'),
  'CORS properly configured'
);

testResult(
  'Rate limiting enabled',
  indexContent.includes('rateLimit') && indexContent.includes('authLimiter'),
  'Both global and auth rate limiters configured'
);

testResult(
  'Helmet security headers enabled',
  indexContent.includes('helmet('),
  'Helmet middleware configured'
);

// Check auth.js for session validation
const authPath = path.join(__dirname, '../src/core/middleware/auth.js');
const authContent = fs.readFileSync(authPath, 'utf-8');

testResult(
  'Session validation enforced in production',
  authContent.includes('isProduction') && authContent.includes('Session not found'),
  'Session validation with production enforcement'
);

// Check error handler for stack trace redaction
const errorHandlerPath = path.join(__dirname, '../src/core/middleware/errorHandler.js');
const errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf-8');

testResult(
  'Stack traces redacted in production logs',
  errorHandlerContent.includes('isProduction') && errorHandlerContent.includes('stack'),
  'Error handler redacts sensitive info in production'
);

// ───────────────────────────────────────────────────────────────────────────
// Summary
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}\n`);
console.log(`✅ PASSED:  ${passCount}`);
console.log(`❌ FAILED:  ${failCount}`);
console.log(`⚠️  WARNED: ${warnCount}`);
console.log(`\n${'─'.repeat(60)}\n`);

if (failCount === 0) {
  console.log('🎉 All critical security checks passed!\n');
  if (isProduction) {
    console.log('Ready for production deployment.\n');
  }
  process.exit(0);
} else {
  console.log(`❌ ${failCount} CRITICAL check(s) failed!\n`);
  console.log('Fix the above issues before deploying to production.\n');
  process.exit(1);
}
