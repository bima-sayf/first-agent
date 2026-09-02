/**
 * Database Migration Runner
 * Executes all SQL migration files in order
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || './data/village-sim.db';
const MIGRATIONS_DIR = __dirname;

interface Migration {
  filename: string;
  sql: string;
}

/**
 * Load all migration files from the migrations directory
 */
function loadMigrations(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR);

  return files
    .filter(file => file.endsWith('.sql'))
    .sort() // Sort alphabetically (001_, 002_, etc.)
    .map(filename => ({
      filename,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8'),
    }));
}

/**
 * Run all migrations
 */
export function runMigrations(dbPath: string = DB_PATH): void {
  console.log('🔄 Running database migrations...');
  console.log(`📂 Database: ${dbPath}`);

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Connect to database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON'); // Enable foreign key constraints

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at INTEGER NOT NULL
    );
  `);

  // Get already executed migrations
  const executedMigrations = db
    .prepare('SELECT filename FROM migrations')
    .all()
    .map((row: any) => row.filename);

  // Load and execute pending migrations
  const migrations = loadMigrations();
  let executedCount = 0;

  for (const migration of migrations) {
    if (executedMigrations.includes(migration.filename)) {
      console.log(`⏭️  Skipping ${migration.filename} (already executed)`);
      continue;
    }

    console.log(`▶️  Executing ${migration.filename}...`);

    try {
      // Execute migration in a transaction
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO migrations (filename, executed_at) VALUES (?, ?)').run(
          migration.filename,
          Date.now()
        );
      })();

      console.log(`✅ ${migration.filename} completed`);
      executedCount++;
    } catch (error) {
      console.error(`❌ Error executing ${migration.filename}:`, error);
      db.close();
      process.exit(1);
    }
  }

  db.close();

  if (executedCount === 0) {
    console.log('✨ All migrations already executed. Database is up to date.');
  } else {
    console.log(`✅ Successfully executed ${executedCount} migration(s)`);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
