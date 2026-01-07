# Application Integration

Application integration services enable decoupled, scalable architectures by facilitating communication between distributed applications, microservices, and systems. These services are fundamental to building resilient, event-driven architectures that can scale independently and handle failures gracefully.

Modern cloud architectures increasingly rely on loosely-coupled integration patterns to achieve high availability, fault isolation, and independent scalability. AWS provides a comprehensive suite of integration services that support both synchronous and asynchronous communication patterns, enabling architects to design solutions that match specific business requirements and technical constraints.

## Amazon SQS (Simple Queue Service)

Amazon SQS is a fully managed message queuing service that enables asynchronous communication between distributed system components. It provides reliable, scalable message delivery without requiring message brokers or middleware infrastructure management.

### Queue Types

**Standard Queues:**
- **Unlimited throughput:** Nearly unlimited transactions per second (TPS) for sends, receives, and deletes
- **Best-effort ordering:** Messages generally delivered in the same order sent, but not guaranteed
- **At-least-once delivery:** Each message delivered at least once, but occasionally more than once (design for idempotency)
- **Use cases:** High-throughput scenarios where occasional duplication is acceptable (order processing, log aggregation, batch job queuing)
- **Typical latency:** Less than 10ms for send and receive operations

**FIFO Queues:**
- **Strict ordering:** Guarantees messages processed exactly in the order sent
- **Exactly-once processing:** Built-in deduplication prevents duplicate messages within 5-minute deduplication interval
- **Throughput limits:**
  - Standard mode: 300 messages per second (MPS) without batching, 3,000 MPS with batching (10 messages per batch)
  - High throughput mode: 3,000 MPS per API action without batching, 30,000 MPS with batching (available in most regions)
- **Naming requirement:** Queue name must end with `.fifo` suffix
- **Message groups:** Use `MessageGroupId` to enable parallel processing across different groups while maintaining order within each group
- **Use cases:** Financial transactions, event sequencing, inventory management, order fulfillment where sequence matters
- **Content-based deduplication:** Automatically generates deduplication ID from message body SHA-256 hash when enabled

### Key Concepts

**Visibility Timeout:**
- **Purpose:** Prevents multiple consumers from processing the same message simultaneously
- **Mechanism:** After a consumer receives a message, it becomes invisible to other consumers for the timeout duration
- **Duration:** Default 30 seconds, configurable from 0 seconds to 12 hours
- **Dynamic adjustment:** Use `ChangeMessageVisibility` API to extend timeout while processing long-running tasks
- **Best practice:** Set to at least 6x your average processing time to account for retries and variability
- **Failure handling:** If processing fails and timeout expires without deletion, message returns to queue for reprocessing

**Dead Letter Queue (DLQ):**
- **Purpose:** Isolates messages that repeatedly fail processing for later analysis
- **Configuration:** Set `maxReceiveCount` threshold (typically 3-5 attempts before moving to DLQ)
- **Type matching:** DLQ must be same type as source queue (Standard DLQ for Standard queue, FIFO DLQ for FIFO queue)
- **Retention:** DLQs should have longer retention periods than source queues (up to 14 days maximum)
- **Use cases:** Debugging failed messages, handling poison messages, compliance audit trails
- **Monitoring:** Set CloudWatch alarms on `ApproximateNumberOfMessagesVisible` metric to alert on DLQ messages
- **Redrive policy:** Configure automatic redrive to move messages back to source queue after fixing issues (available via Redrive Allow Policy)

**Long Polling:**
- **Cost optimization:** Reduces number of empty `ReceiveMessage` responses, lowering API costs by up to 50%
- **Latency trade-off:** Waits up to 20 seconds for messages to arrive before returning response
- **Configuration:** Set `ReceiveMessageWaitTimeSeconds` at queue level or `WaitTimeSeconds` parameter in API call
- **Best practice:** Enable long polling (10-20 seconds) for nearly all use cases unless sub-second latency required
- **Comparison to short polling:** Short polling (0 seconds) checks subset of servers immediately, potentially missing messages

**Message Attributes:**
- **Purpose:** Attach structured metadata to messages without parsing message body
- **Use cases:** Message filtering, routing decisions, tracking correlation IDs, storing timestamps
- **Data types:** String, Number, Binary, and arrays of these types (custom type descriptors supported)
- **Limits:** Up to 10 attributes per message, attribute name max 256 characters
- **Size impact:** Message attributes count toward 256 KB message size limit
- **SNS integration:** Message attributes preserved when routing through SNS to SQS fan-out

**Delay Queues:**
- **Purpose:** Postpone delivery of new messages for specified period
- **Configuration:** Set `DelaySeconds` at queue level (0-900 seconds, default 0) or per-message using `DelaySeconds` parameter
- **Use cases:** Implementing distributed delay/retry logic, scheduled task execution, rate limiting
- **Per-message override:** Individual message delay overrides queue-level setting
- **FIFO behavior:** Messages delayed independently within each message group, maintaining order after delay expires
- **Visibility timeout interaction:** Delay applies before first delivery; visibility timeout applies after each receive

### Real-World Scenarios

**E-commerce Order Processing:**
An e-commerce platform uses Standard SQS queue to decouple order placement from order processing. When customers place orders during flash sales (Black Friday), the queue absorbs traffic spikes (100,000+ orders/minute) while backend systems process at sustainable rate (5,000/minute). DLQ captures orders that fail payment validation after 3 retries for manual review.

**Financial Transaction Sequencing:**
A payment processor uses FIFO queue with high throughput mode to process account transactions. MessageGroupId set to account number ensures all transactions for same account processed in order, while different accounts processed in parallel across 1,000 message groups, achieving 30,000 TPS.

**Distributed Task Coordination:**
A video transcoding service uses delay queues to implement exponential backoff. Failed transcoding jobs requeued with increasing delays (30s, 2m, 10m, 1h) to avoid overwhelming downstream services during transient failures.

### Best Practices

**Performance Optimization:**
- Set visibility timeout to 6x average processing time plus variance buffer
- Enable long polling with 20-second wait time to reduce empty receives
- Use batch operations (SendMessageBatch, DeleteMessageBatch) to process up to 10 messages per API call, reducing costs by 90%
- For FIFO queues handling diverse workloads, use multiple message groups to enable parallel processing
- Implement connection pooling and reuse HTTP connections to AWS endpoints

**Reliability and Resilience:**
- Implement idempotent message processing to handle at-least-once delivery safely
- Configure DLQs with maxReceiveCount of 3-5 attempts for production workloads
- Set DLQ retention to 14 days for forensic analysis of failed messages
- Use separate DLQs for different failure types (validation errors vs. downstream service failures)
- Implement exponential backoff with jitter when reprocessing messages from DLQ

**Security Best Practices:**
- Enable server-side encryption using SSE-SQS (free, AES-256) or SSE-KMS (audit trail, key rotation)
- Use SQS resource policies to grant cross-account access instead of sharing IAM credentials
- Enable access logging via CloudTrail for compliance requirements
- Apply least-privilege IAM policies (limit to specific queue ARNs and required actions)
- For sensitive data, encrypt message payload before sending using client-side encryption

**Monitoring and Observability:**
- Monitor `ApproximateAgeOfOldestMessage` metric - alert if exceeds processing SLA (indicates consumer scaling needed)
- Track `ApproximateNumberOfMessagesVisible` for queue depth monitoring
- Set CloudWatch alarms on DLQ message count with immediate notification
- Monitor `NumberOfMessagesSent` and `NumberOfMessagesReceived` to detect consumer failures
- Use message attributes to track correlation IDs for distributed tracing

**AWS Documentation:**
- [Amazon SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [SQS FIFO Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html)
- [SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)
- [SQS Dead-Letter Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)

## Amazon SNS (Simple Notification Service)

Amazon SNS is a fully managed pub/sub messaging service that enables message delivery from publishers to multiple subscribers through topics. It supports fan-out patterns, mobile push notifications, and event-driven architectures with minimal operational overhead.

### Architecture

**Topics:**
- **Communication model:** Publishers send messages to topics; subscribers receive copies of published messages
- **Standard topics:**
  - Best-effort ordering with high message throughput (unlimited publishes per second)
  - At-least-once delivery to subscriptions
  - Use for fan-out patterns, mobile notifications, and event distribution where order isn't critical
- **FIFO topics:**
  - Strict message ordering preserved across all subscriptions
  - Exactly-once message delivery with deduplication (5-minute deduplication interval)
  - Limited to 300 publishes per second (3,000 with batching)
  - Must end with `.fifo` suffix and can only fan-out to FIFO SQS queues
  - Use for workflows requiring ordered, guaranteed delivery (stock trading, event sequencing)
  - Message groups enable parallel processing while maintaining order within groups

**Subscriptions:**
- **HTTP/HTTPS endpoints:** Webhook delivery to external services with retry policies
- **Email/Email-JSON:** Human notifications with plain text or JSON formatting
- **SMS:** Mobile text messages with delivery status tracking (supports opt-out management)
- **AWS Lambda:** Serverless function invocation with automatic retry
- **Amazon SQS:** Queue delivery for durable, asynchronous processing (standard or FIFO queues)
- **Amazon Kinesis Data Firehose:** Stream data to S3, Redshift, Elasticsearch, or HTTP endpoints
- **Platform application endpoints:** Mobile push notifications (Apple APNs, Google FCM, Amazon ADM)
- **Service integrations:** Third-party SaaS providers (Datadog, MongoDB, Splunk, PagerDuty) via AWS Partner integrations

### Message Filtering

**Filter Policies:**
- **Purpose:** Reduce unnecessary message delivery and processing costs by filtering at subscription level
- **Mechanism:** JSON-based filtering applied to message attributes (not message body) before delivery
- **Policy location:** Configured per subscription, enabling different subscribers to receive different message subsets
- **Cost savings:** Subscribers only charged for messages passing filter; rejected messages incur no delivery cost

**Supported Operators:**
- **Exact match:** String or numeric equality (`"eventType": ["order", "refund"]`)
- **Prefix matching:** String begins with specified value (`"region": [{"prefix": "us-"}]`)
- **Numeric ranges:** Greater than, less than, between (`"price": [{"numeric": [">=", 100, "<=", 1000]}]`)
- **Anything-but:** Exclude specific values (`"status": [{"anything-but": ["cancelled"]}]`)
- **Exists:** Check attribute presence (`"discount": [{"exists": true}]`)
- **IP address matching:** CIDR-based filtering (`"sourceIp": [{"cidr": "10.0.0.0/8"}]`)

**Example Filter Policy:**
```json
{
  "eventType": ["order"],
  "price": [{"numeric": [">=", 100]}],
  "region": [{"prefix": "us-"}],
  "priority": [{"anything-but": ["low"]}]
}
```

**Limits:**
- Filter policy max size: 256 KB
- Maximum 5 attribute names in AND conditions
- Maximum 150 values across all conditions

### Fan-Out Pattern

**SNS + SQS Architecture:**
- **Pattern:** Single publish to SNS topic delivers to multiple SQS queue subscriptions
- **Benefits:**
  - Parallel processing: Each queue's consumers process independently
  - Isolation: One queue's failure doesn't affect others
  - Heterogeneous processing: Different consumer logic per queue
  - Message durability: SQS queues persist messages if consumers unavailable
  - Scalability: Add/remove queues without publisher changes

**Real-World Example:**
E-commerce order placement publishes to SNS topic with subscriptions:
1. Order fulfillment queue (standard SQS) - processes shipments
2. Analytics queue (standard SQS) - sends data to data warehouse
3. Email notification queue (standard SQS) - triggers customer confirmation
4. Fraud detection Lambda - performs real-time risk analysis
5. Inventory Firehose - streams to S3 for batch reporting

**Raw Message Delivery:**
When enabled for SQS subscriptions, SNS delivers original message without SNS metadata wrapper, simplifying consumer logic and reducing message size.

### Delivery Policies and Retry

**HTTP/HTTPS Retry Configuration:**
- **Retry phases:** Immediate retry (no delay), pre-backoff (short delays), backoff (exponential delays), post-backoff (final attempts)
- **Default retries:** Up to 100 attempts over 23 days for HTTP endpoints
- **Configurable parameters:** Number of retries, min/max delay, backoff function
- **Throttling:** 1,000 deliveries per second per HTTP endpoint (prevents overwhelming receivers)

**Dead-Letter Queues for SNS:**
- Configure DLQ (SQS queue) to capture messages that fail delivery after all retries exhausted
- Supported for Lambda, SQS, HTTP/HTTPS, and platform endpoints
- Monitor DLQ depth to detect systematic delivery failures

### Real-World Scenarios

**Multi-Region Event Distribution:**
A SaaS platform publishes user activity events to SNS standard topic with subscriptions across regions. Each region's SQS queue receives events for local processing, reducing cross-region latency while maintaining global visibility.

**Alert Fanout System:**
CloudWatch alarms publish to SNS topic with subscriptions to PagerDuty (HTTP endpoint), Slack (Lambda function), operations email list (Email), and incident logging queue (SQS) ensuring all stakeholders notified simultaneously.

**Financial Trading Events:**
Stock price updates published to SNS FIFO topic with message group per stock symbol. Each trading algorithm subscribes via FIFO SQS queue, receiving ordered price updates for accurate analysis while different stocks processed in parallel.

### Best Practices

**Message Design:**
- Use message attributes (not body parsing) for filtering to leverage SNS filter policies
- Include correlation IDs and timestamps in message attributes for tracing
- Keep message body under 256 KB (SNS maximum message size)
- Use base64 encoding for binary data

**Subscription Management:**
- Enable raw message delivery for SQS subscriptions to reduce JSON parsing overhead
- Implement subscription filter policies to minimize unnecessary deliveries and costs
- Use subscription DLQs to capture failed deliveries for debugging
- Confirm subscriptions programmatically for HTTP/HTTPS endpoints (validate SubscribeURL)

**Reliability:**
- Configure appropriate retry policies for HTTP/HTTPS endpoints based on downstream SLAs
- Use FIFO topics only when ordering across all subscribers required (higher cost, lower throughput)
- Implement idempotent message processing in all subscribers (handles at-least-once delivery)
- Monitor `NumberOfNotificationsFailed` CloudWatch metric per subscription

**Security:**
- Encrypt topics with AWS KMS for sensitive data (messages encrypted at rest and in transit)
- Use SNS topic policies to control publisher permissions (prevent unauthorized publishes)
- Enable access logging via CloudTrail for compliance audit trails
- For external HTTP subscribers, use HTTPS with certificate validation

**AWS Documentation:**
- [Amazon SNS Developer Guide](https://docs.aws.amazon.com/sns/latest/dg/welcome.html)
- [SNS Message Filtering](https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html)
- [SNS FIFO Topics](https://docs.aws.amazon.com/sns/latest/dg/sns-fifo-topics.html)
- [SNS Fan-Out Pattern](https://docs.aws.amazon.com/sns/latest/dg/sns-common-scenarios.html)

## Amazon EventBridge

Amazon EventBridge is a serverless event bus service that connects applications using events from AWS services, custom applications, and SaaS providers. It simplifies building event-driven architectures with advanced routing, transformation, and filtering capabilities.

### Core Concepts

**Event Buses:**
- **Default event bus:** Automatically receives events from AWS services (CloudTrail, CloudWatch, EC2, S3, etc.) within the same account
- **Custom event buses:** User-created buses for application events, enabling organizational and permission boundaries
- **Partner event buses:** Receive events from SaaS providers (Zendesk, Datadog, PagerDuty, Auth0, etc.) without custom integrations
- **Cross-account delivery:** Send events to event buses in different AWS accounts using resource-based policies
- **Cross-region forwarding:** Route events between regions for multi-region architectures
- **Bus limits:** Up to 300 custom event buses per account per region

**Events:**
- **Structure:** JSON objects with standardized envelope containing `source`, `detail-type`, `detail`, `time`, `region`, `account`
- **Maximum size:** 256 KB per event
- **AWS service events:** Automatically published by 90+ AWS services (no configuration needed)
- **Custom events:** Applications publish using `PutEvents` API (up to 10 events per request)
- **Event TTL:** 24 hours (events not delivered within 24 hours discarded)

**Rules:**
- **Event pattern matching:** Filter events based on JSON structure using content-based filtering
- **Schedule expressions:** Trigger targets periodically using cron or rate expressions (run at 9 AM daily, every 5 minutes, etc.)
- **Multiple targets:** Each rule supports up to 5 targets (use SNS fan-out or EventBridge Pipes for more)
- **Input transformation:** Modify event payload before delivering to target using JSONPath and templates
- **Rule limits:** 300 rules per event bus

**Event Patterns:**

Match EC2 instance terminations:
```json
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["terminated"]
  }
}
```

Match S3 object creation in specific bucket:
```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["my-production-bucket"]
    },
    "object": {
      "key": [{"prefix": "uploads/"}]
    }
  }
}
```

**Pattern Matching Capabilities:**
- Prefix matching on strings
- Numeric comparisons (equals, greater than, less than, between)
- IP address CIDR matching
- Exists (check field presence)
- Anything-but (exclusion matching)
- OR logic (arrays) and AND logic (nested fields)

### Targets

**Compute and Orchestration:**
- **AWS Lambda:** Invoke functions synchronously with automatic retry (up to 185 invocations/second per rule)
- **Step Functions:** Start state machine executions with event as input
- **ECS tasks:** Launch containerized tasks with specific configurations
- **Batch jobs:** Submit jobs to AWS Batch queues

**Messaging and Streaming:**
- **SQS queues:** Deliver events to standard or FIFO queues for durable processing
- **SNS topics:** Fan-out events to multiple SNS subscribers
- **Kinesis streams:** Stream events for analytics and processing
- **Kinesis Data Firehose:** Deliver to S3, Redshift, Elasticsearch, HTTP endpoints

**Integration:**
- **API destinations:** HTTP endpoints with connection credentials and authorization (OAuth, API keys, Basic auth)
- **EventBridge API destinations rate limiting:** Built-in retry and rate limiting (1 to 500 requests/second per destination)
- **AppSync:** Trigger GraphQL mutations
- **CloudWatch Logs:** Send events to log groups for centralized logging

**Developer Tools:**
- **CodePipeline:** Trigger pipeline executions
- **CodeBuild:** Start build projects

**Target Input Transformation:**
Transform event before delivery using JSONPath:
```json
{
  "InputPathsMap": {
    "instance": "$.detail.instance-id",
    "state": "$.detail.state"
  },
  "InputTemplate": "{\"instance_id\": \"<instance>\", \"new_state\": \"<state>\"}"
}
```

### Schema Registry

**Purpose:** Centralized repository for discovering, validating, and versioning event schemas, enabling strongly-typed event contracts.

**Schema Discovery:**
- Automatically infers schemas from events flowing through event buses
- Detects schema changes and creates new versions
- Supports AWS service events and custom application events

**Code Bindings:**
- Generate code bindings in Java, Python, TypeScript for compile-time type safety
- Accelerates development by eliminating manual JSON parsing
- Download bindings directly from EventBridge console or CLI

**Version Management:**
- Semantic versioning (1.0, 1.1, 2.0) for schema evolution
- Compare schema versions to identify changes
- Reference specific schema versions in applications

**Schema Formats:**
- OpenAPI 3.0 schema format
- JSONSchema Draft 4 format
- Automatic conversion between formats

**Use Cases:**
- Contract-driven development between event producers and consumers
- Preventing breaking changes through schema validation
- Accelerating microservices integration

### Event Archive and Replay

**Archive Configuration:**
- **Purpose:** Store events indefinitely for compliance, audit, disaster recovery, or debugging
- **Retention:** Unlimited or specify days (1 to indefinite)
- **Filtering:** Archive all events or specific events matching pattern
- **Storage:** Events stored in S3 (managed by EventBridge, encrypted at rest)
- **Cost:** Storage charges based on S3 rates plus EventBridge archiving fees

**Event Replay:**
- **Purpose:** Reprocess historical events to recover from failures, test new code, or rebuild state
- **Time range:** Replay events from specific time window (start and end timestamps)
- **Target:** Replay to same or different event bus (production to dev/test environments)
- **Speed:** Events replayed at high speed (not original time intervals)
- **Use cases:**
  - Disaster recovery after downstream system failure
  - Testing new event processing logic against historical data
  - Rebuilding materialized views or aggregations
  - Debugging production issues in non-prod environments

**Real-World Scenario:**
After deploying buggy order processing Lambda, e-commerce platform loses 3 hours of order data. Team fixes bug, then replays archived events from 3-hour window to reprocess all orders correctly, recovering revenue without customer impact.

### EventBridge Pipes

**Overview:** Point-to-point integrations between single source and single target with advanced filtering, transformation, and enrichment.

**Supported Sources:**
- Amazon SQS (including DLQs)
- Amazon Kinesis streams
- Amazon DynamoDB streams
- Amazon MSK (Kafka)
- Amazon MQ (ActiveMQ, RabbitMQ)

**Processing Steps:**
1. **Filtering:** Discard unwanted events using pattern matching
2. **Enrichment:** Call API (Lambda, API Gateway, Step Functions, API destinations) to add data
3. **Transformation:** Reshape payload using JSONPath and templates
4. **Delivery:** Send to target (EventBridge bus, Lambda, Step Functions, SQS, SNS, etc.)

**Benefits vs Rules:**
- Single source to single target (optimized for point-to-point)
- Advanced enrichment capabilities (call external APIs mid-stream)
- Ordered processing for stream sources
- Automatic DLQ configuration for failures

### Real-World Scenarios

**Automated Security Response:**
GuardDuty publishes threat findings to default event bus. EventBridge rule matches high-severity findings and triggers Step Functions workflow to isolate compromised EC2 instance, snapshot volumes, notify security team via SNS, and create incident ticket via API destination to Jira.

**Cross-Account CI/CD Pipeline:**
Development account publishes custom event when code passes tests. EventBridge cross-account rule in production account receives event and triggers CodePipeline deployment, enabling centralized deployment orchestration across organization.

**SaaS Integration Without Code:**
Stripe (payment processor) publishes events to partner event bus when payments complete. EventBridge rule matches successful payment events and delivers to Lambda function that updates DynamoDB subscription table and SQS queue that triggers fulfillment workflow.

**Multi-Region Disaster Recovery:**
Primary region EventBridge rule forwards all critical application events to custom event bus in DR region. DR region maintains replicated state by processing forwarded events. During failover, DR region processes locally-generated events seamlessly.

### Best Practices

**Performance Optimization:**
- Use specific event patterns (avoid overly broad matching like matching all events from source)
- Leverage input transformers to reduce target payload size and processing time
- For high-volume patterns (>1000 events/second), consider SQS target for buffering before processing
- Use EventBridge Pipes for ordered stream processing instead of polling streams directly

**Reliability:**
- Configure DLQs (SQS queues) for all critical rules to capture failed deliveries
- Set retry policies appropriate for target type (24 hours for durable targets, shorter for time-sensitive)
- Implement idempotent targets to handle potential duplicate deliveries
- Monitor `FailedInvocations` and `ThrottledRules` CloudWatch metrics

**Architecture:**
- Use custom event buses to separate application domains and apply granular permissions
- Implement cross-account event delivery for multi-account organizations instead of VPC peering
- Archive critical event streams for compliance and disaster recovery (financial transactions, security events)
- Use schema registry for contract-driven development between teams

**Security:**
- Apply least-privilege permissions using event bus resource policies (control which accounts can publish)
- Encrypt sensitive events using AWS KMS (server-side encryption)
- Use VPC endpoints for private connectivity from VPC to EventBridge (avoid internet routing)
- Enable CloudTrail logging for PutEvents API calls for audit trail

**Cost Optimization:**
- Use content-based filtering in rules to reduce target invocations (each invocation charged separately)
- Consolidate similar patterns into single rule with multiple targets (reduces rule count)
- For development/testing, use shorter archive retention or disable archiving
- Monitor PutEvents usage and optimize publishing batch sizes (up to 10 events per request)

**AWS Documentation:**
- [Amazon EventBridge User Guide](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html)
- [EventBridge Event Patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
- [EventBridge Schema Registry](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schema-registry.html)
- [EventBridge Archive and Replay](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive-event.html)
- [EventBridge Pipes](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes.html)

## AWS Step Functions

AWS Step Functions is a serverless orchestration service that coordinates distributed applications and microservices using visual workflows. It manages state, retries, parallel execution, and error handling without infrastructure management.

### State Machine Types

**Standard Workflows:**
- **Duration:** Up to 1 year maximum execution time
- **Execution model:** Exactly-once execution guarantee with full execution history
- **Execution rate:** Up to 2,000 executions per second per account (soft limit, increasable)
- **State transition rate:** Up to 4,000 state transitions per second per account
- **Pricing:** Per state transition (charged even if execution fails mid-workflow)
- **Execution history:** Full history stored for 90 days, queryable via API and console
- **Use cases:**
  - Long-running business processes (loan approval, order fulfillment)
  - Orchestrating ETL pipelines and batch processing
  - Human-in-the-loop workflows requiring manual approvals
  - Complex multi-step workflows requiring audit trail

**Express Workflows:**
- **Duration:** Up to 5 minutes maximum execution time
- **Execution model:** At-least-once execution (may execute multiple times for same input)
- **Execution rate:** Up to 100,000 executions per second per account
- **State transition rate:** Nearly unlimited state transitions
- **Pricing:** Per number of executions and total duration (billed per 100ms, 66% cheaper than Standard at scale)
- **Execution history:** Optionally sent to CloudWatch Logs (not stored by Step Functions)
- **Sub-types:**
  - **Synchronous Express:** Returns response after completion (max 5 min), use for request-response patterns
  - **Asynchronous Express:** Returns immediately with execution ARN, use for fire-and-forget patterns
- **Use cases:**
  - High-volume event processing (IoT data ingestion, clickstream processing)
  - Real-time stream processing transformations
  - Mobile/web backend API orchestration
  - Microservices coordination with sub-second latency requirements

### State Types

**Task State:**
- Executes single unit of work by calling AWS service, Lambda function, or activity
- Supports 200+ AWS SDK service integrations and 11 optimized integrations
- Can configure timeout, heartbeat, retry, and catch logic
- Passes input to task and receives output

**Choice State:**
- Conditional branching based on input values
- Supports string/numeric comparisons, boolean logic, timestamp comparisons
- Multiple condition branches with default fallback
- No actual work performed (no charges for Choice state)

**Parallel State:**
- Executes multiple branches simultaneously
- Each branch is independent state machine sequence
- Waits for all branches to complete before proceeding
- Aggregates outputs from all branches into array
- Use for tasks that can run concurrently (multi-region deployment, parallel data processing)

**Map State:**
- Iterates over array items, running same steps for each item
- **Inline mode:** Processes items sequentially or with limited concurrency (up to 40 concurrent iterations)
- **Distributed mode:** Processes up to 10,000 items in parallel per execution, handles large-scale parallelization
- Accepts input from S3, DynamoDB, or inline JSON arrays
- Use for batch processing, fan-out workflows, mass notifications

**Wait State:**
- Delays workflow for specified time
- Supports absolute timestamp (ISO-8601 format: "2025-12-31T23:59:59Z")
- Supports relative seconds ("Seconds": 300 for 5-minute delay)
- Supports dynamic wait time from input path ("SecondsPath": "$.waitSeconds")
- No charges for Wait state duration

**Succeed/Fail States:**
- Terminal states that end execution
- Succeed: Marks execution as successful
- Fail: Marks execution as failed with error and cause
- Use to explicitly control execution outcomes

**Pass State:**
- Passes input to output without performing work
- Optionally transforms data using InputPath, OutputPath, ResultPath, Parameters
- Use for testing workflows, data transformation, injecting static values

### Error Handling

**Retry Configuration:**
- **Purpose:** Automatically retry failed states without manual intervention
- **Exponential backoff:** Each retry waits longer than previous (reduces load on failing service)
- **Configuration parameters:**
  - `ErrorEquals`: Array of error names to retry (e.g., `["States.TaskFailed", "States.Timeout"]`)
  - `IntervalSeconds`: Initial wait before first retry (default 1 second)
  - `MaxAttempts`: Maximum retry attempts (default 3, max 99)
  - `BackoffRate`: Multiplier for each retry interval (default 2.0, wait doubles each time)
  - `MaxDelaySeconds`: Maximum wait between retries (optional cap on exponential growth)
  - `JitterStrategy`: Add randomness to retry timing (FULL or NONE)

**Example Retry Configuration:**
```json
"Retry": [{
  "ErrorEquals": ["Lambda.ServiceException", "Lambda.TooManyRequestsException"],
  "IntervalSeconds": 2,
  "MaxAttempts": 6,
  "BackoffRate": 2.0
}]
```
This retries up to 6 times with intervals: 2s, 4s, 8s, 16s, 32s, 64s (total ~126 seconds).

**Predefined Error Codes:**
- `States.ALL`: Matches any error (catch-all, use as last retry)
- `States.Timeout`: Task exceeded TimeoutSeconds
- `States.TaskFailed`: Task execution failed
- `States.Permissions`: Insufficient IAM permissions
- `States.ResultPathMatchFailure`: ResultPath cannot be applied to input
- `States.BranchFailed`: Parallel or Map state branch failed
- `States.NoChoiceMatched`: No Choice condition matched and no default

**Catch Configuration:**
- **Purpose:** Handle errors after retries exhausted or errors not covered by retry
- **Fallback logic:** Transition to designated state for error recovery or graceful degradation
- **Configuration parameters:**
  - `ErrorEquals`: Array of error names to catch
  - `Next`: State to transition to when error caught
  - `ResultPath`: Where to store error information in input (default overwrites entire input)

**Example Catch with Error Details:**
```json
"Catch": [{
  "ErrorEquals": ["CustomErrorType"],
  "Next": "HandleCustomError",
  "ResultPath": "$.errorInfo"
}]
```
Error information (error, cause) stored at `$.errorInfo`, preserving original input for recovery logic.

**Error Handling Strategy:**
Define Retry before Catch (retry logic executes first, catch only if retries fail):
```json
"ProcessOrder": {
  "Type": "Task",
  "Resource": "arn:aws:lambda:...",
  "Retry": [{
    "ErrorEquals": ["States.TaskFailed"],
    "MaxAttempts": 3,
    "BackoffRate": 2.0
  }],
  "Catch": [{
    "ErrorEquals": ["States.ALL"],
    "Next": "SendFailureNotification"
  }]
}
```

### Integration Patterns

**Request-Response (Default):**
- Step Functions calls service and immediately waits for response
- Workflow proceeds after task returns result or throws error
- Use for fast tasks (Lambda functions under 15 minutes, synchronous API calls)

**Run a Job (.sync):**
- Step Functions waits for asynchronous job to complete before proceeding
- Supported services: AWS Batch, Amazon ECS, AWS Glue, SageMaker, Amazon EMR, AWS Glue DataBrew
- Example: `"Resource": "arn:aws:states:::batch:submitJob.sync"`
- Use for long-running jobs where workflow depends on completion

**Wait for Callback (.waitForTaskToken):**
- Step Functions generates task token and pauses execution
- External process must call `SendTaskSuccess` or `SendTaskFailure` with token to resume
- Timeout configurable (up to 1 year for Standard workflows)
- Use for human approvals, external system integration, asynchronous workflows

**Callback Pattern Example:**
```json
"WaitForApproval": {
  "Type": "Task",
  "Resource": "arn:aws:states:::sns:publish.waitForTaskToken",
  "Parameters": {
    "TopicArn": "arn:aws:sns:...",
    "Message": {
      "TaskToken.$": "$$.Task.Token",
      "ApprovalRequest": "..."
    }
  },
  "TimeoutSeconds": 3600
}
```
SNS message includes task token; approval system calls SendTaskSuccess with token to continue workflow.

### Service Integrations

**Optimized Integrations (11 services):**
- **AWS Lambda:** Invoke functions (.sync and .waitForTaskToken)
- **AWS Batch:** Submit jobs with .sync for completion waiting
- **Amazon ECS/Fargate:** Run tasks synchronously or asynchronously
- **Amazon SNS:** Publish messages (.waitForTaskToken for callback)
- **Amazon SQS:** Send messages to queues
- **AWS Glue:** Start jobs and crawlers (.sync support)
- **SageMaker:** Train models, create endpoints (.sync for training completion)
- **Amazon EMR:** Create clusters, submit steps (.sync support)
- **Amazon DynamoDB:** GetItem, PutItem, UpdateItem, DeleteItem operations
- **Amazon Athena:** Start query execution (.sync for completion)
- **AWS CodeBuild:** Start builds (.sync support)

**AWS SDK Integrations (200+ services):**
- Call any AWS service API using format: `arn:aws:states:::aws-sdk:serviceName:apiAction`
- Example: `arn:aws:states:::aws-sdk:s3:putObject`
- Automatically uses execution role credentials
- Parameters map directly to service API parameters

**Activity Tasks:**
- Custom worker applications poll for tasks using `GetActivityTask` API
- Workers hosted anywhere (on-premises, EC2, containers, external)
- Send heartbeats to prevent timeout during long-running processing
- Use when work requires custom infrastructure not available in AWS services

### Real-World Scenarios

**Order Fulfillment Saga Pattern:**
E-commerce platform orchestrates distributed transaction across payment, inventory, and shipping services. Step Functions workflow: 1) Reserve inventory 2) Charge payment 3) Create shipment. If payment fails, Catch block triggers compensating transactions to release inventory reservation, maintaining data consistency without distributed database transactions.

**ETL Pipeline Orchestration:**
Data warehouse refresh workflow: 1) Distributed Map state processes 10,000 CSV files in S3 in parallel using Lambda 2) AWS Glue job (.sync) transforms data 3) Athena query (.sync) validates data quality 4) Choice state routes to success or failure notification. Workflow runs nightly via EventBridge schedule, completing in 45 minutes vs 6 hours with sequential processing.

**Machine Learning Pipeline:**
Model training workflow: 1) Glue job prepares training data 2) SageMaker training job (.sync) trains model for 12 hours 3) SageMaker batch transform processes validation dataset 4) Lambda evaluates model accuracy 5) Choice state: if accuracy > 95%, deploy to production endpoint; else, send notification for manual review. Callback pattern integrates data scientist approval for marginal accuracy.

**Multi-Region Deployment:**
Parallel state deploys application to 3 regions simultaneously. Each branch: 1) CodeBuild (.sync) builds container 2) ECS task deploys to region 3) Lambda validates health checks. If any region fails, Catch block rolls back all regions, ensuring consistent deployment state.

### Best Practices

**Workflow Design:**
- Use Express workflows for high-throughput scenarios (>100 executions/second) to reduce costs
- Use Standard workflows when execution history, exactly-once semantics, or >5 minute duration required
- Implement Distributed Map for processing large datasets (>1000 items) instead of Inline Map
- Break complex workflows into nested state machines (Step Functions can invoke other state machines)
- Use Choice states for conditional logic instead of Lambda functions (reduces latency and cost)

**Error Handling:**
- Always implement Retry with exponential backoff for transient errors (network issues, throttling)
- Define service-specific retries (Lambda.ServiceException, SageMaker.CapacityError) before catch-all
- Use Catch blocks to implement compensating transactions for distributed workflows
- Set appropriate TimeoutSeconds for tasks to prevent hung executions
- Log errors to CloudWatch for debugging (use ResultPath to preserve error context)

**Data Flow:**
- Use InputPath to select subset of input before state execution (reduces payload size)
- Use OutputPath to select subset of output to pass to next state
- Use ResultPath to combine task output with original input (prevents data loss during transformations)
- Use Parameters to construct custom input for tasks (add static values, reference context data)
- Keep state machine payload under 256 KB limit (use S3 references for large data)

**Performance:**
- Enable X-Ray tracing for distributed workflows to identify bottlenecks
- Use Parallel state to execute independent tasks concurrently
- Minimize cross-region service calls within workflows (increases latency)
- For high-frequency patterns, use Express Synchronous workflows behind API Gateway for <100ms p99 latency

**Security:**
- Apply least-privilege IAM roles to state machine executions (grant only required service permissions)
- Use resource-based policies on targets (Lambda, SNS) to allow Step Functions invocation
- Encrypt sensitive data in state machine input/output using KMS
- Use VPC endpoints for private connectivity to Step Functions API
- Enable CloudTrail logging for StartExecution API calls for audit trail

**Cost Optimization:**
- Use Express workflows for high-volume, short-duration tasks (up to 66% cheaper)
- Minimize state transitions in Standard workflows (charged per transition)
- Use Wait states instead of Lambda polling loops (no charges for Wait duration)
- Combine multiple AWS SDK calls in single Lambda function vs separate Task states (reduces transitions)

**AWS Documentation:**
- [AWS Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
- [Step Functions Standard vs Express Workflows](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html)
- [Step Functions Service Integrations](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html)
- [Step Functions Error Handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html)

## Amazon API Gateway

Amazon API Gateway is a fully managed service for creating, publishing, maintaining, monitoring, and securing APIs at any scale. It handles API request routing, rate limiting, authentication, and provides a unified entry point for backend services.

### API Types

**REST API:**
- **Features:** Complete API management with transformation, validation, caching, authorization, throttling
- **Endpoint types:**
  - Edge-optimized: CloudFront distribution for global low latency (default)
  - Regional: Deployed in specific region, use for same-region clients or custom CDN
  - Private: Accessible only via VPC endpoints (PrivateLink)
- **API keys and usage plans:** Rate limiting and quotas per customer/tier
- **Request/response transformation:** Modify payloads using Velocity Template Language (VTL)
- **OpenAPI support:** Import/export API definitions
- **Max timeout:** 29 seconds
- **Use cases:** Enterprise APIs requiring full feature set, monetized APIs, complex integration patterns

**HTTP API:**
- **Cost:** Up to 71% cheaper than REST API
- **Performance:** Lower latency (optimized for Lambda and HTTP backends)
- **Features:** Simplified configuration, automatic deployments, native OIDC/OAuth 2.0, CORS support
- **Limitations:** No caching, usage plans, API keys, request validation, or VTL transformations
- **JWT authorizers:** Built-in validation for JWT tokens from identity providers
- **Use cases:** Modern microservices APIs, serverless backends, cost-sensitive applications

**WebSocket API:**
- **Connection model:** Persistent bidirectional connections between clients and backend
- **Route selection:** Route messages based on content (message body field determines which Lambda to invoke)
- **Routes:** $connect, $disconnect, $default, and custom routes
- **Connection management:** Store connection IDs in DynamoDB to send messages to specific clients
- **Idle timeout:** 10 minutes default, configurable
- **Use cases:** Real-time chat applications, live dashboards, multiplayer gaming, collaborative editing

### Security

**Authentication:**
- **IAM:** AWS Signature Version 4 signing for AWS service-to-service calls (most secure)
- **Cognito User Pools:** Built-in integration for user authentication (REST and HTTP APIs)
- **Lambda authorizers (custom):** Execute Lambda function to validate tokens/credentials (REST and WebSocket)
- **JWT authorizers:** Validate JSON Web Tokens from OIDC/OAuth providers (HTTP API only)
- **API keys:** Client identification (not for security/authorization, only metering)

**Authorization:**
- **Resource policies:** Control which AWS accounts, IP ranges, VPCs can access API
- **CORS:** Cross-Origin Resource Sharing configuration for browser-based clients
- **Private APIs:** VPC endpoint access only, preventing public internet exposure
- **WAF integration:** Attach AWS WAF web ACLs for protection against attacks

### Performance

**Caching:**
- **Scope:** REST API only (not available in HTTP API)
- **TTL:** 0 to 3600 seconds (default 300 seconds)
- **Capacity:** 0.5 GB to 237 GB cache sizes
- **Encryption:** Cache data encrypted at rest
- **Invalidation:** Per-request header (`Cache-Control: max-age=0`) or flush entire cache
- **Cost savings:** Reduces backend invocations and improves latency

**Throttling:**
- **Account limits (REST API):** 10,000 requests per second, 5,000 burst (soft limits, increasable)
- **HTTP API limits:** 10,000 RPS steady-state, 6,000 burst (per account per region)
- **Method-level throttling:** Configure specific rate limits per API method
- **Usage plans:** Assign different rate limits to different API key tiers (bronze, silver, gold)
- **Response:** Returns HTTP 429 (Too Many Requests) when limits exceeded

### Integration Types

**Lambda Function Integration:**
- Lambda proxy: Pass request directly to Lambda, Lambda returns API Gateway response format
- Lambda custom: Transform request before Lambda, transform response after Lambda

**HTTP/HTTPS Integration:**
- HTTP proxy: Forward request to HTTP endpoint as-is
- HTTP custom: Transform request/response with VTL

**AWS Service Integration:**
- Direct integration with AWS services (S3, DynamoDB, Kinesis, Step Functions, SNS, SQS)
- No Lambda required, reduces latency and cost
- Example: API Gateway directly puts message to SQS queue

**Mock Integration:**
- Return static response without calling backend
- Use for API prototyping, testing, CORS preflight responses

**VPC Link:**
- Private integration with resources in VPC
- HTTP API: Network Load Balancer (NLB) targets
- REST API: NLB or Application Load Balancer (ALB) targets
- Enables hybrid architectures (API Gateway in AWS, backends on-premises via Direct Connect)

### Real-World Scenarios

**Serverless Microservices API:**
HTTP API fronts 20 Lambda functions implementing microservices. JWT authorizer validates Auth0 tokens. API Gateway routes requests based on path (/users, /orders, /products) to appropriate Lambda functions. 71% cost savings vs REST API, 50ms p99 latency.

**Legacy System Modernization:**
REST API with VPC Link integrates with on-premises SOAP service via NLB in VPC. Request transformation converts JSON to XML, response transformation converts XML to JSON. CloudFront edge-optimized endpoint provides global access. Enables mobile app access to legacy system without modernizing backend.

**Real-Time Bidding Platform:**
WebSocket API manages connections for auction participants. When seller creates auction, backend publishes updates via API Gateway Management API to all connected bidder connection IDs (stored in DynamoDB). Bidders submit bids via WebSocket, triggering Lambda to validate and broadcast highest bid. Handles 10,000 concurrent connections.

**Multi-Tenant SaaS API:**
REST API with usage plans and API keys enforces rate limits per customer tier. Free tier: 100 RPM, Premium tier: 1,000 RPM, Enterprise: 10,000 RPM. Cognito User Pools authenticate users. Resource policy restricts access to specific VPCs for enterprise customers. CloudWatch dashboards track per-customer API usage for billing.

### Best Practices

**API Type Selection:**
- Use HTTP API for new serverless applications (lower cost, simpler, sufficient features)
- Use REST API when requiring caching, usage plans, request validation, or complex transformations
- Use WebSocket API only for true bidirectional real-time communication
- Consider AppSync for GraphQL APIs with real-time subscriptions

**Performance:**
- Enable caching for GET requests with predictable responses (reference data, product catalogs)
- Use edge-optimized endpoints for geographically distributed clients
- Implement request validation to reject malformed requests before invoking backend
- Enable CloudWatch metrics and set alarms on 4XX/5XX errors and latency

**Security:**
- Never use API keys for authentication (only for usage tracking)
- Use Lambda authorizers for custom authentication logic with caching (5 minutes)
- Enable AWS WAF for APIs exposed to public internet
- Use private APIs for internal microservices (prevents internet exposure)
- Enable CloudTrail logging and X-Ray tracing for security audits

**Cost Optimization:**
- Use HTTP API instead of REST API when features suffice (71% savings)
- Enable caching to reduce backend invocations
- Use direct AWS service integrations instead of Lambda proxy (eliminates Lambda costs)
- Set appropriate throttling limits to prevent abuse and unexpected bills

**AWS Documentation:**
- [Amazon API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)
- [API Gateway HTTP vs REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [API Gateway WebSocket APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [API Gateway Security](https://docs.aws.amazon.com/apigateway/latest/developerguide/security.html)

## Amazon AppFlow

Amazon AppFlow is a fully managed integration service that enables secure data transfer between SaaS applications and AWS services without writing code. It handles connection credentials, data transformation, and error handling automatically.

### Supported Integrations

**Sources (90+ connectors):**
- **SaaS applications:** Salesforce, SAP, Zendesk, Slack, ServiceNow, Marketo, Google Analytics, Amplitude, Dynatrace, Infor Nexus, Singular, Trend Micro, Veeva
- **AWS services:** S3 (as source and destination)
- **Custom connectors:** Build private connectors using AppFlow Custom Connector SDK (Python/Java) for proprietary systems

**Destinations:**
- **AWS services:** Amazon S3, Amazon Redshift, Amazon Lookout for Metrics, Amazon EventBridge, Amazon Honeycode (deprecated)
- **SaaS applications:** Salesforce (bidirectional), Marketo, Zendesk, Slack, Snowflake, Upsolver
- **Analytics platforms:** Customer Profiles, Amazon Connect

### Flow Configuration

**Trigger Types:**
- **On-demand:** Manual execution via console, CLI, or API (use for ad-hoc data exports)
- **Schedule:** Recurring transfers from every 1 minute to daily/weekly/monthly (use for batch sync)
- **Event-driven:** Real-time transfers triggered by object creation/update in source system (Salesforce platform events, change data capture, or S3 events)

**Data Transformation Capabilities:**
- **Field mapping:** Map source fields to destination fields (rename, reorder, select subset)
- **Field-level operations:**
  - Validation: Check data format, range, pattern matching
  - Masking: Obfuscate sensitive data (PII, credit cards) during transfer
  - Truncation: Limit string length to match destination schema
  - Concatenation: Combine multiple source fields
- **Filtering:** Include/exclude records based on field values (WHERE clause equivalent)
- **Aggregation:** Combine data from multiple runs (append or upsert mode)
- **Partitioning:** Organize S3 destination data by time or custom fields for query optimization
- **AWS Glue Data Catalog integration:** Automatically catalog transferred data for Athena/Redshift Spectrum queries

### Security

**Encryption:**
- Data encrypted in transit using TLS 1.2+
- Data encrypted at rest in AWS services (S3, Redshift) using AWS KMS
- Field-level encryption for extra-sensitive data using KMS keys

**Private Connectivity:**
- AWS PrivateLink support for Salesforce, Zendesk, ServiceNow, Slack
- Data flows over AWS private network, never traverses public internet
- Reduces exposure to network-based attacks

**Access Control:**
- IAM roles control AppFlow permissions to AWS services
- Supports customer-managed KMS keys for encryption (bring your own key)
- CloudTrail logging for all API calls and flow executions
- Data residency compliance (data doesn't leave specified AWS regions)

**Connection Management:**
- OAuth 2.0 for SaaS application authentication
- Credentials encrypted and stored securely (AWS Secrets Manager)
- Connection validation and automatic credential refresh

### Real-World Scenarios

**Salesforce to S3 Data Lake:**
Marketing team runs scheduled flow every 15 minutes to transfer new Salesforce leads to S3. AppFlow filters leads by region (US only), masks email addresses for GDPR compliance, partitions data by creation date. AWS Glue catalogs data; Athena queries generate daily lead reports. Eliminates custom ETL code and Salesforce API limit concerns.

**Real-Time Customer 360:**
Event-driven flow captures Salesforce account updates and sends to EventBridge. EventBridge rule triggers Lambda to update DynamoDB customer profile table and send SNS notification to CRM team. Customer service agents see account changes in real-time (sub-60 second latency) without polling Salesforce API.

**Bidirectional Sync:**
E-commerce platform syncs order data bidirectionally between Salesforce and custom database. AppFlow scheduled flow (every 5 minutes) pulls new orders from Salesforce to S3, triggers Lambda to update RDS. Reverse flow pulls RDS fulfillment status updates, pushes back to Salesforce opportunity records. Maintains consistency across systems without custom integration code.

**Multi-Source Analytics:**
AppFlow aggregates data from Zendesk (support tickets), Marketo (marketing campaigns), and Google Analytics (web traffic) into single S3 bucket. Separate flows run daily, applying consistent transformations (date formats, field names). AWS Glue crawls S3, enables unified Athena queries across all sources for executive dashboard.

### Best Practices

**Performance:**
- Use incremental transfers (transfer only new/changed records) instead of full snapshots to reduce volume and cost
- For large datasets (>100 GB), split into multiple flows or use scheduled flows during off-peak hours
- Enable S3 partitioning to optimize downstream query performance (Athena, Redshift Spectrum)
- Monitor flow run duration and adjust schedule frequency if transfers consistently time out

**Data Quality:**
- Implement data validation transformations to catch malformed data before destination writes
- Use filtering to exclude test/invalid records from production data pipelines
- Configure error handling to send failed records to separate S3 prefix for debugging
- Validate destination schema compatibility before enabling flows

**Security:**
- Use AWS PrivateLink for SaaS connectors when available (prevents data exposure to internet)
- Enable field-level encryption for PII and sensitive data fields
- Apply least-privilege IAM policies (restrict flows to specific S3 buckets and KMS keys)
- Rotate SaaS application credentials regularly via connection settings
- Use VPC endpoints for AppFlow API calls from private subnets

**Monitoring and Maintenance:**
- Configure CloudWatch alarms on FlowExecutionsFailed metric for immediate notification
- Monitor FlowExecutionRecordsProcessed to detect sudden volume changes (data quality issues)
- Enable CloudTrail logging for audit trail of flow configuration changes
- Review flow execution history regularly to identify retry patterns
- Set up EventBridge rules to trigger notifications on flow status changes

**Cost Optimization:**
- Use event-driven flows instead of high-frequency scheduled flows when real-time sync required
- Consolidate multiple small flows into larger, less frequent flows when latency permits
- Apply filtering early in transformation pipeline to reduce processed record count
- Use S3 Intelligent-Tiering for destination buckets containing historical flow data

**AWS Documentation:**
- [Amazon AppFlow User Guide](https://docs.aws.amazon.com/appflow/latest/userguide/what-is-appflow.html)
- [AppFlow Supported Connectors](https://docs.aws.amazon.com/appflow/latest/userguide/app-specific.html)
- [AppFlow Custom Connectors](https://docs.aws.amazon.com/appflow/latest/userguide/custom-connector.html)
- [AppFlow Data Transformation](https://docs.aws.amazon.com/appflow/latest/userguide/transform-data.html)

## Integration Patterns

Integration patterns solve common architectural challenges in distributed systems. Understanding when to apply each pattern is critical for SAP-C02.

### Decoupling Pattern

**Problem:** Tight coupling between components causes cascading failures. When upstream service experiences high load or downtime, downstream services fail or become unresponsive.

**Solution:** Insert message queue (SQS) or pub/sub topic (SNS) between components.

**Implementation:**
- Producer publishes messages to queue/topic without waiting for processing
- Consumer processes messages at its own pace, polling queue or receiving from topic
- Each component scales independently based on workload
- Failed messages handled via DLQ for debugging

**Example:**
Order processing service publishes orders to SQS queue. Fulfillment service consumes from queue at sustainable rate (1,000 orders/hour). During Black Friday, queue absorbs 50,000 orders/hour spike; fulfillment processes backlog over 48 hours without system failure.

**Benefits:** Fault isolation, independent scaling, load smoothing, improved availability

### Fan-Out Pattern

**Problem:** Multiple downstream systems need to process same data with different logic and latency requirements.

**Solution:** SNS topic with multiple SQS queue subscriptions (SNS fan-out to SQS).

**Implementation:**
- Single SNS topic receives published events
- Multiple SQS queues subscribe to topic
- Each queue receives copy of every message
- Consumers process independently from their queues
- Subscription filter policies reduce unnecessary deliveries

**Example:**
Order creation publishes to SNS topic. Queue 1 (fulfillment) processes in 1 hour. Queue 2 (analytics) batches for nightly warehouse load. Queue 3 (email) sends immediate confirmation. Queue 4 (fraud detection) analyzes in real-time. One publish, four independent processing paths.

**Benefits:** Parallel processing, isolation (one consumer failure doesn't affect others), heterogeneous consumers, easy to add/remove subscribers

### Saga Pattern (Distributed Transactions)

**Problem:** Maintaining data consistency across multiple microservices without distributed database transactions (eventual consistency challenge).

**Solution:** Use Step Functions to orchestrate compensating transactions for each step that might fail.

**Implementation:**
- Define workflow with sequence of service calls
- Each service performs local transaction
- If step fails, Catch block triggers compensating transactions
- Compensating transactions undo completed steps in reverse order
- Final state is consistent (all succeeded or all rolled back)

**Example:**
Trip booking workflow: 1) Reserve flight 2) Reserve hotel 3) Charge payment. If payment fails, Step Functions Catch triggers: 1) Cancel hotel reservation 2) Cancel flight reservation. System maintains consistency without cross-service transactions.

**Benefits:** Eventual consistency without distributed locks, clear compensation logic, audit trail of all state changes

### Event Sourcing Pattern

**Problem:** Need to track complete history of state changes, support audit requirements, enable temporal queries (state at specific time), and replay events for disaster recovery.

**Solution:** EventBridge with Event Archive stores all state-changing events.

**Implementation:**
- All state changes published as events to EventBridge
- Event Archive stores events indefinitely
- Current state derived by replaying events from beginning
- Replay feature reconstructs state at any point in time
- Multiple consumers build different materialized views from same event stream

**Example:**
Banking system publishes account transactions as events. Event Archive stores complete history. Balance calculated by replaying all transactions. Compliance team queries historical balance at month-end for any account. After bug in interest calculation, fix deployed and replay recalculates correct balances.

**Benefits:** Complete audit trail, temporal queries, rebuild state after corruption, multiple read models from single event stream

### Choreography vs. Orchestration

**Choreography (EventBridge):**
- **Model:** Services react to events published by other services; no central coordinator
- **Communication:** Event-driven, publish-subscribe
- **Coupling:** Loose (services don't know about each other, only events)
- **Workflow visibility:** Distributed across services, harder to understand complete flow
- **Failure handling:** Each service handles its own failures independently
- **Use cases:** Complex workflows with many optional branches, systems requiring maximum loose coupling

**Example:** E-commerce order placed event published to EventBridge. Multiple services independently subscribe: inventory service reserves stock, payment service charges card, email service sends confirmation, analytics service logs event. No service knows about others.

**Orchestration (Step Functions):**
- **Model:** Central coordinator explicitly defines workflow and calls services in sequence
- **Communication:** Direct service invocations from orchestrator
- **Coupling:** Tighter (orchestrator knows about all services in workflow)
- **Workflow visibility:** Single state machine definition shows complete flow
- **Failure handling:** Centralized retry and error handling logic
- **Use cases:** Sequential processes with clear dependencies, workflows requiring guaranteed order, human-in-the-loop approvals

**Example:** Order fulfillment Step Functions workflow: 1) Call inventory service to reserve 2) Call payment service to charge 3) Call shipping service to create label 4) Call notification service to email customer. Each step waits for previous to complete.

**Comparison:**

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| Coordination | Distributed | Centralized |
| Service awareness | Services know events | Orchestrator knows services |
| Workflow changes | Modify multiple services | Modify orchestrator only |
| Monitoring | Distributed tracing required | Single state machine view |
| Complexity growth | Better for complex branching | Better for sequential flows |

### Request-Response vs. Asynchronous

**Request-Response (API Gateway):**
- **Model:** Client waits for immediate response before proceeding
- **Communication:** Synchronous, blocking
- **Coupling:** Higher (client depends on service availability)
- **Latency:** Directly experienced by end user
- **Use cases:** User-facing APIs, queries requiring immediate data, atomic operations
- **Timeout handling:** Client must handle timeout and retry

**Example:** Mobile app calls API Gateway /login endpoint, waits for JWT token before allowing app access. User cannot proceed until response received.

**Asynchronous (SQS/SNS/EventBridge):**
- **Model:** Producer submits work and continues; result delivered later or not at all
- **Communication:** Asynchronous, non-blocking
- **Coupling:** Lower (producer doesn't depend on consumer availability)
- **Scalability:** Better (absorbs traffic spikes, smooths load)
- **Use cases:** Batch processing, background jobs, event distribution, non-critical notifications
- **Reliability:** Higher (queues persist messages during consumer outages)

**Example:** User uploads profile photo. API returns 202 Accepted immediately, publishes message to SQS. Background worker processes image (resize, compress, virus scan) over next minute. User sees "processing" status in app.

**Pattern Selection Guide:**

| Requirement | Pattern |
|-------------|---------|
| User needs immediate response | Request-Response |
| Processing takes >29 seconds | Asynchronous (API Gateway max timeout) |
| User needs confirmation only | Asynchronous (return 202 Accepted) |
| Downstream service may be unavailable | Asynchronous (queue buffers work) |
| Traffic highly variable | Asynchronous (queue smooths spikes) |
| Strong consistency required | Request-Response |
| Eventual consistency acceptable | Asynchronous |

## Service Comparison

Understanding when to use each integration service is critical for SAP-C02 exam scenarios.

| Feature | SQS | SNS | EventBridge | Step Functions |
|---------|-----|-----|-------------|----------------|
| **Pattern** | Point-to-point queue | Pub/sub messaging | Event bus routing | Workflow orchestration |
| **Communication** | Pull (consumer polls) | Push (to subscribers) | Push (pattern-based) | Coordinated invocations |
| **Ordering** | FIFO queues (strict) | FIFO topics (strict) | No guarantee | Sequential by default |
| **Filtering** | Consumer-side logic | Message attributes | Content-based patterns | Choice state conditions |
| **Retention** | Up to 14 days | No retention (immediate) | 24 hours (archive indefinite) | N/A (execution history) |
| **Throughput** | Unlimited (standard) | Unlimited (standard) | Unlimited | 2,000-100,000 executions/sec |
| **Message size** | 256 KB | 256 KB | 256 KB | 256 KB (state payload) |
| **Delivery guarantee** | At-least-once (FIFO: exactly-once) | At-least-once | At-least-once | Exactly-once (Standard) |
| **Targets/Consumers** | One consumer per message | Multiple subscribers | Multiple targets (5 per rule) | Multiple integrated services |
| **Primary use case** | Decoupling, work queues | Fan-out, notifications | Event-driven architecture | Multi-step workflows |
| **Pricing model** | Per request | Per publish + delivery | Per event published | Per state transition or execution |

**Service Selection Matrix:**

| Scenario | Recommended Service | Rationale |
|----------|-------------------|-----------|
| Decouple microservices with guaranteed delivery | SQS | Queue persistence ensures no message loss during consumer outages |
| Send notification to multiple systems | SNS | Pub/sub model delivers to all subscribers simultaneously |
| React to AWS service events | EventBridge | Native integration with 90+ AWS services |
| Filter events before processing | EventBridge | Content-based filtering reduces unnecessary processing |
| Multi-step workflow with error handling | Step Functions | Built-in retry, catch, and state management |
| Human approval in automated process | Step Functions | Wait for callback pattern supports manual intervention |
| One-to-many message delivery with persistence | SNS + SQS fan-out | Combines pub/sub with queue durability |
| Order-dependent processing | SQS FIFO or Step Functions | FIFO for independent messages, Step Functions for orchestrated steps |
| Cross-account event routing | EventBridge | Built-in cross-account delivery with resource policies |
| High-volume event processing (>100K/sec) | Step Functions Express | Optimized for high throughput, low cost |

## Anti-Patterns

**SQS Anti-Patterns:**
- **Short polling in high-frequency loops:** Increases costs and empty responses. Use long polling (20 seconds) instead.
- **Processing without deleting messages:** Causes duplicate processing. Always delete successfully processed messages.
- **Missing DLQ configuration:** Failed messages disappear after maxReceiveCount. Always configure DLQ for production queues.
- **Using SQS for real-time bidirectional communication:** Wrong tool for sub-second latency. Use WebSocket API or AppSync instead.
- **Not implementing idempotency:** At-least-once delivery means duplicates possible. Design consumers to safely handle duplicate processing.
- **Single giant queue for all message types:** Prevents independent scaling and error isolation. Use separate queues per message type/workload.

**SNS Anti-Patterns:**
- **Using SNS with single subscriber:** Unnecessary overhead. Use SQS directly or invoke Lambda/target service.
- **Publishing messages larger than 256 KB:** Will fail. Store large payloads in S3, publish S3 reference.
- **Not enabling raw message delivery for SQS subscriptions:** SNS wraps message in metadata. Enable raw delivery to simplify consumer logic.
- **Relying on message order with standard topics:** No ordering guarantee. Use FIFO topic if order matters.
- **Using SNS for persistent message storage:** SNS doesn't retain messages. Use SQS for durability or EventBridge archive for retention.

**EventBridge Anti-Patterns:**
- **Implementing complex routing logic in Lambda:** EventBridge rules handle pattern matching more efficiently. Use content-based filtering instead of code.
- **Creating separate rule for each target when pattern identical:** Wastes rules quota. Use single rule with multiple targets (up to 5).
- **Not archiving critical events:** Lost events unrecoverable. Enable archive for compliance, audit, or replay scenarios.
- **Overly broad event patterns:** Triggers unnecessary target invocations and costs. Use specific patterns (source, detail-type, detail fields).
- **Putting business logic in event transformation:** Transformations limited to JSONPath. Use Lambda target for complex logic.
- **Using EventBridge for high-frequency same-source polling:** EventBridge for events, not polling. Use Kinesis or direct polling for streaming data.

**Step Functions Anti-Patterns:**
- **Using Standard workflows for high-volume, short-duration tasks:** Expensive per state transition. Use Express workflows (66% cheaper for high throughput).
- **Putting all logic in Lambda, using Step Functions just to chain:** Underutilizes orchestration features. Use Choice, Parallel, Map states for logic.
- **Not implementing error handling:** Failures terminate execution without recovery. Always add Retry and Catch to critical states.
- **Passing large payloads between states:** 256 KB limit easily exceeded. Store large data in S3, pass references through workflow.
- **Creating deeply nested workflows:** Hard to understand and debug. Break into smaller state machines, invoke as nested workflows.
- **Using Step Functions for simple Lambda chaining:** Overkill for 2-3 step workflows. Use direct Lambda invocations or EventBridge instead.

**API Gateway Anti-Patterns:**
- **Using REST API when HTTP API suffices:** Paying 71% more for unused features. Prefer HTTP API for simple Lambda proxies.
- **Using API keys for authentication:** Insecure (keys != credentials). Use IAM, Cognito, or Lambda authorizers for authentication.
- **Not enabling caching for GET requests with static data:** Unnecessary backend invocations. Enable caching for reference data, product catalogs.
- **Implementing all logic in API Gateway transformations:** VTL transformations complex and hard to debug. Use Lambda for complex logic.
- **Missing request validation:** Invalid requests reach backend, wasting compute. Enable request validation to fail fast.
- **Using WebSocket API for simple request-response:** Overhead of connection management unnecessary. Use HTTP API instead.

**AppFlow Anti-Patterns:**
- **Using high-frequency scheduled flows for real-time needs:** Schedule limited to 1 minute. Use event-driven flows for near real-time sync.
- **Not using incremental transfers:** Full snapshots wasteful. Enable incremental transfers to sync only new/changed records.
- **Ignoring field-level encryption for PII:** Compliance risk. Always encrypt sensitive fields during transfer.
- **Building custom ETL code when AppFlow connector available:** Reinventing wheel and maintenance burden. Leverage managed connectors for supported SaaS apps.

**General Integration Anti-Patterns:**
- **Tight coupling with synchronous calls across services:** Cascading failures. Use asynchronous messaging for resilience.
- **Not implementing circuit breakers for external dependencies:** Failed dependencies exhaust resources. Use Step Functions timeouts or Lambda circuit breaker libraries.
- **Missing observability (logs, metrics, traces):** Debugging distributed systems impossible without visibility. Enable CloudWatch logs, metrics, and X-Ray tracing.
- **Building custom integration code instead of using managed services:** High maintenance, reinventing features. Leverage SQS, SNS, EventBridge, AppFlow first.

**AWS Documentation:**
- [AWS Integration Services Overview](https://aws.amazon.com/products/application-integration/)
- [Serverless Patterns Collection](https://serverlessland.com/patterns)
- [AWS Well-Architected Framework - Integration Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Event-Driven Architecture on AWS](https://aws.amazon.com/event-driven-architecture/)
