#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

// SAP-C02 Labs
import { VpcNetworkingLabStack } from '../lib/stacks/lab-vpc-networking';

// MLA-C01 Labs
import { SageMakerStudioLabStack } from '../lib/stacks/lab-sagemaker-studio';
import { FeatureStoreLabStack } from '../lib/stacks/lab-feature-store';
import { DataWranglerLabStack } from '../lib/stacks/lab-data-wrangler';
import { GlueEtlLabStack } from '../lib/stacks/lab-glue-etl';
import { SageMakerTrainingLabStack } from '../lib/stacks/lab-sagemaker-training';
import { HyperparameterTuningLabStack } from '../lib/stacks/lab-hyperparameter-tuning';
import { SageMakerAutopilotLabStack } from '../lib/stacks/lab-sagemaker-autopilot';
import { SageMakerEndpointsLabStack } from '../lib/stacks/lab-sagemaker-endpoints';
import { BatchTransformLabStack } from '../lib/stacks/lab-batch-transform';
import { SageMakerPipelinesLabStack } from '../lib/stacks/lab-sagemaker-pipelines';
import { ModelMonitorLabStack } from '../lib/stacks/lab-model-monitor';
import { SageMakerClarifyLabStack } from '../lib/stacks/lab-sagemaker-clarify';

const app = new cdk.App();

// Get lab ID from context or environment
const labId = app.node.tryGetContext('labId') || process.env.LAB_ID;

if (!labId) {
  console.error('Error: Lab ID must be provided via context or LAB_ID environment variable');
  console.error('Usage: cdk deploy -c labId=<lab-id>');
  console.error('');
  console.error('Available SAP-C02 labs:');
  console.error('  - lab-vpc-networking');
  console.error('');
  console.error('Available MLA-C01 labs:');
  console.error('  - lab-sagemaker-studio');
  console.error('  - lab-feature-store');
  console.error('  - lab-data-wrangler');
  console.error('  - lab-glue-etl');
  console.error('  - lab-sagemaker-training');
  console.error('  - lab-hyperparameter-tuning');
  console.error('  - lab-sagemaker-autopilot');
  console.error('  - lab-sagemaker-endpoints');
  console.error('  - lab-batch-transform');
  console.error('  - lab-sagemaker-pipelines');
  console.error('  - lab-model-monitor');
  console.error('  - lab-sagemaker-clarify');
  process.exit(1);
}

const commonProps = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
};

// Determine which lab to deploy based on labId
switch (labId) {
  // ======================
  // SAP-C02 Labs
  // ======================
  case 'lab-vpc-networking':
    new VpcNetworkingLabStack(app, 'SAPStudyVpcNetworkingLab', {
      ...commonProps,
      labId,
      description: 'SAP-C02 Study Lab: VPC Networking with Transit Gateway',
    });
    break;

  // ======================
  // MLA-C01 Labs - Domain 1: Data Preparation
  // ======================
  case 'lab-sagemaker-studio':
    new SageMakerStudioLabStack(app, 'MLAStudySageMakerStudioLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Studio Setup and Exploration',
    });
    break;

  case 'lab-feature-store':
    new FeatureStoreLabStack(app, 'MLAStudyFeatureStoreLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Feature Store',
    });
    break;

  case 'lab-data-wrangler':
    new DataWranglerLabStack(app, 'MLAStudyDataWranglerLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Data Wrangler',
    });
    break;

  case 'lab-glue-etl':
    new GlueEtlLabStack(app, 'MLAStudyGlueEtlLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: AWS Glue ETL for ML Data Preparation',
    });
    break;

  // ======================
  // MLA-C01 Labs - Domain 2: Model Development
  // ======================
  case 'lab-sagemaker-training':
    new SageMakerTrainingLabStack(app, 'MLAStudySageMakerTrainingLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Model Training',
    });
    break;

  case 'lab-hyperparameter-tuning':
    new HyperparameterTuningLabStack(app, 'MLAStudyHyperparameterTuningLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Automatic Model Tuning',
    });
    break;

  case 'lab-sagemaker-autopilot':
    new SageMakerAutopilotLabStack(app, 'MLAStudySageMakerAutopilotLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Autopilot (AutoML)',
    });
    break;

  // ======================
  // MLA-C01 Labs - Domain 3: Deployment & Orchestration
  // ======================
  case 'lab-sagemaker-endpoints':
    new SageMakerEndpointsLabStack(app, 'MLAStudySageMakerEndpointsLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Real-time Inference Endpoints',
    });
    break;

  case 'lab-batch-transform':
    new BatchTransformLabStack(app, 'MLAStudyBatchTransformLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Batch Transform',
    });
    break;

  case 'lab-sagemaker-pipelines':
    new SageMakerPipelinesLabStack(app, 'MLAStudySageMakerPipelinesLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker ML Pipelines',
    });
    break;

  // ======================
  // MLA-C01 Labs - Domain 4: Monitoring & Security
  // ======================
  case 'lab-model-monitor':
    new ModelMonitorLabStack(app, 'MLAStudyModelMonitorLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Model Monitor',
    });
    break;

  case 'lab-sagemaker-clarify':
    new SageMakerClarifyLabStack(app, 'MLAStudySageMakerClarifyLab', {
      ...commonProps,
      labId,
      description: 'MLA-C01 Study Lab: SageMaker Clarify (Bias and Explainability)',
    });
    break;

  default:
    console.error(`Error: Unknown lab ID: ${labId}`);
    console.error('');
    console.error('Available SAP-C02 labs:');
    console.error('  - lab-vpc-networking');
    console.error('');
    console.error('Available MLA-C01 labs:');
    console.error('  - lab-sagemaker-studio');
    console.error('  - lab-feature-store');
    console.error('  - lab-data-wrangler');
    console.error('  - lab-glue-etl');
    console.error('  - lab-sagemaker-training');
    console.error('  - lab-hyperparameter-tuning');
    console.error('  - lab-sagemaker-autopilot');
    console.error('  - lab-sagemaker-endpoints');
    console.error('  - lab-batch-transform');
    console.error('  - lab-sagemaker-pipelines');
    console.error('  - lab-model-monitor');
    console.error('  - lab-sagemaker-clarify');
    process.exit(1);
}

app.synth();
