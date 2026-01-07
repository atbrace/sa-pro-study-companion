---
title: Serverless Architectures and Event-Driven Design
lastUpdated: 2026-01-06
---

# Serverless Architectures and Event-Driven Design

Serverless architectures enable building scalable, cost-effective applications without managing infrastructure. AWS provides a comprehensive suite of serverless services that automatically handle provisioning, scaling, and high availability. This architectural approach shifts operational responsibility to AWS, allowing teams to focus on business logic rather than infrastructure management.

At the SAP-C02 level, you must understand not just individual services, but how to compose them into production-grade systems with proper error handling, observability, security, and cost optimization. Serverless solutions excel at variable workloads, event-driven processing, and rapid development cycles, but require careful design to avoid anti-patterns like excessive synchronous chaining or improper state management.

## Core Serverless Services

### AWS Lambda

AWS Lambda is the foundational compute service for serverless architectures, executing code in response to events without requiring server provisioning or management. Lambda automatically scales from zero to thousands of concurrent executions and integrates natively with over 200 AWS services.

**Execution Model**:
- Event-driven, serverless compute with automatic scaling
- **Max execution duration**: 15 minutes (900 seconds)
- **Memory allocation**: 128 MB to 10 GB in 1 MB increments (CPU and network bandwidth scale proportionally with memory)
- **Ephemeral storage**: 512 MB to 10 GB (/tmp directory, unique per execution environment)
- **Concurrent executions**: 1,000 per region default (soft limit, can be increased)
- **Deployment package size**: 50 MB zipped, 250 MB unzipped (including layers)

**Invocation Types**:

Lambda supports three invocation patterns, each with distinct retry and error handling behavior:

| Type | InvocationType | Behavior | Error Handling | Use Cases |
|------|---------------|----------|----------------|-----------|
| **Synchronous** | RequestResponse | Wait for response, blocking | Caller receives error, must retry manually | API Gateway, Application Load Balancer, Lambda function URLs, SDK calls |
| **Asynchronous** | Event | Return immediately, Lambda queues event | Automatic retry (2 attempts), supports DLQ and destinations | S3 events, SNS, EventBridge, CloudWatch Logs |
| **Event source mapping** | N/A (polling) | Lambda polls source, processes batches | Retries entire batch until success or records expire, supports partial batch responses | DynamoDB Streams, Kinesis Data Streams, SQS, MSK, MQ |

**Key Distinctions**:
- **Synchronous**: Client waits for function completion. Use for request-response patterns where the caller needs the result immediately.
- **Asynchronous**: Lambda queues events internally and retries on failure. The caller receives immediate acknowledgment but doesn't get the function's return value. Failed events can route to SQS DLQ or EventBridge destinations for analysis.
- **Event source mapping**: Lambda acts as a consumer, polling stream or queue sources. Batch window (up to 5 minutes) allows buffering multiple records before invocation, optimizing cost and throughput.

**Execution Environment Lifecycle**:

Lambda reuses execution environments across invocations to improve performance:

```
1. INIT phase (cold start):
   - Download code package
   - Initialize runtime
   - Run code outside handler (connections, SDK clients)

2. INVOKE phase:
   - Execute handler function
   - Return response

3. Reuse (warm):
   - Skip INIT, reuse environment for next invocation
   - /tmp contents persist
   - Global variables retain state
```

**Cold Start Optimization Strategies**:
- **Provisioned Concurrency**: Pre-initialize execution environments (eliminates cold starts but adds cost)
- **Lambda SnapStart** (Java 11+ and 17): Caches initialized snapshots, reducing cold starts by up to 10x with no code changes
- **ARM/Graviton2 architecture**: 20% cheaper, often faster initialization and execution
- **Minimize package size**: Smaller deployments reduce download and initialization time
- **Use Lambda Layers**: Separate dependencies from code to reduce deployment package size

**Pricing Model**:
- **Requests**: $0.20 per 1 million requests
- **Duration**: $0.0000166667 per GB-second (memory allocation × execution time)
- **Provisioned Concurrency**: Additional hourly charge for pre-warmed capacity
- **Architecture**: ARM (Graviton2) offers 20% price reduction vs x86

**AWS Documentation:**
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Lambda Invocation Types](https://docs.aws.amazon.com/lambda/latest/dg/lambda-invocation.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)

### Amazon API Gateway

Amazon API Gateway creates, publishes, and manages RESTful, HTTP, and WebSocket APIs at any scale. It acts as the front door for serverless applications, handling authentication, authorization, throttling, caching, and request/response transformation. API Gateway integrates seamlessly with Lambda, enabling fully managed API solutions without servers.

**API Types and Selection Criteria**:

| Feature | REST API | HTTP API | WebSocket API |
|---------|----------|----------|---------------|
| **Use Case** | Full-featured RESTful APIs | Cost-optimized modern APIs | Real-time bidirectional communication |
| **Cost** | Standard pricing | 70% cheaper than REST | Per message and connection minute |
| **Auth** | IAM, Cognito, Lambda authorizers, API keys | IAM, JWT (OIDC/OAuth 2.0), Lambda authorizers | IAM, Lambda authorizers |
| **Caching** | Built-in response caching | Not available | Not available |
| **Features** | Request validation, API keys, usage plans, SDK generation | Simplified, automatic deployments, native CORS | Connection management, message routing |
| **Transformations** | Request/response VTL mapping | Limited (JSON passthrough optimized) | N/A |
| **When to Choose** | Need caching, usage plans, or extensive transformation | Cost-sensitive modern apps with JWT auth | Chat, notifications, real-time dashboards |

**REST API** - Full-featured API management with support for API keys, usage plans, request/response transformation using VTL templates, and response caching. Choose REST APIs when you need comprehensive control over request handling, monetization via usage plans, or response caching to reduce backend load.

**HTTP API** - Streamlined, lower-latency API optimized for serverless workloads. 70% cheaper than REST APIs with native support for JWT authorization (OIDC and OAuth 2.0), automatic CORS, and faster performance. HTTP APIs are ideal for modern applications using JWT-based authentication and microservices architectures where simplicity and cost matter more than advanced features.

**WebSocket API** - Enables persistent, bidirectional connections for real-time communication. Clients maintain a connection to API Gateway, which routes messages based on content. Messages can be sent from client to server or server to client at any time. Use for chat applications, live dashboards, collaborative editing, or real-time notifications where polling would be inefficient.

**Integration Patterns**:

API Gateway supports multiple integration types, each with different use cases:

**1. Lambda Proxy Integration**:
```json
{
  "httpMethod": "POST",
  "path": "/users",
  "body": "{\"name\":\"John\"}",
  "headers": {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0..."
  },
  "queryStringParameters": {"filter": "active"},
  "pathParameters": {"userId": "123"},
  "requestContext": {
    "authorizer": {...},
    "identity": {...}
  }
}
```
Lambda receives the entire HTTP request as a JSON event and must return a properly formatted response with statusCode, headers, and body. This is the most common pattern, offering maximum flexibility with minimal API Gateway configuration.

**2. Lambda Custom Integration (Non-Proxy)**:
Uses Velocity Template Language (VTL) to transform requests before sending to Lambda and responses before returning to client. Provides fine-grained control over request/response format but adds complexity. Use when you need to:
- Extract specific fields from requests
- Return custom error messages
- Integrate with existing Lambda functions expecting specific formats
- Perform input validation at the API Gateway layer

**3. HTTP Proxy Integration**:
Forwards requests to an HTTP endpoint (AWS service or external URL) with optional header modifications. API Gateway passes through the request and response with minimal processing. Use cases:
- Integrate with existing REST APIs
- Route to on-premises services via VPN/Direct Connect
- Create API facades over third-party services

**4. AWS Service Integration**:
Directly invoke AWS services (DynamoDB, SQS, Step Functions, S3) without Lambda. Reduces latency (no Lambda cold start) and cost (no Lambda charges). Requires VTL mapping templates to transform HTTP requests into service API calls.

Example use cases:
- `POST /messages` → SQS SendMessage (webhook to queue)
- `GET /items/{id}` → DynamoDB GetItem (simple CRUD without Lambda)
- `POST /workflows` → Step Functions StartExecution (trigger workflows)
- `PUT /files/{key}` → S3 PutObject (direct file upload with presigned URLs)

**5. Mock Integration**:
Returns static responses without calling a backend. Useful for:
- API prototyping and development
- CORS preflight responses
- Testing client-side code before backend is ready

**Authentication and Authorization**:

API Gateway supports multiple authorization mechanisms:

- **IAM Authorization**: AWS Signature Version 4 signing for service-to-service communication. Requests must be signed with AWS credentials. Use for internal APIs, AWS SDK clients, and microservices.

- **Cognito User Pools**: Integrates with Amazon Cognito for user authentication. Users sign in to Cognito, receive JWT tokens, and include tokens in API requests. API Gateway validates tokens automatically. Best for user-facing applications with built-in user management.

- **JWT Authorizers (HTTP APIs)**: Native validation of JWT tokens from any OIDC or OAuth 2.0 provider (Auth0, Okta, Google, etc.). Lower latency than Lambda authorizers for JWT validation.

- **Lambda Authorizers**: Custom authorization logic executed by a Lambda function. Function receives request details, returns allow/deny policy. Supports token-based (header) or request-based (full request context) authorization. Policies are cached by API Gateway (TTL 0-3600 seconds) for performance. Use for custom auth schemes, legacy systems, or complex authorization logic.

- **API Keys**: Simple identifier for tracking and rate limiting, NOT for security. API keys identify clients for usage tracking and throttling but don't provide authentication. Combine with other auth methods for production use.

**Throttling and Usage Plans**:

API Gateway provides rate limiting at multiple levels:
- **Account-level limit**: 10,000 requests per second across all APIs (soft limit)
- **Per-method throttling**: Configure unique limits for individual API methods
- **Usage plans**: Group API keys with throttle and quota limits for API monetization
- **Burst capacity**: 5,000 concurrent requests (allows traffic spikes beyond steady-state limit)

Requests exceeding limits receive HTTP 429 (Too Many Requests) responses.

**AWS Documentation:**
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)
- [Choosing between REST APIs and HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [API Gateway Integration Types](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-integration-types.html)
- [API Gateway WebSocket APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)

### Amazon DynamoDB

Amazon DynamoDB is a fully managed NoSQL database delivering single-digit millisecond performance at any scale. As a key-value and document database, DynamoDB excels in serverless architectures due to its automatic scaling, event-driven capabilities via DynamoDB Streams, and ability to handle massive request volumes without capacity planning.

**Key Features for Serverless**:
- **Fully managed**: No servers, patching, or maintenance
- **Performance**: Single-digit millisecond latency at any scale
- **Automatic scaling**: Adapts to traffic patterns in both capacity modes
- **Event streaming**: DynamoDB Streams capture item-level changes for event-driven workflows
- **Global tables**: Multi-region, active-active replication with automatic conflict resolution
- **ACID transactions**: Support for multi-item, multi-table transactions
- **Point-in-time recovery**: Continuous backups with 35-day retention
- **On-demand backups**: Full table backups with no performance impact

**Capacity Modes - Selection Criteria**:

| Factor | On-Demand | Provisioned (with Auto Scaling) |
|--------|-----------|--------------------------------|
| **Pricing Model** | Pay per request (read/write) | Pay for provisioned capacity (hourly) |
| **Scaling** | Instant, automatic | Auto Scaling adjusts within minutes |
| **Capacity Planning** | None required | Define target utilization |
| **Cost at Low Volume** | Lower (no baseline charge) | Higher (pay for provisioned capacity) |
| **Cost at High Volume** | Higher (per-request cost) | Lower (bulk pricing) |
| **Predictability** | Unpredictable or spiky traffic | Predictable, sustained traffic |
| **Use Cases** | Dev/test, new apps, traffic spikes | Production apps with steady load |

**On-Demand Mode**: Automatically accommodates workload increases or decreases. You pay $0.25 per million write request units and $0.25 per million read request units (US East). No minimum capacity. Ideal for applications with unknown or variable traffic, spiky workloads (100x variance), or when you want simplified billing.

**Provisioned Mode**: You specify read capacity units (RCU) and write capacity units (WCU). Enable Auto Scaling to adjust capacity automatically based on CloudWatch metrics (target utilization 70%). Reserved capacity offers up to 53% discount for 1-year or 3-year commitments. Choose provisioned mode for predictable traffic, cost optimization at scale, or when you can forecast capacity needs.

**Switching Modes**: You can switch between capacity modes once every 24 hours per table.

**Data Model and Access Patterns**:

DynamoDB is schema-less but requires careful key design. Unlike relational databases, you must know your access patterns before designing tables:

**Core Operations**:
- **GetItem**: Retrieve single item by primary key (1 RCU for 4 KB)
- **PutItem**: Create or replace item (1 WCU for 1 KB)
- **UpdateItem**: Modify attributes without replacing entire item
- **DeleteItem**: Remove item by primary key
- **Query**: Retrieve items with same partition key, optional sort key filter (most efficient)
- **Scan**: Read entire table sequentially (avoid in production, expensive)
- **Batch Operations**: BatchGetItem/BatchWriteItem process up to 25 items in single request

**Primary Key Design**:

DynamoDB supports two primary key types:

1. **Partition Key Only** (Simple Primary Key): Single attribute uniquely identifies items. Example: `userId` for user profiles.

2. **Partition Key + Sort Key** (Composite Primary Key): Combination uniquely identifies items. Items with same partition key are stored together, sorted by sort key. Example: `userId` + `timestamp` for user activity logs.

**Critical Design Principle**: Partition key determines data distribution. Poor partition key design leads to hot partitions (uneven load) causing throttling and poor performance. Best practices:
- Choose high-cardinality attributes (many unique values)
- Ensure even access distribution across partitions
- Avoid time-based partition keys without prefixes (creates hot partitions)
- Use composite attributes when needed (e.g., `tenantId#userId`)

**Single Table Design Pattern**:

Advanced DynamoDB applications often use a single table to store multiple entity types, reducing cost and improving performance through data locality:

```
PK                  SK                  Attributes
USER#123           PROFILE             {name: "Alice", email: "..."}
USER#123           ORDER#456           {total: 99.99, status: "shipped"}
USER#123           ORDER#789           {total: 149.99, status: "pending"}
PRODUCT#ABC        METADATA            {name: "Widget", price: 29.99}
PRODUCT#ABC        REVIEW#001          {rating: 5, text: "Great!"}
ORDER#456          USER#123            {total: 99.99} (inverted for access)
```

Benefits:
- **Fewer tables**: Reduced operational overhead
- **Transactions**: ACID transactions work within single table
- **Joins**: Related data co-located, retrieved in single Query
- **Cost**: Fewer read/write operations

Tradeoffs:
- **Complexity**: Requires careful planning, harder to understand
- **Overloading GSIs**: Secondary indexes must serve multiple access patterns
- **Learning curve**: Different from relational design paradigms

**Global Secondary Indexes (GSI)**:

GSIs enable querying on non-key attributes. Each GSI has its own partition key and optional sort key, independent of the table's primary key. GSIs are "global" because queries span all table partitions.

Key characteristics:
- **Eventually consistent**: GSI updates lag behind table writes (typically milliseconds)
- **Separate capacity**: GSIs have independent RCU/WCU or on-demand billing
- **Projection**: Specify which attributes to copy (KEYS_ONLY, INCLUDE, ALL)
- **Sparse indexes**: Only items with the GSI key attributes are indexed (automatic filtering)

Maximum 20 GSIs per table. Use GSIs to support additional access patterns without duplicating data.

**DynamoDB Streams**:

DynamoDB Streams capture item-level modifications (create, update, delete) in near real-time. Stream records are ordered per item and retained for 24 hours. Lambda functions process stream records via event source mapping for event-driven architectures:

```
DynamoDB table change → Stream record → Lambda function
```

Use cases:
- **Aggregation**: Update summary tables or caches
- **Replication**: Sync to other databases (ElasticSearch, RDS)
- **Notifications**: Trigger alerts on data changes
- **Auditing**: Maintain change history
- **Cross-region replication**: Power global tables

Stream view types:
- **KEYS_ONLY**: Only key attributes of modified item
- **NEW_IMAGE**: Entire item after modification
- **OLD_IMAGE**: Entire item before modification
- **NEW_AND_OLD_IMAGES**: Both before and after images

**AWS Documentation:**
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Choosing Between On-Demand and Provisioned Capacity](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html)
- [DynamoDB Streams and Lambda](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html)

## Event-Driven Architecture Patterns

Event-driven architectures decouple producers and consumers, enabling loosely coupled systems that scale independently. AWS provides multiple services for event routing and messaging, each optimized for different patterns.

### Amazon EventBridge

Amazon EventBridge is a serverless event bus service that facilitates communication between applications using events. EventBridge enables building event-driven architectures with intelligent routing, filtering, transformation, and built-in integration to over 200 AWS services and SaaS applications.

**Architecture Components**:

```
Event Sources → Event Bus → Rules (filters) → Targets (actions)
```

**Event Bus Types**:
- **Default Event Bus**: Receives events from AWS services (EC2, S3, etc.)
- **Custom Event Buses**: Application-specific buses for custom events
- **Partner Event Buses**: SaaS integrations (Datadog, PagerDuty, Shopify, Zendesk)

Events published to a bus are evaluated against rules. Rules use event patterns to filter events and route matching events to up to five targets per rule.

**Key Capabilities**:

**1. Schema Registry**: Automatically discovers and versions event schemas. Generates code bindings (Python, Java, TypeScript) for type-safe event handling. Enables IDE autocomplete for event fields, reducing development time and errors.

**2. Archive and Replay**: Archive events to S3 for compliance or debugging. Replay archived events to recover from failures or test new features against historical data. Useful for disaster recovery and testing.

**3. Cross-Account Event Routing**: Publish events from one AWS account to event buses in other accounts. Essential for multi-account architectures where central event bus aggregates events from multiple applications.

**4. Event Transformation**: Use input transformers to modify events before sending to targets. Extract specific fields, add context, or reshape JSON structure without Lambda.

**5. API Destinations**: Send events to external HTTP endpoints with built-in retry logic, authentication, and rate limiting. Integrate with webhooks, third-party APIs, or on-premises systems.

**Event Pattern Matching**:

Rules use event patterns to filter events. Patterns match against event JSON structure using exact matching, prefix matching, or numeric comparisons:

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["stopped", "terminated"],
    "instance-id": [{"prefix": "i-"}]
  }
}
```

Advanced patterns:
- **Exists matching**: `"field": [{"exists": true}]`
- **Prefix matching**: `{"prefix": "prod-"}`
- **Numeric range**: `{"numeric": [">=", 100, "<", 500]}`
- **Anything-but**: `{"anything-but": ["PENDING"]}`

**Target Types and Use Cases**:

EventBridge can route to 20+ target types:
- **Lambda functions**: Execute custom logic
- **Step Functions state machines**: Orchestrate complex workflows
- **SQS queues**: Buffer events for asynchronous processing
- **SNS topics**: Fan out to multiple subscribers
- **Kinesis streams**: Stream processing pipelines
- **ECS tasks**: Launch containers in response to events
- **API Destinations**: External HTTP endpoints
- **Event Bus in another account/region**: Cross-account/region routing

**EventBridge vs SNS vs SQS**:

| Feature | EventBridge | SNS | SQS |
|---------|-------------|-----|-----|
| **Primary Use Case** | Event routing, filtering | Pub/sub messaging, fan-out | Queue-based buffering, decoupling |
| **Filtering** | Content-based routing (event patterns) | Basic attribute filtering | None (consumer-side filtering) |
| **Targets** | 20+ AWS services + HTTP | Lambda, SQS, HTTP, email, SMS | Lambda, EC2, on-premises (polling) |
| **Schema Registry** | Yes | No | No |
| **Replay** | Yes (with archive) | No | No (once deleted) |
| **Transformation** | Built-in input transformer | No | No |
| **Ordering** | No guaranteed order | No (except FIFO topics) | Yes (FIFO queues) |
| **Max Message Size** | 256 KB | 256 KB | 256 KB |
| **SaaS Integrations** | 30+ partner event sources | No | No |
| **When to Choose** | Complex routing, SaaS events, multi-target | Simple pub/sub, mobile push | Buffering, work queues, retry logic |

**Common EventBridge Patterns**:

**1. Scheduled Events (Cron Replacement)**:
```
EventBridge Schedule → Lambda (run batch job)
```
More reliable than CloudWatch Events (EventBridge replaced it), supports multiple targets.

**2. Multi-Account Aggregation**:
```
Account A events → Central Event Bus (Account B) → Rules → Targets
```
Centralize logging, monitoring, or compliance events from multiple accounts.

**3. SaaS Integration**:
```
Shopify order → EventBridge Partner Bus → Lambda (process order)
```
Receive events directly from SaaS applications without polling or webhooks.

**4. Decoupled Microservices**:
```
Order Service → EventBridge → [Inventory Service, Shipping Service, Email Service]
```
Services communicate via events without direct dependencies.

**AWS Documentation:**
- [EventBridge User Guide](https://docs.aws.amazon.com/eventbridge/latest/userguide/what-is-amazon-eventbridge.html)
- [EventBridge Event Patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
- [EventBridge Schema Registry](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema.html)
- [EventBridge Archive and Replay](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html)

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

AWS Step Functions coordinates distributed applications and microservices using visual workflows called state machines. Step Functions enables building complex, multi-step processes with built-in error handling, retry logic, and parallel execution without managing infrastructure or writing coordination code.

**Workflow Types - Selection Criteria**:

| Feature | Standard Workflows | Express Workflows (Synchronous) | Express Workflows (Asynchronous) |
|---------|-------------------|--------------------------------|----------------------------------|
| **Max Duration** | Up to 1 year | 5 minutes | 5 minutes |
| **Execution Rate** | 2,000/second | 100,000/second | 100,000/second |
| **Execution Guarantee** | Exactly-once | At-most-once | At-least-once |
| **Execution History** | Full (90 days) | None (use CloudWatch) | None (use CloudWatch) |
| **Pricing Model** | Per state transition | Per execution count + duration | Per execution count + duration |
| **Service Integrations** | Request Response, Run a Job (.sync), Callback (.waitForTaskToken) | Request Response only | Request Response only |
| **Use Cases** | Long-running workflows, human approval, auditable processes | High-volume event processing, IoT data streaming | Fire-and-forget API orchestration |

**Standard Workflows**: Designed for long-running, durable workflows requiring complete execution history and audit trails. Each state transition is recorded. Choose for workflows requiring human approval, external system callbacks, or running longer than 5 minutes. Execution history retained for 90 days.

**Express Workflows (Synchronous)**: Return response to caller after execution completes. Limited to 5 minutes. Ideal for orchestrating API calls where the caller needs the result. Example: API Gateway → Step Functions (Express Sync) → [Lambda, DynamoDB] → Response to client.

**Express Workflows (Asynchronous)**: Return execution ARN immediately, execution continues in background. At-least-once execution semantics (may execute more than once on retries). Best for high-throughput event processing where idempotency is implemented. Example: IoT data ingestion processing millions of events per hour.

**State Types and Capabilities**:

Step Functions state machines are defined using Amazon States Language (ASL), a JSON-based language describing state machines:

**1. Task State** - Executes a unit of work (Lambda function, AWS service API call, or external activity):
```json
{
  "Type": "Task",
  "Resource": "arn:aws:states:::dynamodb:putItem",
  "Parameters": {
    "TableName": "Orders",
    "Item": {
      "orderId": {"S.$": "$.orderId"}
    }
  }
}
```

**Service Integration Patterns**:
- **Request Response** (default): Call service and proceed immediately
- **Run a Job** (.sync suffix): Wait for job completion (Step Functions polls for result)
- **Wait for Callback** (.waitForTaskToken): Pause until external system calls back with task token

Supports 200+ AWS service APIs including Lambda, DynamoDB, ECS, Batch, SNS, SQS, Glue, SageMaker, and more.

**2. Choice State** - Conditional branching based on input:
```json
{
  "Type": "Choice",
  "Choices": [
    {
      "Variable": "$.status",
      "StringEquals": "APPROVED",
      "Next": "ProcessPayment"
    },
    {
      "And": [
        {"Variable": "$.amount", "NumericGreaterThan": 1000},
        {"Variable": "$.riskScore", "NumericLessThan": 50}
      ],
      "Next": "ManualReview"
    }
  ],
  "Default": "RejectOrder"
}
```

**3. Parallel State** - Execute multiple branches concurrently, wait for all to complete:
```json
{
  "Type": "Parallel",
  "Branches": [
    {"StartAt": "ChargeCard", "States": {...}},
    {"StartAt": "UpdateInventory", "States": {...}},
    {"StartAt": "SendConfirmation", "States": {...}}
  ],
  "Next": "CompleteOrder"
}
```

All branches execute simultaneously. If any branch fails, entire Parallel state fails (unless caught).

**4. Map State** - Iterate over array, process items in parallel:
```json
{
  "Type": "Map",
  "ItemsPath": "$.orderItems",
  "MaxConcurrency": 10,
  "Iterator": {
    "StartAt": "ProcessItem",
    "States": {
      "ProcessItem": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:...:function:ProcessOrderItem",
        "End": true
      }
    }
  }
}
```

MaxConcurrency controls parallel execution (0 = unlimited, positive integer = max concurrent iterations).

**5. Wait State** - Delay execution:
```json
{
  "Type": "Wait",
  "Seconds": 300,  // Wait 5 minutes
  "Next": "CheckStatus"
}
// OR
{
  "Type": "Wait",
  "Timestamp": "2025-12-31T23:59:59Z",  // Wait until specific time
  "Next": "NewYearEvent"
}
```

**6. Pass State** - Transform input or inject fixed data without calling services:
```json
{
  "Type": "Pass",
  "Result": {"status": "initialized"},
  "ResultPath": "$.metadata",
  "Next": "ProcessData"
}
```

**7. Succeed/Fail States** - Terminal states ending execution successfully or with failure.

**Error Handling and Resilience**:

Step Functions provides comprehensive error handling through Retry and Catch:

**Retry** - Automatically retry failed states with exponential backoff:
```json
{
  "Type": "Task",
  "Resource": "arn:aws:lambda:...:function:UnreliableAPI",
  "Retry": [
    {
      "ErrorEquals": ["States.Timeout", "ServiceException"],
      "IntervalSeconds": 2,
      "MaxAttempts": 3,
      "BackoffRate": 2.0
    },
    {
      "ErrorEquals": ["States.ALL"],
      "MaxAttempts": 1
    }
  ]
}
```

BackoffRate multiplies interval after each retry (2s, 4s, 8s with BackoffRate: 2.0).

**Catch** - Handle errors by transitioning to recovery states:
```json
{
  "Type": "Task",
  "Resource": "arn:aws:lambda:...:function:ChargeCard",
  "Catch": [
    {
      "ErrorEquals": ["PaymentDeclined"],
      "ResultPath": "$.error",
      "Next": "NotifyCustomer"
    },
    {
      "ErrorEquals": ["States.ALL"],
      "Next": "LogError"
    }
  ]
}
```

ResultPath injects error information into state output for downstream processing.

**Common Error Codes**:
- **States.Timeout**: Task exceeded timeout
- **States.TaskFailed**: Task returned failure
- **States.Permissions**: Insufficient IAM permissions
- **States.ALL**: Catch-all for any error

**Real-World Workflow Example - Order Processing**:
```json
{
  "Comment": "E-commerce order processing with error handling",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "ValidateOrder",
        "Payload.$": "$"
      },
      "Retry": [{"ErrorEquals": ["States.TaskFailed"], "MaxAttempts": 2}],
      "Catch": [{"ErrorEquals": ["ValidationError"], "Next": "InvalidOrderNotification"}],
      "Next": "ProcessPaymentAndInventory"
    },
    "ProcessPaymentAndInventory": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "ChargePayment",
          "States": {
            "ChargePayment": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
              "Parameters": {
                "FunctionName": "ProcessPayment",
                "Payload": {
                  "orderId.$": "$.orderId",
                  "taskToken.$": "$$.Task.Token"
                }
              },
              "Catch": [{"ErrorEquals": ["PaymentFailed"], "Next": "PaymentFailedState"}],
              "End": true
            },
            "PaymentFailedState": {"Type": "Fail"}
          }
        },
        {
          "StartAt": "ReserveInventory",
          "States": {
            "ReserveInventory": {
              "Type": "Task",
              "Resource": "arn:aws:states:::dynamodb:updateItem",
              "Parameters": {
                "TableName": "Inventory",
                "Key": {"productId": {"S.$": "$.productId"}},
                "UpdateExpression": "SET reserved = reserved + :qty",
                "ExpressionAttributeValues": {":qty": {"N.$": "$.quantity"}}
              },
              "End": true
            }
          }
        }
      ],
      "Next": "ShipOrder"
    },
    "ShipOrder": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage",
      "Parameters": {
        "QueueUrl": "https://sqs.region.amazonaws.com/account/shipping-queue",
        "MessageBody.$": "$"
      },
      "End": true
    },
    "InvalidOrderNotification": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:region:account:invalid-orders",
        "Message.$": "$.error"
      },
      "End": true
    }
  }
}
```

**Step Functions vs Lambda Chaining**:

| Aspect | Step Functions | Lambda Chaining |
|--------|----------------|----------------|
| **Max Duration** | Up to 1 year | 15 minutes per function |
| **Visual Monitoring** | ASL graph in console | CloudWatch Logs only |
| **Error Handling** | Built-in retry/catch | Manual implementation |
| **State Persistence** | Automatic | Manual (DynamoDB, etc.) |
| **Parallel Execution** | Native Parallel state | Complex fan-out logic |
| **Cost** | State transitions + service calls | Function invocations only |
| **When to Choose** | Multi-step workflows, long-running processes, complex coordination | Simple event-driven tasks, < 15 min, single responsibility |

**AWS Documentation:**
- [Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
- [Amazon States Language Specification](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html)
- [Step Functions Service Integrations](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html)
- [Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html)

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

AWS AppSync is a fully managed GraphQL service that simplifies application development by combining data from multiple sources (databases, APIs, serverless functions) through a single GraphQL endpoint. AppSync handles the heavy lifting of securely connecting to data sources, performing real-time updates, and offline synchronization.

**Architecture Pattern**:
```
Client → AWS AppSync GraphQL API → Resolvers → Data Sources
                                        ↓
                            [DynamoDB, Lambda, HTTP, RDS, OpenSearch]
```

**Key Capabilities**:

**1. Real-Time Subscriptions**: Built-in WebSocket support for real-time data updates. Clients subscribe to data changes and receive automatic updates when data modifications occur. Eliminates polling and reduces latency for collaborative apps.

**2. Offline Sync**: Client SDKs (Amplify) cache data locally and automatically sync when connectivity returns. Critical for mobile applications with intermittent connectivity.

**3. Multiple Data Sources**: Single GraphQL schema can aggregate data from:
- DynamoDB (NoSQL)
- Amazon RDS / Aurora (relational)
- Amazon OpenSearch
- HTTP endpoints (REST APIs)
- AWS Lambda (custom logic)
- Other AppSync GraphQL APIs (merged APIs)

**4. Resolvers - VTL and JavaScript**:

AppSync uses resolvers to map GraphQL operations to data sources:

**VTL (Velocity Template Language) Resolvers** - Traditional approach for direct data source integration without Lambda:
```vtl
## DynamoDB GetItem resolver
{
  "version": "2017-02-28",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
  }
}
```

**JavaScript Resolvers** - Modern approach with full JavaScript support:
```javascript
export function request(ctx) {
  return {
    operation: 'GetItem',
    key: { id: { S: ctx.args.id } }
  }
}

export function response(ctx) {
  return ctx.result
}
```

**5. Pipeline Resolvers**: Chain multiple functions in sequence (e.g., authentication → authorization → data fetch → transform).

**6. Caching**: Server-side in-memory caching (TTL configurable) reduces data source load and improves response times.

**AppSync vs REST API Gateway**:

| Feature | AppSync (GraphQL) | API Gateway (REST) |
|---------|-------------------|-------------------|
| **Endpoint** | Single endpoint | Multiple endpoints per resource |
| **Data Fetching** | Client specifies exact fields | Server returns fixed response |
| **Over-fetching** | No (client requests only needed data) | Common (fixed response structure) |
| **Under-fetching** | No (single request gets all data) | Common (requires multiple requests) |
| **Real-Time** | Native subscriptions (WebSocket) | Manual WebSocket API implementation |
| **Offline** | Built-in (with Amplify SDK) | Manual implementation |
| **Learning Curve** | GraphQL schema design required | Familiar REST patterns |
| **Use Cases** | Data-heavy apps, mobile, real-time collaboration | CRUD APIs, microservices, simple integrations |

**Common AppSync Patterns**:

**1. Real-Time Dashboard**:
```
Mobile App → AppSync Subscription → DynamoDB change (via Lambda/Streams)
                ↓
         Real-time update to all connected clients
```

**2. Offline-First Mobile App**:
```
Mobile App (offline) → Local cache → Mutations queued
    ↓ (connectivity restored)
AppSync sync → DynamoDB → Conflict resolution → Sync to device
```

**3. Aggregated Data from Multiple Sources**:
```graphql
type Query {
  getUser(id: ID!): User
}

type User {
  id: ID!
  profile: Profile     # DynamoDB
  orders: [Order]      # RDS via Lambda
  recommendations: [Product]  # HTTP API call
}
```
Single GraphQL query retrieves data from three different sources.

**Security**:
- **API Keys**: Simple, for development
- **IAM**: AWS credentials (service-to-service)
- **Amazon Cognito User Pools**: User authentication with JWT
- **OpenID Connect**: Third-party IdP (Auth0, Okta)
- **Lambda Authorizer**: Custom authorization logic

**Pricing**: Based on query/mutation operations and real-time message updates. Caching incurs additional charges.

**AWS Documentation:**
- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/latest/devguide/welcome.html)
- [AppSync Resolvers](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview.html)
- [AppSync Real-Time Subscriptions](https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html)

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

Optimizing Lambda functions requires balancing performance, cost, and reliability. Professional-level serverless architectures implement systematic optimization across cold start latency, execution efficiency, and cost management.

### Cold Start Mitigation

Cold starts occur when Lambda initializes a new execution environment. The INIT phase downloads code, starts the runtime, and executes initialization code outside the handler. Cold start duration varies by runtime, package size, and VPC configuration.

**Cold Start Impact by Configuration**:
- **Non-VPC functions**: 100-500ms (Python, Node.js) to 1-3s (Java, .NET)
- **VPC functions** (with ENI): Add 1-10s (reduced with Hyperplane ENIs since 2019)
- **Provisioned Concurrency**: 0ms cold start (environments pre-initialized)

**1. Provisioned Concurrency**:

Pre-initializes a specified number of execution environments, keeping them warm and ready:
```
Configuration:
- Specify concurrent execution count (e.g., 100)
- Applied to function version or alias
- Initialization runs during provisioning

Pricing:
- Provisioned concurrency hours: $0.0000041667 per GB-hour
- Standard duration charges still apply during execution

When to use:
- Latency-sensitive APIs (< 100ms p99 requirement)
- Predictable traffic patterns (e.g., business hours)
- Critical functions where cost justifies performance

Calculate cost vs benefit:
- 100 concurrent x 1 GB x 720 hours/month = $300/month baseline
- Compare to cost of Lambda@Edge or caching alternatives
```

**2. Lambda SnapStart (Java 11, 17, 21)**:

Caches initialized function snapshots, restoring from cache instead of full initialization:
```
How it works:
1. Lambda initializes function once
2. Takes snapshot of memory and disk state after INIT
3. Cached snapshot reused for subsequent invocations
4. Reduces cold starts by up to 10x (3s → 300ms)

Configuration:
- Enable SnapStart on function (one checkbox)
- No code changes required
- Supports AWS SDK v2, Spring Boot, Micronaut

Considerations:
- Uniqueness: Regenerate random values, UUIDs after restore
- Network connections: Re-establish after restore
- Time-based logic: Account for time jump between cache and restore
```

**3. ARM/Graviton2 Architecture**:
```yaml
Configuration:
  Architecture: arm64  # vs x86_64

Benefits:
- 20% cost reduction for same memory/duration
- Often 15-30% faster execution
- Better price/performance ratio

Compatibility:
- Most languages support ARM (Python, Node.js, Java, Go, .NET, Ruby)
- Check dependencies for ARM compatibility
- Use AWS SAM or Docker for local ARM testing
```

**4. Reduce Deployment Package Size**:
```
Strategies:
1. Remove dev dependencies (package.json devDependencies)
2. Tree-shake unused code (webpack, esbuild for JavaScript)
3. Use Lambda Layers for shared dependencies
4. Exclude unnecessary files (.git, tests, docs)
5. Compile native code for Lambda environment

Impact:
- Smaller package → Faster download → Faster INIT
- 10 MB vs 50 MB can save 100-500ms on cold start
```

**5. Lambda Layers for Code Sharing**:

Extract common dependencies to layers, reducing individual function package sizes:
```
Benefits:
- Reduce deployment package size (faster cold starts)
- Share code across multiple functions
- Update dependencies without redeploying functions
- Unlock Lambda console code editor (if under 3 MB)

Limitations:
- Max 5 layers per function
- 250 MB unzipped total (function + layers)
- Layers extracted to /opt directory
- Avoid for Go/Rust (increases cold start)

Example structure:
Layer 1: Python packages (pandas, requests)
Layer 2: Shared utilities (logging, error handling)
Layer 3: AWS SDK (pinned version)
Function: Business logic only (< 5 MB)
```

### Execution Optimization

**1. Initialize Outside Handler (Critical Best Practice)**:

Lambda reuses execution environments. Code outside handler runs once per environment (INIT), code inside runs per invocation (INVOKE):

```python
import boto3
import os

# INIT phase (once per container)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])
secrets_client = boto3.client('secretsmanager')

# Load configuration once
config = json.loads(secrets_client.get_secret_value(
    SecretId=os.environ['CONFIG_SECRET']
)['SecretString'])

# INVOKE phase (per request)
def lambda_handler(event, context):
    # Reuse clients and config from INIT
    user_id = event['userId']
    result = table.get_item(Key={'id': user_id})
    return {
        'statusCode': 200,
        'body': json.dumps(result['Item'])
    }
```

**What to Initialize Outside Handler**:
- SDK clients (boto3, AWS SDK)
- Database connections
- Configuration loading from Parameter Store/Secrets Manager
- HTTP connection pools
- Large data structures or ML models

**What to Keep Inside Handler**:
- Request-specific logic
- User data processing
- Temporary variables

**2. Right-Size Memory Allocation**:

Memory directly affects CPU, network bandwidth, and cost. More memory = more CPU = faster execution = potentially lower cost:

```
Memory-to-CPU Relationship:
- 128 MB: 0.08 vCPU
- 1,024 MB: 0.63 vCPU
- 1,792 MB: 1 full vCPU
- 3,584 MB: 2 vCPUs
- 10,240 MB: 6 vCPUs

Optimization Process:
1. Use AWS Lambda Power Tuning (open-source tool)
2. Test function at memory increments (128, 256, 512, 1024, 1536, 2048, 3008)
3. Measure execution time and cost at each level
4. Find sweet spot (often 1024-1536 MB for balanced workloads)

Example:
- 512 MB, 3s execution = $0.000025
- 1536 MB, 1.2s execution = $0.000030 (20% more cost, 60% faster)
- Choose based on latency vs cost requirements
```

**3. Database Connection Management**:

Lambda's ephemeral nature conflicts with traditional connection pooling. Use appropriate strategies:

**For RDS/Aurora**:
```python
# Use RDS Proxy (recommended for production)
# - Manages connection pool
# - Multiplexes Lambda connections
# - Prevents exhausting database connections
# - Supports IAM authentication

import pymysql
import boto3

rds_client = boto3.client('rds')

def get_connection():
    token = rds_client.generate_db_auth_token(
        DBHostname=proxy_endpoint,
        Port=3306,
        DBUsername='lambda_user',
        Region='us-east-1'
    )
    return pymysql.connect(
        host=proxy_endpoint,
        user='lambda_user',
        password=token,
        database='mydb',
        ssl={'ca': '/var/task/rds-cert.pem'}
    )

# Reuse connection across invocations
connection = None

def lambda_handler(event, context):
    global connection
    if not connection or not connection.open:
        connection = get_connection()
    # Use connection...
```

**For DynamoDB** (preferred for serverless):
- No connection management needed
- Automatically scales
- Pay per request
- Better fit for Lambda's execution model

**4. Efficient Use of /tmp Storage**:

Lambda provides 512 MB to 10 GB ephemeral storage at /tmp. Storage persists across invocations in same environment:

```python
import os
import urllib.request

# Download large file once, reuse across invocations
model_path = '/tmp/ml-model.pkl'

if not os.path.exists(model_path):
    print('Downloading model...')
    urllib.request.urlretrieve(
        'https://bucket.s3.amazonaws.com/model.pkl',
        model_path
    )

model = load_model(model_path)

def lambda_handler(event, context):
    prediction = model.predict(event['features'])
    return prediction
```

### Cost Optimization

**1. Batch Processing with Event Source Mappings**:

Process multiple records per invocation to reduce total invocations:

```yaml
SQS Configuration:
  BatchSize: 10000  # Max for SQS
  MaximumBatchingWindowInSeconds: 300  # Wait up to 5 min to fill batch

Kinesis Configuration:
  BatchSize: 10000  # Max 10k records
  ParallelizationFactor: 10  # Process 10 batches per shard concurrently

DynamoDB Streams:
  BatchSize: 1000  # Max for DDB Streams
  MaximumBatchingWindowInSeconds: 10

Cost Impact:
- 1 million individual invocations: $0.20
- 100 batches of 10k records: $0.00002 (99.99% reduction in request charges)
```

**2. Reserved Concurrency vs Provisioned Concurrency**:

| Feature | Reserved Concurrency | Provisioned Concurrency |
|---------|---------------------|-------------------------|
| **Purpose** | Limit max concurrency | Pre-warm execution environments |
| **Cost** | Free | $0.0000041667 per GB-hour |
| **Cold Starts** | Not eliminated | Eliminated |
| **Use Case** | Cost control, prevent runaway scaling | Performance requirement |

**3. Asynchronous Processing Pattern**:

Offload non-critical work to async processing:
```
Synchronous (slow):
API Gateway → Lambda → [Send email + Update DB + Generate report] → Response (3s)

Asynchronous (fast):
API Gateway → Lambda → Response (100ms)
                   ↓
                  SNS → [Email Lambda, DB Lambda, Report Lambda]
```

**4. Monitor and Optimize with CloudWatch Metrics**:
- **Duration**: Optimize code performance
- **Billed Duration**: Actual cost driver (rounded to nearest ms)
- **Memory Used**: Right-size memory allocation
- **Concurrent Executions**: Understand scaling patterns
- **Throttles**: Identify concurrency limits
- **Errors**: Find and fix failures

**AWS Documentation:**
- [Lambda Performance Optimization](https://docs.aws.amazon.com/lambda/latest/operatorguide/perf-optimize.html)
- [Lambda Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)
- [Lambda Power Tuning Tool](https://github.com/alexcasalboni/aws-lambda-power-tuning)

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

## Advanced Serverless Patterns

### Lambda Function URLs

Lambda function URLs provide dedicated HTTP(S) endpoints for functions without requiring API Gateway. Function URLs are ideal for simple webhooks, single-function APIs, or cost-optimized endpoints where API Gateway features aren't needed.

**Capabilities**:
- **Dedicated URL**: Each function gets unique endpoint: `https://<url-id>.lambda-url.<region>.on.aws`
- **Dual-stack**: IPv4 and IPv6 support
- **Permanent**: URL never changes once created
- **CORS**: Built-in CORS configuration
- **Throttling**: Control via reserved concurrency (max RPS = 10 × reserved concurrency)

**Authentication Options**:

| Auth Type | Access Control | Use Cases |
|-----------|----------------|-----------|
| **AWS_IAM** | Requires AWS Signature v4 signed requests | Internal APIs, service-to-service, AWS SDK clients |
| **NONE** | Public access, no authentication | Webhooks, public APIs, third-party integrations |

**CORS Configuration Example**:
```json
{
  "AllowOrigins": ["https://example.com", "https://app.example.com"],
  "AllowMethods": ["GET", "POST"],
  "AllowHeaders": ["Content-Type", "Authorization"],
  "ExposeHeaders": ["X-Custom-Header"],
  "MaxAge": 300,
  "AllowCredentials": true
}
```

**Function URLs vs API Gateway**:

| Feature | Function URLs | API Gateway |
|---------|---------------|-------------|
| **Cost** | No additional charge | $3.50 per million requests (REST), $1.00 (HTTP) |
| **Latency** | Lower (direct invoke) | Slightly higher (additional hop) |
| **Features** | Basic HTTP endpoint | Caching, usage plans, throttling, transformation |
| **Auth** | IAM or none | IAM, Cognito, JWT, Lambda authorizers, API keys |
| **Rate Limiting** | Reserved concurrency only | Per-method throttling, usage plans |
| **Custom Domain** | Not supported | Fully supported |
| **When to Use** | Simple endpoints, webhooks, cost optimization | Production APIs requiring management features |

**Example Use Case - Webhook Receiver**:
```python
# Simple webhook receiver with function URL (NONE auth)
def lambda_handler(event, context):
    # event contains HTTP request details
    body = json.loads(event['body'])

    # Process webhook payload
    process_webhook(body)

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'status': 'received'})
    }
```

**AWS Documentation:**
- [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)

## Authentication and Authorization Patterns

Serverless applications require robust authentication and authorization to secure APIs and resources. AWS provides multiple mechanisms optimized for different use cases.

### Amazon Cognito User Pools

Amazon Cognito User Pools provide a complete user directory and authentication service with built-in UI for sign-up and sign-in. User Pools integrate seamlessly with API Gateway and AppSync for JWT-based authorization.

**Core Features**:
- **User Management**: Registration, sign-in, password reset, email/phone verification
- **Multi-Factor Authentication (MFA)**: SMS, TOTP authenticator apps, adaptive auth
- **Social Identity**: Facebook, Google, Amazon, Apple federation
- **SAML and OIDC**: Enterprise IdP integration (Okta, Auth0, Azure AD)
- **Customization**: Lambda triggers for custom workflows (pre-signup validation, post-authentication)
- **Password Policies**: Configurable complexity, expiration, history
- **JWT Tokens**: ID token (user attributes), access token (authorization), refresh token

**Integration with API Gateway**:
```
1. User signs in to Cognito User Pool
2. Cognito returns JWT tokens (ID token, access token, refresh token)
3. Client includes JWT in Authorization header
4. API Gateway validates JWT with Cognito (automatic, no Lambda)
5. If valid, request forwarded to Lambda
6. Lambda receives user claims from $context.authorizer.claims
```

**JWT Token Structure**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "cognito:groups": ["admin", "editors"],
  "iss": "https://cognito-idp.region.amazonaws.com/pool-id",
  "exp": 1640995200,
  "iat": 1640991600
}
```

Lambda functions can access claims:
```python
def lambda_handler(event, context):
    claims = event['requestContext']['authorizer']['claims']
    user_email = claims['email']
    user_groups = claims.get('cognito:groups', [])

    # Implement authorization logic based on claims
    if 'admin' in user_groups:
        # Allow admin operations
        pass
```

**User Pool vs Identity Pool**:
- **User Pools**: Authentication (sign-in), JWT tokens, user directory
- **Identity Pools**: Authorization, temporary AWS credentials for AWS service access (S3, DynamoDB)
- **Common Pattern**: User Pool for API auth + Identity Pool for direct AWS resource access from client

**AWS Documentation:**
- [Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [User Pool JWT Tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html)

### Lambda Authorizers (Custom Authorizers)

Lambda authorizers provide custom authorization logic for API Gateway. Use when you need non-standard auth schemes, legacy systems, or complex authorization rules not supported by other mechanisms.

**Lambda Authorizer Types**:

**1. Token-Based Authorizer**:
Receives authorization token from header, returns IAM policy:
```python
def lambda_handler(event, context):
    token = event['authorizationToken']  # "Bearer <token>"
    method_arn = event['methodArn']

    # Validate token (call external OAuth server, check database, etc.)
    user_id = validate_token(token)

    if user_id:
        return {
            'principalId': user_id,
            'policyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Action': 'execute-api:Invoke',
                    'Effect': 'Allow',
                    'Resource': method_arn
                }]
            },
            'context': {
                'userId': user_id,
                'role': 'user'
            }
        }
    else:
        raise Exception('Unauthorized')
```

**2. Request-Based Authorizer**:
Receives full request context (headers, query params, path, source IP):
```python
def lambda_handler(event, context):
    headers = event['headers']
    query_params = event['queryStringParameters']
    source_ip = event['requestContext']['identity']['sourceIp']

    # Complex authorization logic
    if is_authorized(headers, query_params, source_ip):
        return generate_allow_policy(event['methodArn'])
    else:
        raise Exception('Unauthorized')
```

**Policy Caching**:
API Gateway caches authorization policies based on token or request parameters:
```
Cache Key: Authorization token (token-based) or configured parameters (request-based)
TTL: 0 - 3600 seconds (configurable)
Benefit: Reduce authorizer invocations (cost and latency)
Consideration: Changes in user permissions not reflected until cache expires
```

**Lambda Authorizer vs Cognito vs JWT Authorizer**:

| Aspect | Lambda Authorizer | Cognito User Pools | JWT Authorizer (HTTP API) |
|--------|-------------------|-------------------|---------------------------|
| **Flexibility** | Fully custom logic | Managed user directory | Standard JWT validation |
| **Latency** | Higher (Lambda cold start) | Lower (native validation) | Lowest (native validation) |
| **Cost** | Lambda invocations (cached) | Free (built-in) | Free (built-in) |
| **Use Cases** | OAuth, custom claims, legacy systems | User management needed | Modern JWT from any IdP |

**AWS Documentation:**
- [API Gateway Lambda Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)

### IAM Authorization

IAM authorization uses AWS Signature Version 4 to authenticate and authorize requests. Callers must have AWS credentials and sign requests with their secret access key.

**Use Cases**:
- **Service-to-service communication**: Lambda → API Gateway → Lambda
- **Internal microservices**: No user-facing authentication needed
- **AWS SDK clients**: Applications using AWS SDKs
- **Cross-account access**: IAM roles for cross-account API invocation

**How SigV4 Works**:
```
1. Client creates canonical request (method, URI, headers, payload)
2. Client signs request with AWS secret access key
3. Client includes signature in Authorization header or query string
4. API Gateway validates signature using AWS IAM
5. If valid, checks IAM policies for execute-api:Invoke permission
6. Request forwarded to backend
```

**IAM Policy Example**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "execute-api:Invoke",
    "Resource": "arn:aws:execute-api:region:account:api-id/stage/method/path"
  }]
}
```

**Granular Resource Permissions**:
```json
{
  "Resource": [
    "arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/GET/users",
    "arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/POST/orders"
  ]
}
```

**Cross-Account Access**:
```
1. Create IAM role in API account with execute-api:Invoke permission
2. Trust policy allows external account to assume role
3. External account assumes role, receives temporary credentials
4. External account signs requests with temporary credentials
```

**AWS Documentation:**
- [API Gateway IAM Authorization](https://docs.aws.amazon.com/apigateway/latest/developerguide/permissions.html)
- [AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)

## SAP-C02 Exam Tips

**Critical Service Limits and Quotas**:
1. **Lambda**: 15 min max timeout, 128 MB - 10 GB memory, 1,000 concurrent executions default, 50 MB zipped deployment package
2. **API Gateway**: 10,000 RPS account limit, 29-second integration timeout, 10 MB max payload
3. **DynamoDB**: 400 KB max item size, 25 items max in BatchWriteItem, 20 GSIs per table
4. **Step Functions Standard**: 1 year max execution, 25,000 events in history, 256 KB state data limit
5. **Step Functions Express**: 5 min max execution, 256 KB payload limit
6. **EventBridge**: 256 KB max event size, 5 targets per rule

**API Gateway Decision Tree**:
- **Need caching, usage plans, or SDK generation?** → REST API
- **Cost-sensitive with JWT auth?** → HTTP API (70% cheaper)
- **Bidirectional real-time communication?** → WebSocket API
- **Simple single-function endpoint?** → Lambda Function URL
- **Complex data aggregation with real-time?** → AppSync

**DynamoDB Capacity Mode Selection**:
- **Unpredictable, spiky, or new workload** → On-Demand (pay per request, instant scaling)
- **Predictable, sustained traffic** → Provisioned with Auto Scaling (lower per-request cost)
- **Can switch modes once every 24 hours**

**Event Processing Pattern Selection**:
- **Buffering and decoupling** → SQS + Lambda
- **Fan-out to multiple consumers** → SNS + multiple Lambda
- **Ordered stream processing** → Kinesis + Lambda
- **React to data changes** → DynamoDB Streams + Lambda
- **Complex event routing and filtering** → EventBridge + multiple targets
- **Multi-step orchestration** → Step Functions

**Lambda Optimization Decision Points**:
- **Cold start < 100ms requirement** → Provisioned Concurrency (cost tradeoff)
- **Java cold start issues** → SnapStart (10x improvement, no code change)
- **Cost optimization** → ARM/Graviton2 (20% reduction), right-size memory, batch processing
- **VPC access needed?** → Only if accessing VPC resources (RDS, ElastiCache)
- **Shared dependencies** → Lambda Layers (max 5 layers, avoid for Go/Rust)

**Authentication Pattern Selection**:
- **User management with MFA, social login** → Cognito User Pools
- **Service-to-service, internal APIs** → IAM with SigV4 signing
- **Standard JWT from any IdP** → JWT Authorizer (HTTP API only)
- **Custom OAuth, legacy systems, complex logic** → Lambda Authorizer
- **Public webhook, no auth** → Lambda Function URL with NONE auth

**Step Functions vs Lambda Direct Invocation**:
- **Use Step Functions when**: Multi-step workflow, >15 min duration, visual orchestration needed, complex error handling, human approval loops
- **Use Lambda directly when**: Simple event-driven task, <15 min, single-purpose function

**DynamoDB Design Considerations**:
- **Know access patterns upfront** - Query requires partition key, avoid Scan in production
- **Partition key must have high cardinality** - Many unique values, even access distribution
- **Hot partitions** - Use composite keys (e.g., `tenantId#userId`), not just timestamp
- **GSIs for alternative access patterns** - Eventually consistent, separate capacity
- **Streams for event-driven** - 24-hour retention, exactly-once per item

**Common Anti-Patterns to Avoid**:
- **Synchronous Lambda chaining** - Use Step Functions or events instead
- **Polling in Lambda** - Use event-driven triggers (DDB Streams, SQS, EventBridge)
- **Large monolithic Lambda** - Break into single-purpose functions
- **Relying on /tmp persistence** - Ephemeral, use S3/DynamoDB for durable state
- **All Lambdas in VPC** - Only for VPC resource access (adds cold start latency)
- **DynamoDB Scan in production** - Use Query with partition key or GSI

## Common SAP-C02 Scenarios

**Scenario: "Design a scalable API for unpredictable traffic with sub-100ms latency requirements"**
Solution:
- **API Layer**: API Gateway HTTP API (lower latency than REST)
- **Compute**: Lambda with Provisioned Concurrency (eliminates cold starts)
- **Database**: DynamoDB On-Demand mode (instant scaling, no capacity planning)
- **Caching**: DynamoDB DAX for microsecond read latency
- **Why**: HTTP API reduces cost and latency, Provisioned Concurrency ensures consistent performance, DynamoDB On-Demand handles traffic spikes

**Scenario: "Process 100,000 S3 file uploads per hour asynchronously with retry logic"**
Solution:
- **Trigger**: S3 Event Notification → SQS queue → Lambda (event source mapping)
- **Why not direct S3 → Lambda**: SQS provides buffering, batch processing (10k messages/invocation), automatic retry with DLQ
- **Configuration**: BatchSize: 10,000, MaximumBatchingWindowInSeconds: 60
- **Cost benefit**: 10 Lambda invocations vs 100,000

**Scenario: "Fan out order events to inventory, shipping, and notification services"**
Solution Option 1:
- **SNS topic with three SQS subscriptions** → Each service polls its queue
- **Use when**: Simple pub/sub, no filtering needed, services can poll

Solution Option 2:
- **EventBridge with three rules** → Route to different targets based on order type
- **Use when**: Content-based routing (e.g., international vs domestic orders), need filtering, SaaS integration

**Scenario: "Orchestrate multi-step ML pipeline: data validation → preprocessing → training → evaluation → deployment (6-hour duration)"**
Solution:
- **Step Functions Standard Workflow** (supports up to 1 year)
- **States**:
  - Task: Lambda for validation
  - Choice: Branch based on data quality
  - Task: Glue job for preprocessing (Run a Job .sync pattern)
  - Task: SageMaker training job (Run a Job .sync pattern)
  - Parallel: Evaluate on multiple test sets concurrently
  - Task: Deploy model to endpoint
- **Error handling**: Retry for transient failures, Catch for terminal errors with notification
- **Why**: Exceeds Lambda 15-min limit, requires visual orchestration, built-in error handling

**Scenario: "Build real-time collaborative document editing app"**
Solution:
- **API**: AWS AppSync with GraphQL subscriptions
- **Data**: DynamoDB for document storage
- **Real-time**: AppSync subscriptions push changes to all connected clients via WebSocket
- **Offline**: Amplify DataStore for offline sync
- **Conflict resolution**: Last-writer-wins or custom resolver logic
- **Why**: Native real-time, offline support, no custom WebSocket management

**Scenario: "Authenticate corporate users (Okta) and give them access to AWS resources (S3, DynamoDB)"**
Solution:
- **Authentication**: Cognito User Pool with Okta SAML federation
- **Authorization**: Cognito Identity Pool to exchange JWT for temporary AWS credentials
- **Access**: IAM roles mapped to Cognito groups (admin, user)
- **Flow**: User → Okta → Cognito User Pool (JWT) → Cognito Identity Pool → STS credentials → AWS resources

**Scenario: "Process 10 million IoT events per hour at lowest cost"**
Solution:
- **Ingestion**: IoT Core → Kinesis Data Streams
- **Processing**: Lambda with Kinesis event source mapping
- **Configuration**:
  - BatchSize: 10,000 (maximize batch)
  - ParallelizationFactor: 10 (process multiple batches per shard)
  - Tumbling window: 60 seconds (aggregate before processing)
- **Alternative**: Step Functions Express Workflow Asynchronous (at-least-once, priced by execution)
- **Cost optimization**: 1,000 invocations vs 10 million with batching

**Scenario: "React to new user registrations in DynamoDB with welcome email and analytics"**
Solution:
- **Trigger**: DynamoDB Streams → Lambda
- **Pattern**: Single Lambda fanning out to SNS topic
- **SNS subscriptions**:
  - Email service Lambda
  - Analytics Lambda → Kinesis Data Firehose → S3
- **Stream configuration**: NEW_IMAGE view type (get full user object)
- **Why**: Ordered processing per user, exactly-once per item, decoupled consumers via SNS

**Scenario: "Serverless API with custom OAuth 2.0 provider and rate limiting per customer"**
Solution:
- **API**: API Gateway REST API (supports usage plans)
- **Auth**: Lambda Authorizer validating OAuth tokens with external provider
- **Rate limiting**: Usage plans with API keys per customer
- **Caching**: Authorizer result cache TTL: 300 seconds (reduce OAuth server calls)
- **Why**: Custom OAuth requires Lambda Authorizer, usage plans require REST API (not available in HTTP API)

**Scenario: "Direct file upload to S3 from browser without exposing AWS credentials"**
Solution Option 1:
- **Presigned URL**: Backend Lambda generates presigned S3 URL, client uploads directly
- **Use when**: Simple upload, no validation needed

Solution Option 2:
- **API Gateway S3 integration**: API Gateway directly integrates with S3 PutObject
- **Auth**: Cognito User Pool or API key
- **Use when**: Need authentication, logging, rate limiting

**AWS Documentation:**
- [Serverless Architectures with AWS Lambda](https://docs.aws.amazon.com/whitepapers/latest/serverless-architectures-lambda/welcome.html)
- [Serverless Applications Lens - Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)
- [Building Microservices with Event-Driven Architecture](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/microservices-on-aws.html)
