#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DB_PATH = process.argv[2] || path.join(__dirname, '../../data/lume.db');

function listUsers() {
  console.log('Listing users...');
  console.log(`Database: ${DB_PATH}`);

  const dbExists = fs.existsSync(DB_PATH);
  if (!dbExists) {
    console.error('Database not found. Please run initdb first.');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const users = db.tables.users || [];

  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log('\nUsers:');
  console.log('------');
  console.log('ID | Username | Email | Role | Superuser | Active');
  console.log('-'.repeat(60));

  users.forEach((user) => {
    console.log(
      `${user.id} | ${user.username} | ${user.email} | ${user.role} | ${user.is_superuser ? 'Yes' : 'No'} | ${user.is_active ? 'Yes' : 'No'}`
    );
  });

  console.log(`\nTotal: ${users.length} user(s)`);
}

listUsers();
