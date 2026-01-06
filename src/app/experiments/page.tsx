import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FlaskConical, Server, DollarSign, ArrowRight, Network, Database, Zap, Cloud, Container, Workflow } from "lucide-react";

const labs = [
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

export default function ExperimentsPage() {
  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Hands-on Labs</h1>
        <p className="text-muted-foreground">
          Practice with real AWS resources deployed via CDK
        </p>
      </div>

      <div className="mb-6 p-4 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950 rounded-r-lg">
        <p className="text-sm font-medium mb-1">💰 Important: Real AWS Costs</p>
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
                  <Link href={`/experiments/${lab.id}`}>
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
