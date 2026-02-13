#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.argv[2] || path.join(__dirname, '../../data/lume.db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 260000, 64, 'sha256').toString('hex');
  return `pbkdf2:sha256:260000$${salt}$${hash}`;
}

function createUser(username, email, password, isSuperuser = false) {
  console.log(`Creating user: ${username}`);
  console.log(`Email: ${email}`);
  console.log(`Superuser: ${isSuperuser}`);

  const dbExists = fs.existsSync(DB_PATH);
  if (!dbExists) {
    console.error('Database not found. Please run initdb first.');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const users = db.tables.users || [];

  const existingUser = users.find((u) => u.username === username || u.email === email);
  if (existingUser) {
    console.error('User with this username or email already exists');
    process.exit(1);
  }

  const newUser = {
    id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
    username,
    email,
    password_hash: hashPassword(password),
    is_superuser: isSuperuser,
    is_active: true,
    role: isSuperuser ? 'admin' : 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  users.push(newUser);
  db.tables.users = users;

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log(`User ${username} created successfully!`);
}

const args = process.argv.slice(2);
const isSuperuser = args.includes('--superuser') || args.includes('-s');
const roleIndex = args.findIndex((arg) => arg === '--role' || arg === '-r');

if (args.length < 3) {
  console.log('Usage: node createUser.js <username> <email> <password> [--superuser] [--role <role>]');
  process.exit(1);
}

const username = args[0];
const email = args[1];
const password = args[2];
const role = roleIndex > -1 ? args[roleIndex + 1] : undefined;

createUser(username, email, password, isSuperuser);
