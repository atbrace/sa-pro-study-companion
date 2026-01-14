import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Server, DollarSign, ArrowRight, Network, Database, Zap, Cloud, Container, Workflow, Brain, Cpu, BarChart3, GitBranch, Settings, Eye, Scale, Layers, Sparkles, Package } from "lucide-react";
import { validateExamId } from "@/lib/content/exam-loader";

interface PageProps {
  params: Promise<{ exam: string }>;
}

const sapLabs = [
  {
    id: 'lab-vpc-networking',
    title: 'VPC Networking with Peering',
    domain: 'Domain 1',
    topic: 'Network Connectivity',
    difficulty: 'intermediate' as const,
    description: 'Deploy a multi-tier VPC architecture with VPC peering, security groups, NACLs, and route table configuration.',
    resources: '2 VPCs, 6 Subnets, NAT Gateway',
    costPerHour: 0.10,
    estimatedTime: 45,
    icon: Network,
  },
  {
    id: 'lab-rds-multi-az',
    title: 'RDS Multi-AZ with Read Replicas',
    domain: 'Domain 2',
    topic: 'Database Solutions',
    difficulty: 'intermediate' as const,
    description: 'Deploy a PostgreSQL database with Multi-AZ for high availability, read replicas for read scaling, and automated backups.',
    resources: 'RDS Multi-AZ, Read Replica, VPC',
    costPerHour: 0.15,
    estimatedTime: 60,
    icon: Database,
  },
  {
    id: 'lab-lambda-api-gateway',
    title: 'Lambda + API Gateway + DynamoDB',
    domain: 'Domain 2',
    topic: 'Serverless Architectures',
    difficulty: 'intermediate' as const,
    description: 'Build a serverless REST API with Lambda functions, API Gateway, and DynamoDB for a scalable task management system.',
    resources: 'Lambda, API Gateway, DynamoDB',
    costPerHour: 0.01,
    estimatedTime: 60,
    icon: Zap,
  },
  {
    id: 'lab-s3-cloudfront',
    title: 'S3 + CloudFront Distribution',
    domain: 'Domain 2',
    topic: 'Storage Solutions',
    difficulty: 'beginner' as const,
    description: 'Deploy a static website with S3 and CloudFront for global content delivery with caching and HTTPS.',
    resources: 'S3, CloudFront, OAI',
    costPerHour: 0.05,
    estimatedTime: 60,
    icon: Cloud,
  },
  {
    id: 'lab-ecs-fargate',
    title: 'ECS Fargate with ALB',
    domain: 'Domain 2',
    topic: 'Container Architectures',
    difficulty: 'advanced' as const,
    description: 'Deploy a containerized web application using ECS Fargate with Application Load Balancer for high availability.',
    resources: 'ECS Fargate, ALB, VPC',
    costPerHour: 0.20,
    estimatedTime: 75,
    icon: Container,
  },
  {
    id: 'lab-dynamodb-dax',
    title: 'DynamoDB + DAX Caching',
    domain: 'Domain 3',
    topic: 'Performance Optimization',
    difficulty: 'advanced' as const,
    description: 'Implement DynamoDB with DAX cluster for microsecond read latency, including GSI and auto-scaling configuration.',
    resources: 'DynamoDB, DAX Cluster, VPC',
    costPerHour: 0.30,
    estimatedTime: 75,
    icon: Database,
  },
  {
    id: 'lab-step-functions',
    title: 'Step Functions Workflow Orchestration',
    domain: 'Domain 2',
    topic: 'Application Integration',
    difficulty: 'advanced' as const,
    description: 'Build a serverless order processing workflow with Step Functions, Lambda, DynamoDB, SNS, and error handling.',
    resources: 'Step Functions, Lambda, DynamoDB, SNS',
    costPerHour: 0.05,
    estimatedTime: 90,
    icon: Workflow,
  },
];

const mlaLabs = [
  {
    id: 'lab-sagemaker-studio',
    title: 'SageMaker Studio Environment',
    domain: 'Domain 1-2',
    topic: 'Development Environment',
    difficulty: 'beginner' as const,
    description: 'Set up a SageMaker Studio Domain with user profiles, IAM roles, and VPC networking for ML development.',
    resources: 'Studio Domain, User Profile, VPC',
    costPerHour: 0.05,
    estimatedTime: 45,
    icon: Settings,
  },
  {
    id: 'lab-data-wrangler',
    title: 'SageMaker Data Wrangler',
    domain: 'Domain 1',
    topic: 'Data Preparation',
    difficulty: 'beginner' as const,
    description: 'Visual data preparation with built-in transformations, data quality analysis, and target leakage detection.',
    resources: 'Data Wrangler, S3, Processing Jobs',
    costPerHour: 0.27,
    estimatedTime: 75,
    icon: Layers,
  },
  {
    id: 'lab-feature-store',
    title: 'SageMaker Feature Store',
    domain: 'Domain 1',
    topic: 'Feature Engineering',
    difficulty: 'intermediate' as const,
    description: 'Centralized feature management with online/offline stores, feature ingestion, and Athena queries.',
    resources: 'Feature Groups, DynamoDB, S3, Glue',
    costPerHour: 0.01,
    estimatedTime: 55,
    icon: Database,
  },
  {
    id: 'lab-glue-etl',
    title: 'AWS Glue ETL for ML',
    domain: 'Domain 1',
    topic: 'Data Engineering',
    difficulty: 'intermediate' as const,
    description: 'Large-scale data preparation with Glue Crawlers, PySpark ETL jobs, Data Catalog, and job bookmarks.',
    resources: 'Glue Crawler, ETL Job, Data Catalog',
    costPerHour: 0.44,
    estimatedTime: 70,
    icon: GitBranch,
  },
  {
    id: 'lab-sagemaker-training',
    title: 'SageMaker Model Training',
    domain: 'Domain 2',
    topic: 'Model Training',
    difficulty: 'intermediate' as const,
    description: 'Train models with built-in algorithms, spot instances, distributed training, and CloudWatch metrics.',
    resources: 'Training Jobs, S3, CloudWatch',
    costPerHour: 0.08,
    estimatedTime: 75,
    icon: Cpu,
  },
  {
    id: 'lab-hyperparameter-tuning',
    title: 'Hyperparameter Tuning (AMT)',
    domain: 'Domain 2',
    topic: 'Model Optimization',
    difficulty: 'intermediate' as const,
    description: 'Automatic Model Tuning with Bayesian optimization, parameter ranges, early stopping, and warm start.',
    resources: 'Tuning Jobs, Training Jobs, S3',
    costPerHour: 0.05,
    estimatedTime: 75,
    icon: BarChart3,
  },
  {
    id: 'lab-sagemaker-autopilot',
    title: 'SageMaker Autopilot (AutoML)',
    domain: 'Domain 2',
    topic: 'Automated ML',
    difficulty: 'beginner' as const,
    description: 'Automated machine learning with problem type selection, candidate pipelines, and generated notebooks.',
    resources: 'Autopilot Jobs, Training Jobs, S3',
    costPerHour: 0.05,
    estimatedTime: 105,
    icon: Sparkles,
  },
  {
    id: 'lab-sagemaker-endpoints',
    title: 'Real-time Inference Endpoints',
    domain: 'Domain 3',
    topic: 'Model Deployment',
    difficulty: 'intermediate' as const,
    description: 'Deploy endpoints with auto-scaling, A/B testing, serverless inference, and data capture.',
    resources: 'Endpoints, Auto Scaling, S3',
    costPerHour: 0.12,
    estimatedTime: 70,
    icon: Zap,
  },
  {
    id: 'lab-batch-transform',
    title: 'SageMaker Batch Transform',
    domain: 'Domain 3',
    topic: 'Batch Inference',
    difficulty: 'intermediate' as const,
    description: 'Large-scale offline inference with data splitting, input/output filters, and join source for ID correlation.',
    resources: 'Batch Transform Jobs, S3',
    costPerHour: 0.05,
    estimatedTime: 55,
    icon: Package,
  },
  {
    id: 'lab-sagemaker-pipelines',
    title: 'SageMaker Pipelines (MLOps)',
    domain: 'Domain 3',
    topic: 'ML Orchestration',
    difficulty: 'advanced' as const,
    description: 'End-to-end ML pipelines with processing, training, evaluation, conditional logic, and Model Registry.',
    resources: 'Pipelines, Processing, Training, Registry',
    costPerHour: 0.05,
    estimatedTime: 105,
    icon: Workflow,
  },
  {
    id: 'lab-model-monitor',
    title: 'SageMaker Model Monitor',
    domain: 'Domain 4',
    topic: 'Model Monitoring',
    difficulty: 'advanced' as const,
    description: 'Production monitoring with data quality baselines, model quality tracking, drift detection, and CloudWatch alarms.',
    resources: 'Monitor Schedules, Data Capture, CloudWatch',
    costPerHour: 0.05,
    estimatedTime: 85,
    icon: Eye,
  },
  {
    id: 'lab-sagemaker-clarify',
    title: 'SageMaker Clarify (Bias & Explainability)',
    domain: 'Domain 1/4',
    topic: 'Fairness & Compliance',
    difficulty: 'advanced' as const,
    description: 'Bias detection with pre/post-training analysis, SHAP explainability, and compliance-ready reports.',
    resources: 'Clarify Processing, S3',
    costPerHour: 0.12,
    estimatedTime: 85,
    icon: Scale,
  },
];

export default async function LabsPage({ params }: PageProps) {
  const { exam } = await params;

  if (!validateExamId(exam)) {
    notFound();
  }

  // Get labs for the current exam
  const labs = exam === 'mla-c01' ? mlaLabs : sapLabs;
  const examDescription = exam === 'mla-c01'
    ? 'Practice SageMaker, ML pipelines, and MLOps with real AWS resources'
    : 'Practice with real AWS resources deployed via CDK';

  // Render labs
  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hands-on Labs</h1>
        <p className="text-muted-foreground">
          {examDescription}
        </p>
      </div>

      <div className="mb-6 p-4 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950 rounded-r-lg">
        <p className="text-sm font-medium mb-1">Important: Real AWS Costs</p>
        <p className="text-sm text-muted-foreground">
          These labs use AWS CDK to deploy real infrastructure to your AWS account. Each lab includes setup commands and estimated costs.
          <strong className="block mt-1">Always run <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-xs">cdk destroy</code> when finished to avoid ongoing charges!</strong>
        </p>
      </div>

      <div className="grid gap-6">
        {labs.map((lab) => (
          <Card key={lab.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <lab.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">{lab.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{lab.domain}</Badge>
                      <Badge variant="secondary">{lab.topic}</Badge>
                      <Badge variant="outline" className="capitalize">{lab.difficulty}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {lab.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Server className="h-4 w-4" />
                    {lab.resources}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    ~${lab.costPerHour.toFixed(2)}/hr
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4" />
                    ~{lab.estimatedTime} min
                  </span>
                </div>
                <Button asChild>
                  <Link href={`/${exam}/experiments/${lab.id}`}>
                    View Lab
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
