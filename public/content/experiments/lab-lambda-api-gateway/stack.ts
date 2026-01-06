import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { BaseLabStack, BaseLabStackProps } from './base-lab-stack';
import * as path from 'path';

/**
 * Lambda + API Gateway Lab
 *
 * Demonstrates:
 * - Lambda functions with Node.js 20.x runtime
 * - REST API Gateway with multiple endpoints
 * - DynamoDB integration for data persistence
 * - Lambda environment variables and IAM roles
 * - API Gateway throttling and quotas
 * - CloudWatch Logs for monitoring
 * - Lambda Layers for shared dependencies
 * - Error handling and validation patterns
 *
 * Cost Estimate: ~$0.01/hour
 * - DynamoDB on-demand: Pay per request (~$0.00 for testing)
 * - Lambda: First 1M requests/month free
 * - API Gateway: First 1M requests/month free
 * - CloudWatch Logs: Minimal for testing
 */
export class LambdaApiGatewayLabStack extends BaseLabStack {
  public readonly api: apigateway.RestApi;
  public readonly itemsTable: dynamodb.Table;
  public readonly createItemFunction: lambda.Function;
  public readonly getItemsFunction: lambda.Function;
  public readonly getItemFunction: lambda.Function;
  public readonly updateItemFunction: lambda.Function;
  public readonly deleteItemFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: BaseLabStackProps) {
    super(scope, id, {
      ...props,
      estimatedCostPerHour: 0.01,
    });

    // ======================
    // DynamoDB Table
    // ======================
    this.itemsTable = new dynamodb.Table(this, 'ItemsTable', {
      tableName: 'sap-study-lab-items',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand pricing
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete table on stack deletion
      pointInTimeRecovery: false, // Disable for cost savings in lab
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });

    // Add Global Secondary Index for querying by status
    this.itemsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    cdk.Tags.of(this.itemsTable).add('Name', 'SAP Study Lab Items Table');

    // ======================
    // Lambda Layer (Shared Dependencies)
    // ======================
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromInline(`
// Minimal layer for demonstration
// In production, this would contain shared dependencies
exports.validateItem = (item) => {
  if (!item.name || typeof item.name !== 'string') {
    throw new Error('Item name is required and must be a string');
  }
  if (item.name.length > 100) {
    throw new Error('Item name must be less than 100 characters');
  }
  return true;
};

exports.createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(body),
  };
};
      `),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for SAP study lab',
    });

    // ======================
    // Lambda Functions
    // ======================

    // Common environment variables
    const commonEnvironment = {
      TABLE_NAME: this.itemsTable.tableName,
      LOG_LEVEL: 'INFO',
    };

    // Common Lambda configuration
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      layers: [sharedLayer],
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
    };

    // CREATE Item Function
    this.createItemFunction = new lambda.Function(this, 'CreateItemFunction', {
      ...commonLambdaProps,
      functionName: 'sap-study-lab-create-item',
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const { validateItem, createResponse } = require('/opt/nodejs/index');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || '{}');

    // Validate input
    validateItem(body);

    const item = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      name: body.name,
      description: body.description || '',
      status: body.status || 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
    };

    await ddb.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: item,
    }));

    console.log('Item created:', item.id);
    return createResponse(201, { message: 'Item created', item });
  } catch (error) {
    console.error('Error:', error);
    return createResponse(
      error.message.includes('required') ? 400 : 500,
      { error: error.message }
    );
  }
};
      `),
      description: 'Creates a new item in DynamoDB',
    });

    // GET Items (List) Function
    this.getItemsFunction = new lambda.Function(this, 'GetItemsFunction', {
      ...commonLambdaProps,
      functionName: 'sap-study-lab-get-items',
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const { createResponse } = require('/opt/nodejs/index');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const status = event.queryStringParameters?.status;
    let result;

    if (status) {
      // Query by status using GSI
      result = await ddb.send(new QueryCommand({
        TableName: process.env.TABLE_NAME,
        IndexName: 'status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
        Limit: 50,
      }));
    } else {
      // Scan all items
      result = await ddb.send(new ScanCommand({
        TableName: process.env.TABLE_NAME,
        Limit: 50,
      }));
    }

    console.log('Items retrieved:', result.Items?.length || 0);
    return createResponse(200, {
      items: result.Items || [],
      count: result.Items?.length || 0,
    });
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: error.message });
  }
};
      `),
      description: 'Lists all items from DynamoDB',
    });

    // GET Item (Single) Function
    this.getItemFunction = new lambda.Function(this, 'GetItemFunction', {
      ...commonLambdaProps,
      functionName: 'sap-study-lab-get-item',
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const { createResponse } = require('/opt/nodejs/index');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return createResponse(400, { error: 'Item ID is required' });
    }

    const result = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id },
    }));

    if (!result.Item) {
      return createResponse(404, { error: 'Item not found' });
    }

    console.log('Item retrieved:', id);
    return createResponse(200, { item: result.Item });
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: error.message });
  }
};
      `),
      description: 'Gets a single item from DynamoDB by ID',
    });

    // UPDATE Item Function
    this.updateItemFunction = new lambda.Function(this, 'UpdateItemFunction', {
      ...commonLambdaProps,
      functionName: 'sap-study-lab-update-item',
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const { validateItem, createResponse } = require('/opt/nodejs/index');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const id = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      return createResponse(400, { error: 'Item ID is required' });
    }

    validateItem(body);

    const result = await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id },
      UpdateExpression: 'SET #name = :name, description = :description, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':name': body.name,
        ':description': body.description || '',
        ':status': body.status || 'pending',
        ':updatedAt': Date.now(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    console.log('Item updated:', id);
    return createResponse(200, { message: 'Item updated', item: result.Attributes });
  } catch (error) {
    console.error('Error:', error);
    return createResponse(
      error.message.includes('required') ? 400 : 500,
      { error: error.message }
    );
  }
};
      `),
      description: 'Updates an existing item in DynamoDB',
    });

    // DELETE Item Function
    this.deleteItemFunction = new lambda.Function(this, 'DeleteItemFunction', {
      ...commonLambdaProps,
      functionName: 'sap-study-lab-delete-item',
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const { createResponse } = require('/opt/nodejs/index');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return createResponse(400, { error: 'Item ID is required' });
    }

    await ddb.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id },
    }));

    console.log('Item deleted:', id);
    return createResponse(200, { message: 'Item deleted', id });
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { error: error.message });
  }
};
      `),
      description: 'Deletes an item from DynamoDB',
    });

    // Grant DynamoDB permissions to all Lambda functions
    this.itemsTable.grantReadWriteData(this.createItemFunction);
    this.itemsTable.grantReadData(this.getItemsFunction);
    this.itemsTable.grantReadData(this.getItemFunction);
    this.itemsTable.grantReadWriteData(this.updateItemFunction);
    this.itemsTable.grantWriteData(this.deleteItemFunction);

    // ======================
    // API Gateway
    // ======================
    this.api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: 'SAP Study Lab Items API',
      description: 'REST API for managing items - SAP-C02 lab',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100, // Requests per second
        throttlingBurstLimit: 200, // Burst capacity
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      cloudWatchRole: true, // Enable CloudWatch logging
    });

    // Create /items resource
    const items = this.api.root.addResource('items');

    // POST /items - Create item
    items.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.createItemFunction, {
        proxy: true,
      }),
      {
        requestValidator: new apigateway.RequestValidator(this, 'BodyValidator', {
          restApi: this.api,
          validateRequestBody: true,
          validateRequestParameters: false,
        }),
        requestModels: {
          'application/json': new apigateway.Model(this, 'CreateItemModel', {
            restApi: this.api,
            contentType: 'application/json',
            schema: {
              type: apigateway.JsonSchemaType.OBJECT,
              required: ['name'],
              properties: {
                name: { type: apigateway.JsonSchemaType.STRING },
                description: { type: apigateway.JsonSchemaType.STRING },
                status: { type: apigateway.JsonSchemaType.STRING },
              },
            },
          }),
        },
      }
    );

    // GET /items - List items
    items.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getItemsFunction, {
        proxy: true,
      })
    );

    // Create /items/{id} resource
    const item = items.addResource('{id}');

    // GET /items/{id} - Get single item
    item.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getItemFunction, {
        proxy: true,
      })
    );

    // PUT /items/{id} - Update item
    item.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(this.updateItemFunction, {
        proxy: true,
      })
    );

    // DELETE /items/{id} - Delete item
    item.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(this.deleteItemFunction, {
        proxy: true,
      })
    );

    // Add usage plan with quota
    const usagePlan = this.api.addUsagePlan('LabUsagePlan', {
      name: 'SAP Study Lab Usage Plan',
      description: 'Usage plan with quotas for lab testing',
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Create API key for testing
    const apiKey = new apigateway.ApiKey(this, 'LabApiKey', {
      apiKeyName: 'sap-study-lab-key',
      description: 'API key for SAP study lab testing',
    });

    usagePlan.addApiKey(apiKey);

    // ======================
    // CloudFormation Outputs
    // ======================

    // API Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${id}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
    });

    this.addConsoleUrlOutput(
      'ApiConsoleUrl',
      `https://${this.region}.console.aws.amazon.com/apigateway/home?region=${this.region}#/apis/${this.api.restApiId}/resources`,
      'Console URL for API Gateway'
    );

    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'API Key ID',
    });

    // DynamoDB Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.itemsTable.tableName,
      description: 'DynamoDB table name',
      exportName: `${id}-TableName`,
    });

    this.addConsoleUrlOutput(
      'TableConsoleUrl',
      this.getDynamoDbConsoleUrl(this.itemsTable.tableName),
      'Console URL for DynamoDB table'
    );

    // Lambda Function Outputs
    this.addConsoleUrlOutput(
      'CreateFunctionUrl',
      this.getLambdaConsoleUrl(this.createItemFunction.functionName),
      'Console URL for Create Lambda function'
    );

    this.addConsoleUrlOutput(
      'GetItemsFunctionUrl',
      this.getLambdaConsoleUrl(this.getItemsFunction.functionName),
      'Console URL for Get Items Lambda function'
    );

    // CloudWatch Logs Group URLs
    this.addConsoleUrlOutput(
      'CreateFunctionLogsUrl',
      `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${this.createItemFunction.functionName}`,
      'CloudWatch Logs for Create function'
    );

    // Sample curl commands
    new cdk.CfnOutput(this, 'SampleCurlCommands', {
      value: [
        'Sample API calls:',
        `# Create item: curl -X POST ${this.api.url}items -H "Content-Type: application/json" -d '{"name":"Test Item","status":"active"}'`,
        `# List items: curl ${this.api.url}items`,
        `# Get item: curl ${this.api.url}items/{id}`,
        `# Update item: curl -X PUT ${this.api.url}items/{id} -H "Content-Type: application/json" -d '{"name":"Updated","status":"completed"}'`,
        `# Delete item: curl -X DELETE ${this.api.url}items/{id}`,
      ].join('\n'),
      description: 'Sample curl commands for testing',
    });

    // Architecture summary
    new cdk.CfnOutput(this, 'ArchitectureSummary', {
      value: [
        'Lambda + API Gateway Architecture:',
        '- REST API with 5 endpoints (GET, POST, PUT, DELETE)',
        '- 5 Lambda functions (Node.js 20.x) with X-Ray tracing',
        '- DynamoDB table with GSI for status queries',
        '- Lambda Layer for shared code',
        '- CloudWatch Logs with 7-day retention',
        '- API throttling: 100 req/sec, 200 burst',
        '- Usage plan: 10,000 requests/day quota',
      ].join('\n'),
      description: 'Lab architecture summary',
    });
  }
}
