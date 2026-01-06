import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * RDS Multi-AZ Lab
 *
 * Demonstrates:
 * - RDS Multi-AZ deployment for high availability
 * - Read replicas for read scaling
 * - Automated backups and snapshots
 * - Parameter groups and option groups
 * - Security group configuration for databases
 * - VPC subnet groups
 *
 * Cost Estimate: ~$0.30/hour
 * - RDS db.t3.micro Multi-AZ: ~$0.034/hour x 2 = $0.068/hour
 * - Read replica db.t3.micro: ~$0.034/hour
 * - Storage (20GB gp3): ~$0.004/hour
 * - Backup storage: Minimal for testing
 */
export class RdsMultiAzLabStack extends BaseLabStack {
  public readonly vpc: ec2.Vpc;
  public readonly primaryInstance: rds.DatabaseInstance;
  public readonly readReplica: rds.DatabaseInstanceReadReplica;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.15,
    });

    // ======================
    // VPC for RDS
    // ======================
    this.vpc = new ec2.Vpc(this, 'RdsVpc', {
      vpcName: 'sap-study-rds-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.2.0.0/16'),
      maxAzs: 3,
      natGateways: 0, // No NAT needed for this lab
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    cdk.Tags.of(this.vpc).add('Name', 'RDS Multi-AZ VPC');

    // ======================
    // Security Group
    // ======================
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS instances',
      allowAllOutbound: false,
    });

    // Allow PostgreSQL from within VPC
    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from VPC'
    );

    cdk.Tags.of(dbSecurityGroup).add('Name', 'RDS Security Group');

    // ======================
    // DB Subnet Group
    // ======================
    const subnetGroup = new rds.SubnetGroup(this, 'DbSubnetGroup', {
      description: 'Subnet group for RDS instances',
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ======================
    // Parameter Group
    // ======================
    const parameterGroup = new rds.ParameterGroup(this, 'DbParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      description: 'Custom parameter group for SAP study lab',
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
        'log_min_duration_statement': '1000', // Log queries > 1 second
      },
    });

    // ======================
    // Primary RDS Instance (Multi-AZ)
    // ======================
    this.primaryInstance = new rds.DatabaseInstance(this, 'PrimaryDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      subnetGroup,
      securityGroups: [dbSecurityGroup],
      multiAz: true, // Enable Multi-AZ
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      databaseName: 'sapstudydb',
      credentials: rds.Credentials.fromGeneratedSecret('dbadmin'), // Creates secret in Secrets Manager
      parameterGroup,
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      publiclyAccessible: false,
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days
    });

    cdk.Tags.of(this.primaryInstance).add('Name', 'Primary DB (Multi-AZ)');

    // ======================
    // Read Replica
    // ======================
    this.readReplica = new rds.DatabaseInstanceReadReplica(this, 'ReadReplica', {
      sourceDatabaseInstance: this.primaryInstance,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      publiclyAccessible: false,
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enablePerformanceInsights: true,
    });

    cdk.Tags.of(this.readReplica).add('Name', 'Read Replica');

    // ======================
    // CloudFormation Outputs
    // ======================

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'PrimaryEndpoint', {
      value: this.primaryInstance.dbInstanceEndpointAddress,
      description: 'Primary database endpoint (Multi-AZ)',
    });

    new cdk.CfnOutput(this, 'ReadReplicaEndpoint', {
      value: this.readReplica.dbInstanceEndpointAddress,
      description: 'Read replica endpoint',
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.primaryInstance.secret?.secretArn || 'N/A',
      description: 'Secrets Manager secret ARN for DB credentials',
    });

    this.addConsoleUrlOutput(
      'RdsConsoleUrl',
      `https://console.aws.amazon.com/rds/home?region=${this.region}#databases:`,
      'Console URL for RDS databases'
    );

    this.addConsoleUrlOutput(
      'SecretsManagerUrl',
      `https://console.aws.amazon.com/secretsmanager/home?region=${this.region}#/listSecrets`,
      'Console URL for Secrets Manager'
    );

    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'RDS Multi-AZ Architecture:',
        '- Primary PostgreSQL instance with Multi-AZ enabled',
        '- Read replica in same region',
        '- Automated backups with 7-day retention',
        '- Performance Insights enabled',
        '- Credentials stored in Secrets Manager',
        '- Encrypted storage with gp3 volumes',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
