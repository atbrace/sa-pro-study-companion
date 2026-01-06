---
title: Database Migration Strategies
lastUpdated: 2026-01-05
---

# Database Migration Strategies

Database migration is one of the most critical and complex aspects of cloud migration. This topic covers AWS services and strategies for migrating databases to AWS with minimal downtime, ensuring data integrity, and optimizing performance during and after migration.

## AWS Database Migration Service (DMS)

AWS DMS is a managed service that helps migrate databases to AWS quickly and securely. It supports homogeneous migrations (same database engine) and heterogeneous migrations (different database engines).

### Key Features

**Continuous Data Replication:**
- Change Data Capture (CDC) for ongoing replication
- Keeps source and target synchronized during migration
- Enables zero-downtime migrations

**Supported Endpoints:**
- Sources: Oracle, SQL Server, MySQL, PostgreSQL, MongoDB, SAP ASE, IBM Db2, Azure SQL
- Targets: RDS, Aurora, Redshift, DynamoDB, S3, Elasticsearch, Kinesis Data Streams
- On-premises to AWS, AWS to AWS, or AWS to on-premises

> 📚 [DMS Sources and Targets](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Introduction.Sources.html)

### DMS Components

**Replication Instance:**
- EC2 instance that runs DMS tasks
- Sizing depends on data volume, change rate, and complexity
- Multi-AZ option for high availability
- Placed in VPC with connectivity to both source and target

**Endpoints:**
- Source endpoint: Connection to source database
- Target endpoint: Connection to target database
- Test connections before creating tasks

**Migration Tasks:**
- Full load: Migrate existing data
- Full load + CDC: Migrate existing data and replicate ongoing changes
- CDC only: Replicate only ongoing changes

### Migration Types

**Full Load Migration:**
```
Source DB → DMS → Target DB (one-time transfer)
```
- Suitable for small databases or acceptable downtime
- Data snapshot at point in time

**Full Load + CDC:**
```
Phase 1: Full Load (bulk transfer)
Phase 2: CDC (continuous replication of changes)
```
- Enables zero-downtime migration
- Captures changes during full load
- Most common pattern for production databases

**CDC Only:**
```
Source DB → DMS → Target DB (ongoing changes only)
```
- Use when initial load done by other means
- Useful for keeping databases in sync

> 📚 [DMS Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html)

## AWS Schema Conversion Tool (SCT)

SCT converts database schemas and code from one database engine to another for heterogeneous migrations.

### Conversion Capabilities

**Schema Objects:**
- Tables, views, stored procedures, functions
- Triggers, sequences, indexes
- Foreign keys and constraints

**Application Code:**
- SQL embedded in application code
- Database-specific features to AWS equivalents
- Conversion assessment reports

**Data Warehouse Conversion:**
- Teradata → Redshift
- Oracle DW → Redshift
- Netezza → Redshift

### Conversion Process

1. **Connect to source database** - Analyze schema
2. **Assessment report** - Identify conversion complexity
3. **Convert schema** - Automatic conversion with manual review
4. **Apply to target** - Create objects in target database
5. **Optimize** - Tune for target database best practices

**Assessment Report Components:**
- Executive summary with conversion complexity
- Action items for manual conversion
- Estimated effort required
- Recommendations for target database

> 📚 [SCT Assessment Report](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_AssessmentReport.html)

### Extension Packs

SCT can install extension packs on target database to emulate source database features not available natively:

```
Oracle DBMS packages → Aurora PostgreSQL extension pack
```

## Homogeneous vs Heterogeneous Migrations

### Homogeneous Migrations

**Same database engine** (Oracle → RDS Oracle, MySQL → Aurora MySQL)

**Strategies:**
- **Native tools** - Faster, simpler (mysqldump, Oracle Data Pump)
- **AWS DMS** - Minimal downtime with CDC
- **Physical replication** - Binary log replication
- **Snapshots** - RDS snapshots for RDS-to-RDS

**Example: MySQL to Aurora MySQL:**
```
1. Create Aurora cluster
2. Set up DMS endpoints
3. Full load + CDC task
4. Monitor replication lag
5. Cutover when lag is minimal
```

### Heterogeneous Migrations

**Different database engines** (Oracle → Aurora PostgreSQL, SQL Server → Aurora MySQL)

**Required Steps:**
1. **Schema conversion** - Use SCT
2. **Code conversion** - Rewrite stored procedures/functions
3. **Application changes** - Update SQL dialects
4. **Data migration** - Use DMS
5. **Testing** - Extensive validation required

**Complexity Factors:**
- Proprietary features (Oracle packages, SQL Server CLR)
- Data type mismatches
- Encoding differences
- Performance optimization differences

> 📚 [Heterogeneous Migration Guide](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Introduction.Components.html)

## Change Data Capture (CDC)

CDC captures and replicates ongoing changes from source to target database during migration.

### How CDC Works

**Transaction Log Mining:**
- Oracle: Redo logs and archive logs
- SQL Server: Transaction logs
- MySQL: Binary logs
- PostgreSQL: Write-Ahead Logs (WAL)

**DMS CDC Process:**
```
1. Read transaction logs from source
2. Filter relevant changes
3. Apply changes to target
4. Track position in log (checkpoint)
```

### CDC Configuration

**Source Database Requirements:**
- Logging must be enabled (archive logs for Oracle, binlog for MySQL)
- Sufficient retention (don't overwrite before DMS reads)
- DMS user needs log reading permissions

**Monitoring CDC:**
- CDCIncomingChanges - Changes waiting to be applied
- CDCLatencySource - Time between source change and DMS read
- CDCLatencyTarget - Time between DMS read and target apply
- CDCThroughput - Changes applied per second

**CDC Best Practices:**
- Start CDC before full load completes
- Monitor replication lag continuously
- Size replication instance for peak change rate
- Use task settings to control batch size

> 📚 [DMS CDC Overview](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)

## Migration Best Practices and Strategies

### Pre-Migration Assessment

**Database Assessment:**
- Size: Total data volume
- Change rate: Transactions per second
- Schema complexity: Objects, dependencies
- Network: Bandwidth, latency to AWS

**Application Assessment:**
- Database connectivity patterns
- Query patterns and performance
- Transaction isolation requirements
- Acceptable downtime window

### Network Optimization

**Bandwidth Considerations:**
- Direct Connect for large databases (>1 TB)
- VPN for smaller migrations
- Compression enabled on DMS tasks
- Multi-threaded migrations for parallel transfer

**Network Path:**
```
On-Premises DB → VPN/Direct Connect → VPC → Replication Instance → Target DB
```

### Performance Optimization

**Replication Instance Sizing:**
- C5 instances for compute-intensive conversions
- R5 instances for memory-intensive workloads
- Multi-AZ for production migrations
- Start small, scale up if needed

**Task Configuration:**
- MaxFullLoadSubTasks: Parallel threads for full load
- ParallelLoadThreads: Concurrent table loading
- BatchApplyEnabled: Batch transactions for better performance
- CommitRate: Transactions per commit

**Target Database Optimization:**
- Disable foreign keys during migration
- Disable triggers during initial load
- Increase write throughput (IOPS for RDS)
- Pre-create tables with proper indexes

### Validation and Testing

**DMS Data Validation:**
- Compare row counts
- Validate data types
- Check primary key values
- Identify missing or mismatched records

**Application Testing:**
- Functional testing with test dataset
- Performance testing under load
- Failover testing
- Rollback procedures

> 📚 [DMS Validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)

## Snowball Edge for Large Database Transfers

For databases larger than 10 TB or limited network bandwidth, Snowball Edge provides an alternative to network-based migration.

### Snowball Edge Migration Process

**Architecture:**
```
1. On-Premises DB → SCT extracts data → Snowball Edge (local S3)
2. Ship Snowball Edge to AWS
3. AWS loads data to S3
4. DMS loads from S3 → Target DB
5. DMS CDC for ongoing changes
```

### When to Use Snowball Edge

**Scenarios:**
- Database size >10 TB
- Network bandwidth <100 Mbps
- Network transfer would take >1 week
- Network costs exceed Snowball costs

**Process Steps:**
1. **Use SCT** to extract data from source to Snowball Edge
2. **Ship device** to AWS (3-5 days)
3. **AWS uploads** to S3 (1-2 days)
4. **DMS task** loads from S3 to target database
5. **CDC replication** catches up changes since extraction

**Limitations:**
- Initial data only, not CDC
- Requires separate CDC task for ongoing changes
- Time delay during shipping
- Requires SCT agent installation

> 📚 [Snowball Edge for DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_LargeDBs.html)

### SCT Data Extraction Agents

**Local vs Remote Agents:**
- Local: Runs on same server as source DB
- Remote: Runs on separate server (better performance)

**Extraction Process:**
- Parallel extraction for better performance
- Data validation during extraction
- Compression to optimize storage

## Zero-Downtime Migration Patterns

### Pattern 1: DMS Full Load + CDC

```
Timeline:
Day 1-5:   Full load migration (DB still in use)
Day 5:     Full load complete, CDC catches up
Day 6:     Replication lag <1 minute
Day 6:     Cutover: Update app connection strings
```

**Steps:**
1. Create DMS task with Full Load + CDC
2. Start replication (no downtime)
3. Monitor CDCLatency metric
4. When lag is minimal, switch applications
5. Keep DMS running for rollback option

### Pattern 2: Database Read Replica Promotion

**For RDS to Aurora:**
```
1. Create Aurora read replica from RDS
2. Wait for replication lag to catch up
3. Promote Aurora replica to standalone
4. Update application connection strings
```

**Downtime:** ~5 minutes during cutover

### Pattern 3: Blue/Green Deployment

**Using RDS Blue/Green Deployments:**
```
Blue (Production):  Current RDS database
Green (Staging):    Target database with changes
Switchover:         Managed switchover with minimal downtime
```

**Benefits:**
- Built-in validation period
- Automatic replication and sync
- One-click switchover
- Automatic rollback if needed

> 📚 [RDS Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html)

### Pattern 4: Application-Level Dual Writes

**For complex heterogeneous migrations:**
```
1. Application writes to both old and new DB
2. Validate data consistency
3. Gradually shift reads to new DB
4. Stop writes to old DB
```

**Complexity:** High (requires application changes)
**Downtime:** Minimal (controlled by application)

## Migration Cutover Strategies

### Staged Cutover

**Phase 1: Read Replicas**
```
- Point read queries to new database
- Writes still to old database
- Validate read performance
```

**Phase 2: Gradual Write Migration**
```
- Migrate non-critical writes first
- Monitor performance and errors
- Migrate critical writes last
```

**Phase 3: Complete Cutover**
```
- Switch all writes to new database
- Keep old database for rollback period
```

### Instant Cutover

**Maintenance Window Approach:**
```
1. Announce maintenance window
2. Stop application or set to read-only
3. Wait for CDC to catch up completely
4. Switch connection strings
5. Restart application
6. Monitor for issues
```

**Downtime:** 15 minutes to 2 hours depending on final sync

### DNS-Based Cutover

**Using Route 53:**
```
1. Create DNS CNAME for database endpoint
2. Point to old database
3. Update DNS to new database endpoint
4. TTL controls switch timing
```

**Considerations:**
- Respect DNS TTL (set low before cutover)
- Application connection pooling may cache DNS

## Common Migration Scenarios

### Scenario 1: Oracle to Aurora PostgreSQL

**Steps:**
1. **SCT Assessment** - Identify conversion complexity
2. **Schema Conversion** - Convert DDL, stored procedures
3. **Extension Pack** - Install for Oracle compatibility
4. **DMS Migration** - Full load + CDC
5. **Application Updates** - Update SQL syntax, test
6. **Cutover** - Switch when CDC lag is minimal

**Challenges:**
- PL/SQL to PL/pgSQL conversion
- Oracle packages and functions
- Data type differences (DATE, NUMBER)
- Sequence implementation differences

### Scenario 2: On-Premises MySQL to Aurora MySQL

**Steps:**
1. **Create Aurora Cluster** - MySQL-compatible
2. **DMS Endpoints** - Source and target
3. **Initial Load** - Full load task
4. **CDC Replication** - Enable binary logging
5. **Validation** - Compare data
6. **Cutover** - Update connection strings

**Advantages:**
- Homogeneous migration (simpler)
- Native MySQL compatibility
- Aurora performance benefits

### Scenario 3: SQL Server to RDS SQL Server

**Options:**
- **Native backup/restore** - For manageable databases
- **DMS** - For minimal downtime
- **Transactional replication** - SQL Server native
- **Always On Availability Groups** - For SQL Server Enterprise

**DMS Approach:**
```
1. Enable SQL Server Agent
2. Enable MS-REPLICATION and MS-CDC
3. Create DMS task with CDC
4. Monitor replication
5. Cutover when ready
```

## Monitoring and Troubleshooting

### Key DMS Metrics (CloudWatch)

**Task Metrics:**
- FullLoadThroughputBandwidthSource - Data transfer rate
- FullLoadThroughputRowsSource - Rows migrated per second
- CDCIncomingChanges - Pending changes to apply
- CDCLatencySource - Time lag at source
- CDCLatencyTarget - Time lag at target

**Replication Instance Metrics:**
- CPUUtilization - Instance CPU usage
- FreeableMemory - Available memory
- NetworkTransmitThroughput - Outbound bandwidth
- NetworkReceiveThroughput - Inbound bandwidth

### Common Issues and Solutions

**High Replication Lag:**
- Scale up replication instance
- Increase ParallelApplyThreads
- Enable BatchApply
- Reduce source database transaction volume

**LOB Performance:**
- Use limited LOB mode for small LOBs (<100KB)
- Use full LOB mode only when necessary
- Consider inline LOB maximum size setting

**Connection Issues:**
- Verify security groups and NACLs
- Check endpoint connectivity
- Validate database user permissions
- Review VPC peering/routing

**Data Validation Failures:**
- Investigate primary key mismatches
- Check character encoding differences
- Review data transformation rules
- Validate NULL handling

> 📚 [DMS Troubleshooting](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Troubleshooting.html)

## Cost Optimization

### DMS Pricing Components

**Replication Instance:**
- Hourly charge based on instance type
- Stop instance when not in use (tasks are saved)
- Use smaller instances for testing

**Data Transfer:**
- Free within same region
- Standard data transfer charges for cross-region
- Direct Connect reduces costs for on-premises

**Storage:**
- Replication instance storage
- Logs and cached transactions

### Cost-Saving Strategies

**Right-Sizing:**
- Start with smaller instances
- Monitor metrics and scale as needed
- Use Multi-AZ only for production

**Scheduling:**
- Run migrations during off-peak hours
- Stop instances during testing breaks
- Delete resources after migration complete

**Network Optimization:**
- Use compression
- Minimize cross-region migrations
- Consider Snowball Edge for very large transfers

## Exam Tips

1. **DMS is for migration, not replication** - While it can do ongoing replication, it's optimized for migration
2. **SCT is required for heterogeneous** - Different database engines need schema conversion
3. **CDC requires transaction logs** - Source database must have logging enabled
4. **Snowball Edge threshold** - Consider for databases >10TB or limited bandwidth
5. **Replication lag monitoring** - CDCLatency metrics are critical for cutover timing
6. **Zero-downtime pattern** - Full Load + CDC is the standard approach
7. **Validation is separate** - Enable DMS validation for data integrity checks
8. **Multi-AZ for production** - Provides HA for replication instance
9. **Network path matters** - Direct Connect recommended for large migrations
10. **Target optimization** - Disable constraints/triggers during initial load for performance
11. **Extension packs** - Enable source database feature emulation on target
12. **Native tools vs DMS** - Native tools faster for homogeneous if downtime acceptable
13. **RDS to Aurora** - Consider read replica promotion for zero downtime
14. **Task configuration tuning** - Parallel loading and batch apply improve performance
15. **Rollback planning** - Keep source database until migration validated

## Advanced Patterns

### Multi-Region Database Migration

**Scenario:** Migrate to multiple AWS regions simultaneously

```
Source DB → DMS Task 1 → Region 1 (Primary)
         → DMS Task 2 → Region 2 (DR)
```

**Approach:**
- Separate DMS tasks for each region
- Monitor lag in both regions
- Cutover when both regions are synchronized

### Consolidation Migration

**Scenario:** Migrate multiple databases to single Aurora cluster

```
Source DB 1 →
Source DB 2 → DMS Tasks → Aurora Cluster (Multiple schemas)
Source DB 3 →
```

**Considerations:**
- Schema naming conflicts
- Resource sizing for combined workload
- Testing application connections

### Splitting Monolithic Database

**Scenario:** Decompose single database into microservices databases

```
Monolithic DB → DMS with table filters → Service DB 1 (tables A, B)
                                      → Service DB 2 (tables C, D)
                                      → Service DB 3 (tables E, F)
```

**Approach:**
- Use table mappings in DMS tasks
- Handle foreign key relationships
- Update application services

> 📚 [DMS Table Mapping](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html)
