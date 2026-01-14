import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Autopilot Lab (AutoML)
 *
 * Demonstrates:
 * - Autopilot job configuration for tabular data
 * - Automatic feature engineering
 * - Model selection and tuning
 * - Generated notebooks for transparency
 * - Model explainability with SHAP
 * - Ensemble mode vs HPO mode
 *
 * Cost Estimate: ~$0.05/hour (infrastructure only)
 * - Autopilot jobs: Pay per training compute
 * - S3: Minimal storage costs
 * - Actual cost depends on dataset size and job duration
 */
export class SageMakerAutopilotLabStack extends BaseLabStack {
  public readonly autopilotBucket: s3.Bucket;
  public readonly autopilotRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // S3 Bucket for Autopilot Data
    // ======================
    this.autopilotBucket = new s3.Bucket(this, 'AutopilotBucket', {
      bucketName: `mla-study-autopilot-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
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

    cdk.Tags.of(this.autopilotBucket).add('Name', 'MLA Study Autopilot Bucket');

    // ======================
    // SageMaker Autopilot Role
    // ======================
    this.autopilotRole = new iam.Role(this, 'SageMakerAutopilotRole', {
      roleName: 'mla-study-sagemaker-autopilot-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker Autopilot jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.autopilotBucket.grantReadWrite(this.autopilotRole);

    // Add permissions for generated notebooks
    this.autopilotRole.addToPolicy(new iam.PolicyStatement({
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
    new cdk.CfnOutput(this, 'AutopilotBucketName', {
      value: this.autopilotBucket.bucketName,
      description: 'S3 bucket for Autopilot data and models',
      exportName: `${id}-AutopilotBucketName`,
    });

    this.addConsoleUrlOutput(
      'AutopilotBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.autopilotBucket.bucketName),
      'Console URL for Autopilot S3 bucket'
    );

    new cdk.CfnOutput(this, 'AutopilotRoleArn', {
      value: this.autopilotRole.roleArn,
      description: 'SageMaker Autopilot execution role ARN',
      exportName: `${id}-AutopilotRoleArn`,
    });

    this.addConsoleUrlOutput(
      'SageMakerStudioConsoleUrl',
      this.getSageMakerStudioConsoleUrl(),
      'Console URL for SageMaker Studio (to run Autopilot)'
    );

    // Sample Autopilot job configuration
    new cdk.CfnOutput(this, 'SampleAutopilotConfig', {
      value: JSON.stringify({
        AutoMLJobName: 'mla-study-autopilot-churn',
        InputDataConfig: [
          {
            DataSource: {
              S3DataSource: {
                S3DataType: 'S3Prefix',
                S3Uri: `s3://${this.autopilotBucket.bucketName}/data/input/`,
              },
            },
            TargetAttributeName: 'churn',
            ContentType: 'text/csv;header=present',
          },
        ],
        OutputDataConfig: {
          S3OutputPath: `s3://${this.autopilotBucket.bucketName}/output/`,
        },
        ProblemType: 'BinaryClassification',
        AutoMLJobObjective: {
          MetricName: 'F1',
        },
        AutoMLJobConfig: {
          CompletionCriteria: {
            MaxCandidates: 10,
            MaxRuntimePerTrainingJobInSeconds: 1800,
            MaxAutoMLJobRuntimeInSeconds: 7200,
          },
          Mode: 'ENSEMBLING',
        },
        RoleArn: this.autopilotRole.roleArn,
        GenerateCandidateDefinitionsOnly: false,
      }, null, 2),
      description: 'Sample Autopilot job configuration (JSON)',
    });

    // Sample Python code
    new cdk.CfnOutput(this, 'SamplePythonCode', {
      value: [
        '# SageMaker Autopilot with Python SDK',
        'import sagemaker',
        'from sagemaker.automl.automl import AutoML',
        '',
        'session = sagemaker.Session()',
        `role = "${this.autopilotRole.roleArn}"`,
        `bucket = "${this.autopilotBucket.bucketName}"`,
        '',
        '# Create Autopilot job',
        'automl = AutoML(',
        '    role=role,',
        '    target_attribute_name="churn",',
        '    output_path=f"s3://{bucket}/output/",',
        '    problem_type="BinaryClassification",',
        '    max_candidates=10,',
        '    max_runtime_per_training_job_in_seconds=1800,',
        '    total_job_runtime_in_seconds=7200,',
        '    mode="ENSEMBLING",  # or "HYPERPARAMETER_TUNING"',
        '    sagemaker_session=session,',
        ')',
        '',
        '# Start Autopilot job',
        'automl.fit(',
        '    inputs=f"s3://{bucket}/data/input/train.csv",',
        '    job_name="mla-study-autopilot-churn",',
        '    wait=False,',
        ')',
        '',
        '# Check job status',
        'automl.describe_auto_ml_job()',
        '',
        '# Get best candidate',
        'best = automl.best_candidate()',
        'print(f"Best candidate: {best}")',
        '',
        '# Deploy best model',
        'predictor = automl.deploy(',
        '    initial_instance_count=1,',
        '    instance_type="ml.m5.large",',
        ')',
      ].join('\n'),
      description: 'Sample Python code for Autopilot',
    });

    // Autopilot modes comparison
    new cdk.CfnOutput(this, 'AutopilotModesComparison', {
      value: [
        'Autopilot Mode Comparison:',
        '',
        'ENSEMBLING Mode (Default):',
        '- Creates ensemble of multiple models',
        '- Better accuracy, larger model size',
        '- Uses stacking/blending techniques',
        '- Recommended for best accuracy',
        '',
        'HYPERPARAMETER_TUNING Mode:',
        '- Tunes single algorithm',
        '- Faster, smaller models',
        '- Better for inference latency',
        '- Uses Bayesian optimization',
        '',
        'Problem Types Supported:',
        '- BinaryClassification',
        '- MulticlassClassification',
        '- Regression',
        '',
        'Algorithms Explored:',
        '- XGBoost',
        '- Linear Learner',
        '- Deep Learning (MLP)',
        '- LightGBM (Ensembling mode)',
        '- CatBoost (Ensembling mode)',
      ].join('\n'),
      description: 'Autopilot modes comparison',
    });

    // Data requirements
    new cdk.CfnOutput(this, 'DataRequirements', {
      value: [
        'Autopilot Data Requirements:',
        '',
        'Format:',
        '- CSV with header row',
        '- Parquet (more efficient)',
        '',
        'Size Limits:',
        '- Minimum: 500 rows',
        '- Maximum: 100GB or 200,000 columns',
        '',
        'Column Types:',
        '- Numeric (int, float)',
        '- Categorical (string)',
        '- Text (for NLP tasks)',
        '',
        'Best Practices:',
        '- Clean missing values or let Autopilot handle',
        '- Remove ID columns (not predictive)',
        '- Balance classes for classification',
        '- Include timestamp features for time-series',
      ].join('\n'),
      description: 'Data requirements for Autopilot',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Autopilot Architecture:',
        '',
        'AutoML Pipeline:',
        '1. Data Analysis: Schema inference, statistics',
        '2. Feature Engineering: Auto-generated transforms',
        '3. Model Selection: Multiple algorithm trials',
        '4. Hyperparameter Tuning: Optimize each algorithm',
        '5. Model Ranking: Compare by objective metric',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '- Transparency: Generated notebooks explain steps',
        '- Explainability: SHAP values for feature importance',
        '- Model Registry: Best candidate registered automatically',
        '- Inference Pipelines: Feature transform + model',
        '',
        'Outputs Generated:',
        '- Data exploration notebook',
        '- Candidate definition notebook',
        '- Feature engineering notebook',
        '- Model artifacts for each candidate',
        '- Explainability reports (if enabled)',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
