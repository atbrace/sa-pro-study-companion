#!/usr/bin/env tsx

import { getContentStats, getAllDomains } from '../src/lib/content/loader';

console.log('Content Statistics\n');

try {
  const stats = getContentStats();

  console.log('Overview:');
  console.log(`  Total Domains: ${stats.totalDomains}`);
  console.log(`  Total Topics: ${stats.totalTopics}`);
  console.log(`  Total Questions: ${stats.totalQuestions}\n`);

  if (stats.domains.length === 0) {
    console.log('No domains found in content/domains/');
    console.log('Create domain directories and add content files to get started.\n');
    process.exit(0);
  }

  console.log('By Domain:');
  stats.domains.forEach(domain => {
    console.log(`\n  ${domain.name}`);
    console.log(`    ID: ${domain.id}`);
    console.log(`    Topics: ${domain.topics}`);
    console.log(`    Questions: ${domain.questions}`);
  });

  // Load full domain details
  console.log('\n\nDetailed Information:\n');
  const domains = getAllDomains();

  domains.forEach(domain => {
    console.log(`${domain.meta.name} (${domain.meta.weight}% exam weight)`);
    console.log(`  ${domain.meta.description}\n`);

    if (domain.topics.length > 0) {
      console.log('  Topics:');
      domain.topics.forEach(topic => {
        console.log(`    - ${topic.meta.name} (${topic.meta.difficulty})`);
        console.log(`      Questions: ${topic.questions.length}`);
        console.log(`      Study Time: ~${topic.meta.estimatedStudyTime} min`);
      });
    }
    console.log('');
  });

  console.log('✓ Content loaded successfully\n');
  process.exit(0);
} catch (error) {
  console.error('✗ Error loading content:', error);
  process.exit(1);
}
