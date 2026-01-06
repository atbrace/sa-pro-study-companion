import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * ECS Fargate with Application Load Balancer Lab
 *
 * Demonstrates:
 * - ECS cluster with Fargate launch type
 * - Task definitions and container configuration
 * - ECS service with auto-scaling
 * - Application Load Balancer with target groups
 * - Service discovery and health checks
 * - CloudWatch Logs for container monitoring
 * - Rolling deployment strategies
 * - VPC networking for containerized workloads
 *
 * Cost Estimate: ~$0.20/hour
 * - Fargate tasks: 2 x 0.25 vCPU, 0.5 GB = ~$0.012/hour
 * - Application Load Balancer: $0.0225/hour
 * - Data processing (ALB): $0.008/GB
 * - NAT Gateway: $0.045/hour
 * - CloudWatch Logs: minimal for testing
 */
export class EcsFargateLabStack extends BaseLabStack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.20,
    });

    // ======================
    // VPC Configuration
    // ======================
    this.vpc = new ec2.Vpc(this, 'EcsVpc', {
      vpcName: 'sap-study-ecs-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1, // Use 1 for cost savings
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    cdk.Tags.of(this.vpc).add('Name', 'ECS Fargate Lab VPC');

    // ======================
    // ECS Cluster
    // ======================
    this.cluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: 'sap-study-ecs-cluster',
      vpc: this.vpc,
      containerInsights: true, // Enable CloudWatch Container Insights
    });

    // ======================
    // CloudWatch Log Group
    // ======================
    const logGroup = new logs.LogGroup(this, 'EcsServiceLogGroup', {
      logGroupName: '/ecs/sap-study-nginx-service',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ======================
    // Task Execution Role
    // ======================
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'ECS Task Execution Role for Fargate tasks',
    });

    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')
    );

    // ======================
    // Task Role (for container runtime)
    // ======================
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'ECS Task Role for container permissions',
    });

    // Add permissions for CloudWatch Logs
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [logGroup.logGroupArn],
      })
    );

    // ======================
    // Task Definition
    // ======================
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: 'sap-study-nginx-task',
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512, // 0.5 GB
      executionRole,
      taskRole,
    });

    // Add nginx container
    const container = taskDefinition.addContainer('nginx', {
      containerName: 'nginx',
      image: ecs.ContainerImage.fromRegistry('nginx:alpine'),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: 'nginx',
        logGroup,
      }),
      portMappings: [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP,
        },
      ],
      environment: {
        ENVIRONMENT: 'sap-study-lab',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // ======================
    // Application Load Balancer
    // ======================
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      loadBalancerName: 'sap-study-ecs-alb',
      vpc: this.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    cdk.Tags.of(this.alb).add('Name', 'ECS Fargate Lab ALB');

    // Create target group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: 'sap-study-ecs-tg',
      vpc: this.vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP, // Required for Fargate
      healthCheck: {
        enabled: true,
        path: '/',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        timeout: cdk.Duration.seconds(5),
        interval: cdk.Duration.seconds(30),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Add listener
    const listener = this.alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // ======================
    // Security Groups
    // ======================

    // ALB Security Group
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from internet'
    );

    this.alb.addSecurityGroup(albSecurityGroup);

    cdk.Tags.of(albSecurityGroup).add('Name', 'ALB Security Group');

    // ECS Service Security Group
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ECS Fargate tasks',
      allowAllOutbound: true,
    });

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(80),
      'Allow traffic from ALB'
    );

    cdk.Tags.of(ecsSecurityGroup).add('Name', 'ECS Tasks Security Group');

    // ======================
    // ECS Service
    // ======================
    this.service = new ecs.FargateService(this, 'EcsService', {
      serviceName: 'sap-study-nginx-service',
      cluster: this.cluster,
      taskDefinition,
      desiredCount: 2, // Run 2 tasks for HA
      minHealthyPercent: 50, // Allow 1 task to be stopped during deployment
      maxHealthyPercent: 200, // Allow 2 additional tasks during deployment
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS, // Rolling update strategy
      },
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      enableExecuteCommand: true, // Enable ECS Exec for debugging
    });

    // Attach service to target group
    this.service.attachToApplicationTargetGroup(targetGroup);

    // ======================
    // Auto Scaling
    // ======================
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 6,
    });

    // Scale based on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale based on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale based on ALB request count
    scaling.scaleOnRequestCount('RequestCountScaling', {
      requestsPerTarget: 1000,
      targetGroup,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ======================
    // CloudFormation Outputs
    // ======================

    // VPC Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${id}-VpcId`,
    });

    this.addConsoleUrlOutput(
      'VpcConsoleUrl',
      this.getVpcConsoleUrl(this.vpc.vpcId),
      'Console URL for VPC'
    );

    // ECS Cluster Outputs
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster name',
      exportName: `${id}-ClusterName`,
    });

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: this.cluster.clusterArn,
      description: 'ECS Cluster ARN',
    });

    this.addConsoleUrlOutput(
      'ClusterConsoleUrl',
      `https://${this.region}.console.aws.amazon.com/ecs/v2/clusters/${this.cluster.clusterName}`,
      'Console URL for ECS Cluster'
    );

    // ECS Service Outputs
    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service name',
      exportName: `${id}-ServiceName`,
    });

    new cdk.CfnOutput(this, 'ServiceArn', {
      value: this.service.serviceArn,
      description: 'ECS Service ARN',
    });

    this.addConsoleUrlOutput(
      'ServiceConsoleUrl',
      `https://${this.region}.console.aws.amazon.com/ecs/v2/clusters/${this.cluster.clusterName}/services/${this.service.serviceName}`,
      'Console URL for ECS Service'
    );

    // Task Definition Outputs
    new cdk.CfnOutput(this, 'TaskDefinitionArn', {
      value: taskDefinition.taskDefinitionArn,
      description: 'Task Definition ARN',
    });

    this.addConsoleUrlOutput(
      'TaskDefinitionConsoleUrl',
      `https://${this.region}.console.aws.amazon.com/ecs/v2/task-definitions/${taskDefinition.family}`,
      'Console URL for Task Definition'
    );

    // ALB Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS name',
      exportName: `${id}-AlbDnsName`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: `http://${this.alb.loadBalancerDnsName}`,
      description: 'Application URL (HTTP)',
    });

    this.addConsoleUrlOutput(
      'LoadBalancerConsoleUrl',
      `https://${this.region}.console.aws.amazon.com/ec2/v2/home?region=${this.region}#LoadBalancers:search=${this.alb.loadBalancerArn.split('/')[1]}`,
      'Console URL for Application Load Balancer'
    );

    new cdk.CfnOutput(this, 'TargetGroupArn', {
      value: targetGroup.targetGroupArn,
      description: 'Target Group ARN',
    });

    // CloudWatch Logs Outputs
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group name',
    });

    this.addConsoleUrlOutput(
      'LogGroupConsoleUrl',
      `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/${encodeURIComponent(logGroup.logGroupName)}`,
      'Console URL for CloudWatch Logs'
    );

    // Security Group Outputs
    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: albSecurityGroup.securityGroupId,
      description: 'ALB Security Group ID',
    });

    new cdk.CfnOutput(this, 'EcsSecurityGroupId', {
      value: ecsSecurityGroup.securityGroupId,
      description: 'ECS Tasks Security Group ID',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'ECS Fargate Architecture:',
        `- VPC: ${this.vpc.vpcCidrBlock} with public and private subnets across 2 AZs`,
        `- ECS Cluster: ${this.cluster.clusterName} with Container Insights enabled`,
        `- Fargate Service: ${this.service.serviceName} running 2-6 nginx tasks (auto-scaling)`,
        `- Application Load Balancer: ${this.alb.loadBalancerName}`,
        '- Auto-scaling based on CPU, memory, and request count',
        `- CloudWatch Logs: ${logGroup.logGroupName}`,
        '- Rolling deployment with 50% min healthy, 200% max healthy',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
