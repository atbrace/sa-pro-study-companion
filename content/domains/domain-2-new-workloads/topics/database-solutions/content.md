---
title: Database Solutions and Data Stores
lastUpdated: 2026-01-06
---

# Database Solutions and Data Stores

Selecting the appropriate database service for new workloads requires understanding the data model, access patterns, performance requirements, and operational characteristics of each AWS database offering. This comprehensive guide covers relational databases, NoSQL solutions, caching strategies, specialized databases, and migration approaches aligned with SAP-C02 exam objectives.

## Relational Databases

### Amazon RDS vs Amazon Aurora

**Amazon RDS** - Managed relational database service supporting multiple engines:

| Engine | Use Case | Key Features |
|--------|----------|--------------|
| **PostgreSQL** | Enterprise apps, geospatial, JSONB workloads | Advanced extensions, full-text search, PostGIS support |
| **MySQL** | Web applications, e-commerce platforms | Widely adopted, InnoDB storage engine, read replica support |
| **MariaDB** | MySQL alternative for open-source preference | Community-driven, Oracle compatibility, thread pooling |
| **Oracle** | Enterprise legacy systems, critical workloads | License flexibility (BYOL or LI), RAC alternative with Multi-AZ |
| **SQL Server** | Microsoft ecosystem applications | Windows authentication, SQL Server Reporting Services (SSRS), Always On alternative |

**Real-World Scenario:** A financial services company migrating from on-premises Oracle databases can use RDS for Oracle with BYOL licensing to maintain compatibility while gaining managed service benefits. For net-new applications, Aurora PostgreSQL offers superior performance without Oracle licensing costs.

**Amazon Aurora** - MySQL and PostgreSQL compatible with cloud-native architecture:

**Aurora Advantages over Standard RDS**:
- **Performance**: Up to 5x MySQL throughput, 3x PostgreSQL throughput on identical hardware
- **Storage Auto-Scaling**: Grows automatically from 10 GB to 128 TB in 10 GB increments
- **Durability**: 6 copies of data across 3 Availability Zones with continuous backup to S3
- **Read Replicas**: Up to 15 Aurora Replicas with sub-10ms replica lag (vs. 5 RDS replicas)
- **Failover Time**: Automated failover in less than 30 seconds with no data loss
- **Backtrack**: Rewind database to specific timestamp without restoring from backup (MySQL-compatible only)
- **Fast Clone**: Create cost-effective database clones in minutes using copy-on-write

**Aurora Serverless v2**:

Aurora Serverless v2 provides instant, fine-grained scaling that's ideal for variable workloads:

```
Capacity Range: 0.5 ACU to 128 ACU
Scaling Increment: 0.5 ACU (vs. doubling in v1)
Scaling Speed: Instant, no connection disruption
Billing: Per-second ACU consumption
```

**Use Cases for Aurora Serverless v2**:
- **Variable workloads**: E-commerce sites with traffic spikes during promotions, sales events
- **Multi-tenant SaaS**: Individual cluster per tenant with automatic capacity management, cost proportional to usage
- **Development/test environments**: Scale to near-zero during off-hours, minimal costs when inactive
- **New applications**: Uncertain capacity requirements - let workload determine optimal sizing
- **Mixed OLTP and analytics**: Reader instances scale independently for query-heavy operations

**Real-World Scenario:** A SaaS provider hosts 500 customer databases using Aurora Serverless v2. During business hours (8 AM - 6 PM), clusters scale to 2-8 ACUs per tenant. Overnight, they scale to 0.5 ACU, reducing compute costs by 75% during low-activity periods.

**AWS Documentation:**
- [Amazon Aurora User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/)
- [Aurora Serverless v2 Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [Choosing Between Aurora and RDS](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMySQL.Compare.html)

### RDS/Aurora Deployment Options

**Multi-AZ Deployments**:

*Standard Multi-AZ (RDS)*:
- **Architecture**: Synchronous replication to standby instance in different AZ
- **Automatic Failover**: Standby promoted to primary on detection of failure, typically 60-120 seconds
- **Single Endpoint**: DNS automatically redirects to new primary, no application code changes required
- **Use Case**: High availability for production workloads, not for read scaling
- **Maintenance**: Performed on standby first, then failover, minimizing downtime

**Important**: Standby replicas in Multi-AZ deployments do NOT serve read traffic. For read scaling, use read replicas.

*Multi-AZ with Readable Standbys (RDS)*:
- **Architecture**: Two readable standby replicas in different AZs (three instances total)
- **Read Capacity**: All three instances can serve read traffic simultaneously
- **Write Path**: Primary instance handles all writes, synchronously replicates to both standbys
- **Availability**: MySQL, PostgreSQL, MariaDB engines (not Oracle or SQL Server)
- **Failover**: Sub-35 second automated failover to one of the readable standbys
- **Cost Consideration**: Three instance charges vs. one for standard Multi-AZ

**Real-World Scenario:** An online gaming platform uses RDS PostgreSQL with readable standbys to support both player transactions (writes to primary) and leaderboard queries (distributed across all three instances), achieving 3x read capacity while maintaining high availability.

*Aurora Multi-AZ (Built-in)*:
- **Storage Architecture**: Shared distributed storage with 6 copies across 3 AZs
- **Read Replicas**: Up to 15 Aurora Replicas, all capable of serving read traffic
- **Failover Priority**: Set promotion tier (0-15) to control failover order
- **Automatic Failover**: Promotes highest-priority replica in 10-30 seconds
- **Reader Endpoint**: Load-balances connections across all Aurora Replicas automatically

**Global Databases**:

*RDS for MySQL/PostgreSQL*:
- **Architecture**: Cross-region read replicas using asynchronous replication
- **Replication Lag**: Typically seconds to minutes depending on network and data change rate
- **Manual Promotion**: Must manually promote read replica to standalone instance for DR
- **Use Case**: Disaster recovery with RTO/RPO measured in minutes

*Aurora Global Database*:
- **Architecture**: Primary region + up to 5 secondary regions with dedicated replication infrastructure
- **Replication Lag**: Typically under 1 second using Aurora storage-level replication
- **RPO**: Less than 1 second of data loss in disaster scenarios
- **RTO**: Promotes secondary cluster to primary in under 1 minute
- **Managed Failover**: Automated cross-region failover with zero data loss for planned switchovers
- **Read Scalability**: Secondary regions support up to 16 Aurora Replicas each

**Real-World Scenario:** A global financial trading application uses Aurora Global Database with primary in us-east-1 and secondary in eu-west-1. European traders read from local replicas with <5ms latency. If us-east-1 experiences regional failure, eu-west-1 is promoted to primary within 60 seconds with <1 second RPO.

**AWS Documentation:**
- [RDS Multi-AZ Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
- [Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
- [Multi-AZ with Readable Standbys](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html)

### RDS/Aurora Performance Optimization

**Read Replicas**:

```
RDS Read Replicas: Up to 15 per primary instance
Aurora Replicas: Up to 15 per cluster
Cross-Region: Supported for both RDS and Aurora
Replication: Asynchronous (eventual consistency)
```

**Key Characteristics**:
- **Creation**: RDS read replicas can be created from other read replicas (cascading), except for Oracle and SQL Server
- **Promotion**: Can be promoted to standalone instance, breaking replication permanently
- **Automatic Promotion**: If RDS primary is deleted, same-region read replicas auto-promote to standalone instances
- **Storage Flexibility**: Read replicas can use different storage types (General Purpose, Provisioned IOPS, Magnetic)
- **No Auto-Scaling**: Must manually add/remove read replicas based on load

**Use Cases**:
- **Read Scaling**: Distribute SELECT queries across multiple replicas to offload primary
- **Analytics Workloads**: Run business intelligence or reporting queries on replica without impacting production
- **Disaster Recovery**: Cross-region replica can be promoted during regional outages
- **Geographic Distribution**: Place replicas closer to users for reduced latency

**Real-World Scenario:** An e-commerce platform routes customer-facing queries (product catalog, reviews) to 8 read replicas distributed across three AZs, while order processing writes target the primary instance. During Black Friday, they temporarily add 4 additional replicas to handle 10x traffic increase.

**RDS Proxy**:

RDS Proxy is a fully managed database proxy that improves application scalability, resilience, and security:

- **Connection Pooling**: Maintains reusable database connection pool, reduces connection overhead by 60-80%
- **Lambda Optimization**: Essential for Lambda functions that can create thousands of concurrent connections
- **Failover Improvement**: Reduces failover time by up to 66% by preserving application connections during database failures
- **IAM Enforcement**: Centralized IAM database authentication, eliminates hardcoded credentials
- **Secrets Manager Integration**: Automatic credential rotation without application restarts
- **Multi-AZ**: Deploys across multiple AZs automatically for high availability

**When to Use RDS Proxy**:
- Applications with unpredictable workloads that open/close connections frequently
- Serverless applications (Lambda, ECS Fargate) with short-lived compute
- Applications that exhaust database connection limits
- Environments requiring IAM authentication for all database connections

**Real-World Scenario:** A serverless API built with Lambda and RDS PostgreSQL experiences 503 "too many connections" errors during traffic spikes. Implementing RDS Proxy reduces active database connections from 2,000 to 150 by pooling Lambda connections, eliminating connection exhaustion.

**Performance Insights**:

Performance Insights provides advanced database performance monitoring:

- **Database Load Visualization**: View load as Average Active Sessions (AAS) over time
- **Wait Event Analysis**: Identify bottlenecks (CPU, I/O, locks, network)
- **Top SQL Identification**: Find queries consuming most resources
- **Dimension Slicing**: Analyze performance by host, user, database, or SQL statement
- **Retention**: 7 days free, up to 2 years with additional cost
- **Zero Performance Impact**: Minimal overhead on production databases

**Real-World Scenario:** After enabling Performance Insights, a DBA identifies that 60% of database load comes from a single analytical query running every 5 minutes. Moving this query to a dedicated read replica reduces primary instance load from 85% to 35% CPU utilization.

**Aurora-Specific Optimizations**:

- **Fast Clone**: Create full database copy in minutes using copy-on-write, zero initial storage cost. Ideal for creating test environments from production snapshots.
- **Parallel Query**: Offload analytical query processing to Aurora storage layer, achieving 2x-10x performance improvement for queries scanning millions of rows.
- **Query Plan Management**: Manually approve and pin optimal query execution plans, preventing performance regressions from plan changes.
- **Backtrack**: Rewind entire database to specific timestamp (up to 72 hours) without snapshot restore, completing in seconds.

**AWS Documentation:**
- [RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)
- [Aurora Parallel Query](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-parallel-query.html)

## NoSQL Databases

### Amazon DynamoDB

**Key Characteristics**:
- **Fully Managed**: No servers to provision, patch, or manage
- **Serverless**: Automatically scales up and down based on demand
- **Performance**: Single-digit millisecond latency at any scale
- **Durability**: Data automatically replicated across 3 Availability Zones
- **Global Tables**: Multi-region, active-active replication with sub-second lag
- **Event-Driven**: DynamoDB Streams capture data modification events for event-driven architectures

**Capacity Modes**:

| Feature | On-Demand | Provisioned |
|---------|-----------|-------------|
| **Scaling** | Automatic, instant | Manual or auto-scaling policies |
| **Cost Model** | $1.25 per million write requests, $0.25 per million read requests | $0.00065 per WCU/hour, $0.00013 per RCU/hour |
| **Use Case** | Unpredictable traffic, new applications | Predictable steady-state traffic |
| **Throughput Limits** | No pre-defined limits, unlimited burst | WCU/RCU limits based on provisioned capacity |
| **Throttling Risk** | Low (accommodates 2x previous peak instantly) | High if traffic exceeds provisioned capacity |

**Switching Modes**: Can switch between modes once per 24 hours.

**Real-World Scenario:** A news website uses on-demand mode because traffic is highly variable (10x spike when breaking news published). Provisioned mode would require over-provisioning for peak capacity, wasting 90% of costs during normal periods.

**Table Design Patterns**:

*Single Table Design*:

DynamoDB best practice for complex applications - store multiple entity types in one table using composite keys:

```
Entity: Customer
PK: CUSTOMER#12345        SK: #METADATA
Attributes: name, email, created_date

Entity: Customer Order
PK: CUSTOMER#12345        SK: ORDER#2024-001
Attributes: order_total, status, order_date

Entity: Order Item
PK: CUSTOMER#12345        SK: ORDER#2024-001#ITEM#SKU789
Attributes: quantity, price, product_name

Query pattern: GetItem or Query with PK=CUSTOMER#12345
Returns: Customer metadata + all orders + all items in single request
```

**Benefits**:
- Fewer network round-trips (1 query vs. multiple table queries)
- Lower costs (fewer read operations)
- Better performance (single-digit ms for all related data)
- Atomic transactions across entity types

**Real-World Scenario:** An e-commerce application stores customers, orders, products, inventory, and reviews in a single DynamoDB table. A user profile page loads in one Query operation instead of 5 separate table queries, reducing latency from 50ms to 8ms.

**Secondary Indexes**:

*Global Secondary Index (GSI)*:
- **Different Keys**: Can use entirely different partition and sort keys than base table
- **Consistency**: Eventually consistent reads only (strongly consistent not supported)
- **Sparse Index**: Only items with index attributes are included, reducing index size
- **Capacity**: Separate provisioned throughput (provisioned mode) or billed separately (on-demand)
- **Projections**: ALL, KEYS_ONLY, or INCLUDE specific attributes
- **Limits**: 20 GSIs per table
- **Creation**: Can add/remove GSIs at any time without table downtime

**Use Case**: Query by different access pattern. Example: Base table keyed by UserID, GSI keyed by EmailAddress to support login by email.

*Local Secondary Index (LSI)*:
- **Same Partition Key**: Must use same partition key as base table, different sort key
- **Consistency**: Supports both strongly consistent and eventually consistent reads
- **Creation Time**: Must be created when table is created (cannot add later)
- **Throughput Sharing**: Shares provisioned throughput with base table
- **Limits**: 5 LSIs per table
- **Item Size**: 10 GB limit per partition key value (across table and all LSIs)

**Use Case**: Alternate sort order within same partition. Example: Base table sorts orders by OrderDate, LSI sorts by ShipDate for shipment tracking.

**Real-World Scenario:** A task management app uses base table with PK=ProjectID, SK=TaskID. LSI with SK=DueDate enables query "all tasks for project X sorted by due date" while GSI with PK=AssignedUser, SK=DueDate enables "all tasks assigned to user Y sorted by due date."

**DynamoDB Accelerator (DAX)**:

DAX is a DynamoDB-compatible in-memory caching service:

```
Performance: Microsecond read latency (vs. milliseconds)
Throughput: Millions of requests per second per cluster
API Compatible: Drop-in replacement requiring only endpoint change
Write-Through: Writes go through DAX to DynamoDB automatically
Consistency: Eventually consistent reads only
```

**Architecture**:
- Multi-AZ cluster with 1 primary node and up to 10 read replica nodes
- Item cache: Stores results of GetItem and BatchGetItem operations
- Query cache: Stores results of Query and Scan operations
- Write-through: Automatically updates item cache on PutItem, UpdateItem, DeleteItem

**Ideal Use Cases**:
- Read-heavy workloads requiring microsecond response times (gaming leaderboards, real-time bidding)
- Hot key scenarios where specific items receive disproportionate traffic
- Applications with >90% cache hit rate to justify cost
- Workloads that can tolerate eventual consistency

**Not Ideal For**:
- Applications requiring strongly consistent reads
- Write-heavy workloads (caching provides limited benefit)
- Cost-sensitive applications with <90% cache hit rates

**Critical Limitation**: DAX maintains metadata about attribute names indefinitely. Using dynamic attribute names (timestamps, UUIDs as attribute keys) causes memory exhaustion. Always use fixed attribute names with dynamic values.

**Real-World Scenario:** A mobile gaming app serves player leaderboards from DynamoDB. Top 10 players are queried millions of times per hour. DAX reduces DynamoDB read costs by 95% (cache hit rate >98%) while improving response time from 8ms to 400 microseconds.

**Global Tables**:

DynamoDB Global Tables provide multi-region, active-active replication:

- **Replication Speed**: Typically under 1 second between regions
- **Active-Active**: All replica tables accept reads and writes
- **Automatic Conflict Resolution**: Last Writer Wins (LWW) based on timestamp
- **Point-in-Time Recovery**: Independent per region
- **Encryption**: Can use different KMS keys per region
- **Streams**: Available in each region independently

**Conflict Resolution Example**:
```
Time: 10:00:00.100 - Write to us-east-1: Item.Status = "PENDING"
Time: 10:00:00.200 - Write to eu-west-1: Item.Status = "APPROVED"

Result after replication: Item.Status = "APPROVED" in both regions
(Last write wins based on timestamp)
```

**Real-World Scenario:** A ride-sharing application uses Global Tables with replicas in us-east-1, us-west-2, and ap-southeast-1. Drivers and riders in each region write to local replica (5ms latency). If us-east-1 fails, traffic automatically routes to us-west-2 with no application changes or data loss.

**AWS Documentation:**
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [DynamoDB Accelerator (DAX)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)
- [DynamoDB Global Tables](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html)
- [Single Table Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)

### Amazon DocumentDB (MongoDB Compatible)

Amazon DocumentDB is a fully managed document database service compatible with MongoDB 3.6, 4.0, and 5.0:

**Use Cases**:
- **Content Management**: Articles, blogs, catalogs with flexible schemas
- **User Profiles**: Customer profiles with varying attributes
- **Mobile Applications**: Offline-first mobile apps with JSON document sync
- **Catalogs**: Product catalogs with diverse attribute sets per category

**Key Features**:
- **MongoDB Compatibility**: Supports MongoDB drivers, tools, and applications
- **Storage Architecture**: 6 copies across 3 AZs, separate from compute
- **Scalability**: Up to 15 read replicas for read scaling
- **Backup**: Continuous backup to S3, point-in-time recovery up to 35 days
- **Performance**: Query performance improved with distributed storage layer
- **Elasticity**: Independent scaling of compute (instances) and storage (auto-scaling to 64 TB)

**vs MongoDB on EC2**:
- No cluster management, replica set configuration, or sharding complexity
- Automatic backups without performance impact
- Built-in monitoring with Performance Insights
- VPC isolation, IAM authentication, KMS encryption at rest

**Real-World Scenario:** A content platform migrates from self-managed MongoDB on EC2 to DocumentDB. Operational overhead drops from 20 hours/week (patching, backup management, replica configuration) to <1 hour. Storage automatically grows from 2 TB to 8 TB over 6 months without manual intervention.

**AWS Documentation:**
- [Amazon DocumentDB Developer Guide](https://docs.aws.amazon.com/documentdb/latest/developerguide/)
- [DocumentDB Best Practices](https://docs.aws.amazon.com/documentdb/latest/developerguide/best_practices.html)

## Caching Solutions

### Amazon ElastiCache

**Redis vs Memcached Decision Matrix**:

| Feature | ElastiCache for Redis | ElastiCache for Memcached |
|---------|-------|-----------|
| **Data Structures** | Strings, lists, sets, sorted sets, hashes, bitmaps, hyperloglogs, geospatial indexes | Strings only (key-value pairs) |
| **Persistence** | Optional: RDB snapshots, AOF (append-only file) | None (pure in-memory) |
| **Replication** | Multi-AZ with automatic failover (up to 5 replicas) | Multi-node sharding (no replicas) |
| **Backup/Restore** | Automated snapshots to S3, manual snapshots | Not supported |
| **Pub/Sub** | Yes (message broker patterns) | No |
| **Transactions** | Yes (MULTI/EXEC commands) | No |
| **Lua Scripting** | Yes (server-side logic) | No |
| **Geospatial** | Yes (radius queries, distance calculations) | No |
| **Multi-Threading** | No (single-threaded per shard) | Yes (scales vertically with CPU cores) |
| **Eviction Policies** | 8 options including LRU, LFU, TTL-based | LRU only |
| **Max Node Size** | cache.r7g.16xlarge (419 GiB memory) | cache.r7g.16xlarge (419 GiB memory) |
| **Cluster Sharding** | Up to 500 shards (cluster mode enabled) | Up to 40 nodes |

**Redis Use Cases**:
- **Session Storage**: Web session data with automatic expiration (TTL)
- **Leaderboards**: Gaming leaderboards with sorted sets (ZADD, ZRANGE)
- **Real-Time Analytics**: Counting, trending topics with HyperLogLog
- **Pub/Sub Messaging**: Real-time notifications, chat applications
- **Geospatial**: Location-based services (find nearby drivers, restaurants)
- **Rate Limiting**: API rate limiting with sliding window counters

**Memcached Use Cases**:
- **Simple Caching**: HTML fragments, database query results
- **Large Cache Nodes**: Multi-threaded performance for CPU-intensive operations
- **Horizontal Scaling**: Distribute cache across many nodes with consistent hashing
- **Minimalist Requirements**: No need for persistence, replication, or advanced data types

**Real-World Scenario:** A social media platform uses ElastiCache for Redis to store user sessions (hash data type), activity feeds (sorted sets ordered by timestamp), and friend graphs (sets for set operations like mutual friends). Memcached would require implementing these structures in application code.

**ElastiCache for Redis Cluster Mode**:

*Cluster Mode Disabled*:
- **Architecture**: Single shard (node group) with 1 primary and up to 5 read replicas
- **Data Distribution**: All data on all nodes (replicas are copies)
- **Scaling**: Vertical only (change node type)
- **Availability**: Multi-AZ automatic failover to replica
- **Use Case**: Datasets under 200 GB with read scaling requirements

*Cluster Mode Enabled*:
- **Architecture**: 1 to 500 shards, each with 1 primary and up to 5 replicas
- **Data Distribution**: Data partitioned across shards using consistent hashing
- **Scaling**: Horizontal (add/remove shards) and vertical (change node types)
- **Availability**: Multi-AZ with automatic failover per shard
- **Capacity**: Up to 340 TB total (500 shards × 680 GB per shard)
- **Use Case**: Multi-terabyte datasets, highest throughput requirements

**Real-World Scenario:** A real-time bidding platform processes 5 million bids/second using ElastiCache for Redis with cluster mode enabled (100 shards, cache.r6g.2xlarge nodes). Data is partitioned by auction ID. During peak events, they temporarily add 50 shards to handle 8 million bids/second.

**AWS Documentation:**
- [ElastiCache for Redis User Guide](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/)
- [ElastiCache for Memcached User Guide](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/)
- [Choosing Between Redis and Memcached](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/SelectEngine.html)

### Amazon MemoryDB for Redis

MemoryDB is a Redis-compatible, durable in-memory database:

**vs ElastiCache for Redis**:

| Feature | MemoryDB for Redis | ElastiCache for Redis |
|---------|----------|-------------------|
| **Durability** | Multi-AZ transaction log, strong consistency | Optional RDB/AOF, eventual consistency across replicas |
| **Primary Use** | Durable primary database | Cache layer in front of database |
| **Data Loss on Failure** | Zero (replicated transaction log) | Potential loss since last snapshot (seconds to minutes) |
| **Write Latency** | Low single-digit milliseconds | Sub-millisecond (no durability overhead) |
| **Read Latency** | Microseconds (in-memory) | Microseconds (in-memory) |
| **Recovery Time** | Automatic with no data loss | Restore from snapshot (minutes), potential data loss |
| **Consistency** | Strong consistency | Eventual consistency (with replication) |

**When to Use MemoryDB**:
- **Primary Database**: MemoryDB as sole data store (no separate database backend)
- **Microservices**: Simple data models that fit Redis data structures
- **Durability Requirements**: Cannot tolerate data loss on node failure
- **Strong Consistency**: Require consistent reads across all replicas

**When to Use ElastiCache**:
- **Caching Layer**: Accelerating existing database (RDS, DynamoDB)
- **Ephemeral Data**: Session storage, temporary data where loss is acceptable
- **Lowest Latency**: Sub-millisecond write latency critical

**Real-World Scenario:** A gaming company uses MemoryDB to store player inventory, currency, and achievements as primary data store. Previously used ElastiCache with Aurora backend, but dual-write complexity and cache invalidation bugs caused data inconsistency. MemoryDB eliminates cache layer, reducing architecture complexity by 40%.

**AWS Documentation:**
- [Amazon MemoryDB for Redis Developer Guide](https://docs.aws.amazon.com/memorydb/latest/devguide/)
- [MemoryDB vs ElastiCache Comparison](https://docs.aws.amazon.com/memorydb/latest/devguide/what-is-memorydb-for-redis.html)

## Specialized Databases

### Amazon Neptune (Graph Database)

Amazon Neptune is a fully managed graph database supporting two graph models:

**Graph Query Languages**:
- **Gremlin**: Apache TinkerPop graph traversal language for property graph model
- **openCypher**: Declarative query language (similar to SQL for graphs)
- **SPARQL**: RDF graph query language for semantic web applications

**Use Cases**:
- **Social Networks**: Friend relationships, recommendations, influencer identification
- **Fraud Detection**: Pattern matching across accounts, transactions, devices to identify fraud rings
- **Knowledge Graphs**: Wikipedia-style knowledge bases, product taxonomies
- **Network Topology**: IT infrastructure, network dependencies, impact analysis
- **Recommendation Engines**: Product recommendations based on user behavior, purchase patterns

**Key Features**:
- **ACID Transactions**: Full transaction support across graph operations
- **High Availability**: Multi-AZ deployment with up to 15 read replicas
- **Fast Failover**: Automatic failover to read replica in under 30 seconds
- **Backup**: Continuous backup to S3, point-in-time recovery up to 35 days
- **Performance**: Optimized for graph queries with billions of relationships

**Real-World Scenario:** A fraud detection system identifies fraud rings by traversing relationships between accounts, devices, IP addresses, and payment methods. Query: "Find all accounts connected to suspicious account X within 3 hops that share 2+ common attributes." Neptune executes this graph traversal in milliseconds vs. hours with SQL JOINs on relational database.

**AWS Documentation:**
- [Amazon Neptune User Guide](https://docs.aws.amazon.com/neptune/latest/userguide/)
- [Gremlin Query Language](https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin.html)
- [Neptune Best Practices](https://docs.aws.amazon.com/neptune/latest/userguide/best-practices.html)

### Amazon QLDB (Quantum Ledger Database)

QLDB is a fully managed ledger database providing cryptographically verifiable transaction log:

**Characteristics**:
- **Immutable Journal**: Append-only ledger that cannot be altered or deleted
- **Cryptographic Verification**: SHA-256 hashing with Merkle tree structure for tamper detection
- **Full History**: Complete audit trail of all changes to data over time
- **PartiQL**: SQL-compatible query language with document support
- **Serverless**: Automatic scaling with pay-per-request pricing

**Use Cases**:
- **Financial Ledgers**: Banking transaction systems, payment processing, reconciliation
- **Supply Chain**: Track product provenance, custody chain from manufacturer to consumer
- **Healthcare Records**: Maintain immutable patient record history for regulatory compliance
- **System of Record**: HR systems, claims processing, DMV registration

**QLDB vs Blockchain**:
- **Centralized**: Single AWS account owns ledger (no decentralization)
- **Higher Performance**: No consensus protocols, achieves 2-3x throughput of blockchain
- **Simpler**: No blockchain infrastructure management, miners, or network complexity
- **Verifiable**: Cryptographic proof without decentralization trust model

**Real-World Scenario:** An insurance company uses QLDB to track policy changes, claims, and payments. Auditors query complete history of policy modifications with cryptographic proof that records haven't been altered, satisfying regulatory compliance requirements.

**AWS Documentation:**
- [Amazon QLDB Developer Guide](https://docs.aws.amazon.com/qldb/latest/developerguide/)
- [QLDB Use Cases](https://docs.aws.amazon.com/qldb/latest/developerguide/QLDB.introduction.html)

### Amazon Timestream (Time-Series Database)

Timestream is a purpose-built time-series database optimized for IoT and operational applications:

**Optimized For**:
- **IoT Sensor Data**: Temperature, pressure, vibration from millions of sensors
- **Application Metrics**: Application performance monitoring, KPIs, business metrics
- **DevOps Monitoring**: Infrastructure metrics, log analytics, observability
- **Industrial Telemetry**: Manufacturing equipment, vehicle fleets, energy systems

**Key Features**:
- **Automatic Tiering**: Recent data in memory store (fast queries), historical data in magnetic store (cost-optimized)
- **Built-In Analytics**: Time-series functions (interpolation, smoothing, aggregation)
- **Performance**: 1000x faster than relational databases for time-series queries
- **Cost**: 1/10th the cost vs. relational databases for equivalent time-series workload
- **Serverless**: Auto-scaling with pay-per-query pricing

**Data Lifecycle**:
```
Ingestion → Memory Store (minutes to hours, fast queries)
           ↓
      Magnetic Store (hours to years, cost-optimized)
           ↓
      Auto-deletion (based on retention policy)
```

**Real-World Scenario:** An industrial IoT platform ingests 10 billion sensor measurements per day from factory equipment. Recent data (last 24 hours) in memory store supports real-time dashboards with <100ms query latency. Historical data (90 days) in magnetic store supports trend analysis at 1/10th the storage cost.

**AWS Documentation:**
- [Amazon Timestream Developer Guide](https://docs.aws.amazon.com/timestream/latest/developerguide/)
- [Timestream Best Practices](https://docs.aws.amazon.com/timestream/latest/developerguide/best-practices.html)

### Amazon Keyspaces (Apache Cassandra)

Keyspaces is a scalable, managed Apache Cassandra-compatible database:

**Use Cases**:
- **High-Scale Applications**: Applications requiring millions of writes per second
- **IoT Device Data**: Device state, telemetry, events from IoT fleets
- **Time-Series Data**: Application logs, clickstream data, metrics
- **Globally Distributed Apps**: Multi-region applications with local low-latency access

**Key Features**:
- **CQL Compatible**: Cassandra Query Language for familiar development experience
- **Serverless**: Pay-per-request or provisioned capacity modes
- **Multi-Region**: Replicate tables across AWS Regions for disaster recovery
- **Performance**: Single-digit millisecond latency at petabyte scale
- **Backup**: Continuous backups, point-in-time recovery up to 35 days
- **Auto-Scaling**: Table capacity scales automatically with demand

**vs Cassandra on EC2**:
- No cluster provisioning, node management, or compaction tuning
- No capacity planning - automatic scaling based on traffic
- Built-in security: VPC isolation, IAM authentication, encryption at rest/in transit
- No downtime for schema changes or scaling operations

**Real-World Scenario:** A telemetry platform migrates from self-managed Cassandra cluster (24 EC2 instances) to Keyspaces. Eliminates 40 hours/month operational overhead (node failures, compaction, repairs). Storage costs reduced 50% with serverless pricing during off-peak hours.

**AWS Documentation:**
- [Amazon Keyspaces Developer Guide](https://docs.aws.amazon.com/keyspaces/latest/devguide/)
- [Keyspaces CQL Reference](https://docs.aws.amazon.com/keyspaces/latest/devguide/cassandra-apis.html)

## Database Migration Strategies

### AWS Database Migration Service (DMS)

DMS migrates databases to AWS with minimal downtime:

**Migration Types**:

*Homogeneous Migrations* (same engine):
- Oracle to RDS for Oracle
- MySQL to Aurora MySQL-compatible
- PostgreSQL to Aurora PostgreSQL-compatible
- SQL Server to RDS for SQL Server

*Heterogeneous Migrations* (different engines):
- Oracle to Aurora PostgreSQL (requires Schema Conversion Tool)
- SQL Server to Aurora MySQL
- MongoDB to DocumentDB
- Cassandra to Keyspaces

**Migration Approaches**:

```
Full Load Only: One-time migration of existing data
CDC (Change Data Capture): Continuous replication of ongoing changes
Full Load + CDC: Initial data load, then continuous sync for cutover
```

**Replication Instance Sizing**:

- **Memory-Optimized (R5)**: Large datasets requiring in-memory processing, DMS performs type conversions in memory
- **Compute-Optimized (C5)**: Heterogeneous migrations with complex transformations (Oracle to PostgreSQL)
- **Multi-AZ**: Production migrations requiring high availability during multi-day migrations
- **Storage**: Default 50-100 GB, increase to 500GB+ for large transactions or parallel table loading

**Performance Optimization**:

*Parallel Full Load*:
```json
{
  "rule-type": "table-settings",
  "rule-id": "1",
  "object-locator": {
    "schema-name": "sales",
    "table-name": "transactions"
  },
  "parallel-load": {
    "type": "partitions-auto"
  }
}
```

- Automatically partitions large tables for parallel loading
- Reduces migration time by 50-80% for large tables
- Supported: Oracle, SQL Server, MySQL, Sybase, IBM Db2 LUW

*Table-Level Parallelism*:
- Default: 8 tables loaded simultaneously
- Increase to 16-32 for large instances (dms.c5.4xlarge+)
- Decrease to 4 for small instances (dms.t3.medium)

**CDC Performance**:
- **Batch Optimized Apply**: Groups transactions into batches for 3-5x throughput improvement
- **Trade-off**: May temporarily violate referential integrity (disable constraints during migration)
- **Monitor Lag**: CloudWatch metric `CDCLatencySource` indicates seconds behind source

**Real-World Scenario:** A retail company migrates 50 TB Oracle database to Aurora PostgreSQL. Initial full load takes 4 days with 16 tables in parallel. CDC captures ongoing transactions during full load. After full load completes, CDC lag drops from 2 hours to <5 seconds within 6 hours. Cutover performed during maintenance window with <1 minute downtime.

**AWS Documentation:**
- [AWS DMS User Guide](https://docs.aws.amazon.com/dms/latest/userguide/)
- [DMS Best Practices](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [DMS Migration Patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/migration-patterns-list.html)

### Schema Conversion Tool (SCT)

SCT automates schema and code conversion for heterogeneous migrations:

**Capabilities**:
- **Schema Analysis**: Scan source database schema, identify objects for conversion
- **Automatic Conversion**: Generate target DDL for tables, indexes, views
- **Code Conversion**: Convert stored procedures, functions, triggers to target syntax
- **Incompatibility Detection**: Flag unsupported features requiring manual remediation
- **Assessment Report**: Estimate migration complexity and effort

**Assessment Report Contents**:
- **Conversion Summary**: Percentage of automatic vs. manual conversion required
- **Action Items**: Specific tasks for manual remediation (proprietary features, custom functions)
- **Estimated Effort**: Hours required for manual conversion work
- **Recommended Targets**: Suggested target engine based on source compatibility

**Real-World Scenario:** SCT analyzes 800-table Oracle database for migration to Aurora PostgreSQL. Assessment report shows 92% automatic conversion (tables, indexes, views), 8% manual effort required (Oracle-specific PL/SQL, DBMS packages). SCT converts 2,500 lines of PL/SQL to PL/pgSQL automatically, flags 200 lines requiring manual review.

**AWS Documentation:**
- [AWS Schema Conversion Tool User Guide](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/)
- [SCT Assessment Report](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_AssessmentReport.html)

## Database Security Best Practices

**Encryption**:

- **At Rest**:
  - RDS/Aurora: AES-256 encryption using KMS, enabled at creation (cannot enable later)
  - DynamoDB: Server-side encryption with KMS or AWS owned keys
  - DocumentDB, Neptune, Timestream: KMS encryption mandatory for all new clusters

- **In Transit**:
  - TLS 1.2+ for all database connections (RDS, Aurora, DynamoDB, DocumentDB)
  - Certificate validation recommended for production workloads

- **Field-Level**:
  - Client-side encryption for sensitive fields (SSN, credit cards) before storing in database
  - Use AWS Encryption SDK for application-level encryption

**Access Control**:

- **IAM Database Authentication**:
  - RDS/Aurora: Generate temporary auth tokens instead of passwords, 15-minute validity
  - DynamoDB: Use IAM roles for fine-grained access control per table/index
  - Eliminates password management, supports MFA

- **Secrets Manager**:
  - Store database credentials with automatic rotation every 30-90 days
  - Lambda function updates passwords without application downtime
  - Integrates with RDS Proxy for seamless credential rotation

- **Security Groups**:
  - Restrict database access to specific CIDR blocks, security groups
  - Principle of least privilege: Only application tier can access database

- **VPC**:
  - Deploy databases in private subnets with no Internet Gateway route
  - Use VPC endpoints for DynamoDB access without traversing Internet

**Auditing**:

- **RDS/Aurora**:
  - Database audit logs to CloudWatch Logs (Oracle, SQL Server, MySQL, PostgreSQL)
  - MariaDB Audit Plugin, Oracle Unified Auditing, SQL Server Audit

- **DynamoDB**:
  - CloudTrail captures all API calls (CreateTable, PutItem, Query)
  - DynamoDB Streams for item-level change tracking

- **Neptune**:
  - Audit logs to CloudWatch for all database connections and queries

**Backup and Recovery**:

- **Automated Backups**:
  - RDS/Aurora: Daily snapshots, transaction logs every 5 minutes, retention 1-35 days
  - DynamoDB: Continuous backups with point-in-time recovery (PITR) up to 35 days

- **Manual Snapshots**:
  - On-demand snapshots retained indefinitely until manually deleted
  - Share snapshots across accounts for disaster recovery

- **Cross-Region Backups**:
  - Aurora: Copy automated backups or snapshots to secondary region
  - DynamoDB: Global Tables provide active-active replication (preferred over backups)

**Real-World Scenario:** A healthcare application storing PHI data uses: (1) RDS PostgreSQL with KMS encryption at rest and TLS 1.3 in transit, (2) IAM database authentication for application access, (3) Secrets Manager for admin credentials with 60-day rotation, (4) VPC private subnets with security group restricting access to ECS tasks only, (5) CloudWatch audit logs retained 90 days for HIPAA compliance.

**AWS Documentation:**
- [RDS Security Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.Security.html)
- [DynamoDB Security](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices-security.html)
- [IAM Database Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)

## Performance Tuning

### RDS/Aurora Tuning

**Parameter Groups**:

Database engine parameters control performance characteristics:

```
PostgreSQL Examples:
- shared_buffers: 25% of instance memory
- work_mem: RAM per sort operation
- maintenance_work_mem: RAM for VACUUM, CREATE INDEX
- effective_cache_size: Hint for query planner (75% of RAM)
- max_connections: Connection limit (requires instance restart)

MySQL Examples:
- innodb_buffer_pool_size: 75% of instance memory
- innodb_log_file_size: Transaction log size
- max_connections: Connection limit
- query_cache_size: Query result cache
```

**Parameter Group Changes**:
- Dynamic parameters: Apply immediately without restart
- Static parameters: Require database restart (schedule maintenance window)
- Custom parameter group: Create from default, modify values, attach to instance

**Read Scaling Patterns**:

1. **Read Replicas**: Distribute read traffic across up to 15 replicas
   - Route reporting queries to dedicated replica
   - Scale reads beyond primary instance limits

2. **Aurora Auto Scaling**: Automatically add/remove Aurora Replicas based on CPU or connections
   - Target metric: Average CPU utilization across replicas
   - Scale-out: Add replica when target exceeded for 3 minutes
   - Scale-in: Remove replica when below target for 15 minutes

3. **ElastiCache**: Cache frequently accessed data in Redis or Memcached
   - Offload 80-95% of read traffic for cacheable queries
   - Sub-millisecond latency vs. 5-10ms database latency

4. **DAX for DynamoDB**: Cache DynamoDB reads with microsecond latency
   - Ideal for read-heavy workloads with high request rates

**Write Scaling Patterns**:

1. **Vertical Scaling**: Upgrade to larger instance class for more CPU, memory, network bandwidth
   - Aurora: Modify instance class with 1-2 minute downtime during failover
   - RDS: Multi-AZ deployment minimizes downtime (failover to standby)

2. **Write Sharding**: Application-level partitioning across multiple database clusters
   - Partition by customer ID, geography, or date range
   - Each shard handles subset of writes

3. **Aurora Serverless v2**: Automatically scale write capacity from 0.5 to 128 ACU
   - Ideal for variable workloads with unpredictable write spikes

**Real-World Scenario:** An analytics platform routes real-time queries to Aurora primary (10% traffic) and batch reporting queries to 6 Aurora Replicas (90% traffic). During peak hours, Aurora Auto Scaling adds 3 additional replicas. ElastiCache layer caches dashboard queries, reducing database load by 75%.

### DynamoDB Tuning

**Partition Key Design**:

Critical for even distribution of data and throughput:

**Good Partition Key Characteristics**:
- **High Cardinality**: Many distinct values (UserID, OrderID, DeviceID)
- **Uniform Access**: No hot keys receiving disproportionate traffic
- **Even Distribution**: Data spread evenly across partitions

**Bad Partition Key Examples**:
- **Date**: All writes go to today's partition (hot partition)
- **Status**: Most items have same status value (poor distribution)
- **Boolean**: Only two possible values (extreme hot key)

**Hot Partition Mitigation**:
```
Bad: PK = "2024-01-06" (all today's data in one partition)

Good: PK = "2024-01-06#" + (OrderID % 10)
Creates 10 partitions per day with random distribution
```

**Burst Capacity**:

DynamoDB reserves unused capacity for burst traffic:

- **Provisioned Mode**: 5 minutes of unused capacity accumulated as burst
- **Use Case**: Handle short spikes above provisioned capacity
- **Not Reliable**: Cannot depend on burst capacity for sustained traffic
- **Throttling**: Once burst exhausted, requests throttled until capacity available

**Auto Scaling Configuration**:

```
Target Utilization: 70% recommended (balance between cost and burst capacity)
Scale-Out: Fast (seconds to minutes when utilization exceeds 70%)
Scale-In: Gradual (4 consecutive 1-minute periods below target)
Min/Max Capacity: Set based on baseline and peak requirements
```

**Real-World Scenario:** An e-commerce site uses partition key `CustomerID` with high cardinality (millions of customers). During flash sale, auto-scaling increases write capacity from 1,000 WCU to 10,000 WCU in 2 minutes. Burst capacity handles initial spike before scaling completes. Target utilization of 70% maintains 30% burst capacity buffer.

**AWS Documentation:**
- [RDS Performance Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Aurora Performance Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.BestPractices.html)
- [DynamoDB Performance Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices-performance.html)

## Common Architectural Patterns

### Multi-Tier Application with Caching

```
┌─────────────────┐
│    Route 53     │  (DNS routing, health checks)
└────────┬────────┘
         │
┌────────▼────────┐
│       ALB       │  (HTTPS termination, auto-scaling)
└────────┬────────┘
         │
┌────────▼────────┐     ┌─────────────────┐
│   App Tier      │────>│  ElastiCache    │  (Session storage,
│   (ECS/EKS)     │     │     Redis       │   query result cache)
└────────┬────────┘     └─────────────────┘
         │
┌────────▼────────┐     ┌─────────────────┐
│   Aurora        │────>│   S3 Backups    │  (Automated snapshots,
│   Cluster       │     │   + Glacier     │   long-term retention)
│ (Multi-AZ)      │     │                 │
└─────────────────┘     └─────────────────┘
```

**Pattern Characteristics**:
- ElastiCache reduces database load by 70-90% for cacheable queries
- Aurora Multi-AZ provides <30 second failover with zero data loss
- Session data in Redis survives instance terminations
- S3 Lifecycle policy transitions old snapshots to Glacier for cost optimization

### Global Application with DynamoDB

```
┌─────────────────────┐         ┌─────────────────────┐
│    us-east-1        │         │    eu-west-1        │
│                     │         │                     │
│  CloudFront Edge    │         │  CloudFront Edge    │
│         │           │         │         │           │
│  ┌──────▼────────┐  │         │  ┌──────▼────────┐  │
│  │ DynamoDB Table│<─┼────────>┼─>│ DynamoDB Table│  │
│  │ (Global Table)│  │         │  │ (Global Table)│  │
│  └───────────────┘  │         │  └───────────────┘  │
│         │           │         │         │           │
│  ┌──────▼────────┐  │         │  ┌──────▼────────┐  │
│  │  Application  │  │         │  │  Application  │  │
│  │  (Lambda/ECS) │  │         │  │  (Lambda/ECS) │  │
│  └───────────────┘  │         │  └───────────────┘  │
└─────────────────────┘         └─────────────────────┘

Replication: < 1 second between regions
Conflict Resolution: Last Writer Wins (timestamp-based)
Failover: Automatic with Route 53 health checks
```

**Pattern Characteristics**:
- Local read/write latency <10ms in each region
- Active-active: Both regions serve production traffic simultaneously
- Route 53 geolocation routing directs users to nearest region
- Survives regional failure with zero application code changes

### Microservices with Purpose-Built Databases

```
┌───────────────────┐
│   API Gateway     │  (Single entry point, throttling, auth)
└────────┬──────────┘
         │
    ┌────┴────┬─────────┬──────────┬────────┐
    │         │         │          │        │
┌───▼─────┐ ┌─▼──────┐ ┌▼────────┐ ┌─▼──────┐ ┌─▼─────────┐
│  User   │ │Product │ │ Order   │ │Catalog │ │ Analytics │
│ Service │ │Service │ │ Service │ │Service │ │  Service  │
└───┬─────┘ └───┬────┘ └────┬────┘ └───┬────┘ └─────┬─────┘
    │           │            │          │            │
┌───▼─────┐ ┌───▼────┐  ┌───▼─────┐ ┌──▼─────┐ ┌───▼──────┐
│DynamoDB │ │ Aurora │  │   RDS   │ │Neptune │ │Timestream│
│ (NoSQL) │ │ (RDBMS)│  │ (RDBMS) │ │ Graph  │ │Time-Ser. │
└─────────┘ └────────┘  └─────────┘ └────────┘ └──────────┘
```

**Service-to-Database Mapping**:
- **User Service + DynamoDB**: High-scale user profiles, single-digit ms latency, flexible schema
- **Product Service + Aurora**: Product catalog with complex queries, ACID transactions
- **Order Service + RDS**: Order processing requiring strict consistency, relational integrity
- **Catalog Service + Neptune**: Product recommendations, "frequently bought together" graph queries
- **Analytics Service + Timestream**: Click-stream data, metrics, time-series dashboards

**Pattern Characteristics**:
- Each service chooses database optimized for its data model and access patterns
- Services own their data - no direct database access across service boundaries
- API Gateway provides unified interface for clients
- Independent scaling per service and database

**AWS Documentation:**
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [AWS Well-Architected Framework - Data Architecture](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [Microservices on AWS](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/introduction.html)

## Database Selection Decision Framework

### Selection Criteria Matrix

| Requirement | Recommended Database(s) |
|-------------|------------------------|
| **Relational with highest performance** | Aurora MySQL/PostgreSQL |
| **Relational with specific engine** | RDS (Oracle, SQL Server, MariaDB) |
| **Serverless relational** | Aurora Serverless v2 |
| **NoSQL key-value, single-digit ms** | DynamoDB |
| **MongoDB compatibility** | DocumentDB |
| **Graph relationships** | Neptune |
| **In-memory caching** | ElastiCache (Redis/Memcached) |
| **Durable in-memory database** | MemoryDB for Redis |
| **Immutable audit trail** | QLDB |
| **Time-series IoT data** | Timestream |
| **Wide-column Cassandra** | Keyspaces |
| **Multi-region active-active** | DynamoDB Global Tables, Aurora Global Database |
| **Microsecond latency** | DAX (for DynamoDB), ElastiCache |

### Decision Tree

```
Start: What is your data model?
│
├─ Relational (tables, foreign keys, SQL)
│  ├─ Need highest performance? → Aurora
│  ├─ Need specific engine (Oracle, SQL Server)? → RDS
│  └─ Variable/unpredictable workload? → Aurora Serverless v2
│
├─ Document (JSON, flexible schema)
│  ├─ MongoDB compatibility required? → DocumentDB
│  └─ AWS-native, serverless? → DynamoDB
│
├─ Graph (relationships, traversals)
│  └─ → Neptune
│
├─ Key-Value (simple lookups)
│  ├─ Need persistence? → DynamoDB
│  └─ Cache layer only? → ElastiCache
│
├─ Time-Series (metrics, IoT, logs)
│  └─ → Timestream
│
├─ Wide-Column (Cassandra-style)
│  └─ → Keyspaces
│
└─ Ledger (immutable audit)
   └─ → QLDB
```

## Exam Tips

1. **Aurora is often the answer** for relational databases requiring high performance, availability, and cloud-native features (Global Database, Serverless, fast cloning).

2. **DynamoDB for serverless NoSQL** with predictable single-digit millisecond latency. Remember Global Tables for multi-region active-active.

3. **ElastiCache for Redis when you need persistence, replication, or advanced data structures**. Memcached for simple multi-threaded caching.

4. **MemoryDB when Redis is the primary database** with durability requirements (vs. ElastiCache as cache layer).

5. **RDS Multi-AZ for high availability** (synchronous replication, automatic failover). Read replicas for read scaling (asynchronous, manual promotion).

6. **Aurora Serverless v2 for variable workloads** with instant, fine-grained scaling. Multi-tenant SaaS, dev/test, unpredictable traffic patterns.

7. **Global databases for multi-region**: Aurora Global Database (active-passive, <1s lag, 1-minute failover) vs. DynamoDB Global Tables (active-active, <1s lag, automatic).

8. **RDS Proxy for connection pooling** with Lambda, ECS Fargate, or applications with connection churn. Reduces failover time by 66%.

9. **DAX for DynamoDB caching** with microsecond latency. Only for eventually consistent reads. Watch for hot key scenarios.

10. **Neptune for graph traversals** - social networks, fraud detection, recommendation engines. Remember Gremlin and SPARQL support.

11. **QLDB for immutable audit trails** with cryptographic verification. Centralized (not decentralized blockchain).

12. **Timestream for time-series data** - IoT, DevOps monitoring, application metrics. 1000x faster, 1/10th cost vs. relational.

13. **Keyspaces for Cassandra-compatible** serverless wide-column store. Eliminates cluster management overhead.

14. **DocumentDB for MongoDB workloads** without self-managing replica sets, sharding, backups. 6 copies across 3 AZs.

15. **DMS for database migrations** with minimal downtime using CDC. Remember Schema Conversion Tool (SCT) for heterogeneous migrations.

16. **IAM database authentication** eliminates password management for RDS/Aurora. Secrets Manager for automatic credential rotation.

17. **Performance Insights** for database performance monitoring - wait events, top SQL, dimension slicing.

18. **Read replica limitations**: Cannot create replica-from-replica for Oracle or SQL Server. Can for MySQL, PostgreSQL, MariaDB.

19. **Aurora advantages**: 5x MySQL / 3x PostgreSQL throughput, 6 copies across 3 AZs, up to 128 TB auto-scaling storage, <30s failover.

20. **DynamoDB partition key design**: High cardinality, uniform access, avoid hot partitions. Use composite keys for single-table design.

**AWS Documentation:**
- [AWS Database Services Overview](https://aws.amazon.com/products/databases/)
- [AWS Database Migration Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-database/)
- [Choosing the Right Database](https://aws.amazon.com/getting-started/decision-guides/databases-on-aws-how-to-choose/)
