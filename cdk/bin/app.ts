#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcNetworkingLabStack } from '../lib/stacks/lab-vpc-networking';

const app = new cdk.App();

// Get lab ID from context or environment
const labId = app.node.tryGetContext('labId') || process.env.LAB_ID;

if (!labId) {
  console.error('Error: Lab ID must be provided via context or LAB_ID environment variable');
  console.error('Usage: cdk deploy -c labId=lab-vpc-networking');
  process.exit(1);
}

// Determine which lab to deploy based on labId
switch (labId) {
  case 'lab-vpc-networking':
    new VpcNetworkingLabStack(app, 'SAPStudyVpcNetworkingLab', {
      labId,
      description: 'SAP-C02 Study Lab: VPC Networking with Transit Gateway',
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      },
    });
    break;

  // Future labs will be added here
  // case 'lab-rds-multi-az':
  //   new RdsMultiAzLabStack(app, 'SAPStudyRdsMultiAzLab', { labId, ... });
  //   break;

  default:
    console.error(`Error: Unknown lab ID: ${labId}`);
    console.error('Available labs:');
    console.error('  - lab-vpc-networking');
    process.exit(1);
}

app.synth();
