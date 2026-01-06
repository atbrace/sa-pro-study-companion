#!/usr/bin/env tsx

import { db, runMigration, isDatabaseInitialized, getDatabaseStats } from '../src/lib/db/client';
import path from 'path';

const SCHEMA_PATH = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

console.log('🗄️  Running database migrations...\n');

try {
  // Check if already initialized
  const isInitialized = isDatabaseInitialized();

  if (isInitialized) {
    console.log('✅ Database already initialized');
    console.log('📊 Current database statistics:\n');
    const stats = getDatabaseStats();
    for (const [table, count] of Object.entries(stats)) {
      console.log(`   ${table}: ${count} rows`);
    }
  } else {
    console.log('📦 Initializing database schema...');
    runMigration(SCHEMA_PATH);
    console.log('✅ Database schema created successfully\n');

    console.log('📊 Database statistics:\n');
    const stats = getDatabaseStats();
    for (const [table, count] of Object.entries(stats)) {
      console.log(`   ${table}: ${count} rows`);
    }
  }

  console.log('\n✨ Migration complete!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
