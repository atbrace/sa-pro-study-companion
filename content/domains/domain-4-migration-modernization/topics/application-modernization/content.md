---
title: Application Modernization Strategies
lastUpdated: 2026-01-06
---

# Application Modernization Strategies

Application modernization transforms legacy monolithic applications into cloud-native architectures using containers, serverless, microservices, and managed services. This topic covers the critical patterns and services required for the SAP-C02 exam.

## Modernization Approaches

### The 6 R's (Revisited for Modernization)

While migration uses the 6 R's (Rehost, Replatform, Refactor, Repurchase, Retire, Retain), modernization specifically focuses on transformation strategies that improve application architecture, performance, and operational efficiency:

- **Replatform (Lift-Tinker-and-Shift)** - Make targeted cloud optimizations without changing core architecture. Examples include migrating databases to Amazon RDS or Aurora, containerizing applications with minimal code changes, or moving from self-managed message queues to Amazon SQS. This approach typically delivers 20-30% operational cost savings with low risk.

- **Refactor/Re-architect** - Fundamentally redesign applications to leverage cloud-native capabilities. This includes breaking monoliths into microservices, transitioning to serverless event-driven architectures, implementing API-first designs, or adopting managed services for specific capabilities. While requiring more investment, this approach can deliver 40-60% cost savings and dramatic improvements in scalability and agility.

- **Replace (Repurchase)** - Abandon custom-built solutions in favor of SaaS offerings or AWS managed services. Examples include replacing custom CRM with Salesforce, replacing self-built analytics with Amazon QuickSight, or replacing custom workflow engines with AWS Step Functions. This reduces operational overhead and maintenance burden.

**Decision Criteria:** The right approach depends on business objectives, technical debt, time constraints, team capabilities, and ROI targets. Most large-scale modernizations use a combination of all three strategies across different application components.

**AWS Documentation:**
- [Application Modernization Guide](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-modernizing-applications/)
- [Migration Strategies](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-strategies/)

## Strangler Fig Pattern

The strangler fig pattern, named after a tropical tree that grows around a host tree and eventually replaces it, enables incremental modernization by gradually replacing monolith functionality with new services. This pattern is the most widely recommended approach for large-scale application modernization because it minimizes risk, maintains business continuity, and allows teams to learn and adapt during the transformation.

### Implementation Strategy

```
┌────────────────────────────────────────┐
│         API Gateway / ALB              │
│         (Routing Layer)                │
└─────────┬──────────────┬───────────────┘
          │              │
    ┌─────▼─────┐   ┌───▼──────────┐
    │  New      │   │   Legacy     │
    │Microservice│   │  Monolith    │
    │ (Lambda)  │   │   (EC2)      │
    └───────────┘   └──────────────┘
```

**Key Principles:**

1. **Route new features** to new microservices - Build all new capabilities as separate services rather than extending the monolith
2. **Incrementally migrate** existing features - Extract one bounded context at a time, starting with the least coupled components
3. **Share data** via APIs or event streams - Use EventBridge, SNS, or API calls rather than direct database access
4. **Maintain dual write** during transition - Update both old and new systems temporarily until migration is complete
5. **Decomission** monolith components gradually - Remove code from the monolith only after verifying the new service works correctly

### Real-World Implementation Scenarios

**Scenario 1: E-commerce Order Processing**
An e-commerce company extracts order management from a monolithic application:

- **Phase 1:** Deploy API Gateway to route `/orders/*` requests. Initially, all traffic goes to the monolith ALB.
- **Phase 2:** Build new Order Service (Lambda + DynamoDB). Route `/orders/v2/*` to the new service while `/orders/v1/*` remains on the monolith.
- **Phase 3:** Implement dual-write pattern where both systems record new orders. Sync historical data from monolith database to DynamoDB.
- **Phase 4:** Gradually shift traffic using API Gateway weighted routing (10%, 25%, 50%, 100%).
- **Phase 5:** Retire monolith order code and database tables after validation period.

**Implementation with API Gateway:**

```yaml
# Path-based routing
/api/v2/orders -> Lambda (new microservice)
/api/v1/orders -> ALB target group (legacy monolith)

# Header-based routing for A/B testing
X-API-Version: 2 -> Lambda
X-API-Version: 1 -> ALB

# Weighted routing for gradual cutover
Lambda weight: 75%
ALB weight: 25%

# Geography-based routing
US-East regions -> Lambda
All other regions -> ALB (rollback capability)
```

### Anti-Corruption Layer

An anti-corruption layer (ACL) creates an abstraction between legacy and modern systems to prevent legacy constraints from contaminating new architecture. This pattern is critical when the monolith uses outdated data models, inconsistent APIs, or complex domain logic.

**ACL Responsibilities:**

- **Translate** legacy data formats - Convert XML/SOAP to JSON/REST, map legacy database schemas to modern domain models
- **Adapt** interfaces - Provide clean APIs that hide legacy complexity from new services
- **Isolate** domain models - Prevent legacy terminology and concepts from leaking into new microservices
- **Event mapping** between systems - Transform legacy events into domain events that align with new bounded contexts

**Example Implementation:**
```python
# Anti-corruption layer for legacy customer service
class CustomerACL:
    def __init__(self, legacy_service, modern_event_bus):
        self.legacy = legacy_service
        self.events = modern_event_bus

    def get_customer(self, customer_id):
        # Call legacy SOAP service
        legacy_data = self.legacy.GetCustomerDetails(customer_id)

        # Translate to modern domain model
        customer = {
            'id': legacy_data['CUST_NUM'],
            'email': legacy_data['EMAIL_ADDR'],
            'name': f"{legacy_data['FNAME']} {legacy_data['LNAME']}",
            'status': 'active' if legacy_data['STATUS'] == 'A' else 'inactive'
        }
        return customer

    def create_customer(self, customer_data):
        # Translate modern model to legacy format
        legacy_request = self._translate_to_legacy(customer_data)

        # Call legacy service
        result = self.legacy.CreateCustomer(legacy_request)

        # Publish domain event for new services
        self.events.put_events(
            Entries=[{
                'Source': 'customer.service',
                'DetailType': 'CustomerCreated',
                'Detail': json.dumps(customer_data)
            }]
        )
        return result
```

**AWS Documentation:**
- [Strangler Fig Pattern Implementation](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-aspnet-web-services/fig-pattern.html)
- [Anti-Corruption Layer Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/acl-pattern.html)

## Breaking the Monolith

### Decomposition Strategies

**1. Domain-Driven Design (DDD)**

Identify bounded contexts:
- **User Management** -> User Service
- **Order Processing** -> Order Service
- **Inventory** -> Inventory Service
- **Payment** -> Payment Service

**2. Database Decomposition**

```
Monolithic DB                Microservices DBs
┌──────────────┐            ┌────────┐ ┌─────────┐
│              │            │ Users  │ │ Orders  │
│  All Tables  │     ->     │  DB    │ │   DB    │
│              │            └────────┘ └─────────┘
└──────────────┘            ┌─────────┐ ┌─────────┐
                            │Inventory│ │ Payment │
                            │   DB    │ │   DB    │
                            └─────────┘ └─────────┘
```

**Challenges:**
- Distributed transactions (use Saga pattern)
- Data consistency (eventual consistency)
- Cross-service queries (CQRS, data replication)

**3. Service Boundaries**

- **Single Responsibility** - One business capability
- **Loose Coupling** - Independent deployments
- **High Cohesion** - Related functionality together
- **API-First** - Well-defined contracts

### Communication Patterns

Microservices must communicate effectively while maintaining loose coupling. AWS provides multiple patterns for both synchronous and asynchronous communication.

**Synchronous Communication (Request-Response):**

- **API Gateway + Lambda** - Ideal for external-facing REST/HTTP APIs with built-in authentication, throttling, and monitoring
- **ALB + ECS/EKS** - Best for internal microservices requiring HTTP/2, gRPC, or WebSocket support
- **AWS App Mesh** - Service mesh for advanced service-to-service communication with mTLS, traffic routing, and observability
- **VPC PrivateLink** - Private connectivity between services across VPCs or accounts without internet exposure

**When to use synchronous:** Real-time queries, user-facing APIs, operations requiring immediate responses or validation.

**Asynchronous Communication (Event-Driven):**

- **Amazon EventBridge** - Centralized event bus for application events with schema registry, filtering, and cross-account delivery. Supports 100+ AWS service sources and SaaS integrations.
- **Amazon SNS** - Pub/sub messaging for fan-out patterns. One message to multiple subscribers (Lambda, SQS, HTTP endpoints, email, SMS).
- **Amazon SQS** - Reliable queuing for decoupling producers and consumers. Standard queues for throughput, FIFO queues for ordering guarantees.
- **Amazon Kinesis Data Streams** - Real-time data streaming for high-throughput event ingestion and processing with ordered replay capability.

**When to use asynchronous:** Background processing, eventual consistency scenarios, high-volume event processing, resilience to downstream failures.

**Hybrid Pattern Example:**
```
User Request -> API Gateway (sync) -> Order Lambda -> EventBridge (async) -> [Payment, Inventory, Notification] Lambdas
```

**AWS Documentation:**
- [Microservices on AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/microservices-on-aws.html)
- [Event-Driven Architecture Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-integrating-microservices/event-driven-architecture.html)
- [Choosing Communication Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-integrating-microservices/service-communication-patterns.html)

## Containerization with ECS/EKS

Containerization is often the first step in application modernization, providing portability, consistency across environments, and operational efficiency. AWS offers two primary managed container orchestration services: Amazon ECS (AWS-native) and Amazon EKS (Kubernetes-based).

### Amazon ECS (Elastic Container Service)

Amazon ECS is a fully managed container orchestration service that removes the complexity of operating your own cluster management infrastructure. It's deeply integrated with AWS services and offers simplified operations for teams not requiring Kubernetes.

**Architecture Options:**

```
ECS Cluster
├── EC2 Launch Type (you manage hosts)
│   ├── Auto Scaling Group
│   ├── ECS Agent
│   ├── Task placement strategies
│   ├── Full control over instance types
│   └── Reserved Instances for cost optimization
└── Fargate Launch Type (serverless containers)
    ├── No infrastructure management
    ├── Per-task vCPU/memory pricing
    ├── Automatic scaling and patching
    └── Faster deployment (no instance provisioning)
```

**Launch Type Selection Criteria:**

| Consideration | EC2 Launch Type | Fargate Launch Type |
|--------------|-----------------|---------------------|
| **Best For** | Long-running services, predictable workloads, GPU/Inference Accelerators | Burst workloads, batch jobs, development environments |
| **Cost Model** | EC2 instance hours (can use RIs/Savings Plans) | Per-task vCPU-hour and GB-hour |
| **Management** | You manage instances, patching, scaling | Fully managed, AWS handles infrastructure |
| **Startup Time** | Tasks start immediately on warm instances | 30-60 seconds for cold starts |
| **Flexibility** | Custom AMIs, advanced networking, volumes | Simplified configuration, limited customization |
| **Cost Efficiency** | More economical for steady-state workloads | Better for variable/intermittent workloads |

**Task Definitions - The Blueprint:**

A task definition is a JSON blueprint that describes how containers should run:

```json
{
  "family": "order-service",
  "taskRoleArn": "arn:aws:iam::123456789012:role/OrderServiceTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "order-api",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/order-service:v2.3",
    "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
    "environment": [{"name": "ENV", "value": "production"}],
    "secrets": [{
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-pass"
    }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/order-service",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    }
  }]
}
```

**Key Task Definition Elements:**
- **Container images (ECR)** - Store images in Amazon ECR for seamless integration, vulnerability scanning, and lifecycle policies
- **CPU/memory requirements** - Specify at both task and container levels; task-level sets Fargate pricing
- **Port mappings** - Use dynamic port mapping with ALB for multiple tasks per instance
- **Environment variables** - Use for non-sensitive configuration
- **Secrets integration** - Reference Secrets Manager or Parameter Store for credentials (encrypted in transit and at rest)
- **IAM task roles** - Grant containers least-privilege permissions to AWS services
- **Logging configuration** - Send logs to CloudWatch, Firehose, or third-party services
- **Health checks** - Define custom health checks beyond ALB target group health

**ECS Service Features:**

- **Load balancer integration** - ALB for HTTP/HTTPS, NLB for TCP/TLS/UDP, dynamic port mapping
- **Auto scaling** - Target tracking based on CPU, memory, ALB request count, or custom CloudWatch metrics
- **Service discovery (AWS Cloud Map)** - DNS-based or API-based service discovery for microservices communication
- **Deployment types:**
  - **Rolling update** - Replace tasks gradually with new version
  - **Blue/green (AWS CodeDeploy)** - Deploy to new environment, test, then switch traffic
- **Circuit breaker** - Automatically roll back failed deployments
- **Task placement strategies** - Control distribution across AZs, instances, or custom attributes

**Real-World Modernization Scenario:**

A financial services company containerizes their Java-based trading application:

1. **Initial state:** Monolithic Java app on EC2 with manual deployments
2. **Phase 1:** Containerize with Docker, push to ECR, deploy to ECS EC2 launch type (low-risk replatforming)
3. **Phase 2:** Break authentication into separate ECS service, implement API Gateway
4. **Phase 3:** Migrate to Fargate for simplified operations, enable auto-scaling
5. **Result:** 60% reduction in infrastructure management overhead, automated deployments via CodePipeline, improved resilience

**AWS Documentation:**
- [Amazon ECS Best Practices Guide](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [Choosing ECS Launch Type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html)
- [ECS Service Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)

### Amazon EKS (Elastic Kubernetes Service)

**When to Choose EKS:**
- Existing Kubernetes workloads
- Multi-cloud portability needed
- Complex orchestration requirements
- Large team with K8s expertise

**Key Integrations:**
- **Fargate for EKS** - Serverless pods
- **Load Balancer Controller** - ALB/NLB integration
- **EBS CSI Driver** - Persistent volumes
- **IAM Roles for Service Accounts (IRSA)** - Pod-level permissions
- **App Mesh** - Service mesh
- **Container Insights** - Monitoring

**Deployment Strategies:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      serviceAccountName: my-service-sa  # IRSA
      containers:
      - name: app
        image: 123456.dkr.ecr.us-east-1.amazonaws.com/my-app:v2
```

> 📚 [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)

### Container Migration Tools

**AWS App2Container (A2C):**

AWS App2Container is a command-line tool that helps lift and shift legacy ASP.NET and Java applications into containerized environments with minimal effort. It's particularly valuable for organizations with large portfolios of traditional applications that need rapid containerization.

**Key Capabilities:**
- **Inventory creation** - Automatically discovers all running ASP.NET (Windows) and Java (Linux) applications on servers
- **Dependency analysis** - Identifies cooperating processes, network ports, and runtime dependencies
- **Artifact extraction** - Extracts application artifacts and generates optimized Dockerfiles
- **Container build** - Creates OCI-compatible container images
- **AWS integration** - Generates CloudFormation templates for ECS, EKS, or App Runner deployments
- **CI/CD pipeline creation** - Optionally sets up CodePipeline for automated builds and deployments
- **No source code required** - Works with compiled applications and COTS software

**Supported Applications:**
- **Windows:** ASP.NET Framework (IIS-hosted)
- **Linux:** Java applications (Tomcat, JBoss, standalone JARs)

**Workflow Example:**
```bash
# 1. Discover applications on server
app2container inventory

# 2. Analyze specific application
app2container analyze --application-id java-app-12345

# 3. Containerize
app2container containerize --application-id java-app-12345

# 4. Generate deployment artifacts
app2container generate app-deployment --application-id java-app-12345

# 5. Deploy to ECS Fargate
app2container deploy --deploy-target ecs
```

**Real-World Use Case:**
A healthcare company used App2Container to modernize 47 legacy Java applications. The tool automated 80% of the containerization work, reducing what would have been 6 months of manual effort to 3 weeks. Applications were deployed to ECS Fargate with automatic CI/CD pipelines.

**Pricing:** App2Container itself is free; you only pay for underlying AWS services (ECR, ECS, EKS, S3).

**AWS Copilot:**

AWS Copilot is a command-line interface that simplifies building, releasing, and operating production-ready containerized applications on Amazon ECS and AWS Fargate. While App2Container focuses on legacy lift-and-shift, Copilot is designed for modern cloud-native development workflows.

**Key Features:**
- **Infrastructure as code** - Provisions VPCs, ALBs, ECS clusters using best-practice CloudFormation
- **Environment management** - Easily create and manage dev, test, and prod environments
- **Service types** - Supports Load Balanced Web Services, Backend Services, Workers, Scheduled Tasks
- **Simplified deployment** - `copilot deploy` handles building, pushing, and deploying containers
- **Observability** - Built-in integration with CloudWatch Logs, X-Ray, and Container Insights
- **Addons** - Easily provision RDS, DynamoDB, S3, and other resources alongside applications

**Example Workflow:**
```bash
# Initialize a new application
copilot app init my-app

# Create a load-balanced web service
copilot svc init --name api --svc-type "Load Balanced Web Service"

# Deploy to development environment
copilot deploy --env dev

# Create production environment with different configuration
copilot env init --name prod --profile prod-credentials

# Deploy to production
copilot deploy --env prod
```

**When to Use Which Tool:**
- **App2Container:** Legacy .NET/Java apps, minimal changes, rapid containerization at scale
- **Copilot:** New cloud-native development, modern workflows, multi-environment management

**AWS Documentation:**
- [AWS App2Container User Guide](https://docs.aws.amazon.com/app2container/latest/UserGuide/what-is-a2c.html)
- [App2Container Containerization Workflow](https://docs.aws.amazon.com/app2container/latest/UserGuide/containerize-your-app.html)
- [AWS Copilot CLI](https://aws.github.io/copilot-cli/)
- [Copilot Getting Started](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-aws-copilot-cli.html)

## Serverless Transformation

### Lambda-Based Architectures

**Modernization Patterns:**

**1. API Modernization**
```
Legacy API (EC2)  ->  API Gateway + Lambda
                      - Auto-scaling
                      - Pay per request
                      - No server management
```

**2. Event-Driven Processing**
```
Batch Job (Cron)  ->  EventBridge + Lambda
                      - Scheduled rules
                      - Event-driven triggers
                      - Parallel processing
```

**3. Stream Processing**
```
Queue Worker      ->  Lambda + SQS/Kinesis
                      - Automatic polling
                      - Batch processing
                      - Dead letter queues
```

### Lambda Best Practices

**Performance Optimization:**

- **Lambda SnapStart** - For Java 11+, Python 3.12+, and .NET 8+ runtimes, SnapStart can reduce cold starts to sub-second latency by taking snapshots of initialized function environments and reusing them. Best for latency-sensitive APIs and high-frequency invocations.
  - **How it works:** Lambda initializes the function, takes a Firecracker microVM snapshot of memory/disk state, encrypts and caches it, then resumes from snapshot for subsequent invocations
  - **Critical considerations:** Generate unique values (UUIDs, secrets) in the handler, not during initialization, as initialization state is replicated
  - **Cost:** Free for Java; Python and .NET incur caching and restoration charges
  - **Limitations:** Only works on published versions/aliases, cannot combine with Provisioned Concurrency, not available for container images

- **Provisioned Concurrency** - Pre-warm function instances to eliminate cold starts entirely. Use for ultra-latency-sensitive applications (sub-100ms requirements) or functions with heavy initialization. More expensive than SnapStart.

- **Cold start optimization techniques:**
  - Choose faster runtimes: Python, Node.js start faster than Java, .NET
  - Minimize deployment package size (use Lambda Layers for dependencies)
  - Remove unused dependencies and code
  - Use ARM64 (Graviton2) processors for better price-performance
  - Avoid VPC if not required (adds ENI attachment latency)

- **Right-size memory allocation** - Memory setting directly controls CPU allocation (1.769 GB = 1 vCPU). Monitor CloudWatch metrics to find optimal balance between cost and performance. Over-provisioning memory can reduce duration costs if execution time decreases proportionally.

**Architecture Best Practices:**

- **Single responsibility per function** - Each Lambda should do one thing well. Don't create monolithic "god functions" that handle multiple operations.
- **Use Lambda Layers** for shared dependencies (SDKs, libraries, utilities) to reduce package size and enable reuse across functions
- **Environment variables** for configuration that varies by environment (API endpoints, feature flags)
- **AWS Secrets Manager/Systems Manager Parameter Store** for credentials, API keys, database passwords with automatic rotation
- **Function versioning and aliases** - Use versions for immutable deployments, aliases for traffic shifting and blue/green deployments
- **Error handling** - Implement dead letter queues (DLQ) for failed asynchronous invocations, configure retry behavior

**Integration Patterns:**

- **API Gateway** for REST/HTTP APIs - Provides authentication, rate limiting, caching, request transformation
- **Application Load Balancer (ALB)** for HTTP/2, gRPC, multi-header values, and simpler HTTP routing without API Gateway overhead
- **EventBridge** for event routing - Centralized event bus with filtering, transformation, and cross-account delivery
- **Step Functions** for orchestration - Coordinate multiple Lambda functions with built-in error handling, retries, and visual workflows
- **Direct invocations from AWS services** - S3, DynamoDB Streams, Kinesis, SNS, SQS (100+ event sources)

**Real-World Serverless Migration Example:**

A media company migrated their video processing pipeline from EC2 to Lambda:
- **Before:** 20 EC2 instances running 24/7 processing uploaded videos (~$3,500/month)
- **After:** Lambda functions triggered by S3 uploads, using Step Functions to coordinate transcoding jobs
- **Result:** 70% cost reduction (~$1,000/month), zero idle capacity, automatic scaling to handle traffic spikes

**AWS Documentation:**
- [AWS Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Lambda Performance Optimization](https://docs.aws.amazon.com/lambda/latest/operatorguide/perf-optimize.html)
- [Serverless Applications Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)

### Step Functions for Orchestration

AWS Step Functions provides serverless orchestration for distributed applications, microservices, and data pipelines. It's essential for modernizing complex business processes that span multiple services and require coordination, error handling, and state management.

**Workflow Types:**

When creating a state machine, you must choose between Standard or Express workflows (this choice is immutable):

| Feature | Standard Workflows | Express Workflows |
|---------|-------------------|-------------------|
| **Max Duration** | 1 year | 5 minutes |
| **Execution Model** | Exactly-once | At-least-once (async) or At-most-once (sync) |
| **Best For** | Long-running, auditable workflows | High-volume event processing, streaming |
| **Pricing** | Per state transition | Per execution + duration + memory |
| **Execution History** | 90 days via API | CloudWatch Logs only |
| **Service Integrations** | All patterns (`.sync`, `.waitForTaskToken`) | Request-response only |
| **Use Cases** | EMR clusters, data pipelines, order processing | IoT data ingestion, microservice orchestration |

**Workflow Pattern Example - Order Processing:**

```json
{
  "Comment": "Order Processing Workflow with Compensation",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:validate-order",
      "Next": "ProcessPayment",
      "Catch": [{
        "ErrorEquals": ["ValidationError"],
        "ResultPath": "$.error",
        "Next": "NotifyValidationFailure"
      }]
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
      "Parameters": {
        "QueueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/payment-queue",
        "MessageBody": {
          "OrderId.$": "$.orderId",
          "Amount.$": "$.amount",
          "TaskToken.$": "$$.Task.Token"
        }
      },
      "Next": "ParallelProcessing",
      "Catch": [{
        "ErrorEquals": ["PaymentFailed"],
        "ResultPath": "$.error",
        "Next": "CompensateOrder"
      }]
    },
    "ParallelProcessing": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "UpdateInventory",
          "States": {
            "UpdateInventory": {
              "Type": "Task",
              "Resource": "arn:aws:states:::dynamodb:updateItem",
              "Parameters": {
                "TableName": "Inventory",
                "Key": {"ProductId": {"S.$": "$.productId"}},
                "UpdateExpression": "SET stock = stock - :qty",
                "ExpressionAttributeValues": {":qty": {"N.$": "$.quantity"}}
              },
              "End": true
            }
          }
        },
        {
          "StartAt": "SendConfirmation",
          "States": {
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "arn:aws:states:::sns:publish",
              "Parameters": {
                "TopicArn": "arn:aws:sns:us-east-1:123456789012:order-notifications",
                "Message.$": "$.confirmationMessage"
              },
              "End": true
            }
          }
        }
      ],
      "End": true
    },
    "CompensateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:rollback-order",
      "Next": "NotifyPaymentFailure"
    }
  }
}
```

**Key Features:**

- **Visual workflow designer** - Workflow Studio provides drag-and-drop interface for building state machines
- **Built-in error handling and retries** - Configure retry strategies, exponential backoff, and catch blocks without code
- **Long-running workflows** - Standard workflows can run up to 1 year (perfect for approval workflows, long-running ETL jobs)
- **Saga pattern for distributed transactions** - Implement compensating transactions to maintain consistency across microservices
- **Service integrations** - Direct integration with 200+ AWS services (Lambda, ECS, Batch, DynamoDB, SNS, SQS, EventBridge, Glue, SageMaker, etc.)
- **Wait states** - Pause workflows for hours, days, or until specific timestamps
- **Human approval** - Integrate with callback patterns for manual approval steps

**Real-World Modernization Scenario:**

An insurance company replaced their monolithic claims processing application with Step Functions:
- **Before:** Single Java application handling claims validation, fraud detection, payment processing, and notifications sequentially
- **After:** Step Functions orchestrates separate Lambda functions for each step, with parallel processing where possible
- **Benefits:**
  - Reduced processing time from 15 minutes to 3 minutes (parallelization)
  - Built-in retry logic eliminated custom error handling code
  - Visual workflow made process transparent to business stakeholders
  - Easy to add new steps (e.g., ML-based fraud detection) without refactoring

**AWS Documentation:**
- [AWS Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
- [Standard vs Express Workflows](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html)
- [Step Functions Service Integrations](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html)
- [Saga Pattern Implementation](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/saga-pattern.html)

### API Gateway Patterns

Amazon API Gateway is the front door for serverless APIs, providing authentication, throttling, monitoring, and transformation capabilities. Choosing the right API type is crucial for cost optimization and feature requirements.

**API Types Comparison:**

| Feature | REST API | HTTP API | WebSocket API |
|---------|----------|----------|---------------|
| **Cost** | Standard | 70% cheaper | Per connection + message |
| **Latency** | Standard | Lower latency | Real-time |
| **Endpoint Types** | Regional, Edge, Private | Regional only | Regional only |
| **Authorization** | IAM, Cognito, Lambda, API Keys | IAM, Cognito, JWT | IAM, Lambda |
| **Request Validation** | Yes | No | No |
| **Caching** | Yes | No | No |
| **Usage Plans & API Keys** | Yes | No | No |
| **AWS WAF Integration** | Yes | No | No |
| **Best For** | Feature-rich APIs, legacy integrations | Cost-sensitive, simple APIs | Chat, streaming, real-time |

**REST APIs:**
- **Regional endpoints** - Deployed in specific region, lowest latency for regional clients
- **Edge-optimized endpoints** - Deployed to CloudFront edge locations, best for geographically distributed clients
- **Private endpoints** - Accessible only from VPC via VPC endpoint (PrivateLink)
- **Request/response transformation** - Modify headers, query strings, body using VTL templates
- **API keys and usage plans** - Control access and throttling on per-client basis
- **Request validation** - Validate request parameters and body against JSON schema before invoking backend
- **Response caching** - Cache responses to reduce backend calls and improve latency

**HTTP APIs:**
- **70% cheaper than REST APIs** - Simplified feature set reduces cost
- **Lower latency** - Streamlined processing path
- **Native JWT authorization** - Built-in support for OIDC/OAuth 2.0 without Lambda authorizers
- **Automatic deployments** - Deploy changes automatically without manual stage promotion
- **CORS support** - Simplified CORS configuration
- **No caching or usage plans** - Trade features for cost and simplicity

**When to Choose HTTP APIs:**
- Building new microservices APIs
- Cost optimization is a priority
- Don't need request validation, API keys, or caching
- Using JWT/OIDC for authorization

**When to Choose REST APIs:**
- Require private endpoints (VPC-only access)
- Need request validation or transformation
- Require API keys and per-client throttling
- Need response caching
- AWS WAF integration required

**WebSocket APIs:**
- **Bidirectional communication** - Server can push messages to clients without polling
- **Connection management** - Persistent connections with automatic reconnection
- **Route selection** - Route messages based on content to different Lambda functions
- **Integration backends** - Lambda, HTTP endpoints, AWS services
- **Use cases:** Real-time chat, live dashboards, multiplayer games, collaborative editing

**Real-World Migration Example:**

A SaaS company migrated their monolithic REST API to API Gateway + Lambda:
- **Phase 1:** Create API Gateway REST API routing to existing monolith ALB
- **Phase 2:** Extract authentication service to Lambda, route `/auth/*` to Lambda while other routes go to monolith
- **Phase 3:** Gradually migrate endpoints to Lambda functions
- **Phase 4:** Migrate to HTTP APIs for 70% cost reduction on high-traffic endpoints
- **Result:** $8,000/month savings, improved scalability, zero maintenance of API infrastructure

**AWS Documentation:**
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)
- [Choosing Between HTTP and REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-known-issues.html)
- [WebSocket API Overview](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)

## Managed Service Adoption

### Database Modernization

**Relational:**
```
Oracle/SQL Server  ->  Amazon Aurora
                       - MySQL/PostgreSQL compatible
                       - Auto-scaling storage
                       - Read replicas
                       - Global databases
```

**NoSQL:**
```
MongoDB            ->  Amazon DocumentDB
Cassandra          ->  Amazon Keyspaces
Redis/Memcached    ->  Amazon ElastiCache
```

**Purpose-Built:**
- **DynamoDB** - Key-value, document
- **Neptune** - Graph database
- **Timestream** - Time-series
- **QLDB** - Ledger

> 📚 [Purpose-Built Databases](https://aws.amazon.com/products/databases/)

### Message Queues and Streaming

**Amazon SQS:**
- Decouple microservices
- Standard (at-least-once, best effort ordering)
- FIFO (exactly-once, strict ordering)
- Dead letter queues
- Visibility timeout

**Amazon SNS:**
- Pub/sub messaging
- Fan-out patterns
- Message filtering
- Mobile push notifications

**Amazon EventBridge:**
- Event bus for application events
- Schema registry
- Event replay
- Cross-account event delivery
- SaaS integration

**Amazon Kinesis:**
- Real-time data streaming
- Kinesis Data Streams (custom processing)
- Kinesis Data Firehose (delivery to S3, Redshift)
- Kinesis Data Analytics (SQL processing)

### AWS App Runner

AWS App Runner is a fully managed service that provides a fast, simple, and cost-effective way to deploy containerized web applications and APIs directly from source code or container images. It abstracts away infrastructure management while providing automatic scaling, load balancing, and observability.

**Key Value Proposition:**
App Runner sits between serverless (Lambda) and full container orchestration (ECS/EKS). It's ideal when you want container portability without Kubernetes complexity or ECS management overhead.

**Configuration Example:**

```yaml
service:
  name: my-web-app
  source:
    image: 123456.dkr.ecr.us-east-1.amazonaws.com/app:v1.2.3
    # OR from source code
    # code_repository:
    #   repository_url: https://github.com/myorg/myapp
    #   branch: main
    #   runtime: PYTHON_3
  instance:
    cpu: 1 vCPU
    memory: 2 GB
  auto_scaling:
    min_size: 1
    max_size: 10
    max_concurrency: 100  # Requests per instance
  health_check:
    protocol: HTTP
    path: /health
    interval: 10
```

**Key Features:**

- **Automatic deployments** - Deploys automatically when you push to ECR or Git repository
- **Built-in CI/CD** - For source code deployments, App Runner builds container images automatically
- **Auto-scaling** - Scales from 1 to 100+ instances based on concurrent requests or custom metrics
- **Zero-instance scaling** - Can scale to zero instances during idle periods (pause service)
- **Load balancing** - Managed load balancer included, no additional configuration
- **HTTPS endpoints** - Automatic HTTPS with managed certificates
- **Custom domains** - Bring your own domain with automatic SSL/TLS
- **VPC connectivity** - Connect to VPC resources (RDS, ElastiCache) via VPC connector
- **Observability** - Integrated CloudWatch Logs, metrics, and X-Ray tracing
- **Health checks** - Automatic health monitoring with configurable endpoints

**When to Choose App Runner vs ECS vs Lambda:**

| Scenario | App Runner | ECS Fargate | Lambda |
|----------|-----------|-------------|--------|
| **Web app with steady traffic** | Best | Good | Poor (cost) |
| **API with variable traffic** | Good | Good | Best |
| **Need VPC access** | VPC connector | Native VPC | VPC config |
| **Long-running requests (>15min)** | Yes | Yes | No |
| **Want zero ops** | Best | Medium | Best |
| **Need Kubernetes portability** | No | Use EKS | No |
| **Cost for low traffic** | Scale to zero | Always-on cost | Best |

**Real-World Use Case:**

A startup built a Python Flask API for their mobile app:
- **Requirements:** Deploy from GitHub, handle 10-1000 req/min, connect to RDS PostgreSQL
- **Solution:** App Runner with source code deployment
- **Configuration:** 30 seconds
- **Result:** Automatic deployments on git push, scales automatically, $20-200/month depending on traffic
- **Alternative cost:** ECS Fargate would cost $50/month minimum (always-on); Lambda would cost $15-150/month

**Limitations to Consider:**
- **No GPU support** - Use ECS for ML inference workloads
- **Limited customization** - Can't customize networking, instance types, or orchestration logic
- **Regional only** - No edge deployment (unlike Lambda@Edge)
- **HTTP/HTTPS only** - No support for custom protocols

**Pricing Model:**
- **Compute:** $0.064/vCPU-hour + $0.007/GB-hour when active
- **Memory:** Charged per GB allocated
- **Provisioned instances:** Pay for minimum instances even when idle
- **Paused services:** $5/month to maintain configuration (no active instances)

**AWS Documentation:**
- [AWS App Runner Developer Guide](https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html)
- [App Runner Pricing](https://aws.amazon.com/apprunner/pricing/)
- [Deploying to App Runner](https://docs.aws.amazon.com/apprunner/latest/dg/service-source-code.html)
- [App Runner VPC Connector](https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html)

## Advanced Patterns

### Circuit Breaker Pattern

Prevent cascading failures in distributed systems:

```python
# Lambda with circuit breaker
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN

    def call(self, func):
        if self.state == 'OPEN':
            if time.time() - self.last_failure > self.timeout:
                self.state = 'HALF_OPEN'
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = func()
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise e
```

**AWS Implementation:**
- API Gateway throttling
- Lambda reserved concurrency
- DynamoDB auto-scaling
- Step Functions error handling

### Saga Pattern for Distributed Transactions

**Choreography (Event-Driven):**
```
Order Service -> Creates Order -> Publishes OrderCreated event
  |
  v
Payment Service -> Processes Payment -> Publishes PaymentCompleted
  |
  v
Inventory Service -> Reserves Items -> Publishes ItemsReserved
  |
  v
Shipping Service -> Creates Shipment
```

**Orchestration (Step Functions):**
- Central coordinator
- Explicit compensation logic
- Easier to understand
- Better for complex flows

### Service Mesh (AWS App Mesh)

**Features:**
- Traffic routing and management
- Service-to-service mTLS
- Observability (metrics, traces)
- Retries and timeouts
- Circuit breaking

**Components:**
- **Virtual Nodes** - Service representations
- **Virtual Routers** - Traffic distribution
- **Virtual Services** - Service names
- **Envoy Proxy** - Sidecar container

## Migration Strategy Decision Matrix

| Factor | Containers (ECS/EKS) | Serverless (Lambda) | Managed (App Runner) |
|--------|---------------------|---------------------|---------------------|
| **Control** | High | Low | Medium |
| **Complexity** | Medium-High | Low | Low |
| **Cost Model** | Instance hours | Requests + duration | Requests + instance hours |
| **Scaling** | Configured | Automatic | Automatic |
| **Cold Start** | No | Yes (mitigated) | No |
| **Runtime Limit** | None | 15 minutes | None |
| **State** | Supported | Stateless | Supported |
| **Best For** | Long-running, stateful | Event-driven, APIs | Web apps, APIs, microservices |

## SAP-C02 Exam Tips

**Modernization Strategy Selection:**
1. **Strangler fig is incremental** - AWS always favors gradual migration over "big bang" rewrites. Use API Gateway for routing, maintain both systems during transition.
2. **Anti-corruption layer** - When integrating legacy systems with modern microservices, use ACL to prevent legacy constraints from contaminating new architecture.
3. **ROI calculation matters** - Choose replatform for quick wins (20-30% savings), refactor for long-term transformation (40-60% savings).

**Containerization Decisions:**
4. **Fargate for simplicity** - Default choice unless you need GPU, custom AMIs, Windows containers with licensing, or cost optimization via Reserved Instances.
5. **ECS vs EKS** - Choose ECS for AWS-native simplicity, EKS for Kubernetes portability or existing K8s expertise.
6. **App2Container for legacy lift-and-shift** - Fastest path to containerize .NET and Java applications without source code changes.
7. **App Runner for rapid deployment** - Best for simple web apps and APIs when you don't need orchestration complexity.

**Serverless Architecture:**
8. **Lambda 15-minute limit** - Use ECS/Fargate for long-running processes, Step Functions for orchestration beyond 15 minutes.
9. **Lambda SnapStart** - Only works with Java 11+, Python 3.12+, .NET 8+; generates unique values in handler, not initialization.
10. **Provisioned Concurrency vs SnapStart** - SnapStart for cost-effective cold start reduction, Provisioned Concurrency for guaranteed sub-100ms latency.
11. **API Gateway REST vs HTTP** - HTTP APIs are 70% cheaper and lower latency but lack caching, request validation, private endpoints, and WAF integration.
12. **Step Functions Standard vs Express** - Standard for long-running (up to 1 year) auditable workflows; Express for high-volume event processing (max 5 minutes).

**Microservices Communication:**
13. **EventBridge over SNS** - EventBridge is better for application event buses (schema registry, filtering, cross-account); SNS for simple pub/sub fan-out.
14. **SQS FIFO for ordering guarantees** - Standard queues for maximum throughput, FIFO queues when message ordering is critical.
15. **Synchronous vs asynchronous** - Use async (EventBridge, SQS, SNS) for resilience and decoupling; synchronous (API Gateway, ALB) only when immediate response required.

**Data Management:**
16. **Database per service** - Each microservice should own its data; use APIs/events for cross-service data access, never direct database access.
17. **Saga pattern for distributed transactions** - Step Functions orchestrates compensation logic; avoid distributed ACID transactions.
18. **DynamoDB for serverless** - First choice for serverless persistence; use single-table design for microservices.

**Advanced Patterns:**
19. **Service mesh complexity** - Only use App Mesh when you need advanced service-to-service features (mTLS, traffic routing, observability); adds operational overhead.
20. **IRSA for EKS security** - Always use IAM Roles for Service Accounts for pod-level permissions, never node-level roles.
21. **Circuit breaker pattern** - Use API Gateway throttling, Lambda reserved concurrency, or App Mesh for preventing cascading failures.
22. **EventBridge Schema Registry** - Enables schema discovery and versioning for event-driven architectures.

**Cost Optimization:**
23. **HTTP APIs save 70%** - Migrate from REST to HTTP APIs when you don't need advanced features.
24. **Fargate Spot** - For fault-tolerant workloads, use Fargate Spot for up to 70% cost savings.
25. **Lambda right-sizing** - Memory allocation controls CPU; over-provisioning can reduce costs if execution time decreases proportionally.

**Common Scenario Patterns:**
- **Legacy monolith modernization** - Strangler fig + API Gateway + gradual microservice extraction
- **High-volume API** - API Gateway HTTP APIs + Lambda with SnapStart + DynamoDB
- **Long-running workflow** - Step Functions Standard + ECS Fargate tasks
- **Event-driven processing** - EventBridge + Lambda + SQS for buffering
- **Real-time communication** - API Gateway WebSocket + Lambda + DynamoDB
- **Containerized legacy apps** - App2Container + ECS Fargate + RDS

## Common Architectural Patterns

### Microservices on AWS

```
                     ┌─────────────────┐
                     │   API Gateway   │
                     │  (REST/HTTP)    │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
         │ Lambda  │    │ Lambda  │    │  ECS    │
         │ (Users) │    │(Orders) │    │(Catalog)│
         └────┬────┘    └────┬────┘    └────┬────┘
              │              │              │
         ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
         │DynamoDB │    │   RDS   │    │DynamoDB │
         └─────────┘    └─────────┘    └─────────┘
```

### Event-Driven Architecture

```
┌──────────┐         ┌─────────────┐         ┌──────────┐
│ Producer │────────>│ EventBridge │────────>│ Consumer │
│ (Lambda) │  Event  │  Event Bus  │  Route  │ (Lambda) │
└──────────┘         └─────────────┘         └──────────┘
                            │
                     ┌──────┴──────┐
                     │             │
                ┌────▼────┐   ┌────▼────┐
                │   SQS   │   │   SNS   │
                │ (Queue) │   │ (Topic) │
                └─────────┘   └─────────┘
```

### Hybrid Monolith + Microservices

```
┌──────────────────────────────────────┐
│     Application Load Balancer        │
└────┬──────────────────────────┬──────┘
     │                          │
┌────▼─────────┐          ┌─────▼──────┐
│   Legacy     │          │    New     │
│  Monolith    │<────────>│Microservices│
│   (EC2)      │   API    │  (Lambda)  │
└──────────────┘          └────────────┘
```

**AWS Documentation:**
- [AWS Prescriptive Guidance - Modernization](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-guide/)
- [AWS Architecture Center - Reference Architectures](https://aws.amazon.com/architecture/)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)

## Summary and Key Takeaways

Application modernization is a critical competency for the SAP-C02 exam, representing the intersection of migration strategy, cloud-native architecture, and operational excellence. Understanding when and how to modernize applications separates Solutions Architects from cloud engineers.

**Core Principles:**

1. **Incremental over Big Bang** - The strangler fig pattern is almost always the right answer for modernizing large monolithic applications. AWS emphasizes risk mitigation through gradual transformation.

2. **Right Tool for Right Job** - AWS provides a spectrum of compute options from Lambda (fully managed, sub-15 minutes) to App Runner (simple containers) to ECS/Fargate (full orchestration) to EKS (Kubernetes portability). Match workload characteristics to service capabilities.

3. **Cost-Performance Tradeoffs** - Understand the pricing models:
   - Lambda: Pay per request and duration (best for variable workloads)
   - Fargate: Pay per task vCPU/GB-hour (good for steady containers)
   - EC2: Pay per instance hour (best for predictable, long-running workloads)
   - App Runner: Pay per active compute time (best for simple web apps)

4. **Integration Patterns Matter** - Modern applications use a mix of synchronous (API Gateway, ALB) and asynchronous (EventBridge, SQS, SNS) communication. Asynchronous patterns provide better resilience and decoupling.

5. **Data Architecture is Critical** - Each microservice should own its data. Use APIs or events for cross-service communication, never direct database access. Implement Saga pattern via Step Functions for distributed transactions.

**Decision Framework for Modernization:**

**When to use ECS Fargate:**
- Containerized applications requiring orchestration
- Workloads running longer than 15 minutes
- Need VPC networking without Lambda cold start penalties
- Want AWS-native container service without Kubernetes complexity

**When to use Lambda:**
- Event-driven processing (S3, DynamoDB Streams, EventBridge)
- APIs with variable traffic
- Workloads completing in under 15 minutes
- Want zero infrastructure management

**When to use Step Functions:**
- Orchestrating multiple services/functions
- Need built-in retry and error handling
- Long-running workflows (up to 1 year with Standard)
- Implementing Saga pattern for distributed transactions

**When to use App Runner:**
- Simple web applications or APIs
- Want simplest possible deployment from code/container
- Don't need complex orchestration or networking
- Willing to trade flexibility for operational simplicity

**When to use EKS:**
- Existing Kubernetes workloads or expertise
- Need multi-cloud portability
- Complex container orchestration requirements
- Want Kubernetes ecosystem tools and patterns

**Critical SAP-C02 Knowledge Areas:**

- **App2Container workflow** - Inventory, analyze, containerize, deploy
- **Lambda SnapStart** - Supported runtimes, uniqueness considerations, pricing
- **API Gateway types** - REST vs HTTP API feature and cost differences
- **Step Functions workflows** - Standard vs Express execution models
- **ECS launch types** - EC2 vs Fargate selection criteria
- **Service communication** - Synchronous vs asynchronous patterns
- **Database patterns** - Database per service, Saga pattern, eventual consistency
- **Migration patterns** - Strangler fig, anti-corruption layer, dual write

**Essential AWS Documentation for SAP-C02:**

**Whitepapers and Guides:**
- [Microservices on AWS](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/microservices-on-aws.html)
- [Serverless Applications Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)
- [Modernization Strategy Guide](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-modernizing-applications/)
- [Migration and Modernization Strategies](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-strategies/)

**Service Documentation:**
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Amazon ECS Best Practices Guide](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)
- [Amazon EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [AWS Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html)
- [AWS App Runner Developer Guide](https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html)
- [AWS App2Container User Guide](https://docs.aws.amazon.com/app2container/latest/UserGuide/what-is-a2c.html)

**Prescriptive Guidance Patterns:**
- [Strangler Fig Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-aspnet-web-services/fig-pattern.html)
- [Anti-Corruption Layer Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/acl-pattern.html)
- [Saga Pattern Implementation](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-data-persistence/saga-pattern.html)
- [Event-Driven Architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-integrating-microservices/event-driven-architecture.html)

**FAQs (Frequently Tested):**
- [AWS Lambda FAQ](https://aws.amazon.com/lambda/faqs/)
- [Amazon ECS FAQ](https://aws.amazon.com/ecs/faqs/)
- [Amazon EKS FAQ](https://aws.amazon.com/eks/faqs/)
- [AWS Step Functions FAQ](https://aws.amazon.com/step-functions/faqs/)
- [Amazon API Gateway FAQ](https://aws.amazon.com/api-gateway/faqs/)

This comprehensive understanding of application modernization strategies, patterns, and AWS services will prepare you for the 20% of SAP-C02 exam questions covering Domain 4: Migration and Modernization.
