#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DB_PATH = process.argv[2] || path.join(__dirname, '../../data/lume.db');
const DEMO_DATA_PATH = path.join(__dirname, '../../../demo_data/lume_demo_data.json');

function loadDemoData() {
  console.log('Loading demo data...');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Demo data: ${DEMO_DATA_PATH}`);

  if (!fs.existsSync(DEMO_DATA_PATH)) {
    console.error('Demo data file not found');
    process.exit(1);
  }

  const demoData = JSON.parse(fs.readFileSync(DEMO_DATA_PATH, 'utf-8'));

  const dbExists = fs.existsSync(DB_PATH);
  const db = dbExists ? JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) : { tables: {} };

  const tables = ['users', 'roles', 'settings', 'modules', 'audit_logs', 'sequences'];
  tables.forEach((table) => {
    if (demoData[table]) {
      db.tables[table] = demoData[table];
      console.log(`Loaded ${demoData[table].length} records into ${table}`);
    }
  });

  db._meta = {
    ...db._meta,
    last_demo_load: new Date().toISOString(),
    demo_data_version: demoData.version,
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log('Demo data loaded successfully!');
}

loadDemoData();
