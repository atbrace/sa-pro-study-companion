import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface BaseLabStackProps extends cdk.StackProps {
  /**
   * Unique identifier for this lab (e.g., 'lab-vpc-networking')
   */
  labId: string;

  /**
   * Optional cost estimate per hour in USD
   */
  estimatedCostPerHour?: number;
}

/**
 * Base stack for all SAP-C02 study labs
 *
 * Provides common functionality:
 * - Automatic tagging for identification and cleanup
 * - CloudFormation outputs for console links
 * - Cost estimation
 * - Deployment tracking
 */
export abstract class BaseLabStack extends cdk.Stack {
  protected readonly labId: string;
  protected readonly estimatedCostPerHour: number;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, props);

    this.labId = props.labId;
    this.estimatedCostPerHour = props.estimatedCostPerHour || 0;

    // Tag all resources in this stack for identification and cleanup
    cdk.Tags.of(this).add('sap-study-lab', props.labId);
    cdk.Tags.of(this).add('auto-cleanup', 'true');
    cdk.Tags.of(this).add('managed-by', 'sap-study-companion');
    cdk.Tags.of(this).add('deployment-timestamp', new Date().toISOString());

    // Add lab metadata as stack output
    new cdk.CfnOutput(this, 'LabId', {
      value: props.labId,
      description: 'Lab identifier',
      exportName: `${id}-LabId`,
    });

    new cdk.CfnOutput(this, 'LabStackName', {
      value: this.stackName,
      description: 'CloudFormation stack name',
      exportName: `${id}-StackName`,
    });

    if (this.estimatedCostPerHour > 0) {
      new cdk.CfnOutput(this, 'EstimatedCostPerHour', {
        value: `$${this.estimatedCostPerHour.toFixed(2)}`,
        description: 'Estimated cost per hour (USD)',
      });
    }
  }

  /**
   * Helper to create console URL output for a resource
   */
  protected addConsoleUrlOutput(
    id: string,
    url: string,
    description: string
  ): void {
    new cdk.CfnOutput(this, id, {
      value: url,
      description,
    });
  }

  /**
   * Helper to create console URL for VPC
   */
  protected getVpcConsoleUrl(vpcId: string): string {
    return `https://${this.region}.console.aws.amazon.com/vpc/home?region=${this.region}#VpcDetails:VpcId=${vpcId}`;
  }

  /**
   * Helper to create console URL for subnet
   */
  protected getSubnetConsoleUrl(subnetId: string): string {
    return `https://${this.region}.console.aws.amazon.com/vpc/home?region=${this.region}#SubnetDetails:subnetId=${subnetId}`;
  }

  /**
   * Helper to create console URL for security group
   */
  protected getSecurityGroupConsoleUrl(sgId: string): string {
    return `https://${this.region}.console.aws.amazon.com/vpc/home?region=${this.region}#SecurityGroup:groupId=${sgId}`;
  }

  /**
   * Helper to create console URL for EC2 instance
   */
  protected getEc2ConsoleUrl(instanceId: string): string {
    return `https://${this.region}.console.aws.amazon.com/ec2/v2/home?region=${this.region}#InstanceDetails:instanceId=${instanceId}`;
  }

  /**
   * Helper to create console URL for RDS instance
   */
  protected getRdsConsoleUrl(dbIdentifier: string): string {
    return `https://${this.region}.console.aws.amazon.com/rds/home?region=${this.region}#database:id=${dbIdentifier}`;
  }

  /**
   * Helper to create console URL for Lambda function
   */
  protected getLambdaConsoleUrl(functionName: string): string {
    return `https://${this.region}.console.aws.amazon.com/lambda/home?region=${this.region}#/functions/${functionName}`;
  }

  /**
   * Helper to create console URL for DynamoDB table
   */
  protected getDynamoDbConsoleUrl(tableName: string): string {
    return `https://${this.region}.console.aws.amazon.com/dynamodbv2/home?region=${this.region}#table?name=${tableName}`;
  }
}
