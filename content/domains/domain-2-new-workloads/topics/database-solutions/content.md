---
title: Database Solutions and Data Stores
lastUpdated: 2026-01-05
---

# Database Solutions and Data Stores

Selecting the appropriate database service for new workloads requires understanding the data model, access patterns, performance requirements, and operational characteristics of each AWS database offering.

## Relational Databases

### Amazon RDS vs Amazon Aurora

**Amazon RDS** - Managed relational database service supporting multiple engines:

| Engine | Use Case | Key Features |
|--------|----------|--------------|
| **PostgreSQL** | Enterprise apps, geospatial | Advanced features, JSONB support |
| **MySQL** | Web applications | Widely adopted, simple |
| **MariaDB** | MySQL alternative | Community-driven, compatible |
| **Oracle** | Enterprise legacy | License flexibility (BYOL or LI) |
| **SQL Server** | Microsoft workloads | Windows authentication, SSRS |

**Amazon Aurora** - MySQL and PostgreSQL compatible with cloud-native enhancements:

**Aurora Advantages over RDS**:
- **Performance**: 5x MySQL, 3x PostgreSQL throughput
- **Storage**: Auto-scaling up to 128 TB
- **Availability**: 6 copies across 3 AZs
- **Read Replicas**: Up to 15 Aurora Replicas
- **Failover**: Sub-30 second automated failover
- **Backtrack**: Rewind database without restore (MySQL only)

**Aurora Serverless v2**:
```
Capacity: 0.5 ACU to 128 ACU
Scaling: Instant, fine-grained
Use case: Variable workloads, dev/test, multi-tenant SaaS
Cost: Pay per ACU-second
```

> 📚 [Amazon Aurora User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/)

### RDS/Aurora Deployment Options

**Multi-AZ Deployments**:

*Standard Multi-AZ (RDS)*:
- Synchronous replication to standby in different AZ
- Automatic failover to standby
- Single endpoint (DNS switches on failover)
- For high availability, not read scaling

*Multi-AZ with Readable Standbys (RDS)*:
- Two readable standby replicas in different AZs
- All three replicas can serve read traffic
- Available for MySQL, PostgreSQL, MariaDB

*Aurora Multi-AZ*:
- Up to 15 Aurora Replicas across AZs
- All replicas can serve reads
- Shared storage (6 copies) across 3 AZs
- Automatic failover priority based on tier

**Global Databases**:

*RDS for MySQL/PostgreSQL*:
- Cross-region read replicas
- Asynchronous replication
- Manual promotion to primary

*Aurora Global Database*:
- Primary region + up to 5 secondary regions
- < 1 second replication lag
- Disaster recovery with < 1 minute RPO
- Promotes secondary to primary in < 1 minute

> 📚 [RDS Multi-AZ Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)

### RDS/Aurora Performance Optimization

**Read Replicas**:
```
RDS: Up to 15 read replicas
Aurora: Up to 15 Aurora Replicas

Use cases:
- Read scaling
- Analytics workloads
- Cross-region disaster recovery
```

**RDS Proxy**:
- Connection pooling for Lambda and containerized apps
- Reduces database connection overhead
- Improves failover time (66% faster)
- Enforces IAM authentication

**Performance Insights**:
- Visualize database load
- Identify performance bottlenecks
- Wait event analysis
- Top SQL queries

**Aurora Optimizations**:
- **Fast clones**: Create clone from snapshot in minutes
- **Parallel Query**: Offload query processing to storage layer
- **Query Plan Management**: Pin good query plans
- **Backtrack**: Rewind to specific timestamp without restore

## NoSQL Databases

### Amazon DynamoDB

**Key Characteristics**:
- Fully managed, serverless NoSQL
- Single-digit millisecond latency
- Automatic scaling
- Multi-AZ, multi-region replication
- Event-driven with DynamoDB Streams

**Capacity Modes**:

| Feature | On-Demand | Provisioned |
|---------|-----------|-------------|
| **Scaling** | Automatic, instant | Manual or auto-scaling |
| **Cost** | Pay per request | Pay per provisioned capacity |
| **Use case** | Unpredictable, new workloads | Predictable, steady traffic |
| **Throughput** | Unlimited | WCU/RCU limits |

**Table Design Patterns**:

*Single Table Design*:
```
PK: CUSTOMER#123
SK: #METADATA

PK: CUSTOMER#123
SK: ORDER#2024-001

PK: CUSTOMER#123
SK: ORDER#2024-002

Benefit: Retrieve customer + orders in single query
```

**Secondary Indexes**:

*Global Secondary Index (GSI)*:
- Different partition and sort keys
- Eventual consistency only
- Sparse index (only items with index attributes)
- Queries against different access patterns

*Local Secondary Index (LSI)*:
- Same partition key, different sort key
- Strongly or eventually consistent
- Created at table creation (cannot add later)
- Shares throughput with base table

**DynamoDB Accelerator (DAX)**:
```
In-memory cache for DynamoDB
Microsecond latency for reads
Write-through caching
Compatible with DynamoDB API
Use case: Read-heavy workloads, gaming leaderboards
```

**Global Tables**:
- Multi-region, active-active replication
- < 1 second replication between regions
- Conflict resolution: Last Writer Wins
- Automatic region failover

> 📚 [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)

### Amazon DocumentDB (MongoDB Compatible)

**Use Cases**:
- Content management systems
- Catalogs and profiles
- User profiles
- Mobile and web applications

**Key Features**:
- MongoDB 3.6, 4.0, 5.0 compatibility
- Fully managed with automatic scaling
- 6 copies across 3 AZs
- Up to 15 read replicas
- Continuous backup to S3
- Point-in-time recovery

**vs MongoDB on EC2**:
- No server management or patching
- Automatic backups and recovery
- Integrated with VPC, IAM, KMS
- Performance Insights

## Caching Solutions

### Amazon ElastiCache

**Redis vs Memcached Decision Matrix**:

| Feature | Redis | Memcached |
|---------|-------|-----------|
| **Data structures** | Strings, lists, sets, sorted sets, hashes | Strings only |
| **Persistence** | Optional snapshots, AOF | None |
| **Replication** | Multi-AZ with auto-failover | Multi-node (sharding) |
| **Backup/Restore** | Yes | No |
| **Multi-threaded** | No | Yes |
| **Pub/Sub** | Yes | No |
| **Transactions** | Yes | No |
| **Lua scripting** | Yes | No |
| **Geospatial** | Yes | No |

**Redis Use Cases**:
- Session storage with persistence
- Real-time leaderboards (sorted sets)
- Pub/Sub messaging
- Geospatial data
- Rate limiting

**Memcached Use Cases**:
- Simple caching (key-value)
- Large cache nodes (multi-core)
- Multi-threaded performance
- Horizontal scaling

**ElastiCache for Redis Cluster Mode**:

*Disabled*:
- Single shard (node group)
- 1 primary + up to 5 read replicas
- All data on all nodes

*Enabled*:
- Up to 500 shards
- Data partitioned across shards
- Horizontal scaling
- Higher availability

> 📚 [ElastiCache for Redis User Guide](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/)

### Amazon MemoryDB for Redis

**vs ElastiCache for Redis**:

| Feature | MemoryDB | ElastiCache Redis |
|---------|----------|-------------------|
| **Durability** | Durable, Multi-AZ transaction log | Optional persistence |
| **Use case** | Primary database | Cache layer |
| **Consistency** | Strong consistency | Eventual (with replication) |
| **Recovery** | Automatic, no data loss | May lose data since last snapshot |
| **Performance** | Single-digit ms reads, low-ms writes | Microsecond latency |

**MemoryDB Use Cases**:
- Microservices with Redis API
- Primary database for simple data models
- Real-time applications requiring durability
- Gaming session stores
- Streaming analytics

## Specialized Databases

### Amazon Neptune (Graph Database)

**Graph Models**:
- **Property Graph**: Gremlin (Apache TinkerPop)
- **RDF**: SPARQL

**Use Cases**:
- Social networks (relationships)
- Fraud detection (pattern matching)
- Recommendation engines
- Knowledge graphs
- Network topology

**Key Features**:
- Multi-AZ with read replicas
- Point-in-time recovery
- Continuous backup to S3
- Fast query performance on connected data

> 📚 [Amazon Neptune User Guide](https://docs.aws.amazon.com/neptune/latest/userguide/)

### Amazon QLDB (Quantum Ledger Database)

**Characteristics**:
- Immutable, cryptographically verifiable ledger
- Transparent, append-only journal
- Full history of all changes
- PartiQL (SQL-compatible)

**Use Cases**:
- Financial transaction systems
- Supply chain tracking
- Healthcare records
- System of record applications
- Regulatory compliance

**QLDB vs Blockchain**:
- Centralized (single AWS account owns ledger)
- No consensus protocols (higher performance)
- Cryptographic verification without decentralization

### Amazon Timestream (Time-Series Database)

**Optimized For**:
- IoT sensor data
- Application metrics
- DevOps monitoring
- Industrial telemetry

**Key Features**:
- Automatic tiering (memory → magnetic storage)
- Built-in time-series analytics
- 1000x faster, 1/10th cost vs relational
- Serverless, auto-scaling

**Data Lifecycle**:
```
Recent data → Memory store (fast queries)
Older data → Magnetic store (cost-optimized)
Automatic archival based on retention policies
```

> 📚 [Amazon Timestream Developer Guide](https://docs.aws.amazon.com/timestream/latest/developerguide/)

### Amazon Keyspaces (Apache Cassandra)

**Use Cases**:
- High-scale applications
- IoT device data
- Time-series data
- Globally distributed apps

**Key Features**:
- Cassandra Query Language (CQL) compatible
- Serverless, pay-per-request
- Multi-region replication
- Single-digit millisecond latency
- Continuous backups with point-in-time recovery

**vs Cassandra on EC2**:
- No cluster management
- Automatic scaling
- No capacity planning
- Built-in security (IAM, KMS, VPC)

## Database Migration Strategies

### AWS Database Migration Service (DMS)

**Migration Types**:

*Homogeneous*:
- Oracle → RDS for Oracle
- MySQL → Aurora MySQL
- PostgreSQL → RDS for PostgreSQL

*Heterogeneous*:
- Oracle → Aurora PostgreSQL (with Schema Conversion Tool)
- SQL Server → Aurora MySQL
- MongoDB → DocumentDB

**Migration Approaches**:

```
Full Load: Migrate existing data
CDC (Change Data Capture): Continuous replication
Full Load + CDC: Initial load then ongoing sync
```

**DMS Replication Instance**:
- Runs on EC2 in your VPC
- Size based on data volume and change rate
- Multi-AZ for production migrations

### Schema Conversion Tool (SCT)

**Capabilities**:
- Analyze source database schema
- Generate target schema DDL
- Identify incompatibilities
- Suggest alternatives for unsupported features
- Convert stored procedures, functions, triggers

**Assessment Report**:
- Schema conversion complexity
- Estimated effort
- Action items for manual changes

> 📚 [AWS DMS User Guide](https://docs.aws.amazon.com/dms/latest/userguide/)

## Database Security Best Practices

**Encryption**:
- **At Rest**: KMS encryption for RDS, Aurora, DynamoDB, DocumentDB
- **In Transit**: TLS/SSL for all connections
- **Field-level**: Client-side encryption for sensitive fields

**Access Control**:
- **IAM Database Authentication**: RDS, Aurora (no passwords)
- **Secrets Manager**: Automatic credential rotation
- **Security Groups**: Network-level access control
- **VPC**: Database in private subnets

**Auditing**:
- **RDS/Aurora**: Database audit logs to CloudWatch
- **DynamoDB**: CloudTrail for API calls
- **Neptune**: Audit logs to CloudWatch

**Backup and Recovery**:
- **Automated Backups**: RDS, Aurora, DynamoDB
- **Manual Snapshots**: On-demand backups
- **Point-in-Time Recovery**: DynamoDB, RDS, Aurora
- **Cross-Region Backups**: For disaster recovery

## Performance Tuning

### RDS/Aurora Tuning

**Parameter Groups**:
```
Shared buffers, work mem, maintenance work mem
Query planner settings
Connection pooling parameters
```

**Read Scaling Patterns**:
1. Read replicas for read-heavy workloads
2. Aurora Auto Scaling for dynamic read capacity
3. ElastiCache for frequently accessed data
4. DynamoDB DAX for DynamoDB caching

**Write Scaling Patterns**:
1. Vertical scaling (larger instance)
2. Write sharding (application-level)
3. Aurora Serverless v2 for variable workloads

### DynamoDB Tuning

**Partition Key Design**:
- High cardinality (many distinct values)
- Uniform access pattern
- Avoid hot partitions

**Burst Capacity**:
- Temporary capacity for spikes
- Consumed before throttling

**Auto Scaling**:
```
Target utilization: 70%
Scale-out: Quick (seconds to minutes)
Scale-in: Gradual (conservative)
```

## Exam Tips

1. **Aurora is often the answer** for relational databases requiring high performance, availability, and cloud-native features
2. **DynamoDB for serverless NoSQL** with predictable single-digit millisecond latency
3. **ElastiCache for Redis when you need persistence or advanced data structures**; Memcached for simple multi-threaded caching
4. **MemoryDB when Redis is the primary database** with durability requirements
5. **RDS Multi-AZ for HA**, read replicas for read scaling
6. **Global databases** for multi-region active-passive (Aurora) or active-active (DynamoDB)
7. **Neptune for graph traversals** (social networks, fraud detection)
8. **QLDB for immutable audit trails** with cryptographic verification
9. **Timestream for time-series data** (IoT, metrics, telemetry)
10. **Keyspaces for Cassandra-compatible** serverless wide-column store
11. **DAX for DynamoDB caching** with microsecond latency
12. **RDS Proxy for connection pooling** with Lambda and containers
13. **Aurora Serverless v2 for variable workloads** with instant scaling
14. **DMS for database migrations** with minimal downtime using CDC
15. **SCT for heterogeneous migrations** with schema conversion

## Common Architectural Patterns

### Multi-Tier Application with Caching

```
┌─────────────┐
│   Route 53  │
└──────┬──────┘
       │
┌──────▼──────┐
│     ALB     │
└──────┬──────┘
       │
┌──────▼──────┐     ┌─────────────┐
│   App Tier  │────>│ ElastiCache │
│  (ECS/EKS)  │     │    Redis    │
└──────┬──────┘     └─────────────┘
       │
┌──────▼──────┐     ┌─────────────┐
│   Aurora    │────>│   S3 for    │
│   Cluster   │     │   Backups   │
└─────────────┘     └─────────────┘
```

### Global Application with DynamoDB

```
┌──────────────────┐     ┌──────────────────┐
│   us-east-1      │     │   eu-west-1      │
│                  │     │                  │
│  DynamoDB Table  │<───>│  DynamoDB Table  │
│  (Global Table)  │     │  (Global Table)  │
│                  │     │                  │
│   Application    │     │   Application    │
└──────────────────┘     └──────────────────┘

Active-Active Replication
< 1 second replication lag
Last Writer Wins conflict resolution
```

### Microservices with Purpose-Built Databases

```
┌───────────────┐
│   API Gateway │
└───────┬───────┘
        │
    ┌───┴────┬─────────┬──────────┐
    │        │         │          │
┌───▼────┐ ┌─▼─────┐ ┌▼──────┐ ┌─▼──────┐
│ User   │ │Product│ │ Order │ │Catalog │
│Service │ │Service│ │Service│ │Service │
└───┬────┘ └───┬───┘ └───┬───┘ └───┬────┘
    │          │         │         │
┌───▼────┐ ┌───▼────┐ ┌──▼─────┐ ┌▼──────┐
│DynamoDB│ │ Aurora │ │  RDS   │ │Neptune│
│        │ │        │ │        │ │ Graph │
└────────┘ └────────┘ └────────┘ └───────┘
```

> 📚 [AWS Database Services Overview](https://aws.amazon.com/products/databases/)
