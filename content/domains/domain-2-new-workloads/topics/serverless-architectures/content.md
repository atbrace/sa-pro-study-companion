---
title: Serverless Architectures and Event-Driven Design
lastUpdated: 2026-01-05
---

# Serverless Architectures and Event-Driven Design

Serverless architectures enable building applications without managing servers. This topic covers Lambda, API Gateway, DynamoDB, event-driven patterns, and orchestration with Step Functions.

## Core Serverless Services

### AWS Lambda

**Execution Model**:
- Event-driven, serverless compute
- Max execution: 15 minutes
- Memory: 128 MB - 10 GB (CPU scales with memory)
- Ephemeral storage: 512 MB - 10 GB (/tmp)
- Concurrent executions: 1000 per region (soft limit)

**Invocation Types**:

| Type | Behavior | Use Case |
|------|----------|----------|
| **Synchronous** | Wait for response | API requests, real-time processing |
| **Asynchronous** | Return immediately, retries on failure | S3 events, SNS messages |
| **Event source mapping** | Poll source, batch processing | DynamoDB Streams, Kinesis, SQS |

**Pricing**: $0.20 per 1M requests + $0.0000166667 per GB-second

> 📚 [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)

### Amazon API Gateway

**API Types**:

**1. REST API**:
```
Full-featured RESTful APIs
API keys, usage plans, caching
Request/response transformation
Higher cost, more features
```

**2. HTTP API**:
```
Simpler, lower cost (70% cheaper)
OIDC and OAuth 2.0 native support
Better for modern serverless apps
```

**3. WebSocket API**:
```
Persistent connections
Real-time two-way communication
Chat apps, live dashboards
```

**Integration Types**:

**Lambda (Proxy)**:
```json
{
  "httpMethod": "POST",
  "path": "/users",
  "body": "{\"name\":\"John\"}",
  "headers": {...}
}
```
Lambda receives full request, returns formatted response.

**Lambda (Non-Proxy)**:
```
API Gateway transforms request/response
VTL (Velocity Template Language) mapping
More control, more complexity
```

**HTTP (Proxy)**:
```
Forward to HTTP endpoint
Good for integrating existing services
```

**AWS Service**:
```
Direct integration with AWS services
No Lambda required (e.g., API Gateway → DynamoDB)
```

**Mock**:
```
Return static response
Testing, development
```

> 📚 [API Gateway Integration Types](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-integration-types.html)

### Amazon DynamoDB

**Key Features for Serverless**:
- Fully managed NoSQL
- Single-digit millisecond latency
- Automatic scaling
- Event streaming (DynamoDB Streams)
- Global tables for multi-region

**Capacity Modes**:

**On-Demand**:
```
Pay per request
Automatic scaling
No capacity planning
Best for: unpredictable, spiky workloads
Price: Higher per request, no baseline cost
```

**Provisioned**:
```
Specify RCU/WCU
Auto Scaling available
Reserved capacity discounts
Best for: predictable, sustained traffic
Price: Lower per request, baseline cost
```

**Access Patterns**:

DynamoDB requires you to know your access patterns upfront:

```
Single-item access: GetItem, PutItem, UpdateItem, DeleteItem
Query: Retrieve items by partition key (+ sort key)
Scan: Read entire table (avoid in production)
Batch operations: BatchGetItem, BatchWriteItem (up to 25 items)
```

**Design Pattern - Single Table Design**:
```
PK: USER#123        SK: PROFILE
PK: USER#123        SK: ORDER#456
PK: USER#123        SK: ORDER#789
PK: PRODUCT#ABC     SK: DETAILS
PK: PRODUCT#ABC     SK: REVIEW#001

One table, multiple entity types
Use PK/SK creatively for relationships
Reduces cost, improves performance
```

> 📚 [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## Event-Driven Architecture Patterns

### Amazon EventBridge

**Event Bus Architecture**:
```
Event Sources → Event Bus → Rules → Targets
```

**Key Capabilities**:
- Schema registry (discover event structure)
- Archive and replay events
- Cross-account event routing
- 100+ AWS service integrations
- SaaS partner integrations

**Event Pattern Matching**:
```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["stopped"]
  }
}
```

**Use Cases**:
- Application integration
- SaaS event routing
- Microservices communication
- Scheduled events (cron replacement)

**vs SNS/SQS**:
- EventBridge: Event routing, filtering, transformation, schema registry
- SNS: Pub/sub messaging, mobile push notifications
- SQS: Queue-based buffering, decoupling

> 📚 [EventBridge User Guide](https://docs.aws.amazon.com/eventbridge/latest/userguide/what-is-amazon-eventbridge.html)

### Asynchronous Processing Patterns

**1. Queue-Based (SQS + Lambda)**:
```
Producer → SQS → Lambda (batched)

Benefits:
- Built-in retry and DLQ
- Lambda polls queue
- Batch processing (up to 10,000 messages)
- Cost-effective buffering
```

**2. Topic-Based (SNS + Lambda)**:
```
Publisher → SNS Topic → Multiple Lambda subscribers

Benefits:
- Fan-out to multiple consumers
- Message filtering
- Mobile push, email, SMS
```

**3. Stream-Based (Kinesis + Lambda)**:
```
Producers → Kinesis Stream → Lambda (batched)

Benefits:
- Real-time streaming
- Ordered processing per shard
- Replay capability
- Multi-consumer support
```

**4. State-Based (DynamoDB Streams + Lambda)**:
```
DynamoDB change → Stream → Lambda

Benefits:
- React to data changes
- Ordered, exactly-once delivery per item
- Cross-region replication
- Audit trails, analytics
```

## AWS Step Functions

State machine orchestration for serverless workflows.

**Workflow Types**:

**Standard Workflows**:
```
Duration: Up to 1 year
Execution rate: 2000/second
Pricing: Per state transition
Use case: Long-running, auditable workflows
```

**Express Workflows**:
```
Duration: Up to 5 minutes
Execution rate: 100,000/second
Pricing: Per execution duration
Use case: High-volume, short-duration
```

**State Types**:

```json
{
  "Task": "Execute Lambda, call AWS service",
  "Choice": "Conditional branching",
  "Parallel": "Execute branches concurrently",
  "Map": "Iterate over array",
  "Wait": "Delay for duration or timestamp",
  "Pass": "Pass input to output, no-op",
  "Succeed": "Successful termination",
  "Fail": "Failure termination"
}
```

**Example Workflow**:
```json
{
  "StartAt": "ProcessOrder",
  "States": {
    "ProcessOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:ProcessOrder",
      "Next": "CheckInventory"
    },
    "CheckInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:CheckInventory",
      "Next": "IsInStock"
    },
    "IsInStock": {
      "Type": "Choice",
      "Choices": [{
        "Variable": "$.inStock",
        "BooleanEquals": true,
        "Next": "ShipOrder"
      }],
      "Default": "RefundOrder"
    },
    "ShipOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:ShipOrder",
      "End": true
    },
    "RefundOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:RefundOrder",
      "End": true
    }
  }
}
```

**Error Handling**:
```json
{
  "Retry": [
    {
      "ErrorEquals": ["States.Timeout", "ServiceException"],
      "IntervalSeconds": 2,
      "MaxAttempts": 3,
      "BackoffRate": 2.0
    }
  ],
  "Catch": [
    {
      "ErrorEquals": ["States.ALL"],
      "Next": "HandleError"
    }
  ]
}
```

**vs Lambda Alone**:
- Step Functions: Complex workflows, long-running, visual orchestration
- Lambda: Simple event processing, < 15 minutes

> 📚 [Step Functions States Reference](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-states.html)

## Serverless API Patterns

### REST API with Lambda

**Classic Pattern**:
```
Client → API Gateway (REST) → Lambda → DynamoDB
```

**Architecture**:
1. API Gateway handles HTTP, authentication, throttling
2. Lambda implements business logic
3. DynamoDB stores data

**Authentication Options**:
- **IAM** - AWS credentials (for AWS services, internal APIs)
- **Cognito User Pools** - User authentication, JWT tokens
- **Lambda Authorizer** - Custom auth logic (OAuth, SAML, etc.)
- **API Keys** - Simple usage tracking (not for security)

### GraphQL API with AppSync

**Pattern**:
```
Client → AWS AppSync → Lambda/DynamoDB/HTTP
```

**Benefits**:
- Real-time subscriptions (WebSocket)
- Offline sync
- Multiple data sources
- VTL resolvers (no Lambda for simple CRUD)
- Automatic schema generation

**vs REST**:
- GraphQL: Single endpoint, client specifies fields, real-time updates
- REST: Multiple endpoints, server defines response, polling for updates

### Direct API Gateway Integrations

**Pattern**: API Gateway → AWS Service (no Lambda)

**Example - DynamoDB**:
```
POST /items
API Gateway → PutItem in DynamoDB

Benefits:
- Lower latency (no Lambda cold start)
- Lower cost (no Lambda invocation)
- Less code to maintain

Drawbacks:
- Less flexibility
- VTL mapping templates
```

**Example - S3**:
```
PUT /files/{filename}
API Gateway → S3 PutObject

Use case: Direct file uploads
```

## Lambda Optimization Strategies

### Cold Start Optimization

**1. Provisioned Concurrency**:
```
Pre-warm function instances
Eliminates cold starts
Cost: Pay for provisioned capacity
Use case: Latency-sensitive APIs
```

**2. SnapStart (Java)**:
```
Cache initialized snapshots
Reduce cold start by up to 10x
No code changes required
```

**3. ARM/Graviton2**:
```
architecture: arm64
20% cheaper, often faster
```

**4. Reduce Package Size**:
```
Minimize dependencies
Use Lambda layers for shared code
Remove unused imports
```

**5. Keep Functions Warm**:
```
Use EventBridge scheduled rules (workaround)
Not cost-effective vs Provisioned Concurrency
```

### Execution Optimization

**1. Initialize Outside Handler**:
```python
import boto3

# Initialize once (reused across invocations)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

def lambda_handler(event, context):
    # Handler logic here
    result = table.get_item(Key={'id': event['userId']})
    return result
```

**2. Right-Size Memory**:
```
More memory = More CPU
Use Lambda Power Tuning tool
Find cost/performance sweet spot
Common sweet spot: 1024-1536 MB
```

**3. Use Environment Variables**:
```python
import os

TABLE_NAME = os.environ['TABLE_NAME']
# Avoid hardcoding, enables reuse
```

**4. Connection Pooling**:
```python
# Reuse database connections
# Initialize connection outside handler
# Use RDS Proxy for RDS connections
```

### Cost Optimization

**1. Right-Size Memory and Timeout**:
```
Don't over-provision
Use actual execution metrics
Reduce timeout to minimum needed
```

**2. Use ARM Architecture**:
```
20% cost reduction
Often better performance
```

**3. Batch Processing**:
```
SQS batch size: up to 10,000 messages
Kinesis batch size: up to 10,000 records
DynamoDB Streams: up to 1,000 records
Process multiple events per invocation
```

**4. Asynchronous Where Possible**:
```
Don't make API wait for non-critical tasks
Use SNS/SQS for async processing
Example: Send email after API returns
```

## Serverless Best Practices

### Design Principles

**1. Function Composition**:
```
Single-purpose functions
Chain with Step Functions or events
Easier testing, deployment, debugging
```

**2. Idempotency**:
```
Same request → Same result, no side effects
Critical for async, retry scenarios
Use unique request IDs
```

**3. Error Handling**:
```
Dead Letter Queues (DLQ) for failed events
Exponential backoff in retries
Structured logging for debugging
```

**4. Security**:
```
Least privilege IAM roles per function
Secrets in Secrets Manager/Parameter Store
VPC only when accessing VPC resources
```

**5. Observability**:
```
CloudWatch Logs for debugging
X-Ray for distributed tracing
Custom metrics for business logic
Structured JSON logging
```

### Anti-Patterns to Avoid

**1. Monolithic Lambda**:
```
❌ One Lambda handling all API routes
✅ Separate Lambda per route/function
```

**2. Synchronous Chain**:
```
❌ Lambda → Lambda → Lambda (sync)
✅ Use Step Functions or events
```

**3. Polling**:
```
❌ Lambda polling for updates
✅ Event-driven triggers
```

**4. Shared State in /tmp**:
```
❌ Relying on /tmp across invocations
✅ Use S3, DynamoDB, or ElastiCache
```

**5. VPC Without Reason**:
```
❌ All Lambdas in VPC by default
✅ VPC only for VPC resource access
```

## Authentication Patterns

### Amazon Cognito User Pools

**Features**:
- User registration and login
- MFA, password policies
- Social identity (Google, Facebook)
- JWT tokens for API authorization

**Integration with API Gateway**:
```
Client → Cognito → Get JWT token
Client → API Gateway (JWT in header)
API Gateway validates JWT with Cognito
API Gateway → Lambda
```

### Lambda Authorizer

**Custom Authorization**:
```python
def lambda_handler(event, context):
    token = event['authorizationToken']

    # Custom auth logic (OAuth, SAML, etc.)
    if is_valid(token):
        return generate_policy('user', 'Allow', event['methodArn'])
    else:
        return generate_policy('user', 'Deny', event['methodArn'])
```

**Types**:
- **Token-based** - Header token (Authorization: Bearer <token>)
- **Request-based** - Full request parameters

**Caching**: Policy cached by API Gateway (TTL 0-3600s)

### IAM Authorization

**Use Cases**:
- Service-to-service calls
- Internal APIs
- AWS SDK clients

**SigV4 Signing**:
```
Client signs request with AWS credentials
API Gateway validates signature
No custom code needed
```

## Exam Tips

1. **Lambda limits** - 15 min timeout, 10 GB memory, 1000 concurrent executions
2. **API Gateway types** - HTTP API 70% cheaper than REST, WebSocket for real-time
3. **DynamoDB** - On-demand for unpredictable, provisioned for sustained
4. **EventBridge** - Event routing and filtering, 100+ integrations
5. **Step Functions** - Orchestrate complex workflows, up to 1 year duration
6. **Cold starts** - Provisioned Concurrency, SnapStart (Java), ARM architecture
7. **Async processing** - SQS for buffering, SNS for fan-out, Kinesis for streaming
8. **DynamoDB Streams** - React to data changes, ordered per item
9. **Single table design** - One DynamoDB table for multiple entities
10. **Lambda layers** - Share code across functions, reduce package size

## Common Scenarios

**"Design an API for unpredictable traffic with low latency"**:
→ API Gateway HTTP API + Lambda (Provisioned Concurrency) + DynamoDB (On-Demand)

**"Process S3 uploads asynchronously"**:
→ S3 → Lambda (async invocation) or S3 → EventBridge → Lambda

**"Fan out events to multiple services"**:
→ SNS topic with multiple Lambda subscribers or EventBridge with multiple rules

**"Long-running workflow with error handling"**:
→ Step Functions Standard Workflow with retry/catch logic

**"Real-time API with subscriptions"**:
→ AWS AppSync (GraphQL) with WebSocket subscriptions

**"Process high-volume events at lowest cost"**:
→ SQS → Lambda (large batch size) or Step Functions Express Workflow

**"React to DynamoDB changes in real-time"**:
→ DynamoDB Streams → Lambda

**"Authenticate users in serverless API"**:
→ Cognito User Pools with API Gateway authorizer

> 📚 [Serverless Architectures Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/serverless-architectures-lambda/welcome.html)
