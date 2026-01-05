#!/usr/bin/env tsx

import { getAllDomains } from '../src/lib/content/loader';

console.log('Validating content structure...\n');

let hasErrors = false;

try {
  const domains = getAllDomains();

  if (domains.length === 0) {
    console.log('⚠️  No domains found in content/domains/');
    console.log('This is expected for a new project.\n');
    process.exit(0);
  }

  domains.forEach(domain => {
    console.log(`Checking ${domain.meta.name}...`);

    // Check required metadata
    if (!domain.meta.id || !domain.meta.name || !domain.meta.weight) {
      console.error(`  ✗ Missing required metadata in meta.yaml`);
      hasErrors = true;
    } else {
      console.log(`  ✓ Metadata valid`);
    }

    // Check topics
    if (domain.topics.length === 0) {
      console.log(`  ⚠️  No topics found`);
    } else {
      console.log(`  ✓ ${domain.topics.length} topic(s) found`);

      domain.topics.forEach(topic => {
        console.log(`    Checking ${topic.meta.name}...`);

        // Check topic metadata
        if (!topic.meta.id || !topic.meta.name || !topic.meta.difficulty) {
          console.error(`      ✗ Missing required metadata`);
          hasErrors = true;
        }

        // Check questions
        if (topic.questions.length === 0) {
          console.log(`      ⚠️  No questions found`);
        } else {
          console.log(`      ✓ ${topic.questions.length} question(s) found`);

          // Validate each question
          topic.questions.forEach((q, idx) => {
            if (!q.id || !q.text || !q.correctAnswer) {
              console.error(`        ✗ Question ${idx + 1} (${q.id}) missing required fields`);
              hasErrors = true;
            }

            if (q.type === 'multi' && !q.correctCount) {
              console.error(`        ✗ Multi-select question ${q.id} missing correctCount`);
              hasErrors = true;
            }

            if (q.options.length < 2) {
              console.error(`        ✗ Question ${q.id} has fewer than 2 options`);
              hasErrors = true;
            }
          });
        }

        // Check content
        if (!topic.content) {
          console.log(`      ⚠️  No content.md found`);
        } else {
          console.log(`      ✓ Content file loaded`);
        }
      });
    }

    console.log('');
  });

  if (hasErrors) {
    console.error('✗ Validation failed with errors\n');
    process.exit(1);
  } else {
    console.log('✓ All content validated successfully\n');
    process.exit(0);
  }
} catch (error) {
  console.error('✗ Validation error:', error);
  process.exit(1);
}
