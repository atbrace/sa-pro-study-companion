import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'study.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database connection (synchronous)
export const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Execute a database migration from SQL file
 */
export function runMigration(sqlFilePath: string): void {
  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  db.exec(sql);
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='domains'"
  ).get();
  return !!result;
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all() as { name: string }[];

  const stats: Record<string, number> = {};

  for (const table of tables) {
    if (table.name.startsWith('sqlite_')) continue;
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
    stats[table.name] = count.count;
  }

  return stats;
}

/**
 * Close database connection (for cleanup)
 */
export function closeDatabase(): void {
  db.close();
}

// Handle process termination
process.on('exit', () => closeDatabase());
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
