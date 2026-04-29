import * as fs from 'fs';
import * as path from 'path';
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

interface MigrationFile {
  filename: string;
  number: number;
  executed: boolean;
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'lume';

async function ensureMigrationsTable(connection: any) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INT
    );
  `;
  await connection.execute(createTableQuery);
}

async function getMigrationsFromDatabase(connection: any): Promise<string[]> {
  const [rows] = await connection.execute('SELECT filename FROM migrations ORDER BY id');
  return (rows as any[]).map((row) => row.filename);
}

async function getMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  const executed = await getMigrationsFromDatabase(connection);

  return files
    .map((filename) => {
      const match = filename.match(/^(\d+)_/);
      return {
        filename,
        number: match ? parseInt(match[1]) : 0,
        executed: executed.includes(filename),
      };
    })
    .sort((a, b) => a.number - b.number);
}

async function readMigrationFile(filename: string): Promise<string> {
  const filePath = path.join(__dirname, filename);
  return fs.promises.readFile(filePath, 'utf-8');
}

async function executeMigration(connection: any, filename: string): Promise<void> {
  console.log(`Executing migration: ${filename}...`);

  const sql = await readMigrationFile(filename);
  const startTime = Date.now();

  try {
    // Split SQL by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await connection.execute(statement);
    }

    const executionTime = Date.now() - startTime;

    // Record migration in database
    await connection.execute('INSERT INTO migrations (filename, execution_time_ms) VALUES (?, ?)', [
      filename,
      executionTime,
    ]);

    console.log(`✓ Migration executed: ${filename} (${executionTime}ms)`);
  } catch (error) {
    console.error(`✗ Migration failed: ${filename}`);
    console.error(error);
    throw error;
  }
}

async function run() {
  let connection;

  try {
    // Create connection
    connection = await createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    console.log(`Connected to database: ${DB_NAME}`);

    // Ensure migrations table exists
    await ensureMigrationsTable(connection);

    // Get list of migration files
    const migrations = await getMigrationFiles();

    // Filter pending migrations
    const pending = migrations.filter((m) => !m.executed);

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s).`);

    // Execute each pending migration
    for (const migration of pending) {
      await executeMigration(connection, migration.filename);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Execute
run();
