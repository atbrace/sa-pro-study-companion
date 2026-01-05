#!/usr/bin/env tsx

import { db } from '../src/lib/db/client';

console.log('Testing database operations...\n');

try {
  // Test 1: List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{ name: string }>;
  console.log('✓ Tables created:');
  tables.forEach(t => console.log(`  - ${t.name}`));

  // Test 2: Insert and retrieve topic progress
  console.log('\n✓ Testing topic_progress table...');
  db.prepare(`
    INSERT INTO topic_progress (domain_id, topic_id, mastery_level, questions_attempted, questions_correct)
    VALUES (?, ?, ?, ?, ?)
  `).run('domain-1-organizational-complexity', 'network-connectivity', 0.5, 10, 5);

  const progress = db.prepare('SELECT * FROM topic_progress WHERE domain_id = ?').get('domain-1-organizational-complexity');
  console.log('  Inserted and retrieved:', progress);

  // Test 3: Test assessment session
  console.log('\n✓ Testing assessment_sessions table...');
  db.prepare(`
    INSERT INTO assessment_sessions (domain_id, session_type, total_questions, correct_answers, score_percentage, started_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('domain-1-organizational-complexity', 'initial', 15, 12, 80.0, new Date().toISOString());

  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM assessment_sessions').get() as { count: number };
  console.log(`  Assessment sessions: ${sessionCount.count}`);

  // Test 4: Clean up test data
  console.log('\n✓ Cleaning up test data...');
  db.prepare('DELETE FROM topic_progress').run();
  db.prepare('DELETE FROM assessment_sessions').run();

  console.log('\n✅ All database operations working correctly!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Database test failed:', error);
  process.exit(1);
}
