import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as applicationautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Real-time Inference Endpoints Lab
 *
 * Demonstrates:
 * - Real-time endpoint configuration
 * - Multi-model endpoints
 * - Auto-scaling configuration
 * - Serverless inference
 * - A/B testing with production variants
 * - Endpoint monitoring and logging
 *
 * Cost Estimate: ~$0.12/hour when endpoint running
 * - ml.t2.medium: ~$0.056/hour
 * - Serverless: Pay per inference request
 * - S3: Minimal storage costs
 */
export class SageMakerEndpointsLabStack extends BaseLabStack {
  public readonly endpointBucket: s3.Bucket;
  public readonly endpointRole: iam.Role;
  public readonly modelPackageGroup: sagemaker.CfnModelPackageGroup;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.12,
    });

    // ======================
    // S3 Bucket for Model Artifacts
    // ======================
    this.endpointBucket = new s3.Bucket(this, 'EndpointBucket', {
      bucketName: `mla-study-endpoints-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldArtifacts',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(this.endpointBucket).add('Name', 'MLA Study Endpoints Bucket');

    // ======================
    // SageMaker Endpoint Role
    // ======================
    this.endpointRole = new iam.Role(this, 'SageMakerEndpointRole', {
      roleName: 'mla-study-sagemaker-endpoint-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker inference endpoints',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access for model artifacts
    this.endpointBucket.grantRead(this.endpointRole);

    // Add CloudWatch permissions for logging
    this.endpointRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
    }));

    // Add ECR permissions for custom inference containers
    this.endpointRole.addToPolicy(new iam.PolicyStatement({
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
    // Model Package Group (Model Registry)
    // ======================
    this.modelPackageGroup = new sagemaker.CfnModelPackageGroup(this, 'ModelPackageGroup', {
      modelPackageGroupName: 'mla-study-models',
      modelPackageGroupDescription: 'Model package group for MLA-C01 study models',
    });

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'EndpointBucketName', {
      value: this.endpointBucket.bucketName,
      description: 'S3 bucket for model artifacts',
      exportName: `${id}-EndpointBucketName`,
    });

    this.addConsoleUrlOutput(
      'EndpointBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.endpointBucket.bucketName),
      'Console URL for endpoints S3 bucket'
    );

    new cdk.CfnOutput(this, 'EndpointRoleArn', {
      value: this.endpointRole.roleArn,
      description: 'SageMaker endpoint execution role ARN',
      exportName: `${id}-EndpointRoleArn`,
    });

    this.addConsoleUrlOutput(
      'EndpointsConsoleUrl',
      this.getSageMakerEndpointsConsoleUrl(),
      'Console URL for SageMaker Endpoints'
    );

    this.addConsoleUrlOutput(
      'ModelRegistryConsoleUrl',
      this.getSageMakerModelRegistryConsoleUrl(),
      'Console URL for SageMaker Model Registry'
    );

    new cdk.CfnOutput(this, 'ModelPackageGroupName', {
      value: this.modelPackageGroup.modelPackageGroupName!,
      description: 'Model Package Group name',
      exportName: `${id}-ModelPackageGroupName`,
    });

    // Sample real-time endpoint configuration
    new cdk.CfnOutput(this, 'SampleRealTimeEndpointConfig', {
      value: JSON.stringify({
        Model: {
          ModelName: 'mla-study-xgboost-model',
          ExecutionRoleArn: this.endpointRole.roleArn,
          PrimaryContainer: {
            Image: `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/sagemaker-xgboost:1.5-1`,
            ModelDataUrl: `s3://${this.endpointBucket.bucketName}/models/model.tar.gz`,
          },
        },
        EndpointConfig: {
          EndpointConfigName: 'mla-study-endpoint-config',
          ProductionVariants: [
            {
              VariantName: 'AllTraffic',
              ModelName: 'mla-study-xgboost-model',
              InstanceType: 'ml.t2.medium',
              InitialInstanceCount: 1,
              InitialVariantWeight: 1,
            },
          ],
        },
        Endpoint: {
          EndpointName: 'mla-study-endpoint',
          EndpointConfigName: 'mla-study-endpoint-config',
        },
      }, null, 2),
      description: 'Sample real-time endpoint configuration',
    });

    // Sample A/B testing configuration
    new cdk.CfnOutput(this, 'SampleABTestingConfig', {
      value: JSON.stringify({
        EndpointConfig: {
          EndpointConfigName: 'mla-study-ab-test-config',
          ProductionVariants: [
            {
              VariantName: 'VariantA',
              ModelName: 'model-v1',
              InstanceType: 'ml.t2.medium',
              InitialInstanceCount: 1,
              InitialVariantWeight: 0.7,
            },
            {
              VariantName: 'VariantB',
              ModelName: 'model-v2',
              InstanceType: 'ml.t2.medium',
              InitialInstanceCount: 1,
              InitialVariantWeight: 0.3,
            },
          ],
        },
      }, null, 2),
      description: 'Sample A/B testing configuration',
    });

    // Sample Python code
    new cdk.CfnOutput(this, 'SamplePythonCode', {
      value: [
        '# SageMaker Endpoint Deployment with Python SDK',
        'import sagemaker',
        'from sagemaker.xgboost import XGBoostModel',
        '',
        'session = sagemaker.Session()',
        `role = "${this.endpointRole.roleArn}"`,
        `bucket = "${this.endpointBucket.bucketName}"`,
        '',
        '# Create model from training artifacts',
        'model = XGBoostModel(',
        '    model_data=f"s3://{bucket}/models/model.tar.gz",',
        '    role=role,',
        '    framework_version="1.5-1",',
        '    sagemaker_session=session,',
        ')',
        '',
        '# Deploy real-time endpoint',
        'predictor = model.deploy(',
        '    initial_instance_count=1,',
        '    instance_type="ml.t2.medium",',
        '    endpoint_name="mla-study-endpoint",',
        ')',
        '',
        '# Make predictions',
        'import json',
        'response = predictor.predict([[1.0, 2.0, 3.0, 4.0]])',
        'print(f"Prediction: {response}")',
        '',
        '# Configure auto-scaling',
        'client = session.boto_session.client("application-autoscaling")',
        'client.register_scalable_target(',
        '    ServiceNamespace="sagemaker",',
        '    ResourceId=f"endpoint/{predictor.endpoint_name}/variant/AllTraffic",',
        '    ScalableDimension="sagemaker:variant:DesiredInstanceCount",',
        '    MinCapacity=1,',
        '    MaxCapacity=4,',
        ')',
        '',
        '# Delete endpoint when done',
        'predictor.delete_endpoint()',
      ].join('\n'),
      description: 'Sample Python code for endpoint deployment',
    });

    // Serverless inference configuration
    new cdk.CfnOutput(this, 'ServerlessInferenceConfig', {
      value: [
        'Serverless Inference Configuration:',
        '',
        'Python SDK:',
        'from sagemaker.serverless import ServerlessInferenceConfig',
        '',
        'serverless_config = ServerlessInferenceConfig(',
        '    memory_size_in_mb=2048,     # 1024-6144 MB',
        '    max_concurrency=5,          # 1-200 concurrent requests',
        ')',
        '',
        'model.deploy(',
        '    serverless_inference_config=serverless_config,',
        '    endpoint_name="mla-study-serverless",',
        ')',
        '',
        'Benefits:',
        '- No instance management',
        '- Pay per inference request',
        '- Automatic scaling to zero',
        '- Cold start considerations (~1-2 sec)',
      ].join('\n'),
      description: 'Serverless inference configuration',
    });

    // Endpoint types comparison
    new cdk.CfnOutput(this, 'EndpointTypesComparison', {
      value: [
        'Endpoint Types Comparison:',
        '',
        'Real-time Endpoints:',
        '- Sub-second latency',
        '- Always-on instances',
        '- Auto-scaling support',
        '- Best for: Low-latency, high-throughput',
        '',
        'Serverless Inference:',
        '- Pay per request',
        '- Cold start (~1-2 sec)',
        '- Auto-scales to zero',
        '- Best for: Intermittent traffic',
        '',
        'Multi-Model Endpoints:',
        '- Multiple models on same endpoint',
        '- Dynamic model loading',
        '- Cost-efficient for many models',
        '- Best for: Thousands of similar models',
        '',
        'Asynchronous Inference:',
        '- Queues long-running requests',
        '- S3 for large payloads',
        '- Best for: Batch-like, large payloads',
      ].join('\n'),
      description: 'Endpoint types comparison',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Endpoints Architecture:',
        '',
        'Infrastructure:',
        '- S3 bucket for model artifacts',
        '- IAM role with endpoint permissions',
        '- Model Package Group for versioning',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '1. Endpoint Configuration:',
        '   - Production variants for A/B testing',
        '   - Instance types and counts',
        '   - Data capture for monitoring',
        '',
        '2. Auto-scaling:',
        '   - Target tracking (invocations, CPU)',
        '   - Step scaling policies',
        '   - Scheduled scaling',
        '',
        '3. Deployment Strategies:',
        '   - Blue/green with endpoint update',
        '   - Canary with variant weights',
        '   - Shadow testing (data capture)',
        '',
        '4. Model Registry Integration:',
        '   - Versioned model packages',
        '   - Approval workflows',
        '   - Lineage tracking',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
