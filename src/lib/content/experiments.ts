import fs from 'fs';
import path from 'path';
import type { Lab, LabMeta } from '@/types/experiment';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'experiments');
const CDK_STACKS_DIR = path.join(process.cwd(), 'cdk', 'lib', 'stacks');

/**
 * Lab metadata registry
 * SAP-C02 labs are in content/experiments/{lab-id}/
 * MLA-C01 labs are in content/experiments/mla-c01/{lab-id}/
 */
export const LABS_METADATA: Record<string, LabMeta> = {
  // SAP-C02 Labs
  'lab-vpc-networking': {
    id: 'lab-vpc-networking',
    name: 'VPC Networking with Peering',
    stackFile: 'lab-vpc-networking.ts',
    stackClass: 'VpcNetworkingLabStack',
    estimatedCost: '~$0.10/hour',
    estimatedTime: 45,
  },
  'lab-rds-multi-az': {
    id: 'lab-rds-multi-az',
    name: 'RDS Multi-AZ with Read Replicas',
    stackFile: 'lab-rds-multi-az.ts',
    stackClass: 'RdsMultiAzLabStack',
    estimatedCost: '~$0.15/hour',
    estimatedTime: 60,
  },
  'lab-lambda-api-gateway': {
    id: 'lab-lambda-api-gateway',
    name: 'Lambda + API Gateway + DynamoDB',
    stackFile: 'lab-lambda-api-gateway.ts',
    stackClass: 'LambdaApiGatewayLabStack',
    estimatedCost: '~$0.01/hour',
    estimatedTime: 60,
  },
  'lab-s3-cloudfront': {
    id: 'lab-s3-cloudfront',
    name: 'S3 + CloudFront Distribution',
    stackFile: 'lab-s3-cloudfront.ts',
    stackClass: 'S3CloudFrontLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 60,
  },
  'lab-ecs-fargate': {
    id: 'lab-ecs-fargate',
    name: 'ECS Fargate with ALB',
    stackFile: 'lab-ecs-fargate.ts',
    stackClass: 'EcsFargateLabStack',
    estimatedCost: '~$0.20/hour',
    estimatedTime: 75,
  },
  'lab-dynamodb-dax': {
    id: 'lab-dynamodb-dax',
    name: 'DynamoDB + DAX Caching',
    stackFile: 'lab-dynamodb-dax.ts',
    stackClass: 'DynamoDbDaxLabStack',
    estimatedCost: '~$0.30/hour',
    estimatedTime: 75,
  },
  'lab-step-functions': {
    id: 'lab-step-functions',
    name: 'Step Functions Workflow Orchestration',
    stackFile: 'lab-step-functions.ts',
    stackClass: 'StepFunctionsLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 90,
  },
  // MLA-C01 Labs
  'lab-sagemaker-studio': {
    id: 'lab-sagemaker-studio',
    name: 'SageMaker Studio Environment',
    stackFile: 'lab-sagemaker-studio.ts',
    stackClass: 'SageMakerStudioLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 45,
    exam: 'mla-c01',
  },
  'lab-data-wrangler': {
    id: 'lab-data-wrangler',
    name: 'SageMaker Data Wrangler',
    stackFile: 'lab-data-wrangler.ts',
    stackClass: 'DataWranglerLabStack',
    estimatedCost: '~$0.27/hour',
    estimatedTime: 75,
    exam: 'mla-c01',
  },
  'lab-feature-store': {
    id: 'lab-feature-store',
    name: 'SageMaker Feature Store',
    stackFile: 'lab-feature-store.ts',
    stackClass: 'FeatureStoreLabStack',
    estimatedCost: '~$0.01/hour',
    estimatedTime: 55,
    exam: 'mla-c01',
  },
  'lab-glue-etl': {
    id: 'lab-glue-etl',
    name: 'AWS Glue ETL for ML',
    stackFile: 'lab-glue-etl.ts',
    stackClass: 'GlueEtlLabStack',
    estimatedCost: '~$0.44/hour',
    estimatedTime: 70,
    exam: 'mla-c01',
  },
  'lab-sagemaker-training': {
    id: 'lab-sagemaker-training',
    name: 'SageMaker Model Training',
    stackFile: 'lab-sagemaker-training.ts',
    stackClass: 'SageMakerTrainingLabStack',
    estimatedCost: '~$0.08/hour',
    estimatedTime: 75,
    exam: 'mla-c01',
  },
  'lab-hyperparameter-tuning': {
    id: 'lab-hyperparameter-tuning',
    name: 'Hyperparameter Tuning (AMT)',
    stackFile: 'lab-hyperparameter-tuning.ts',
    stackClass: 'HyperparameterTuningLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 75,
    exam: 'mla-c01',
  },
  'lab-sagemaker-autopilot': {
    id: 'lab-sagemaker-autopilot',
    name: 'SageMaker Autopilot (AutoML)',
    stackFile: 'lab-sagemaker-autopilot.ts',
    stackClass: 'SageMakerAutopilotLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 105,
    exam: 'mla-c01',
  },
  'lab-sagemaker-endpoints': {
    id: 'lab-sagemaker-endpoints',
    name: 'Real-time Inference Endpoints',
    stackFile: 'lab-sagemaker-endpoints.ts',
    stackClass: 'SageMakerEndpointsLabStack',
    estimatedCost: '~$0.12/hour',
    estimatedTime: 70,
    exam: 'mla-c01',
  },
  'lab-batch-transform': {
    id: 'lab-batch-transform',
    name: 'SageMaker Batch Transform',
    stackFile: 'lab-batch-transform.ts',
    stackClass: 'BatchTransformLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 55,
    exam: 'mla-c01',
  },
  'lab-sagemaker-pipelines': {
    id: 'lab-sagemaker-pipelines',
    name: 'SageMaker Pipelines (MLOps)',
    stackFile: 'lab-sagemaker-pipelines.ts',
    stackClass: 'SageMakerPipelinesLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 105,
    exam: 'mla-c01',
  },
  'lab-model-monitor': {
    id: 'lab-model-monitor',
    name: 'SageMaker Model Monitor',
    stackFile: 'lab-model-monitor.ts',
    stackClass: 'ModelMonitorLabStack',
    estimatedCost: '~$0.05/hour',
    estimatedTime: 85,
    exam: 'mla-c01',
  },
  'lab-sagemaker-clarify': {
    id: 'lab-sagemaker-clarify',
    name: 'SageMaker Clarify (Bias & Explainability)',
    stackFile: 'lab-sagemaker-clarify.ts',
    stackClass: 'SageMakerClarifyLabStack',
    estimatedCost: '~$0.12/hour',
    estimatedTime: 85,
    exam: 'mla-c01',
  },
};

/**
 * Get all available lab IDs
 */
export function getAllLabIds(): string[] {
  return Object.keys(LABS_METADATA);
}

/**
 * Get metadata for a specific lab
 */
export function getLabMeta(labId: string): LabMeta | null {
  return LABS_METADATA[labId] || null;
}

/**
 * Get a specific lab by ID with all content loaded from filesystem
 */
export function getLabById(labId: string): Lab | null {
  const meta = LABS_METADATA[labId];

  if (!meta) {
    return null;
  }

  // Determine content directory based on exam type
  // MLA-C01 labs are in content/experiments/mla-c01/{lab-id}/
  // SAP-C02 labs are in content/experiments/{lab-id}/
  const labContentDir = meta.exam === 'mla-c01'
    ? path.join(CONTENT_DIR, 'mla-c01', labId)
    : path.join(CONTENT_DIR, labId);

  // Load lab guide from content directory
  const guidePath = path.join(labContentDir, 'README.md');
  if (!fs.existsSync(guidePath)) {
    console.warn('Lab guide not found:', guidePath);
    return null;
  }
  const guide = fs.readFileSync(guidePath, 'utf8');

  // Load stack code from CDK stacks directory
  const stackPath = path.join(CDK_STACKS_DIR, meta.stackFile);
  let stackCode: string;

  if (fs.existsSync(stackPath)) {
    stackCode = fs.readFileSync(stackPath, 'utf8');
  } else {
    // Fallback placeholder if stack file doesn't exist
    stackCode = `// Stack code for ${meta.name}\n// See cdk/lib/stacks/${meta.stackFile} in the repository`;
  }

  return {
    meta,
    guide,
    stackCode,
  };
}

/**
 * Check if a lab exists
 */
export function labExists(labId: string): boolean {
  return labId in LABS_METADATA;
}
