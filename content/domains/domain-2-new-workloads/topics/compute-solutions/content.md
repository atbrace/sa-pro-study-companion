---
title: Compute Solutions and Deployment Strategies
lastUpdated: 2026-01-05
---

# Compute Solutions and Deployment Strategies

Selecting the right compute service is fundamental to designing solutions for new workloads on AWS. This topic covers EC2, Lambda, containers, and batch processing.

## EC2 Instance Types and Families

### Instance Families

| Family | Type | Use Case | Examples |
|--------|------|----------|----------|
| **General Purpose** | T, M | Balanced workloads | t3, t4g, m5, m6i, m7g |
| **Compute Optimized** | C | CPU-intensive | c5, c6i, c7g |
| **Memory Optimized** | R, X, High Memory | Memory-intensive | r5, r6i, x2idn, u-*tb1 |
| **Storage Optimized** | I, D, H | High IOPS, throughput | i3, i4i, d3, h1 |
| **Accelerated Computing** | P, G, F, Inf | GPU, FPGA, ML inference | p4, g5, f1, inf2 |

### Key Instance Types for SAP-C02

**T3/T4g (Burstable)**:
- Baseline CPU with burst credits
- Cost-effective for variable workloads
- T4g uses Graviton (ARM) - 20% cheaper

**M5/M6i (General Purpose)**:
- Balanced compute, memory, networking
- Most common workload choice

**C5/C6i (Compute Optimized)**:
- High-performance processors
- Batch processing, gaming, scientific modeling

**R5/R6i (Memory Optimized)**:
- Large memory-to-CPU ratio
- Databases, in-memory analytics

**I3/I4i (Storage Optimized)**:
- NVMe SSD instance storage
- NoSQL databases, data warehousing

**P4 (GPU)**:
- ML training, HPC
- Multiple GPUs per instance

> 📚 [EC2 Instance Types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html)

### Placement Groups

**Cluster** - Low latency, high throughput within single AZ:
```
Use case: HPC, tightly coupled workloads
Limitation: Single AZ only
```

**Spread** - Each instance on different hardware (max 7 per AZ):
```
Use case: Critical instances, reduce correlated failures
Limitation: 7 instances per AZ per group
```

**Partition** - Groups of instances on separate partitions:
```
Use case: Distributed systems (Hadoop, Cassandra, Kafka)
Benefit: Up to 7 partitions per AZ
```

## AWS Lambda

### Execution Model

**Key Characteristics**:
- Serverless, event-driven
- Max execution: 15 minutes
- Memory: 128 MB - 10 GB
- Ephemeral storage: 512 MB - 10 GB (/tmp)
- CPU scales with memory

**Pricing**: Pay per request + duration (GB-seconds)

### Lambda Optimization Strategies

**1. Memory Allocation**:
```
More memory = More CPU
Sweet spot often 1024-1536 MB
Use Lambda Power Tuning tool
```

**2. Cold Start Reduction**:
- Provisioned Concurrency - pre-warmed instances
- SnapStart (Java) - cached initialization snapshots
- Keep functions warm with scheduled events

**3. Execution Optimization**:
```python
# Initialize outside handler (reused across invocations)
import boto3
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('MyTable')

def lambda_handler(event, context):
    # Handler code here
    return response
```

**4. VPC Optimization**:
- Hyperplane ENIs - no more VPC cold start penalty
- Still adds latency vs non-VPC Lambda

### Lambda Limits

| Limit | Value |
|-------|-------|
| Timeout | 15 minutes |
| Memory | 128 MB - 10 GB |
| /tmp storage | 512 MB - 10 GB |
| Deployment package | 50 MB (zipped), 250 MB (unzipped) |
| Concurrent executions | 1000 (soft limit per region) |
| Burst concurrency | 500-3000 (region dependent) |

> 📚 [Lambda Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)

### Event Sources

- **S3** - Object uploads
- **DynamoDB Streams** - Table changes
- **Kinesis** - Stream processing
- **SQS** - Queue processing
- **EventBridge** - Scheduled or custom events
- **API Gateway** - HTTP requests
- **ALB** - Application Load Balancer targets

## Container Services

### ECS vs EKS Comparison

| Feature | ECS | EKS |
|---------|-----|-----|
| **Orchestration** | AWS proprietary | Kubernetes |
| **Learning curve** | Easier | Steeper |
| **AWS integration** | Native | Good (via AWS integrations) |
| **Portability** | AWS-specific | Multi-cloud (K8s standard) |
| **Control plane cost** | Free | $0.10/hour per cluster |
| **Use case** | AWS-native apps | K8s expertise, portability |

### Amazon ECS

**Launch Types**:

**1. EC2 Launch Type**:
```
You manage EC2 instances
Lower cost for sustained workloads
More control over infrastructure
```

**2. Fargate Launch Type**:
```
Serverless containers
No instance management
Pay per task (vCPU + memory)
Easier operations
```

**Task Definition**: Blueprint for your application:
```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "web",
    "image": "nginx:latest",
    "portMappings": [{"containerPort": 80}]
  }]
}
```

**ECS Service**: Maintains desired count of tasks:
- Auto Scaling based on metrics
- Load balancer integration
- Rolling updates
- Service discovery via Cloud Map

### Amazon EKS

**Components**:
- **Control Plane** - Managed Kubernetes control plane (3 masters across 3 AZs)
- **Data Plane** - Worker nodes (EC2 or Fargate)
- **VPC CNI** - Native VPC networking for pods

**Node Types**:
1. **Managed Node Groups** - AWS manages EC2 instances
2. **Self-managed nodes** - You manage EC2 instances
3. **Fargate profiles** - Serverless pods

**Add-ons**:
- VPC CNI - Networking
- CoreDNS - DNS
- kube-proxy - Networking
- EBS CSI driver - Persistent storage
- EFS CSI driver - Shared storage

### Service Discovery

**ECS Service Discovery**:
```
Uses AWS Cloud Map
Creates Route 53 records automatically
Service names: service-name.namespace
```

**EKS Service Discovery**:
```
CoreDNS for internal (service.namespace.svc.cluster.local)
AWS Load Balancer Controller for external
```

## AWS Batch

For large-scale batch computing workloads.

**Components**:

**1. Job Definitions** - How to run jobs:
```json
{
  "jobDefinitionName": "data-processing",
  "type": "container",
  "containerProperties": {
    "image": "my-processor:latest",
    "vcpus": 4,
    "memory": 8192
  }
}
```

**2. Job Queues** - Where jobs wait:
- Priority-based scheduling
- Multiple compute environments

**3. Compute Environments** - Where jobs run:
- **Managed** - AWS manages instances
- **Unmanaged** - You manage instances
- Can use Spot Instances for cost savings

**Use Cases**:
- Media transcoding
- Financial modeling
- Genomics analysis
- Log analysis
- ETL workloads

**vs Lambda**:
- Batch: Long-running (hours/days), resource-intensive
- Lambda: Short-lived (<15 min), event-driven

## Auto Scaling Strategies

### EC2 Auto Scaling

**Scaling Policies**:

**1. Target Tracking**:
```json
{
  "TargetValue": 50.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ASGAverageCPUUtilization"
  }
}
```
Maintains metric at target value (e.g., 50% CPU).

**2. Step Scaling**:
```
Add 2 instances when CPU > 60%
Add 4 instances when CPU > 80%
Remove 1 instance when CPU < 40%
```

**3. Simple Scaling**:
```
Add 1 instance when alarm triggers
Cooldown period before next action
```

**4. Scheduled Scaling**:
```
Scale up at 8 AM weekdays
Scale down at 6 PM weekdays
```

**Best Practices**:
- Use target tracking for most cases
- Set appropriate cooldown periods
- Use lifecycle hooks for graceful shutdown
- Enable detailed monitoring (1-min metrics)

### Container Auto Scaling

**ECS Service Auto Scaling**:
- Target tracking (CPU, memory, ALB request count)
- Step scaling
- Scheduled scaling

**EKS**:
- **Horizontal Pod Autoscaler (HPA)** - Scale pods based on metrics
- **Vertical Pod Autoscaler (VPA)** - Adjust pod resource requests
- **Cluster Autoscaler** - Scale EC2 nodes
- **Karpenter** - More efficient node scaling than Cluster Autoscaler

## Deployment Strategies

### Blue/Green Deployment

```
Blue (current): v1.0 → 100% traffic
Green (new):    v2.0 → 0% traffic

Test green environment
Switch traffic: Blue 0%, Green 100%
Keep blue for rollback
```

**Implementation**:
- ECS: Create new task definition, update service
- EC2: Use two Auto Scaling groups, swap in ALB target groups
- Lambda: Use aliases and versions

### Canary Deployment

```
v1.0 → 90% traffic
v2.0 → 10% traffic (canary)

Monitor metrics
Gradually increase v2.0: 25%, 50%, 100%
```

**Implementation**:
- API Gateway: Canary deployments built-in
- Lambda: Weighted aliases
- ALB: Weighted target groups

### Rolling Deployment

```
Update instances incrementally
At any time, both versions running
Gradual rollout minimizes risk
```

**ECS Rolling Update**:
```json
{
  "deploymentConfiguration": {
    "minimumHealthyPercent": 75,
    "maximumPercent": 200
  }
}
```

## Spot Instances and Spot Fleet

**Spot Instances**:
- Up to 90% discount vs On-Demand
- Can be interrupted with 2-minute warning
- Best for fault-tolerant workloads

**Spot Fleet**:
```
Mix of Spot and On-Demand instances
Multiple instance types and AZs
Maintains target capacity
```

**Allocation Strategies**:
- **lowestPrice** - Launch lowest price pools
- **diversified** - Distribute across pools
- **capacityOptimized** - Launch in pools with lowest interruption risk (recommended)
- **priceCapacityOptimized** - Balance price and capacity

**Use with**:
- Auto Scaling groups (mixed instances policy)
- ECS tasks
- EMR clusters
- Batch compute environments

## Exam Tips

1. **Instance selection** - Know which family for which workload
2. **Graviton** - 40% better price/performance (T4g, M7g, C7g, R7g)
3. **Lambda limits** - 15 min timeout, 10 GB memory max
4. **ECS vs EKS** - ECS for simplicity, EKS for portability/K8s skills
5. **Fargate** - Serverless containers, no instance management
6. **Batch** - Large-scale batch processing, can run for hours/days
7. **Placement groups** - Cluster for low latency, spread for reliability
8. **Spot** - Fault-tolerant workloads, capacity-optimized allocation
9. **Auto Scaling** - Target tracking for most cases
10. **Blue/green** - Zero-downtime deployments with quick rollback

## Common Scenarios

**"Design a compute solution for unpredictable, event-driven workload"**:
→ Lambda (serverless, automatic scaling, pay per use)

**"Long-running batch processing jobs"**:
→ AWS Batch with Spot Instances

**"Migrate existing Kubernetes workloads to AWS"**:
→ EKS (K8s compatibility)

**"Simple containerized microservices, AWS-native"**:
→ ECS with Fargate (serverless, easy operations)

**"High-performance computing requiring low network latency"**:
→ EC2 cluster placement group with enhanced networking

**"Cost-optimize sustained compute workload"**:
→ EC2 with Savings Plans or Reserved Instances, consider Graviton

> 📚 [AWS Compute Services Overview](https://aws.amazon.com/products/compute/)
