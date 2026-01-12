---
title: Database Migration Strategies
lastUpdated: 2026-01-06
---

# Database Migration Strategies

Database migration is one of the most critical and complex aspects of cloud migration, often representing the highest-risk component of enterprise cloud adoption. This topic covers AWS services and strategies for migrating databases to AWS with minimal downtime, ensuring data integrity, and optimizing performance during and after migration.

AWS provides a comprehensive suite of migration tools designed to handle databases ranging from gigabytes to petabytes, supporting both homogeneous (same database engine) and heterogeneous (different database engines) migrations. Understanding the capabilities, limitations, and optimal use cases for each tool is essential for SAP-C02 certification and real-world migration success.

## AWS Database Migration Service (DMS)

AWS DMS is a fully managed service that orchestrates database migration with minimal downtime to applications. It eliminates the need to install and maintain migration infrastructure, automatically handles capacity provisioning, patching, and failure recovery. The service is optimized for migration scenarios rather than permanent data replication.

### Key Features and Capabilities

**Automated Infrastructure Management:**
- No hardware provisioning required - operational within minutes
- AWS manages replication server software updates and patches
- Automatic failover to standby replication instance in Multi-AZ deployments
- Built-in monitoring via CloudWatch with task-level and table-level metrics

**Continuous Data Replication:**
- Change Data Capture (CDC) for ongoing replication during and after migration
- Keeps source and target synchronized with sub-second latency achievable
- Enables zero-downtime migrations through Full Load + CDC pattern
- Transaction log-based replication ensures data consistency

**DMS Fleet Advisor (Discovery):**
- Automatically discovers on-premises database and analytics infrastructure
- Builds comprehensive inventory of servers, databases, and schemas
- Identifies migration candidates and complexity assessment
- Helps prioritize migration waves and estimate effort

**DMS Schema Conversion (Cloud Service):**
- Automated schema assessment with complexity scoring
- Cloud-based alternative to downloadable SCT
- Integration with migration workflows
- Available as part of DMS console experience

**Supported Endpoints:**
- **Sources:** Oracle (10.1+), SQL Server (2008 R2-2022), MySQL (5.5+), PostgreSQL (9.1+), MongoDB, SAP ASE, IBM Db2 (LUW and z/OS), Azure SQL Database, MariaDB, Amazon DocumentDB
- **Targets:** Amazon RDS (all engines), Aurora (MySQL/PostgreSQL-compatible), Redshift, DynamoDB, S3, OpenSearch (formerly Elasticsearch), Kinesis Data Streams, Apache Kafka, Neptune, Redis
- **Patterns:** On-premises to AWS, AWS to AWS, AWS to on-premises, or cloud-to-cloud

**Security Features:**
- Data at rest encrypted using AWS KMS with customer-managed keys
- Data in transit encrypted via SSL/TLS connections
- VPC deployment with security group and network ACL controls
- IAM integration for access management and service roles
- Support for AWS Secrets Manager for credential storage

**AWS Documentation:**
- [What is AWS Database Migration Service?](https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html)
- [Sources for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.html)
- [Targets for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.html)
- [AWS DMS Features](https://aws.amazon.com/dms/features/)

### DMS Components

**Replication Instance:**
- Amazon EC2 instance running within your VPC that executes replication software
- Processes data primarily in memory; large transactions buffer to disk (monitor `ReadIOPS` and `WriteIOPS`)
- Instance sizing depends on data volume, transaction change rate, schema complexity, and number of concurrent tasks
- Multi-AZ deployments provide automatic failover with synchronous standby replica in different AZ
- Available in 40+ AWS regions including GovCloud for government workloads
- Default storage: 50-100 GB GP2 volumes (3 IOPS baseline, burst to 3,000 IOPS)

**Instance Class Selection:**
- **T3 instances:** Development and testing only (burstable performance, not production-suitable)
- **C5 instances:** Compute-optimized for heterogeneous migrations with complex transformations (up to 25 Gbps network bandwidth)
- **R5 instances:** Memory-optimized for high-throughput workloads (up to 768 GiB memory, 5% more memory per vCPU than R4)
- **Multi-AZ recommendation:** Production migrations and ongoing replication scenarios (note: full load tasks may require restart after failover)

**Real-World Scenario:** A 500 GB Oracle database with 10,000 transactions/second during peak hours migrating to Aurora PostgreSQL would typically require a C5.4xlarge instance for the conversion overhead, while a homogeneous MySQL to Aurora MySQL migration of the same size might use an R5.2xlarge.

**Endpoints:**
- **Source endpoint:** Connection configuration to source database including host, port, credentials, SSL certificates, and engine-specific extra connection attributes
- **Target endpoint:** Connection to target database with similar configuration plus target-specific optimization settings
- **Test connections:** Always validate connectivity before task creation (tests network path, credentials, and database availability)
- **Secrets Manager integration:** Store credentials securely rather than embedded in endpoint configuration
- **SSL/TLS support:** TLS 1.2+ for encrypted connections (TLS 1.3 recommended for Oracle, SQL Server, PostgreSQL)

**Migration Tasks:**
- **Full load:** One-time snapshot migration of existing data (suitable for smaller databases with acceptable downtime)
- **Full load + CDC:** Migrate existing data then continuously replicate ongoing changes (most common production pattern)
- **CDC only:** Replicate only ongoing changes after initial data load by other means (useful for keeping databases synchronized)
- **Validation-only tasks:** Dedicated validation without migration (available v3.4.6+) for data integrity verification
- Task configuration via JSON settings with 100+ tunable parameters

**AWS Documentation:**
- [Working with AWS DMS replication instances](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.html)
- [Working with AWS DMS endpoints](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.html)
- [Working with AWS DMS tasks](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.html)

### Migration Types and Task Configuration

**Full Load Migration:**
```
Source DB → DMS Replication Instance → Target DB (one-time bulk transfer)
```
- Suitable for smaller databases (< 100 GB) with acceptable downtime window
- Creates point-in-time snapshot of source data
- Default: 8 tables loaded in parallel (configurable via `MaxFullLoadSubTasks` up to system limits)
- Transaction consistency timeout: 600 seconds default
- Commit rate: 10,000 records per checkpoint (configurable via `CommitRate`)

**Performance Optimization:** For large tables, use parallel full load with partitioned loading (supported on Oracle, SQL Server, MySQL, Sybase, IBM Db2 LUW) by configuring `table-settings` rules with `parallel-load` option.

**Full Load + CDC (Zero-Downtime Pattern):**
```
Phase 1: Full Load (bulk transfer while source remains operational)
Phase 2: CDC (continuous replication of ongoing changes)
Phase 3: Cutover (when replication lag is minimal)
```
- Most common pattern for production database migrations
- CDC begins capturing changes before full load completes
- Cached changes applied after full load finishes
- Enables migration with minimal or zero application downtime
- Monitor `CDCLatencySource` and `CDCLatencyTarget` to determine cutover timing

**Real-World Timeline Example:**
```
Day 1-5:   Full load of 2 TB database (source DB remains fully operational)
Day 5:     Full load completes, cached CDC changes begin applying
Day 5-6:   CDC catches up to near-real-time (lag < 1 minute)
Day 6:     Application cutover during planned maintenance window (15-30 min)
Day 6+:    Keep DMS running 24-48 hours for potential rollback
```

**CDC Only:**
```
Source DB → DMS → Target DB (ongoing changes only, no full load)
```
- Use when initial data already exists on target (loaded by native tools, Snowball Edge, or previous DMS task)
- Useful for maintaining synchronized read replicas across regions
- Bidirectional replication supported (Oracle, SQL Server, MySQL, PostgreSQL, Aurora) with loopback prevention
- Can start from custom timestamp, native start point (LSN/SCN), or checkpoint

**Validation-Only Tasks (v3.4.6+):**
- Compare data between source and target without performing migration
- Two modes: Full Load Validation Only (single-pass comparison) and CDC Validation Only (continuous comparison)
- Useful for post-migration verification or testing data repair scripts
- Reports failures immediately in full load mode; retries in CDC mode to prevent false positives

**AWS Documentation:**
- [AWS DMS task settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html)
- [Full load task settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.FullLoad.html)
- [Parallel full load settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Tablesettings.html)

## AWS Schema Conversion Tool (SCT)

AWS SCT automates the conversion of database schemas and code objects from one database engine to another, making heterogeneous migrations feasible. Available as both a downloadable application and cloud service (DMS Schema Conversion), SCT analyzes source databases, generates conversion reports, and converts compatible objects automatically while flagging items requiring manual intervention.

**Critical Understanding:** SCT does NOT migrate data - it only converts schema definitions and code objects. Data migration is handled by AWS DMS or other tools. For homogeneous migrations (same database engine), SCT is typically unnecessary; use native database tools instead (SQL Developer for Oracle, MySQL Workbench, pgAdmin for PostgreSQL).

### Supported Conversion Paths

**OLTP Database Conversions:**

| Source | Target Engines |
|--------|---------------|
| Oracle (10.1+) | Aurora MySQL, Aurora PostgreSQL, MySQL, PostgreSQL, RDS Oracle |
| SQL Server (2008 R2-2022) | Aurora MySQL, Aurora PostgreSQL, Babelfish for Aurora PostgreSQL, MySQL, PostgreSQL, RDS SQL Server |
| IBM Db2 LUW (9.1-11.5) | Aurora MySQL, Aurora PostgreSQL, MySQL, PostgreSQL |
| IBM Db2 z/OS (v12) | Aurora MySQL, Aurora PostgreSQL, MySQL, PostgreSQL |
| MySQL (5.5+) | Aurora PostgreSQL, PostgreSQL |
| PostgreSQL (9.1+) | Aurora MySQL, MySQL, Aurora PostgreSQL |
| SAP ASE (12.5.4-16.0) | Aurora MySQL, Aurora PostgreSQL, MySQL, PostgreSQL |
| Azure SQL Database | Aurora MySQL, Aurora PostgreSQL, MySQL, PostgreSQL |

**Data Warehouse Conversions (All to Amazon Redshift):**
- Teradata (13+), Oracle DW (10.1+), Netezza (7.0.3+), Greenplum (4.3, 6.21)
- SQL Server (2008+), Vertica (7.2.2+), Azure Synapse Analytics
- Snowflake (v3), Google BigQuery, Amazon Redshift (optimization)

**NoSQL and ETL Conversions:**
- Apache Cassandra (2.1.x, 2.2.16, 3.11.x) to DynamoDB
- Teradata BTEQ scripts to Redshift RSQL
- SQL Server Integration Services (SSIS) to AWS Glue
- Informatica ETL processes to Informatica on AWS

### Conversion Capabilities

**Schema Objects:**
- Tables with columns, data types, constraints, and defaults
- Views, materialized views, and indexed views
- Stored procedures, functions, packages (Oracle)
- Triggers (DDL and DML)
- Sequences and auto-increment configurations
- Indexes (B-tree, bitmap, unique, composite)
- Foreign keys, check constraints, and unique constraints
- Synonyms, database links (converted to appropriate equivalents)

**Application Code:**
- SQL embedded in C++, C#, Java, and other languages
- Extract and convert SQL statements from application source code
- Identify database-specific SQL dialects requiring changes
- Generate conversion reports for application teams

**Database-Specific Features:**
- Oracle PL/SQL packages and DBMS_* packages to PL/pgSQL or MySQL equivalents
- SQL Server T-SQL stored procedures to target equivalents
- Proprietary data types to standard SQL types
- Database-specific functions (TO_CHAR, NVL, ISNULL) to target syntax

### Conversion Process and Workflow

**1. Install and Configure SCT:**
- Download SCT application (Windows, macOS, Linux) or use DMS Schema Conversion cloud service
- Install JDBC drivers for source and target databases
- Configure AWS credentials for accessing target RDS/Aurora instances
- Set up network connectivity to both source and target

**2. Create Database Migration Project:**
- Connect to source database with read permissions
- Specify target database engine and version
- Configure migration rules and object selection filters
- Choose optimization strategies (OLTP vs. Data Warehouse)

**3. Generate Migration Assessment Report:**
- SCT analyzes entire schema structure and code objects
- Generates comprehensive assessment with conversion complexity scores
- Categorizes items: automatically convertible, requires minor changes, manual conversion needed
- Provides estimated effort in person-hours
- Identifies incompatible features and suggests workarounds or alternatives

**Assessment Report Sections:**
- **Executive Summary:** Overall conversion feasibility, estimated effort, recommended migration strategy
- **License Evaluation:** Potential cost savings from commercial to open-source engines
- **Cloud Readiness:** Recommendations for RDS vs. Aurora, instance sizing
- **Action Items:** Detailed list of manual conversion tasks with source code references
- **SQL Complexity:** Analysis of stored procedures, functions, triggers requiring attention

**4. Automatic Schema Conversion:**
- Convert compatible objects automatically (typically 90-95% for well-supported paths like Oracle to PostgreSQL)
- Review conversion warnings and errors for items requiring attention
- Edit converted SQL in SCT editor to address manual conversion items
- Validate converted code syntax for target database

**5. Apply Converted Schema to Target:**
- Generate DDL scripts for target database
- Apply schema to target RDS, Aurora, or EC2 database instance
- Optionally install extension packs for feature emulation
- Verify schema creation and object dependencies

**6. Code Optimization and Testing:**
- Optimize converted code for target database best practices
- Add Redshift-specific optimizations (distribution keys, sort keys, compression)
- Test stored procedures, functions, triggers for functional equivalence
- Performance testing and query optimization

**Real-World Example:** Migrating a 500-table Oracle database to Aurora PostgreSQL might show: 450 tables auto-convertible (90%), 35 requiring minor changes (7%), 15 with complex triggers/packages requiring manual conversion (3%). Assessment report estimates 80-120 hours for manual conversion work.

### Extension Packs

Extension packs are collections of AWS Lambda functions, Python libraries, and SQL code installed on the target database to emulate source database features unavailable natively:

**Oracle to Aurora PostgreSQL Extension Pack:**
- Emulates Oracle DBMS packages (DBMS_OUTPUT, DBMS_LOB, UTL_FILE, etc.)
- Implements Oracle-specific functions not in PostgreSQL
- Provides compatibility layer for Oracle data types
- Reduces manual conversion effort significantly

**SQL Server to Aurora PostgreSQL Extension Pack:**
- Emulates SQL Server system functions and stored procedures
- Implements T-SQL specific features in PL/pgSQL
- Provides compatibility for SQL Server data types

**Installation:**
```sql
-- Extension pack installed via SCT during schema application
-- Adds schemas like aws_oracle_ext or aws_sqlserver_ext to target database
-- Applications call extension pack functions for compatibility
```

**Trade-offs:**
- **Pros:** Reduces conversion effort, speeds migration, provides functional compatibility
- **Cons:** Adds runtime overhead, creates dependency on AWS-maintained libraries, may have performance differences from native implementation

**AWS Documentation:**
- [What is AWS Schema Conversion Tool?](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Welcome.html)
- [Creating migration assessment reports](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_AssessmentReport.html)
- [Converting database schemas](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_Converting.html)
- [Using extension packs](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/CHAP_ExtensionPack.html)

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

CDC is the mechanism by which DMS captures ongoing database changes and replicates them to the target, enabling near-zero-downtime migrations and continuous synchronization. Understanding CDC implementation details is critical for the SAP-C02 exam, as it directly impacts migration success, performance, and downtime windows.

### How CDC Works: Engine-Specific Implementation

AWS DMS uses database engine-specific APIs to read changes from native transaction logs without data loss or source database performance degradation. Each database engine has different log structures and access methods:

**Oracle CDC:**
- **LogMiner API (Default):** Reads online and archive redo logs via Oracle's LogMiner interface
  - Higher source database I/O impact
  - Simpler configuration, no additional setup required
  - Tracks position using System Change Number (SCN)
  - Query current position: `SELECT CURRENT_SCN FROM V$DATABASE;`

- **Binary Reader API (bfile):** Directly reads redo log files from filesystem or ASM
  - Lower source database I/O impact (better performance)
  - Supports LOB CDC in Oracle 12c+ (LogMiner does not)
  - Recommended for Oracle RAC environments
  - Requires additional configuration and file access permissions
  - Extra connection attribute: `useLogMinerReader=N;useBfile=Y;`

**Oracle CDC Prerequisites:**
```sql
-- Enable ARCHIVELOG mode (required for CDC)
SELECT log_mode FROM v$database;  -- Check current mode
ALTER DATABASE ARCHIVELOG;        -- Enable if needed

-- Enable supplemental logging (required for CDC)
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
ALTER TABLE schema.table ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;

-- Grant necessary permissions
GRANT SELECT ON V_$ARCHIVED_LOG TO dms_user;
GRANT SELECT ON V_$LOG TO dms_user;
GRANT EXECUTE ON DBMS_LOGMNR TO dms_user;
GRANT LOGMINING TO dms_user;  -- Oracle 12c+
```

**SQL Server CDC:**
- Uses MS-Replication or MS-CDC features with `fn_dblog()` or `fn_dump_dblog()` functions
- Tracks position using Log Sequence Number (LSN)
- LSN format: `00000014:00000061:0001` (VLF sequence:log block offset:slot number)
- Query current position: `SELECT * FROM fn_dblog();`
- Requires transaction log backups enabled (not SIMPLE recovery mode)

**MySQL CDC:**
- Reads from row-based binary logs (binlog)
- Binary logging must be enabled with ROW format (not STATEMENT or MIXED)
- Tracks position using binlog filename and byte position
- Example start point: `mysql-bin-changelog.000024:373`
- Binlog retention must accommodate full load duration plus buffer time

```sql
-- MySQL CDC configuration
SET GLOBAL binlog_format = 'ROW';
SET GLOBAL binlog_row_image = 'FULL';
-- Verify settings
SHOW VARIABLES LIKE 'binlog_format';
SHOW MASTER STATUS;
```

**PostgreSQL CDC:**
- Uses logical replication slots with test_decoding plugin
- Reads from Write-Ahead Logs (WAL)
- Automatic WAL retention management (no manual configuration needed)
- Position format: `checkpoint:V1#1#000004AF/B00000D0#0#0#*#0#0`
- Query replication slots: `SELECT * FROM pg_replication_slots;`

**Amazon RDS CDC Requirements:**
- Automated backups must be enabled (disabled backups = no CDC)
- Backup retention minimum 24 hours recommended
- Oracle RDS: Use `rdsadmin.rdsadmin_util.set_configuration('archivelog retention hours', 24);`
- SQL Server RDS: Cannot use SIMPLE recovery model

### DMS CDC Process Flow

```
1. DMS reads transaction log entries from source database
2. Filters changes relevant to selected tables/schemas
3. Transforms data types and applies mapping rules
4. Buffers changes in replication instance memory (large batches use disk)
5. Applies changes to target database
6. Updates checkpoint to track committed position in source log
7. Continues monitoring log for new changes
```

**Checkpoints and Recovery:**
- DMS maintains checkpoint of current position in source transaction log
- Enables task resumption after failure without data loss
- Stored in `awsdms_txn_state` metadata table (when TaskRecoveryTableEnabled=true)
- Query checkpoint: `SELECT * FROM awsdms_txn_state;`
- Can start CDC from custom timestamp, native start point (LSN/SCN), or saved checkpoint

### CDC Start Points and Open Transactions

**Custom CDC Start Time:**
- Specify UTC timestamp via console or CLI
- DMS converts timestamp to native start point (LSN/SCN)
- **Important limitation:** PostgreSQL does not support custom CDC start times (no timestamp-to-LSN mapping)

**Native Start Points:**
- Oracle SCN: `SELECT CURRENT_SCN FROM V$DATABASE;`
- SQL Server LSN: `SELECT * FROM fn_dblog();`
- MySQL binlog position: `SHOW MASTER STATUS;`
- PostgreSQL WAL position: Query replication slot

**Open Transaction Handling:**
When starting CDC from specific SCN/timestamp, you may miss transactions that:
- Started before the CDC start point
- Committed after the CDC start point

**Solution:** Use `openTransactionWindow` endpoint setting (DMS 3.5.1+)
```json
{
  "EndpointSettings": {
    "openTransactionWindow": 30
  }
}
```
This shifts the CDC capture position backward by specified minutes to include open transactions.

### CDC Configuration and Optimization

**Source Database Requirements:**
| Database | Requirement | Configuration |
|----------|-------------|---------------|
| Oracle | ARCHIVELOG mode, Supplemental logging | `ALTER DATABASE ARCHIVELOG;` |
| SQL Server | FULL or BULK_LOGGED recovery, MS-CDC/MS-Replication enabled | Not SIMPLE recovery |
| MySQL | Row-based binary logging | `binlog_format='ROW'` |
| PostgreSQL | Logical replication (automatic) | `wal_level='logical'` |
| RDS (all) | Automated backups enabled, 24h retention | Via RDS console/API |

**Log Retention Considerations:**
- Retention must exceed full load duration + buffer time
- Oracle: Monitor `V$ARCHIVED_LOG` to ensure logs not purged before DMS reads them
- MySQL: Monitor disk space for binlog accumulation
- SQL Server: Transaction log backup frequency affects log size
- Insufficient retention causes CDC task failure with "log no longer available" errors

### Monitoring CDC Performance

**Critical CloudWatch Metrics:**

| Metric | Description | Target Value |
|--------|-------------|--------------|
| `CDCIncomingChanges` | Changes waiting in queue to be applied | Trending toward 0 |
| `CDCLatencySource` | Seconds between source commit and DMS read | < 10 seconds |
| `CDCLatencyTarget` | Seconds between DMS read and target apply | < 10 seconds |
| `CDCThroughputBandwidth` | Network throughput for CDC | Monitor for bottlenecks |
| `CDCThroughputRows` | Rows replicated per second | Should match source change rate |

**Interpreting Metrics:**
- **CDCLatencySource high:** DMS can't read logs fast enough (check source log access, network bandwidth)
- **CDCLatencyTarget high:** DMS can't apply changes fast enough (check target write capacity, increase ParallelApplyThreads)
- **CDCIncomingChanges growing:** Replication is falling behind (scale up replication instance, optimize target)

**Real-World Scenario:** During business hours, source database has 5,000 transactions/second. CDCLatencySource shows 2 seconds, CDCLatencyTarget shows 45 seconds, and CDCIncomingChanges is growing. This indicates target write bottleneck - solution: increase replication instance size, enable BatchApply, or add ParallelApplyThreads.

### CDC Task Settings and Tuning

**Batch Apply Mode (Performance Optimization):**
```json
{
  "TargetMetadata": {
    "BatchApplyEnabled": true,
    "ParallelApplyThreads": 8,
    "ParallelApplyBufferSize": 100
  },
  "ChangeProcessingTuning": {
    "BatchApplyTimeoutMin": 1,
    "BatchApplyTimeoutMax": 30,
    "BatchApplyMemoryLimit": 500,
    "MinTransactionSize": 1000,
    "CommitTimeout": 1
  }
}
```

**Batch Apply Trade-offs:**
- **Pros:** 10-20x throughput improvement by grouping transactions
- **Cons:** Does not preserve transactional integrity; may cause referential integrity violations
- **Recommendation:** Disable foreign key constraints during CDC when using batch apply
- **When to use:** High-volume CDC where referential integrity enforced at application layer

**Memory and Buffering:**
```json
{
  "ChangeProcessingTuning": {
    "MemoryLimitTotal": 1024,      // MB of memory for change processing
    "MemoryKeepTime": 60,           // Seconds to retain cached data
    "StatementCacheSize": 50        // Number of prepared statements to cache
  }
}
```

### CDC Best Practices

1. **Start CDC before full load completes:** DMS begins caching changes during full load, ensuring no data loss
2. **Monitor replication lag continuously:** Set CloudWatch alarms for CDCLatencySource and CDCLatencyTarget
3. **Size replication instance for peak change rate:** Don't size for average; size for highest transaction volume periods
4. **Use Multi-AZ for production CDC:** Provides automatic failover (note: may require task restart for full load tasks)
5. **Test failover procedures:** Understand behavior when source/target databases fail or undergo maintenance
6. **Plan for log retention:** Ensure source database logs retained longer than full load duration
7. **Optimize target for writes:** Increase IOPS, disable constraints/triggers during initial load, use batch apply appropriately
8. **Validate data consistency:** Enable DMS validation or use validation-only tasks post-migration

### Bidirectional Replication

DMS supports bidirectional CDC for specific database engines with loopback prevention:

**Supported Engines:**
- Oracle, SQL Server, MySQL, PostgreSQL, Aurora MySQL-Compatible, Aurora PostgreSQL-Compatible

**Loopback Prevention Configuration:**
```json
{
  "LoopbackPreventionSettings": {
    "EnableLoopbackPrevention": true,
    "SourceSchema": "SCHEMA_NAME",
    "TargetSchema": "SCHEMA_NAME"
  }
}
```

**How Loopback Prevention Works:**
- DMS creates `awsdms_loopback_prevention` control table on both databases
- Tracks changes originated by DMS and filters them out during replication
- Prevents infinite loops where changes replicate back and forth

**Limitations and Considerations:**
- Only tracks DML statements (not DDL)
- Requires `BatchApplyEnabled: false`
- No built-in conflict detection or resolution
- Application-level operational segregation recommended (write to one DB at a time)
- SQL Server requires `setUpMsCdcForTables: true`
- Enable data validation on both replication tasks

**Use Cases:**
- Active-active database configurations
- Multi-region writes with application-controlled routing
- Migration with gradual cutover allowing writes to both databases temporarily

**AWS Documentation:**
- [Using change data capture (CDC)](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html)
- [Using Oracle as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html)
- [Using SQL Server as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html)
- [Using MySQL as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html)
- [Using PostgreSQL as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html)
- [Bidirectional replication](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html#CHAP_Task.CDC.Bidirectional)

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

Right-sizing the replication instance is critical for migration performance and cost optimization:

**Instance Selection Guidelines:**
| Use Case | Instance Class | Rationale |
|----------|---------------|-----------|
| Homogeneous, low volume | R5.large | Memory for buffering, general workload |
| Homogeneous, high volume | R5.xlarge - R5.4xlarge | More memory for large transactions |
| Heterogeneous with transformations | C5.xlarge - C5.4xlarge | CPU for data type conversions |
| Many concurrent tasks | C5.2xlarge+ or R5.2xlarge+ | CPU and memory for parallel processing |
| Data warehouse migrations | C5.4xlarge+ | CPU for complex transformations |

**Sizing Factors:**
- **Data volume:** Total GB to migrate
- **Change rate:** Transactions/second during CDC
- **Schema complexity:** Number of tables, indexes, constraints
- **Number of tasks:** Multiple concurrent migration tasks on same instance
- **LOB frequency:** Large objects require more memory
- **Transformations:** Complex mappings require more CPU

**Real-World Sizing Example:**
- 500 GB Oracle to Aurora PostgreSQL (heterogeneous)
- 300 tables with stored procedures requiring conversion
- 2,000 transactions/second peak rate
- Target migration window: 48 hours for full load
- **Recommendation:** C5.2xlarge (8 vCPU, 16 GB RAM, up to 10 Gbps network)

**Task Configuration Tuning:**

```json
{
  "FullLoadSettings": {
    "MaxFullLoadSubTasks": 8,        // Parallel table loading (default 8)
    "TransactionConsistencyTimeout": 600,
    "CommitRate": 10000              // Records per commit
  },
  "TargetMetadata": {
    "ParallelLoadThreads": 0,        // 0 = auto (number of tables)
    "ParallelApplyThreads": 8,       // CDC parallel apply threads
    "ParallelApplyBufferSize": 100,  // Buffered events per thread
    "BatchApplyEnabled": false       // Set true for high-volume CDC
  }
}
```

**MaxFullLoadSubTasks Best Practices:**
- Start with default of 8 for most migrations
- Increase for migrations with many small tables (can go up to 49)
- Decrease if source database experiencing high load
- Monitor `FullLoadThroughputRowsSource` metric to assess effectiveness

**Parallel Load for Large Tables:**
Use table-settings rules to partition large tables for parallel loading:

```json
{
  "rule-type": "table-settings",
  "rule-id": "1",
  "object-locator": {
    "schema-name": "SALES",
    "table-name": "TRANSACTIONS"
  },
  "parallel-load": {
    "type": "partitions-auto",      // Auto-detect partitions
    "number-of-partitions": 8,      // For ranges type
    "collection-count-from-metadata": true
  }
}
```

**Supported for:** Oracle, SQL Server, MySQL, Sybase, IBM Db2 LUW

**BatchApplyEnabled Trade-offs:**
- **Disabled (default):** Preserves transactional consistency, lower throughput
- **Enabled:** 10-20x higher CDC throughput, does NOT preserve referential integrity
- **When to enable:** High-volume CDC where constraints can be disabled or managed at application layer
- **Requirements:** Disable foreign keys on target during CDC, re-enable after cutover

**Target Database Optimization:**

**Pre-Migration Optimizations:**
- **Disable foreign key constraints:** Prevents referential integrity checks during load
  ```sql
  -- PostgreSQL example
  ALTER TABLE table_name DISABLE TRIGGER ALL;
  -- Oracle example
  ALTER TABLE table_name DISABLE CONSTRAINT fk_name;
  ```
- **Drop secondary indexes:** Re-create after full load completes (keep primary keys)
- **Disable triggers:** Prevent trigger execution during data load
- **Increase write capacity:** For RDS, increase provisioned IOPS; for Aurora, ensure appropriate instance size
- **Disable backups:** Turn off automated backups during initial load (re-enable before cutover)
- **Disable Multi-AZ:** Single-AZ during migration reduces write overhead (enable Multi-AZ before cutover)

**Post-Full-Load Optimizations:**
- **Re-enable secondary indexes:** Before starting CDC phase
- **Re-enable constraints:** After validating data integrity
- **Re-enable triggers:** Just before application cutover
- **Enable backups and Multi-AZ:** Before cutover to production

**DMS Task Settings for Performance:**
```json
{
  "StreamBufferSettings": {
    "StreamBufferCount": 3,         // Number of stream buffers
    "StreamBufferSizeInMB": 8       // Size per buffer
  },
  "ChangeProcessingTuning": {
    "MemoryLimitTotal": 1024,       // Total memory (MB) for change processing
    "StatementCacheSize": 50        // Prepared statement cache
  }
}
```

### Large Object (LOB) Handling

Large Objects (LOBs) - BLOBs, CLOBs, TEXT, JSON, XML - require special handling in DMS due to their size and performance implications. Understanding LOB modes is essential for SAP-C02.

**LOB Migration Modes:**

**1. Limited LOB Mode (Default - Recommended):**
```json
{
  "TargetMetadata": {
    "SupportLobs": true,
    "FullLobMode": false,
    "LimitedSizeLobMode": true,
    "LobMaxSize": 32          // KB (default 32, max 102,400)
  }
}
```

**Characteristics:**
- Migrates LOBs up to `LobMaxSize` (default 32 KB)
- LOBs exceeding limit are truncated to `LobMaxSize`
- Best performance (LOBs transferred inline with row data)
- **Critical:** Set `LobMaxSize` to accommodate your largest LOB or accept truncation
- Suitable when you know LOB sizes and can set appropriate limit

**When to Use:**
- LOBs are small and predictable in size
- Performance is priority and truncation is acceptable
- Most LOBs under 32 KB (or configured limit)

**2. Full LOB Mode:**
```json
{
  "TargetMetadata": {
    "SupportLobs": true,
    "FullLobMode": true,
    "LobChunkSize": 64        // KB per chunk
  }
}
```

**Characteristics:**
- Migrates all LOB data regardless of size
- Uses lookup operation for each LOB (significant performance impact)
- No truncation occurs
- **Performance impact:** Can be 10-100x slower than limited mode for LOB-heavy tables
- Requires additional memory on replication instance

**When to Use:**
- LOB sizes are unknown or highly variable
- Cannot risk data truncation
- LOB data is business-critical
- Willing to accept longer migration time

**3. Inline LOB Mode (Optimal for Mixed Sizes):**
```json
{
  "TargetMetadata": {
    "SupportLobs": true,
    "FullLobMode": true,
    "LobMaxSize": 32,
    "InlineLobMaxSize": 5     // KB (0-102,400, default 0 = disabled)
  }
}
```

**Characteristics:**
- LOBs <= `InlineLobMaxSize` transferred inline (fast)
- LOBs > `InlineLobMaxSize` but <= `LobMaxSize` use lookup (slower)
- LOBs > `LobMaxSize` use chunked lookup (slowest but complete)
- Optimizes for common case where most LOBs are small
- **Caution:** Values > 32 KB can cause memory pressure on replication instance

**When to Use:**
- Mix of small and large LOBs in same table
- Most LOBs are small, but some are very large
- Want to optimize for common case without losing large LOB data

**Per-Table LOB Settings:**

Override task-level LOB settings for specific tables:

```json
{
  "rules": [
    {
      "rule-type": "table-settings",
      "rule-id": "1",
      "object-locator": {
        "schema-name": "CONTENT",
        "table-name": "DOCUMENTS"
      },
      "lob-settings": {
        "mode": "limited",
        "bulk-max-size": 1024     // KB - much higher limit for this table
      }
    },
    {
      "rule-type": "table-settings",
      "rule-id": "2",
      "object-locator": {
        "schema-name": "CONTENT",
        "table-name": "THUMBNAILS"
      },
      "lob-settings": {
        "mode": "limited",
        "bulk-max-size": 16       // KB - smaller limit, faster
      }
    }
  ]
}
```

**LOB Handling Best Practices:**

1. **Analyze LOB sizes before migration:**
   ```sql
   -- Oracle example
   SELECT MAX(DBMS_LOB.GETLENGTH(lob_column)) / 1024 as max_kb,
          AVG(DBMS_LOB.GETLENGTH(lob_column)) / 1024 as avg_kb
   FROM table_name;

   -- PostgreSQL example
   SELECT MAX(LENGTH(text_column)) / 1024 as max_kb,
          AVG(LENGTH(text_column)) / 1024 as avg_kb
   FROM table_name;
   ```

2. **Set LobMaxSize based on actual data:**
   - Query 95th or 99th percentile LOB sizes
   - Set `LobMaxSize` to accommodate most LOBs
   - Accept that very large outliers may need special handling

3. **Consider separate tasks for LOB-heavy tables:**
   - Create one task for tables without LOBs (fast)
   - Create separate task for LOB tables (configure appropriately)
   - Allows parallel execution with different optimization strategies

4. **Monitor LOB migration performance:**
   - Check `FullLoadThroughputRowsSource` for LOB vs. non-LOB tables
   - LOB tables will have significantly lower throughput
   - Adjust `LobChunkSize` if full LOB mode is necessary

5. **Resource allocation for LOBs:**
   - Ensure replication instance has sufficient memory (R5 instances for LOB-heavy)
   - Ensure target database has adequate free space (LOBs consume significant storage)
   - Monitor replication instance memory usage via CloudWatch

**LOB CDC Limitations:**

| Database | CDC with LOBs | Notes |
|----------|---------------|-------|
| Oracle (LogMiner) | Not supported | Cannot capture LOB changes via LogMiner |
| Oracle (Binary Reader) | Supported (12c+) | Use `useBfile=Y` for LOB CDC |
| SQL Server | Supported | MS-CDC or MS-Replication required |
| MySQL | Supported | Row-based binlog captures LOB changes |
| PostgreSQL | Supported | WAL captures all column changes including LOBs |

**Real-World LOB Scenario:**
- Table with 10 million rows
- 80% of rows have LOBs < 10 KB (product descriptions)
- 15% have LOBs 10-100 KB (detailed specifications)
- 5% have LOBs 100 KB - 5 MB (high-res images)

**Optimal Configuration:**
```json
{
  "InlineLobMaxSize": 10,    // 80% transferred inline (fast)
  "LobMaxSize": 5120,        // 5 MB limit covers all LOBs
  "FullLobMode": true        // Use lookup for > 10 KB LOBs
}
```

**Result:** Fast migration for 80% of rows, acceptable performance for 20%, no data loss.

**AWS Documentation:**
- [Setting LOB support for source databases](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.LOBSupport.html)
- [Target metadata task settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.TargetMetadata.html)

### Validation and Testing

**DMS Data Validation:**

AWS DMS provides built-in data validation that compares each row in the source with its corresponding row in the target database. Understanding validation capabilities and limitations is important for ensuring migration data integrity.

**How Validation Works:**
- Begins immediately after full load completion for full-load tasks
- Validates incremental changes for CDC-enabled tasks as they occur
- Compares primary key values and data values row-by-row
- Reports mismatches, missing records, and suspended validation

**Supported Databases:**
- **Source:** Oracle, PostgreSQL, MySQL, MariaDB, SQL Server, IBM Db2 LUW
- **Target:** Oracle, PostgreSQL, MySQL, MariaDB, SQL Server, IBM Db2 LUW, Redshift, S3

**Validation Requirements and Limitations:**
- **Primary key or unique index required** - Tables without PK/UK cannot be validated
- **VARCHAR/CHAR PK columns** must be less than 1024 characters
- **NULL values in PK/UK columns** not supported for validation
- **PostgreSQL collation** must be "C" for primary key columns
- **Oracle NOVALIDATE constraints** not recognized as primary keys
- **Views** cannot be validated (only base tables)
- Validation stops automatically if more than 10,000 failed or suspended records detected

**Validation Metrics and States:**

| Validation State | Meaning |
|------------------|---------|
| **Validated** | All rows successfully validated |
| **Pending records** | Records migrated but waiting for validation |
| **Mismatched records** | Data doesn't match between source and target |
| **Suspended records** | Records that can't be validated |
| **No primary key** | Table can't be validated (no PK/UK) |
| **Table error** | Table in error state, some data not migrated |
| **Error** | Unexpected validation error occurred |

**CloudWatch Validation Metrics:**
```
ValidationSucceededRecordCount    - Records successfully validated
ValidationAttemptedRecordCount    - Total validation attempts
ValidationFailedOverallCount      - Total failed validations
ValidationSuspendedOverallCount   - Suspensions due to validation issues
ValidationPendingOverallCount     - Records awaiting validation
ValidationBulkQuerySourceLatency  - Bulk query performance on source
ValidationItemQueryTargetLatency  - Individual query performance on target
```

**Enabling Validation:**
```json
{
  "ValidationSettings": {
    "EnableValidation": true,
    "ValidationMode": "ROW_LEVEL",
    "ThreadCount": 5,
    "PartitionSize": 10000,
    "FailureMaxCount": 1000,
    "RecordFailureDelayInMinutes": 5,
    "RecordSuspendDelayInMinutes": 30,
    "MaxKeyColumnSize": 8096,
    "TableFailureMaxCount": 10000,
    "ValidationOnly": false,
    "SkipLobColumns": false,
    "ValidationQueryCdcDelaySeconds": 180
  }
}
```

**Validation Failures Table:**
DMS creates `awsdms_control.awsdms_validation_failures_v1` on target endpoint to track validation failures:

```sql
SELECT * FROM awsdms_control.awsdms_validation_failures_v1
WHERE TASK_NAME = 'MyMigrationTask'
  AND FAILURE_TYPE = 'RECORD_DIFF';
```

**Failure Types:**
- **RECORD_DIFF:** Data mismatch between source and target
- **MISSING_SOURCE:** Record exists in target but not source
- **MISSING_TARGET:** Record exists in source but not target
- **TABLE_WARNING:** Table-level validation issues

**Enhanced Data Validation (v3.5.4+):**
Available for specific migration paths: Oracle to PostgreSQL, SQL Server to PostgreSQL, Oracle to Oracle, SQL Server to SQL Server.

**Prerequisites:**
```sql
-- PostgreSQL target
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE OR REPLACE AGGREGATE BIT_XOR(IN v bit) (SFUNC = bitxor, STYPE = bit);

-- Oracle source
GRANT EXECUTE ON SYS.DBMS_CRYPTO TO dms_endpoint_user;
```

**Validation-Only Tasks (v3.4.6+):**
- **Full Load Validation Only:** Single-pass quick comparison, reports failures immediately
- **CDC Validation Only:** Continuous comparison, retries mismatched rows before failing
- Useful for post-migration verification without performing data migration
- Can run validation on existing databases without DMS migration

**Validation Best Practices:**
1. **Enable for production migrations:** Always validate critical data migrations
2. **Monitor validation metrics:** Set CloudWatch alarms for ValidationFailedOverallCount
3. **Review failures table:** Query `awsdms_validation_failures_v1` to diagnose issues
4. **Account for resource impact:** Validation queries consume source and target resources
5. **Use SkipLobColumns for performance:** Skip LOB validation if LOB data is less critical
6. **Set appropriate ValidationQueryCdcDelaySeconds:** Default 180 seconds prevents false positives from replication lag

**Application Testing:**
- **Functional testing:** Verify application functionality with migrated data on test subset
- **Performance testing:** Load test application against target database to verify performance meets requirements
- **Query plan analysis:** Compare execution plans on source vs. target (different optimizers)
- **Connection pool testing:** Verify application connection pooling works with target database
- **Failover testing:** Test application behavior during database failover scenarios
- **Rollback procedures:** Document and test rollback steps in case migration needs reversal

**Real-World Validation Strategy:**
1. Enable DMS validation during migration task
2. Monitor validation failures during migration
3. After cutover, run validation-only task for comprehensive comparison
4. Query failures table and investigate mismatches
5. Run application smoke tests on target database
6. Perform full regression testing with production-like load
7. Keep source database available for 1-2 weeks for comparison and rollback

**AWS Documentation:**
- [AWS DMS data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)
- [Data validation task settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.DataValidation.html)
- [Troubleshooting data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html#CHAP_Validating.Troubleshooting)

## Snowball Edge for Large Database Transfers

For very large databases or constrained network environments, AWS Snowball Edge provides an offline data transfer method that bypasses network limitations. This approach is particularly valuable for multi-terabyte databases where network-based migration would be prohibitively slow or expensive.

### When to Use Snowball Edge

**Decision Criteria:**

| Factor | Network-Based DMS | Snowball Edge |
|--------|-------------------|---------------|
| Database size | < 10 TB | > 10 TB |
| Network bandwidth | > 100 Mbps | < 100 Mbps |
| Transfer time estimate | < 1 week | > 1 week |
| Network data transfer cost | Economical | Exceeds Snowball cost |
| Data change rate | Any | Lower is better (reduces CDC catch-up) |

**Cost Calculation Example:**
- 20 TB database over 50 Mbps connection = ~45 days continuous transfer
- Data transfer costs: Potentially $1,000+ depending on location
- Snowball Edge: Fixed cost ~$300 per job + 3-5 day shipping
- CDC catch-up: 45 days of changes vs. 5 days of changes

**Use Cases:**
- Initial seed for multi-TB database before switching to CDC
- Data center decommissioning with limited network capacity
- Regions with expensive or unreliable internet connectivity
- Compliance requirements preventing long-duration data exposure over internet

### Snowball Edge Migration Architecture

```
Phase 1: Offline Data Transfer (Snowball Edge)
  1. On-Premises DB → SCT Data Extraction Agent → Snowball Edge (local S3 endpoint)
  2. Ship Snowball Edge device to AWS (3-5 days transit)
  3. AWS imports Snowball data to S3 bucket (1-2 days)
  4. DMS task loads data from S3 → Target Database

Phase 2: Online CDC Sync (Network-Based)
  5. Separate DMS CDC task replicates changes since extraction began
  6. CDC catches up from extraction start point to current
  7. Application cutover when CDC lag is minimal
```

**Critical Understanding:** Snowball Edge handles only the initial full load. CDC must still occur over the network to catch up changes made during the Snowball process (extraction, shipping, import, and S3-to-database load).

### SCT Data Extraction Agents

AWS SCT uses data extraction agents to extract data from source databases and load to Snowball Edge local S3 endpoint.

**Agent Deployment Options:**

**Local Agent:**
- Runs on same server as source database
- Pros: Simple deployment, no additional servers required
- Cons: Competes with source database for CPU and I/O resources
- Recommendation: Use for smaller extractions or development environments

**Remote Agent:**
- Runs on separate server with network access to source database
- Pros: No resource impact on source database, better performance
- Cons: Requires additional server provisioning
- Recommendation: Use for production migrations to minimize source impact

**Agent Installation and Configuration:**
```bash
# Download SCT extraction agent
# Install on local or remote server
# Configure connection to source database
# Point to Snowball Edge local S3 endpoint (192.168.x.x)
# Configure parallel extraction tasks
```

**Extraction Process Features:**
- **Parallel extraction:** Multiple threads extract different tables simultaneously
- **Partitioned extraction:** Large tables split into chunks for parallel processing
- **Data validation:** Optional validation during extraction to detect issues early
- **Compression:** Data compressed before writing to Snowball to optimize capacity
- **Checkpointing:** Resume capability if extraction interrupted
- **Progress monitoring:** Real-time extraction status and estimated completion time

**Real-World Example:** Extracting a 15 TB Oracle database with 6 remote extraction agents running in parallel might complete in 48-72 hours, compared to 7-10 days for single-threaded extraction or 30+ days for network-based full load over 50 Mbps connection.

### Snowball Edge Migration Detailed Process

**1. Prepare Source Database:**
- Enable supplemental logging for Oracle (CDC will start from extraction begin time)
- Document extraction start SCN/LSN for CDC configuration
- Ensure database user has read access to all required tables
- Size Snowball Edge device appropriately (80 TB usable capacity per device)

**2. Order and Receive Snowball Edge:**
- Order Snowball Edge device via AWS Console
- Specify S3 bucket for data import
- Receive device, unlock, and connect to local network
- Configure Snowball Edge network settings

**3. Extract Data Using SCT:**
- Install and configure SCT extraction agents
- Create extraction tasks in SCT for selected tables
- Point agents to Snowball Edge local S3 endpoint
- Start extraction and monitor progress
- Validate extraction completed successfully

**4. Ship Snowball Edge:**
- Power down and lock device
- Return using prepaid shipping label
- Track device via AWS Console
- Typical transit: 3-5 days depending on location

**5. AWS S3 Import:**
- AWS receives device at import facility
- Data imported to specified S3 bucket
- Import typically completes within 1-2 days
- Email notification when import completes
- Verify data in S3 (number of objects, total size)

**6. DMS Load from S3:**
- Create DMS task with S3 as source endpoint
- Configure target database endpoint
- Start full load task (S3 → Target Database)
- Monitor task progress via CloudWatch metrics

**7. CDC Catch-Up:**
- Create separate DMS CDC task (Source Database → Target Database)
- Configure CDC start point to extraction begin time (captured in step 1)
- CDC replicates all changes made during extraction, shipping, import, and load phases
- Monitor CDCLatency metrics until lag approaches zero
- Cutover application when replication lag is acceptable (typically < 1 minute)

### Snowball Edge Limitations and Considerations

**Limitations:**
- Snowball Edge handles only initial data load, not ongoing CDC
- Separate CDC task required to sync changes (network-based)
- Total migration time includes: extraction + shipping + import + S3 load + CDC catch-up
- Not suitable for databases with extremely high change rates (catch-up may take too long)
- Requires physical device handling and shipping coordination
- Limited to regions where Snowball Edge is available

**Capacity Planning:**
- **Snowball Edge Storage Optimized:** 80 TB usable capacity
- **Snowball Edge Compute Optimized:** 39.5 TB usable capacity
- Account for compression ratios when sizing
- For databases exceeding single device capacity, use multiple devices or contact AWS

**Timeline Considerations:**
- Snowball shipping: 3-5 days each direction (varies by location)
- Data extraction: Varies by database size and agent configuration (TB per day typical)
- AWS import to S3: 1-2 days
- DMS load from S3: Varies by database size and target write capacity
- CDC catch-up: Depends on change volume during offline phases
- **Total time:** Often 2-3 weeks from start to cutover for very large databases

**Cost Optimization:**
- Snowball Edge: Fixed per-job fee (~$300) plus per-day charges after 10 days
- Return device promptly to avoid daily charges
- S3 storage costs for staging data
- DMS replication instance costs for S3-to-database load and CDC
- Compare total cost vs. network data transfer pricing

**AWS Documentation:**
- [Migrating large data stores using AWS DMS and AWS Snowball Edge](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_LargeDBs.html)
- [AWS Snowball Edge documentation](https://docs.aws.amazon.com/snowball/latest/developer-guide/)
- [Using AWS SCT data extraction agents](https://docs.aws.amazon.com/SchemaConversionTool/latest/userguide/agents.html)

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

## SAP-C02 Exam Tips and Key Takeaways

**Core DMS Concepts:**

1. **DMS is optimized for migration, not permanent replication:** While DMS supports continuous replication, it's designed for migration scenarios. For permanent data synchronization, consider native replication features or other AWS services.

2. **SCT is mandatory for heterogeneous migrations:** Different database engines (Oracle to PostgreSQL, SQL Server to MySQL) require schema conversion. Homogeneous migrations (Oracle to Oracle, MySQL to Aurora MySQL) can use native database tools and don't require SCT.

3. **Replication instance is an EC2 instance in your VPC:** Understanding instance sizing (C5 vs R5), Multi-AZ configuration, and VPC networking is critical. T3 instances are NOT suitable for production migrations.

4. **Three migration task types:** Full Load (snapshot), Full Load + CDC (zero-downtime), CDC Only (ongoing sync after initial load by other means).

**CDC-Specific Concepts:**

5. **CDC requires specific source database configuration:**
   - Oracle: ARCHIVELOG mode + supplemental logging
   - SQL Server: NOT SIMPLE recovery mode + MS-CDC/MS-Replication
   - MySQL: Row-based binary logging enabled
   - PostgreSQL: Logical replication (automatic)
   - RDS: Automated backups enabled with 24h+ retention

6. **LogMiner vs Binary Reader for Oracle:**
   - LogMiner: Default, easier config, higher source I/O
   - Binary Reader: Better performance, LOB CDC support (12c+), recommended for RAC
   - Exam scenario: If high performance or LOB CDC needed, choose Binary Reader

7. **CDC monitoring metrics matter for cutover:** CDCLatencySource and CDCLatencyTarget determine cutover timing. Cutover when lag < 1 minute typically. CDCIncomingChanges should trend toward zero.

8. **Open transaction handling:** Use `openTransactionWindow` endpoint setting (v3.5.1+) when starting CDC from specific SCN/LSN to avoid missing transactions that started before but committed after the start point.

9. **Bidirectional replication supported with limitations:** Oracle, SQL Server, MySQL, PostgreSQL support bidirectional CDC with loopback prevention, but no built-in conflict resolution. Application must manage operational segregation.

**Large Database Migrations:**

10. **Snowball Edge threshold: >10 TB or <100 Mbps network:** Decision based on time estimate and cost comparison. Remember: Snowball handles only initial load, CDC still required over network to catch up changes.

11. **Snowball Edge architecture:** Source DB → SCT Agent → Snowball → AWS S3 Import → DMS Load from S3 → Target DB + separate CDC task for changes. Total time includes shipping (3-5 days each way).

12. **SCT extraction agents:** Local (same server, simpler) vs Remote (separate server, better performance). Use remote agents for production to avoid source database resource impact.

**Performance and Optimization:**

13. **LOB handling has three modes:**
    - Limited LOB (default): Fast, truncates at LobMaxSize (32 KB default)
    - Full LOB: Slow, migrates all LOB data via lookup
    - Inline LOB: Hybrid, inline for small (InlineLobMaxSize), lookup for large
    - Exam scenario: If LOBs vary in size, use Inline LOB mode

14. **LOB CDC limitations:** Oracle LogMiner does NOT support LOB CDC. Use Binary Reader for Oracle 12c+ LOB CDC. SQL Server, MySQL, PostgreSQL all support LOB CDC.

15. **BatchApplyEnabled trade-off:** 10-20x CDC throughput improvement BUT does not preserve transactional integrity. Disable foreign keys when using batch apply. Exam scenario: High-volume CDC = batch apply + disabled constraints.

16. **Target database optimization sequence:**
    - Before migration: Disable FKs, drop secondary indexes, disable triggers, disable backups/Multi-AZ
    - After full load: Re-create indexes, enable constraints
    - Before cutover: Enable triggers, backups, Multi-AZ

17. **Parallel loading for large tables:** Use table-settings with parallel-load for Oracle, SQL Server, MySQL, Sybase, Db2 LUW. Can partition tables automatically or by ranges for parallel processing.

18. **MaxFullLoadSubTasks determines parallel table loading:** Default 8, can go up to 49 for many small tables. More subtasks = more parallelism but more source/target load.

**Validation and Testing:**

19. **DMS validation requires primary key or unique index:** Tables without PK/UK cannot be validated. VARCHAR/CHAR PKs must be < 1024 characters. NULL values in PK/UK not supported.

20. **Validation-only tasks (v3.4.6+):** Can run validation without migration. Two modes: Full Load Validation Only (quick single-pass) and CDC Validation Only (continuous with retries).

21. **Validation failures table:** `awsdms_control.awsdms_validation_failures_v1` created on target. Query for RECORD_DIFF, MISSING_SOURCE, MISSING_TARGET to diagnose issues.

22. **Enhanced data validation (v3.5.4+):** Available for Oracle→PostgreSQL, SQL Server→PostgreSQL, Oracle→Oracle, SQL Server→SQL Server. Requires pgcrypto extension on PostgreSQL.

**Network and Connectivity:**

23. **Direct Connect recommended for large migrations:** Provides consistent bandwidth, lower latency, reduced data transfer costs compared to internet-based VPN. Critical for multi-TB migrations.

24. **Network path affects performance:** On-Premises DB → VPN/DX → VPC → Replication Instance → Target DB. Each hop adds latency. Replication instance must be in VPC with connectivity to both source and target.

**Schema Conversion Tool (SCT):**

25. **SCT does NOT migrate data:** Schema conversion only. Data migration is DMS responsibility. Don't confuse the two on exam.

26. **Assessment report provides effort estimates:** Executive summary, license evaluation, action items for manual conversion, estimated person-hours. Critical for planning heterogeneous migrations.

27. **Extension packs emulate source features:** Oracle DBMS packages, SQL Server T-SQL features emulated on PostgreSQL via Lambda functions and SQL libraries. Trade-off: convenience vs. runtime overhead.

28. **Conversion paths:** Remember supported conversions (Oracle/SQL Server/MySQL/PostgreSQL to Aurora MySQL/PostgreSQL, all data warehouses to Redshift, Cassandra to DynamoDB).

**Migration Patterns and Strategies:**

29. **Zero-downtime pattern: Full Load + CDC:** Most common production pattern. CDC starts before full load completes, caches changes, applies after full load. Monitor lag, cutover when minimal.

30. **RDS to Aurora: Read replica promotion option:** Alternative to DMS for homogeneous migrations (MySQL to Aurora MySQL, PostgreSQL to Aurora PostgreSQL). Creates Aurora replica, wait for lag to catch up, promote. ~5 min downtime.

31. **Blue/Green deployments for RDS:** Managed switchover with minimal downtime, built-in validation period, automatic rollback capability. Alternative to DMS for version upgrades or engine changes on same engine.

32. **Multi-region migrations:** Separate DMS tasks for each region. Monitor lag in both regions before cutover. Can migrate to multiple regions simultaneously.

33. **Database consolidation:** Multiple source databases to single Aurora cluster. Use table mappings to manage schema naming conflicts. Size target for combined workload.

34. **Database decomposition:** Split monolithic database to microservices databases. Use table filters and mappings in DMS tasks. Handle foreign key relationships carefully.

**Cost Optimization:**

35. **Replication instance pricing:** Hourly charge based on instance type. Stop instance when not in use (tasks saved). Use smaller instances for testing, scale for production.

36. **Data transfer costs:** Free within same region, standard charges cross-region. Direct Connect reduces on-premises transfer costs. Consider Snowball Edge for very large transfers.

37. **Multi-AZ doubles replication instance cost:** Use only for production migrations requiring HA. Single-AZ acceptable for development/testing.

**Troubleshooting and Monitoring:**

38. **Key CloudWatch metrics to know:**
    - Full load: FullLoadThroughputRowsSource, FullLoadThroughputBandwidthSource
    - CDC: CDCIncomingChanges, CDCLatencySource, CDCLatencyTarget
    - Replication instance: CPUUtilization, FreeableMemory, NetworkTransmitThroughput
    - Validation: ValidationFailedOverallCount, ValidationPendingOverallCount

39. **Common issues and solutions:**
    - High replication lag: Scale up instance, increase ParallelApplyThreads, enable BatchApply
    - LOB performance: Use limited LOB mode, set appropriate LobMaxSize, separate tasks for LOB tables
    - Connection issues: Verify security groups, NACLs, endpoint connectivity, database permissions
    - Validation failures: Check PK/UK requirements, encoding differences, query failures table

40. **Rollback planning:** Keep source database available 1-2 weeks post-migration. Maintain DMS tasks for potential reverse sync. Document rollback procedures and test before cutover.

**Exam Scenario Decision Framework:**

When presented with database migration scenario questions:

1. **Homogeneous or heterogeneous?** → Determines if SCT needed
2. **Database size and network bandwidth?** → Determines if Snowball Edge appropriate
3. **Downtime tolerance?** → Full Load (downtime OK) vs Full Load + CDC (minimal downtime)
4. **LOB data present?** → Determines LOB mode configuration
5. **High transaction rate?** → Impacts replication instance sizing and batch apply decision
6. **Data validation required?** → Enable validation, plan for resource impact
7. **Multi-region/consolidation/decomposition?** → Determines number and configuration of tasks
8. **Cost vs. performance trade-off?** → Impacts instance sizing, Multi-AZ, Direct Connect decisions

**AWS Documentation - Essential Reading:**
- [AWS DMS Best Practices](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [Database Migration Planning](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-database/welcome.html)
- [AWS Database Migration Service FAQ](https://aws.amazon.com/dms/faqs/)
- [AWS Well-Architected Framework - Migration](https://docs.aws.amazon.com/wellarchitected/latest/migration-lens/welcome.html)

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
