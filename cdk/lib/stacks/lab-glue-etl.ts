import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * AWS Glue ETL Lab for ML Data Preparation
 *
 * Demonstrates:
 * - Glue Crawlers for schema discovery
 * - Glue ETL Jobs for data transformation
 * - Glue Data Catalog for metadata management
 * - S3 data lake architecture for ML
 * - Data quality and partitioning strategies
 *
 * Cost Estimate: ~$0.44/hour when jobs running
 * - Glue Crawler: $0.44/DPU-hour
 * - Glue ETL Job: $0.44/DPU-hour (minimum 2 DPUs)
 * - S3: Minimal storage costs
 * - Data Catalog: Free for first 1M objects
 */
export class GlueEtlLabStack extends BaseLabStack {
  public readonly dataBucket: s3.Bucket;
  public readonly glueRole: iam.Role;
  public readonly glueDatabase: glue.CfnDatabase;
  public readonly rawDataCrawler: glue.CfnCrawler;
  public readonly processedDataCrawler: glue.CfnCrawler;
  public readonly etlJob: glue.CfnJob;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.44,
    });

    // ======================
    // S3 Data Lake Bucket
    // ======================
    this.dataBucket = new s3.Bucket(this, 'DataLakeBucket', {
      bucketName: `mla-study-data-lake-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
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

    cdk.Tags.of(this.dataBucket).add('Name', 'MLA Study Data Lake');

    // ======================
    // Glue IAM Role
    // ======================
    this.glueRole = new iam.Role(this, 'GlueRole', {
      roleName: 'mla-study-glue-role',
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      description: 'Role for AWS Glue ETL operations',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'),
      ],
    });

    // Grant S3 access
    this.dataBucket.grantReadWrite(this.glueRole);

    // Add CloudWatch Logs permissions
    this.glueRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['arn:aws:logs:*:*:log-group:/aws-glue/*'],
    }));

    // ======================
    // Glue Database
    // ======================
    this.glueDatabase = new glue.CfnDatabase(this, 'MLDataDatabase', {
      catalogId: cdk.Aws.ACCOUNT_ID,
      databaseInput: {
        name: 'mla_study_ml_data',
        description: 'Database for ML training data and feature datasets',
      },
    });

    // ======================
    // Raw Data Crawler
    // ======================
    this.rawDataCrawler = new glue.CfnCrawler(this, 'RawDataCrawler', {
      name: 'mla-study-raw-data-crawler',
      role: this.glueRole.roleArn,
      databaseName: this.glueDatabase.ref,
      targets: {
        s3Targets: [
          {
            path: `s3://${this.dataBucket.bucketName}/raw/`,
          },
        ],
      },
      schemaChangePolicy: {
        deleteBehavior: 'LOG',
        updateBehavior: 'UPDATE_IN_DATABASE',
      },
      configuration: JSON.stringify({
        Version: 1.0,
        CrawlerOutput: {
          Partitions: { AddOrUpdateBehavior: 'InheritFromTable' },
        },
        Grouping: {
          TableGroupingPolicy: 'CombineCompatibleSchemas',
        },
      }),
      description: 'Crawler for raw ML training data',
    });

    this.rawDataCrawler.addDependency(this.glueDatabase);

    // ======================
    // Processed Data Crawler
    // ======================
    this.processedDataCrawler = new glue.CfnCrawler(this, 'ProcessedDataCrawler', {
      name: 'mla-study-processed-data-crawler',
      role: this.glueRole.roleArn,
      databaseName: this.glueDatabase.ref,
      targets: {
        s3Targets: [
          {
            path: `s3://${this.dataBucket.bucketName}/processed/`,
          },
        ],
      },
      schemaChangePolicy: {
        deleteBehavior: 'LOG',
        updateBehavior: 'UPDATE_IN_DATABASE',
      },
      description: 'Crawler for processed ML-ready data',
    });

    this.processedDataCrawler.addDependency(this.glueDatabase);

    // ======================
    // Glue ETL Job
    // ======================
    const etlScript = `
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import col, when, lit, mean, stddev

# Initialize Glue context
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'SOURCE_PATH', 'TARGET_PATH'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read raw data
raw_df = spark.read.parquet(args['SOURCE_PATH'])

# Data cleaning and transformation
# 1. Handle missing values
cleaned_df = raw_df.na.fill({
    'numeric_col': 0,
    'string_col': 'unknown'
})

# 2. Remove duplicates
deduped_df = cleaned_df.dropDuplicates(['id'])

# 3. Feature engineering - normalize numeric columns
stats = deduped_df.select(
    mean('feature1').alias('mean_f1'),
    stddev('feature1').alias('std_f1')
).collect()[0]

normalized_df = deduped_df.withColumn(
    'feature1_normalized',
    (col('feature1') - lit(stats['mean_f1'])) / lit(stats['std_f1'])
)

# 4. Create derived features
final_df = normalized_df.withColumn(
    'feature_ratio',
    when(col('feature2') != 0, col('feature1') / col('feature2')).otherwise(0)
)

# Write processed data partitioned by date
final_df.write.mode('overwrite').partitionBy('date').parquet(args['TARGET_PATH'])

job.commit()
`;

    // Store ETL script in S3
    const scriptKey = 'scripts/ml-data-etl.py';

    this.etlJob = new glue.CfnJob(this, 'MLDataETLJob', {
      name: 'mla-study-ml-data-etl',
      role: this.glueRole.roleArn,
      command: {
        name: 'glueetl',
        pythonVersion: '3',
        scriptLocation: `s3://${this.dataBucket.bucketName}/${scriptKey}`,
      },
      defaultArguments: {
        '--job-language': 'python',
        '--job-bookmark-option': 'job-bookmark-enable',
        '--enable-metrics': 'true',
        '--enable-spark-ui': 'true',
        '--spark-event-logs-path': `s3://${this.dataBucket.bucketName}/spark-logs/`,
        '--enable-continuous-cloudwatch-log': 'true',
        '--SOURCE_PATH': `s3://${this.dataBucket.bucketName}/raw/`,
        '--TARGET_PATH': `s3://${this.dataBucket.bucketName}/processed/`,
      },
      glueVersion: '4.0',
      numberOfWorkers: 2,
      workerType: 'G.1X',
      timeout: 60,
      maxRetries: 1,
      description: 'ETL job for ML data preparation - cleaning, transformation, and feature engineering',
    });

    // ======================
    // CloudFormation Outputs
    // ======================
    new cdk.CfnOutput(this, 'DataBucketName', {
      value: this.dataBucket.bucketName,
      description: 'S3 bucket for data lake',
      exportName: `${id}-DataBucketName`,
    });

    this.addConsoleUrlOutput(
      'DataBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.dataBucket.bucketName),
      'Console URL for data lake S3 bucket'
    );

    new cdk.CfnOutput(this, 'GlueDatabaseName', {
      value: this.glueDatabase.ref,
      description: 'Glue database name',
      exportName: `${id}-GlueDatabaseName`,
    });

    this.addConsoleUrlOutput(
      'GlueConsoleUrl',
      this.getGlueConsoleUrl(),
      'Console URL for AWS Glue'
    );

    new cdk.CfnOutput(this, 'RawDataCrawlerName', {
      value: this.rawDataCrawler.name!,
      description: 'Raw data crawler name',
    });

    new cdk.CfnOutput(this, 'ProcessedDataCrawlerName', {
      value: this.processedDataCrawler.name!,
      description: 'Processed data crawler name',
    });

    new cdk.CfnOutput(this, 'ETLJobName', {
      value: this.etlJob.name!,
      description: 'Glue ETL job name',
      exportName: `${id}-ETLJobName`,
    });

    new cdk.CfnOutput(this, 'GlueRoleArn', {
      value: this.glueRole.roleArn,
      description: 'IAM role for Glue operations',
    });

    // Data lake structure
    new cdk.CfnOutput(this, 'DataLakeStructure', {
      value: [
        'Data Lake Structure:',
        `s3://${this.dataBucket.bucketName}/`,
        '  raw/                    # Raw ingested data',
        '  processed/              # Cleaned and transformed data',
        '  features/               # Feature-engineered datasets',
        '  scripts/                # ETL scripts',
        '  spark-logs/             # Spark UI logs',
      ].join('\n'),
      description: 'Data lake folder structure',
    });

    // Sample commands
    new cdk.CfnOutput(this, 'SampleCommands', {
      value: [
        '# Run the raw data crawler:',
        `aws glue start-crawler --name ${this.rawDataCrawler.name}`,
        '',
        '# Start the ETL job:',
        `aws glue start-job-run --job-name ${this.etlJob.name}`,
        '',
        '# Query data with Athena:',
        `SELECT * FROM ${this.glueDatabase.ref}.your_table LIMIT 10;`,
      ].join('\n'),
      description: 'Sample AWS CLI commands',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'AWS Glue ETL Architecture for ML:',
        '',
        'Components:',
        '- S3 Data Lake with raw/processed zones',
        '- Glue Data Catalog for schema management',
        '- Crawlers for automatic schema discovery',
        '- ETL Job (Glue 4.0, PySpark) for transformation',
        '',
        'ETL Pipeline:',
        '1. Ingest raw data to S3 raw/ folder',
        '2. Run crawler to discover schema',
        '3. Execute ETL job for cleaning/transformation',
        '4. Run processed crawler to catalog results',
        '5. Query with Athena or use in SageMaker',
        '',
        'Key ML Prep Features:',
        '- Missing value handling',
        '- Deduplication',
        '- Feature normalization',
        '- Derived feature creation',
        '- Partitioned output for efficient queries',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
