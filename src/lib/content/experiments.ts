import fs from 'fs';
import path from 'path';
import type { Lab, LabMeta } from '@/types/experiment';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'experiments');
const CDK_STACKS_DIR = path.join(process.cwd(), 'cdk', 'lib', 'stacks');

/**
 * Lab metadata registry
 * This matches the structure previously in the page component
 */
export const LABS_METADATA: Record<string, LabMeta> = {
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

  // Load lab guide from content directory
  const guidePath = path.join(CONTENT_DIR, labId, 'README.md');
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
