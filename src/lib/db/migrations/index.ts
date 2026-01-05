import { db } from '../client';
import fs from 'fs';
import path from 'path';

// Migrations tracking table
function createMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Get list of applied migrations
function getAppliedMigrations(): string[] {
  createMigrationsTable();
  const rows = db.prepare('SELECT name FROM migrations ORDER BY id').all() as Array<{ name: string }>;
  return rows.map(row => row.name);
}

// Apply a single migration
function applyMigration(name: string, sql: string) {
  const transaction = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
  });

  transaction();
}

// Run all pending migrations
export function runMigrations() {
  const migrationsDir = __dirname;
  const appliedMigrations = getAppliedMigrations();

  // Get all .sql files in migrations directory
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  let appliedCount = 0;

  for (const file of migrationFiles) {
    const migrationName = file.replace('.sql', '');

    if (!appliedMigrations.includes(migrationName)) {
      console.log(`Applying migration: ${migrationName}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      applyMigration(migrationName, sql);
      appliedCount++;
    }
  }

  if (appliedCount === 0) {
    console.log('No pending migrations');
  } else {
    console.log(`Applied ${appliedCount} migration(s)`);
  }

  return appliedCount;
}

// Get migration status
export function getMigrationStatus() {
  createMigrationsTable();
  const applied = db.prepare('SELECT name, applied_at FROM migrations ORDER BY id').all() as Array<{
    name: string;
    applied_at: string;
  }>;

  return {
    totalApplied: applied.length,
    migrations: applied,
  };
}
