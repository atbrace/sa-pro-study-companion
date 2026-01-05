#!/usr/bin/env tsx

import { db } from '../src/lib/db/client';

console.log('AWS Experiment Cleanup Tool\n');

try {
  // Get all deployed experiments
  const deployments = db.prepare(`
    SELECT * FROM experiment_deployments
    WHERE status IN ('deploying', 'deployed')
    ORDER BY created_at DESC
  `).all();

  if (deployments.length === 0) {
    console.log('No active deployments found');
    process.exit(0);
  }

  console.log(`Found ${deployments.length} active deployment(s):\n`);

  deployments.forEach((deployment: any) => {
    console.log(`  - ${deployment.lab_id} (${deployment.stack_name})`);
    console.log(`    Status: ${deployment.status}`);
    console.log(`    Deployed: ${deployment.deployed_at || 'in progress'}\n`);
  });

  console.log('⚠️  To destroy these stacks, run:');
  deployments.forEach((deployment: any) => {
    console.log(`  pnpm cdk:destroy ${deployment.lab_id}`);
  });

  console.log('\nOr destroy all at once with: pnpm cdk:cleanup');

  // Future: Implement actual CDK destroy commands here
  // For now, this script just lists what needs to be cleaned up

  process.exit(0);
} catch (error) {
  console.error('\n✗ Cleanup check failed:', error);
  process.exit(1);
}
