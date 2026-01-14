import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Batch Transform Lab
 *
 * Demonstrates:
 * - Batch transform job configuration
 * - Large-scale inference processing
 * - Data splitting strategies
 * - Join source for output correlation
 * - Batch inference with distributed processing
 * - Cost optimization with spot instances
 *
 * Cost Estimate: ~$0.05/hour (infrastructure only)
 * - Batch jobs: Pay per instance-hour when running
 * - ml.m5.large: ~$0.115/hour
 * - S3: Minimal storage costs
 */
export class BatchTransformLabStack extends BaseLabStack {
  public readonly batchBucket: s3.Bucket;
  public readonly batchRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // S3 Bucket for Batch Data
    // ======================
    this.batchBucket = new s3.Bucket(this, 'BatchBucket', {
      bucketName: `mla-study-batch-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldData',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(this.batchBucket).add('Name', 'MLA Study Batch Bucket');

    // ======================
    // SageMaker Batch Role
    // ======================
    this.batchRole = new iam.Role(this, 'SageMakerBatchRole', {
      roleName: 'mla-study-sagemaker-batch-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker batch transform jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.batchBucket.grantReadWrite(this.batchRole);

    // Add ECR permissions
    this.batchRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: ['*'],
    }));

    // Add CloudWatch permissions
    this.batchRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'BatchBucketName', {
      value: this.batchBucket.bucketName,
      description: 'S3 bucket for batch transform data',
      exportName: `${id}-BatchBucketName`,
    });

    this.addConsoleUrlOutput(
      'BatchBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.batchBucket.bucketName),
      'Console URL for batch S3 bucket'
    );

    new cdk.CfnOutput(this, 'BatchRoleArn', {
      value: this.batchRole.roleArn,
      description: 'SageMaker batch transform execution role ARN',
      exportName: `${id}-BatchRoleArn`,
    });

    this.addConsoleUrlOutput(
      'TrainingJobsConsoleUrl',
      this.getSageMakerTrainingJobsConsoleUrl(),
      'Console URL for SageMaker Jobs'
    );

    // Sample batch transform configuration
    new cdk.CfnOutput(this, 'SampleBatchTransformConfig', {
      value: JSON.stringify({
        TransformJobName: 'mla-study-batch-inference',
        ModelName: 'mla-study-xgboost-model',
        TransformInput: {
          DataSource: {
            S3DataSource: {
              S3DataType: 'S3Prefix',
              S3Uri: `s3://${this.batchBucket.bucketName}/input/`,
            },
          },
          ContentType: 'text/csv',
          SplitType: 'Line',
        },
        TransformOutput: {
          S3OutputPath: `s3://${this.batchBucket.bucketName}/output/`,
          Accept: 'text/csv',
          AssembleWith: 'Line',
        },
        TransformResources: {
          InstanceType: 'ml.m5.large',
          InstanceCount: 2,
        },
        DataProcessing: {
          InputFilter: '$[1:]',
          OutputFilter: '$[0,-1]',
          JoinSource: 'Input',
        },
        BatchStrategy: 'MultiRecord',
        MaxPayloadInMB: 6,
        MaxConcurrentTransforms: 4,
      }, null, 2),
      description: 'Sample batch transform configuration',
    });

    // Sample Python code
    new cdk.CfnOutput(this, 'SamplePythonCode', {
      value: [
        '# SageMaker Batch Transform with Python SDK',
        'import sagemaker',
        'from sagemaker.xgboost import XGBoostModel',
        '',
        'session = sagemaker.Session()',
        `role = "${this.batchRole.roleArn}"`,
        `bucket = "${this.batchBucket.bucketName}"`,
        '',
        '# Create model from training artifacts',
        'model = XGBoostModel(',
        '    model_data=f"s3://{bucket}/models/model.tar.gz",',
        '    role=role,',
        '    framework_version="1.5-1",',
        '    sagemaker_session=session,',
        ')',
        '',
        '# Create transformer',
        'transformer = model.transformer(',
        '    instance_count=2,',
        '    instance_type="ml.m5.large",',
        '    output_path=f"s3://{bucket}/output/",',
        '    assemble_with="Line",',
        '    accept="text/csv",',
        '    strategy="MultiRecord",',
        '    max_payload=6,',
        '    max_concurrent_transforms=4,',
        ')',
        '',
        '# Start batch transform',
        'transformer.transform(',
        '    data=f"s3://{bucket}/input/",',
        '    content_type="text/csv",',
        '    split_type="Line",',
        '    join_source="Input",',
        '    input_filter="$[1:]",     # Skip first column (ID)',
        '    output_filter="$[0,-1]",  # Include prediction and last feature',
        '    wait=True,',
        ')',
        '',
        '# Check output',
        'print(f"Output: s3://{bucket}/output/")',
      ].join('\n'),
      description: 'Sample Python code for batch transform',
    });

    // Data splitting strategies
    new cdk.CfnOutput(this, 'SplittingStrategies', {
      value: [
        'Batch Transform Data Splitting:',
        '',
        'SplitType Options:',
        '- None: Single inference per file',
        '- Line: Split by newlines (CSV/JSON lines)',
        '- RecordIO: Split by RecordIO records',
        '- TFRecord: Split by TFRecord records',
        '',
        'BatchStrategy Options:',
        '- SingleRecord: One record per mini-batch',
        '- MultiRecord: Multiple records per mini-batch',
        '',
        'Best Practices:',
        '- Use MultiRecord for smaller records',
        '- Tune MaxPayloadInMB for your data size',
        '- Use MaxConcurrentTransforms for parallelism',
        '- Consider data distribution across instances',
      ].join('\n'),
      description: 'Data splitting strategies',
    });

    // Data processing options
    new cdk.CfnOutput(this, 'DataProcessingOptions', {
      value: [
        'Batch Transform Data Processing:',
        '',
        'InputFilter (JSONPath):',
        '- $: Entire input',
        '- $[1:]: Skip first element (e.g., ID column)',
        '- $.features: Select specific field',
        '',
        'OutputFilter (JSONPath):',
        '- $: Entire output',
        '- $[0,-1]: First and last elements',
        '- $.prediction: Select specific field',
        '',
        'JoinSource:',
        '- None: Output only predictions',
        '- Input: Merge predictions with input',
        '',
        'Example - Skip ID, Join Output:',
        '  InputFilter: "$[1:]"',
        '  JoinSource: "Input"',
        '  OutputFilter: "$[0,-1]"',
        '  Result: [ID, features..., prediction]',
      ].join('\n'),
      description: 'Data processing options',
    });

    // Bucket structure
    new cdk.CfnOutput(this, 'BucketStructure', {
      value: [
        'Recommended Bucket Structure:',
        `s3://${this.batchBucket.bucketName}/`,
        '  input/',
        '    data.csv            # Input data for inference',
        '    *.csv               # Multiple input files',
        '  output/',
        '    data.csv.out        # Predictions (auto-generated)',
        '  models/',
        '    model.tar.gz        # Trained model artifacts',
      ].join('\n'),
      description: 'Recommended bucket structure',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Batch Transform Architecture:',
        '',
        'Use Cases:',
        '- Large-scale offline inference',
        '- Data preprocessing pipelines',
        '- Model evaluation on test sets',
        '- ETL with ML predictions',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '1. Distributed Processing:',
        '   - Data automatically split across instances',
        '   - Parallel inference for throughput',
        '   - Results assembled in output',
        '',
        '2. Data Handling:',
        '   - Input/output filters with JSONPath',
        '   - Join source for ID correlation',
        '   - Multiple split types supported',
        '',
        '3. Performance Tuning:',
        '   - MaxConcurrentTransforms: Parallelism',
        '   - MaxPayloadInMB: Batch size',
        '   - InstanceCount: Horizontal scaling',
        '',
        '4. Cost Optimization:',
        '   - Right-size instance types',
        '   - Process during off-peak hours',
        '   - Use managed spot training',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
