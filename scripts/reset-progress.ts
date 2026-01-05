#!/usr/bin/env tsx

import { db } from '../src/lib/db/client';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question('⚠️  This will delete ALL user progress data. Are you sure? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function resetProgress() {
  console.log('Database Progress Reset Tool\n');

  const confirmed = await askConfirmation();

  if (!confirmed) {
    console.log('\nReset cancelled');
    process.exit(0);
  }

  try {
    console.log('\nResetting progress...');

    // Delete all user progress data
    db.prepare('DELETE FROM topic_progress').run();
    db.prepare('DELETE FROM question_attempts').run();
    db.prepare('DELETE FROM assessment_sessions').run();
    db.prepare('DELETE FROM study_sessions').run();
    db.prepare('DELETE FROM weak_areas').run();
    db.prepare('DELETE FROM tutor_conversations').run();
    db.prepare('DELETE FROM experiment_deployments').run();

    console.log('\n✓ All progress data has been reset');
    console.log('Note: Content data (domains, topics, questions) is preserved');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Reset failed:', error);
    process.exit(1);
  }
}

resetProgress();
