/**
 * Lab display data for the labs listing page.
 * Technical metadata (stack files, classes) is in experiments.ts.
 */

export type LabDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LabDisplay {
  id: string;
  title: string;
  domain: string;
  topic: string;
  difficulty: LabDifficulty;
  description: string;
  resources: string;
  costPerHour: number;
  estimatedTime: number;
  iconKey: string;
}

/**
 * SAP-C02 exam labs
 */
export const SAP_LABS: LabDisplay[] = [
  {
    id: 'lab-vpc-networking',
    title: 'VPC Networking with Peering',
    domain: 'Domain 1',
    topic: 'Network Connectivity',
    difficulty: 'intermediate',
    description: 'Deploy a multi-tier VPC architecture with VPC peering, security groups, NACLs, and route table configuration.',
    resources: '2 VPCs, 6 Subnets, NAT Gateway',
    costPerHour: 0.10,
    estimatedTime: 45,
    iconKey: 'network',
  },
  {
    id: 'lab-rds-multi-az',
    title: 'RDS Multi-AZ with Read Replicas',
    domain: 'Domain 2',
    topic: 'Database Solutions',
    difficulty: 'intermediate',
    description: 'Deploy a PostgreSQL database with Multi-AZ for high availability, read replicas for read scaling, and automated backups.',
    resources: 'RDS Multi-AZ, Read Replica, VPC',
    costPerHour: 0.15,
    estimatedTime: 60,
    iconKey: 'database',
  },
  {
    id: 'lab-lambda-api-gateway',
    title: 'Lambda + API Gateway + DynamoDB',
    domain: 'Domain 2',
    topic: 'Serverless Architectures',
    difficulty: 'intermediate',
    description: 'Build a serverless REST API with Lambda functions, API Gateway, and DynamoDB for a scalable task management system.',
    resources: 'Lambda, API Gateway, DynamoDB',
    costPerHour: 0.01,
    estimatedTime: 60,
    iconKey: 'zap',
  },
  {
    id: 'lab-s3-cloudfront',
    title: 'S3 + CloudFront Distribution',
    domain: 'Domain 2',
    topic: 'Storage Solutions',
    difficulty: 'beginner',
    description: 'Deploy a static website with S3 and CloudFront for global content delivery with caching and HTTPS.',
    resources: 'S3, CloudFront, OAI',
    costPerHour: 0.05,
    estimatedTime: 60,
    iconKey: 'cloud',
  },
  {
    id: 'lab-ecs-fargate',
    title: 'ECS Fargate with ALB',
    domain: 'Domain 2',
    topic: 'Container Architectures',
    difficulty: 'advanced',
    description: 'Deploy a containerized web application using ECS Fargate with Application Load Balancer for high availability.',
    resources: 'ECS Fargate, ALB, VPC',
    costPerHour: 0.20,
    estimatedTime: 75,
    iconKey: 'container',
  },
  {
    id: 'lab-dynamodb-dax',
    title: 'DynamoDB + DAX Caching',
    domain: 'Domain 3',
    topic: 'Performance Optimization',
    difficulty: 'advanced',
    description: 'Implement DynamoDB with DAX cluster for microsecond read latency, including GSI and auto-scaling configuration.',
    resources: 'DynamoDB, DAX Cluster, VPC',
    costPerHour: 0.30,
    estimatedTime: 75,
    iconKey: 'database',
  },
  {
    id: 'lab-step-functions',
    title: 'Step Functions Workflow Orchestration',
    domain: 'Domain 2',
    topic: 'Application Integration',
    difficulty: 'advanced',
    description: 'Build a serverless order processing workflow with Step Functions, Lambda, DynamoDB, SNS, and error handling.',
    resources: 'Step Functions, Lambda, DynamoDB, SNS',
    costPerHour: 0.05,
    estimatedTime: 90,
    iconKey: 'workflow',
  },
];

/**
 * MLA-C01 exam labs
 */
export const MLA_LABS: LabDisplay[] = [
  {
    id: 'lab-sagemaker-studio',
    title: 'SageMaker Studio Environment',
    domain: 'Domain 1-2',
    topic: 'Development Environment',
    difficulty: 'beginner',
    description: 'Set up a SageMaker Studio Domain with user profiles, IAM roles, and VPC networking for ML development.',
    resources: 'Studio Domain, User Profile, VPC',
    costPerHour: 0.05,
    estimatedTime: 45,
    iconKey: 'settings',
  },
  {
    id: 'lab-data-wrangler',
    title: 'SageMaker Data Wrangler',
    domain: 'Domain 1',
    topic: 'Data Preparation',
    difficulty: 'beginner',
    description: 'Visual data preparation with built-in transformations, data quality analysis, and target leakage detection.',
    resources: 'Data Wrangler, S3, Processing Jobs',
    costPerHour: 0.27,
    estimatedTime: 75,
    iconKey: 'layers',
  },
  {
    id: 'lab-feature-store',
    title: 'SageMaker Feature Store',
    domain: 'Domain 1',
    topic: 'Feature Engineering',
    difficulty: 'intermediate',
    description: 'Centralized feature management with online/offline stores, feature ingestion, and Athena queries.',
    resources: 'Feature Groups, DynamoDB, S3, Glue',
    costPerHour: 0.01,
    estimatedTime: 55,
    iconKey: 'database',
  },
  {
    id: 'lab-glue-etl',
    title: 'AWS Glue ETL for ML',
    domain: 'Domain 1',
    topic: 'Data Engineering',
    difficulty: 'intermediate',
    description: 'Large-scale data preparation with Glue Crawlers, PySpark ETL jobs, Data Catalog, and job bookmarks.',
    resources: 'Glue Crawler, ETL Job, Data Catalog',
    costPerHour: 0.44,
    estimatedTime: 70,
    iconKey: 'git-branch',
  },
  {
    id: 'lab-sagemaker-training',
    title: 'SageMaker Model Training',
    domain: 'Domain 2',
    topic: 'Model Training',
    difficulty: 'intermediate',
    description: 'Train models with built-in algorithms, spot instances, distributed training, and CloudWatch metrics.',
    resources: 'Training Jobs, S3, CloudWatch',
    costPerHour: 0.08,
    estimatedTime: 75,
    iconKey: 'cpu',
  },
  {
    id: 'lab-hyperparameter-tuning',
    title: 'Hyperparameter Tuning (AMT)',
    domain: 'Domain 2',
    topic: 'Model Optimization',
    difficulty: 'intermediate',
    description: 'Automatic Model Tuning with Bayesian optimization, parameter ranges, early stopping, and warm start.',
    resources: 'Tuning Jobs, Training Jobs, S3',
    costPerHour: 0.05,
    estimatedTime: 75,
    iconKey: 'bar-chart',
  },
  {
    id: 'lab-sagemaker-autopilot',
    title: 'SageMaker Autopilot (AutoML)',
    domain: 'Domain 2',
    topic: 'Automated ML',
    difficulty: 'beginner',
    description: 'Automated machine learning with problem type selection, candidate pipelines, and generated notebooks.',
    resources: 'Autopilot Jobs, Training Jobs, S3',
    costPerHour: 0.05,
    estimatedTime: 105,
    iconKey: 'sparkles',
  },
  {
    id: 'lab-sagemaker-endpoints',
    title: 'Real-time Inference Endpoints',
    domain: 'Domain 3',
    topic: 'Model Deployment',
    difficulty: 'intermediate',
    description: 'Deploy endpoints with auto-scaling, A/B testing, serverless inference, and data capture.',
    resources: 'Endpoints, Auto Scaling, S3',
    costPerHour: 0.12,
    estimatedTime: 70,
    iconKey: 'zap',
  },
  {
    id: 'lab-batch-transform',
    title: 'SageMaker Batch Transform',
    domain: 'Domain 3',
    topic: 'Batch Inference',
    difficulty: 'intermediate',
    description: 'Large-scale offline inference with data splitting, input/output filters, and join source for ID correlation.',
    resources: 'Batch Transform Jobs, S3',
    costPerHour: 0.05,
    estimatedTime: 55,
    iconKey: 'package',
  },
  {
    id: 'lab-sagemaker-pipelines',
    title: 'SageMaker Pipelines (MLOps)',
    domain: 'Domain 3',
    topic: 'ML Orchestration',
    difficulty: 'advanced',
    description: 'End-to-end ML pipelines with processing, training, evaluation, conditional logic, and Model Registry.',
    resources: 'Pipelines, Processing, Training, Registry',
    costPerHour: 0.05,
    estimatedTime: 105,
    iconKey: 'workflow',
  },
  {
    id: 'lab-model-monitor',
    title: 'SageMaker Model Monitor',
    domain: 'Domain 4',
    topic: 'Model Monitoring',
    difficulty: 'advanced',
    description: 'Production monitoring with data quality baselines, model quality tracking, drift detection, and CloudWatch alarms.',
    resources: 'Monitor Schedules, Data Capture, CloudWatch',
    costPerHour: 0.05,
    estimatedTime: 85,
    iconKey: 'eye',
  },
  {
    id: 'lab-sagemaker-clarify',
    title: 'SageMaker Clarify (Bias & Explainability)',
    domain: 'Domain 1/4',
    topic: 'Fairness & Compliance',
    difficulty: 'advanced',
    description: 'Bias detection with pre/post-training analysis, SHAP explainability, and compliance-ready reports.',
    resources: 'Clarify Processing, S3',
    costPerHour: 0.12,
    estimatedTime: 85,
    iconKey: 'scale',
  },
];

/**
 * Get labs for a specific exam
 */
export function getLabsForExam(examId: string): LabDisplay[] {
  return examId === 'mla-c01' ? MLA_LABS : SAP_LABS;
}

/**
 * Get exam description for labs page
 */
export function getLabsDescription(examId: string): string {
  return examId === 'mla-c01'
    ? 'Practice SageMaker, ML pipelines, and MLOps with real AWS resources'
    : 'Practice with real AWS resources deployed via CDK';
}
