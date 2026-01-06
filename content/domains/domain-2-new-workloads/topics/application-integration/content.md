# Application Integration

Application integration services enable decoupled, scalable architectures by facilitating communication between distributed applications, microservices, and systems.

## Amazon SQS (Simple Queue Service)

### Queue Types

**Standard Queues:**
- Unlimited throughput, best-effort ordering
- At-least-once delivery (messages may be delivered more than once)
- Use for high-throughput scenarios where order isn't critical

**FIFO Queues:**
- Guaranteed ordering (first-in, first-out)
- Exactly-once processing (deduplication within 5-minute interval)
- Limited to 300 TPS (3,000 with batching)
- Queue name must end with `.fifo`
- Use for workflows requiring strict ordering

### Key Concepts

**Visibility Timeout:**
- Period during which message is invisible after being received
- Prevents multiple consumers from processing same message
- Default 30 seconds, max 12 hours
- Change dynamically using `ChangeMessageVisibility`

**Dead Letter Queue (DLQ):**
- Receives messages that fail processing after max receive count
- Must be same type (standard/FIFO) as source queue
- Use for debugging and handling poison messages
- Monitor with CloudWatch alarms

**Long Polling:**
- Reduces empty responses and cost
- Wait up to 20 seconds for messages to arrive
- Enable via `ReceiveMessageWaitTimeSeconds` or `WaitTimeSeconds`

**Message Attributes:**
- Custom metadata without affecting message body
- Support for String, Number, and Binary data types
- Up to 10 attributes per message

**Delay Queues:**
- Postpone delivery of new messages (0-900 seconds)
- Set at queue level or per message
- Use for implementing retry logic with backoff

### Best Practices

- Set visibility timeout to 6x average processing time
- Implement exponential backoff for retries
- Use message groups in FIFO queues for parallel processing
- Enable server-side encryption (SSE-SQS or SSE-KMS)
- Monitor `ApproximateAgeOfOldestMessage` metric

## Amazon SNS (Simple Notification Service)

### Architecture

**Topics:**
- Pub/sub communication channel
- Standard topics: best-effort ordering, high throughput
- FIFO topics: strict ordering, works with FIFO SQS queues

**Subscriptions:**
- HTTP/HTTPS endpoints
- Email, Email-JSON
- SMS
- AWS Lambda
- Amazon SQS
- Amazon Kinesis Data Firehose
- Platform application endpoints (mobile push)

### Message Filtering

**Filter Policies:**
- JSON-based filtering on message attributes
- Reduces unnecessary message delivery
- Supports exact match, prefix, numeric ranges, existence checks
- Applied at subscription level

```json
{
  "eventType": ["order"],
  "price": [{"numeric": [">=", 100]}],
  "region": [{"prefix": "us-"}]
}
```

### Fan-Out Pattern

**SNS + SQS:**
- Publish once to SNS topic
- Multiple SQS queues subscribe
- Each queue receives copy of message
- Enables parallel asynchronous processing
- Preserves message durability

### Best Practices

- Use message attributes for filtering
- Enable raw message delivery for SQS subscriptions
- Implement retry policies and DLQs
- Use FIFO topics when ordering matters across subscribers
- Encrypt sensitive data with KMS

## Amazon EventBridge

### Core Concepts

**Event Buses:**
- Default event bus (AWS service events)
- Custom event buses (application events)
- Partner event buses (SaaS integrations)
- Cross-account event delivery

**Events:**
- JSON objects describing state changes
- Maximum size 256 KB
- Automatically published by AWS services

**Rules:**
- Pattern matching on event structure
- Schedule expressions (cron, rate)
- Multiple targets per rule (up to 5)

**Event Patterns:**

```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["terminated"]
  }
}
```

### Targets

- Lambda functions
- SQS queues
- SNS topics
- Kinesis streams
- Step Functions state machines
- CodePipeline
- ECS tasks
- API destinations (HTTP endpoints)

### Schema Registry

- Discover event schemas automatically
- Generate code bindings for type safety
- Version management for schemas
- Supports OpenAPI and JSONSchema

### Event Archive and Replay

- Archive events for compliance or debugging
- Replay events to recover from errors
- Define retention period (unlimited or days)
- Filter which events to archive

### Best Practices

- Use content-based filtering to reduce target invocations
- Leverage input transformers to customize target input
- Implement DLQs for failed target invocations
- Use cross-account events for multi-account architectures
- Monitor with CloudWatch metrics and EventBridge logs

## AWS Step Functions

### State Machine Types

**Standard Workflows:**
- Long-running (up to 1 year)
- Exactly-once execution
- Priced per state transition
- Use for orchestrating multi-step processes

**Express Workflows:**
- Short-duration (up to 5 minutes)
- At-least-once execution
- Priced per execution and duration
- Synchronous or asynchronous
- Use for high-volume event processing

### State Types

**Task:** Execute work (Lambda, ECS, SNS, SQS, Glue, etc.)
**Choice:** Conditional branching
**Parallel:** Execute branches in parallel
**Wait:** Delay for specified time
**Succeed/Fail:** Terminal states
**Pass:** Pass input to output (with transformation)
**Map:** Iterate over array items

### Error Handling

**Retry:**
- Exponential backoff
- Configure `MaxAttempts`, `BackoffRate`, `IntervalSeconds`
- Match specific error types

**Catch:**
- Handle errors after retries exhausted
- Transition to recovery states
- Access error details via `ResultPath`

### Integration Patterns

**Request-Response:** Default, wait for task completion
**Run a Job (.sync):** Wait for callback with task token
**Wait for Callback (.waitForTaskToken):** Pause until callback received

### Service Integrations

- AWS SDK integrations (200+ services)
- Optimized integrations (Lambda, ECS, SNS, SQS, Glue, Batch, etc.)
- Activity tasks (custom workers)

### Best Practices

- Use Express workflows for high-throughput scenarios
- Implement error handling with Retry and Catch
- Use Map state for parallel processing of arrays
- Leverage input/output processing with InputPath, OutputPath, ResultPath
- Monitor with CloudWatch metrics and X-Ray tracing

## Amazon API Gateway

### API Types

**REST API:**
- Full API management features
- API keys, usage plans, request/response transformation
- Edge-optimized, regional, or private endpoints
- Supports OpenAPI imports

**HTTP API:**
- Lower latency and cost (71% cheaper)
- Simpler configuration
- OIDC and OAuth 2.0 authorization
- Automatic deployment
- Use for modern HTTP APIs and proxy to Lambda/HTTP backends

**WebSocket API:**
- Persistent connections
- Two-way communication
- Connection management (connect, disconnect, message routes)
- Use for real-time applications (chat, gaming, streaming)

### Security

**Authentication:**
- IAM roles and policies
- Cognito User Pools
- Lambda authorizers (custom auth)
- API keys (identification, not security)

**Authorization:**
- Resource policies
- CORS configuration
- Private APIs (VPC endpoints)

### Performance

**Caching:**
- Cache responses at API or stage level
- TTL 0-3600 seconds
- Encryption at rest
- Invalidate cache per-request or flush entire cache

**Throttling:**
- Account-level limit: 10,000 RPS, 5,000 burst
- Configure stage/method level limits
- Usage plans for API keys

### Integration Types

**Lambda Function:** Invoke Lambda with custom integration
**HTTP/HTTPS:** Proxy to HTTP endpoint
**AWS Service:** Direct integration with AWS services
**Mock:** Return response without backend
**VPC Link:** Access resources in VPC (NLB for HTTP API, NLB/ALB for REST API)

### Best Practices

- Use HTTP API for cost-effective Lambda proxies
- Implement request validation to reduce backend load
- Enable CloudWatch logging and X-Ray tracing
- Use custom domain names with ACM certificates
- Implement API versioning and stage variables

## Amazon AppFlow

### Overview

Fully managed integration service for transferring data between SaaS applications and AWS services without code.

### Supported Integrations

**Sources:** Salesforce, SAP, Zendesk, Slack, ServiceNow, Google Analytics, etc.
**Destinations:** S3, Redshift, Snowflake, Salesforce, EventBridge, etc.

### Flow Configuration

**Trigger Types:**
- On-demand
- Schedule (up to every 1 minute)
- Event-driven (real-time)

**Data Transformation:**
- Field mapping
- Filtering
- Validation
- Masking
- Truncation
- Merging

### Security

- Encryption in transit and at rest
- Field-level encryption
- Private connectivity via PrivateLink
- Data residency controls

### Best Practices

- Use incremental transfers to reduce data volume
- Implement error handling with retry logic
- Monitor flows with CloudWatch metrics
- Use event-driven flows for real-time requirements

## Integration Patterns

### Decoupling Pattern

**Problem:** Tight coupling between components causes cascading failures.

**Solution:** Use SQS/SNS between components.
- Producer publishes to queue/topic
- Consumer processes asynchronously
- Each component can scale independently

### Fan-Out Pattern

**Problem:** Multiple systems need same data.

**Solution:** SNS topic with multiple SQS queue subscriptions.
- Single publish reaches all subscribers
- Each subscriber processes independently
- Add/remove subscribers without affecting others

### Saga Pattern

**Problem:** Distributed transactions across services.

**Solution:** Use Step Functions to orchestrate compensating transactions.
- Each step includes rollback logic
- Use Catch to trigger compensation
- Maintain eventual consistency

### Event Sourcing

**Problem:** Track all state changes over time.

**Solution:** EventBridge + Event Archive.
- Store all events in archive
- Replay events to rebuild state
- Audit trail for compliance

### Choreography vs. Orchestration

**Choreography (EventBridge):**
- Services react to events independently
- No central coordinator
- Loose coupling, harder to track flow

**Orchestration (Step Functions):**
- Central coordinator manages workflow
- Explicit flow definition
- Easier to monitor and debug
- Tighter coupling

### Request-Response vs. Asynchronous

**Request-Response (API Gateway):**
- Immediate response required
- Synchronous communication
- Higher coupling

**Asynchronous (SQS/SNS/EventBridge):**
- No immediate response needed
- Decoupled components
- Better scalability and resilience

## Service Comparison

| Feature | SQS | SNS | EventBridge |
|---------|-----|-----|-------------|
| Pattern | Point-to-point queue | Pub/sub | Event bus |
| Delivery | Pull (polling) | Push | Push |
| Ordering | FIFO queues | FIFO topics | No guarantee |
| Filtering | Consumer-side | Message attributes | Content-based |
| Retention | Up to 14 days | No retention | Archive/replay |
| Use Case | Asynchronous processing | Fan-out notifications | Event-driven workflows |

## Anti-Patterns

- Using SQS for real-time communication (use WebSocket API)
- Polling SQS with short wait times (use long polling)
- Missing DLQ configuration (risk losing messages)
- Tight coupling via synchronous calls (use async messaging)
- Not implementing idempotency (risk duplicate processing)
- Using SNS when only one subscriber (use SQS directly)
- Implementing complex routing in code (use EventBridge rules)
