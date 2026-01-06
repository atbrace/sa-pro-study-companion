# RDS Multi-AZ Lab

## Overview

This hands-on lab demonstrates Amazon RDS Multi-AZ deployments, read replicas, and high availability database patterns essential for the AWS Solutions Architect Professional exam. You'll explore automated failover, read replica promotion, backup strategies, and performance monitoring for production-grade database architectures.

**Difficulty:** Intermediate
**Estimated Time:** 60-75 minutes
**Estimated Cost:** ~$0.15/hour (~$1.00 for full lab)

## Learning Objectives

By completing this lab, you will:

1. Deploy and configure RDS Multi-AZ PostgreSQL instances for high availability
2. Understand automated failover mechanisms and recovery time objectives (RTO)
3. Create and manage read replicas for read scaling and disaster recovery
4. Practice read replica promotion to standalone database
5. Configure automated backups, manual snapshots, and point-in-time recovery
6. Use Performance Insights to identify database bottlenecks
7. Optimize database parameters and monitor key CloudWatch metrics

## Architecture

This lab creates the following architecture:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         RDS VPC (10.2.0.0/16)                        │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   Availability Zone 1                          │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────┐                       │  │
│  │  │    Primary RDS Instance             │                       │  │
│  │  │    db.t3.micro (PostgreSQL 15.4)    │                       │  │
│  │  │    - Multi-AZ: Enabled              │<───────┐              │  │
│  │  │    - Storage: 20GB gp3              │        │              │  │
│  │  │    - Encrypted: Yes                 │        │              │  │
│  │  │    - Performance Insights: Enabled  │        │              │  │
│  │  └─────────────────────────────────────┘        │              │  │
│  │                                                  │              │  │
│  └─────────────────────────────────────────────────┼──────────────┘  │
│                                                     │                 │
│                                           Synchronous Replication    │
│                                                     │                 │
│  ┌─────────────────────────────────────────────────┼──────────────┐  │
│  │                   Availability Zone 2           │              │  │
│  │                                                  │              │  │
│  │  ┌─────────────────────────────────────┐        │              │  │
│  │  │    Standby RDS Instance             │<───────┘              │  │
│  │  │    (Automatic Failover Target)      │                       │  │
│  │  │    - Same specs as primary          │                       │  │
│  │  │    - Not accessible for reads       │                       │  │
│  │  │    - Auto-promoted on failure       │                       │  │
│  │  └─────────────────────────────────────┘                       │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Availability Zone 3 (or other)                │  │
│  │                                                                 │  │
│  │  ┌─────────────────────────────────────┐                       │  │
│  │  │    Read Replica                     │                       │  │
│  │  │    db.t3.micro (PostgreSQL 15.4)    │                       │  │
│  │  │    - Asynchronous replication       │<──── Async Replication │  │
│  │  │    - Can be promoted to standalone  │                       │  │
│  │  │    - Read-only queries              │                       │  │
│  │  │    - Performance Insights: Enabled  │                       │  │
│  │  └─────────────────────────────────────┘                       │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │               Supporting Infrastructure                         │  │
│  │                                                                 │  │
│  │  • DB Subnet Group (PRIVATE_ISOLATED subnets)                  │  │
│  │  • Security Group (PostgreSQL 5432 within VPC)                 │  │
│  │  • DB Parameter Group (custom settings)                        │  │
│  │  • Secrets Manager (database credentials)                      │  │
│  │  • Automated Backups (7-day retention)                         │  │
│  │  • CloudWatch Metrics & Performance Insights                   │  │
│  │                                                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS Account with administrative access
- AWS CLI configured
- Node.js and pnpm installed
- Basic understanding of relational databases
- Familiarity with PostgreSQL (helpful but not required)

## Cost Breakdown

| Resource | Cost (approx.) |
|----------|---------------|
| RDS db.t3.micro Multi-AZ (Primary) | $0.034/hour |
| RDS db.t3.micro Standby (Multi-AZ) | $0.034/hour |
| RDS db.t3.micro (Read Replica) | $0.034/hour |
| Storage (60GB gp3 total) | $0.012/hour |
| Backup storage (minimal for lab) | ~$0.001/hour |
| Performance Insights (7 days) | Free tier |
| **Total** | **~$0.15/hour** |

**💰 Important:** Remember to destroy resources after completing the lab to avoid ongoing charges! RDS instances continue to accrue charges even when idle.

## Deployment

### Step 1: Deploy the Infrastructure

Click the **Deploy Lab** button above, or run:

```bash
pnpm cdk:deploy lab-rds-multi-az
```

Deployment takes approximately 10-15 minutes due to RDS instance provisioning.

### Step 2: Verify Deployment

Once deployment completes, you'll see CloudFormation outputs including:

- VPC ID
- Primary database endpoint (Multi-AZ)
- Read replica endpoint
- Secrets Manager secret ARN (for database credentials)
- RDS Console URL
- Secrets Manager Console URL
- Architecture summary

### Step 3: Retrieve Database Credentials

To connect to the database (for advanced testing):

```bash
# Get the secret ARN from CloudFormation outputs
aws secretsmanager get-secret-value \
  --secret-id <SECRET_ARN> \
  --query SecretString \
  --output text | jq -r '.password'
```

## Lab Exercises

### Exercise 1: Explore Multi-AZ Configuration

**Objective:** Understand Multi-AZ deployment architecture

1. Navigate to the **RDS Console** using the provided console URL
2. Click on your primary database instance (name starts with `RdsMultiAzLabStack-PrimaryDatabase`)
3. In the **Configuration** tab, verify:
   - **Multi-AZ:** Yes
   - **Availability Zone:** Note which AZ hosts the primary
   - **Secondary Zone:** Note which AZ hosts the standby
   - **DB Instance Class:** db.t3.micro
   - **Storage Type:** gp3 (20 GB)

4. Check the **Connectivity & security** tab:
   - What is the endpoint hostname?
   - Why is there only ONE endpoint for Multi-AZ?
   - How does the endpoint handle failover automatically?

5. Review the **Monitoring** tab:
   - What metrics are available?
   - What is the current CPU utilization?

**Key Concept:** Multi-AZ uses synchronous replication to a standby instance in a different AZ. The standby is NOT accessible for reads - it's purely for failover. RDS automatically updates the DNS endpoint during failover (typically 60-120 seconds RTO).

### Exercise 2: Trigger Multi-AZ Failover

**Objective:** Understand automated failover behavior and RTO

**⚠️ Warning:** This exercise will cause brief downtime (1-2 minutes).

1. In RDS Console, select your primary database
2. Click **Actions** → **Reboot**
3. Check the box **Reboot with failover**
4. Click **Confirm**

5. Monitor the failover process:
   - Watch the **Status** column (will show "Rebooting")
   - Check the **Logs & events** tab for failover messages
   - Time how long the failover takes (typically 60-120 seconds)

6. After failover completes:
   - Check which AZ is now the **Primary**
   - Verify the endpoint hostname hasn't changed
   - Review CloudWatch metrics for availability impact

7. Check **Events** in the RDS console:
   - When did the failover start?
   - When was it completed?
   - What was the exact RTO (Recovery Time Objective)?

**Key Concept:** Multi-AZ failover is automatic and triggered by:
- Primary instance failure
- Loss of network connectivity to primary
- Storage failure on primary
- Primary AZ outage
- Manual reboot with failover

The DNS endpoint remains the same - applications automatically reconnect.

### Exercise 3: Read Replica Configuration

**Objective:** Understand read replicas for read scaling

1. In RDS Console, find your read replica instance (name contains `ReadReplica`)
2. Compare configuration with primary:
   - Is Multi-AZ enabled on the replica? (No - single instance)
   - What is the **Source DB:** field showing?
   - Check **Replication lag** - should be 0-5 seconds

3. In the **Configuration** tab:
   - Note the **Availability Zone** - different from primary?
   - Check **Backup retention:** - replicas can have independent backup settings
   - Verify **Performance Insights:** is enabled

4. Review the endpoint:
   - Compare read replica endpoint to primary endpoint
   - Applications must explicitly use this endpoint for reads
   - What happens if you write to a read replica?

**Key Concept:** Read replicas use asynchronous replication. They're accessible for read-only queries, reducing load on the primary. Replicas can be in different AZs or regions. Replication lag should be monitored.

### Exercise 4: Promote Read Replica

**Objective:** Practice disaster recovery scenario

**⚠️ Warning:** Promotion breaks replication and creates a standalone database.

1. Select your read replica in RDS Console
2. Click **Actions** → **Promote**
3. Before confirming, review the implications:
   - Replication from primary will STOP
   - Replica becomes a standalone read/write database
   - Backup retention can be configured
   - Original primary is unaffected

4. **DO NOT ACTUALLY PROMOTE** (this would break the lab setup)
5. Instead, answer these questions:
   - When would you promote a read replica?
   - How does this differ from Multi-AZ failover?
   - What's the RTO for promotion vs Multi-AZ failover?
   - Could you create a new replica after promotion?

**Key Concept:** Read replica promotion is a **manual** disaster recovery option. Use cases:
- Regional failover (if replica is in different region)
- Primary database is unrecoverable
- Permanent workload migration to different region
- Testing disaster recovery procedures

Promotion takes 5-10 minutes vs 1-2 minutes for Multi-AZ failover.

### Exercise 5: Automated Backups and Snapshots

**Objective:** Understand backup strategies and point-in-time recovery

1. In RDS Console, select your primary database
2. Navigate to the **Maintenance & backups** tab
3. Review **Automated backups:**
   - Retention period: 7 days
   - Backup window: 03:00-04:00 UTC
   - Point-in-time recovery: Available for last 7 days

4. Create a **manual snapshot:**
   - Click **Actions** → **Take snapshot**
   - Name: `sap-study-manual-snapshot-<timestamp>`
   - Click **Take snapshot**
   - Wait 2-3 minutes for completion

5. View your snapshot:
   - Navigate to **Snapshots** in left sidebar
   - Filter by your database
   - Note the snapshot size and creation time
   - Check **Actions** - you can restore, copy, share, or export

6. Understand backup strategies:
   - **Automated backups:** Deleted when instance is deleted
   - **Manual snapshots:** Persist after instance deletion
   - **Restore:** Creates NEW database (original is unaffected)
   - **PITR:** Restore to any second within retention window

**Key Concept:** RDS automated backups enable point-in-time recovery. Transaction logs are backed up every 5 minutes. Manual snapshots are useful before major changes. Always test restore procedures!

### Exercise 6: Performance Insights

**Objective:** Identify database performance bottlenecks

1. Navigate to your primary database in RDS Console
2. Click on **Performance Insights** in the left menu
3. Review the **Dashboard:**
   - **Database load:** Average active sessions (AAS)
   - **Top SQL:** Which queries are consuming resources?
   - **Top waits:** What is the database waiting on?
   - **Top hosts:** Which clients are generating load?

4. Examine the **Counter metrics:**
   - CPU utilization
   - Database connections
   - Read/write IOPS
   - Network throughput

5. Compare Primary vs Read Replica:
   - Open Performance Insights for the read replica
   - Is there any load on the replica?
   - How would you distribute read queries?

6. Understanding key metrics:
   - **AAS > vCPU count:** Database is overloaded
   - **Wait events:** IO, lock, CPU, network bottlenecks
   - **Top SQL:** Queries to optimize with indexes or caching

**Key Concept:** Performance Insights provides database-level metrics beyond CloudWatch. Free for 7 days of history. Use to identify:
- Slow queries needing optimization
- Resource constraints (CPU, memory, IO)
- Connection pooling issues
- Lock contention

### Exercise 7: Parameter Groups and Configuration

**Objective:** Customize database behavior with parameter groups

1. In RDS Console, navigate to **Parameter groups** in left sidebar
2. Find the custom parameter group (name contains `DbParameterGroup`)
3. Click to view **Parameters:**
   - Search for `shared_preload_libraries` - set to `pg_stat_statements`
   - Search for `log_statement` - set to `all` (logs all queries)
   - Search for `log_min_duration_statement` - set to `1000` (logs slow queries > 1 second)

4. Understand parameter types:
   - **Static parameters:** Require reboot to apply
   - **Dynamic parameters:** Applied immediately
   - **Modifiable:** Can be changed vs system-set

5. View logs to see parameter effects:
   - Go to your database instance
   - Click **Logs & events** tab
   - Download the **postgresql log**
   - Search for logged queries (due to `log_statement: all`)

6. Consider production parameter tuning:
   - `max_connections` - connection pooling
   - `work_mem` - query sorting and hashing
   - `shared_buffers` - memory cache size
   - `effective_cache_size` - query planner hints

**Key Concept:** Parameter groups define database engine configuration. Create custom groups for different workloads (OLTP vs OLAP). Test changes in non-production first. Some parameters significantly impact performance.

### Exercise 8: Monitoring and CloudWatch Metrics

**Objective:** Set up proactive database monitoring

1. Navigate to **CloudWatch Console** → **Metrics** → **RDS**
2. Browse metrics for your database:
   - **DatabaseConnections:** Current connection count
   - **FreeStorageSpace:** Available disk space
   - **ReadLatency / WriteLatency:** IO performance
   - **ReplicaLag:** Read replica delay (if applicable)

3. Create a CloudWatch alarm:
   - Click **Create alarm**
   - Select metric: **CPUUtilization** for your primary database
   - Condition: Greater than 80%
   - Period: 5 minutes
   - Datapoints: 2 out of 3
   - Notification: (Skip for this lab, but would use SNS topic in production)

4. Review **Enhanced Monitoring** (if enabled):
   - 50+ OS-level metrics
   - Process monitoring
   - File system usage
   - Granularity up to 1 second

5. Key metrics to monitor:
   - **CPUUtilization:** High CPU may need query optimization or read replicas
   - **FreeableMemory:** Low memory impacts buffer cache
   - **WriteIOPS / ReadIOPS:** Compare to provisioned IOPS limits
   - **DatabaseConnections:** Connection pool exhaustion

**Key Concept:** Monitoring is critical for production databases. Set alarms for:
- High CPU (>80% sustained)
- Low storage (<10% free)
- High replica lag (>30 seconds)
- Connection exhaustion (>80% of max_connections)

## Validation

Verify your understanding by answering these questions:

- [ ] What's the difference between Multi-AZ and read replicas?
- [ ] How long does Multi-AZ failover typically take? (60-120 seconds)
- [ ] Can you use a Multi-AZ standby for read queries? (No - standby not accessible)
- [ ] What triggers automatic Multi-AZ failover? (Instance failure, AZ outage, storage failure)
- [ ] How does read replica replication differ from Multi-AZ? (Async vs sync)
- [ ] When would you promote a read replica? (Regional DR, primary unrecoverable)
- [ ] What's the difference between automated backups and manual snapshots? (Lifecycle and retention)
- [ ] How do you enable point-in-time recovery? (Automated backups with retention > 0)
- [ ] What Performance Insights metric indicates database overload? (AAS > vCPU count)
- [ ] When do parameter group changes require a reboot? (Static parameters)

## Cleanup

**Important:** Destroy resources to avoid charges!

Click the **Cleanup Lab** button above, or run:

```bash
pnpm cdk:destroy lab-rds-multi-az
```

Verify in CloudFormation console that the stack is fully deleted. RDS instances may take 5-10 minutes to delete.

## Additional Challenges

If you want to extend this lab:

1. **Deploy EC2 bastion host** in public subnet to connect to database with psql
2. **Create cross-region read replica** for disaster recovery
3. **Set up Amazon Aurora** with same architecture and compare costs
4. **Implement AWS Backup** for centralized backup management
5. **Configure Secrets Manager rotation** for automatic credential rotation
6. **Test restore from snapshot** to new instance
7. **Implement IAM database authentication** instead of password-based auth
8. **Set up Data API** for serverless database access (Aurora only)

## Related Exam Topics

This lab covers SAP-C02 exam topics:

- **Domain 1:** Organizational complexity - Multi-account database strategies
- **Domain 2:** New solutions design - Database selection and HA architecture
- **Domain 3:** Continuous improvement - Performance optimization and monitoring
- **Domain 4:** Migration & modernization - Database migration strategies

Specific tasks:
- **Task 2.1:** Design database solutions for new workloads
- **Task 2.3:** Design high availability and/or fault-tolerant architectures
- **Task 3.2:** Implement strategies to improve performance

## Related Study Content

- [Database Solutions for New Workloads](/study/domain-2-new-workloads/database-solutions)
- [High Availability Architectures](/study/domain-2-new-workloads/high-availability)
- [Performance Optimization](/study/domain-3-continuous-improvement/performance-optimization)

## Troubleshooting

**Issue:** Database endpoint not resolving after failover
**Solution:** DNS TTL may cause brief caching. Wait 60 seconds or flush DNS cache. Application retry logic should handle this.

**Issue:** Read replica lag is high (>30 seconds)
**Solution:** Check network latency between AZs/regions. Reduce write load on primary. Consider larger instance type for replica. Check for long-running transactions.

**Issue:** Cannot connect to database from EC2 instance
**Solution:** Verify security group allows port 5432 from your source IP/security group. Ensure database is in private subnet with proper route tables. Check NACLs.

**Issue:** Performance Insights shows high IO wait
**Solution:** Increase IOPS by changing to io1/io2 storage. Add read replicas to offload read traffic. Optimize queries with indexes. Enable query cache.

**Issue:** Backup taking too long
**Solution:** First backup is full (slow). Subsequent backups are incremental (faster). Reduce backup window if needed. Consider snapshot frequency.

**Issue:** Cost higher than expected
**Solution:** Check backup storage (large transaction logs). Verify Multi-AZ is needed (doubles instance cost). Consider Reserved Instances for 40-60% savings. Use Trusted Advisor recommendations.

## Learn More

Official AWS Documentation:

- [Amazon RDS User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/)
- [Multi-AZ Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html)
- [Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Backup and Restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
- [Performance Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html)
- [Working with Parameter Groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html)

AWS Whitepapers:

- [AWS Database Migration Service Best Practices](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [Architecting for High Availability](https://aws.amazon.com/architecture/high-availability/)

Best Practices:

- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Security Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.html)
- [Performance Best Practices for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html#PostgreSQL.Concepts.General.FeatureSupport)

---

**Lab ID:** lab-rds-multi-az
**Version:** 1.0.0
**Last Updated:** 2026-01-05
