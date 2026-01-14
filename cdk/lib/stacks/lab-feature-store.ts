import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * SageMaker Feature Store Lab
 *
 * Demonstrates:
 * - Feature Group creation with online and offline stores
 * - Feature definitions and data types
 * - S3-based offline store with Glue Data Catalog
 * - IAM permissions for Feature Store operations
 * - Feature ingestion and retrieval patterns
 *
 * Cost Estimate: ~$0.01/hour
 * - Feature Store Online: $0.18/GB storage/month
 * - Feature Store Offline: S3 storage costs
 * - Glue Data Catalog: Free for first 1M objects
 * - Read/Write units: Pay per request
 */
export class FeatureStoreLabStack extends BaseLabStack {
  public readonly offlineStoreBucket: s3.Bucket;
  public readonly featureStoreRole: iam.Role;
  public readonly glueDatabase: glue.CfnDatabase;
  public readonly customerFeatureGroup: sagemaker.CfnFeatureGroup;
  public readonly transactionFeatureGroup: sagemaker.CfnFeatureGroup;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.01,
    });

    // ======================
    // S3 Bucket for Offline Store
    // ======================
    this.offlineStoreBucket = new s3.Bucket(this, 'OfflineStoreBucket', {
      bucketName: `mla-study-feature-store-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldFeatures',
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    cdk.Tags.of(this.offlineStoreBucket).add('Name', 'MLA Study Feature Store Offline');

    // ======================
    // Glue Database for Offline Store
    // ======================
    this.glueDatabase = new glue.CfnDatabase(this, 'FeatureStoreDatabase', {
      catalogId: cdk.Aws.ACCOUNT_ID,
      databaseInput: {
        name: 'mla_study_feature_store',
        description: 'Glue database for SageMaker Feature Store offline data',
      },
    });

    // ======================
    // Feature Store IAM Role
    // ======================
    this.featureStoreRole = new iam.Role(this, 'FeatureStoreRole', {
      roleName: 'mla-study-feature-store-role',
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      description: 'Role for SageMaker Feature Store operations',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'),
      ],
    });

    // Grant S3 access for offline store
    this.offlineStoreBucket.grantReadWrite(this.featureStoreRole);

    // Add Glue permissions
    this.featureStoreRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'glue:CreateTable',
        'glue:GetTable',
        'glue:GetTables',
        'glue:UpdateTable',
        'glue:DeleteTable',
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:BatchGetPartition',
        'glue:GetPartition',
        'glue:GetPartitions',
        'glue:CreatePartition',
        'glue:BatchCreatePartition',
      ],
      resources: [
        `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:catalog`,
        `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${this.glueDatabase.ref}`,
        `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.glueDatabase.ref}/*`,
      ],
    }));

    // ======================
    // Customer Feature Group
    // ======================
    this.customerFeatureGroup = new sagemaker.CfnFeatureGroup(this, 'CustomerFeatureGroup', {
      featureGroupName: 'mla-study-customer-features',
      recordIdentifierFeatureName: 'customer_id',
      eventTimeFeatureName: 'event_time',
      featureDefinitions: [
        { featureName: 'customer_id', featureType: 'String' },
        { featureName: 'event_time', featureType: 'Fractional' },
        { featureName: 'age', featureType: 'Integral' },
        { featureName: 'income', featureType: 'Fractional' },
        { featureName: 'credit_score', featureType: 'Integral' },
        { featureName: 'account_tenure_months', featureType: 'Integral' },
        { featureName: 'num_products', featureType: 'Integral' },
        { featureName: 'is_active', featureType: 'Integral' },
        { featureName: 'customer_segment', featureType: 'String' },
      ],
      onlineStoreConfig: {
        enableOnlineStore: true,
      },
      offlineStoreConfig: {
        s3StorageConfig: {
          s3Uri: `s3://${this.offlineStoreBucket.bucketName}/customer-features/`,
        },
        dataCatalogConfig: {
          catalog: 'AwsDataCatalog',
          database: this.glueDatabase.ref,
          tableName: 'customer_features',
        },
        disableGlueTableCreation: false,
      },
      roleArn: this.featureStoreRole.roleArn,
      description: 'Customer demographic and account features for ML models',
    });

    this.customerFeatureGroup.addDependency(this.glueDatabase);

    // ======================
    // Transaction Feature Group
    // ======================
    this.transactionFeatureGroup = new sagemaker.CfnFeatureGroup(this, 'TransactionFeatureGroup', {
      featureGroupName: 'mla-study-transaction-features',
      recordIdentifierFeatureName: 'customer_id',
      eventTimeFeatureName: 'event_time',
      featureDefinitions: [
        { featureName: 'customer_id', featureType: 'String' },
        { featureName: 'event_time', featureType: 'Fractional' },
        { featureName: 'avg_transaction_amount_30d', featureType: 'Fractional' },
        { featureName: 'num_transactions_30d', featureType: 'Integral' },
        { featureName: 'total_spend_30d', featureType: 'Fractional' },
        { featureName: 'max_transaction_amount_30d', featureType: 'Fractional' },
        { featureName: 'num_unique_merchants_30d', featureType: 'Integral' },
        { featureName: 'pct_online_transactions', featureType: 'Fractional' },
        { featureName: 'days_since_last_transaction', featureType: 'Integral' },
      ],
      onlineStoreConfig: {
        enableOnlineStore: true,
      },
      offlineStoreConfig: {
        s3StorageConfig: {
          s3Uri: `s3://${this.offlineStoreBucket.bucketName}/transaction-features/`,
        },
        dataCatalogConfig: {
          catalog: 'AwsDataCatalog',
          database: this.glueDatabase.ref,
          tableName: 'transaction_features',
        },
        disableGlueTableCreation: false,
      },
      roleArn: this.featureStoreRole.roleArn,
      description: 'Transaction aggregation features for fraud detection and churn prediction',
    });

    this.transactionFeatureGroup.addDependency(this.glueDatabase);

    // ======================
    // CloudFormation Outputs
    // ======================
    this.addConsoleUrlOutput(
      'FeatureStoreConsoleUrl',
      this.getSageMakerFeatureStoreConsoleUrl(),
      'Console URL for SageMaker Feature Store'
    );

    new cdk.CfnOutput(this, 'CustomerFeatureGroupName', {
      value: this.customerFeatureGroup.featureGroupName!,
      description: 'Customer Feature Group name',
      exportName: `${id}-CustomerFeatureGroupName`,
    });

    new cdk.CfnOutput(this, 'TransactionFeatureGroupName', {
      value: this.transactionFeatureGroup.featureGroupName!,
      description: 'Transaction Feature Group name',
      exportName: `${id}-TransactionFeatureGroupName`,
    });

    new cdk.CfnOutput(this, 'OfflineStoreBucketName', {
      value: this.offlineStoreBucket.bucketName,
      description: 'S3 bucket for offline feature store',
      exportName: `${id}-OfflineStoreBucketName`,
    });

    this.addConsoleUrlOutput(
      'OfflineStoreBucketConsoleUrl',
      this.getS3BucketConsoleUrl(this.offlineStoreBucket.bucketName),
      'Console URL for offline store S3 bucket'
    );

    new cdk.CfnOutput(this, 'GlueDatabaseName', {
      value: this.glueDatabase.ref,
      description: 'Glue database for feature store metadata',
    });

    this.addConsoleUrlOutput(
      'GlueConsoleUrl',
      this.getGlueConsoleUrl(),
      'Console URL for AWS Glue'
    );

    new cdk.CfnOutput(this, 'FeatureStoreRoleArn', {
      value: this.featureStoreRole.roleArn,
      description: 'IAM role for Feature Store operations',
    });

    // Sample Python code for feature ingestion
    new cdk.CfnOutput(this, 'SampleIngestionCode', {
      value: [
        '# Sample Python code for feature ingestion:',
        'import sagemaker',
        'from sagemaker.feature_store.feature_group import FeatureGroup',
        '',
        'session = sagemaker.Session()',
        `customer_fg = FeatureGroup(name='${this.customerFeatureGroup.featureGroupName}', sagemaker_session=session)`,
        '',
        '# Ingest a record',
        'record = [',
        '    {"FeatureName": "customer_id", "ValueAsString": "C001"},',
        '    {"FeatureName": "event_time", "ValueAsString": str(time.time())},',
        '    {"FeatureName": "age", "ValueAsString": "35"},',
        '    {"FeatureName": "income", "ValueAsString": "75000.0"},',
        '    # ... other features',
        ']',
        'customer_fg.put_record(record)',
      ].join('\n'),
      description: 'Sample Python code for feature ingestion',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'SageMaker Feature Store Architecture:',
        '',
        'Feature Groups:',
        `- Customer Features: 9 features (demographics, account info)`,
        `- Transaction Features: 9 features (30-day aggregations)`,
        '',
        'Storage Configuration:',
        '- Online Store: Enabled for low-latency inference',
        '- Offline Store: S3 + Glue Data Catalog for training',
        '',
        'Key Concepts Demonstrated:',
        '- Record identifier (customer_id) for point lookups',
        '- Event time for temporal consistency',
        '- Feature types: String, Integral, Fractional',
        '- Glue integration for SQL queries via Athena',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
