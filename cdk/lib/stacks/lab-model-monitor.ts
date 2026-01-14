import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Model Monitor Lab
 *
 * Demonstrates:
 * - Data quality monitoring
 * - Model quality monitoring (accuracy drift)
 * - Bias drift monitoring
 * - Feature attribution drift
 * - Baseline creation and constraint generation
 * - Alerting with CloudWatch and SNS
 *
 * Cost Estimate: ~$0.05/hour (infrastructure only)
 * - Monitoring jobs: Pay per processing instance-hour
 * - S3: Minimal storage costs
 * - SNS: Minimal notification costs
 */
export class ModelMonitorLabStack extends BaseLabStack {
  public readonly monitorBucket: s3.Bucket;
  public readonly monitorRole: iam.Role;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // S3 Bucket for Monitoring Data
    // ======================
    this.monitorBucket = new s3.Bucket(this, 'MonitorBucket', {
      bucketName: `mla-study-monitor-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
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

    cdk.Tags.of(this.monitorBucket).add('Name', 'MLA Study Monitor Bucket');

    // ======================
    // SNS Topic for Alerts
    // ======================
    this.alertTopic = new sns.Topic(this, 'MonitorAlertTopic', {
      topicName: 'mla-study-model-monitor-alerts',
      displayName: 'MLA Study Model Monitor Alerts',
    });

    // ======================
    // Model Monitor Role
    // ======================
    this.monitorRole = new iam.Role(this, 'ModelMonitorRole', {
      roleName: 'mla-study-model-monitor-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker Model Monitor jobs',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.monitorBucket.grantReadWrite(this.monitorRole);

    // Add CloudWatch permissions
    this.monitorRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricData',
        'cloudwatch:PutMetricAlarm',
      ],
      resources: ['*'],
    }));

    // Add SNS permissions for alerts
    this.monitorRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sns:Publish',
      ],
      resources: [this.alertTopic.topicArn],
    }));

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'MonitorBucketName', {
      value: this.monitorBucket.bucketName,
      description: 'S3 bucket for monitoring data',
      exportName: `${id}-MonitorBucketName`,
    });

    this.addConsoleUrlOutput(
      'MonitorBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.monitorBucket.bucketName),
      'Console URL for monitor S3 bucket'
    );

    new cdk.CfnOutput(this, 'MonitorRoleArn', {
      value: this.monitorRole.roleArn,
      description: 'Model Monitor execution role ARN',
      exportName: `${id}-MonitorRoleArn`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS topic for monitor alerts',
      exportName: `${id}-AlertTopicArn`,
    });

    this.addConsoleUrlOutput(
      'ModelMonitorConsoleUrl',
      this.getSageMakerModelMonitorConsoleUrl(),
      'Console URL for SageMaker Model Monitor'
    );

    // Sample Data Quality Monitor setup
    new cdk.CfnOutput(this, 'SampleDataQualityMonitor', {
      value: [
        '# Data Quality Monitoring Setup',
        'from sagemaker.model_monitor import DefaultModelMonitor',
        'from sagemaker.model_monitor.dataset_format import DatasetFormat',
        '',
        'session = sagemaker.Session()',
        `role = "${this.monitorRole.roleArn}"`,
        `bucket = "${this.monitorBucket.bucketName}"`,
        '',
        '# Create monitor',
        'data_quality_monitor = DefaultModelMonitor(',
        '    role=role,',
        '    instance_count=1,',
        '    instance_type="ml.m5.large",',
        '    volume_size_in_gb=20,',
        '    max_runtime_in_seconds=3600,',
        ')',
        '',
        '# Create baseline from training data',
        'data_quality_monitor.suggest_baseline(',
        '    baseline_dataset=f"s3://{bucket}/baseline/training_data.csv",',
        '    dataset_format=DatasetFormat.csv(header=True),',
        '    output_s3_uri=f"s3://{bucket}/baseline/results/",',
        '    wait=True,',
        ')',
        '',
        '# Schedule monitoring job',
        'from sagemaker.model_monitor import CronExpressionGenerator',
        '',
        'data_quality_monitor.create_monitoring_schedule(',
        '    monitor_schedule_name="mla-study-data-quality-schedule",',
        '    endpoint_input="your-endpoint-name",',
        '    output_s3_uri=f"s3://{bucket}/monitoring/data-quality/",',
        '    statistics=data_quality_monitor.baseline_statistics(),',
        '    constraints=data_quality_monitor.suggested_constraints(),',
        '    schedule_cron_expression=CronExpressionGenerator.hourly(),',
        ')',
      ].join('\n'),
      description: 'Sample data quality monitor setup',
    });

    // Sample Model Quality Monitor setup
    new cdk.CfnOutput(this, 'SampleModelQualityMonitor', {
      value: [
        '# Model Quality Monitoring Setup',
        'from sagemaker.model_monitor import ModelQualityMonitor',
        'from sagemaker.model_monitor.dataset_format import DatasetFormat',
        '',
        '# Create model quality monitor',
        'model_quality_monitor = ModelQualityMonitor(',
        '    role=role,',
        '    instance_count=1,',
        '    instance_type="ml.m5.large",',
        '    volume_size_in_gb=20,',
        '    max_runtime_in_seconds=3600,',
        '    problem_type="BinaryClassification",',
        '    sagemaker_session=session,',
        ')',
        '',
        '# Create baseline from ground truth',
        'model_quality_monitor.suggest_baseline(',
        '    baseline_dataset=f"s3://{bucket}/baseline/ground_truth.csv",',
        '    dataset_format=DatasetFormat.csv(header=True),',
        '    output_s3_uri=f"s3://{bucket}/baseline/model-quality/",',
        '    problem_type="BinaryClassification",',
        '    inference_attribute="prediction",',
        '    ground_truth_attribute="label",',
        '    wait=True,',
        ')',
        '',
        '# Schedule monitoring',
        'model_quality_monitor.create_monitoring_schedule(',
        '    monitor_schedule_name="mla-study-model-quality-schedule",',
        '    endpoint_input="your-endpoint-name",',
        '    ground_truth_input=f"s3://{bucket}/ground-truth/",',
        '    output_s3_uri=f"s3://{bucket}/monitoring/model-quality/",',
        '    problem_type="BinaryClassification",',
        '    schedule_cron_expression=CronExpressionGenerator.daily(),',
        ')',
      ].join('\n'),
      description: 'Sample model quality monitor setup',
    });

    // Monitor types comparison
    new cdk.CfnOutput(this, 'MonitorTypesComparison', {
      value: [
        'Model Monitor Types:',
        '',
        'Data Quality Monitor:',
        '- Detects drift in input features',
        '- Schema validation (missing values, types)',
        '- Statistical drift (mean, std, quantiles)',
        '- No ground truth required',
        '',
        'Model Quality Monitor:',
        '- Tracks prediction accuracy over time',
        '- Requires ground truth labels',
        '- Metrics: Accuracy, F1, AUC, MSE, etc.',
        '- Detects model degradation',
        '',
        'Bias Drift Monitor:',
        '- Tracks fairness metrics over time',
        '- Uses SageMaker Clarify',
        '- Demographic parity, equalized odds',
        '- Regulatory compliance',
        '',
        'Feature Attribution Drift:',
        '- SHAP value changes over time',
        '- Feature importance shifts',
        '- Uses SageMaker Clarify',
        '- Explains prediction changes',
      ].join('\n'),
      description: 'Monitor types comparison',
    });

    // Bucket structure
    new cdk.CfnOutput(this, 'BucketStructure', {
      value: [
        'Recommended Bucket Structure:',
        `s3://${this.monitorBucket.bucketName}/`,
        '  baseline/',
        '    training_data.csv    # Data for baseline',
        '    ground_truth.csv     # Labels for model quality',
        '    results/             # Baseline statistics',
        '  data-capture/',
        '    <endpoint>/<date>/   # Captured inference data',
        '  ground-truth/',
        '    <date>/              # Ground truth labels',
        '  monitoring/',
        '    data-quality/        # Data quality reports',
        '    model-quality/       # Model quality reports',
        '    bias-drift/          # Bias monitoring reports',
      ].join('\n'),
      description: 'Recommended bucket structure',
    });

    // Data capture configuration
    new cdk.CfnOutput(this, 'DataCaptureConfig', {
      value: [
        'Endpoint Data Capture Configuration:',
        '',
        'from sagemaker.model_monitor import DataCaptureConfig',
        '',
        'data_capture_config = DataCaptureConfig(',
        '    enable_capture=True,',
        '    sampling_percentage=100,',
        '    destination_s3_uri=f"s3://{bucket}/data-capture/",',
        '    capture_options=["Input", "Output"],',
        '    csv_content_types=["text/csv"],',
        '    json_content_types=["application/json"],',
        ')',
        '',
        '# Deploy with data capture',
        'predictor = model.deploy(',
        '    instance_type="ml.m5.large",',
        '    initial_instance_count=1,',
        '    data_capture_config=data_capture_config,',
        ')',
      ].join('\n'),
      description: 'Data capture configuration',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Model Monitor Architecture:',
        '',
        'Infrastructure:',
        '- S3 bucket for baselines and reports',
        '- SNS topic for drift alerts',
        '- IAM role with monitor permissions',
        '',
        'Monitoring Workflow:',
        '1. Enable data capture on endpoint',
        '2. Create baseline from training data',
        '3. Schedule monitoring jobs',
        '4. Analyze violation reports',
        '5. Alert on threshold breaches',
        '6. Trigger retraining if needed',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '- Baseline statistics and constraints',
        '- Scheduled monitoring with cron',
        '- Data capture for inference logging',
        '- CloudWatch metrics and alarms',
        '- Ground truth collection patterns',
        '- Violation analysis and reporting',
        '- Integration with ML pipelines',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
