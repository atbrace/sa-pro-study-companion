#!/usr/bin/env tsx

import { runMigrations, getMigrationStatus } from '../src/lib/db/migrations';

console.log('Running database migrations...\n');

try {
  runMigrations();

  console.log('\nMigration status:');
  const status = getMigrationStatus();
  console.log(`Total migrations applied: ${status.totalApplied}`);

  if (status.migrations.length > 0) {
    console.log('\nApplied migrations:');
    status.migrations.forEach(m => {
      console.log(`  - ${m.name} (applied: ${m.applied_at})`);
    });
  }

  console.log('\n✓ Migrations completed successfully');
  process.exit(0);
} catch (error) {
  console.error('\n✗ Migration failed:', error);
  process.exit(1);
}
