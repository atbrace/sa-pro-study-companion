import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Hyperparameter Tuning Lab
 *
 * Demonstrates:
 * - Automatic Model Tuning (AMT) configuration
 * - Hyperparameter ranges and scaling types
 * - Tuning strategies (Bayesian, Random, Grid, Hyperband)
 * - Early stopping and warm start
 * - Multi-objective optimization
 * - Tuning job analysis and best model selection
 *
 * Cost Estimate: ~$0.05/hour (infrastructure only)
 * - Tuning jobs: Pay per training instance-hour
 * - S3: Minimal storage costs
 * - Actual cost depends on number of training jobs spawned
 */
export class HyperparameterTuningLabStack extends BaseLabStack {
  public readonly tuningBucket: s3.Bucket;
  public readonly tuningRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // S3 Bucket for Tuning Data and Models
    // ======================
    this.tuningBucket = new s3.Bucket(this, 'TuningBucket', {
      bucketName: `mla-study-tuning-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
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

    cdk.Tags.of(this.tuningBucket).add('Name', 'MLA Study Tuning Bucket');

    // ======================
    // SageMaker Tuning Role
    // ======================
    this.tuningRole = new iam.Role(this, 'SageMakerTuningRole', {
      roleName: 'mla-study-sagemaker-tuning-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker hyperparameter tuning jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.tuningBucket.grantReadWrite(this.tuningRole);

    // Add ECR permissions
    this.tuningRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: ['*'],
    }));

    // Add CloudWatch permissions for metrics
    this.tuningRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
    }));

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'TuningBucketName', {
      value: this.tuningBucket.bucketName,
      description: 'S3 bucket for tuning data and model artifacts',
      exportName: `${id}-TuningBucketName`,
    });

    this.addConsoleUrlOutput(
      'TuningBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.tuningBucket.bucketName),
      'Console URL for tuning S3 bucket'
    );

    new cdk.CfnOutput(this, 'TuningRoleArn', {
      value: this.tuningRole.roleArn,
      description: 'SageMaker tuning execution role ARN',
      exportName: `${id}-TuningRoleArn`,
    });

    this.addConsoleUrlOutput(
      'TrainingJobsConsoleUrl',
      this.getSageMakerTrainingJobsConsoleUrl(),
      'Console URL for SageMaker Training Jobs'
    );

    // Sample tuning job configuration
    new cdk.CfnOutput(this, 'SampleTuningJobConfig', {
      value: JSON.stringify({
        HyperParameterTuningJobName: 'mla-study-xgboost-tuning',
        HyperParameterTuningJobConfig: {
          Strategy: 'Bayesian',
          HyperParameterTuningJobObjective: {
            Type: 'Maximize',
            MetricName: 'validation:auc',
          },
          ResourceLimits: {
            MaxNumberOfTrainingJobs: 20,
            MaxParallelTrainingJobs: 3,
          },
          ParameterRanges: {
            ContinuousParameterRanges: [
              {
                Name: 'eta',
                MinValue: '0.01',
                MaxValue: '0.5',
                ScalingType: 'Logarithmic',
              },
              {
                Name: 'gamma',
                MinValue: '0',
                MaxValue: '5',
                ScalingType: 'Linear',
              },
            ],
            IntegerParameterRanges: [
              {
                Name: 'max_depth',
                MinValue: '3',
                MaxValue: '10',
                ScalingType: 'Linear',
              },
              {
                Name: 'num_round',
                MinValue: '50',
                MaxValue: '300',
                ScalingType: 'Linear',
              },
            ],
          },
          TrainingJobEarlyStoppingType: 'Auto',
        },
      }, null, 2),
      description: 'Sample tuning job configuration (JSON)',
    });

    // Sample Python code
    new cdk.CfnOutput(this, 'SamplePythonCode', {
      value: [
        '# SageMaker Hyperparameter Tuning with Python SDK',
        'from sagemaker.tuner import HyperparameterTuner',
        'from sagemaker.tuner import IntegerParameter, ContinuousParameter',
        'from sagemaker.xgboost import XGBoost',
        '',
        `role = "${this.tuningRole.roleArn}"`,
        `bucket = "${this.tuningBucket.bucketName}"`,
        '',
        '# Define the estimator',
        'xgb = XGBoost(',
        '    role=role,',
        '    instance_count=1,',
        '    instance_type="ml.m5.large",',
        '    framework_version="1.5-1",',
        '    output_path=f"s3://{bucket}/models/",',
        ')',
        '',
        '# Define hyperparameter ranges',
        'hyperparameter_ranges = {',
        '    "eta": ContinuousParameter(0.01, 0.5, scaling_type="Logarithmic"),',
        '    "gamma": ContinuousParameter(0, 5),',
        '    "max_depth": IntegerParameter(3, 10),',
        '    "num_round": IntegerParameter(50, 300),',
        '    "subsample": ContinuousParameter(0.5, 1.0),',
        '    "colsample_bytree": ContinuousParameter(0.5, 1.0),',
        '}',
        '',
        '# Create tuner',
        'tuner = HyperparameterTuner(',
        '    estimator=xgb,',
        '    objective_metric_name="validation:auc",',
        '    hyperparameter_ranges=hyperparameter_ranges,',
        '    max_jobs=20,',
        '    max_parallel_jobs=3,',
        '    strategy="Bayesian",',
        '    early_stopping_type="Auto",',
        ')',
        '',
        '# Start tuning',
        'tuner.fit({',
        '    "train": f"s3://{bucket}/data/train/",',
        '    "validation": f"s3://{bucket}/data/validation/",',
        '})',
        '',
        '# Get best training job',
        'best_job = tuner.best_training_job()',
        'print(f"Best job: {best_job}")',
      ].join('\n'),
      description: 'Sample Python code for hyperparameter tuning',
    });

    // Tuning strategies comparison
    new cdk.CfnOutput(this, 'TuningStrategiesComparison', {
      value: [
        'Tuning Strategy Comparison:',
        '',
        'Bayesian (Recommended):',
        '- Uses prior results to guide next trials',
        '- Best for expensive objective functions',
        '- Converges faster with fewer trials',
        '',
        'Random:',
        '- Samples randomly from parameter space',
        '- Good baseline, embarrassingly parallel',
        '- No early stopping optimization',
        '',
        'Grid:',
        '- Exhaustive search over discrete values',
        '- Only for categorical/small discrete spaces',
        '- Predictable but potentially wasteful',
        '',
        'Hyperband:',
        '- Adaptive resource allocation',
        '- Early stops poor performers',
        '- Best for large search spaces',
      ].join('\n'),
      description: 'Tuning strategies comparison',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'Hyperparameter Tuning Architecture:',
        '',
        'Infrastructure:',
        '- S3 bucket for data and model artifacts',
        '- IAM role with SageMaker permissions',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '1. Parameter Types:',
        '   - ContinuousParameter: Real-valued (eta, gamma)',
        '   - IntegerParameter: Whole numbers (max_depth)',
        '   - CategoricalParameter: Discrete choices (algorithm)',
        '',
        '2. Scaling Types:',
        '   - Linear: Uniform sampling',
        '   - Logarithmic: Log-uniform (for learning rates)',
        '   - ReverseLogarithmic: Inverse log scale',
        '',
        '3. Early Stopping:',
        '   - Auto: SageMaker decides based on metrics',
        '   - Off: Run all jobs to completion',
        '',
        '4. Warm Start:',
        '   - IDENTICAL_DATA_AND_ALGORITHM: Continue previous tuning',
        '   - TRANSFER_LEARNING: Transfer from similar problems',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
