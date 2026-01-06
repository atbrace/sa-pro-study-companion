import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';

/**
 * Step Functions Workflow Lab
 *
 * Demonstrates:
 * - Step Functions state machine design (Standard and Express)
 * - Lambda function integration with Task states
 * - DynamoDB for workflow state persistence
 * - Choice states for conditional branching
 * - Parallel states for concurrent execution
 * - Error handling and retry strategies
 * - SNS integration for notifications
 * - CloudWatch Logs for workflow monitoring
 *
 * Cost Estimate: ~$0.05/hour
 * - Lambda executions: Minimal (free tier)
 * - DynamoDB on-demand: Minimal (free tier eligible)
 * - Step Functions Standard: $0.025 per 1,000 state transitions
 * - SNS notifications: Minimal (free tier)
 * - CloudWatch Logs: Minimal
 */
export class StepFunctionsLabStack extends BaseLabStack {
  public readonly stateMachine: sfn.StateMachine;
  public readonly expressStateMachine: sfn.StateMachine;
  public readonly workflowTable: dynamodb.Table;
  public readonly notificationTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.05,
    });

    // ======================
    // DynamoDB Table for Workflow State
    // ======================
    this.workflowTable = new dynamodb.Table(this, 'WorkflowTable', {
      tableName: 'sap-study-workflow-state',
      partitionKey: { name: 'executionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    cdk.Tags.of(this.workflowTable).add('Name', 'Workflow State Table');

    // ======================
    // SNS Topic for Notifications
    // ======================
    this.notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'sap-study-workflow-notifications',
      displayName: 'Workflow Notifications',
    });

    cdk.Tags.of(this.notificationTopic).add('Name', 'Workflow Notifications');

    // ======================
    // Lambda Functions
    // ======================

    // Validation Function
    const validateInputFunction = new lambda.Function(this, 'ValidateInputFunction', {
      functionName: 'sap-study-validate-input',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  console.log('Validating input:', JSON.stringify(event, null, 2));

  const { orderId, amount, customerEmail } = event;

  // Validation logic
  const isValid = orderId && amount > 0 && amount < 10000 && customerEmail;

  return {
    ...event,
    validationResult: isValid ? 'VALID' : 'INVALID',
    validatedAt: new Date().toISOString(),
  };
};
      `),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: this.workflowTable.tableName,
      },
    });

    this.workflowTable.grantReadWriteData(validateInputFunction);

    // Process Order Function
    const processOrderFunction = new lambda.Function(this, 'ProcessOrderFunction', {
      functionName: 'sap-study-process-order',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log('Processing order:', JSON.stringify(event, null, 2));

  const executionId = event.executionId || Date.now().toString();

  // Save to DynamoDB
  await ddb.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      executionId,
      timestamp: Date.now(),
      status: 'PROCESSING',
      orderData: event,
    },
  }));

  // Simulate processing
  const processingTime = Math.random() * 2000 + 1000;
  await new Promise(resolve => setTimeout(resolve, processingTime));

  return {
    ...event,
    executionId,
    status: 'PROCESSED',
    processedAt: new Date().toISOString(),
    processingTimeMs: Math.round(processingTime),
  };
};
      `),
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: this.workflowTable.tableName,
      },
    });

    this.workflowTable.grantReadWriteData(processOrderFunction);

    // Calculate Shipping Function
    const calculateShippingFunction = new lambda.Function(this, 'CalculateShippingFunction', {
      functionName: 'sap-study-calculate-shipping',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  console.log('Calculating shipping:', JSON.stringify(event, null, 2));

  const { amount } = event;

  // Simple shipping calculation
  let shippingCost = 5.99;
  if (amount > 50) shippingCost = 0; // Free shipping over $50
  else if (amount > 25) shippingCost = 3.99;

  return {
    ...event,
    shippingCost,
    total: amount + shippingCost,
    calculatedAt: new Date().toISOString(),
  };
};
      `),
      timeout: cdk.Duration.seconds(10),
    });

    // Inventory Check Function
    const checkInventoryFunction = new lambda.Function(this, 'CheckInventoryFunction', {
      functionName: 'sap-study-check-inventory',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  console.log('Checking inventory:', JSON.stringify(event, null, 2));

  // Simulate inventory check with 80% success rate
  const inStock = Math.random() > 0.2;

  return {
    ...event,
    inventoryStatus: inStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
    checkedAt: new Date().toISOString(),
  };
};
      `),
      timeout: cdk.Duration.seconds(10),
    });

    // Send Notification Function
    const sendNotificationFunction = new lambda.Function(this, 'SendNotificationFunction', {
      functionName: 'sap-study-send-notification',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNSClient({});

exports.handler = async (event) => {
  console.log('Sending notification:', JSON.stringify(event, null, 2));

  const message = {
    orderId: event.orderId,
    status: event.status,
    total: event.total,
    timestamp: new Date().toISOString(),
  };

  await sns.send(new PublishCommand({
    TopicArn: process.env.TOPIC_ARN,
    Subject: \`Order \${event.status}: \${event.orderId}\`,
    Message: JSON.stringify(message, null, 2),
  }));

  return {
    ...event,
    notificationSent: true,
    notifiedAt: new Date().toISOString(),
  };
};
      `),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TOPIC_ARN: this.notificationTopic.topicArn,
      },
    });

    this.notificationTopic.grantPublish(sendNotificationFunction);

    // ======================
    // CloudWatch Log Group
    // ======================
    const logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: '/aws/stepfunctions/sap-study-order-workflow',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ======================
    // Step Functions State Machine (Standard)
    // ======================

    // Define states
    const validateInput = new tasks.LambdaInvoke(this, 'Validate Input', {
      lambdaFunction: validateInputFunction,
      outputPath: '$.Payload',
    });

    const checkInventory = new tasks.LambdaInvoke(this, 'Check Inventory', {
      lambdaFunction: checkInventoryFunction,
      outputPath: '$.Payload',
    });

    const calculateShipping = new tasks.LambdaInvoke(this, 'Calculate Shipping', {
      lambdaFunction: calculateShippingFunction,
      outputPath: '$.Payload',
    });

    // Parallel state for concurrent operations
    const parallelProcessing = new sfn.Parallel(this, 'Parallel Processing', {
      comment: 'Check inventory and calculate shipping in parallel',
    });

    parallelProcessing.branch(checkInventory);
    parallelProcessing.branch(calculateShipping);

    // Merge parallel results
    const mergeResults = new sfn.Pass(this, 'Merge Results', {
      parameters: {
        'orderId.$': '$[0].orderId',
        'amount.$': '$[0].amount',
        'customerEmail.$': '$[0].customerEmail',
        'validationResult.$': '$[0].validationResult',
        'inventoryStatus.$': '$[0].inventoryStatus',
        'shippingCost.$': '$[1].shippingCost',
        'total.$': '$[1].total',
        'executionId.$': '$$.Execution.Name',
      },
    });

    const processOrder = new tasks.LambdaInvoke(this, 'Process Order', {
      lambdaFunction: processOrderFunction,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const sendSuccessNotification = new tasks.LambdaInvoke(this, 'Send Success Notification', {
      lambdaFunction: sendNotificationFunction,
      outputPath: '$.Payload',
    });

    const sendFailureNotification = new tasks.LambdaInvoke(this, 'Send Failure Notification', {
      lambdaFunction: sendNotificationFunction,
      outputPath: '$.Payload',
    });

    const orderSucceeded = new sfn.Succeed(this, 'Order Succeeded');
    const orderFailed = new sfn.Fail(this, 'Order Failed', {
      error: 'OrderProcessingError',
      cause: 'Order validation failed or inventory unavailable',
    });

    // Choice state for validation
    const isValidChoice = new sfn.Choice(this, 'Is Valid?')
      .when(sfn.Condition.stringEquals('$.validationResult', 'VALID'), parallelProcessing)
      .otherwise(sendFailureNotification.next(orderFailed));

    // Choice state for inventory
    const isInStockChoice = new sfn.Choice(this, 'Is In Stock?')
      .when(sfn.Condition.stringEquals('$.inventoryStatus', 'IN_STOCK'), processOrder)
      .otherwise(sendFailureNotification.next(orderFailed));

    // Chain the workflow
    const definition = validateInput
      .next(isValidChoice);

    parallelProcessing
      .next(mergeResults)
      .next(isInStockChoice);

    processOrder
      .next(sendSuccessNotification)
      .next(orderSucceeded);

    // Add error handling with retry
    processOrder.addRetry({
      errors: ['Lambda.ServiceException', 'Lambda.TooManyRequestsException'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 3,
      backoffRate: 2,
    });

    processOrder.addCatch(sendFailureNotification.next(orderFailed), {
      errors: ['States.ALL'],
      resultPath: '$.errorInfo',
    });

    // Create Standard State Machine
    this.stateMachine = new sfn.StateMachine(this, 'OrderWorkflowStateMachine', {
      stateMachineName: 'sap-study-order-workflow-standard',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true,
    });

    cdk.Tags.of(this.stateMachine).add('Name', 'Order Workflow (Standard)');

    // ======================
    // Express State Machine
    // ======================

    // Simple express workflow for high-volume synchronous operations
    const expressValidate = new tasks.LambdaInvoke(this, 'Express Validate', {
      lambdaFunction: validateInputFunction,
      outputPath: '$.Payload',
    });

    const expressProcess = new tasks.LambdaInvoke(this, 'Express Process', {
      lambdaFunction: processOrderFunction,
      outputPath: '$.Payload',
    });

    const expressSuccess = new sfn.Succeed(this, 'Express Success');

    const expressDefinition = expressValidate
      .next(expressProcess)
      .next(expressSuccess);

    this.expressStateMachine = new sfn.StateMachine(this, 'OrderWorkflowExpressStateMachine', {
      stateMachineName: 'sap-study-order-workflow-express',
      definitionBody: sfn.DefinitionBody.fromChainable(expressDefinition),
      stateMachineType: sfn.StateMachineType.EXPRESS,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ERROR,
      },
      tracingEnabled: false, // X-Ray not supported for Express workflows
    });

    cdk.Tags.of(this.expressStateMachine).add('Name', 'Order Workflow (Express)');

    // ======================
    // CloudFormation Outputs
    // ======================

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'Standard workflow state machine ARN',
    });

    new cdk.CfnOutput(this, 'ExpressStateMachineArn', {
      value: this.expressStateMachine.stateMachineArn,
      description: 'Express workflow state machine ARN',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: this.workflowTable.tableName,
      description: 'DynamoDB table for workflow state',
    });

    new cdk.CfnOutput(this, 'SNSTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'SNS topic ARN for notifications',
    });

    this.addConsoleUrlOutput(
      'StepFunctionsConsoleUrl',
      `https://console.aws.amazon.com/states/home?region=${this.region}#/statemachines`,
      'Console URL for Step Functions'
    );

    this.addConsoleUrlOutput(
      'DynamoDBConsoleUrl',
      this.getDynamoDbConsoleUrl(this.workflowTable.tableName),
      'Console URL for DynamoDB table'
    );

    this.addConsoleUrlOutput(
      'LambdaConsoleUrl',
      `https://console.aws.amazon.com/lambda/home?region=${this.region}#/functions`,
      'Console URL for Lambda functions'
    );

    this.addConsoleUrlOutput(
      'CloudWatchLogsUrl',
      `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/${encodeURIComponent(logGroup.logGroupName)}`,
      'Console URL for CloudWatch Logs'
    );

    new cdk.CfnOutput(this, 'SampleExecutionCommand', {
      value: `aws stepfunctions start-execution \\
  --state-machine-arn ${this.stateMachine.stateMachineArn} \\
  --input '{"orderId":"ORD-001","amount":75,"customerEmail":"customer@example.com"}'`,
      description: 'Sample AWS CLI command to start execution',
    });

    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'Step Functions Workflow Architecture:',
        '- Standard state machine with complex branching and parallel states',
        '- Express state machine for high-volume synchronous operations',
        '- 5 Lambda functions for workflow tasks',
        '- DynamoDB table with streams for state persistence',
        '- SNS topic for workflow notifications',
        '- CloudWatch Logs for monitoring and debugging',
        '- Error handling with retry and catch mechanisms',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
