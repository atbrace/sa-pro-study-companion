import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'study.db');

// Ensure data directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Create database connection
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Optimize for performance
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache

// Helper to close database connection (for cleanup)
export function closeDatabase() {
  db.close();
}

// Helper to get database info
export function getDatabaseInfo() {
  const result = db.pragma('database_list', { simple: true }) as Array<{ name: string; file: string }>;
  return {
    path: dbPath,
    databases: result,
    inTransaction: db.inTransaction,
  };
}
