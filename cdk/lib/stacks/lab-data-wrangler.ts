import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Data Wrangler Lab
 *
 * Demonstrates:
 * - Data Wrangler flow creation and execution
 * - Visual data exploration and profiling
 * - Built-in transformations (encode, normalize, etc.)
 * - Custom transformations with Python/PySpark
 * - Export to SageMaker Processing jobs
 * - Export to SageMaker Feature Store
 *
 * Cost Estimate: ~$0.27/hour when Data Wrangler app running
 * - ml.m5.4xlarge instance: $0.922/hour (default)
 * - Data Wrangler has minimum instance requirements
 * - S3: Minimal storage costs
 */
export class DataWranglerLabStack extends BaseLabStack {
  public readonly wranglerBucket: s3.Bucket;
  public readonly wranglerRole: iam.Role;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.27,
    });

    // ======================
    // S3 Bucket for Data Wrangler
    // ======================
    this.wranglerBucket = new s3.Bucket(this, 'WranglerBucket', {
      bucketName: `mla-study-wrangler-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteOldData',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(this.wranglerBucket).add('Name', 'MLA Study Data Wrangler Bucket');

    // ======================
    // Data Wrangler Role
    // ======================
    this.wranglerRole = new iam.Role(this, 'DataWranglerRole', {
      roleName: 'mla-study-data-wrangler-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker Data Wrangler',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access
    this.wranglerBucket.grantReadWrite(this.wranglerRole);

    // Add Athena permissions for data sources
    this.wranglerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'athena:StartQueryExecution',
        'athena:GetQueryExecution',
        'athena:GetQueryResults',
        'athena:StopQueryExecution',
        'athena:GetWorkGroup',
      ],
      resources: ['*'],
    }));

    // Add Glue permissions for data catalog
    this.wranglerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:GetTable',
        'glue:GetTables',
        'glue:GetPartitions',
        'glue:BatchGetPartition',
      ],
      resources: ['*'],
    }));

    // Add Redshift permissions
    this.wranglerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'redshift:DescribeClusters',
        'redshift:GetClusterCredentials',
      ],
      resources: ['*'],
    }));

    // Add Secrets Manager permissions for data source credentials
    this.wranglerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:ListSecrets',
      ],
      resources: ['*'],
    }));

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'WranglerBucketName', {
      value: this.wranglerBucket.bucketName,
      description: 'S3 bucket for Data Wrangler',
      exportName: `${id}-WranglerBucketName`,
    });

    this.addConsoleUrlOutput(
      'WranglerBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.wranglerBucket.bucketName),
      'Console URL for Data Wrangler S3 bucket'
    );

    new cdk.CfnOutput(this, 'WranglerRoleArn', {
      value: this.wranglerRole.roleArn,
      description: 'Data Wrangler execution role ARN',
      exportName: `${id}-WranglerRoleArn`,
    });

    this.addConsoleUrlOutput(
      'SageMakerStudioConsoleUrl',
      this.getSageMakerStudioConsoleUrl(),
      'Console URL for SageMaker Studio (to access Data Wrangler)'
    );

    // Data sources supported
    new cdk.CfnOutput(this, 'SupportedDataSources', {
      value: [
        'Data Wrangler Supported Data Sources:',
        '',
        'AWS Sources:',
        '- Amazon S3 (CSV, Parquet, JSON, ORC)',
        '- Amazon Athena (SQL queries)',
        '- Amazon Redshift',
        '- AWS Glue Data Catalog',
        '- Amazon EMR',
        '',
        'Third-party Sources:',
        '- Snowflake',
        '- Databricks',
        '- JDBC connections',
        '',
        'Data Import Features:',
        '- Schema inference',
        '- Sampling for large datasets',
        '- Preview before import',
        '- SQL query support',
      ].join('\n'),
      description: 'Supported data sources',
    });

    // Built-in transformations
    new cdk.CfnOutput(this, 'BuiltInTransformations', {
      value: [
        'Data Wrangler Built-in Transformations:',
        '',
        'Data Quality:',
        '- Handle missing values (drop, fill, impute)',
        '- Handle outliers (clip, remove, replace)',
        '- Remove duplicates',
        '- Fix data types',
        '',
        'Feature Engineering:',
        '- One-hot encoding',
        '- Ordinal encoding',
        '- Label encoding',
        '- Binning (equal width, quantile)',
        '- Normalization (min-max, z-score)',
        '- Standardization',
        '',
        'Text Transformations:',
        '- Tokenization',
        '- Vectorization (TF-IDF, Count)',
        '- Text cleaning (lowercase, remove punctuation)',
        '',
        'Time Series:',
        '- Datetime featurization',
        '- Lag features',
        '- Rolling statistics',
        '',
        'Custom:',
        '- Python (Pandas)',
        '- PySpark',
        '- SQL',
      ].join('\n'),
      description: 'Built-in transformations',
    });

    // Export options
    new cdk.CfnOutput(this, 'ExportOptions', {
      value: [
        'Data Wrangler Export Options:',
        '',
        'Export to S3:',
        '- Direct data export',
        '- Parquet or CSV format',
        '- Partition by columns',
        '',
        'Export to Processing Job:',
        '- Generate processing script',
        '- Run at scale with SageMaker',
        '- Schedule with Pipelines',
        '',
        'Export to Feature Store:',
        '- Create feature group',
        '- Ingest features automatically',
        '- Online and offline stores',
        '',
        'Export to Pipeline:',
        '- SageMaker Pipeline step',
        '- Automated reprocessing',
        '- Integration with training',
        '',
        'Export as Code:',
        '- Python script (Pandas)',
        '- PySpark script',
        '- Notebook',
      ].join('\n'),
      description: 'Export options',
    });

    // Sample workflow
    new cdk.CfnOutput(this, 'SampleWorkflow', {
      value: [
        'Data Wrangler Workflow:',
        '',
        '1. Create New Flow:',
        '   - Open SageMaker Studio',
        '   - File > New > Data Wrangler Flow',
        '',
        '2. Import Data:',
        '   - Click "Import data"',
        '   - Select source (S3, Athena, etc.)',
        `   - Browse to s3://${this.wranglerBucket.bucketName}/raw/`,
        '',
        '3. Explore Data:',
        '   - View data profile',
        '   - Check data types',
        '   - Identify quality issues',
        '',
        '4. Add Transformations:',
        '   - Click "+" on data flow',
        '   - Select transformation type',
        '   - Configure parameters',
        '   - Preview results',
        '',
        '5. Analyze Features:',
        '   - Add Analysis step',
        '   - Target leakage detection',
        '   - Feature correlation',
        '   - Quick Model evaluation',
        '',
        '6. Export:',
        '   - Click "Export"',
        '   - Choose destination',
        '   - Generate job or script',
      ].join('\n'),
      description: 'Sample workflow',
    });

    // Bucket structure
    new cdk.CfnOutput(this, 'BucketStructure', {
      value: [
        'Recommended Bucket Structure:',
        `s3://${this.wranglerBucket.bucketName}/`,
        '  raw/',
        '    *.csv                # Raw input data',
        '    *.parquet            # Parquet files',
        '  flows/',
        '    *.flow               # Data Wrangler flows',
        '  processed/',
        '    train/               # Processed training data',
        '    validation/          # Processed validation data',
        '  scripts/',
        '    processing.py        # Exported processing scripts',
      ].join('\n'),
      description: 'Recommended bucket structure',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Data Wrangler Architecture:',
        '',
        'Key Features:',
        '- Visual data preparation interface',
        '- 300+ built-in transformations',
        '- Data quality insights',
        '- ML-aware data analysis',
        '',
        'Key MLA-C01 Concepts:',
        '',
        '1. Data Flows:',
        '   - Visual DAG of transformations',
        '   - Versioned and reproducible',
        '   - Exportable to code',
        '',
        '2. Data Insights:',
        '   - Automatic data profiling',
        '   - Target leakage detection',
        '   - Feature importance preview',
        '',
        '3. Integration:',
        '   - SageMaker Processing',
        '   - SageMaker Feature Store',
        '   - SageMaker Pipelines',
        '   - AWS Glue DataBrew alternative',
        '',
        '4. Cost Optimization:',
        '   - Sample data for exploration',
        '   - Export for batch processing',
        '   - Shut down when not in use',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
