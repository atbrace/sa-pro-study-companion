---
title: Compute Solutions and Deployment Strategies
lastUpdated: 2026-01-06
---

# Compute Solutions and Deployment Strategies

Selecting the right compute service is fundamental to designing solutions for new workloads on AWS. At the SAP-C02 level, you must understand not just what each service does, but when to choose it based on workload characteristics, cost constraints, operational requirements, and architectural trade-offs. This topic covers EC2 instance selection strategies, serverless compute with Lambda, container orchestration with ECS and EKS, batch processing with AWS Batch, and sophisticated auto scaling patterns.

**Key Decision Framework:**
- **EC2** - Full control, persistent workloads, specialized hardware requirements
- **Lambda** - Event-driven, short-duration (<15 min), variable/unpredictable traffic
- **ECS/EKS** - Containerized microservices, portability, orchestration needs
- **Batch** - Long-running batch jobs (hours/days), embarrassingly parallel workloads
- **Fargate** - Serverless containers, no infrastructure management preference

## EC2 Instance Types and Families

Understanding EC2 instance families is critical for the SAP-C02 exam. Each family is optimized for specific workload patterns, and choosing the wrong family can result in over-provisioning costs or performance bottlenecks. Modern AWS instances use the Nitro hypervisor, which provides better performance, security (hardware-level isolation), and supports enhanced networking capabilities.

### Instance Families Overview

| Family | Type | Use Case | Current Generation | Processor Options |
|--------|------|----------|-------------------|-------------------|
| **General Purpose** | T, M | Balanced compute/memory/network | t3, t4g, m5, m6i, m7g, m8g | Intel Xeon, AMD EPYC, Graviton |
| **Compute Optimized** | C | CPU-intensive workloads | c5, c6i, c7g, c8g | Intel Xeon, AMD EPYC, Graviton |
| **Memory Optimized** | R, X, U | Memory-intensive applications | r5, r6i, r7g, r8g, x2idn, u-*tb1 | Intel Xeon, AMD EPYC, Graviton |
| **Storage Optimized** | I, D, H | High IOPS, sequential throughput | i3en, i4i, i7ie, i8g, d3, h1 | Intel Xeon, AMD EPYC, Graviton |
| **Accelerated Computing** | P, G, F, Inf, Trn | GPU, FPGA, ML training/inference | p5, g6, inf2, trn2 | NVIDIA GPUs, AWS Trainium/Inferentia |
| **HPC Optimized** | Hpc | High-performance computing | hpc7a, hpc7g | AMD EPYC, Graviton |

**Instance Naming Convention:** `[Family][Generation][Processor][Capabilities].[Size]`
- Example: **c7g.2xlarge** = Compute optimized, 7th gen, Graviton, 2xlarge size
- Example: **m6idn.32xlarge** = General purpose, 6th gen, Intel, local NVMe storage (d), enhanced networking (n)

### Key Instance Types for SAP-C02

**T3/T3a/T4g (Burstable Performance)**
- **CPU Model:** Baseline CPU performance with burst credits (accumulate during idle periods)
- **Use Cases:** Development environments, low-traffic web servers, small databases
- **Cost Optimization:** T4g (Graviton2) offers up to 40% better price-performance vs T3
- **Exam Tip:** Know that unlimited mode prevents throttling but can incur additional charges
- **Real-world Scenario:** A startup's web application with sporadic traffic during business hours - T3 instances accumulate credits overnight and burst during peak usage

**M5/M6i/M7g/M8g (General Purpose)**
- **CPU-to-Memory Ratio:** 1:4 (balanced for most workloads)
- **Use Cases:** Application servers, mid-size databases, caching fleets, SAP applications
- **Network Performance:** Up to 100 Gbps with m6in/m7gd/m8g instances (enhanced networking)
- **M7g Advantage:** AWS Graviton3 - up to 25% better performance vs M6g
- **Real-world Scenario:** E-commerce application backend with consistent traffic patterns and moderate database queries

**C5/C6i/C7g/C8g (Compute Optimized)**
- **CPU-to-Memory Ratio:** Higher CPU allocation relative to memory
- **Use Cases:** Batch processing, media transcoding, high-performance web servers, scientific modeling, ad serving, MMO gaming
- **Network Performance:** C6in supports up to 200 Gbps for network-intensive workloads
- **Real-world Scenario:** Video encoding pipeline processing thousands of videos daily - C6i instances provide optimal CPU performance for ffmpeg workloads

**R5/R6i/R7g/R8g (Memory Optimized)**
- **Memory-to-CPU Ratio:** Up to 8:1 (large memory allocation per vCPU)
- **Use Cases:** In-memory databases (Redis, Memcached), real-time big data analytics, SAP HANA
- **R7iz Specialty:** Intel Xeon with highest all-core turbo frequency (ideal for per-core licensed software)
- **X2idn/X2iedn:** Up to 2 TiB memory per instance for ultra-large-scale workloads
- **U-series:** High-memory instances with up to 24 TiB for SAP HANA deployments
- **Real-world Scenario:** Financial services firm running real-time fraud detection with in-memory graph database requiring 1 TiB working set

**I3/I4i/I7ie/I8g (Storage Optimized)**
- **Storage:** Local NVMe SSD instance storage (ephemeral - data lost on stop/terminate)
- **IOPS:** I4i delivers up to 1.7 million random read IOPS and 1 million random write IOPS
- **Use Cases:** NoSQL databases (Cassandra, MongoDB, Redis with persistence), Elasticsearch, data warehousing, OLTP databases
- **Exam Tip:** Instance store is ephemeral - use for cache, temporary data, or replicated data only
- **Real-world Scenario:** High-throughput NoSQL cluster with built-in replication where each node needs 30 TB local SSD with sub-millisecond latency

**P4d/P5 (GPU - Training)**
- **GPU:** NVIDIA A100 (P4d) or H100 (P5) Tensor Core GPUs
- **Use Cases:** Machine learning training, deep learning, computational fluid dynamics, seismic analysis
- **Network:** 400 Gbps EFA (Elastic Fabric Adapter) for multi-node ML training
- **Real-world Scenario:** Training large language models across distributed GPU clusters with petabyte-scale datasets

**Inf2 (Inference Optimization)**
- **Accelerator:** AWS Inferentia2 chips purpose-built for ML inference
- **Cost Benefit:** Up to 70% lower cost per inference vs GPU-based instances
- **Use Cases:** Natural language processing, computer vision, recommendation systems
- **Real-world Scenario:** E-commerce recommendation engine serving millions of predictions per second at optimized cost

**AWS Documentation:**
- [Amazon EC2 Instance Types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html)
- [EC2 Instance Type Specifications](https://aws.amazon.com/ec2/instance-types/)
- [AWS Graviton Processors](https://aws.amazon.com/ec2/graviton/)
- [Find EC2 Instance Types Using Console](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-discovery.html)

### Placement Groups

Placement groups control how EC2 instances are positioned on underlying hardware to optimize for specific performance or availability requirements. They are free to create and critical for architecting HPC and distributed workloads.

**Cluster Placement Group - Low Latency, High Throughput**

Architecture:
- Packs instances close together within a single Availability Zone
- Same rack, often same physical hardware
- Network latency as low as 10 Gbps single-flow, 100 Gbps aggregate

Use Cases:
- High-performance computing (HPC) applications requiring tightly coupled node-to-node communication
- Low-latency financial trading applications
- Distributed machine learning training with AllReduce operations
- Big data analytics with shuffle-heavy operations (Spark)

Limitations:
- **Single AZ only** - no multi-AZ resilience
- Limited to instance types that support enhanced networking
- Capacity constraints - launch all instances at once if possible

Best Practices:
- Use homogeneous instance types (same family/size) for predictable performance
- Launch instances in a single request to reduce placement failures
- Enable enhanced networking (ENA) for maximum throughput

Real-world Scenario: A computational biology research lab running molecular dynamics simulations across 256 c7g.16xlarge instances requiring sub-100 microsecond inter-node latency.

**Spread Placement Group - Maximum Availability**

Architecture:
- Each instance placed on distinct underlying hardware (different racks)
- Isolated power and network infrastructure per instance
- Strictly limited to 7 instances per AZ per group

Use Cases:
- Small numbers of critical instances that must be isolated from correlated failures
- Active-active database clusters where each node must survive independent hardware failures
- Mission-critical application servers requiring maximum fault isolation

Limitations:
- **7 instances per AZ maximum** - not suitable for large fleets
- Cannot use Dedicated Hosts or Dedicated Instances
- Some instance types not supported

Best Practices:
- Use for stateful workloads where instance failure would be costly
- Combine with multiple AZs for both hardware and AZ-level fault tolerance
- Monitor with CloudWatch to detect and replace failed instances quickly

Real-world Scenario: A payment processing system with 3 active database replicas across 3 AZs (9 instances total) where each replica must survive independent hardware failures.

**Partition Placement Group - Distributed Workloads**

Architecture:
- Divides instances into logical partitions (up to 7 per AZ)
- Each partition has isolated underlying hardware (rack)
- Instances within a partition share racks, but partitions don't share racks
- Partition placement information exposed to instances via metadata

Use Cases:
- Large distributed and replicated workloads like Hadoop, Cassandra, Kafka, HDFS
- Workloads that need topology awareness for replica placement
- Applications requiring control over failure domain boundaries

Limitations:
- Maximum 7 partitions per AZ
- Dedicated Hosts not supported
- No partition guarantee across separate placement groups

Best Practices:
- Distribute replicas across partitions for rack-level fault tolerance
- Use partition metadata to implement topology-aware replica placement algorithms
- Scale horizontally by adding instances to existing partitions rather than creating new groups

Real-world Scenario: A Kafka cluster with 21 brokers across 3 AZs, using 7 partitions per AZ to ensure that no two replicas of the same partition share a rack, providing rack-level fault tolerance while supporting hundreds of topics.

**Comparison Table:**

| Placement Type | Max Instances | Scope | Latency | Availability | Use Case |
|----------------|---------------|-------|---------|--------------|----------|
| **Cluster** | No limit | Single AZ | Lowest | Low (single AZ) | HPC, ML training |
| **Spread** | 7 per AZ | Multi-AZ | Normal | Highest | Critical instances |
| **Partition** | No limit (7 partitions) | Multi-AZ | Normal | High | Distributed systems |
| **None** | No limit | Multi-AZ | Normal | Normal | General workloads |

**AWS Documentation:**
- [EC2 Placement Groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html)
- [Placement Group Strategies](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html#placement-groups-cluster)
- [Placement Group Rules and Limitations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html#concepts-placement-groups)

## AWS Lambda

AWS Lambda is a serverless compute service that runs code in response to events without requiring server provisioning or management. Understanding Lambda's execution model, limits, and optimization patterns is essential for SAP-C02, particularly when designing event-driven architectures and cost-optimized solutions.

### Execution Model and Architecture

**Execution Environment Lifecycle:**
1. **Cold Start** - New execution environment created (includes downloading code, runtime startup, handler initialization)
2. **Warm Execution** - Reuses existing execution environment (skips initialization steps)
3. **Environment Freezing** - After invocation, environment frozen for reuse (up to several hours)

**Key Characteristics:**

| Aspect | Specification | Exam Relevance |
|--------|--------------|----------------|
| **Max Execution Time** | 900 seconds (15 minutes) | Hard limit - use Step Functions or Batch for longer jobs |
| **Memory Allocation** | 128 MB to 10,240 MB (1 MB increments) | CPU scales proportionally (1,769 MB = 1 vCPU) |
| **Ephemeral Storage (/tmp)** | 512 MB to 10,240 MB | Shared across invocations in warm environments |
| **Deployment Package Size** | 50 MB (zipped), 250 MB (unzipped), 10 GB (container image) | Use layers or container images for large dependencies |
| **Concurrent Executions** | 1,000 per region (soft limit) | Can increase to tens of thousands |
| **Burst Concurrency** | 500-3,000 (region-dependent) | Initial burst, then 500 executions/minute scale-up |
| **Environment Variables** | 4 KB total | Use Parameter Store/Secrets Manager for larger configs |

**Pricing Model:**
- **Request charges:** $0.20 per 1 million requests
- **Duration charges:** Based on GB-seconds of compute time
- **No charges** for code execution during cold start initialization
- **Free tier:** 1 million requests and 400,000 GB-seconds per month

### Lambda Optimization Strategies

**1. Memory Allocation and Performance Testing**

Memory allocation directly impacts both CPU performance and cost. Since CPU power scales linearly with memory (1,769 MB = 1 vCPU), increasing memory can paradoxically reduce costs by decreasing execution time.

Strategy:
- Monitor **Max Memory Used** in CloudWatch Logs (REPORT line after each invocation)
- Use **AWS Lambda Power Tuning** tool to empirically determine optimal memory configuration
- Test multiple memory settings with actual workload patterns
- Sweet spot often between 1024-1536 MB for balanced price-performance

Real-world Scenario: An image processing function initially configured with 512 MB took 3 seconds per invocation. Increasing to 1,536 MB reduced execution to 800 ms, cutting costs by 47% despite 3x higher per-second pricing.

**2. Cold Start Reduction Techniques**

Cold starts occur when Lambda creates a new execution environment. Latency-sensitive applications must minimize this delay.

Techniques:

**Provisioned Concurrency:**
- Pre-initializes execution environments (always warm)
- Doubles function costs (billed for provisioned capacity + duration)
- Use for latency-sensitive APIs, real-time processing
- CloudWatch metric: `ProvisionedConcurrencyUtilization`

**SnapStart (Java 11+ and Corretto):**
- Caches initialized execution environment as snapshot
- Reduces cold start by up to 10x (typical 200-300ms improvement)
- No additional cost beyond standard invocation pricing
- Limitations: Must handle uniqueness requirements (e.g., regenerate UUIDs)

**Lambda Extensions:**
- Offload auxiliary tasks (logging, monitoring) to extension layer
- Extensions initialize in parallel with function initialization
- Reduces perceived cold start for business logic

**Runtime Selection:**
- Interpreted languages (Python, Node.js) have faster cold starts vs compiled (Java, .NET)
- Arm64 (Graviton2) provides up to 34% better price-performance and faster startup

**3. Execution Environment Reuse**

Lambda freezes execution environments between invocations, allowing state reuse.

Best Practices:
```python
# CORRECT: Initialize outside handler (global scope)
import boto3
from aws_xray_sdk.core import patch_all

# SDK clients reused across invocations
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Orders')
patch_all()  # X-Ray instrumentation once

def lambda_handler(event, context):
    # Business logic only
    response = table.get_item(Key={'OrderId': event['orderId']})
    return response['Item']
```

```python
# WRONG: Initialize inside handler (recreated every invocation)
def lambda_handler(event, context):
    import boto3  # Wasteful
    dynamodb = boto3.resource('dynamodb')  # Recreates connection
    table = dynamodb.Table('Orders')
    return table.get_item(Key={'OrderId': event['orderId']})
```

Additional optimizations:
- Cache static data in /tmp directory (persists across warm invocations)
- Use HTTP keep-alive with `KEEP_ALIVE` environment variable for SDK
- Lazy-load dependencies used in specific code paths only

**4. VPC Configuration Optimization**

Lambda functions in VPCs can access private resources (RDS, ElastiCache, internal APIs) but historically suffered cold start penalties.

Modern VPC Architecture (Hyperplane ENIs):
- AWS introduced Hyperplane in 2019, eliminating VPC-specific cold starts
- ENIs created at scale, shared across functions, no per-function ENI creation delay
- VPC functions now add only ~1-2 seconds vs non-VPC (network path initialization)

Best Practices:
- Only use VPC when accessing private resources (RDS, ElastiCache, internal services)
- Don't use VPC for functions accessing only public AWS services (S3, DynamoDB, SNS)
- Place Lambda in private subnets with NAT Gateway for internet access
- Use VPC Endpoints for AWS services to avoid NAT Gateway costs and latency
- Configure sufficient ENI capacity (500 per VPC default, can increase to thousands)

Real-world Scenario: A Lambda function querying RDS in private subnet, publishing to SNS. Optimal architecture: VPC for RDS access + VPC Endpoint for SNS (avoids NAT Gateway egress costs).

**5. Idempotency and Error Handling**

Lambda automatically retries failed invocations (async: 2 retries, streams: until success or data expiration).

Best Practices:
- Implement idempotent handlers (safe to retry with same input)
- Use **Idempotency utilities** from AWS Lambda Powertools (Python, TypeScript, Java, .NET)
- Configure Dead Letter Queues (SQS/SNS) for failed async invocations
- Use Destinations (S3, EventBridge, SQS, SNS) for success/failure routing
- Set appropriate ReservedConcurrentExecutions to prevent runaway costs

**AWS Documentation:**
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Lambda Execution Environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [Lambda Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning)

### Lambda Quotas and Limits

Understanding Lambda limits is critical for architectural decisions, particularly for high-throughput and latency-sensitive applications.

**Hard Limits (Cannot Be Increased):**

| Resource | Limit | Architectural Implication |
|----------|-------|--------------------------|
| **Timeout** | 900 seconds (15 minutes) | Use Step Functions, Batch, or ECS for longer jobs |
| **Invocation Payload (Sync)** | 6 MB (request + response) | Use S3 for large data, pass object keys instead |
| **Invocation Payload (Async)** | 256 KB | Events from SNS/SQS limited by this size |
| **Container Image Code** | 10 GB | Allows large ML models and dependencies |
| **Deployment Package (.zip)** | 50 MB (zipped), 250 MB (unzipped) | Use layers or container images for large deps |
| **Environment Variables** | 4 KB total | Use Parameter Store/Secrets Manager for configs |
| **File Descriptors** | 1,024 | Limit open connections and files |
| **Processes/Threads** | 1,024 | Design for Lambda's execution model |

**Soft Limits (Can Request Increases):**

| Resource | Default | Can Increase To | Request Method |
|----------|---------|-----------------|----------------|
| **Concurrent Executions** | 1,000 per region | Tens of thousands | Service Quotas console |
| **Function Storage** | 75 GB | Terabytes | Service Quotas console |
| **Elastic Network Interfaces** | 500 per VPC | Thousands | Service Quotas console |

**Scaling Behavior:**
- **Initial burst:** 500-3,000 concurrent executions (region-dependent)
- **After burst:** +500 executions per minute until account limit reached
- **Reserved Concurrency:** Guarantees capacity for critical functions, subtracts from account limit
- **Provisioned Concurrency:** Pre-warmed environments, counted toward concurrent execution limit

**Exam Tip - Service Quota Mismatches:**
- API Gateway default: 10,000 requests/second
- Lambda default: 1,000 concurrent executions
- High-traffic APIs require Lambda concurrency increases to prevent throttling

**AWS Documentation:**
- [Lambda Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Managing Lambda Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html)

### Event Sources and Integration Patterns

Lambda supports multiple invocation patterns, each with different characteristics for reliability, latency, and error handling.

**Synchronous Invocation (Request-Response):**

Sources:
- **API Gateway** - REST and HTTP APIs (6 MB payload limit)
- **Application Load Balancer** - Direct ALB targets with multi-value headers support
- **CloudFront Lambda@Edge** - Edge computing for content customization
- **Cognito** - Custom authentication flows
- **Lex** - Chatbot fulfillment

Characteristics:
- Caller waits for response
- No automatic retries (caller responsible)
- Immediate error feedback
- Use for latency-sensitive operations (<3 seconds preferred)

**Asynchronous Invocation (Fire-and-Forget):**

Sources:
- **S3** - Object creation, deletion, restoration (max 250 KB event)
- **SNS** - Topic subscriptions with fan-out patterns
- **EventBridge** - Scheduled events and event routing
- **CloudWatch Logs** - Log filtering and processing
- **CodeCommit** - Repository events

Characteristics:
- Automatic retries (2 attempts with exponential backoff)
- Events queued internally before invocation
- Configure Destinations (success/failure to SQS, SNS, EventBridge, Lambda)
- Configure Dead Letter Queue for failed events
- Use for asynchronous workflows and event-driven architectures

**Polling Event Sources (Stream/Queue Processing):**

Sources:
- **Kinesis Data Streams** - Real-time analytics and log processing
- **DynamoDB Streams** - Change data capture and cross-region replication
- **SQS** - Standard and FIFO queues (batch up to 10 messages, or 6 MB total)
- **MSK (Managed Kafka)** - Event streaming from Kafka topics
- **DocumentDB Change Streams** - Database change notifications

Characteristics:
- Lambda polls the source and invokes function with batches
- Automatic retries until success or data expires (Kinesis: 24h-365d based on retention)
- **Partial Batch Response** - Process records individually, retry only failures
- **Bisect on Error** - Splits failed batches for finer error isolation
- **Parallelization Factor** - Process multiple batches per shard concurrently (Kinesis)
- Use for stream processing, ETL, and event-sourced architectures

**Event Source Mapping Configuration Best Practices:**
- Set batch size based on processing time and memory (smaller batches = lower latency, higher cost)
- Configure `MaximumBatchingWindowInSeconds` (0-5 minutes) to collect records before invoking
- Enable `ReportBatchItemFailures` for partial batch processing
- Monitor `IteratorAge` metric - should stay under 30 seconds for real-time processing
- For SQS: Set visibility timeout to 6x function timeout to prevent duplicate processing

**Real-world Scenario:** An e-commerce order processing system:
- **API Gateway + Lambda (sync):** Validate and submit order (200ms response)
- **EventBridge + Lambda (async):** Trigger fraud detection, inventory update (non-blocking)
- **DynamoDB Streams + Lambda (poll):** Update search index, analytics warehouse

**AWS Documentation:**
- [Lambda Event Source Mapping](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html)
- [Lambda with Kinesis](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html)
- [Lambda with SQS](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [Lambda Destinations](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html#invocation-async-destinations)

## Container Services

Container orchestration is essential for modern microservices architectures. AWS offers two primary options: ECS (AWS-proprietary) and EKS (managed Kubernetes). Understanding when to choose each is a common SAP-C02 scenario.

### ECS vs EKS Decision Framework

| Dimension | Amazon ECS | Amazon EKS |
|-----------|------------|------------|
| **Orchestration** | AWS-native proprietary | Kubernetes (CNCF standard) |
| **Learning Curve** | Easier - simpler abstractions | Steeper - K8s complexity |
| **Control Plane Cost** | **Free** | **$0.10/hour (~$73/month) per cluster** |
| **AWS Service Integration** | Deep native integration | Good (via AWS Load Balancer Controller, CSI drivers) |
| **Portability** | AWS-specific | Multi-cloud, on-premises (K8s standard) |
| **Ecosystem** | AWS tooling only | Vast K8s ecosystem (Helm, operators, CNCF projects) |
| **IAM Integration** | Native task roles | IRSA (IAM Roles for Service Accounts) |
| **Networking** | awsvpc mode (ENI per task) | VPC CNI (ENI per pod) or alternate CNIs |
| **Autoscaling** | Target tracking, step, scheduled | HPA, VPA, Cluster Autoscaler, Karpenter |
| **Best For** | AWS-first organizations, simpler architectures | K8s expertise, multi-cloud portability, complex orchestration |

**When to Choose ECS:**
- Team has no Kubernetes expertise
- AWS-native tooling is sufficient
- Cost-sensitive (no control plane fees)
- Simpler deployment and operational requirements
- Deep AWS service integration is priority

**When to Choose EKS:**
- Existing Kubernetes expertise in organization
- Portability across clouds or hybrid deployments required
- Need K8s ecosystem tools (Istio, Argo CD, Prometheus Operator)
- Complex orchestration patterns (StatefulSets, DaemonSets, Jobs)
- Regulatory requirements mandate K8s or multi-cloud capability

**Real-world Scenario:** A startup building a new SaaS product on AWS with no K8s experience should choose ECS with Fargate for simplicity and cost savings. A financial institution migrating existing K8s workloads from on-premises should choose EKS for consistency and tooling reuse.

### Amazon ECS (Elastic Container Service)

Amazon ECS is AWS's proprietary container orchestration service that eliminates the need to manage control plane infrastructure. It provides deep AWS integration and supports both serverless (Fargate) and EC2-based compute.

**ECS Architecture Components:**

1. **Cluster** - Logical grouping of tasks or services (can span multiple AZs)
2. **Task Definition** - Blueprint specifying container image, CPU, memory, networking
3. **Task** - Instantiation of a task definition (one or more containers running together)
4. **Service** - Maintains desired count of tasks, handles load balancing and auto scaling
5. **Container Instance** - EC2 instance running the ECS agent (EC2 launch type only)

**Launch Type Comparison:**

| Aspect | EC2 Launch Type | Fargate Launch Type |
|--------|----------------|---------------------|
| **Infrastructure** | You manage EC2 instances | AWS manages infrastructure (serverless) |
| **Pricing** | Pay for instances (24/7) | Pay only for vCPU/memory used per task-second |
| **Cost Profile** | Lower for sustained, high-utilization workloads | Lower for variable/intermittent workloads |
| **Control** | Full instance access, SSH, custom AMIs | No instance access, task-level isolation only |
| **Scaling** | Cluster capacity + service scaling | Service scaling only (infinite capacity) |
| **Networking** | awsvpc, bridge, host modes | awsvpc only (ENI per task) |
| **Storage** | Instance store, EBS, EFS | 20 GB ephemeral + EFS (no EBS) |
| **Use Cases** | GPU workloads, sustained load, cost optimization | Variable load, simplified ops, rapid scaling |

**Fargate vs EC2 Launch Type Decision:**
- **Choose Fargate for:** Variable traffic, reduced operational overhead, rapid scaling without capacity planning
- **Choose EC2 for:** Sustained workloads (>80% utilization 24/7), GPU requirements, custom AMIs, cost optimization at scale

**Task Definition Example:**
```json
{
  "family": "api-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "app",
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/api:v2",
    "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
    "environment": [
      {"name": "ENVIRONMENT", "value": "production"}
    ],
    "secrets": [
      {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/api-backend",
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

**ECS Service Features:**

**Deployment Strategies:**
- **Rolling Update** - Gradually replaces tasks (configurable min/max percentages)
- **Blue/Green** - Uses CodeDeploy to shift traffic between task sets
- **External** - For custom deployment controllers (e.g., third-party tools)

**Service Auto Scaling:**
- **Target Tracking** - Maintain metric at target value (CPU, memory, ALB request count)
- **Step Scaling** - Add/remove capacity based on alarm thresholds
- **Scheduled Scaling** - Predictable traffic patterns

**Load Balancing:**
- **Application Load Balancer** - Layer 7, host/path-based routing, WebSocket support
- **Network Load Balancer** - Layer 4, ultra-low latency, millions requests/second
- **Classic Load Balancer** - Legacy (not recommended for new deployments)

**Service Discovery:**
- **AWS Cloud Map** - DNS-based service discovery
- Automatic Route 53 record creation for tasks
- Service names like `api.production.local` resolve to healthy task IPs
- Supports both A records (IP) and SRV records (port + IP)

**Real-world Scenario:** An e-commerce platform runs microservices on ECS:
- **Fargate tasks:** API gateway, authentication service (variable traffic)
- **EC2 tasks:** Order processing workers (sustained 24/7 load with Spot Instances for 70% cost savings)
- **Cloud Map:** Services discover each other via DNS (no hard-coded IPs)
- **ALB:** Routes traffic to tasks with health checks and sticky sessions

**AWS Documentation:**
- [ECS Developer Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/)
- [ECS Launch Types](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [ECS Service Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [ECS Best Practices Guide](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)

### Amazon EKS (Elastic Kubernetes Service)

Amazon EKS is a managed Kubernetes service that runs the Kubernetes control plane across multiple AZs for high availability. It's Kubernetes-conformant and certified by the CNCF, meaning standard Kubernetes applications work without modification.

**EKS Architecture:**

**Control Plane (AWS-Managed):**
- 3 etcd nodes and 2+ API server nodes across 3 AZs (minimum)
- AWS handles patching, upgrades, scaling, and backups
- Charged $0.10/hour per cluster (~$73/month)
- No direct access to control plane instances

**Data Plane (Customer-Managed):**
- Worker nodes run application pods
- Multiple node options for flexibility and cost optimization

**EKS Deployment Models:**

| Model | Control Plane | Data Plane | Use Case |
|-------|--------------|-----------|----------|
| **EKS Standard** | AWS-managed | Customer-managed | Standard K8s deployments |
| **EKS Auto Mode** | AWS-managed | AWS-managed | Fully automated infrastructure |
| **EKS Anywhere** | Customer-managed | Customer-managed | On-premises, edge locations |
| **EKS Distro** | Customer-managed | Customer-managed | Self-managed K8s with EKS components |

**Node Types for EKS Standard:**

**1. Managed Node Groups (Recommended)**
- AWS creates and manages EC2 Auto Scaling group
- Automated updates, patches, and node provisioning
- Integrated with EKS cluster lifecycle
- Supports Spot and On-Demand instances
- Simplified upgrades and rollback

**2. Self-Managed Nodes**
- Full control over node configuration, AMIs, user data
- Manual Auto Scaling group creation and management
- Use cases: Custom AMIs, specific kernel modules, compliance requirements

**3. Fargate Profiles**
- Serverless pods (no EC2 management)
- Pay per pod vCPU/memory
- Automatic scaling, no node capacity planning
- Limitations: No DaemonSets, HostNetwork, PrivilegedContainers, EBS volumes

**Node Comparison:**

| Aspect | Managed Node Groups | Self-Managed | Fargate |
|--------|-------------------|--------------|---------|
| **Ops Overhead** | Low | High | Lowest |
| **Customization** | Moderate | Full | Limited |
| **Cost** | EC2 pricing | EC2 pricing | Per-pod pricing (higher per-vCPU) |
| **Scaling** | Cluster Autoscaler, Karpenter | Manual + Cluster Autoscaler | Automatic |
| **Use Case** | Most workloads | Custom requirements | Variable workloads, isolation |

**EKS Add-ons (Managed K8s Extensions):**

**Core Add-ons:**
- **VPC CNI** - Native VPC networking (each pod gets VPC IP address via ENI)
- **CoreDNS** - Cluster DNS resolution (service.namespace.svc.cluster.local)
- **kube-proxy** - Network proxy for Service abstraction

**Storage Add-ons:**
- **EBS CSI Driver** - Persistent volumes backed by EBS (single AZ, high performance)
- **EFS CSI Driver** - Shared file storage across AZs (multi-attach, NFS)
- **FSx for Lustre CSI** - High-performance computing workloads

**Observability Add-ons:**
- **AWS Distro for OpenTelemetry (ADOT)** - Metrics and traces to CloudWatch, X-Ray
- **CloudWatch Container Insights** - Cluster, node, pod metrics
- **Amazon Managed Prometheus** - Kubernetes-native metrics
- **Amazon Managed Grafana** - Visualization

**Security Add-ons:**
- **GuardDuty Runtime Monitoring** - Threat detection for EKS workloads
- **AWS Secrets Manager CSI Driver** - Mount secrets as volumes

**GitOps/Automation Add-ons:**
- **Argo CD** - Declarative GitOps continuous deployment
- **ACK (AWS Controllers for Kubernetes)** - Manage AWS resources via K8s CRDs

**IAM Integration - IRSA (IAM Roles for Service Accounts):**

Traditional approach (not recommended):
- All pods on node share node IAM role (overly permissive)

IRSA approach (best practice):
- Each Kubernetes ServiceAccount mapped to specific IAM role
- Pod assumes role via OIDC provider
- Fine-grained permissions per workload

Example:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-read-only
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      serviceAccountName: s3-reader  # Pod inherits IAM role
```

**EKS Networking:**

**VPC CNI Plugin:**
- Each pod receives an ENI or secondary IP from VPC subnet
- Pods have native VPC connectivity (security groups, NACLs apply)
- IP address consumption: Each node pre-allocates IPs (can exhaust subnet CIDR)
- Solutions: Use larger subnets (/20 or larger), enable IPv6, use alternate CNI (Calico, Cilium)

**Service Exposure:**
- **ClusterIP** - Internal cluster access only
- **NodePort** - Exposes service on each node's IP at static port
- **LoadBalancer** - Provisions AWS NLB or ALB (requires AWS Load Balancer Controller)
- **Ingress** - Layer 7 routing via ALB Ingress Controller

**AWS Load Balancer Controller:**
- Provisions ALB for Ingress resources
- Provisions NLB for LoadBalancer Services
- Supports WAF, Cognito authentication, SSL termination
- Target types: IP mode (pods directly) or instance mode (NodePort)

**EKS Auto Scaling:**

**Horizontal Pod Autoscaler (HPA):**
- Scales pod replicas based on CPU, memory, or custom metrics
- Kubernetes-native (kubectl get hpa)

**Vertical Pod Autoscaler (VPA):**
- Adjusts pod CPU/memory requests and limits
- Useful for right-sizing workloads

**Cluster Autoscaler:**
- Adds/removes nodes based on pending pods
- Integrated with EC2 Auto Scaling groups
- Slower to scale (minutes)

**Karpenter (Recommended for EKS):**
- AWS-built, purpose-designed node autoscaler for Kubernetes
- Faster scaling than Cluster Autoscaler (seconds)
- Provisions right-sized nodes for pending pods
- Supports Spot, On-Demand, mixed instance types
- Consolidates underutilized nodes automatically

Real-world Scenario: A machine learning platform on EKS uses:
- **Managed Node Groups** with Graviton instances for cost-optimized inference (c7g instances)
- **Fargate** for CI/CD pipeline pods (variable, isolated workloads)
- **EFS CSI** for shared model storage across AZs
- **Karpenter** to provision GPU nodes (p4d instances) on-demand for training jobs
- **IRSA** to grant training jobs access to S3 datasets without node-level permissions

**AWS Documentation:**
- [EKS User Guide](https://docs.aws.amazon.com/eks/latest/userguide/)
- [EKS Best Practices Guide](https://aws.github.io/aws-eks-best-practices/)
- [EKS Networking](https://docs.aws.amazon.com/eks/latest/userguide/eks-networking.html)
- [IAM Roles for Service Accounts (IRSA)](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [Karpenter Documentation](https://karpenter.sh/)

## AWS Batch

AWS Batch is a fully managed service for running batch computing workloads at any scale. It dynamically provisions compute resources based on job requirements, eliminating the need for manual capacity management. Critical for architectures requiring large-scale parallel processing beyond Lambda's 15-minute limit.

**AWS Batch Architecture:**

AWS Batch operates on three layers:
1. **Workloads** - Batch jobs, ML training, simulations, analytics pipelines
2. **Orchestration** - ECS or EKS (Kubernetes) for container scheduling
3. **Capacity** - EC2 (On-Demand/Spot) or Fargate compute resources

**Core Components:**

**1. Job Definitions (Blueprint for Jobs)**

Specify how jobs run: container image, vCPU, memory, IAM roles, environment variables.

```json
{
  "jobDefinitionName": "genome-analysis",
  "type": "container",
  "platformCapabilities": ["EC2"],
  "containerProperties": {
    "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/genomics:v2",
    "vcpus": 8,
    "memory": 32768,
    "jobRoleArn": "arn:aws:iam::123456789012:role/BatchJobRole",
    "environment": [
      {"name": "S3_BUCKET", "value": "genomics-data"}
    ],
    "mountPoints": [
      {"sourceVolume": "scratch", "containerPath": "/scratch"}
    ],
    "volumes": [
      {"name": "scratch", "host": {"sourcePath": "/mnt/scratch"}}
    ]
  },
  "retryStrategy": {
    "attempts": 3,
    "evaluateOnExit": [
      {"onStatusReason": "OutOfMemory", "action": "RETRY"}
    ]
  },
  "timeout": {
    "attemptDurationSeconds": 86400
  }
}
```

**2. Job Queues (Where Jobs Wait)**

Priority-based queuing system connecting jobs to compute environments.

Features:
- **Priority** - Higher priority queues processed first (0-1000 scale)
- **Multiple Compute Environments** - Mix Spot and On-Demand for cost optimization
- **State Management** - Enable/disable to control job processing

Use Case: Separate queues for latency-sensitive (high priority, On-Demand) vs cost-optimized (lower priority, Spot) workloads.

**3. Compute Environments (Where Jobs Run)**

**Managed Compute Environments (Recommended):**
- AWS provisions and scales EC2 instances or Fargate capacity
- Automatic instance selection based on job requirements
- Spot Instance integration with automatic fallback to On-Demand
- No infrastructure management required

Configuration:
```json
{
  "type": "MANAGED",
  "computeResources": {
    "type": "EC2",
    "allocationStrategy": "BEST_FIT_PROGRESSIVE",
    "minvCpus": 0,
    "maxvCpus": 256,
    "desiredvCpus": 4,
    "instanceTypes": ["optimal"],
    "subnets": ["subnet-abc", "subnet-def"],
    "securityGroupIds": ["sg-123"],
    "instanceRole": "arn:aws:iam::123:instance-profile/ecsInstanceRole",
    "bidPercentage": 80,
    "spotIamFleetRole": "arn:aws:iam::123:role/AmazonEC2SpotFleetRole"
  }
}
```

**Unmanaged Compute Environments:**
- You provision and manage EC2 instances
- Use cases: Highly specialized configurations, compliance requirements
- More operational overhead

**Compute Resource Types:**

| Type | Management | Cost | Use Case |
|------|-----------|------|----------|
| **EC2** | Managed or unmanaged | On-Demand or Spot | Most batch workloads |
| **Fargate** | Fully managed | Per-task | Simplified ops, no capacity planning |
| **EKS** | Kubernetes-based | Depends on nodes | K8s-native batch workloads |

**Spot Instance Integration:**

- **Allocation Strategy:** BEST_FIT_PROGRESSIVE automatically uses lowest-cost instances
- **Bid Percentage:** Set max price as % of On-Demand (e.g., 80% = up to 80% of On-Demand price)
- **Automatic Handling:** Jobs automatically requeue if Spot instances interrupted
- **Cost Savings:** Up to 90% vs On-Demand for fault-tolerant workloads

**Use Cases:**

| Use Case | Why Batch | Configuration |
|----------|----------|---------------|
| **Media Transcoding** | Parallel processing of thousands of videos | Multi-instance, GPU instances (g5) for hardware acceleration |
| **Financial Risk Modeling** | Monte Carlo simulations requiring hours | High-memory instances (r6i), Spot for cost savings |
| **Genomics Analysis** | Compute-intensive sequence alignment | c6i instances, large-scale parallelization (1000+ concurrent jobs) |
| **Log Analysis** | Process terabytes of logs nightly | Scheduled jobs, Spot instances, S3 input/output |
| **ML Training** | Distributed training beyond Lambda limits | GPU instances (p4d), EKS orchestration, FSx for Lustre for data |
| **ETL Pipelines** | Transform and load datasets | Memory-optimized instances, CloudWatch Events triggers |

**AWS Batch vs Lambda:**

| Aspect | AWS Batch | Lambda |
|--------|-----------|--------|
| **Duration** | Unlimited (hours/days) | 15 minutes max |
| **Compute** | Any EC2 instance type, GPU | Fixed CPU tied to memory |
| **Concurrency** | Limited by compute env capacity | 1,000+ (soft limit) |
| **Pricing** | EC2/Fargate pricing (no Batch fee) | Per-request + GB-seconds |
| **Orchestration** | Built-in job queuing, dependencies | Requires Step Functions for workflows |
| **Use Case** | Long-running, resource-intensive | Event-driven, short-duration |

**Job Dependencies and Workflows:**

AWS Batch supports complex workflows:
- **Sequential:** Job B starts after Job A completes
- **Parallel:** Jobs A, B, C run concurrently
- **N-to-1:** Job D waits for Jobs A, B, C to all complete
- **Array Jobs:** Submit thousands of similar jobs (1-10,000 tasks)

Example Array Job:
```json
{
  "jobName": "video-transcode-array",
  "jobQueue": "transcoding",
  "arrayProperties": {
    "size": 5000
  },
  "jobDefinition": "transcode:1",
  "containerOverrides": {
    "environment": [
      {"name": "VIDEO_INDEX", "value": "Ref::AWS_BATCH_JOB_ARRAY_INDEX"}
    ]
  }
}
```

**Integration with AWS Services:**

- **S3** - Input/output data storage
- **ECR** - Container image registry
- **CloudWatch Events/EventBridge** - Schedule jobs, trigger on events
- **Step Functions** - Orchestrate complex multi-step workflows
- **SNS** - Job completion notifications
- **CloudWatch Logs** - Centralized logging

Real-world Scenario: A pharmaceutical company runs drug discovery simulations:
- **10,000 parallel jobs** (array job) testing molecular interactions
- **c6i.32xlarge Spot instances** for cost optimization (90% savings)
- **Job dependencies:** Preprocessing → Simulation (array) → Aggregation
- **S3** for molecular data input and results output
- **SNS** notification when full pipeline completes
- **Total cost:** $200 for analysis that would cost $2,000 with On-Demand

**AWS Documentation:**
- [AWS Batch User Guide](https://docs.aws.amazon.com/batch/latest/userguide/)
- [AWS Batch Job Definitions](https://docs.aws.amazon.com/batch/latest/userguide/job_definitions.html)
- [AWS Batch Compute Environments](https://docs.aws.amazon.com/batch/latest/userguide/compute_environments.html)
- [AWS Batch on Fargate](https://docs.aws.amazon.com/batch/latest/userguide/fargate.html)

## Auto Scaling Strategies

Auto Scaling is fundamental to building resilient, cost-optimized architectures on AWS. Understanding the different scaling policies and when to use each is critical for SAP-C02 scenarios involving dynamic workloads.

### EC2 Auto Scaling

EC2 Auto Scaling ensures you have the correct number of instances to handle application load by automatically adjusting capacity based on policies you define.

**Auto Scaling Group Components:**
- **Launch Template/Configuration** - Instance AMI, type, security groups, user data
- **Min/Max/Desired Capacity** - Boundaries and target for instance count
- **Scaling Policies** - Rules for when and how to scale
- **Health Checks** - EC2 status checks and/or ELB health checks

**Scaling Policy Types:**

**1. Target Tracking Scaling (Recommended for Most Use Cases)**

Maintains a specific metric at a target value, similar to a thermostat maintaining temperature.

How it works:
- AWS creates and manages CloudWatch alarms automatically
- Scales out when metric exceeds target
- Scales in when metric drops below target (conservative to maintain availability)
- Handles gradual scale-in to prevent over-correction

Configuration Example:
```json
{
  "TargetValue": 50.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ASGAverageCPUUtilization"
  },
  "TargetTrackingScalingPolicyConfiguration": {
    "DisableScaleIn": false
  }
}
```

Predefined Metrics:
- `ASGAverageCPUUtilization` - Average CPU across instances
- `ASGAverageNetworkIn` - Average incoming network traffic
- `ASGAverageNetworkOut` - Average outgoing network traffic
- `ALBRequestCountPerTarget` - ALB requests per instance

Custom Metrics:
- Any CloudWatch metric (e.g., queue depth, custom app metrics)
- Must scale proportionally with instance count

Best Practices:
- Set target as high as safely possible with buffer for spikes (e.g., 70% CPU for headroom)
- Use 1-minute CloudWatch metrics for faster response (enable detailed monitoring)
- Configure instance warmup time to prevent premature scale-in decisions
- Multiple target tracking policies evaluate independently - scale-out if ANY triggers, scale-in only if ALL agree

Real-world Scenario: An API service targets 60% average CPU. During traffic spike from 1,000 to 5,000 requests/second, Auto Scaling launches instances to maintain 60% CPU. After spike subsides, gradually scales in to avoid over-correction.

**2. Step Scaling**

Adds or removes instances based on alarm severity, allowing more aggressive scaling for larger deviations.

Example:
```json
{
  "MetricAggregationType": "Average",
  "AdjustmentType": "ChangeInCapacity",
  "StepAdjustments": [
    {
      "MetricIntervalLowerBound": 0,
      "MetricIntervalUpperBound": 20,
      "ScalingAdjustment": 1
    },
    {
      "MetricIntervalLowerBound": 20,
      "ScalingAdjustment": 2
    }
  ]
}
```

Interpretation:
- CPU 60-80%: Add 1 instance
- CPU >80%: Add 2 instances

When to use:
- More granular control over scaling magnitude
- Different scaling speeds for different alarm thresholds
- Legacy applications where target tracking doesn't fit

**3. Simple Scaling (Legacy - Not Recommended)**

Single adjustment when alarm triggers, then cooldown period before next action.

Limitations:
- Cooldown prevents rapid response to changing load
- Can't respond to multiple alarms simultaneously
- Replaced by step scaling and target tracking in modern architectures

**4. Scheduled Scaling**

Predictive scaling based on known traffic patterns.

Example:
```bash
aws autoscaling put-scheduled-action \
  --scheduled-action-name "ScaleUpMorning" \
  --auto-scaling-group-name my-asg \
  --recurrence "0 8 * * MON-FRI" \
  --desired-capacity 10

aws autoscaling put-scheduled-action \
  --scheduled-action-name "ScaleDownEvening" \
  --auto-scaling-group-name my-asg \
  --recurrence "0 18 * * MON-FRI" \
  --desired-capacity 2
```

When to use:
- Predictable daily/weekly patterns (business hours applications)
- Batch processing windows
- Pre-scaling before known events (marketing campaigns, product launches)

**Combining Policies:**

Best practice: Scheduled Scaling + Target Tracking
- Scheduled scaling sets baseline capacity for known patterns
- Target tracking handles unexpected spikes within that baseline

**Auto Scaling Best Practices:**

**Health Checks:**
- Enable both EC2 and ELB health checks for application-level failure detection
- Set health check grace period to allow instance initialization (300-600 seconds typical)
- Use ELB health checks to detect application failures, not just instance failures

**Lifecycle Hooks:**
- **Launching:** Perform custom actions before instance enters service (install software, register with monitoring)
- **Terminating:** Gracefully drain connections, backup data, deregister from external systems
- Timeout: 1 hour default, can extend up to 48 hours

**Instance Warmup:**
- Specify time for instance to finish initializing before counting toward metrics
- Prevents premature scale-in if new instances temporarily show low utilization
- Set based on application startup time (e.g., 180 seconds for containerized apps)

**Cooldown Periods (Simple/Step Scaling):**
- Prevents thrashing (rapid scale-out then scale-in)
- Default 300 seconds
- Target tracking manages this automatically

**Monitoring:**
- Enable detailed (1-minute) CloudWatch metrics for faster reaction
- Monitor `GroupDesiredCapacity`, `GroupInServiceInstances`, `GroupPendingInstances`
- Set alarms for scaling activity failures

**Mixed Instance Types and Spot:**

Auto Scaling supports mixing On-Demand and Spot instances for cost optimization.

```json
{
  "MixedInstancesPolicy": {
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 20,
      "SpotAllocationStrategy": "capacity-optimized"
    },
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {...},
      "Overrides": [
        {"InstanceType": "m5.large"},
        {"InstanceType": "m5a.large"},
        {"InstanceType": "m6i.large"}
      ]
    }
  }
}
```

Configuration:
- **OnDemandBaseCapacity:** Minimum On-Demand instances (for baseline stability)
- **OnDemandPercentageAboveBaseCapacity:** % of additional capacity as On-Demand
- **SpotAllocationStrategy:** `capacity-optimized` or `price-capacity-optimized` (recommended)

Example: Base of 2 On-Demand, 20% On-Demand above base. If desired capacity is 12:
- 2 On-Demand (base)
- 2 On-Demand (20% of remaining 10)
- 8 Spot (80% of remaining 10)
- Total: 4 On-Demand + 8 Spot = 70% cost savings

**AWS Documentation:**
- [EC2 Auto Scaling User Guide](https://docs.aws.amazon.com/autoscaling/ec2/userguide/)
- [Target Tracking Scaling Policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html)
- [Step Scaling Policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html)
- [Lifecycle Hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Mixed Instances Policy](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)

### Container Auto Scaling

Container workloads have unique scaling requirements due to their lightweight, ephemeral nature.

**ECS Service Auto Scaling:**

ECS integrates with Application Auto Scaling for task-level scaling.

Scaling Policies (same as EC2):
- **Target Tracking** - Maintain average CPU, memory, or ALB request count per task
- **Step Scaling** - Scale based on CloudWatch alarm thresholds
- **Scheduled Scaling** - Time-based capacity adjustments

Example Target Tracking:
```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

Critical Consideration:
- **EC2 Launch Type:** Also requires EC2 Auto Scaling for cluster capacity (Capacity Providers solve this)
- **Fargate Launch Type:** Only service-level scaling needed (infinite capacity)

**Capacity Providers (ECS):**
Manage scaling relationship between tasks and underlying infrastructure.

Example:
```json
{
  "capacityProviders": ["FARGATE", "FARGATE_SPOT", "my-ec2-capacity-provider"],
  "defaultCapacityProviderStrategy": [
    {"capacityProvider": "FARGATE", "weight": 1, "base": 2},
    {"capacityProvider": "FARGATE_SPOT", "weight": 4}
  ]
}
```

Interpretation: 2 base tasks on Fargate, then 80% on Fargate Spot, 20% on Fargate (cost optimization).

**EKS Auto Scaling:**

**Horizontal Pod Autoscaler (HPA):**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

Scales pod replicas based on CPU, memory, or custom metrics (via metrics server).

**Vertical Pod Autoscaler (VPA):**
Automatically adjusts CPU and memory requests/limits based on actual usage.

Use Case: Right-size workloads without manual tuning. VPA analyzes historical usage and recommends or automatically applies resource adjustments.

**Cluster Autoscaler vs Karpenter:**

| Aspect | Cluster Autoscaler | Karpenter |
|--------|-------------------|-----------|
| **Scaling Speed** | Minutes (slower) | Seconds (faster) |
| **Node Selection** | Pre-defined ASG instance types | Dynamically selects optimal instance type |
| **Consolidation** | Manual | Automatic (bin-packing, replacing underutilized nodes) |
| **Spot Support** | Via ASG mixed policy | Native, seamless Spot/On-Demand mixing |
| **Recommendation** | Legacy | Preferred for EKS |

**AWS Documentation:**
- [ECS Service Auto Scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [EKS Autoscaling](https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html)
- [Karpenter](https://karpenter.sh/)

## Spot Instances and Spot Fleet

Spot Instances allow you to use spare EC2 capacity at up to 90% discount compared to On-Demand pricing, making them ideal for fault-tolerant, flexible workloads.

**Spot Instance Characteristics:**

- **Pricing:** Variable, based on supply and demand (updated every 5 minutes)
- **Interruption:** AWS can reclaim with 2-minute warning (EC2 instance metadata + CloudWatch Events)
- **Interruption Behavior:** Terminate, stop, or hibernate (configurable)
- **Rebalance Recommendation:** Proactive signal indicating elevated interruption risk

**Spot Interruption Handling:**

Best Practices:
1. **Monitor Instance Metadata:** Poll `http://169.254.169.254/latest/meta-data/spot/instance-action` every 5 seconds
2. **CloudWatch Events:** Subscribe to `EC2 Spot Instance Interruption Warning` event
3. **Graceful Shutdown:** 2-minute window to save state, drain connections, deregister from load balancer
4. **Capacity Rebalancing:** Auto Scaling can proactively launch replacement before interruption

**Spot Fleet:**

Manages a fleet of Spot and optionally On-Demand instances to maintain target capacity.

Configuration:
```json
{
  "TargetCapacity": 100,
  "OnDemandTargetCapacity": 20,
  "SpotTargetCapacity": 80,
  "LaunchTemplateConfigs": [
    {
      "LaunchTemplateSpecification": {...},
      "Overrides": [
        {"InstanceType": "m5.large", "SubnetId": "subnet-a", "AvailabilityZone": "us-east-1a"},
        {"InstanceType": "m5a.large", "SubnetId": "subnet-b", "AvailabilityZone": "us-east-1b"},
        {"InstanceType": "m6i.large", "SubnetId": "subnet-c", "AvailabilityZone": "us-east-1c"}
      ]
    }
  ],
  "AllocationStrategy": "price-capacity-optimized"
}
```

**Allocation Strategies:**

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **lowestPrice** | Launch instances from lowest-price Spot pools | Maximum cost savings, higher interruption risk |
| **diversified** | Distribute across all specified pools evenly | Balanced availability across instance types/AZs |
| **capacity-optimized** | Launch from pools with most available capacity | Minimize interruptions (recommended for most workloads) |
| **price-capacity-optimized** | Balance lowest price + optimal capacity | Best of both worlds (recommended for cost + reliability) |

**Exam Tip:** `capacity-optimized` and `price-capacity-optimized` significantly reduce interruption rates compared to `lowestPrice`.

**Spot Best Practices:**

1. **Diversify Instance Types:** Use multiple instance types (same performance class) across AZs
2. **Flexible Application:** Design for interruption (stateless, checkpointing, graceful degradation)
3. **Combine with On-Demand:** Use On-Demand base capacity + Spot for scale (see Mixed Instances Policy)
4. **Monitor Savings:** CloudWatch metric `SpotInstanceRequestFulfillment`, billing reports
5. **Capacity Rebalancing:** Enable in Auto Scaling to proactively replace at-risk instances

**Spot Integration with AWS Services:**

- **Auto Scaling Groups:** Mixed Instances Policy with capacity-optimized allocation
- **ECS:** Spot capacity provider for task execution (automatic handling of interruptions)
- **EKS:** Karpenter or managed node groups with Spot instances
- **EMR:** Spot for task nodes (core nodes should be On-Demand for HDFS reliability)
- **AWS Batch:** Managed compute environments with Spot (automatic job requeue on interruption)

Real-world Scenario: A media processing pipeline runs on Auto Scaling with mixed instances:
- **2 On-Demand** m5.large (baseline for critical encoding jobs)
- **10 Spot** instances (m5.large, m5a.large, m6i.large) with capacity-optimized allocation
- **70% cost savings** vs all On-Demand
- **<5% interruption rate** due to diversification and capacity-optimized strategy

**AWS Documentation:**
- [EC2 Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Spot Fleet](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-fleet.html)
- [Spot Instance Interruptions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-interruptions.html)
- [Spot Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html)

## SAP-C02 Exam Tips

Critical knowledge areas for the Solutions Architect Professional certification:

1. **EC2 Instance Family Selection**
   - **General Purpose (M):** Balanced workloads, default choice for most applications
   - **Compute Optimized (C):** CPU-intensive (batch, HPC, gaming servers, ML inference)
   - **Memory Optimized (R, X, U):** In-memory databases, big data analytics, SAP HANA
   - **Storage Optimized (I, D):** NoSQL databases, data warehousing, high IOPS requirements
   - **Accelerated Computing (P, G, Inf, Trn):** ML training/inference, GPU workloads

2. **AWS Graviton Processors**
   - Up to 40% better price-performance vs x86 (Intel/AMD)
   - Available in T4g, M7g/M8g, C7g/C8g, R7g/R8g families
   - Best for: Cloud-native applications, open-source software, containerized workloads
   - Limitation: ARM architecture (requires compatible binaries)

3. **Lambda Critical Limits**
   - **15-minute timeout** - Hard limit, use Step Functions/Batch for longer jobs
   - **10 GB memory max** - CPU scales with memory (1,769 MB = 1 vCPU)
   - **6 MB payload (sync), 256 KB (async)** - Use S3 for large data transfers
   - **1,000 concurrent executions** - Soft limit, can increase to tens of thousands
   - **VPC cold start eliminated** - Hyperplane ENIs (but still adds ~1-2s vs non-VPC)

4. **ECS vs EKS Decision Matrix**
   - **Choose ECS when:** AWS-native, no K8s expertise, cost-sensitive (no control plane fee), simpler operations
   - **Choose EKS when:** Kubernetes expertise exists, portability required, complex orchestration needs, compliance mandates K8s
   - **Control plane cost:** ECS free, EKS $0.10/hour (~$73/month per cluster)

5. **Fargate Use Cases**
   - Serverless containers (no EC2 management)
   - Variable/unpredictable traffic patterns
   - Rapid scaling without capacity planning
   - **Not for:** GPU workloads, sustained high-utilization (EC2 more cost-effective), custom AMIs

6. **AWS Batch Scenarios**
   - Long-running jobs (hours/days) beyond Lambda's 15-minute limit
   - Large-scale parallel processing (thousands of concurrent jobs)
   - Resource-intensive workloads needing GPU/high-memory instances
   - Built-in job dependencies and retry logic

7. **Placement Groups**
   - **Cluster:** Single AZ, low latency (<100μs), HPC, ML training - sacrifice availability for performance
   - **Spread:** Max 7 per AZ, distinct hardware, critical instances - sacrifice scale for reliability
   - **Partition:** Up to 7 partitions per AZ, distributed systems (Hadoop, Cassandra, Kafka) - balance scale and fault isolation

8. **Spot Instance Strategy**
   - **capacity-optimized or price-capacity-optimized allocation** - Reduces interruptions by 50-90% vs lowestPrice
   - **Diversify instance types** - Multiple types in same performance class across AZs
   - **2-minute interruption warning** - Design for graceful shutdown
   - **Use with:** Auto Scaling (mixed policy), ECS, Batch, EMR task nodes

9. **Auto Scaling Policy Selection**
   - **Target Tracking (recommended):** Simplest, automatic CloudWatch alarm management, hands-off scaling
   - **Step Scaling:** More control, different actions for different thresholds
   - **Scheduled Scaling:** Predictable patterns (business hours, batch windows)
   - **Combine:** Scheduled (baseline) + Target Tracking (dynamic)

10. **Key Architectural Trade-offs**
    - **Lambda vs Fargate:** Lambda for <15 min event-driven, Fargate for long-running containers
    - **Fargate vs EC2:** Fargate for ops simplicity, EC2 for cost at scale (>80% utilization)
    - **On-Demand vs Spot:** On-Demand for stateful/critical, Spot for fault-tolerant (70-90% savings)
    - **Graviton vs x86:** Graviton for cost, x86 for compatibility/legacy software

## Common SAP-C02 Scenarios

**"Design a compute solution for unpredictable, event-driven workload processing images uploaded to S3"**
- **Answer:** Lambda triggered by S3 events
- **Rationale:** Serverless, automatic scaling, pay-per-invocation, no idle capacity costs
- **Considerations:** 15-min limit, 10 GB memory limit (use Step Functions + Fargate for larger images)

**"Optimize cost for 24/7 batch processing jobs requiring 8-12 hours each"**
- **Answer:** AWS Batch with Spot Instances (capacity-optimized allocation)
- **Rationale:** No duration limits, Spot provides 70-90% savings, automatic job requeue on interruption
- **Considerations:** Jobs must be fault-tolerant, use checkpointing for long jobs

**"Migrate existing on-premises Kubernetes cluster to AWS with minimal changes"**
- **Answer:** Amazon EKS with Managed Node Groups
- **Rationale:** Kubernetes-conformant, reuse existing K8s manifests and Helm charts, managed control plane
- **Considerations:** $0.10/hour control plane cost, VPC IP consumption (use larger subnets)

**"Deploy microservices architecture for AWS-native startup with no container experience"**
- **Answer:** Amazon ECS with Fargate launch type + ALB
- **Rationale:** Serverless containers, no infrastructure management, deep AWS integration, no control plane cost
- **Considerations:** ECS learning curve lower than K8s, AWS-specific (not portable)

**"High-performance computing cluster for molecular dynamics simulations requiring <100 microsecond latency"**
- **Answer:** EC2 cluster placement group with c7g.metal or hpc7g instances + EFA (Elastic Fabric Adapter)
- **Rationale:** Cluster placement packs instances in same rack, EFA provides ultra-low latency, HPC-optimized instances
- **Considerations:** Single AZ only (no HA), launch all instances simultaneously to avoid capacity constraints

**"Cost-optimize sustained 24/7 web application backend with consistent traffic"**
- **Answer:** EC2 Savings Plans or Reserved Instances with Graviton instances (m7g family)
- **Rationale:** Savings Plans provide up to 72% savings, Graviton adds 40% better price-performance
- **Considerations:** Commit to 1- or 3-year term, ensure application supports ARM architecture

**"Real-time data processing pipeline ingesting millions of events per second from Kinesis"**
- **Answer:** Lambda with Kinesis event source mapping (parallel processing per shard) or ECS with Kinesis Client Library
- **Rationale:** Lambda auto-scales with shard count, built-in retry and error handling
- **Considerations:** Monitor IteratorAge (<30s), configure batch size/window, use partial batch response for failures

**"Large-scale genomic analysis processing 10,000 samples with varying compute requirements"**
- **Answer:** AWS Batch array jobs with "optimal" instance types + Spot allocation
- **Rationale:** Array jobs scale to 10,000 tasks, Batch selects optimal instance types per job, Spot reduces cost by 90%
- **Considerations:** Store intermediate results in S3, use retry logic for Spot interruptions

**"Deploy critical database cluster requiring maximum isolation from hardware failures"**
- **Answer:** EC2 spread placement group across 3 AZs (max 7 instances per AZ = 21 total)
- **Rationale:** Each instance on distinct hardware, protects from correlated failures
- **Considerations:** 7-instance-per-AZ limit, combine with Multi-AZ for AZ-level fault tolerance

**"API with highly variable traffic: 100 requests/hour at night, 50,000 requests/hour during business hours"**
- **Answer:** Lambda with API Gateway + Provisioned Concurrency (if needed for latency)
- **Rationale:** Lambda scales from zero, pay only for actual usage, no idle capacity costs
- **Alternative:** ECS Fargate with target tracking auto scaling (if workload exceeds Lambda limits)

**AWS Documentation:**
- [AWS Compute Services Overview](https://aws.amazon.com/products/compute/)
- [AWS Well-Architected Framework - Performance Efficiency Pillar](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/)
- [Compute Services Comparison](https://aws.amazon.com/getting-started/decision-guides/compute-services-decision-guide/)
