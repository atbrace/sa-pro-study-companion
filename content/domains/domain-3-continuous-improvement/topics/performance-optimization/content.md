---
title: Performance Optimization
lastUpdated: 2026-01-05
---

# Performance Optimization

Optimizing performance for existing AWS solutions requires a comprehensive understanding of caching strategies, database optimization techniques, compute right-sizing, and network performance improvements. This topic covers the key services and patterns for the SAP-C02 exam.

## CloudFront Caching and Optimization

### Cache Behaviors

CloudFront uses cache behaviors to determine how requests are processed based on path patterns.

**Key Concepts:**
- Each behavior has a path pattern (e.g., `/images/*`, `/api/*`)
- Behaviors are evaluated in priority order (top to bottom)
- Default behavior catches all unmatched requests
- Different origins can be specified per behavior

> 📚 [CloudFront Cache Behaviors](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesCacheBehavior)

### Cache Key Configuration

The cache key determines what makes requests unique for caching purposes.

**Cache Key Components:**
- Query strings (all, none, or whitelist)
- Headers (Host, CloudFront-* headers, custom headers)
- Cookies (all, none, or whitelist)
- Origin request policy vs. cache policy separation

**Cache Policies vs. Origin Request Policies:**
- **Cache Policy** - Defines what's included in the cache key
- **Origin Request Policy** - Defines what's sent to origin (may include more than cache key)
- Separation allows caching identical content while passing origin-specific headers

```json
{
  "CachePolicy": {
    "QueryStringsConfig": {
      "QueryStringBehavior": "whitelist",
      "QueryStrings": ["product-id", "category"]
    },
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": ["CloudFront-Viewer-Country"]
    }
  }
}
```

### Cache Optimization Strategies

**TTL Configuration:**
- Minimum TTL: Floor for cache duration
- Maximum TTL: Ceiling for cache duration
- Default TTL: Used when origin doesn't specify
- Origin headers (`Cache-Control`, `Expires`) can override default TTL

**Cache Hit Ratio Improvement:**
- Minimize cache key components (fewer variations = higher hit ratio)
- Use cache policies instead of legacy behaviors
- Normalize query string parameters
- Avoid including session cookies in cache key
- Use separate distributions for dynamic vs. static content

> 📚 [Optimizing Cache Hit Ratio](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html)

### Cache Invalidation

**Invalidation Methods:**
1. **CloudFront Invalidation** - Submit invalidation request (cost: first 1,000 paths/month free)
2. **Versioned Objects** - Change object name/path (preferred for static assets)
3. **Short TTL** - Objects expire naturally (for frequently changing content)

**Invalidation Patterns:**
```bash
# Invalidate specific files
/images/logo.png
/css/styles.css

# Invalidate directory and all files
/images/*

# Invalidate everything (expensive, avoid)
/*
```

**Best Practice:** Use versioned file names (e.g., `style.v2.css`, `logo-20240105.png`) instead of invalidations for better performance and lower cost.

## ElastiCache and DAX

### ElastiCache for Redis vs. Memcached

| Feature | Redis | Memcached |
|---------|-------|-----------|
| **Data Types** | Strings, lists, sets, sorted sets, hashes | Simple key-value strings only |
| **Persistence** | Yes (AOF, RDS snapshots) | No |
| **Replication** | Multi-AZ with automatic failover | Multi-node (no replication) |
| **Backup/Restore** | Yes | No |
| **Clustering** | Redis Cluster (sharding) | Multi-threaded, horizontal scaling |
| **Pub/Sub** | Yes | No |
| **Lua Scripting** | Yes | No |
| **Use Case** | Complex data structures, persistence, HA | Simple caching, multi-threaded performance |

> 📚 [ElastiCache Comparison](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/SelectEngine.html)

### Redis Cluster Mode

**Cluster Mode Disabled:**
- Single primary node with 0-5 read replicas
- All data on single shard
- Simpler configuration
- Limited scalability

**Cluster Mode Enabled:**
- Data partitioned across multiple shards
- Each shard has primary + replicas
- Horizontal scaling up to 500 nodes
- Automatic failover per shard

### ElastiCache Caching Strategies

**Lazy Loading (Cache-Aside):**
```python
def get_user(user_id):
    # Check cache first
    cached = redis.get(f"user:{user_id}")
    if cached:
        return cached

    # Cache miss - query database
    user = db.query(user_id)

    # Populate cache
    redis.set(f"user:{user_id}", user, ex=3600)
    return user
```

**Write-Through:**
```python
def update_user(user_id, data):
    # Update database
    db.update(user_id, data)

    # Update cache immediately
    redis.set(f"user:{user_id}", data, ex=3600)
```

**Adding TTL:**
- Always set TTL to avoid stale data
- Balance between freshness and cache hit ratio
- Different TTLs for different data types

### DynamoDB Accelerator (DAX)

DAX is a fully managed, in-memory cache for DynamoDB.

**Key Features:**
- Microsecond latency for cached reads
- Write-through caching
- No application code changes (compatible with DynamoDB API)
- Item cache and query cache
- Up to 10x performance improvement

**DAX vs. ElastiCache:**
- **DAX** - Specifically for DynamoDB, drop-in replacement, managed cache invalidation
- **ElastiCache** - General purpose, requires cache invalidation logic, more control

**When to Use DAX:**
- Eventually consistent reads predominate
- Repeated reads of same items
- Read-heavy workloads with hot keys
- Microsecond response time required

> 📚 [DynamoDB DAX](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)

**DAX Architecture:**
```
Application → DAX Cluster → DynamoDB Table
              (Item Cache)
              (Query Cache)
```

## Database Performance Optimization

### RDS Performance

**Read Replicas:**
- Asynchronous replication from primary
- Up to 15 read replicas (Aurora), 5 (other engines)
- Cross-region replicas supported
- Can be promoted to standalone instance
- Use cases: Read scaling, analytics, disaster recovery

**RDS Proxy:**
- Connection pooling and management
- Reduces database connection overhead
- Improves application scalability
- Enforces IAM authentication
- Automatic failover (25x faster than DNS)

**Performance Insights:**
- Visual dashboard for database performance
- Identify top SQL queries by load
- Wait event analysis
- Free tier: 7 days retention
- Long-term retention available

> 📚 [RDS Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)

**Query Optimization:**
- Enable slow query logs
- Analyze execution plans
- Add appropriate indexes
- Use parameter groups for tuning
- Consider Aurora for better performance

### DynamoDB Performance

**Partition Key Design:**
- High cardinality partition keys (many unique values)
- Uniform access patterns across partitions
- Avoid hot partitions
- Use composite keys when needed

**Example - Poor Design:**
```
Partition Key: "status" (only 3 values: pending, active, inactive)
→ Hot partitions, throttling likely
```

**Example - Good Design:**
```
Partition Key: "user_id" (millions of unique users)
→ Even distribution, good performance
```

**Global Secondary Indexes (GSI):**
- Alternative partition and sort keys
- Query on non-key attributes
- Eventually consistent
- Separate RCU/WCU provisioning
- Up to 20 GSIs per table

**Local Secondary Indexes (LSI):**
- Alternative sort key, same partition key
- Strongly consistent reads possible
- Must be created at table creation
- Share RCU/WCU with base table
- Up to 5 LSIs per table

**Capacity Modes:**
- **On-Demand** - Pay per request, automatic scaling, unpredictable workloads
- **Provisioned** - Set RCU/WCU, auto-scaling available, predictable workloads, lower cost

**DynamoDB Streams:**
- Capture item-level changes
- Enable event-driven architectures
- Process with Lambda
- 24-hour retention

> 📚 [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## Compute Optimizer Recommendations

AWS Compute Optimizer analyzes resource configurations and usage to provide optimization recommendations.

**Supported Resources:**
- EC2 instances
- Auto Scaling groups
- EBS volumes
- Lambda functions

**Recommendation Types:**
- **Under-provisioned** - Resource constraints, recommend larger size
- **Over-provisioned** - Underutilized, recommend smaller size
- **Optimized** - Current configuration is appropriate

**Metrics Analyzed:**
- CPU utilization
- Memory utilization (requires CloudWatch agent)
- Network throughput
- EBS IOPS
- Lambda duration and memory

**Implementation:**
1. Enable Compute Optimizer
2. Install CloudWatch agent for memory metrics
3. Wait 14+ days for analysis
4. Review recommendations in console/API
5. Test recommended configurations
6. Implement changes via console, CLI, or IaC

> 📚 [AWS Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)

**Cost Optimization:**
- Projected savings estimates
- Performance risk indicators (low, medium, high)
- Historical utilization graphs

## Network Performance

### AWS Global Accelerator

Global Accelerator provides static anycast IP addresses that route traffic to optimal AWS endpoints.

**Key Features:**
- Two static anycast IPs
- Traffic routed over AWS global network (not internet)
- Automatic failover (within 30 seconds)
- Health checks and traffic dials
- DDoS protection via AWS Shield

**Global Accelerator vs. CloudFront:**

| Feature | Global Accelerator | CloudFront |
|---------|-------------------|------------|
| **Use Case** | TCP/UDP applications, gaming, IoT | HTTP/HTTPS content delivery |
| **Caching** | No caching | Caches at edge |
| **IP Addresses** | Static anycast IPs | Dynamic edge IPs |
| **Protocol** | TCP, UDP | HTTP, HTTPS, WebSocket |
| **Failover** | Instant (health checks) | DNS-based |

**Architecture:**
```
User → Anycast IP → AWS Edge Location →
AWS Global Network → Application Endpoint (ALB, NLB, EC2, EIP)
```

> 📚 [AWS Global Accelerator](https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html)

### VPC Endpoints

VPC endpoints enable private connectivity to AWS services without internet gateways or NAT.

**Interface Endpoints (AWS PrivateLink):**
- Powered by AWS PrivateLink
- Elastic network interface with private IP
- Supports most AWS services
- Charged per endpoint per AZ per hour + data processing
- Security groups apply

**Gateway Endpoints:**
- Route table target
- Only for S3 and DynamoDB
- No hourly charges, no data processing charges
- Highly available, no bandwidth constraints

**Benefits:**
- Reduced data transfer costs (no NAT gateway charges)
- Improved security (traffic stays on AWS network)
- Better performance (lower latency, higher throughput)
- Simplified network architecture

**Example Use Case:**
```
Lambda in VPC → VPC Endpoint → S3
(No NAT Gateway required, lower latency, lower cost)
```

> 📚 [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)

### Enhanced Networking

**Placement Groups:**
- **Cluster** - Low latency, high throughput (single AZ, same rack)
- **Partition** - Large distributed workloads (up to 7 partitions per AZ)
- **Spread** - Small number of critical instances (distinct hardware)

**Enhanced Networking Types:**
- **ENA (Elastic Network Adapter)** - Up to 100 Gbps
- **EFA (Elastic Fabric Adapter)** - HPC, MPI, OS-bypass

**Network Performance Optimization:**
- Use current generation instance types
- Enable enhanced networking
- Use cluster placement groups for HPC
- Leverage jumbo frames (MTU 9001) within VPC
- Use multiple ENIs for increased bandwidth

## Application Performance Monitoring

### AWS X-Ray

X-Ray provides distributed tracing for microservices applications.

**Key Concepts:**
- **Traces** - End-to-end request path
- **Segments** - Work done by single service
- **Subsegments** - Granular timing data (DB calls, HTTP requests)
- **Annotations** - Indexed key-value pairs for filtering
- **Metadata** - Non-indexed additional data

**X-Ray Daemon:**
- Listens on UDP port 2000
- Buffers and batches segments
- Required on EC2, ECS tasks
- Built into Lambda, Elastic Beanstalk

**Integration:**
- Instrument application with X-Ray SDK
- Add X-Ray daemon to infrastructure
- Enable active tracing in Lambda, API Gateway
- View service map and traces in console

> 📚 [AWS X-Ray](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html)

**Service Map:**
- Visual representation of application architecture
- Latency distribution per service
- Error rates and throttling
- Response time analysis

### CloudWatch Application Insights

Automatically discovers application components and creates dashboards with relevant metrics and logs.

**Supported Applications:**
- SQL Server (on EC2, RDS)
- .NET applications on IIS
- Java applications
- Custom applications

**Benefits:**
- Automated problem detection
- Recommended metrics and alarms
- CloudWatch Logs Insights queries
- Correlation with deployment events

## Exam Tips

1. **CloudFront cache key** - Include only necessary components to maximize hit ratio
2. **Invalidations are costly** - Use versioned file names instead
3. **ElastiCache Redis for complexity** - Choose Redis when you need persistence, complex data types, or HA
4. **DAX is DynamoDB-specific** - Drop-in replacement with no code changes
5. **RDS read replicas** - Asynchronous replication, eventual consistency
6. **DynamoDB partition key** - High cardinality prevents hot partitions
7. **GSI vs. LSI** - GSIs can be added anytime, LSIs only at creation
8. **Compute Optimizer requires 14 days** - Needs historical data for recommendations
9. **Global Accelerator for TCP/UDP** - CloudFront is for HTTP/HTTPS only
10. **Gateway endpoints are free** - Only for S3 and DynamoDB
11. **Interface endpoints have hourly costs** - But save NAT gateway data processing fees
12. **X-Ray daemon on port 2000** - Required for EC2, ECS; built into Lambda
13. **CloudFront cache policies** - Separate from origin request policies since 2020
14. **RDS Proxy connection pooling** - Reduces connection overhead, improves scalability
15. **DynamoDB on-demand vs. provisioned** - On-demand for unpredictable, provisioned for cost optimization

## Common Architectural Patterns

### Multi-Tier Caching

```
CloudFront (Edge) →
ElastiCache (Application) →
RDS Read Replica (Database) →
RDS Primary (Write)
```

**Benefits:**
- Edge caching for static content
- Application-level caching for API responses
- Database read scaling with replicas

### Global Application Architecture

```
Users → Route 53 (Geolocation/Latency routing) →
Global Accelerator (Static IPs) →
Regional ALB → ECS/Lambda →
ElastiCache → Aurora Global Database
```

**Features:**
- Low latency via Global Accelerator
- Regional failover
- Read replicas in each region
- Global database replication

### Serverless Performance Pattern

```
API Gateway → Lambda (in VPC) →
VPC Endpoint → DynamoDB/S3 →
DAX (for DynamoDB caching)
```

**Optimizations:**
- Lambda in VPC for database access
- VPC endpoints to avoid NAT gateway
- DAX for DynamoDB read performance
- Provisioned concurrency for consistent latency

> 📚 [Well-Architected Performance Efficiency](https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html)
