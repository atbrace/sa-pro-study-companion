---
title: Cost Optimization for Existing Solutions
lastUpdated: 2026-01-05
---

# Cost Optimization for Existing Solutions

Cost optimization is a continuous process of analyzing and improving existing AWS solutions to reduce spend without compromising performance, reliability, or security. Professional-level architects must master multiple tools and strategies to identify and implement cost savings.

## AWS Trusted Advisor

AWS Trusted Advisor provides real-time guidance to help optimize your AWS environment across five categories, with cost optimization being critical for existing solutions.

### Cost Optimization Checks

**Business & Enterprise Support Plans include:**
- Low utilization Amazon EC2 instances
- Underutilized Amazon EBS volumes
- Idle load balancers
- Unassociated Elastic IP addresses
- Amazon RDS idle DB instances
- Amazon Route 53 latency resource record sets
- Savings Plan and Reserved Instance optimization recommendations

### Key Recommendations

1. **Idle Resources** - Identifies resources running with minimal usage
2. **Underutilized Instances** - Flags instances with low CPU/network utilization
3. **Optimization Opportunities** - Suggests Savings Plans or Reserved Instances
4. **Expired Reservations** - Alerts when Reserved Instances expire

**Best Practice**: Enable weekly email notifications for Trusted Advisor and integrate with EventBridge for automated remediation workflows.

## AWS Compute Optimizer

Compute Optimizer uses machine learning to analyze historical utilization metrics and provide right-sizing recommendations.

### Supported Resources

- Amazon EC2 instances
- Auto Scaling groups
- Amazon EBS volumes
- AWS Lambda functions
- Amazon ECS services on Fargate

### Recommendation Types

**EC2 Instance Recommendations:**
- **Optimized** - Right-sized for workload
- **Under-provisioned** - Increase capacity (performance risk)
- **Over-provisioned** - Decrease size (cost savings)

**Analysis Window:** 14 days of CloudWatch metrics by default

### Key Metrics Analyzed

- CPU utilization
- Memory utilization (requires CloudWatch agent)
- Network throughput
- EBS IOPS and throughput
- Lambda function duration and memory

**Professional Tip**: Enable Enhanced Infrastructure Metrics for 3-month lookback period to capture weekly/monthly patterns.

## AWS Cost Explorer

Cost Explorer provides visualization and analysis of AWS costs and usage over time.

### Core Capabilities

1. **Cost Visualization** - View costs by service, region, tag, or custom dimensions
2. **Forecasting** - Predict future costs based on historical trends
3. **Savings Plans Recommendations** - Analyze potential savings
4. **Reserved Instance Utilization** - Track RI coverage and utilization
5. **Cost Allocation Tags** - Group costs by business unit, project, or environment

### Advanced Filtering

Use Cost Categories to organize costs into meaningful groups:
```
Cost Category: Environment
├── Production (tag:env=prod)
├── Development (tag:env=dev)
└── Testing (tag:env=test)
```

### Rightsizing Recommendations

Cost Explorer provides rightsizing recommendations for EC2 instances based on:
- CloudWatch metrics (CPU, memory, network, disk)
- Minimum 14-day lookback period
- Conservative estimates (avoids performance degradation)

## Identifying Unused Resources

### Common Unused Resources

1. **Unattached EBS Volumes** - Volumes not attached to instances
2. **Idle Elastic Load Balancers** - Load balancers with no targets or traffic
3. **Unused Elastic IPs** - Unassociated EIPs incur charges
4. **Stale Snapshots** - Snapshots of deleted volumes or old backups
5. **Idle RDS Instances** - Database instances with no connections
6. **Orphaned Resources** - Resources from deleted CloudFormation stacks

### Detection Strategies

**Use AWS Config Rules:**
- `ec2-volume-inuse-check` - Detects unattached volumes
- `eip-attached` - Identifies unassociated Elastic IPs
- Custom rules for organization-specific criteria

**Tag-Based Lifecycle:**
```
Tags for resource tracking:
├── CreatedBy: [user/service]
├── Project: [project-name]
├── ExpirationDate: [YYYY-MM-DD]
└── CostCenter: [cost-center-id]
```

## Storage Optimization

### Amazon S3 Lifecycle Policies

**Transition Strategy:**
1. **S3 Standard** → S3 Intelligent-Tiering (30 days)
2. **S3 Intelligent-Tiering** → Glacier Flexible Retrieval (90 days)
3. **Glacier Flexible Retrieval** → Glacier Deep Archive (365 days)

**S3 Intelligent-Tiering Benefits:**
- Automatic tiering between frequent and infrequent access
- No retrieval fees
- Monitors access patterns
- Archive tiers for long-term storage

### EBS Volume Optimization

**GP3 vs GP2:**
- GP3 is 20% cheaper than GP2
- GP3 provides baseline 3,000 IOPS and 125 MB/s
- Independent scaling of IOPS and throughput
- Migration is seamless (live modification)

**Volume Right-Sizing:**
- Use CloudWatch metrics: `VolumeReadOps`, `VolumeWriteOps`
- Identify over-provisioned IOPS
- Consolidate small volumes
- Delete snapshots of deleted volumes

### Glacier Storage Classes

Choose based on retrieval requirements:
- **Glacier Instant Retrieval** - Millisecond access, 68% lower cost than S3 Standard
- **Glacier Flexible Retrieval** - Minutes to hours, 90% lower cost
- **Glacier Deep Archive** - 12 hours, lowest cost storage class

## Reserved Instances and Savings Plans

### Reserved Instance Analysis

**Key Metrics:**
1. **RI Utilization** - Percentage of purchased hours used
2. **RI Coverage** - Percentage of instance hours covered by RIs
3. **Target Coverage** - Aim for 70-80% (balance flexibility vs savings)

**Types of RIs:**
- **Standard RIs** - Up to 72% savings, no instance flexibility
- **Convertible RIs** - Up to 54% savings, can change instance family
- **Payment Options** - All Upfront, Partial Upfront, No Upfront

### Savings Plans

**Compute Savings Plans:**
- Apply to EC2, Fargate, Lambda
- Up to 66% savings
- Flexible across instance family, size, region, OS

**EC2 Instance Savings Plans:**
- Up to 72% savings
- Locked to instance family and region
- Flexible across size, OS, tenancy

**Recommendation Process:**
1. Analyze 7, 30, or 60 days of usage in Cost Explorer
2. Review commitment recommendations (1-year or 3-year)
3. Start with hourly commitment you can sustain
4. Monitor utilization monthly and adjust

**Professional Insight**: Combine Savings Plans (for baseline compute) with On-Demand Capacity Reservations (for compliance requirements).

## Cost Allocation and Tagging

### Tagging Strategy

**Required Tags:**
```yaml
CostCenter: Engineering|Marketing|Operations
Environment: Production|Staging|Development|Testing
Project: [project-identifier]
Owner: [team-email]
ApplicationID: [app-identifier]
```

### Cost Allocation Tags

1. **Activate Tags** - Enable in Cost Allocation Tags console
2. **Tag Enforcement** - Use AWS Organizations tag policies
3. **Tag Editor** - Bulk tag existing resources
4. **Tag Compliance** - Monitor with AWS Config

### Cost Categories

Create hierarchical cost groupings:
```
Business Unit
├── Engineering
│   ├── Platform Team
│   └── Product Team
├── Marketing
└── Operations
```

## Cost Anomaly Detection

AWS Cost Anomaly Detection uses machine learning to identify unusual spending patterns.

### Configuration

1. **Cost Monitor** - Define scope (service, account, tag)
2. **Alert Threshold** - Set minimum anomaly amount
3. **Notification** - SNS topic or email
4. **Evaluation Frequency** - Daily analysis

### Use Cases

- Detect unexpected resource provisioning
- Identify configuration changes causing cost spikes
- Alert on data transfer anomalies
- Monitor for compromised credentials creating resources

## Exam Tips

- Trusted Advisor requires Business or Enterprise Support for full cost checks
- Compute Optimizer requires opt-in and CloudWatch agent for memory metrics
- Cost Explorer rightsizing is separate from Compute Optimizer (both useful)
- S3 Intelligent-Tiering has monitoring fee but often saves more than it costs
- GP3 is almost always the right answer for general-purpose EBS volumes
- Savings Plans offer more flexibility than Reserved Instances
- Cost allocation tags must be activated before appearing in Cost Explorer
- Delete unattached EBS volumes and snapshots of deleted volumes

## Common Scenarios

**Question Type**: "A company wants to identify EC2 instances that could be downsized..."
**Answer**: Use AWS Compute Optimizer for ML-based rightsizing recommendations

**Question Type**: "How to track costs by department across multiple accounts..."
**Answer**: Implement cost allocation tags and activate them in billing console

**Question Type**: "Optimize storage costs for infrequently accessed data with unpredictable patterns..."
**Answer**: S3 Intelligent-Tiering automatically moves objects between tiers

**Question Type**: "Balance cost savings with flexibility for variable EC2 workload..."
**Answer**: Compute Savings Plans for flexible commitment across instance types

## Additional Resources

- [AWS Trusted Advisor Documentation](https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html)
- [AWS Compute Optimizer Documentation](https://docs.aws.amazon.com/compute-optimizer/latest/ug/)
- [AWS Cost Management User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/)
- [Cost Optimization Pillar - AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/)
- [AWS Cost Optimization Best Practices](https://aws.amazon.com/pricing/cost-optimization/)
