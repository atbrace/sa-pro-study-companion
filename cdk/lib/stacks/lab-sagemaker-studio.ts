import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Studio Lab
 *
 * Demonstrates:
 * - SageMaker Studio Domain setup
 * - User profile configuration
 * - IAM roles for SageMaker execution
 * - VPC configuration for secure ML environments
 * - S3 bucket for artifacts and data
 *
 * Cost Estimate: ~$0.00/hour when idle
 * - Studio Domain: Free when no apps running
 * - S3: Minimal storage costs
 * - VPC: No charge for VPC itself
 * - Charges only when Studio apps/notebooks are launched
 */
export class SageMakerStudioLabStack extends BaseLabStack {
  public readonly vpc: ec2.Vpc;
  public readonly studioBucket: s3.Bucket;
  public readonly executionRole: iam.Role;
  public readonly studioDomain: sagemaker.CfnDomain;
  public readonly userProfile: sagemaker.CfnUserProfile;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.0,
    });

    // ======================
    // VPC for SageMaker Studio
    // ======================
    this.vpc = new ec2.Vpc(this, 'StudioVpc', {
      vpcName: 'mla-study-studio-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1,
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

    cdk.Tags.of(this.vpc).add('Name', 'MLA Study Studio VPC');

    // ======================
    // S3 Bucket for Studio Artifacts
    // ======================
    this.studioBucket = new s3.Bucket(this, 'StudioBucket', {
      bucketName: `mla-study-studio-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldObjects',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(this.studioBucket).add('Name', 'MLA Study Studio Bucket');

    // ======================
    // SageMaker Execution Role
    // ======================
    this.executionRole = new iam.Role(this, 'SageMakerExecutionRole', {
      roleName: 'mla-study-sagemaker-execution-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Execution role for SageMaker Studio and training jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access to the execution role
    this.studioBucket.grantReadWrite(this.executionRole);

    // Add permissions for common ML operations
    this.executionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
      ],
      resources: ['arn:aws:logs:*:*:log-group:/aws/sagemaker/*'],
    }));

    this.executionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: ['*'],
    }));

    // ======================
    // SageMaker Studio Domain
    // ======================
    this.studioDomain = new sagemaker.CfnDomain(this, 'StudioDomain', {
      domainName: 'mla-study-studio-domain',
      authMode: 'IAM',
      vpcId: this.vpc.vpcId,
      subnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
      defaultUserSettings: {
        executionRole: this.executionRole.roleArn,
        securityGroups: [],
      },
      appNetworkAccessType: 'VpcOnly',
      domainSettings: {
        securityGroupIds: [],
      },
    });

    cdk.Tags.of(this.studioDomain).add('Name', 'MLA Study Studio Domain');

    // ======================
    // SageMaker User Profile
    // ======================
    this.userProfile = new sagemaker.CfnUserProfile(this, 'StudioUserProfile', {
      domainId: this.studioDomain.attrDomainId,
      userProfileName: 'mla-study-user',
      userSettings: {
        executionRole: this.executionRole.roleArn,
      },
    });

    this.userProfile.addDependency(this.studioDomain);

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'StudioDomainId', {
      value: this.studioDomain.attrDomainId,
      description: 'SageMaker Studio Domain ID',
      exportName: `${id}-StudioDomainId`,
    });

    new cdk.CfnOutput(this, 'StudioDomainUrl', {
      value: this.studioDomain.attrUrl,
      description: 'SageMaker Studio Domain URL',
      exportName: `${id}-StudioDomainUrl`,
    });

    this.addConsoleUrlOutput(
      'StudioConsoleUrl',
      this.getSageMakerStudioConsoleUrl(),
      'Console URL for SageMaker Studio'
    );

    new cdk.CfnOutput(this, 'UserProfileName', {
      value: this.userProfile.userProfileName!,
      description: 'SageMaker Studio User Profile Name',
    });

    new cdk.CfnOutput(this, 'ExecutionRoleArn', {
      value: this.executionRole.roleArn,
      description: 'SageMaker Execution Role ARN',
      exportName: `${id}-ExecutionRoleArn`,
    });

    this.addConsoleUrlOutput(
      'ExecutionRoleConsoleUrl',
      this.getIamRoleConsoleUrl(this.executionRole.roleName),
      'Console URL for SageMaker Execution Role'
    );

    new cdk.CfnOutput(this, 'StudioBucketName', {
      value: this.studioBucket.bucketName,
      description: 'S3 Bucket for Studio artifacts',
      exportName: `${id}-StudioBucketName`,
    });

    this.addConsoleUrlOutput(
      'StudioBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.studioBucket.bucketName),
      'Console URL for Studio S3 Bucket'
    );

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for SageMaker Studio',
    });

    this.addConsoleUrlOutput(
      'VpcConsoleUrl',
      this.getVpcConsoleUrl(this.vpc.vpcId),
      'Console URL for Studio VPC'
    );

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Studio Architecture:',
        `- VPC with private subnets in 2 AZs`,
        `- SageMaker Studio Domain (VPC-only mode)`,
        `- User Profile: ${this.userProfile.userProfileName}`,
        `- Execution Role with SageMaker and S3 permissions`,
        `- S3 Bucket for artifacts (30-day lifecycle)`,
        '',
        'Next Steps:',
        '1. Open SageMaker Studio from the console URL',
        '2. Select the user profile and launch Studio',
        '3. Create a new notebook to start exploring',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
