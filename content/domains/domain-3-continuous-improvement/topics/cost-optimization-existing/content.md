---
title: Cost Optimization for Existing Solutions
lastUpdated: 2026-01-06
---

# Cost Optimization for Existing Solutions

Cost optimization is a continuous process of analyzing and improving existing AWS solutions to reduce spend without compromising performance, reliability, or security. For SAP-C02 certification, architects must master not just the tools themselves, but understand when to apply each optimization technique, how they interact within complex multi-account organizations, and how to balance cost reduction with architectural best practices across all five Well-Architected pillars.

The AWS Well-Architected Cost Optimization Pillar defines five key focus areas: Practice Cloud Financial Management, Expenditure and Usage Awareness, Cost-Effective Resources, Manage Demand and Supply Resources, and Optimize Over Time. This topic focuses on the practical application of AWS tools and services that enable continuous optimization of existing workloads.

## AWS Trusted Advisor

AWS Trusted Advisor is a real-time guidance tool that analyzes your AWS environment across five categories: Cost Optimization, Performance, Security, Fault Tolerance, and Service Limits. Access to checks varies by AWS Support plan tier, making support plan selection a cost optimization decision in itself.

### Support Plan Tiers and Access Levels

| Support Plan | Trusted Advisor Access | Auto-Refresh | API Access |
|--------------|------------------------|--------------|------------|
| Basic/Developer | Service Limits + 7 core checks | Manual only | No |
| Business Support+ | All checks (50+) | Weekly automatic | Yes |
| Enterprise Support | All checks + priority support | Weekly automatic | Yes |

**Critical Exam Insight**: Questions asking about full Trusted Advisor cost optimization capabilities implicitly require Business Support+ or Enterprise Support. Developer Support and Business Support will be discontinued January 1, 2027.

### Cost Optimization Checks (Business+ and Enterprise)

Trusted Advisor provides comprehensive cost optimization checks including:

**Compute Optimization:**
- **Low utilization Amazon EC2 instances** - Detects instances with <10% CPU and <5% network I/O over 14 days
- **Idle Amazon RDS DB instances** - Identifies databases with zero connections over 7 days
- **Amazon EC2 Reserved Instance optimization** - Analyzes potential savings from purchasing RIs based on On-Demand usage
- **Compute Savings Plans recommendations** - Suggests commitment levels based on historical compute spend

**Storage Optimization:**
- **Underutilized Amazon EBS volumes** - Flags volumes with low IOPS (< 1 IOPS/day) suggesting snapshot and deletion
- **Amazon EBS snapshot age** - Identifies snapshots older than retention policies
- **Amazon S3 bucket versioning** - Recommends lifecycle policies for versioned objects

**Network Optimization:**
- **Idle load balancers** - Detects Classic, Application, and Network Load Balancers with no active backend targets or RequestCount of 0
- **Unassociated Elastic IP addresses** - Identifies unattached EIPs incurring hourly charges
- **Amazon Route 53 latency resource record sets** - Suggests removing unused latency-based routing records

**Commitment Optimization:**
- **Savings Plans and Reserved Instance coverage** - Compares On-Demand usage against committed capacity
- **Expiring Reserved Instances** - Alerts 30, 7, and 1 day before RI expiration to prevent unexpected On-Demand charges
- **Reserved Instance lease expirations** - Tracks marketplace RI purchases approaching end of term

### Integration and Automation Capabilities

**EventBridge Integration (Business+ and Enterprise Only):**
Trusted Advisor publishes check results to Amazon EventBridge, enabling automated workflows:

```json
{
  "source": "aws.trustedadvisor",
  "detail-type": "Trusted Advisor Check Item Refresh Notification",
  "detail": {
    "check-name": "Low Utilization Amazon EC2 Instances",
    "check-item-detail": {
      "Instance ID": "i-1234567890abcdef0",
      "Region/AZ": "us-east-1a",
      "Day 1": "0.1%",
      "14-Day Average CPU Utilization": "2.3%"
    },
    "status": "WARN"
  }
}
```

**Automation Use Cases:**
1. **Auto-stop idle instances**: Trigger Lambda to stop EC2 instances flagged with <5% CPU utilization
2. **Ticket creation**: Open ServiceNow or Jira tickets for teams to review underutilized resources
3. **Tag-based exceptions**: Skip remediation for resources tagged with `TrustedAdvisor:Exempt=true`
4. **Cost anomaly correlation**: Cross-reference Trusted Advisor findings with Cost Anomaly Detection alerts

**AWS Organizations Integration:**
View aggregated Trusted Advisor results across all member accounts from the management account, enabling centralized cost optimization governance.

**Best Practice**: Configure SNS topics subscribed to Trusted Advisor EventBridge events with filtering rules to route different check types to appropriate teams (compute checks to infrastructure team, storage checks to data team, etc.).

**AWS Documentation:**
- [AWS Trusted Advisor User Guide](https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html)
- [AWS Trusted Advisor Check Reference](https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor-check-reference.html)
- [Monitoring Trusted Advisor with EventBridge](https://docs.aws.amazon.com/awssupport/latest/user/cloudwatch-events-ta.html)
- [AWS Support Plans Comparison](https://aws.amazon.com/premiumsupport/plans/)

## AWS Compute Optimizer

AWS Compute Optimizer is a machine learning-powered service that analyzes resource configuration and utilization CloudWatch metrics to generate rightsizing recommendations. Unlike Trusted Advisor's simple threshold-based checks (e.g., <10% CPU), Compute Optimizer uses sophisticated ML models trained on AWS's global fleet to identify optimization opportunities while considering performance requirements.

### Opt-In Model and Multi-Account Support

**Critical Requirement**: Compute Optimizer operates on an opt-in basis. You must explicitly enable it for each account or opt in at the AWS Organizations management account level to analyze member accounts.

**Multi-Account Architecture:**
- Management account can view recommendations across all member accounts
- Member accounts only see their own recommendations
- Requires minimum 30 hours of metric data before generating recommendations
- Supports cross-region analysis from a single console view

### Supported Resources

Compute Optimizer provides recommendations for six resource types:

1. **Amazon EC2 instances** - Rightsizing across instance families, including Graviton migration opportunities
2. **Auto Scaling groups** - Optimizes launch configurations and scaling policies
3. **Amazon EBS volumes** - Recommends volume type changes (e.g., GP2 to GP3) and size adjustments
4. **AWS Lambda functions** - Memory and timeout optimization based on execution patterns
5. **Amazon ECS services on Fargate** - CPU and memory task definition optimization
6. **Amazon RDS and Aurora databases** - Instance class recommendations (newer feature)

### Recommendation Classifications

Compute Optimizer categorizes resources into three classifications:

**EC2 Instance Recommendations:**
- **Optimized** - Current configuration is appropriate for the workload
- **Under-provisioned** - Resource constraints detected; recommends larger instance (addresses performance risk)
- **Over-provisioned** - Excess capacity detected; recommends smaller instance (cost savings opportunity)

**Lambda Function Recommendations:**
- **Optimized** - Memory allocation matches execution profile
- **Over-provisioned** - Allocated memory exceeds 95th percentile usage
- **Under-provisioned** - Function approaching timeout limits or memory errors

### Metrics Analysis and Lookback Periods

**Standard Analysis (Free):**
- **Lookback period**: 14 days of CloudWatch metrics
- **Metrics analyzed**: CPU, network, disk I/O
- **Memory**: NOT included unless CloudWatch agent installed
- **Retention**: Recommendations stored for 14 days

**Enhanced Infrastructure Metrics (Paid Feature):**
- **Lookback period**: 93 days (3 months)
- **Benefits**: Captures weekly and monthly workload patterns, seasonal variations, batch processing cycles
- **Cost**: Per-resource per-month fee (consult AWS Pricing)
- **Use case**: Production workloads with variable patterns, month-end batch jobs, weekly reporting systems

**CloudWatch Agent Requirement for Memory Metrics:**
EC2 instance memory utilization is NOT a default CloudWatch metric. To include memory in Compute Optimizer analysis:
1. Install CloudWatch agent on EC2 instances
2. Configure agent to collect `mem_used_percent` metric
3. Allow 30 hours for Compute Optimizer to ingest new metrics
4. Memory-aware recommendations will appear in subsequent analysis

### External Metrics Ingestion

**Advanced Feature**: Compute Optimizer can ingest external memory metrics from third-party observability platforms:
- **Supported partners**: Datadog, Dynatrace, Instana, New Relic
- **Use case**: Environments already using APM tools without CloudWatch agent deployment
- **Configuration**: API-based integration through AWS Systems Manager Parameter Store

### Customization and Recommendation Preferences

**Organization-Level Preferences** (Set at management account):
- **CPU utilization headroom**: Default 15-20% buffer to prevent performance degradation
- **Memory utilization threshold**: Adjust sensitivity for memory-based recommendations
- **Instance family preferences**: Include or exclude specific families (e.g., exclude metal instances, prefer Graviton)
- **Lookback period override**: Set custom analysis windows per account

**Example Scenario**: A financial services company may set preferences to exclude T3 burstable instances for production databases and require 30% CPU headroom to handle unexpected transaction spikes.

### Price-Performance Trade-offs

Compute Optimizer provides three recommendation options per resource, each balancing cost vs. performance differently:

1. **Maximum savings option** - Most aggressive downsizing, highest cost reduction, moderate performance risk
2. **Balanced option** - AWS recommended, 15-20% headroom, balance of cost and performance
3. **Performance optimization** - Prioritizes performance headroom over cost savings

**Exam Scenario**: When a question states "minimize cost while maintaining performance," the balanced option is typically correct. "Maximize cost savings" suggests the maximum savings option.

### Export and Integration Capabilities

**S3 Export Feature:**
Export recommendations to S3 in CSV or Parquet format for:
- Quarterly cost optimization reviews
- Custom analytics with Amazon Athena
- Integration with business intelligence tools
- Historical trend analysis (recommendations expire after 14 days in console)

**API Access:**
Programmatically retrieve recommendations using:
- `GetEC2InstanceRecommendations`
- `GetAutoScalingGroupRecommendations`
- `ExportRecommendations` (batch export)

**Use case**: Automated weekly reports sent to engineering teams showing their top 10 over-provisioned instances.

**AWS Documentation:**
- [AWS Compute Optimizer User Guide](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [Compute Optimizer Metrics Requirements](https://docs.aws.amazon.com/compute-optimizer/latest/ug/metrics.html)
- [Enhanced Infrastructure Metrics](https://docs.aws.amazon.com/compute-optimizer/latest/ug/enhanced-infrastructure-metrics.html)
- [Viewing Recommendations](https://docs.aws.amazon.com/compute-optimizer/latest/ug/viewing-recommendations.html)

## AWS Cost Explorer

AWS Cost Explorer is a cost management tool that provides interactive visualization and analysis capabilities for AWS spend and usage data. It offers historical cost analysis, forecasting, and optimization recommendations through a graphical interface and API access.

### Core Capabilities

**1. Cost and Usage Visualization**
- View costs by service, account, region, Availability Zone, or custom dimensions
- Filter by time range (daily, monthly, or custom)
- Granularity: Daily or monthly aggregation
- Compare time periods (this month vs. last month, YoY comparisons)

**2. Cost Forecasting**
- Predict future costs based on historical usage trends (3, 6, or 12-month forecasts)
- Uses linear regression ML models
- Confidence intervals displayed for forecasts
- Useful for budget planning and variance analysis

**3. Savings Plans Recommendations**
- Analyzes 7, 30, or 60 days of historical usage
- Recommends hourly commitment amount
- Shows estimated savings percentages
- Compares 1-year vs. 3-year commitment options

**4. Reserved Instance Analysis**
- **RI Utilization**: Percentage of purchased RI hours actually used
- **RI Coverage**: Percentage of total instance hours covered by RIs
- **Expiration tracking**: Monitors approaching RI end dates
- **Modification recommendations**: Suggests RI exchanges for better coverage

**5. Cost Allocation Tags**
- Group costs by business unit, project, environment, or custom tags
- Requires tag activation (24-48 hours for historical data population)
- Supports both user-defined and AWS-generated tags (e.g., `aws:createdBy`)

### Cost Categories

Cost Categories enable hierarchical cost organization beyond simple tags:

```
Business Unit (Top Level)
├── Engineering
│   ├── Platform Team (tag:team=platform)
│   ├── Product Team (tag:team=product)
│   └── Security Team (tag:team=security)
├── Marketing (tag:department=marketing)
└── Operations
    ├── Infrastructure (tag:function=infra)
    └── Support (tag:function=support)
```

**Use Cases:**
- **Chargeback models**: Allocate costs to departments for internal billing
- **Showback reporting**: Demonstrate cost attribution without actual billing
- **Multi-tenant architecture**: Track costs per customer or tenant
- **Environment-based budgets**: Separate production vs. non-production spend

**Rule-Based Assignment**: Cost Categories use rule logic (if account ID matches X, categorize as Y) and can inherit from other categories for nested hierarchies.

### Rightsizing Recommendations (Distinct from Compute Optimizer)

Cost Explorer includes a separate rightsizing recommendations feature:

**Key Differences from Compute Optimizer:**

| Feature | Cost Explorer Rightsizing | Compute Optimizer |
|---------|---------------------------|-------------------|
| **Analysis method** | Rule-based thresholds | Machine learning models |
| **Lookback period** | 14 days minimum | 14 days standard, 93 days with Enhanced Metrics |
| **Resource types** | EC2 instances only | EC2, ASG, EBS, Lambda, Fargate, RDS |
| **Recommendation depth** | Single downsize suggestion | Multiple options with price-performance trade-offs |
| **Memory metrics** | Not included | Supported with CloudWatch agent |
| **Access** | All accounts (enabled by default) | Opt-in required |

**Cost Explorer Recommendation Methodology:**
- Analyzes maximum CPU and memory utilization over 14-day period
- Applies conservative thresholds (typically <40% max utilization)
- Recommends downsizing within same instance family
- Estimates monthly savings per instance

**Exam Insight**: AWS now recommends using **Cost Optimization Hub** instead of Cost Explorer rightsizing for more comprehensive recommendations. However, for backwards compatibility questions, know that Cost Explorer rightsizing exists and focuses on EC2 only.

### Advanced Filtering and Grouping

**Dimension Grouping:**
- Group by API operation to identify expensive API calls
- Group by purchase option (On-Demand, Reserved, Spot)
- Group by database engine for RDS cost analysis
- Group by legal entity for multi-entity AWS Organizations

**Filters and Exclusions:**
- Include/exclude specific services (e.g., exclude tax from analysis)
- Date range filtering with custom start/end dates
- Charge type filtering (usage, credits, refunds, support fees)

### Cost Anomaly Integration

Cost Explorer displays anomalies detected by Cost Anomaly Detection service directly in the visualization, allowing you to correlate unusual spend with specific services or time periods.

**AWS Documentation:**
- [AWS Cost Explorer User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [Cost Explorer Rightsizing Recommendations](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-rightsizing.html)
- [Creating Cost Categories](https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-categories.html)
- [Cost Explorer API Reference](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_Operations_AWS_Cost_Explorer_Service.html)

## Identifying Unused Resources

Unused resources are one of the fastest ways to achieve cost savings in existing AWS environments. Unlike rightsizing which requires careful performance analysis, deleting truly unused resources has zero performance impact and immediate cost benefit.

### Common Unused Resources and Detection Methods

**1. Unattached EBS Volumes**
- **Scenario**: EC2 instance terminated but volume with `DeleteOnTermination=false` persists
- **Cost**: Charged per GB-month for provisioned capacity (GP3: $0.08/GB-month)
- **Detection**: AWS Config rule `ec2-volume-inuse-check` or CloudWatch metric `VolumeIdleTime`
- **Remediation**: Snapshot for backup, then delete volume
- **Automation**: Lambda triggered by Config rule non-compliance to snapshot and delete after grace period

**2. Idle Elastic Load Balancers**
- **Scenario**: Application decommissioned but ALB/NLB remains running
- **Cost**: $0.0225/hour (~$16.20/month) plus LCU charges even with zero traffic
- **Detection**: CloudWatch metrics `ActiveConnectionCount=0` and `ProcessedBytes=0` for 7+ days
- **Trusted Advisor check**: Idle load balancer check (Business+ support)
- **Hidden cost**: Associated target groups, listener rules, and SSL certificates also consuming resources

**3. Unassociated Elastic IP Addresses**
- **Critical**: EIPs are FREE when associated with running instances, but charged $0.005/hour (~$3.60/month) when unassociated
- **Common cause**: Stopped EC2 instances (EIP disassociates automatically), deleted instances, VPC migration remnants
- **Detection**: AWS Config rule `eip-attached` or custom script querying `DescribeAddresses` with `AssociationId=null`
- **Scale impact**: 100 unused EIPs = $360/month wasted spend

**4. Stale EBS Snapshots**
- **Scenario**: Snapshots of volumes that were deleted months/years ago
- **Cost accumulation**: Snapshots persist indefinitely unless explicitly deleted
- **Detection strategy**:
  - Query snapshots with `describe-snapshots` and cross-reference with existing volumes
  - Identify snapshots older than retention policy (e.g., >90 days with no subsequent snapshots)
  - Check for snapshots from accounts no longer in use
- **Incremental nature**: First snapshot is full copy, subsequent snapshots are incremental (only deleting newest snapshot saves minimal space)

**5. Idle RDS Instances**
- **Scenario**: Development database created for testing, never deleted
- **Cost**: Small db.t3.micro RDS instance = ~$13/month, production db.r5.2xlarge = $700+/month
- **Detection**: CloudWatch metric `DatabaseConnections=0` for 7-14 days
- **Trusted Advisor check**: Amazon RDS idle DB instances
- **Safe approach**: Create final snapshot before deletion for potential restoration

**6. Orphaned Resources from Deleted Stacks**
- **CloudFormation deletion protection**: Resources with `DeletionPolicy: Retain` survive stack deletion
- **Common orphans**: S3 buckets (cannot delete non-empty buckets), EBS volumes, RDS snapshots, IAM roles
- **Detection**: Tag all CloudFormation resources with stack name, query for resources with stack tags referencing non-existent stacks
- **Prevention**: Use `DeletionPolicy: Delete` for non-critical resources, `DeletionPolicy: Snapshot` for databases

**7. Unused NAT Gateways**
- **Cost**: $0.045/hour (~$32.40/month) plus data processing charges
- **Scenario**: Private subnets no longer contain resources requiring internet access
- **Detection**: CloudWatch metrics `BytesOutToDestination=0` and `BytesInFromDestination=0`
- **Alternative**: NAT instances (self-managed, cheaper for low throughput, but higher operational overhead)

**8. Underutilized or Idle CloudWatch Logs Groups**
- **Cost**: $0.50/GB ingested, $0.03/GB-month storage
- **Common issue**: Applications deleted but log groups persist indefinitely
- **Detection**: Log groups with zero `IncomingBytes` for 30+ days
- **Retention policies**: Set automatic expiration (e.g., 7 days for dev, 90 days for prod)

### Automated Detection Framework

**AWS Config Rules Approach:**
```python
# Custom Config Rule: Detect volumes unattached >30 days
def lambda_handler(event, context):
    config = boto3.client('config')
    ec2 = boto3.client('ec2')

    volumes = ec2.describe_volumes(
        Filters=[{'Name': 'status', 'Values': ['available']}]
    )

    for volume in volumes['Volumes']:
        create_time = volume['CreateTime']
        age_days = (datetime.now(timezone.utc) - create_time).days

        if age_days > 30:
            # Report as non-compliant
            config.put_evaluations(
                Evaluations=[{
                    'ComplianceResourceType': 'AWS::EC2::Volume',
                    'ComplianceResourceId': volume['VolumeId'],
                    'ComplianceType': 'NON_COMPLIANT',
                    'Annotation': f'Unattached for {age_days} days',
                    'OrderingTimestamp': datetime.now()
                }]
            )
```

**Tag-Based Lifecycle Governance:**
Implement mandatory tagging policy via AWS Organizations:

```yaml
# Service Control Policy: Prevent resource creation without required tags
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyEC2WithoutTags",
    "Effect": "Deny",
    "Action": ["ec2:RunInstances", "ec2:CreateVolume"],
    "Resource": ["arn:aws:ec2:*:*:instance/*", "arn:aws:ec2:*:*:volume/*"],
    "Condition": {
      "StringNotLike": {
        "aws:RequestTag/Owner": "*",
        "aws:RequestTag/Project": "*",
        "aws:RequestTag/Environment": ["production", "staging", "development"]
      }
    }
  }]
}
```

**Required Tags for Resource Tracking:**
- `Owner`: Email or team identifier for accountability
- `Project`: Project code for cost allocation
- `Environment`: production | staging | development | testing
- `ExpirationDate`: YYYY-MM-DD for temporary resources (auto-delete logic)
- `CostCenter`: Chargeback attribution
- `DataClassification`: public | internal | confidential | restricted (retention policies)

**AWS Documentation:**
- [AWS Config Rules](https://docs.aws.amazon.com/config/latest/developerguide/evaluate-config_use-managed-rules.html)
- [Resource Tagging Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)
- [AWS Resource Groups Tagging API](https://docs.aws.amazon.com/resourcegroupstagging/latest/APIReference/Welcome.html)

## Storage Optimization

Storage often represents 20-30% of total AWS spend, making it a high-impact area for cost optimization. Unlike compute rightsizing which requires performance analysis, storage optimization primarily involves lifecycle management and selecting cost-appropriate storage classes.

### Amazon S3 Storage Classes and Lifecycle Policies

**S3 Storage Class Decision Tree:**

```
Data Access Pattern Assessment
│
├─ Frequently accessed (>1x/month) → S3 Standard
├─ Unknown/unpredictable access → S3 Intelligent-Tiering
├─ Infrequent access (quarterly) → S3 Standard-IA or S3 One Zone-IA
├─ Archive with immediate retrieval → S3 Glacier Instant Retrieval
├─ Archive with 3-12 hour retrieval → S3 Glacier Flexible Retrieval
└─ Long-term archive (7-10 year retention) → S3 Glacier Deep Archive
```

**Lifecycle Policy Example for Application Logs:**
```xml
<LifecycleConfiguration>
  <Rule>
    <ID>log-retention-policy</ID>
    <Filter><Prefix>logs/</Prefix></Filter>
    <Status>Enabled</Status>
    <Transition>
      <Days>30</Days>
      <StorageClass>STANDARD_IA</StorageClass>
    </Transition>
    <Transition>
      <Days>90</Days>
      <StorageClass>GLACIER_IR</StorageClass>
    </Transition>
    <Transition>
      <Days>365</Days>
      <StorageClass>DEEP_ARCHIVE</StorageClass>
    </Transition>
    <Expiration>
      <Days>2555</Days> <!-- 7 years for compliance -->
    </Expiration>
  </Rule>
</LifecycleConfiguration>
```

### S3 Intelligent-Tiering Deep Dive

**How It Works:**
S3 Intelligent-Tiering automatically moves objects between access tiers based on changing access patterns, optimizing costs without performance impact or operational overhead.

**Access Tiers:**
1. **Frequent Access tier** - Default tier, same performance as S3 Standard
2. **Infrequent Access tier** - Objects not accessed for 30 consecutive days (40% cost reduction)
3. **Archive Instant Access tier** - Objects not accessed for 90 days, opt-in (68% cost reduction)
4. **Archive Access tier** - Objects not accessed for 90-270 days, opt-in, 3-5 hour retrieval (71% cost reduction)
5. **Deep Archive Access tier** - Objects not accessed for 180-730 days, opt-in, 12 hour retrieval (95% cost reduction)

**Cost Structure:**
- Storage pricing varies by tier (decreases as objects move to lower tiers)
- Small monthly monitoring fee: $0.0025 per 1,000 objects
- **Zero retrieval fees** (critical difference from S3 Standard-IA)
- **Zero transition fees** between tiers within Intelligent-Tiering

**When to Use:**
- **Data lakes** with unpredictable access patterns
- **Log aggregation** where recent logs are accessed frequently, old logs rarely
- **Media archives** with variable viewer interest over time
- **Machine learning datasets** where training data access fluctuates

**When NOT to Use:**
- Small objects <128 KB (minimum billable object size)
- Objects deleted within 30 days (minimum storage duration charge)
- Known frequent access patterns (S3 Standard is cheaper)
- Known infrequent access patterns (S3 Standard-IA is cheaper)

**Real-World Example**: A video streaming platform stores 500 TB of content. New releases accessed heavily for 60 days, then sporadically. Intelligent-Tiering automatically transitions older content to Infrequent Access tier, saving $6,000/month vs. keeping all content in S3 Standard.

### EBS Volume Type Optimization

**GP3 vs GP2 Comparison:**

| Feature | GP3 | GP2 |
|---------|-----|-----|
| **Baseline Performance** | 3,000 IOPS, 125 MiB/s | Scaled by volume size (3 IOPS/GiB) |
| **Max Performance** | 16,000 IOPS, 1,000 MiB/s | 16,000 IOPS, 250 MiB/s |
| **Price (us-east-1)** | $0.08/GB-month | $0.10/GB-month |
| **Cost Savings** | 20% cheaper for same capacity | Baseline |
| **Performance Scaling** | Independent IOPS/throughput provisioning | Coupled to volume size |
| **Burst Behavior** | No burst, consistent baseline | Burst credits for <1 TiB volumes |

**Migration Strategy:**
- **Live modification**: Change volume type without downtime using `modify-volume` API
- **Zero application changes**: Completely transparent to applications
- **Gradual rollout**: Test on non-production volumes first
- **Instant savings**: Billing changes on hour of modification

**GP3 Provisioning Optimization:**
- Default GP3 provides 3,000 IOPS and 125 MiB/s
- Additional IOPS: $0.005 per provisioned IOPS-month (beyond 3,000)
- Additional throughput: $0.04 per provisioned MiB/s-month (beyond 125)
- **Exam tip**: Don't over-provision IOPS; use CloudWatch metrics `VolumeReadOps` and `VolumeWriteOps` to determine actual needs

**Volume Right-Sizing Example:**
```
Current: 1 TiB GP2 volume
- Provides: 3,000 IOPS baseline
- Cost: $102.40/month
- Actual usage: 500 IOPS (from CloudWatch)

Optimized: 334 GiB GP3 volume
- Provides: 3,000 IOPS baseline (same)
- Cost: $26.72/month
- Savings: $75.68/month (74% reduction)
```

**EBS Snapshot Lifecycle Management:**
Use **Amazon Data Lifecycle Manager (DLM)** to automate snapshot creation and deletion:
- Define retention policies (e.g., retain 7 daily, 4 weekly, 12 monthly snapshots)
- Tag-based snapshot management
- Cross-region snapshot copies for DR
- Automatic cleanup prevents snapshot accumulation

**Fast Snapshot Restore (FSR) Cost Consideration:**
- Enables instant volume restoration from snapshots (no pre-warming)
- Cost: $0.75 per DSU-hour (Data Services Unit)
- Use case: Critical volumes requiring rapid recovery
- Cost optimization: Enable FSR only for production volumes, not dev/test

### Glacier Storage Classes for Long-Term Archives

**Retrieval Time and Cost Trade-offs:**

| Storage Class | Retrieval Time | Storage Cost (per GB-month) | Retrieval Cost (per GB) | Use Case |
|---------------|----------------|------------------------------|------------------------|----------|
| **Glacier Instant Retrieval** | Milliseconds | $0.004 | $0.03 (standard) | Quarterly accessed archives |
| **Glacier Flexible Retrieval** | 1-5 minutes (Expedited) | $0.0036 | $0.03 (expedited) | Medical imaging, media archives |
| | 3-5 hours (Standard) | | $0.01 (standard) | |
| | 5-12 hours (Bulk) | | $0.0025 (bulk) | |
| **Glacier Deep Archive** | 12 hours (Standard) | $0.00099 | $0.02 (standard) | Compliance archives (7-10 years) |
| | 48 hours (Bulk) | | $0.0025 (bulk) | |

**Glacier Flexible Retrieval Provisioned Capacity:**
- Guarantees expedited retrieval availability during high-demand periods
- Cost: $100 per capacity unit per month (provides 3 expedited retrievals per 5 minutes)
- Use case: Disaster recovery scenarios requiring guaranteed fast restoration

**Compliance and Legal Hold:**
- S3 Glacier Vault Lock for immutable archives (WORM - Write Once Read Many)
- Prevents deletion or modification for compliance periods
- Use case: Financial records retention (SEC 17a-4), healthcare data (HIPAA)

**AWS Documentation:**
- [Amazon S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [S3 Intelligent-Tiering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html)
- [Amazon EBS Volume Types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html)
- [S3 Glacier Storage Classes](https://aws.amazon.com/s3/storage-classes/glacier/)
- [Amazon Data Lifecycle Manager](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/snapshot-lifecycle.html)

## Reserved Instances and Savings Plans

Commitment-based pricing (Reserved Instances and Savings Plans) provides the deepest discounts for predictable workloads. The key challenge is balancing commitment (for maximum savings) against flexibility (to avoid wasted capacity).

### Understanding the Commitment Spectrum

```
Pricing Model Flexibility vs. Savings
│
On-Demand ────────────────────────────────── 0% savings, maximum flexibility
│
Spot Instances ──────────────────────────── Up to 90% savings, can be interrupted
│
Savings Plans (Compute) ─────────────────── Up to 66% savings, high flexibility
│
Savings Plans (EC2 Instance) ────────────── Up to 72% savings, moderate flexibility
│
Convertible RIs ─────────────────────────── Up to 54% savings, moderate flexibility
│
Standard RIs ────────────────────────────── Up to 72% savings, low flexibility
```

### Reserved Instance (RI) Deep Dive

**Standard RIs:**
- **Discount**: Up to 72% vs. On-Demand (3-year, All Upfront)
- **Scope**: Specific instance family, size, region, platform (e.g., m5.xlarge Linux in us-east-1)
- **Flexibility**: Can change Availability Zone within region
- **Modification**: Can split or merge RIs of same instance family
- **Use case**: Steady-state workloads with no anticipated architecture changes

**Convertible RIs:**
- **Discount**: Up to 54% vs. On-Demand (3-year, All Upfront)
- **Scope**: Initially specific, but can exchange for different families
- **Flexibility**: Can exchange for different instance family, OS, tenancy, or payment option
- **Exchange rules**: New RI must have equal or greater value
- **Use case**: Long-term workloads with potential for instance type changes (e.g., future Graviton migration)

**Payment Options:**

| Payment Type | Upfront Payment | Monthly Payment | Total Discount (3-year) |
|--------------|-----------------|-----------------|-------------------------|
| **All Upfront** | 100% paid upfront | $0 | Up to 72% (Standard RI) |
| **Partial Upfront** | ~50% paid upfront | Monthly billing | Up to 55% |
| **No Upfront** | $0 upfront | Monthly billing | Up to 42% |

**Exam Scenario**: All Upfront provides maximum savings but requires capital expenditure approval. No Upfront spreads cost but reduces discount percentage.

**Regional vs. Zonal RIs:**
- **Regional RIs** (default): Apply to any AZ in the region, provide AZ flexibility and instance size flexibility within instance family
- **Zonal RIs**: Locked to specific AZ, provide capacity reservation guarantee
- **Instance size flexibility**: Regional m5.xlarge RI can cover 2x m5.large or 1x m5.2xlarge (normalized units)

**Normalized Units Calculation:**
```
Instance Size Normalization Factor
nano          0.25
micro         0.5
small         1
medium        2
large         4
xlarge        8
2xlarge       16
4xlarge       32
```

Example: 1x m5.4xlarge Regional RI (32 units) can cover:
- 32x m5.small instances
- 4x m5.2xlarge instances
- 2x m5.4xlarge instances
- Any combination totaling 32 normalized units

### Savings Plans Comprehensive Comparison

**Compute Savings Plans:**
- **Discount**: Up to 66% savings
- **Commitment**: Hourly spend (e.g., $10/hour for 1 year)
- **Flexibility**:
  - Any instance family (M5, C5, R5, etc.)
  - Any instance size
  - Any region
  - Any OS (Linux, Windows)
  - Any tenancy (shared, dedicated)
  - Applies to EC2, Fargate, Lambda
- **Use case**: Highly dynamic environments, multi-region deployments, polyglot compute (EC2 + Fargate + Lambda)

**EC2 Instance Savings Plans:**
- **Discount**: Up to 72% savings (matches Standard RI)
- **Commitment**: Hourly spend for specific instance family in specific region
- **Flexibility**:
  - Locked to instance family (e.g., M5 family)
  - Locked to region (e.g., us-east-1)
  - Flexible across instance sizes (m5.large, m5.xlarge)
  - Flexible across OS (Linux, Windows)
  - Flexible across tenancy
- **Use case**: Predictable workloads with established instance family preferences

**SageMaker Savings Plans:**
- Up to 64% savings on SageMaker AI instance usage
- Applies to Studio notebooks, training, real-time inference, batch transform
- Flexible across instance families and sizes

### Savings Plans Recommendation Engine

AWS Cost Explorer analyzes historical usage and recommends Savings Plans commitments:

**Analysis Periods:**
- 7-day lookback: Captures recent patterns (suitable for rapidly scaling workloads)
- 30-day lookback: Standard recommendation (balances recency and stability)
- 60-day lookback: Conservative recommendation (accounts for monthly cycles)

**Recommendation Methodology:**
1. Analyzes On-Demand usage across selected lookback period
2. Identifies consistent baseline usage (e.g., minimum hourly spend)
3. Calculates commitment amount that maximizes savings while minimizing unused commitment
4. Provides multiple recommendation options (low, medium, high commitment)

**Exam Insight**: Start with conservative commitment covering 50-60% of baseline usage, then incrementally purchase additional Savings Plans as you validate patterns.

### Key Metrics for Commitment Tracking

**1. Savings Plans Utilization:**
- Formula: (Used commitment / Total commitment) × 100
- Target: >95% utilization
- Risk: <90% indicates over-commitment, wasted spend

**2. Savings Plans Coverage:**
- Formula: (Hours covered by Savings Plans / Total compute hours) × 100
- Target: 70-80% (leaves room for variable workloads)
- Balance: Higher coverage = more savings, but less flexibility for growth

**3. On-Demand Spend Percentage:**
- Formula: On-Demand cost / Total compute cost
- Acceptable: 20-30% for bursting, testing, and variable workloads
- Red flag: >50% suggests under-commitment or workload changes

### Advanced Commitment Strategies

**Layered Commitment Approach:**
```
100% of compute capacity
│
├─ Savings Plans (60% of baseline) ─── Maximum savings for predictable core
├─ On-Demand (30% variable) ───────── Handles scaling, new workloads
└─ Spot (10% fault-tolerant) ──────── Batch processing, stateless apps
```

**Commitment Term Selection:**
- **1-year term**: Lower discount (up to 40%), faster adaptation to architectural changes
- **3-year term**: Maximum discount (up to 72%), requires high confidence in workload stability
- **Hybrid approach**: Core workloads on 3-year, newer workloads on 1-year

**Multi-Account Strategies (AWS Organizations):**
- Savings Plans share across all accounts in consolidated billing family
- Management account purchases Savings Plans, benefit automatically distributed
- Link accounts must have sharing enabled (default behavior)
- Best practice: Centralized purchasing from FinOps/cost optimization team

**Combining Reservations with Capacity Reservations:**
- **On-Demand Capacity Reservations** (ODCR): Reserve capacity in specific AZ without commitment discount
- **Zonal RI + ODCR**: Not valid, creates double reservation
- **Savings Plans + ODCR**: Valid combination - Savings Plans provide discount, ODCR provides capacity guarantee
- **Use case**: Compliance requirements for guaranteed capacity (financial trading, medical imaging) with Savings Plans cost optimization

**AWS Documentation:**
- [Savings Plans User Guide](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Reserved Instances User Guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)
- [Savings Plans vs Reserved Instances Comparison](https://aws.amazon.com/savingsplans/faq/)
- [Instance Size Flexibility for RIs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/apply_ri.html)

## Cost Allocation and Tagging

Effective tagging is the foundation of cost allocation, showback/chargeback models, and automated cost governance. Without proper tags, you cannot answer fundamental questions like "How much does the marketing website cost?" or "What's our development environment spend?"

### Tagging Strategy Development

**Tag Categories and Examples:**

**1. Technical Tags** (Resource management and automation)
```yaml
Name: descriptive-resource-name
Environment: production | staging | development | testing
Application: web-app | api-service | data-pipeline
Component: frontend | backend | database | cache
Version: v1.2.3
```

**2. Business Tags** (Cost allocation and chargeback)
```yaml
CostCenter: CC-1001-Engineering | CC-2002-Marketing
Project: project-phoenix | customer-migration-2024
Owner: team-platform@company.com | john.doe@company.com
BusinessUnit: retail | wholesale | enterprise
CustomerID: customer-abc-123
```

**3. Compliance and Security Tags**
```yaml
DataClassification: public | internal | confidential | restricted
Compliance: hipaa | pci-dss | sox | gdpr
BackupPolicy: daily | weekly | monthly | none
DisasterRecovery: tier1-rpo-1hr | tier2-rpo-4hr | tier3-rpo-24hr
```

**4. Automation Tags**
```yaml
StartSchedule: 0 8 * * MON-FRI (cron: start at 8 AM weekdays)
StopSchedule: 0 18 * * MON-FRI (cron: stop at 6 PM weekdays)
AutoShutdown: true | false
ExpirationDate: 2026-03-31 (auto-delete after date)
PatchGroup: critical | standard | testing
```

### Cost Allocation Tags Activation Process

**Step 1: Create Tags on Resources**
Tags exist on resources but are not automatically available for cost reporting.

**Step 2: Activate Tags for Cost Allocation**
- Navigate to AWS Billing Console → Cost Allocation Tags
- User-defined tags appear 24 hours after first use
- Select tags to activate for cost reporting
- **Critical**: Activation is NOT retroactive; only applies to usage after activation date

**Step 3: Wait for Data Population**
- Activated tags appear in Cost Explorer after 24-48 hours
- Historical costs before activation cannot be tagged retroactively
- **Exam scenario**: Company wants to track costs by project immediately, but activation delay means 1-2 days before reporting is available

**AWS-Generated vs. User-Defined Tags:**

| Aspect | AWS-Generated Tags | User-Defined Tags |
|--------|-------------------|-------------------|
| **Prefix** | `aws:` (e.g., `aws:createdBy`) | Custom (cannot use `aws:` prefix) |
| **Creation** | Automatically created by AWS services | Manually created by users/automation |
| **Modification** | Cannot be modified or deleted | Can be modified or deleted |
| **Examples** | `aws:cloudformation:stack-name`, `aws:eks:cluster-name` | `Environment`, `CostCenter`, `Project` |
| **Activation** | Must be manually activated for cost reporting | Must be manually activated for cost reporting |

### Tag Enforcement with AWS Organizations

**Tag Policies Overview:**
Tag policies enforce tagging standards across all accounts in an organization, preventing non-compliant resource creation.

**Tag Policy Example:**
```json
{
  "tags": {
    "Environment": {
      "tag_key": {
        "@@assign": "Environment",
        "@@operators_allowed_for_child_policies": ["@@none"]
      },
      "tag_value": {
        "@@assign": ["production", "staging", "development", "testing"],
        "@@operators_allowed_for_child_policies": ["@@append"]
      },
      "enforced_for": {
        "@@assign": [
          "ec2:instance",
          "ec2:volume",
          "rds:db",
          "s3:bucket",
          "lambda:function"
        ]
      }
    },
    "CostCenter": {
      "tag_key": {
        "@@assign": "CostCenter"
      },
      "tag_value": {
        "@@assign": ["*"]
      },
      "enforced_for": {
        "@@assign": ["ec2:*", "rds:*", "s3:*"]
      }
    }
  }
}
```

**Enforcement Modes:**
- **Preventive**: Block resource creation if required tags are missing (using SCPs)
- **Detective**: Allow creation but flag non-compliance (using AWS Config)
- **Corrective**: Auto-apply tags or remediate via Lambda (using EventBridge)

**Service Control Policy for Tag Enforcement:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireTagsOnEC2",
      "Effect": "Deny",
      "Action": ["ec2:RunInstances"],
      "Resource": ["arn:aws:ec2:*:*:instance/*"],
      "Condition": {
        "StringNotLike": {
          "aws:RequestTag/Environment": ["production", "staging", "development"],
          "aws:RequestTag/CostCenter": "*",
          "aws:RequestTag/Owner": "*"
        }
      }
    }
  ]
}
```

### Bulk Tagging with Tag Editor and Resource Groups

**Tag Editor Use Cases:**
- **Migration scenarios**: Bulk tag all resources in a region before migration
- **Compliance remediation**: Add missing compliance tags to existing resources
- **Organizational restructure**: Update CostCenter tags when teams reorganize

**Tag Editor Capabilities:**
- Search across regions and resource types
- Filter by existing tags or lack of tags
- Bulk add, modify, or remove tags
- Export to CSV for review before applying

**Resource Groups for Cost Tracking:**
Create resource groups based on tags for unified cost visibility:
```yaml
Group Name: Production-Web-Application
Query:
  - Tag: Environment = production
  - Tag: Application = web-app
Resources Included:
  - 15 EC2 instances
  - 3 RDS databases
  - 2 Application Load Balancers
  - 1 CloudFront distribution
Monthly Cost: $12,450 (tracked in Cost Explorer)
```

### Cost Categories (Advanced Hierarchical Organization)

Cost Categories enable complex cost groupings beyond simple tags, supporting multi-level hierarchies and rule-based assignment.

**Example: Multi-Tenant SaaS Application**
```
Cost Category: Customer
│
├── Customer A (Rule: tag:CustomerID = cust-a-001)
│   ├── Production (Rule: tag:Environment = production)
│   └── Staging (Rule: tag:Environment = staging)
│
├── Customer B (Rule: tag:CustomerID = cust-b-002)
│   ├── Production
│   └── Staging
│
└── Internal Operations (Rule: tag:CustomerID NOT EXISTS)
    ├── Development (tag:Environment = development)
    └── Testing (tag:Environment = testing)
```

**Rule Types:**
1. **Tag-based rules**: `tag:Environment = production`
2. **Account-based rules**: `account = 123456789012`
3. **Service-based rules**: `service = Amazon EC2`
4. **Charge type rules**: `chargeType = Usage`
5. **Inherited rules**: Inherit from other Cost Categories (nested hierarchies)

**Use Cases:**
- **Chargeback**: Allocate costs to internal departments for actual billing
- **Showback**: Demonstrate costs to teams without actual invoicing
- **Customer attribution**: Track per-tenant costs in multi-tenant architectures
- **Environment segmentation**: Separate production vs. non-production costs for budgeting

**Exam Scenario**: Company runs multi-tenant SaaS. Wants to bill customers for their infrastructure usage. Solution: Tag all resources with `CustomerID`, create Cost Category with rules per customer, export monthly costs per category for invoicing.

**AWS Documentation:**
- [Tagging AWS Resources](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)
- [Cost Allocation Tags](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)
- [AWS Organizations Tag Policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html)
- [Creating Cost Categories](https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-categories.html)

## Cost Anomaly Detection

AWS Cost Anomaly Detection is a machine learning-powered service that continuously monitors your AWS spending and automatically identifies unusual cost patterns that deviate from historical trends. Unlike budget alerts (threshold-based), Cost Anomaly Detection uses dynamic ML models that understand your normal spending patterns, seasonality, and growth trends.

### How It Works

**Detection Engine:**
1. **Baseline establishment**: Requires minimum 10 days of historical cost data for new services
2. **Evaluation frequency**: Runs approximately 3 times per day
3. **Anomaly detection**: Uses statistical methods to identify spend deviations from expected patterns
4. **Seasonality awareness**: Accounts for weekly and monthly spending cycles (e.g., month-end batch processing)
5. **Growth adjustment**: Distinguishes between expected growth and true anomalies

**Detection Delay:**
- Cost data has 24-hour latency (inherited from Cost Explorer data refresh)
- Anomalies detected approximately 24 hours after unusual spending occurs
- **Not real-time**: Cannot prevent ongoing resource creation, only alerts after the fact

**Anomaly Scoring:**
Each detected anomaly includes:
- **Dollar impact**: Total unexpected spend amount
- **Percentage deviation**: How much spend differs from expected baseline
- **Confidence score**: ML model's certainty about the anomaly

### Cost Monitors (Scoping Anomaly Detection)

Cost Monitors define what spending to analyze and can be configured with multiple dimensions:

**Monitor Types:**

**1. AWS Service Monitor**
```yaml
Monitor Name: EC2-Service-Monitor
Scope: Amazon EC2 service
Detects:
  - New instance types launched
  - Instance count spikes
  - Unexpected region usage
Example Anomaly: "EC2 spend increased by $2,500 (150% above baseline) due to 20 new c5.4xlarge instances in eu-west-1"
```

**2. Linked Account Monitor**
```yaml
Monitor Name: Production-Account-Monitor
Scope: Account ID 123456789012 (production)
Detects:
  - Cross-service spending spikes in specific accounts
  - Compromised credential usage patterns
Example Anomaly: "Production account spend increased by $5,000 (200% above baseline) primarily driven by RDS and Data Transfer charges"
```

**3. Cost Category Monitor**
```yaml
Monitor Name: Marketing-Department-Monitor
Scope: Cost Category "Department = Marketing"
Detects:
  - Department-specific cost overruns
  - New service adoption
Example Anomaly: "Marketing department spend increased by $1,200 due to new CloudFront distribution serving 10 TB of data"
```

**4. Tag-Based Monitor**
```yaml
Monitor Name: Project-Phoenix-Monitor
Scope: Tag "Project = phoenix"
Detects:
  - Project-specific resource scaling
  - Unexpected resource types
Example Anomaly: "Project Phoenix spend increased by $800 due to new Elasticsearch cluster"
```

**Best Practice**: Create layered monitors
- Organization-level monitor (catches everything)
- Per-service monitors for critical services (EC2, RDS, S3, Data Transfer)
- Per-account monitors for production accounts
- Per-project monitors for major initiatives

### Alert Configuration

**Threshold Settings:**
- **Minimum anomaly amount**: Set dollar threshold to avoid alert fatigue (e.g., only alert if anomaly >$100)
- **Percentage deviation**: Some anomalies include percentage change context
- **Frequency**: Individual alerts or daily/weekly summaries

**Notification Channels:**

**1. Amazon SNS Integration**
```json
{
  "AlarmName": "Cost-Anomaly-Production",
  "AlarmDescription": "Anomaly detected in production account",
  "AnomalyScore": 0.92,
  "Impact": {
    "TotalImpact": 2547.32,
    "MaxImpact": 2547.32
  },
  "RootCauses": [
    {
      "Service": "Amazon EC2",
      "Region": "us-east-1",
      "UsageType": "BoxUsage:c5.4xlarge"
    }
  ]
}
```

**2. Email Notifications**
- Individual anomaly emails (immediate)
- Daily/weekly digest emails (summary view)
- Customizable recipient lists per monitor

**3. AWS Chatbot Integration** (Slack, Microsoft Teams, Amazon Chime)
- Real-time anomaly alerts in team channels
- Interactive elements for "view in console" actions
- Team collaboration on anomaly investigation

**4. EventBridge Integration**
- Trigger Lambda functions for automated analysis
- Create ServiceNow/Jira tickets for tracking
- Invoke Step Functions for complex remediation workflows

### Root Cause Analysis

Cost Anomaly Detection automatically performs root cause analysis, identifying the top contributors to detected anomalies across four dimensions:

**Root Cause Dimensions:**
1. **AWS Service**: Which service caused the spike (e.g., Amazon EC2, AWS Lambda, Amazon S3)
2. **Linked Account**: Which account in your organization contributed most
3. **Region**: Geographic region where spending increased (e.g., us-east-1, ap-southeast-2)
4. **Usage Type**: Specific usage type driving costs (e.g., BoxUsage:m5.large, DataTransfer-Out-Bytes)

**Root Cause Prioritization**: Results ranked by dollar impact, showing largest contributors first.

**Example Root Cause Analysis:**
```
Anomaly: $3,200 unexpected spend
Root Causes:
  1. Amazon EC2 ($2,100) - 66% of anomaly
     - Region: us-west-2 ($1,800)
     - Usage Type: BoxUsage:c5.9xlarge ($1,500)
  2. Amazon RDS ($700) - 22% of anomaly
     - Region: us-west-2 ($700)
     - Usage Type: InstanceUsage:db.r5.4xlarge ($700)
  3. Data Transfer ($400) - 12% of anomaly
     - Region: us-west-2 to Internet ($400)
```

### Real-World Use Cases and Scenarios

**1. Security Breach Detection**
- **Scenario**: Compromised AWS credentials used to launch crypto-mining instances
- **Anomaly**: Sudden spike in EC2 g4dn.xlarge GPU instances in unfamiliar regions
- **Response**: Automated Lambda function to snapshot instances for forensics, then terminate
- **Prevention**: Implement SCPs limiting instance types and regions

**2. Configuration Error Detection**
- **Scenario**: Engineer accidentally enables verbose CloudWatch logging on production fleet
- **Anomaly**: CloudWatch Logs spend increases 500% from $200/day to $1,200/day
- **Response**: Alert triggers investigation, verbose logging disabled within hours
- **Savings**: Prevents $30,000 monthly waste

**3. Data Transfer Anomaly**
- **Scenario**: CDN misconfiguration causes origin fetches to bypass CloudFront caching
- **Anomaly**: Data transfer out from EC2 to internet increases 10x
- **Response**: CloudFront cache configuration corrected
- **Impact**: Prevents $50,000 monthly data transfer charges

**4. Unintended Auto Scaling**
- **Scenario**: Auto Scaling policy misconfigured with typo in metric threshold
- **Anomaly**: EC2 fleet scales from 20 to 200 instances
- **Response**: Alert triggers immediate investigation and scaling policy correction
- **Impact**: Prevents $20,000 daily overspend

### Integration with Cost Optimization Workflow

**Combined Strategy:**
```
Daily Cost Governance Workflow
│
├─ Cost Anomaly Detection (reactive, real-time alerts)
│  └─ Detects: Unexpected spikes, misconfigurations, security issues
│
├─ Trusted Advisor (weekly checks)
│  └─ Detects: Idle resources, low utilization, optimization opportunities
│
├─ Compute Optimizer (monthly review)
│  └─ Recommends: Rightsizing based on ML analysis
│
└─ Cost Explorer (quarterly deep-dive)
   └─ Analyzes: Trends, forecasts, Reserved Instance/Savings Plans optimization
```

**Exam Tip**: Cost Anomaly Detection is for unexpected changes, Trusted Advisor is for known optimization patterns, Compute Optimizer is for ML-based rightsizing.

### Limitations and Considerations

**1. Not Available for Billing Transfer Accounts**
- Billing transfer feature used by resellers and managed service providers
- Anomaly detection incompatible with this billing model

**2. 10-Day Minimum History Requirement**
- New services require 10 days of usage before anomaly detection activates
- Prevents false positives during initial service adoption

**3. 24-Hour Detection Delay**
- Inherits Cost Explorer data latency
- Cannot prevent ongoing resource creation, only alerts after occurrence
- For real-time prevention, use AWS Budgets with SNS alerts triggering Lambda

**4. Opt-Out Available**
- Can be disabled at any time
- Historical data retained for analysis

**AWS Documentation:**
- [AWS Cost Anomaly Detection User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [Cost Anomaly Detection Best Practices](https://docs.aws.amazon.com/cost-management/latest/userguide/ad-best-practices.html)
- [Setting Up Cost Monitors](https://docs.aws.amazon.com/cost-management/latest/userguide/ad-cost-monitors.html)

## Exam Tips - Critical Points for SAP-C02

**Tool Selection and Access:**
- **Trusted Advisor**: Requires Business Support+ or Enterprise Support for full cost optimization checks. Basic/Developer support only includes 7 core checks (no cost optimization).
- **Compute Optimizer**: Requires explicit opt-in per account or via AWS Organizations management account. Not enabled by default.
- **Cost Explorer rightsizing**: Available to all accounts, but AWS now recommends Cost Optimization Hub for comprehensive recommendations.
- **Cost Anomaly Detection**: Enabled by default, but requires 10 days of historical data before first anomaly detection.

**Metrics and Analysis:**
- **Memory metrics**: NOT default CloudWatch metrics for EC2. Requires CloudWatch agent installation for both Compute Optimizer and manual analysis.
- **Compute Optimizer lookback**: 14 days standard (free), 93 days with Enhanced Infrastructure Metrics (paid feature).
- **Trusted Advisor analysis**: Fixed 14-day window, threshold-based (e.g., <10% CPU).
- **Cost Anomaly Detection latency**: 24-hour delay inheriting from Cost Explorer data refresh. Not real-time.

**Storage Optimization:**
- **GP3 vs GP2**: GP3 is 20% cheaper for same capacity, provides 3,000 IOPS baseline regardless of size. Almost always correct answer for general-purpose workloads.
- **S3 Intelligent-Tiering**: Has monitoring fee ($0.0025 per 1,000 objects), but zero retrieval fees. Best for unpredictable access patterns.
- **Minimum object size**: Intelligent-Tiering minimum 128 KB billable size. Minimum 30-day storage duration.
- **Glacier Deep Archive**: Lowest cost ($0.00099/GB-month), but 12-hour retrieval minimum. For compliance archives (7-10 years).

**Commitment-Based Pricing:**
- **Savings Plans flexibility**: Compute Savings Plans (most flexible, up to 66% savings), EC2 Instance Savings Plans (family-locked, up to 72% savings).
- **Reserved Instance flexibility**: Regional RIs provide instance size flexibility within family. Zonal RIs provide capacity reservation.
- **Standard vs Convertible RIs**: Standard RIs up to 72% savings (no family changes), Convertible RIs up to 54% savings (can exchange families).
- **Payment options impact savings**: All Upfront (maximum discount), Partial Upfront (moderate), No Upfront (lowest discount but no CapEx).

**Tagging and Cost Allocation:**
- **Tag activation**: NOT retroactive. Tags only appear in Cost Explorer for usage after activation (24-48 hour delay).
- **AWS-generated tags**: Prefix `aws:` (e.g., `aws:cloudformation:stack-name`). Cannot be modified by users.
- **Tag policies**: Enforce at AWS Organizations level. Can prevent resource creation without required tags (using SCPs).
- **Cost Categories**: Support nested hierarchies and rule-based assignment beyond simple tags. Ideal for chargeback/showback.

**Multi-Account and Organizations:**
- **Savings Plans sharing**: Automatically shared across consolidated billing family unless explicitly disabled.
- **Compute Optimizer cross-account**: Management account can view recommendations for all member accounts.
- **Trusted Advisor aggregation**: View aggregated checks across organization from management account (Business+/Enterprise only).

**Common Traps and Gotchas:**
- **EIP charges**: Unassociated EIPs are charged even when instance is stopped. Free only when associated with running instance.
- **NAT Gateway costs**: $0.045/hour (~$32/month) even with zero traffic. Plus data processing charges.
- **Fast Snapshot Restore**: Expensive ($0.75/DSU-hour). Only enable for critical production volumes.
- **CloudWatch Logs retention**: Default indefinite retention. Set expiration policies to control costs.

## Common Exam Scenarios and Solutions

**Scenario 1: Rightsizing and Optimization**
- **Question**: "A company wants to identify EC2 instances that could be downsized based on historical usage patterns and ML analysis..."
- **Answer**: AWS Compute Optimizer (ML-based, 14-day or 93-day lookback, multiple resource types)
- **Distractor**: Trusted Advisor (threshold-based, simpler checks)
- **Distractor**: Cost Explorer rightsizing (basic, EC2-only, deprecated in favor of Cost Optimization Hub)

**Scenario 2: Cost Allocation and Chargeback**
- **Question**: "How should a company track costs by department across 50 AWS accounts and provide monthly chargeback reports..."
- **Answer**: Implement cost allocation tags (CostCenter, Department), activate tags in billing console, create Cost Categories for hierarchical organization, export Cost Explorer data per category
- **Key detail**: Tag activation required 24-48 hours before data appears
- **Advanced**: Use AWS Cost and Usage Reports (CUR) for detailed CSV exports

**Scenario 3: Storage Cost Optimization**
- **Question**: "Optimize storage costs for 500 TB of log data with unpredictable access patterns. Some logs accessed frequently for 7 days, then sporadically for 1 year..."
- **Answer**: S3 Intelligent-Tiering with lifecycle policy transitioning to Archive tiers after 90 days
- **Why not S3 Standard-IA**: Access patterns unpredictable (retrieval fees would be high)
- **Why not Glacier immediately**: Recent logs need millisecond access

**Scenario 4: Commitment Flexibility vs. Savings**
- **Question**: "Balance cost savings with flexibility for variable EC2 workload running mix of instance families across multiple regions..."
- **Answer**: Compute Savings Plans (flexible across families, sizes, regions, OSes; up to 66% savings)
- **Distractor**: EC2 Instance Savings Plans (locked to family and region, 72% savings but less flexible)
- **Distractor**: Standard RIs (lowest flexibility, locked to specific instance size)

**Scenario 5: Anomaly Detection and Security**
- **Question**: "Detect and alert on unusual spending patterns that might indicate compromised credentials or misconfigurations..."
- **Answer**: AWS Cost Anomaly Detection with account-level and service-level monitors, SNS notifications triggering automated investigation
- **Key detail**: 24-hour detection delay, not real-time prevention
- **Complementary**: AWS Budgets for threshold-based alerts (real-time prevention)

**Scenario 6: Multi-Tenant Cost Attribution**
- **Question**: "SaaS company needs to track infrastructure costs per customer for billing purposes across shared and dedicated resources..."
- **Answer**: Tag all resources with CustomerID, create Cost Category with rules per customer, use Cost Explorer API to extract monthly costs per category for invoicing
- **Advanced**: Combine with AWS Cost and Usage Reports for detailed usage data

**Scenario 7: Development Environment Cost Control**
- **Question**: "Reduce costs for development and testing environments that don't need to run 24/7..."
- **Answer**: Implement instance scheduler using EventBridge rules (start 8 AM weekdays, stop 6 PM), tag resources with AutoShutdown=true, Lambda function to stop/start based on tags
- **Additional**: Use Spot instances for fault-tolerant dev workloads (up to 90% savings)

**Scenario 8: Unused Resource Cleanup**
- **Question**: "Identify and remediate unused resources across organization with 100+ accounts..."
- **Answer**:
  - Trusted Advisor checks for idle resources (Business+ support required)
  - AWS Config rules (`ec2-volume-inuse-check`, `eip-attached`) for continuous compliance
  - EventBridge triggers Lambda for automated remediation with grace periods
  - Tag-based lifecycle policies (ExpirationDate tag for temporary resources)

**Scenario 9: Commitment Strategy**
- **Question**: "Company has stable baseline of 100 m5.large instances in us-east-1, plus variable workloads that burst to 150 instances..."
- **Answer**:
  - EC2 Instance Savings Plan for 60-70 instances (baseline coverage, 72% savings)
  - On-Demand for variable 30-50 instances (flexibility for bursting)
  - Consider Spot for additional 10-20% if fault-tolerant (90% savings)
- **Why not 100% commitment**: Leaves no room for growth or architecture changes

**Scenario 10: Cross-Region Cost Optimization**
- **Question**: "Application spans us-east-1 and eu-west-1. How to optimize costs while maintaining regional presence..."
- **Answer**: Compute Savings Plans (not locked to region, applies globally), review data transfer costs between regions (use VPC endpoints and PrivateLink where applicable), consider S3 Transfer Acceleration costs vs. CloudFront

## Additional Resources and Study Materials

**Core Documentation:**
- [AWS Well-Architected Framework - Cost Optimization Pillar](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html)
- [AWS Cost Management User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/what-is-costmanagement.html)
- [AWS Compute Optimizer User Guide](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [AWS Trusted Advisor User Guide](https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html)

**Service-Specific Guides:**
- [Amazon S3 Storage Classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [Amazon EBS Volume Types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html)
- [AWS Savings Plans User Guide](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [Amazon EC2 Reserved Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)

**Cost Management Tools:**
- [AWS Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [AWS Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html)
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)

**Whitepapers and Best Practices:**
- [Cost Optimization: EC2 Rightsizing Strategies](https://aws.amazon.com/aws-cost-management/aws-cost-optimization/)
- [Tagging Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)
- [AWS Organizations Best Practices](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices.html)
