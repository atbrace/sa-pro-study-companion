---
title: Reliable and Resilient Architectures
lastUpdated: 2026-01-05
---

# Reliable and Resilient Architectures

Business continuity requires architectures that can withstand failures and disasters while meeting recovery objectives. This topic covers disaster recovery strategies, backup solutions, multi-region architectures, and high availability patterns for enterprise AWS environments.

## Recovery Objectives

### RTO and RPO

**Recovery Time Objective (RTO):** Maximum acceptable downtime after a disaster.

**Recovery Point Objective (RPO):** Maximum acceptable data loss measured in time.

| Strategy | RTO | RPO | Cost | Use Case |
|----------|-----|-----|------|----------|
| Backup and Restore | Hours to days | Hours | $ | Non-critical, cost-sensitive |
| Pilot Light | 10s of minutes | Minutes | $$ | Lower priority workloads |
| Warm Standby | Minutes | Seconds | $$$ | Business critical |
| Multi-Site Active/Active | Real-time | Near-zero | $$$$ | Mission critical |

> 📚 [Disaster Recovery Strategies](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)

## Disaster Recovery Strategies

### 1. Backup and Restore

**Characteristics:**
- Data backed up to S3 or AWS Backup
- Infrastructure as Code stored in version control
- Recovery involves restoring from backups and recreating infrastructure

**Implementation:**
```
Primary Region          DR Region
┌────────────┐         ┌────────────┐
│ Production │────────>│  S3 Backup │
│  Workload  │         │   Glacier  │
└────────────┘         └────────────┘
```

**Key Services:**
- AWS Backup - Centralized backup
- S3 Cross-Region Replication
- Amazon Data Lifecycle Manager
- CloudFormation for infrastructure

### 2. Pilot Light

**Characteristics:**
- Minimal version of environment always running in DR region
- Core services running (databases replicated)
- Quickly scale up when needed

**Implementation:**
```
Primary Region              DR Region
┌────────────────┐         ┌──────────────┐
│   Full Stack   │────────>│ RDS Replica  │
│   - Compute    │         │ (standby)    │
│   - Database   │         │ AMIs ready   │
│   - Storage    │         │              │
└────────────────┘         └──────────────┘
```

**Key Services:**
- RDS Read Replicas with promotion capability
- Aurora Global Database
- AMIs replicated to DR region
- Route 53 for DNS failover

### 3. Warm Standby

**Characteristics:**
- Scaled-down but fully functional environment in DR region
- All services running at reduced capacity
- Quick scale-up during disaster

**Implementation:**
```
Primary Region              DR Region
┌────────────────┐         ┌──────────────────┐
│   Full Scale   │────────>│  Reduced Scale   │
│   Auto Scaling │         │  Auto Scaling    │
│   Multi-AZ     │         │  Multi-AZ        │
└────────────────┘         └──────────────────┘
        │                           │
        └───── Route 53 Failover ───┘
```

**Key Services:**
- Auto Scaling in both regions
- Aurora Global Database or DynamoDB Global Tables
- Route 53 health checks and failover
- CloudFormation StackSets

### 4. Multi-Site Active/Active

**Characteristics:**
- Full capacity in multiple regions
- Traffic distributed across regions
- Zero downtime failover

**Implementation:**
```
       Route 53 (Geoproximity/Latency)
              │
      ┌───────┴───────┐
      │               │
┌─────▼────┐    ┌────▼─────┐
│ Region 1 │    │ Region 2 │
│ (Active) │    │ (Active) │
│ Full     │◄──►│ Full     │
│ Capacity │    │ Capacity │
└──────────┘    └──────────┘
```

**Key Services:**
- DynamoDB Global Tables (bidirectional replication)
- Aurora Global Database
- Route 53 with health checks
- CloudFront for static content

## Multi-Region Architecture Patterns

### Database Replication

**Amazon Aurora Global Database:**
- Primary in one region, up to 5 secondary regions
- Replication lag typically < 1 second
- RPO of 1 second, RTO of < 1 minute
- Promotes secondary to primary in disaster

```
Primary Region          Secondary Region
┌──────────────┐       ┌──────────────┐
│ Aurora       │──────>│ Aurora       │
│ (Read/Write) │       │ (Read-only)  │
│ Multi-AZ     │<──────│ Multi-AZ     │
└──────────────┘       └──────────────┘
   Sub-second replication
```

> 📚 [Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)

**DynamoDB Global Tables:**
- Multi-master, active-active replication
- Last writer wins conflict resolution
- Replication typically < 1 second
- Supports up to 6 regions

**RDS Cross-Region Read Replicas:**
- Asynchronous replication
- Manual promotion to standalone instance
- Useful for read scaling and DR

### Storage Replication

**S3 Cross-Region Replication (CRR):**
- Automatic, asynchronous replication
- Replicates new objects (enable versioning)
- Can change storage class in destination
- Optional: replicate delete markers

**S3 Replication Time Control (S3 RTC):**
- 99.99% replication within 15 minutes
- Provides replication SLA
- CloudWatch metrics for monitoring

**EBS Snapshots:**
- Copy snapshots to other regions
- Incremental copies (only changed blocks)
- Automated with Data Lifecycle Manager

## AWS Backup

Centralized backup service supporting:
- EC2, EBS, RDS, Aurora, DynamoDB, EFS, FSx, Storage Gateway
- Backup plans with schedules and retention
- Cross-region and cross-account backup
- Backup vaults with resource-based policies

**Backup Plan Example:**
```yaml
Backup Schedule: Daily at 5 AM UTC
Retention: 35 days
Lifecycle: Move to cold storage after 30 days
Copy to region: us-west-2
```

**Key Features:**
- Tag-based backup policies
- Legal hold for compliance
- Backup Vault Lock (WORM compliance)
- AWS Organizations integration

> 📚 [AWS Backup](https://docs.aws.amazon.com/aws-backup/latest/devguide/)

## Route 53 Health Checks and Failover

### Health Check Types

1. **Endpoint health checks** - Monitor specific endpoints
2. **Calculated health checks** - Combine multiple checks
3. **CloudWatch alarm health checks** - Based on CloudWatch metrics

### Failover Routing Policies

**Active-Passive:**
```
Primary (us-east-1) ──> Health Check ──> Failover to Secondary (us-west-2)
```

**Active-Active:**
```
Route 53 (Weighted/Latency routing)
    ├──> Region 1 (50% traffic)
    └──> Region 2 (50% traffic)
```

**Geoproximity:**
- Route based on geographic location
- Bias to shift traffic between regions
- Useful for gradual migration

## AWS Elastic Disaster Recovery (DRS)

Formerly CloudEndure, DRS provides:
- Continuous block-level replication
- Point-in-time recovery
- Automated failover and failback
- Supports physical, virtual, and cloud servers

**Use Cases:**
- Migrate from on-premises to AWS
- Region-to-region DR
- Cloud-to-cloud DR

**Benefits:**
- Sub-second RPO
- Minute-level RTO
- Cost-effective (pay for staging only)

> 📚 [Elastic Disaster Recovery](https://docs.aws.amazon.com/drs/latest/userguide/)

## High Availability Patterns

### Multi-AZ Deployments

**RDS Multi-AZ:**
- Synchronous replication to standby
- Automatic failover (typically < 60 seconds)
- No read scaling benefit
- Transparent to applications (same endpoint)

**ElastiCache Multi-AZ:**
- Redis: automatic failover with read replicas
- Memcached: distribute nodes across AZs

**ECS/EKS:**
- Deploy tasks/pods across multiple AZs
- Use ALB/NLB for traffic distribution

### Auto Scaling for Resilience

**Target Tracking:**
- Maintain specific metric (CPU, request count)
- Automatically adjusts capacity

**Step Scaling:**
- Add capacity based on CloudWatch alarms
- Different step adjustments

**Scheduled Scaling:**
- Predictable traffic patterns
- Scale before anticipated load

### Load Balancer Health Checks

**Application Load Balancer (ALB):**
- HTTP/HTTPS health checks
- Custom health check endpoints
- Configurable thresholds and intervals

**Network Load Balancer (NLB):**
- TCP/HTTP/HTTPS health checks
- Preserves source IP
- Ultra-low latency

## CloudFormation for DR

### StackSets

Deploy identical stacks across multiple regions and accounts:
```
Management Account
    │
    ├──> Deploy to us-east-1
    ├──> Deploy to us-west-2
    └──> Deploy to eu-west-1
```

**Use Cases:**
- DR infrastructure provisioning
- Multi-region application deployment
- Cross-account resource deployment

### Drift Detection

Monitor infrastructure changes:
- Detect manual changes
- Ensure consistency across regions
- Automated remediation with Config

## Testing and Validation

### Disaster Recovery Testing

**Game Days:**
- Simulate regional failures
- Test failover procedures
- Measure actual RTO/RPO
- Document lessons learned

**Chaos Engineering:**
- AWS Fault Injection Simulator (FIS)
- Controlled experiments
- Test application resilience

**Testing Checklist:**
- [ ] Database failover time
- [ ] DNS propagation time
- [ ] Application recovery procedures
- [ ] Data consistency validation
- [ ] Communication protocols

## Exam Tips

1. **RTO/RPO determine DR strategy** - Lower objectives = higher cost
2. **Aurora Global Database** - Best for multi-region databases with low RPO
3. **DynamoDB Global Tables** - Active-active, multi-master replication
4. **Pilot light vs. warm standby** - Pilot light has minimal running resources
5. **Route 53 health checks** - Essential for automated failover
6. **AWS Backup** - Centralized, cross-region/cross-account capable
7. **Multi-AZ is not DR** - Protects against AZ failure, not region failure
8. **S3 is 11 9's durable** - But still replicate for DR
9. **RDS Multi-AZ failover** - Automatic, synchronous, ~1 minute
10. **Cross-region replication is async** - Always has some lag
11. **Backup vault lock** - WORM compliance for regulatory requirements
12. **Elastic Disaster Recovery** - Continuous replication, point-in-time recovery
13. **StackSets for DR** - Deploy infrastructure to multiple regions
14. **Health check intervals** - Faster intervals = faster failover detection
15. **Active/Active requires data sync** - DynamoDB Global Tables or Aurora Global Database

## Common Scenarios

### Multi-Region Web Application

```
             CloudFront (Global CDN)
                     │
         Route 53 (Failover routing)
                     │
            ┌────────┴────────┐
            │                 │
     ┌──────▼─────┐    ┌─────▼──────┐
     │  us-east-1 │    │  us-west-2 │
     │            │    │            │
     │  ALB       │    │  ALB       │
     │  ASG       │    │  ASG       │
     │  Aurora    │◄──►│  Aurora    │
     │  (Primary) │    │  (Replica) │
     └────────────┘    └────────────┘
```

### Database DR Pattern

```
Primary Region              DR Region
┌─────────────────┐        ┌─────────────────┐
│ Application     │        │ Application     │
│      ▼          │        │ (Standby/Scale) │
│ Aurora Primary  │───────>│ Aurora Replica  │
│ (Multi-AZ)      │        │ (Read-only)     │
│      │          │        │                 │
│      ▼          │        │                 │
│ S3 (App Data)   │───────>│ S3 (Replica)    │
│ (CRR enabled)   │        │                 │
└─────────────────┘        └─────────────────┘
```

> 📚 [Well-Architected Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/)
