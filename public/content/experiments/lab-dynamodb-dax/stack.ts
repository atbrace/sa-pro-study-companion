import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as dax from 'aws-cdk-lib/aws-dax';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * DynamoDB + DAX Lab
 *
 * Demonstrates:
 * - DynamoDB table design with Global Secondary Index (GSI) and Local Secondary Index (LSI)
 * - DynamoDB Accelerator (DAX) for microsecond read latency
 * - VPC configuration for DAX cluster
 * - Auto-scaling policies for read/write capacity
 * - Time To Live (TTL) configuration
 * - Point-in-time recovery (PITR)
 * - IAM roles and policies for DAX access
 *
 * Cost Estimate: ~$0.30/hour
 * - DAX cluster: 2 x t3.small nodes = ~$0.058/hour each = $0.116/hour
 * - DynamoDB on-demand pricing: minimal for testing
 * - VPC: no charge
 * - Data transfer: minimal for testing
 */
export class DynamoDbDaxLabStack extends BaseLabStack {
  public readonly table: dynamodb.Table;
  public readonly daxCluster: dax.CfnCluster;
  public readonly vpc: ec2.Vpc;
  public readonly daxSecurityGroup: ec2.SecurityGroup;
  public readonly daxSubnetGroup: dax.CfnSubnetGroup;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.30,
    });

    // ======================
    // VPC for DAX Cluster
    // ======================
    // DAX requires a VPC and must be deployed in private subnets
    this.vpc = new ec2.Vpc(this, 'DaxVpc', {
      vpcName: 'sap-study-dax-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.2.0.0/16'),
      maxAzs: 2,
      natGateways: 0, // No NAT gateway needed for this lab
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    cdk.Tags.of(this.vpc).add('Name', 'DAX Lab VPC');
    cdk.Tags.of(this.vpc).add('Purpose', 'SAP-C02 Lab - DynamoDB DAX cluster');

    // ======================
    // DynamoDB Table
    // ======================
    // Create a table representing an e-commerce order system
    this.table = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'sap-study-orders',
      partitionKey: {
        name: 'customerId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'orderId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand for simplicity
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For lab cleanup
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expirationTime', // TTL enabled
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add Global Secondary Index for querying by order status
    this.table.addGlobalSecondaryIndex({
      indexName: 'OrderStatusIndex',
      partitionKey: {
        name: 'orderStatus',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'orderTimestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add Local Secondary Index for querying by product category within customer
    this.table.addLocalSecondaryIndex({
      indexName: 'ProductCategoryIndex',
      sortKey: {
        name: 'productCategory',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['orderTotal', 'orderStatus'],
    });

    cdk.Tags.of(this.table).add('Name', 'Orders Table');
    cdk.Tags.of(this.table).add('Purpose', 'SAP-C02 Lab - DynamoDB with DAX');

    // ======================
    // Security Group for DAX Cluster
    // ======================
    this.daxSecurityGroup = new ec2.SecurityGroup(this, 'DaxSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for DAX cluster - allows inbound traffic on port 8111',
      allowAllOutbound: true,
    });

    // Allow DAX cluster nodes to communicate with each other
    this.daxSecurityGroup.addIngressRule(
      this.daxSecurityGroup,
      ec2.Port.tcp(8111),
      'Allow DAX cluster inter-node communication'
    );

    // Allow application access from within VPC
    this.daxSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(8111),
      'Allow DAX client connections from VPC'
    );

    cdk.Tags.of(this.daxSecurityGroup).add('Name', 'DAX Cluster SG');

    // ======================
    // IAM Role for DAX Cluster
    // ======================
    const daxRole = new iam.Role(this, 'DaxServiceRole', {
      assumedBy: new iam.ServicePrincipal('dax.amazonaws.com'),
      description: 'IAM role for DAX cluster to access DynamoDB',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
      ],
    });

    // Grant DAX access to the DynamoDB table
    this.table.grantReadWriteData(daxRole);

    // ======================
    // DAX Subnet Group
    // ======================
    this.daxSubnetGroup = new dax.CfnSubnetGroup(this, 'DaxSubnetGroup', {
      subnetGroupName: 'sap-study-dax-subnet-group',
      description: 'Subnet group for DAX cluster',
      subnetIds: this.vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    // ======================
    // DAX Cluster
    // ======================
    this.daxCluster = new dax.CfnCluster(this, 'DaxCluster', {
      clusterName: 'sap-study-dax-cluster',
      nodeType: 'dax.t3.small', // Smallest instance type for cost optimization
      replicationFactor: 2, // 1 primary + 1 replica for high availability
      iamRoleArn: daxRole.roleArn,
      subnetGroupName: this.daxSubnetGroup.subnetGroupName,
      securityGroupIds: [this.daxSecurityGroup.securityGroupId],
      description: 'DAX cluster for SAP-C02 study lab',
      // Parameter group with sensible defaults
      parameterGroupName: 'default.dax1.0',
      // TTL settings
      clusterEndpointEncryptionType: 'NONE', // TLS for encryption in transit (can be NONE for lab)
      sseSpecification: {
        sseEnabled: true, // Encryption at rest
      },
    });

    // Ensure subnet group is created before cluster
    this.daxCluster.addDependency(this.daxSubnetGroup);

    // ======================
    // Auto-Scaling Configuration (Commented - only works with provisioned mode)
    // ======================
    // Note: Auto-scaling is only available for provisioned billing mode
    // This lab uses on-demand for simplicity, but here's how you'd configure it:
    /*
    const readScaling = this.table.autoScaleReadCapacity({
      minCapacity: 5,
      maxCapacity: 100,
    });

    readScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
    });

    const writeScaling = this.table.autoScaleWriteCapacity({
      minCapacity: 5,
      maxCapacity: 100,
    });

    writeScaling.scaleOnUtilization({
      targetUtilizationPercent: 70,
    });
    */

    // ======================
    // CloudFormation Outputs
    // ======================

    // DynamoDB Table Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table name',
      exportName: `${id}-TableName`,
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB table ARN',
    });

    this.addConsoleUrlOutput(
      'TableConsoleUrl',
      this.getDynamoDbConsoleUrl(this.table.tableName),
      'Console URL for DynamoDB table'
    );

    new cdk.CfnOutput(this, 'TableStreamArn', {
      value: this.table.tableStreamArn || 'N/A',
      description: 'DynamoDB table stream ARN',
    });

    // DAX Cluster Outputs
    new cdk.CfnOutput(this, 'DaxClusterName', {
      value: this.daxCluster.clusterName!,
      description: 'DAX cluster name',
      exportName: `${id}-DaxClusterName`,
    });

    new cdk.CfnOutput(this, 'DaxClusterEndpoint', {
      value: this.daxCluster.attrClusterDiscoveryEndpointUrl,
      description: 'DAX cluster endpoint for client connections',
    });

    new cdk.CfnOutput(this, 'DaxNodeType', {
      value: this.daxCluster.nodeType,
      description: 'DAX node instance type',
    });

    new cdk.CfnOutput(this, 'DaxReplicationFactor', {
      value: this.daxCluster.replicationFactor.toString(),
      description: 'Number of nodes in DAX cluster',
    });

    // VPC Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for DAX cluster',
    });

    this.addConsoleUrlOutput(
      'VpcConsoleUrl',
      this.getVpcConsoleUrl(this.vpc.vpcId),
      'Console URL for VPC'
    );

    // Security Group Output
    new cdk.CfnOutput(this, 'DaxSecurityGroupId', {
      value: this.daxSecurityGroup.securityGroupId,
      description: 'Security group ID for DAX cluster',
    });

    this.addConsoleUrlOutput(
      'DaxSecurityGroupConsoleUrl',
      this.getSecurityGroupConsoleUrl(this.daxSecurityGroup.securityGroupId),
      'Console URL for DAX security group'
    );

    // Index Information
    new cdk.CfnOutput(this, 'GlobalSecondaryIndex', {
      value: 'OrderStatusIndex (orderStatus, orderTimestamp)',
      description: 'GSI for querying orders by status',
    });

    new cdk.CfnOutput(this, 'LocalSecondaryIndex', {
      value: 'ProductCategoryIndex (customerId, productCategory)',
      description: 'LSI for querying orders by product category within customer',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'DynamoDB + DAX Architecture:',
        `- DynamoDB Table: ${this.table.tableName} (on-demand billing)`,
        '- Partition Key: customerId, Sort Key: orderId',
        '- GSI: OrderStatusIndex (query by order status)',
        '- LSI: ProductCategoryIndex (query by product category)',
        '- TTL enabled on expirationTime attribute',
        '- Point-in-time recovery enabled',
        '- DynamoDB Streams enabled',
        `- DAX Cluster: ${this.daxCluster.clusterName} (2 x dax.t3.small)`,
        '- DAX deployed in private subnets across 2 AZs',
        '- DAX provides microsecond read latency',
      ].join('\n'),
      description: 'Lab architecture summary',
    });

    // Connection instructions
    new cdk.CfnOutput(this, 'ConnectionInstructions', {
      value: [
        'To connect to DAX from within the VPC:',
        '1. Create an EC2 instance in the VPC (same subnets)',
        '2. Install DAX client SDK (Python, Node.js, or Java)',
        `3. Use endpoint: ${this.daxCluster.attrClusterDiscoveryEndpointUrl}`,
        '4. Ensure EC2 security group allows outbound to port 8111',
        '5. DAX security group already allows inbound from VPC CIDR',
      ].join('\n'),
      description: 'How to connect to DAX cluster',
    });
  }
}
