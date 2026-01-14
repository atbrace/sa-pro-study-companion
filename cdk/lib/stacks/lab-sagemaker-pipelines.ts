import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Pipelines Lab
 *
 * Demonstrates:
 * - ML Pipeline definition and execution
 * - Pipeline steps (Processing, Training, Evaluation)
 * - Conditional execution and model registration
 * - Pipeline parameters and caching
 * - EventBridge integration for automation
 * - MLOps workflow patterns
 *
 * Cost Estimate: ~$0.05/hour (infrastructure only)
 * - Pipeline execution: Pay per step compute
 * - S3: Minimal storage costs
 * - Lambda: Free tier eligible
 */
export class SageMakerPipelinesLabStack extends BaseLabStack {
  public readonly pipelineBucket: s3.Bucket;
  public readonly pipelineRole: iam.Role;
  public readonly modelPackageGroup: sagemaker.CfnModelPackageGroup;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // S3 Bucket for Pipeline Artifacts
    // ======================
    this.pipelineBucket = new s3.Bucket(this, 'PipelineBucket', {
      bucketName: `mla-study-pipelines-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
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

    cdk.Tags.of(this.pipelineBucket).add('Name', 'MLA Study Pipelines Bucket');

    // ======================
    // SageMaker Pipeline Role
    // ======================
    this.pipelineRole = new iam.Role(this, 'SageMakerPipelineRole', {
      roleName: 'mla-study-sagemaker-pipeline-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker Pipelines execution',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.pipelineBucket.grantReadWrite(this.pipelineRole);

    // Add ECR permissions
    this.pipelineRole.addToPolicy(new iam.PolicyStatement({
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
    this.pipelineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
    }));

    // Add Step Functions permissions for orchestration
    this.pipelineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'states:DescribeExecution',
        'states:GetExecutionHistory',
      ],
      resources: ['*'],
    }));

    // Add Model Registry permissions
    this.pipelineRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sagemaker:CreateModelPackage',
        'sagemaker:UpdateModelPackage',
        'sagemaker:DescribeModelPackage',
        'sagemaker:ListModelPackages',
      ],
      resources: ['*'],
    }));

    // ======================
    // Model Package Group (Model Registry)
    // ======================
    this.modelPackageGroup = new sagemaker.CfnModelPackageGroup(this, 'ModelPackageGroup', {
      modelPackageGroupName: 'mla-study-pipeline-models',
      modelPackageGroupDescription: 'Model package group for pipeline-trained models',
    });

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'PipelineBucketName', {
      value: this.pipelineBucket.bucketName,
      description: 'S3 bucket for pipeline artifacts',
      exportName: `${id}-PipelineBucketName`,
    });

    this.addConsoleUrlOutput(
      'PipelineBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.pipelineBucket.bucketName),
      'Console URL for pipeline S3 bucket'
    );

    new cdk.CfnOutput(this, 'PipelineRoleArn', {
      value: this.pipelineRole.roleArn,
      description: 'SageMaker Pipeline execution role ARN',
      exportName: `${id}-PipelineRoleArn`,
    });

    this.addConsoleUrlOutput(
      'PipelinesConsoleUrl',
      this.getSageMakerPipelinesConsoleUrl(),
      'Console URL for SageMaker Pipelines'
    );

    this.addConsoleUrlOutput(
      'ModelRegistryConsoleUrl',
      this.getSageMakerModelRegistryConsoleUrl(),
      'Console URL for Model Registry'
    );

    new cdk.CfnOutput(this, 'ModelPackageGroupName', {
      value: this.modelPackageGroup.modelPackageGroupName!,
      description: 'Model Package Group name',
      exportName: `${id}-ModelPackageGroupName`,
    });

    // Sample pipeline definition (Python code)
    new cdk.CfnOutput(this, 'SamplePipelineCode', {
      value: [
        '# SageMaker Pipeline Definition',
        'from sagemaker.workflow.pipeline import Pipeline',
        'from sagemaker.workflow.steps import ProcessingStep, TrainingStep, CreateModelStep',
        'from sagemaker.workflow.step_collections import RegisterModel',
        'from sagemaker.workflow.conditions import ConditionGreaterThan',
        'from sagemaker.workflow.condition_step import ConditionStep',
        'from sagemaker.workflow.parameters import ParameterString, ParameterFloat',
        'from sagemaker.processing import ScriptProcessor',
        'from sagemaker.xgboost import XGBoost',
        '',
        `role = "${this.pipelineRole.roleArn}"`,
        `bucket = "${this.pipelineBucket.bucketName}"`,
        '',
        '# Pipeline Parameters',
        'input_data = ParameterString(name="InputData", default_value=f"s3://{bucket}/data/")',
        'model_approval_status = ParameterString(name="ModelApprovalStatus", default_value="PendingManualApproval")',
        'accuracy_threshold = ParameterFloat(name="AccuracyThreshold", default_value=0.75)',
        '',
        '# Step 1: Data Processing',
        'processor = ScriptProcessor(',
        '    role=role,',
        '    image_uri="...",',
        '    instance_type="ml.m5.large",',
        '    instance_count=1,',
        ')',
        '',
        'processing_step = ProcessingStep(',
        '    name="PreprocessData",',
        '    processor=processor,',
        '    inputs=[...],',
        '    outputs=[...],',
        '    code="preprocess.py",',
        ')',
        '',
        '# Step 2: Training',
        'xgb = XGBoost(role=role, instance_type="ml.m5.large", ...)',
        'training_step = TrainingStep(name="TrainModel", estimator=xgb, inputs={...})',
        '',
        '# Step 3: Evaluation',
        'eval_step = ProcessingStep(name="EvaluateModel", ...)',
        '',
        '# Step 4: Conditional Model Registration',
        'register_step = RegisterModel(',
        '    name="RegisterModel",',
        '    model=training_step.properties.ModelArtifacts.S3ModelArtifacts,',
        `    model_package_group_name="${this.modelPackageGroup.modelPackageGroupName}",`,
        '    approval_status=model_approval_status,',
        ')',
        '',
        'condition_step = ConditionStep(',
        '    name="CheckAccuracy",',
        '    conditions=[ConditionGreaterThan(left=eval_step.properties.ProcessingOutputConfig..., right=accuracy_threshold)],',
        '    if_steps=[register_step],',
        '    else_steps=[],',
        ')',
        '',
        '# Create Pipeline',
        'pipeline = Pipeline(',
        '    name="mla-study-ml-pipeline",',
        '    parameters=[input_data, model_approval_status, accuracy_threshold],',
        '    steps=[processing_step, training_step, eval_step, condition_step],',
        ')',
        '',
        '# Execute Pipeline',
        'pipeline.upsert(role_arn=role)',
        'execution = pipeline.start()',
      ].join('\n'),
      description: 'Sample pipeline definition code',
    });

    // Pipeline step types
    new cdk.CfnOutput(this, 'PipelineStepTypes', {
      value: [
        'SageMaker Pipeline Step Types:',
        '',
        'ProcessingStep:',
        '- Data preprocessing and feature engineering',
        '- Model evaluation and validation',
        '- Any containerized processing job',
        '',
        'TrainingStep:',
        '- Model training with any algorithm',
        '- Hyperparameter configuration',
        '- Distributed training support',
        '',
        'TuningStep:',
        '- Hyperparameter tuning jobs',
        '- Multiple trials with optimization',
        '',
        'CreateModelStep:',
        '- Create SageMaker Model from artifacts',
        '- Configure inference container',
        '',
        'RegisterModel:',
        '- Register model in Model Registry',
        '- Set approval status',
        '- Track model lineage',
        '',
        'TransformStep:',
        '- Batch transform for inference',
        '- Large-scale predictions',
        '',
        'ConditionStep:',
        '- Conditional branching logic',
        '- Based on metrics or parameters',
        '',
        'FailStep:',
        '- Explicit pipeline failure',
        '- Error handling',
      ].join('\n'),
      description: 'Pipeline step types',
    });

    // Pipeline features
    new cdk.CfnOutput(this, 'PipelineFeatures', {
      value: [
        'Key Pipeline Features:',
        '',
        'Parameters:',
        '- ParameterString: Text values',
        '- ParameterInteger: Whole numbers',
        '- ParameterFloat: Decimal numbers',
        '- Override at execution time',
        '',
        'Caching:',
        '- Cache step outputs',
        '- Skip re-execution if inputs unchanged',
        '- Faster iterative development',
        '',
        'Property References:',
        '- Access outputs from previous steps',
        '- Dynamic data dependencies',
        '- Automatic orchestration',
        '',
        'Retry Policies:',
        '- Configure automatic retries',
        '- Handle transient failures',
        '',
        'Parallelism:',
        '- Independent steps run in parallel',
        '- Automatic dependency resolution',
      ].join('\n'),
      description: 'Key pipeline features',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Pipelines Architecture:',
        '',
        'Infrastructure:',
        '- S3 bucket for artifacts and data',
        '- IAM role with pipeline permissions',
        '- Model Package Group for versioning',
        '',
        'Typical ML Pipeline Flow:',
        '1. Data Processing (feature engineering)',
        '2. Model Training (algorithm execution)',
        '3. Model Evaluation (metric calculation)',
        '4. Condition Check (quality gate)',
        '5. Model Registration (if approved)',
        '6. Optional: Deployment trigger',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '- Pipeline as code (Python SDK)',
        '- Parameterized executions',
        '- Step caching for efficiency',
        '- Conditional branching',
        '- Model Registry integration',
        '- EventBridge triggers for automation',
        '- Lineage tracking and reproducibility',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
