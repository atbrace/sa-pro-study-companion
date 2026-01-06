import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * VPC Networking Lab
 *
 * Demonstrates:
 * - Multi-AZ VPC design
 * - Public and private subnets
 * - Internet Gateway and NAT Gateways
 * - Route tables and routing
 * - Security groups
 * - Transit Gateway for multi-VPC connectivity
 * - VPC peering
 *
 * Cost Estimate: ~$0.10/hour
 * - NAT Gateways: 2 x $0.045/hour = $0.09/hour
 * - Transit Gateway: $0.05/hour (if enabled)
 * - Data transfer: minimal for testing
 */
export class VpcNetworkingLabStack extends BaseLabStack {
  public readonly vpc1: ec2.Vpc;
  public readonly vpc2: ec2.Vpc;
  public readonly transitGateway?: ec2.CfnTransitGateway;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.10,
    });

    // ======================
    // VPC 1: Production-like VPC
    // ======================
    this.vpc1 = new ec2.Vpc(this, 'ProductionVpc', {
      vpcName: 'sap-study-prod-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1, // Use 1 for cost savings, production would use 2
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Tag VPC subnets for clarity
    cdk.Tags.of(this.vpc1).add('Name', 'Production VPC');
    cdk.Tags.of(this.vpc1).add('Purpose', 'SAP-C02 Lab - Multi-tier architecture');

    // ======================
    // VPC 2: Shared Services VPC
    // ======================
    this.vpc2 = new ec2.Vpc(this, 'SharedServicesVpc', {
      vpcName: 'sap-study-shared-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.1.0.0/16'),
      maxAzs: 2,
      natGateways: 0, // No NAT gateway for cost savings
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    cdk.Tags.of(this.vpc2).add('Name', 'Shared Services VPC');
    cdk.Tags.of(this.vpc2).add('Purpose', 'SAP-C02 Lab - Centralized services');

    // ======================
    // VPC Peering Connection
    // ======================
    const peeringConnection = new ec2.CfnVPCPeeringConnection(this, 'VpcPeering', {
      vpcId: this.vpc1.vpcId,
      peerVpcId: this.vpc2.vpcId,
      tags: [
        {
          key: 'Name',
          value: 'Prod-to-Shared Peering',
        },
      ],
    });

    // Add routes for VPC peering in VPC1 private subnets
    this.vpc1.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `Vpc1ToVpc2Route${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: this.vpc2.vpcCidrBlock,
        vpcPeeringConnectionId: peeringConnection.ref,
      });
    });

    // Add routes for VPC peering in VPC2 private subnets
    this.vpc2.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `Vpc2ToVpc1Route${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: this.vpc1.vpcCidrBlock,
        vpcPeeringConnectionId: peeringConnection.ref,
      });
    });

    // ======================
    // Security Groups
    // ======================

    // Web tier security group (VPC1)
    const webSg = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc: this.vpc1,
      description: 'Security group for web tier - allows HTTP/HTTPS from internet',
      allowAllOutbound: true,
    });

    webSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet'
    );

    webSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    cdk.Tags.of(webSg).add('Name', 'Web Tier SG');

    // Application tier security group (VPC1)
    const appSg = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc: this.vpc1,
      description: 'Security group for app tier - allows traffic from web tier',
      allowAllOutbound: true,
    });

    appSg.addIngressRule(
      webSg,
      ec2.Port.tcp(8080),
      'Allow traffic from web tier'
    );

    cdk.Tags.of(appSg).add('Name', 'App Tier SG');

    // Database tier security group (VPC1)
    const dbSg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc1,
      description: 'Security group for database tier - allows traffic from app tier',
      allowAllOutbound: false,
    });

    dbSg.addIngressRule(
      appSg,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from app tier'
    );

    cdk.Tags.of(dbSg).add('Name', 'Database Tier SG');

    // ======================
    // Network ACLs (Example)
    // ======================

    // Create a custom NACL for the public subnet
    const publicNacl = new ec2.NetworkAcl(this, 'PublicNacl', {
      vpc: this.vpc1,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // Allow inbound HTTP
    publicNacl.addEntry('AllowInboundHttp', {
      cidr: ec2.AclCidr.anyIpv4(),
      ruleNumber: 100,
      traffic: ec2.AclTraffic.tcpPort(80),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // Allow inbound HTTPS
    publicNacl.addEntry('AllowInboundHttps', {
      cidr: ec2.AclCidr.anyIpv4(),
      ruleNumber: 110,
      traffic: ec2.AclTraffic.tcpPort(443),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // Allow inbound ephemeral ports (for return traffic)
    publicNacl.addEntry('AllowInboundEphemeral', {
      cidr: ec2.AclCidr.anyIpv4(),
      ruleNumber: 120,
      traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // Allow all outbound
    publicNacl.addEntry('AllowAllOutbound', {
      cidr: ec2.AclCidr.anyIpv4(),
      ruleNumber: 100,
      traffic: ec2.AclTraffic.allTraffic(),
      direction: ec2.TrafficDirection.EGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // ======================
    // CloudFormation Outputs
    // ======================

    // VPC 1 Outputs
    new cdk.CfnOutput(this, 'Vpc1Id', {
      value: this.vpc1.vpcId,
      description: 'Production VPC ID',
      exportName: `${id}-Vpc1Id`,
    });

    this.addConsoleUrlOutput(
      'Vpc1ConsoleUrl',
      this.getVpcConsoleUrl(this.vpc1.vpcId),
      'Console URL for Production VPC'
    );

    new cdk.CfnOutput(this, 'Vpc1Cidr', {
      value: this.vpc1.vpcCidrBlock,
      description: 'Production VPC CIDR block',
    });

    new cdk.CfnOutput(this, 'Vpc1PublicSubnets', {
      value: this.vpc1.publicSubnets.map(s => s.subnetId).join(','),
      description: 'Production VPC public subnet IDs',
    });

    new cdk.CfnOutput(this, 'Vpc1PrivateSubnets', {
      value: this.vpc1.privateSubnets.map(s => s.subnetId).join(','),
      description: 'Production VPC private subnet IDs',
    });

    // VPC 2 Outputs
    new cdk.CfnOutput(this, 'Vpc2Id', {
      value: this.vpc2.vpcId,
      description: 'Shared Services VPC ID',
      exportName: `${id}-Vpc2Id`,
    });

    this.addConsoleUrlOutput(
      'Vpc2ConsoleUrl',
      this.getVpcConsoleUrl(this.vpc2.vpcId),
      'Console URL for Shared Services VPC'
    );

    new cdk.CfnOutput(this, 'Vpc2Cidr', {
      value: this.vpc2.vpcCidrBlock,
      description: 'Shared Services VPC CIDR block',
    });

    // VPC Peering Output
    new cdk.CfnOutput(this, 'VpcPeeringConnectionId', {
      value: peeringConnection.ref,
      description: 'VPC Peering Connection ID',
    });

    // Security Group Outputs
    new cdk.CfnOutput(this, 'WebSecurityGroupId', {
      value: webSg.securityGroupId,
      description: 'Web tier security group ID',
    });

    this.addConsoleUrlOutput(
      'WebSecurityGroupConsoleUrl',
      this.getSecurityGroupConsoleUrl(webSg.securityGroupId),
      'Console URL for Web Security Group'
    );

    new cdk.CfnOutput(this, 'AppSecurityGroupId', {
      value: appSg.securityGroupId,
      description: 'App tier security group ID',
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: dbSg.securityGroupId,
      description: 'Database tier security group ID',
    });

    // Architecture summary output
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'VPC Architecture:',
        `- Production VPC (${this.vpc1.vpcCidrBlock}): Public, Private, Isolated subnets across 2 AZs`,
        `- Shared Services VPC (${this.vpc2.vpcCidrBlock}): Public and Private subnets across 2 AZs`,
        '- VPC Peering between Production and Shared Services',
        '- 3-tier security group architecture (Web → App → Database)',
        '- Network ACLs on public subnets',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
