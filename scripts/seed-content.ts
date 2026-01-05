#!/usr/bin/env tsx

import { db } from '../src/lib/db/client';

console.log('Seeding database with initial content...\n');

try {
  // This script will eventually load content from content/ directory
  // For now, we'll just verify the database is accessible

  const result = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type = ?').get('table') as { count: number };
  console.log(`Database has ${result.count} tables`);

  // Future: Load domains, topics, and questions from YAML/MD files
  // and insert into appropriate tables

  console.log('\n✓ Content seeding completed successfully');
  console.log('Note: Full content loading will be implemented after content structure is created');
  process.exit(0);
} catch (error) {
  console.error('\n✗ Seeding failed:', error);
  process.exit(1);
}
