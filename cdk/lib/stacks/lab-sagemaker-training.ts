import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Training Lab
 *
 * Demonstrates:
 * - SageMaker training job configuration
 * - Built-in algorithms (XGBoost, Linear Learner)
 * - Custom training containers
 * - Distributed training setup
 * - Spot instance training for cost optimization
 * - Training metrics and debugging
 *
 * Cost Estimate: ~$0.05/hour (infrastructure only)
 * - S3: Minimal storage costs
 * - Training Jobs: Pay per instance-hour when running
 * - ml.m5.large: ~$0.115/hour on-demand
 * - Spot instances: Up to 90% savings
 */
export class SageMakerTrainingLabStack extends BaseLabStack {
  public readonly vpc: ec2.Vpc;
  public readonly trainingBucket: s3.Bucket;
  public readonly trainingRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // VPC for Training Jobs
    // ======================
    this.vpc = new ec2.Vpc(this, 'TrainingVpc', {
      vpcName: 'mla-study-training-vpc',
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

    cdk.Tags.of(this.vpc).add('Name', 'MLA Study Training VPC');

    // ======================
    // S3 Bucket for Training Data and Models
    // ======================
    this.trainingBucket = new s3.Bucket(this, 'TrainingBucket', {
      bucketName: `mla-study-training-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteOldArtifacts',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(this.trainingBucket).add('Name', 'MLA Study Training Bucket');

    // ======================
    // SageMaker Training Role
    // ======================
    this.trainingRole = new iam.Role(this, 'SageMakerTrainingRole', {
      roleName: 'mla-study-sagemaker-training-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker training jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.trainingBucket.grantReadWrite(this.trainingRole);

    // Add ECR permissions for custom containers
    this.trainingRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: ['*'],
    }));

    // Add CloudWatch permissions for training metrics
    this.trainingRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
    }));

    // Add VPC permissions for network-isolated training
    this.trainingRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:CreateNetworkInterfacePermission',
        'ec2:DeleteNetworkInterface',
        'ec2:DeleteNetworkInterfacePermission',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeVpcs',
        'ec2:DescribeDhcpOptions',
        'ec2:DescribeSubnets',
        'ec2:DescribeSecurityGroups',
      ],
      resources: ['*'],
    }));

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'TrainingBucketName', {
      value: this.trainingBucket.bucketName,
      description: 'S3 bucket for training data and model artifacts',
      exportName: `${id}-TrainingBucketName`,
    });

    this.addConsoleUrlOutput(
      'TrainingBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.trainingBucket.bucketName),
      'Console URL for training S3 bucket'
    );

    new cdk.CfnOutput(this, 'TrainingRoleArn', {
      value: this.trainingRole.roleArn,
      description: 'SageMaker training execution role ARN',
      exportName: `${id}-TrainingRoleArn`,
    });

    this.addConsoleUrlOutput(
      'TrainingRoleConsoleUrl',
      this.getIamRoleConsoleUrl(this.trainingRole.roleName),
      'Console URL for training IAM role'
    );

    this.addConsoleUrlOutput(
      'TrainingJobsConsoleUrl',
      this.getSageMakerTrainingJobsConsoleUrl(),
      'Console URL for SageMaker Training Jobs'
    );

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for network-isolated training',
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(s => s.subnetId).join(','),
      description: 'Private subnet IDs for training jobs',
    });

    // Sample training job configuration
    new cdk.CfnOutput(this, 'SampleXGBoostTrainingConfig', {
      value: JSON.stringify({
        TrainingJobName: 'mla-study-xgboost-example',
        AlgorithmSpecification: {
          TrainingImage: `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/sagemaker-xgboost:1.5-1`,
          TrainingInputMode: 'File',
        },
        RoleArn: this.trainingRole.roleArn,
        InputDataConfig: [
          {
            ChannelName: 'train',
            DataSource: {
              S3DataSource: {
                S3DataType: 'S3Prefix',
                S3Uri: `s3://${this.trainingBucket.bucketName}/data/train/`,
                S3DataDistributionType: 'FullyReplicated',
              },
            },
            ContentType: 'text/csv',
          },
        ],
        OutputDataConfig: {
          S3OutputPath: `s3://${this.trainingBucket.bucketName}/models/`,
        },
        ResourceConfig: {
          InstanceType: 'ml.m5.large',
          InstanceCount: 1,
          VolumeSizeInGB: 10,
        },
        StoppingCondition: {
          MaxRuntimeInSeconds: 3600,
        },
        HyperParameters: {
          objective: 'binary:logistic',
          num_round: '100',
          max_depth: '5',
          eta: '0.2',
        },
      }, null, 2),
      description: 'Sample XGBoost training job configuration (JSON)',
    });

    // Sample Python code
    new cdk.CfnOutput(this, 'SamplePythonCode', {
      value: [
        '# Sample SageMaker Training Job with Python SDK',
        'import sagemaker',
        'from sagemaker.xgboost import XGBoost',
        '',
        'session = sagemaker.Session()',
        `role = "${this.trainingRole.roleArn}"`,
        `bucket = "${this.trainingBucket.bucketName}"`,
        '',
        '# XGBoost Estimator',
        'xgb = XGBoost(',
        '    entry_point="train.py",',
        '    role=role,',
        '    instance_count=1,',
        '    instance_type="ml.m5.large",',
        '    framework_version="1.5-1",',
        '    hyperparameters={',
        '        "objective": "binary:logistic",',
        '        "num_round": 100,',
        '        "max_depth": 5,',
        '        "eta": 0.2,',
        '    },',
        '    # Enable Spot Training (up to 90% cost savings)',
        '    use_spot_instances=True,',
        '    max_wait=7200,',
        '    max_run=3600,',
        ')',
        '',
        '# Start training',
        'xgb.fit({',
        '    "train": f"s3://{bucket}/data/train/",',
        '    "validation": f"s3://{bucket}/data/validation/",',
        '})',
      ].join('\n'),
      description: 'Sample Python code for training',
    });

    // Bucket structure
    new cdk.CfnOutput(this, 'BucketStructure', {
      value: [
        'Recommended S3 Bucket Structure:',
        `s3://${this.trainingBucket.bucketName}/`,
        '  data/',
        '    train/           # Training dataset',
        '    validation/      # Validation dataset',
        '    test/            # Test dataset',
        '  models/',
        '    xgboost/         # XGBoost model artifacts',
        '    linear-learner/  # Linear Learner artifacts',
        '  scripts/',
        '    train.py         # Custom training scripts',
        '  logs/',
        '    training/        # Training job logs',
      ].join('\n'),
      description: 'Recommended bucket structure',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Training Architecture:',
        '',
        'Infrastructure:',
        '- VPC with private subnets for network isolation',
        '- S3 bucket for data and model artifacts',
        '- IAM role with SageMaker and ECR permissions',
        '',
        'Training Options Demonstrated:',
        '- Built-in algorithms (XGBoost, Linear Learner)',
        '- Custom training containers',
        '- Spot instances for cost optimization',
        '- Distributed training configuration',
        '',
        'Key MLA-C01 Concepts:',
        '- Input channels (train, validation, test)',
        '- Hyperparameter configuration',
        '- Instance type selection',
        '- Spot training with checkpointing',
        '- Network isolation for security',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
