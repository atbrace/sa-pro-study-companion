import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Clarify Lab
 *
 * Demonstrates:
 * - Pre-training bias detection
 * - Post-training bias analysis
 * - Model explainability with SHAP
 * - Feature importance analysis
 * - Bias metrics and thresholds
 * - Compliance and fairness reporting
 *
 * Cost Estimate: ~$0.12/hour when jobs running
 * - Clarify jobs: Pay per processing instance-hour
 * - ml.m5.xlarge: ~$0.23/hour
 * - S3: Minimal storage costs
 */
export class SageMakerClarifyLabStack extends BaseLabStack {
  public readonly clarifyBucket: s3.Bucket;
  public readonly clarifyRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.12,
    });

    // ======================
    // S3 Bucket for Clarify Data
    // ======================
    this.clarifyBucket = new s3.Bucket(this, 'ClarifyBucket', {
      bucketName: `mla-study-clarify-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
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

    cdk.Tags.of(this.clarifyBucket).add('Name', 'MLA Study Clarify Bucket');

    // ======================
    // SageMaker Clarify Role
    // ======================
    this.clarifyRole = new iam.Role(this, 'SageMakerClarifyRole', {
      roleName: 'mla-study-sagemaker-clarify-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker Clarify jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.clarifyBucket.grantReadWrite(this.clarifyRole);

    // Add CloudWatch permissions
    this.clarifyRole.addToPolicy(new iam.PolicyStatement({
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
    new cdk.CfnOutput(this, 'ClarifyBucketName', {
      value: this.clarifyBucket.bucketName,
      description: 'S3 bucket for Clarify data and reports',
      exportName: `${id}-ClarifyBucketName`,
    });

    this.addConsoleUrlOutput(
      'ClarifyBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.clarifyBucket.bucketName),
      'Console URL for Clarify S3 bucket'
    );

    new cdk.CfnOutput(this, 'ClarifyRoleArn', {
      value: this.clarifyRole.roleArn,
      description: 'SageMaker Clarify execution role ARN',
      exportName: `${id}-ClarifyRoleArn`,
    });

    this.addConsoleUrlOutput(
      'SageMakerStudioConsoleUrl',
      this.getSageMakerStudioConsoleUrl(),
      'Console URL for SageMaker Studio (to run Clarify)'
    );

    // Sample Pre-training Bias Analysis
    new cdk.CfnOutput(this, 'SamplePreTrainingBias', {
      value: [
        '# Pre-training Bias Detection',
        'from sagemaker.clarify import SageMakerClarifyProcessor',
        'from sagemaker.clarify import DataConfig, BiasConfig',
        '',
        'session = sagemaker.Session()',
        `role = "${this.clarifyRole.roleArn}"`,
        `bucket = "${this.clarifyBucket.bucketName}"`,
        '',
        '# Create Clarify processor',
        'clarify_processor = SageMakerClarifyProcessor(',
        '    role=role,',
        '    instance_count=1,',
        '    instance_type="ml.m5.xlarge",',
        '    sagemaker_session=session,',
        ')',
        '',
        '# Data configuration',
        'data_config = DataConfig(',
        '    s3_data_input_path=f"s3://{bucket}/data/train.csv",',
        '    s3_output_path=f"s3://{bucket}/reports/bias/",',
        '    label="target",',
        '    headers=["feature1", "feature2", "gender", "age", "target"],',
        '    dataset_type="text/csv",',
        ')',
        '',
        '# Bias configuration',
        'bias_config = BiasConfig(',
        '    label_values_or_threshold=[1],',
        '    facet_name="gender",',
        '    facet_values_or_threshold=[0],  # 0 = female (disadvantaged group)',
        '    group_name="age",               # Optional: group variable',
        ')',
        '',
        '# Run pre-training bias analysis',
        'clarify_processor.run_pre_training_bias(',
        '    data_config=data_config,',
        '    data_bias_config=bias_config,',
        '    methods=["CI", "DPL", "KL", "JS", "LP", "TVD", "KS", "CDDL"],',
        ')',
      ].join('\n'),
      description: 'Sample pre-training bias analysis',
    });

    // Sample Post-training Bias Analysis
    new cdk.CfnOutput(this, 'SamplePostTrainingBias', {
      value: [
        '# Post-training Bias Detection',
        'from sagemaker.clarify import ModelConfig, ModelPredictedLabelConfig',
        '',
        '# Model configuration',
        'model_config = ModelConfig(',
        '    model_name="your-model-name",',
        '    instance_type="ml.m5.large",',
        '    instance_count=1,',
        '    accept_type="text/csv",',
        '    content_type="text/csv",',
        ')',
        '',
        '# Predicted label configuration',
        'predictions_config = ModelPredictedLabelConfig(',
        '    probability_threshold=0.5,',
        ')',
        '',
        '# Run post-training bias analysis',
        'clarify_processor.run_post_training_bias(',
        '    data_config=data_config,',
        '    data_bias_config=bias_config,',
        '    model_config=model_config,',
        '    model_predicted_label_config=predictions_config,',
        '    methods=["DPPL", "DI", "DCA", "DCR", "RD", "DAR", "DRR", "AD", "TE", "FT"],',
        ')',
      ].join('\n'),
      description: 'Sample post-training bias analysis',
    });

    // Sample Explainability Analysis
    new cdk.CfnOutput(this, 'SampleExplainability', {
      value: [
        '# Model Explainability with SHAP',
        'from sagemaker.clarify import SHAPConfig',
        '',
        '# SHAP configuration',
        'shap_config = SHAPConfig(',
        '    baseline=None,                    # Auto-generate baseline',
        '    num_samples=500,                  # Number of samples for SHAP',
        '    agg_method="mean_abs",            # Aggregation method',
        '    use_logit=False,                  # Use logit transformation',
        '    save_local_shap_values=True,      # Save individual SHAP values',
        ')',
        '',
        '# Run explainability analysis',
        'clarify_processor.run_explainability(',
        '    data_config=data_config,',
        '    model_config=model_config,',
        '    explainability_config=shap_config,',
        ')',
        '',
        '# Output includes:',
        '# - Global feature importance (aggregated SHAP)',
        '# - Local explanations (per-instance SHAP)',
        '# - Baseline dataset used',
        '# - Visualization-ready data',
      ].join('\n'),
      description: 'Sample explainability analysis',
    });

    // Bias metrics explanation
    new cdk.CfnOutput(this, 'BiasMetricsExplanation', {
      value: [
        'Pre-training Bias Metrics:',
        '',
        'CI (Class Imbalance):',
        '  Measures label distribution imbalance',
        '  Range: [-1, +1], Fair: ~0',
        '',
        'DPL (Difference in Positive Proportions):',
        '  Difference in positive outcomes between groups',
        '  Range: [-1, +1], Fair: ~0',
        '',
        'KL (KL Divergence):',
        '  Distribution difference between groups',
        '  Range: [0, +inf], Fair: ~0',
        '',
        'Post-training Bias Metrics:',
        '',
        'DPPL (Difference in Positive Proportions Predicted):',
        '  Difference in predicted positive outcomes',
        '',
        'DI (Disparate Impact):',
        '  Ratio of positive predictions between groups',
        '  Range: [0, +inf], Fair: ~1',
        '',
        'AD (Accuracy Difference):',
        '  Difference in accuracy between groups',
        '  Range: [-1, +1], Fair: ~0',
      ].join('\n'),
      description: 'Bias metrics explanation',
    });

    // Bucket structure
    new cdk.CfnOutput(this, 'BucketStructure', {
      value: [
        'Recommended Bucket Structure:',
        `s3://${this.clarifyBucket.bucketName}/`,
        '  data/',
        '    train.csv           # Training data with labels',
        '    test.csv            # Test data for analysis',
        '  models/',
        '    model.tar.gz        # Model artifacts',
        '  reports/',
        '    bias/',
        '      pre-training/     # Pre-training bias reports',
        '      post-training/    # Post-training bias reports',
        '    explainability/     # SHAP analysis reports',
      ].join('\n'),
      description: 'Recommended bucket structure',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Clarify Architecture:',
        '',
        'Use Cases:',
        '- Regulatory compliance (GDPR, Fair Lending)',
        '- Model validation and governance',
        '- Feature importance for debugging',
        '- Bias monitoring in production',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '1. Pre-training Bias:',
        '   - Detect bias in training data',
        '   - Before model is trained',
        '   - Data imbalance, representation',
        '',
        '2. Post-training Bias:',
        '   - Detect bias in predictions',
        '   - After model is trained',
        '   - Outcome disparities',
        '',
        '3. Explainability:',
        '   - SHAP values for feature importance',
        '   - Local and global explanations',
        '   - Model transparency',
        '',
        '4. Integration Points:',
        '   - SageMaker Pipelines',
        '   - Model Registry',
        '   - Model Monitor (bias drift)',
        '   - Autopilot (auto-generated)',
        '',
        '5. Report Artifacts:',
        '   - analysis.json (detailed metrics)',
        '   - report.pdf (visual summary)',
        '   - explanations/ (SHAP values)',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
