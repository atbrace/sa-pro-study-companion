---
title: Cost Optimization and Visibility
lastUpdated: 2026-01-05
---

# Cost Optimization and Visibility

Cost optimization in AWS requires understanding pricing models, implementing cost allocation strategies, using purchasing options effectively, and maintaining visibility into spending. This topic covers tools and strategies for managing costs in complex AWS environments.

## AWS Pricing Models

### On-Demand Instances

**Characteristics:**
- Pay by the hour or second
- No upfront commitment
- Highest per-hour cost
- Maximum flexibility

**Use Cases:**
- Unpredictable workloads
- Short-term workloads
- Development and testing
- Spiky traffic

### Reserved Instances (RIs)

**Types:**
1. **Standard RIs** - Highest discount (~75%), no flexibility
2. **Convertible RIs** - Lower discount (~54%), can change instance family
3. **Scheduled RIs** - Reserve for specific time windows

**Payment Options:**
- All Upfront - Highest discount
- Partial Upfront - Medium discount
- No Upfront - Lowest discount

**Scope:**
- Regional - Apply to any AZ in region
- Zonal - Apply to specific AZ, includes capacity reservation

> 📚 [Reserved Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)

### Savings Plans

**Compute Savings Plans:**
- Up to 66% discount
- Apply to EC2, Fargate, Lambda
- Flexible across instance families, sizes, regions, OS
- Commitment: $/hour for 1 or 3 years

**EC2 Instance Savings Plans:**
- Up to 72% discount
- Locked to instance family in a region
- Flexible across sizes, OS, tenancy

**Comparison:**

| Feature | RIs | Savings Plans |
|---------|-----|---------------|
| **Discount** | Up to 75% | Up to 72% |
| **Flexibility** | Limited | High (Compute) |
| **Services** | EC2 only | EC2, Fargate, Lambda |
| **Commitment** | Instance type | $/hour spend |
| **Best for** | Predictable workloads | Dynamic workloads |

> 📚 [Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/)

### Spot Instances

**Characteristics:**
- Up to 90% discount vs. On-Demand
- Can be interrupted with 2-minute warning
- Spot price fluctuates based on supply/demand

**Strategies:**
1. **Spot Fleets** - Mix of Spot and On-Demand
2. **Spot Block** - Uninterruptible for 1-6 hours (deprecated)
3. **Capacity-optimized** - Launch in pools with lowest interruption risk

**Use Cases:**
- Batch processing
- Data analysis
- CI/CD workloads
- Stateless web servers
- Container workloads with orchestration

**Not Suitable For:**
- Databases
- Long-running stateful applications
- Real-time processing

## Cost Allocation and Visibility

### Cost Allocation Tags

**AWS-Generated Tags:**
- aws:createdBy
- aws:cloudformation:stack-name
- aws:cloudformation:logical-id

**User-Defined Tags:**
- CostCenter
- Environment (prod/dev/test)
- Project
- Owner

**Best Practices:**
```
Required Tags for all resources:
- CostCenter: CC1001
- Environment: production
- Project: web-app-v2
- Owner: team-backend
```

**Activation:**
1. Apply tags to resources
2. Activate tags in Billing console
3. Wait 24 hours for tags to appear in Cost Explorer
4. Use tags for cost allocation reports

### Cost Explorer

Query and visualize costs with:
- Time range filters
- Service breakdown
- Tag-based filtering
- Forecasting
- Reserved Instance recommendations
- Savings Plans recommendations

**Example Queries:**
- "Show EC2 costs by Environment tag"
- "Forecast next 3 months S3 costs"
- "Compare this month vs. last month by service"

### Cost and Usage Reports (CUR)

Most detailed billing data:
- Hourly line items
- Resource-level details
- All tags included
- Delivered to S3
- Queryable with Athena

**Setup:**
1. Create S3 bucket
2. Enable CUR in Billing console
3. Configure Athena integration
4. Query with SQL

```sql
SELECT
  line_item_product_code,
  SUM(line_item_unblended_cost) as cost
FROM cur_table
WHERE month = '2025-01'
GROUP BY line_item_product_code
ORDER BY cost DESC
```

> 📚 [Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/)

## AWS Budgets

Create cost and usage budgets with alerts.

### Budget Types

1. **Cost Budget** - Track spending
2. **Usage Budget** - Track service usage (hours, GB)
3. **RI Utilization Budget** - Monitor RI usage percentage
4. **RI Coverage Budget** - Track percentage of usage covered by RIs
5. **Savings Plans Utilization** - Monitor SP usage
6. **Savings Plans Coverage** - Track SP coverage

**Alert Actions:**
- SNS notification
- Email to recipients
- ChatBot to Slack/Chime
- AWS Systems Manager action
- AWS Lambda function

**Example Budget:**
```yaml
Name: Monthly Production Budget
Amount: $50,000
Period: Monthly
Filters:
  - Tag: Environment = production
Alerts:
  - 80% actual: Email to finance team
  - 90% actual: SNS to ops team
  - 100% forecasted: Lambda to restrict non-essential resources
```

## Cost Optimization Strategies

### Right sizing

Use AWS Compute Optimizer recommendations:
- Analyzes CloudWatch metrics
- Recommends instance types
- Considers CPU, memory, network
- Estimates potential savings

**Process:**
1. Enable Compute Optimizer
2. Wait 14 days for data collection
3. Review recommendations
4. Test recommended instance types
5. Implement changes

### Storage Optimization

**S3 Storage Classes:**

| Class | Use Case | Retrieval | Cost |
|-------|----------|-----------|------|
| Standard | Frequent access | Immediate | $$$$ |
| Intelligent-Tiering | Unknown patterns | Automatic | $$$ |
| Standard-IA | Infrequent access | Immediate | $$ |
| One Zone-IA | Infrequent, non-critical | Immediate | $ |
| Glacier Instant | Archive, instant retrieval | Instant | $ |
| Glacier Flexible | Archive, minutes-hours | 1-12 hours | $ |
| Glacier Deep Archive | Long-term archive | 12-48 hours | ¢ |

**S3 Intelligent-Tiering:**
- Automatically moves objects between tiers
- No retrieval fees
- Small monthly monitoring fee
- Optimal for unknown access patterns

**S3 Lifecycle Policies:**
```json
{
  "Rules": [{
    "Id": "Archive-old-data",
    "Status": "Enabled",
    "Transitions": [
      {
        "Days": 90,
        "StorageClass": "STANDARD_IA"
      },
      {
        "Days": 180,
        "StorageClass": "GLACIER"
      },
      {
        "Days": 365,
        "StorageClass": "DEEP_ARCHIVE"
      }
    ]
  }]
}
```

**EBS Optimization:**
- gp3 vs. gp2: gp3 is ~20% cheaper with better performance
- Delete unattached volumes
- Delete old snapshots
- Use lifecycle policies for snapshots

### Network Cost Optimization

**Data Transfer Costs:**
- Inbound: Free
- Outbound to internet: $0.09/GB (first 10 TB)
- Cross-region: $0.02/GB
- Same region, different AZ: $0.01/GB
- Same AZ: Free

**Optimization Strategies:**
1. Use CloudFront for static content (cheaper than direct S3)
2. Keep compute and storage in same AZ when possible
3. Use VPC endpoints for S3/DynamoDB (no data transfer charges)
4. Use Direct Connect for large data transfers
5. Compress data before transfer

### Database Optimization

**RDS:**
- Use Reserved Instances for production
- Use Aurora Serverless for variable workloads
- Use read replicas instead of promoting instances
- Enable automated backups only when needed

**DynamoDB:**
- Use on-demand for unpredictable workloads
- Use provisioned capacity with Auto Scaling for predictable
- Enable point-in-time recovery selectively
- Use DynamoDB Standard-IA for infrequently accessed data

### Compute Optimization

**EC2:**
- Use Auto Scaling to match demand
- Use Savings Plans or RIs for baseline capacity
- Use Spot for flexible workloads
- Consider Graviton instances (ARM) - 40% better price/performance

**Lambda:**
- Optimize memory allocation (affects CPU and cost)
- Use ARM architecture (Graviton2) - 20% cheaper
- Set appropriate timeout values
- Use reserved concurrency only when needed

**Fargate:**
- Use Fargate Spot for fault-tolerant workloads
- Right-size CPU and memory
- Use Compute Savings Plans

## Cost Anomaly Detection

AWS service that uses machine learning to detect unusual spending.

**Features:**
- Automatically detects anomalies
- Root cause analysis
- SNS alerts
- Integrates with Cost Explorer

**Monitors:**
- Individual accounts
- Cost allocation tags
- Services

**Configuration:**
```
Monitor: Production Account Spending
Threshold: $1,000 increase
Frequency: Daily
Notification: SNS topic → Slack
```

> 📚 [Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)

## Consolidated Billing and Organizations

### Benefits

1. **Combined usage** - Higher volume discounts
2. **Shared RIs and Savings Plans** - Automatically shared
3. **Single payer** - One bill for all accounts
4. **Cost allocation** - Track by account or tags

### Billing Alerts

**Organization-Level:**
- Aggregate spending across accounts
- Alert on total organization spend

**Account-Level:**
- Individual account budgets
- Department/team accountability

## AWS Trusted Advisor

Provides cost optimization recommendations:

**Cost Optimization Checks (Free Tier):**
- Low utilization EC2 instances
- Unassociated Elastic IPs
- Idle RDS instances
- Underutilized EBS volumes

**Business/Enterprise Support:**
- All cost optimization checks
- RI and Savings Plans purchase recommendations
- API access for automation

## Cost Governance

### Tag Policies

Enforce tagging for cost allocation:
```json
{
  "tags": {
    "CostCenter": {
      "tag_key": {"@@assign": "CostCenter"},
      "enforced_for": {
        "@@assign": ["ec2:*", "rds:*", "s3:*"]
      }
    }
  }
}
```

### Service Control Policies for Cost

Prevent expensive actions:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": ["ec2:RunInstances"],
    "Resource": "*",
    "Condition": {
      "StringNotLike": {
        "ec2:InstanceType": ["t3.*", "t2.*"]
      }
    }
  }]
}
```

### Chargeback Models

**Showback:**
- Display costs per business unit
- No actual charges
- Educational and awareness

**Chargeback:**
- Actual billing to business units
- Based on tagged resources
- Formal cost allocation

## Exam Tips

1. **Savings Plans vs. RIs** - SPs more flexible, RIs slightly higher discount
2. **Compute Savings Plans** - Cover EC2, Fargate, Lambda across families/regions
3. **Spot Instances** - Up to 90% discount, can be interrupted
4. **S3 Intelligent-Tiering** - Best for unknown access patterns, no retrieval fees
5. **gp3 vs. gp2** - gp3 is cheaper and faster
6. **Data transfer costs** - Outbound and cross-region cost money
7. **VPC endpoints** - No data transfer charges for S3/DynamoDB
8. **CloudFront** - Cheaper for distribution than S3 direct
9. **Cost allocation tags** - Must be activated in billing console
10. **Consolidated billing** - Automatically shares RIs and SPs
11. **CUR** - Most detailed billing data, queryable with Athena
12. **Budgets** - Can trigger automated actions (SNS, Lambda, SSM)
13. **Compute Optimizer** - Requires 14 days of CloudWatch data
14. **Graviton** - 40% better price/performance for EC2, 20% cheaper for Lambda
15. **Cost Anomaly Detection** - ML-based unusual spending detection

## Common Scenarios

### Multi-Account Cost Allocation

```
Organization (Consolidated Billing)
├── Prod Account → CostCenter: CC1001
├── Dev Account → CostCenter: CC1002
└── Test Account → CostCenter: CC1003

Cost Explorer Query:
- Group by: Linked Account
- Filter by: Tag: CostCenter
- Time: Last 30 days
```

### Reserved Instance Strategy

```
Workload Analysis:
- Baseline: 20 instances always running
- Variable: 0-30 instances based on demand

Strategy:
- Purchase 20 Standard RIs (highest discount)
- Use Auto Scaling with On-Demand for variable
- Consider Savings Plans for flexibility
```

### S3 Storage Optimization

```
Data Lifecycle:
- 0-30 days: S3 Standard (frequent access)
- 31-90 days: S3 Standard-IA (infrequent)
- 91-365 days: S3 Glacier (archive)
- 365+ days: S3 Glacier Deep Archive (compliance)

Lifecycle Policy: Automatic transitions
Cost Savings: ~80% compared to all Standard
```

> 📚 [Cost Optimization Pillar](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/)
