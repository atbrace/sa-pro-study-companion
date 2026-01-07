---
title: Cost Optimization and Visibility
lastUpdated: 2026-01-06
---

# Cost Optimization and Visibility

Cost optimization in AWS is a continuous practice that balances cost reduction with performance, reliability, and business value. For enterprise organizations managing complex, multi-account AWS environments, effective cost optimization requires mastering pricing models, implementing robust cost allocation strategies, leveraging purchasing commitments strategically, and maintaining comprehensive visibility into spending patterns. This topic covers the tools, techniques, and architectural patterns essential for SAP-C02 certification and real-world cost management at scale.

A cost-optimized workload fully utilizes all resources, achieves business outcomes at the lowest possible price point, and meets functional requirements without compromise. Unlike traditional on-premises capacity planning, AWS cost optimization eliminates the need to predict capacity years in advance and enables dynamic resource management through pay-as-you-go models combined with commitment-based discounts.

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

Reserved Instances provide capacity reservations with significant discounts (up to 75% compared to On-Demand) in exchange for a commitment to a specific instance configuration for a one-year (31,536,000 seconds) or three-year (94,608,000 seconds) term. RIs are non-cancellable but can be modified or sold on the Reserved Instance Marketplace.

**Offering Classes:**

1. **Standard Reserved Instances**
   - **Discount:** Highest discount available (up to 75%)
   - **Flexibility:** Can only be modified (cannot be exchanged)
   - **Use Case:** Predictable, consistent workloads with stable instance family requirements
   - **Example:** A production database running 24/7 on m5.xlarge instances

2. **Convertible Reserved Instances**
   - **Discount:** Substantial but lower than Standard (up to 54%)
   - **Flexibility:** Can be exchanged for other Convertible RIs with different attributes
   - **Use Case:** Workloads that may require instance family changes during the commitment term
   - **Example:** Application tier that may migrate from compute-optimized to memory-optimized instances

**Payment Options (Highest to Lowest Discount):**

| Payment Option | Structure | Discount Level | Best For |
|---------------|-----------|----------------|----------|
| **All Upfront** | Full payment at term start; no hourly charges | Highest | Maximizing savings; predictable budgets |
| **Partial Upfront** | Upfront payment plus discounted hourly rate | Medium | Balancing savings and cash flow management |
| **No Upfront** | Discounted hourly rate (monthly billing) | Lowest | Flexibility; requires strong billing history |

**Scope Options:**

- **Regional RIs:** Apply to any Availability Zone within the purchased region; provide AZ flexibility but no capacity reservation
- **Zonal RIs:** Limited to a specific Availability Zone; include capacity reservation guarantee

**Key Pricing Determinants:**

Reserved Instance pricing depends on four attributes:
1. **Instance Type:** Family (e.g., m5) and size (e.g., xlarge)
2. **Region:** Where the RI is purchased
3. **Tenancy:** Shared (default) or Dedicated (single-tenant hardware)
4. **Platform:** Operating system (Linux/Unix, Windows, etc.)

**Important Considerations:**

- **Non-Renewable:** Upon expiration, instances automatically revert to On-Demand pricing
- **Continuous Billing:** You are charged according to the payment option regardless of whether the RI is actively used
- **Recommendation:** AWS recommends Savings Plans over RIs for most use cases due to superior flexibility

**AWS Documentation:**
- [Reserved Instances Overview](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)
- [Reserved Instance Pricing](https://aws.amazon.com/ec2/pricing/reserved-instances/pricing/)

### Savings Plans

Savings Plans offer savings beyond On-Demand rates (up to 72%) in exchange for a commitment to use a specified dollar amount of compute power per hour for a one-year or three-year period. Unlike Reserved Instances, Savings Plans commit to a dollar-per-hour spend rather than a specific instance configuration, providing significantly greater flexibility for dynamic workloads.

**Commitment Periods:**
- **One-Year:** 365 days (31,536,000 seconds)
- **Three-Year:** 1,095 days (94,608,000 seconds) - offers larger discount

**Savings Plans Types:**

1. **Compute Savings Plans**
   - **Discount:** Up to 66% compared to On-Demand
   - **Services:** Amazon EC2, AWS Fargate, AWS Lambda
   - **Flexibility:** Maximum flexibility - applies across:
     - Instance families (e.g., m5 to c5 to r5)
     - Instance sizes (e.g., large to xlarge)
     - Regions (e.g., us-east-1 to eu-west-1)
     - Operating systems (e.g., Linux to Windows)
     - Tenancy (shared to dedicated)
   - **Use Case:** Organizations with dynamic workloads, multi-service architectures, or unpredictable compute patterns
   - **Example:** A microservices platform using EC2, Fargate for containers, and Lambda for event processing

2. **EC2 Instance Savings Plans**
   - **Discount:** Up to 72% compared to On-Demand (highest Savings Plans discount)
   - **Services:** Amazon EC2 only
   - **Flexibility:** Locked to instance family within a specific region, but flexible across:
     - Instance sizes (e.g., m5.large to m5.4xlarge)
     - Operating systems
     - Tenancy
   - **Use Case:** Predictable EC2 workloads with known instance family requirements
   - **Example:** A database tier consistently using r5 memory-optimized instances

3. **SageMaker Savings Plans**
   - Apply to Amazon SageMaker instance usage
   - Flexible across instance families, sizes, components, and regions

**Payment Options (Same as RIs):**
- **All Upfront:** Pay entire commitment upfront for maximum discount
- **Partial Upfront:** Split payment approach
- **No Upfront:** Pay monthly while maintaining hourly commitment

**Savings Plans vs. Reserved Instances:**

| Feature | Reserved Instances | Compute Savings Plans | EC2 Instance Savings Plans |
|---------|-------------------|----------------------|---------------------------|
| **Max Discount** | Up to 75% | Up to 66% | Up to 72% |
| **Commitment Model** | Specific instance config | $/hour spend | $/hour spend |
| **Instance Family Flexibility** | No (Standard), Limited (Convertible) | Yes | No (locked to family) |
| **Region Flexibility** | No | Yes | No |
| **Service Coverage** | EC2 only | EC2, Fargate, Lambda | EC2 only |
| **Modifiable** | Yes | N/A | N/A |
| **Exchangeable** | Convertible only | N/A | N/A |
| **Best For** | Stable, predictable EC2 | Dynamic, multi-service | Predictable EC2 with known family |

**Management and Optimization:**

AWS Cost Explorer provides comprehensive Savings Plans management:
- Purchase recommendations based on historical usage
- Performance reporting and utilization tracking
- Budget alerts for commitment utilization
- Coverage analysis (percentage of usage covered by Savings Plans)

**Key Considerations:**

- **Stacking:** Savings Plans and Reserved Instances can coexist; AWS applies the most cost-effective discount automatically
- **Utilization Monitoring:** Track utilization in Cost Explorer to ensure commitments are fully used
- **Coverage Gaps:** On-Demand pricing applies to usage beyond Savings Plans commitments
- **AWS Recommendation:** Savings Plans are the preferred commitment model for most workloads due to superior flexibility

**AWS Documentation:**
- [Savings Plans User Guide](https://docs.aws.amazon.com/savingsplans/latest/userguide/)
- [Savings Plans vs. Reserved Instances](https://aws.amazon.com/savingsplans/faq/)
- [Savings Plans Pricing](https://aws.amazon.com/savingsplans/pricing/)

### Spot Instances

Spot Instances leverage spare EC2 capacity at significantly discounted rates (up to 90% compared to On-Demand pricing) but can be interrupted by AWS when capacity is needed elsewhere. The hourly Spot price is set by Amazon EC2 based on long-term supply and demand trends and adjusts gradually with price updates every 5 minutes.

**Pricing and Billing:**

- **Dynamic Pricing:** Spot prices vary by AWS Region and instance type
- **Billing:** Pay the Spot price for the duration instances run (charged per second or per hour depending on OS and interruption source)
- **Savings Plans Exclusion:** Spot spend does not apply toward Compute Savings Plans commitments

**Interruption Handling:**

AWS provides two mechanisms to manage interruptions gracefully:

1. **Two-Minute Warning:** Amazon EC2 sends a termination notice two minutes before interrupting a Spot Instance, allowing time for:
   - Graceful shutdown procedures
   - State persistence to durable storage
   - Workload migration to alternative instances

2. **EC2 Instance Rebalance Recommendation:** A proactive signal that alerts when a Spot Instance has elevated interruption risk, enabling:
   - Preemptive workload migration without waiting for termination
   - Higher availability through proactive capacity management
   - Reduced impact on application performance

**Spot Instance Request Types:**

- **One-Time Requests:** Single launch attempt; no automatic retry after interruption
- **Persistent Requests:** Automatically resubmitted after interruption to maintain desired capacity

**Allocation Strategies:**

1. **Capacity-Optimized:** Launch instances in Spot pools with the lowest risk of interruption based on real-time capacity availability
2. **Price-Optimized:** Launch instances from pools with the lowest current price
3. **Diversified:** Distribute instances across multiple Spot pools to reduce interruption impact

**Spot Fleets:**

A Spot Fleet is a collection of Spot Instances (and optionally On-Demand Instances) that enables:
- Mixed purchasing models for baseline capacity (On-Demand) plus burst capacity (Spot)
- Automatic replacement of interrupted instances
- Target capacity maintenance across multiple instance types and Availability Zones

**Best Use Cases:**

- **Batch Processing:** Hadoop, Spark, EMR workloads that can checkpoint progress
- **Data Analysis:** Large-scale analytics jobs that can resume from intermediate state
- **CI/CD Pipelines:** Build and test environments with fault tolerance
- **Containerized Workloads:** ECS, EKS with service orchestration and automatic replacement
- **High-Performance Computing:** Stateless compute-intensive simulations
- **Web Servers:** Stateless application tiers behind load balancers with Auto Scaling

**Not Suitable For:**

- Primary databases without read replicas
- Long-running stateful applications without checkpointing
- Real-time processing with strict SLA requirements
- Workloads requiring guaranteed availability
- Applications without fault-tolerance architecture

**Enterprise Scenario:**

A video encoding platform uses a hybrid approach:
- **On-Demand/Savings Plans (20%):** Baseline capacity for guaranteed throughput
- **Spot Instances (80%):** Burst capacity for cost optimization
- **Architecture:** Job queue with retry logic; interrupted jobs automatically requeue
- **Cost Savings:** 70% reduction in compute costs compared to all On-Demand

**AWS Documentation:**
- [Spot Instances Overview](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [Spot Instance Pricing](https://aws.amazon.com/ec2/spot/pricing/)
- [Spot Best Practices](https://aws.amazon.com/ec2/spot/getting-started/)

## Cost Allocation and Visibility

Effective cost visibility in complex AWS environments requires a comprehensive tagging strategy, proper tool configuration, and consistent reporting practices. Cost allocation tags enable organizations to track spending by business dimensions such as cost centers, projects, environments, and teams.

### Cost Allocation Tags

Cost allocation tags consist of a key-value pair applied to AWS resources to categorize costs for billing and reporting. Each tag key must be unique per resource and can only have one value. Tags can take up to 24 hours to appear in the Billing and Cost Management console after activation.

**Tag Types:**

| Aspect | AWS-Generated Tags | User-Defined Tags |
|--------|-------------------|-------------------|
| **Creator** | AWS or AWS Marketplace ISV | Organization defines and creates |
| **Prefix** | `aws:` | `user:` |
| **Examples** | `aws:createdBy`, `aws:cloudformation:stack-name` | `CostCenter`, `Environment`, `Project`, `Owner` |
| **Activation** | Must activate separately in Billing console | Must activate separately in Billing console |
| **Management** | Automatic generation by AWS | Manual via Tag Editor, API, or console |

**Common AWS-Generated Tags:**
- `aws:createdBy` - Tracks which IAM principal created the resource
- `aws:cloudformation:stack-name` - CloudFormation stack identifier
- `aws:cloudformation:logical-id` - Logical resource ID in template

**Enterprise Tagging Strategy:**

Define a consistent taxonomy aligned with your organization structure:

```yaml
Required Tags (Mandatory for all resources):
  CostCenter: CC-1001              # Finance allocation
  Environment: production          # Lifecycle stage
  Project: customer-portal-v2      # Business initiative
  Owner: team-platform-eng         # Responsible team

Optional Tags (Context-specific):
  Application: web-api             # Application component
  Compliance: pci-dss              # Regulatory requirements
  BackupPolicy: daily              # Operational requirements
  DataClassification: confidential # Security requirements
```

**Best Practices for Tagging:**

1. **Security:** Do not include sensitive information in tags (PII, credentials, secrets) - tags are visible across billing reports and Cost Explorer
2. **Standardization:** Enforce consistent tag keys and values through AWS Organizations tag policies
3. **Completeness:** Tag all billable resources at creation time; retroactive tagging is possible but creates historical gaps
4. **Governance:** Use tag policies to enforce required tags on specific resource types
5. **Automation:** Implement tagging in Infrastructure as Code (CloudFormation, CDK, Terraform)

**Activation Process:**

1. **Define Taxonomy:** Establish organizational tagging standards
2. **Apply Tags:** Use Tag Editor, AWS CLI, SDKs, or IaC to tag resources
3. **Activate in Billing Console:** Enable cost allocation tags in the management account
4. **Propagation Wait:** Allow up to 24 hours for tags to appear in Cost Explorer and reports
5. **Validation:** Verify tag coverage using AWS Config Rules or custom scripts

**Access Control:**

Tag management permissions vary by account type:
- **Management Account:** Full access to cost allocation tags manager
- **Single Accounts:** Full access (if not part of an organization)
- **Member Accounts:** Cannot access cost allocation tags manager
- **Bill Source Accounts:** Can manage tags for billing transfer scenarios

**Reporting Integration:**

Cost allocation tags enable filtering and grouping in:
- **Cost Explorer:** Interactive visual analysis
- **Cost Allocation Reports:** CSV exports with usage grouped by tags
- **AWS Cost and Usage Reports:** Detailed line-item data with all tags
- **AWS Budgets:** Tag-filtered budget creation
- **Third-party Tools:** Integration via Cost Explorer API

**AWS Documentation:**
- [Cost Allocation Tags Overview](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)
- [Using AWS Tag Editor](https://docs.aws.amazon.com/tag-editor/latest/userguide/tag-editor.html)
- [Tag Policies in Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html)

### Cost Explorer

AWS Cost Explorer is a visual analytics tool that enables you to view, analyze, and forecast AWS costs and usage over time. It provides up to 13 months of historical data and can predict spending for the next 18 months based on usage trends.

**Core Capabilities:**

| Feature | Description |
|---------|-------------|
| **Historical Analysis** | Access up to 13 months of historical cost and usage data |
| **Forecasting** | Predict spending for the next 18 months using ML-based models |
| **Data Granularity** | Daily or monthly cost breakdowns |
| **Filtering** | Filter by service, linked account, region, tag, charge type, and more |
| **Grouping** | Group costs by multiple dimensions (service, account, tag, instance type) |
| **Visualization** | Main graph with preconfigured views (bar charts, line charts, stacked area) |
| **CSV Export** | Download detailed cost data for offline analysis |
| **API Access** | Programmatic access via Cost Explorer API ($0.01 per paginated request) |

**Key Features:**

1. **Cost Trend Identification:** Identify which services are driving cost increases over time
2. **Anomaly Detection:** Spot unusual spending patterns visually
3. **Comparative Analysis:** Compare costs between time periods (month-over-month, year-over-year)
4. **Reserved Instance Recommendations:** Receive purchase recommendations based on usage patterns
5. **Savings Plans Recommendations:** Get commitment recommendations to maximize savings
6. **Rightsizing Recommendations:** Identify underutilized resources (requires Compute Optimizer integration)

**Setup and Access:**

- **Initial Setup:** Approximately 24 hours for current month data; a few days for full 13-month historical data
- **Data Refresh:** Minimum 24-hour refresh cycle (may be longer depending on upstream billing data)
- **UI Access:** Free of charge through AWS Management Console
- **API Access:** $0.01 per paginated request
- **Important:** Cost Explorer cannot be disabled after enablement

**Common Analysis Scenarios:**

1. **Service Cost Breakdown:**
   - Group by: Service
   - Filter: Last 6 months
   - Use Case: Identify which AWS services consume the most budget

2. **Environment-Based Cost Tracking:**
   - Group by: Tag (Environment)
   - Filter: Cost allocation tag = production, development, staging
   - Use Case: Allocate costs to different lifecycle environments

3. **Multi-Account Cost Allocation:**
   - Group by: Linked Account
   - Filter: Specific cost allocation tags (e.g., CostCenter)
   - Use Case: Track spending per business unit in an AWS Organization

4. **Cost Forecasting:**
   - Select: Next 3 months
   - Forecast: Based on historical trends
   - Use Case: Budget planning and capacity planning

5. **Reserved Instance Utilization:**
   - Report: RI Utilization
   - Threshold: < 80% utilization indicates underutilized commitments
   - Use Case: Optimize RI purchases or modify existing reservations

**Advanced Filtering:**

Cost Explorer supports filtering by:
- **Time Period:** Custom date ranges, month-to-date, year-to-date
- **Services:** Individual AWS services or service families
- **Linked Accounts:** Specific accounts within an AWS Organization
- **Regions:** Geographic regions
- **Availability Zones:** Specific AZs
- **Instance Types:** EC2 instance families and sizes
- **Tags:** Cost allocation tags (user-defined and AWS-generated)
- **Charge Types:** Usage, tax, support fees, credits, refunds
- **Purchase Options:** On-Demand, Reserved Instances, Savings Plans, Spot

**Enterprise Use Case:**

A global SaaS company uses Cost Explorer to:
- Monitor daily spending trends across 50 AWS accounts
- Forecast quarterly costs for budget planning
- Identify cost anomalies (sudden spikes in specific services)
- Generate monthly cost reports filtered by project tags for chargeback
- Optimize Reserved Instance coverage by analyzing usage patterns

**Integration with Other Services:**

- **AWS Budgets:** Use Cost Explorer data to create budget alerts
- **Cost Anomaly Detection:** Leverages Cost Explorer billing data
- **AWS Organizations:** Consolidated billing view across member accounts
- **Cost and Usage Reports:** Uses the same underlying dataset

**AWS Documentation:**
- [Cost Explorer User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [Cost Explorer API Reference](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_Operations_AWS_Cost_Explorer_Service.html)

### Cost and Usage Reports (CUR)

AWS Cost and Usage Reports provide the most comprehensive, granular billing data available in AWS. CUR contains detailed line items for each unique combination of AWS products, usage types, and operations, making it ideal for advanced cost analysis, chargeback/showback implementations, and custom billing integrations.

**Report Structure and Format:**

- **File Format:** CSV files stored in Amazon S3 bucket
- **File Organization:** Single file for small reports; multiple files for reports exceeding approximately 1 million rows
- **Manifest File:** Included with each report delivery to track file locations
- **Refund Handling:** Refunds generated into separate files for clear reconciliation

**Data Granularity Options:**

| Granularity | Description | Use Case |
|-------------|-------------|----------|
| **Hourly** | Most granular billing data | Detailed usage pattern analysis, real-time cost tracking |
| **Daily** | Mid-range aggregation | Daily cost monitoring, trend analysis |
| **Monthly** | Highest level aggregation | Monthly financial reporting, budget comparisons |

**Report Column Structure:**

All CUR reports include these column prefixes:
- `identity/*` - Account and organization identification
- `bill/*` - Invoice and billing period details
- `lineItem/*` - Individual line item data (product, usage type, operation, cost)

**Conditional Columns (populated only when applicable):**
- `savingsPlan/*` - Included only if Savings Plans were used during the billing period
- `reservation/*` - Included only if Reserved Instances were active
- `discount/*` - Applied discounts and credits
- `pricing/*` - Pricing details for the line item
- `product/*` - Product-specific attributes
- `resourceTags/*` - Cost allocation tags

**Update Frequency and Timeline:**

| Aspect | Details |
|--------|---------|
| **Initial Delivery** | Up to 24 hours after report creation |
| **Update Frequency** | Up to 3 times per day (minimum once daily) |
| **Report Type** | Cumulative (each update includes all month-to-date data) |
| **Finalization** | After invoice issued; may receive additional updates for refunds/credits |
| **Data Latency** | Reflects actual usage with up to 24-hour delay |

**Integration with Analytics Services:**

1. **Amazon Athena Integration:**
   - Query CUR data directly with SQL
   - Serverless, pay-per-query pricing model
   - Supports complex joins and aggregations
   - Ideal for ad-hoc analysis and custom reporting

2. **Amazon Redshift:**
   - Load CUR data for data warehouse integration
   - Combine billing data with business intelligence platforms
   - Supports large-scale analytical queries

3. **Amazon QuickSight:**
   - Create interactive dashboards and visualizations
   - Build executive-level cost reports
   - Share insights across teams

**Setup Process:**

1. **Create S3 Bucket:** Dedicated bucket for CUR delivery (enable versioning and lifecycle policies)
2. **Enable CUR:** Configure report in Billing and Cost Management console
3. **Configure Details:**
   - Report name and granularity (hourly/daily/monthly)
   - Enable resource IDs for detailed resource tracking
   - Enable data integration for Athena/Redshift/QuickSight
4. **Set Up Athena:** Use AWS-provided CloudFormation template or manually create Athena table
5. **Query Data:** Use SQL to analyze costs

**Example Athena Queries:**

**Query 1: Top 10 Services by Cost**
```sql
SELECT
  line_item_product_code AS service,
  SUM(line_item_unblended_cost) AS total_cost
FROM cur_table
WHERE line_item_line_item_type = 'Usage'
  AND year = '2026'
  AND month = '01'
GROUP BY line_item_product_code
ORDER BY total_cost DESC
LIMIT 10;
```

**Query 2: Cost by Environment Tag**
```sql
SELECT
  resource_tags_user_environment AS environment,
  SUM(line_item_unblended_cost) AS total_cost
FROM cur_table
WHERE resource_tags_user_environment IS NOT NULL
  AND year = '2026'
  AND month = '01'
GROUP BY resource_tags_user_environment
ORDER BY total_cost DESC;
```

**Query 3: Savings Plans Coverage Analysis**
```sql
SELECT
  line_item_product_code,
  SUM(CASE WHEN savings_plan_savings_plan_a_r_n IS NOT NULL
           THEN line_item_usage_amount ELSE 0 END) AS covered_usage,
  SUM(line_item_usage_amount) AS total_usage,
  ROUND(100.0 * SUM(CASE WHEN savings_plan_savings_plan_a_r_n IS NOT NULL
                         THEN line_item_usage_amount ELSE 0 END)
        / SUM(line_item_usage_amount), 2) AS coverage_percentage
FROM cur_table
WHERE line_item_product_code IN ('AmazonEC2', 'AWSLambda', 'AmazonECS')
  AND year = '2026'
  AND month = '01'
GROUP BY line_item_product_code;
```

**Enterprise Use Cases:**

1. **Detailed Chargeback:** Allocate costs to business units based on resource tags with hourly precision
2. **Anomaly Detection:** Identify unusual spending patterns by analyzing hourly usage spikes
3. **RI/Savings Plans Optimization:** Analyze coverage and utilization at resource level
4. **Custom Billing:** Build custom billing systems for internal departments or external customers
5. **Compliance Reporting:** Generate audit-ready cost reports with resource-level detail

**Cost Optimization Insights from CUR:**

- Identify untagged resources consuming budget
- Detect idle or underutilized resources
- Analyze data transfer costs between regions and services
- Track reserved capacity utilization vs. On-Demand usage
- Monitor Spot Instance interruptions and cost savings

**Best Practices:**

1. **Enable Resource IDs:** Provides granular resource-level tracking
2. **Use Compression:** CUR supports GZIP compression to reduce S3 storage costs
3. **Partition by Date:** Athena queries perform better with date-based partitioning
4. **Lifecycle Policies:** Archive old CUR files to S3 Glacier after 90-180 days
5. **Automate Analysis:** Use AWS Lambda to trigger Athena queries and send reports via SNS/SES

**AWS Documentation:**
- [Cost and Usage Reports User Guide](https://docs.aws.amazon.com/cur/latest/userguide/)
- [Querying CUR with Athena](https://docs.aws.amazon.com/cur/latest/userguide/cur-query-athena.html)
- [CUR Data Dictionary](https://docs.aws.amazon.com/cur/latest/userguide/data-dictionary.html)

## AWS Budgets

AWS Budgets enables you to set custom cost and usage budgets with configurable alerts and automated actions when thresholds are exceeded or forecasted to be exceeded. Budgets provide proactive cost control and can trigger automated responses to prevent overspending.

### Budget Types

AWS Budgets supports six primary budget types:

| Budget Type | Purpose | Threshold Metric | Common Use Case |
|------------|---------|------------------|-----------------|
| **Cost Budget** | Monitor spending | Dollar amount | Track monthly departmental spending limits |
| **Usage Budget** | Track service usage | Usage units (hours, GB, requests) | Monitor EC2 instance hours or S3 storage GB |
| **RI Utilization Budget** | Monitor Reserved Instance usage | Utilization percentage | Ensure RIs are used efficiently (target: >80%) |
| **RI Coverage Budget** | Track RI coverage | Coverage percentage | Optimize RI purchases based on workload coverage |
| **Savings Plans Utilization** | Monitor Savings Plans usage | Utilization percentage | Ensure Savings Plans commitments are fully used |
| **Savings Plans Coverage** | Track Savings Plans coverage | Coverage percentage | Identify opportunities for additional Savings Plans |

### Alert Mechanisms

AWS Budgets offers flexible, multi-channel notification options:

**Alert Types:**
1. **Actual Alerts:** Triggered when actual spending or usage crosses the threshold (post-accrual)
2. **Forecasted Alerts:** Triggered when AWS predicts spending will exceed the threshold (pre-accrual, proactive)

**Notification Channels:**
- **Amazon SNS Topics:** Integrate with downstream systems, Lambda functions, or monitoring tools
- **Email Addresses:** Direct email notification to stakeholders (up to 10 email subscribers per budget)
- **AWS Chatbot:** Send alerts to Slack channels or Amazon Chime chat rooms
- **Both SNS and Email:** Simultaneous notification through multiple channels

**Update Frequency:** Budget information updates up to 3 times daily (typically 8-12 hours apart)

**Important Limitation:** There can be delays between resource usage and billing/notifications, potentially allowing spending to exceed budget thresholds before alerts trigger

### Automated Actions

Budget Actions enable automated responses when thresholds are crossed:

| Action Type | Capability | Example Use Case |
|------------|-----------|------------------|
| **Apply IAM Policy** | Attach custom IAM policy to users/roles | Deny new EC2 launches when budget exceeds 90% |
| **Apply SCP** | Apply Service Control Policy at OU level | Prevent specific service usage organization-wide |
| **Target EC2/RDS Instances** | Stop specific instances automatically | Stop development instances when monthly budget hit |

**Execution Requirements:**
- Requires IAM role with appropriate permissions
- Can execute on actual or forecasted thresholds
- Supports approval workflows before execution
- Audit trail via AWS CloudTrail

### Cost Tracking Capabilities

AWS Budgets provides granular cost tracking options:

**Cost Types:**
- **Blended Costs:** Averaged rates across consolidated billing accounts
- **Unblended Costs:** Actual rates paid per account
- **Net Unblended Costs:** Unblended costs minus credits
- **Amortized Costs:** RI and Savings Plans costs distributed over time
- **Net Amortized Costs:** Amortized costs minus credits

**Filters and Scope:**
- Include/exclude: Discounts, refunds, support fees, taxes, credits
- Filter by: Linked accounts, services, tags, regions, instance types, purchase options
- Custom time periods: Align with fiscal years, project timelines, or grant periods

### Enterprise Budget Examples

**Example 1: Monthly Production Environment Budget**
```yaml
Budget Name: Production Environment Monthly
Type: Cost Budget
Amount: $50,000
Period: Monthly (calendar month)
Scope:
  Filter: Tag "Environment" = "production"
  Cost Type: Unblended costs (exclude credits/refunds)
Alerts:
  - Threshold: 75% actual
    Action: Email to DevOps team
  - Threshold: 85% actual
    Action: SNS to finance team + Slack notification
  - Threshold: 90% forecasted
    Action: Email to VP Engineering + flag for review
  - Threshold: 100% actual
    Action: Apply IAM policy denying new resource creation (with approval)
```

**Example 2: Reserved Instance Utilization Budget**
```yaml
Budget Name: EC2 RI Utilization Monitoring
Type: RI Utilization Budget
Target: 85% utilization
Period: Monthly
Scope:
  Services: Amazon EC2
  Instance Families: m5, c5, r5
Alerts:
  - Threshold: Below 80% utilization
    Action: Email to FinOps team + generate optimization report
```

**Example 3: Development Team Quarterly Budget**
```yaml
Budget Name: Platform Team Q1 Budget
Type: Cost Budget
Amount: $120,000
Period: Quarterly (Jan-Mar 2026)
Scope:
  Filter: Tag "Team" = "platform-engineering"
  Accounts: [dev-account-id, staging-account-id]
Alerts:
  - Threshold: 50% actual (mid-quarter check)
    Action: Email to team lead
  - Threshold: 90% forecasted
    Action: SNS + Lambda to generate detailed cost breakdown
  - Threshold: 100% actual
    Action: Stop all non-production EC2/RDS instances
```

**Example 4: Service-Specific Usage Budget**
```yaml
Budget Name: S3 Storage Usage Limit
Type: Usage Budget
Amount: 500 TB
Period: Monthly
Scope:
  Service: Amazon S3
  Filter: Tag "Project" = "data-lake"
Alerts:
  - Threshold: 80% actual
    Action: Email to data engineering team
  - Threshold: 95% actual
    Action: Trigger Lambda to analyze largest buckets and recommend lifecycle policies
```

### Integration with AWS Organizations

**Consolidated Billing Benefits:**
- **Management Account Control:** Create budgets for individual member accounts
- **Cross-Account Visibility:** Track spending across organizational units (with proper IAM permissions)
- **Role-Based Management:** Granular IAM permissions for budget creation, editing, deletion, and read access

**Organization-Level Budgets:**
- Track aggregate spending across all accounts
- Create budget templates for consistent policies across member accounts
- Central governance with distributed accountability

### Best Practices

1. **Layered Budgets:** Create budgets at multiple levels (organization, account, project, environment)
2. **Forecasted Alerts:** Use forecasted alerts (85-90% threshold) for proactive intervention before overspending
3. **Automated Actions:** Implement graduated responses (notify → warn → restrict → stop)
4. **Regular Review:** Adjust budget amounts quarterly based on business growth and historical trends
5. **Utilization Monitoring:** Set RI and Savings Plans utilization budgets to ensure commitments are fully leveraged
6. **Tag-Based Budgets:** Leverage cost allocation tags for granular project or team-based budgets

**AWS Documentation:**
- [AWS Budgets User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [Creating Budget Actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html)
- [Budget Best Practices](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html)

## Cost Optimization Strategies

### Rightsizing with AWS Compute Optimizer

Rightsizing is the process of matching instance types and sizes to workload performance and capacity requirements at the lowest possible cost. AWS Compute Optimizer uses machine learning to analyze historical utilization metrics and provide recommendations for optimal resource configurations.

**How Compute Optimizer Works:**

1. **Data Collection:**
   - Analyzes CloudWatch metrics (CPU, memory, network, disk I/O)
   - Default lookback period: 14 days of metric data
   - Enhanced Infrastructure Metrics (paid): 93-day lookback for more accurate patterns
   - Requires opt-in at account or organization level

2. **Metrics Analyzed:**
   - **CPU Utilization:** Identifies over-provisioned instances with low CPU usage
   - **Memory Utilization:** Requires CloudWatch agent or external metrics integration (Datadog, Dynatrace)
   - **Network I/O:** Network throughput patterns
   - **Disk Operations:** EBS read/write performance
   - **Resource Specifications:** vCPUs, memory, storage, network capacity

3. **Recommendation Types:**
   - **Underprovisioned:** Current instance too small; performance may be impacted
   - **Overprovisioned:** Current instance too large; cost optimization opportunity
   - **Optimized:** Current instance appropriately sized
   - **None:** Insufficient data for recommendation

**Supported Resources:**

- Amazon EC2 instances
- EC2 Auto Scaling groups
- Amazon EBS volumes
- AWS Lambda functions
- Amazon ECS services on Fargate
- Amazon RDS and Aurora databases

**Rightsizing Process:**

1. **Enable Compute Optimizer:**
   - Opt in via AWS Management Console or AWS Organizations (for all member accounts)
   - Grant necessary IAM permissions for CloudWatch metrics access

2. **Wait for Data Collection:**
   - Minimum 14 days for standard recommendations
   - 93 days for enhanced recommendations (requires Enhanced Infrastructure Metrics)
   - More data provides higher confidence recommendations

3. **Review Recommendations:**
   - Access via Compute Optimizer console or integrate with EC2/RDS consoles
   - Review top 3 recommendations per resource with projected savings
   - Analyze utilization graphs showing historical and projected usage patterns

4. **Evaluate Trade-offs:**
   - **Performance Risk:** Ensure recommended instance meets peak usage requirements
   - **Cost Savings:** Estimated monthly savings per recommendation
   - **Migration Effort:** Consider application compatibility and testing requirements

5. **Test in Non-Production:**
   - Implement recommendations in development/staging first
   - Monitor application performance under load
   - Validate CPU, memory, and network capacity

6. **Implement in Production:**
   - Use blue/green or canary deployment strategies
   - Monitor CloudWatch metrics post-migration
   - Rollback plan if performance degrades

**Rightsizing Preferences:**

Customize Compute Optimizer recommendations with:
- **CPU Utilization Headroom:** Target CPU utilization threshold (e.g., max 70% to allow burst capacity)
- **Memory Utilization Preferences:** Set memory usage targets
- **Instance Family Preferences:** Limit recommendations to specific families (e.g., current generation only)
- **Look-Back Period:** Use enhanced metrics for seasonal workloads

**Enterprise Scenario:**

A financial services company used Compute Optimizer to:
- Analyze 500 EC2 instances across production and staging environments
- Identified 40% of instances as overprovisioned (average CPU <20%)
- Rightsized 200 instances to smaller types (e.g., m5.2xlarge → m5.xlarge)
- Result: $180,000 annual savings with no performance impact
- Additional benefit: Reduced carbon footprint aligned with sustainability goals

**Integration with Cost Management:**

- **Export Recommendations:** Download CSV reports for tracking and approval workflows
- **API Access:** Programmatic access for automation and integration with ITSM tools
- **Multi-Account View:** Organization-level dashboards for centralized visibility
- **Cost Explorer Integration:** Compare actual savings vs. projected savings

**Best Practices:**

1. **Continuous Optimization:** Review recommendations quarterly as workload patterns evolve
2. **Memory Metrics:** Install CloudWatch agent to capture memory utilization for accurate sizing
3. **Seasonal Workloads:** Use 93-day lookback to capture quarterly or seasonal patterns
4. **Auto Scaling Integration:** Rightsize base capacity; let Auto Scaling handle peak demand
5. **Graviton Instances:** Consider AWS Graviton (ARM-based) instances for 40% better price-performance

**AWS Documentation:**
- [AWS Compute Optimizer User Guide](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [Compute Optimizer API Reference](https://docs.aws.amazon.com/compute-optimizer/latest/APIReference/Welcome.html)
- [Best Practices for Rightsizing](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/rightsizing.html)

### Storage Optimization

Storage costs represent a significant portion of AWS spending. Optimizing storage requires selecting appropriate storage classes, implementing lifecycle policies, and eliminating unused resources.

#### Amazon S3 Storage Classes

S3 offers multiple storage classes optimized for different access patterns, durability, and availability requirements:

| Storage Class | Availability | Durability | AZs | Min Duration | Min Size | Retrieval | Use Case |
|--------------|--------------|-----------|-----|--------------|----------|-----------|----------|
| **S3 Standard** | 99.99% | 11 9's | ≥3 | None | None | Immediate, free | Frequently accessed data |
| **S3 Intelligent-Tiering** | 99.9% | 11 9's | ≥3 | None | 128 KB* | Automatic, no fees | Unknown or changing access patterns |
| **S3 Standard-IA** | 99.9% | 11 9's | ≥3 | 30 days | 128 KB | Immediate, per-GB fee | Infrequent access, primary copy |
| **S3 One Zone-IA** | 99.5% | 11 9's | 1 | 30 days | 128 KB | Immediate, per-GB fee | Infrequent access, recreatable data |
| **S3 Glacier Instant Retrieval** | 99.9%** | 11 9's | ≥3 | 90 days | 128 KB | Milliseconds, per-GB fee | Archive accessed quarterly |
| **S3 Glacier Flexible Retrieval** | 99.99%** | 11 9's | ≥3 | 90 days | 40 KB overhead | 1-12 hours, tiered pricing | Archive accessed annually |
| **S3 Glacier Deep Archive** | 99.99%** | 11 9's | ≥3 | 180 days | 40 KB overhead | 12-48 hours, tiered pricing | Long-term compliance archives |
| **S3 Express One Zone** | 99.95% | 11 9's | 1 | None | None | Single-digit ms, 50% lower requests | High-performance, single-region |

*Objects < 128 KB in Intelligent-Tiering remain in Frequent Access tier
**After restoration

**S3 Intelligent-Tiering Deep Dive:**

Intelligent-Tiering automatically optimizes costs by moving objects between access tiers based on usage patterns:

**Automatic Tiers (no configuration required):**
1. **Frequent Access (0-30 days):** Default tier for newly uploaded objects
2. **Infrequent Access (30+ days):** Auto-transition after 30 consecutive days without access
3. **Archive Instant Access (90+ days):** Auto-transition after 90 consecutive days without access

**Optional Archive Tiers (requires activation):**
4. **Archive Access (90-180+ days):** Configurable threshold; minute-to-hour retrieval
5. **Deep Archive Access (180-365+ days):** Configurable threshold; hour+ retrieval

**Key Advantages:**
- **No Retrieval Fees:** Unlike Standard-IA or Glacier classes, accessing objects has no per-GB retrieval charges
- **No Minimum Storage Duration:** Can delete objects anytime without early deletion fees
- **Monitoring Fee:** Small per-object monthly fee (typically offset by storage savings)
- **Automatic Optimization:** No manual lifecycle policy management required

**When to Use Intelligent-Tiering:**
- Access patterns unknown or unpredictable
- Mix of frequently and infrequently accessed data in the same bucket
- Data access patterns change over time
- Want cost optimization without retrieval fee risk

**S3 Lifecycle Policies:**

Lifecycle policies automatically transition objects between storage classes or expire objects based on age or other criteria.

**Example 1: Comprehensive Data Lifecycle**
```json
{
  "Rules": [{
    "Id": "enterprise-data-lifecycle",
    "Status": "Enabled",
    "Filter": {
      "Prefix": "application-logs/"
    },
    "Transitions": [
      {
        "Days": 30,
        "StorageClass": "STANDARD_IA"
      },
      {
        "Days": 90,
        "StorageClass": "GLACIER_IR"
      },
      {
        "Days": 365,
        "StorageClass": "DEEP_ARCHIVE"
      }
    ],
    "Expiration": {
      "Days": 2555
    }
  }]
}
```

**Example 2: Multipart Upload Cleanup**
```json
{
  "Rules": [{
    "Id": "cleanup-incomplete-uploads",
    "Status": "Enabled",
    "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
    }
  }]
}
```

**Example 3: Non-Current Version Lifecycle**
```json
{
  "Rules": [{
    "Id": "archive-old-versions",
    "Status": "Enabled",
    "NoncurrentVersionTransitions": [
      {
        "NoncurrentDays": 30,
        "StorageClass": "GLACIER_IR"
      }
    ],
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    }
  }]
}
```

**Cost Savings Example:**

A media company with 500 TB of application logs:
- **Before:** All in S3 Standard = $11,500/month
- **After Lifecycle Policy:**
  - 0-30 days (50 TB): S3 Standard = $1,150/month
  - 31-90 days (100 TB): S3 Standard-IA = $1,250/month
  - 91-365 days (200 TB): S3 Glacier Instant = $800/month
  - 365+ days (150 TB): S3 Glacier Deep Archive = $150/month
- **Total:** $3,350/month (71% reduction)

#### Amazon EBS Optimization

**EBS Volume Type Selection:**

| Volume Type | Use Case | IOPS | Throughput | Cost (per GB-month) |
|------------|----------|------|------------|---------------------|
| **gp3** | General purpose | 3,000-16,000 (baseline 3,000) | 125-1,000 MB/s | ~$0.08 |
| **gp2** | Legacy general purpose | 100-16,000 (burst) | Up to 250 MB/s | ~$0.10 |
| **io2** | High-performance | 100-256,000 | Up to 4,000 MB/s | ~$0.125 + IOPS cost |
| **st1** | Throughput-optimized HDD | 500 baseline | 40-500 MB/s | ~$0.045 |
| **sc1** | Cold HDD | 250 baseline | 12-250 MB/s | ~$0.015 |

**gp3 vs. gp2 Migration:**

gp3 provides approximately 20% cost savings compared to gp2 with better performance:
- **gp3 Advantages:** Provision IOPS and throughput independently of volume size; lower cost per GB
- **Migration:** Can modify volume type from gp2 to gp3 with no downtime
- **Recommendation:** Migrate all gp2 volumes to gp3 unless using very small volumes (<100 GB)

**EBS Cost Optimization Strategies:**

1. **Delete Unattached Volumes:**
   - Use AWS Config rule `ec2-volume-inuse-check` to identify orphaned volumes
   - Create snapshot before deletion for data retention
   - Automate cleanup with Lambda triggered by CloudWatch Events

2. **Snapshot Lifecycle Management:**
   - Use Data Lifecycle Manager (DLM) to automate snapshot creation and deletion
   - Retain daily snapshots for 7 days, weekly for 4 weeks, monthly for 12 months
   - Delete older snapshots; incremental snapshots only store changed blocks

3. **Snapshot Archive:**
   - Move infrequently accessed snapshots to EBS Snapshot Archive (75% cheaper)
   - Restore time: 24-72 hours (use for compliance/long-term retention)

4. **Volume Right-Sizing:**
   - Monitor volume utilization with CloudWatch metrics
   - Reduce oversized volumes (requires snapshot, restore, and reattach)

**Example DLM Policy:**
```json
{
  "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
  "ResourceTypes": ["VOLUME"],
  "TargetTags": [{"Key": "Backup", "Value": "true"}],
  "Schedules": [{
    "Name": "Daily snapshots",
    "CreateRule": {"Interval": 24, "Times": ["03:00"]},
    "RetainRule": {"Count": 7},
    "CopyTags": true
  }]
}
```

**AWS Documentation:**
- [S3 Storage Classes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html)
- [S3 Intelligent-Tiering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html)
- [S3 Lifecycle Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [EBS Volume Types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html)
- [Amazon Data Lifecycle Manager](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/snapshot-lifecycle.html)

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

AWS Cost Anomaly Detection is a machine learning-powered feature that automatically identifies unusual spending patterns in AWS services, providing early warning of cost increases before they significantly impact budgets. Unlike AWS Budgets (which alert when predefined thresholds are crossed), Cost Anomaly Detection uses ML to identify spending that deviates from historical norms.

**How Machine Learning Powers Detection:**

1. **Pattern Recognition:** ML models analyze historical spending patterns to establish baselines for normal spending
2. **Seasonality Analysis:** Evaluates weekly and monthly seasonality to avoid false positives from expected variations (e.g., higher weekend batch processing costs)
3. **Natural Growth Assessment:** Accounts for expected infrastructure growth trends
4. **Anomaly Scoring:** Ranks anomalies by dollar impact to prioritize investigation

**Root Cause Analysis:**

When an anomaly is detected, AWS provides root cause analysis across four dimensions:
- **AWS Service:** Which service(s) experienced unusual spending (e.g., EC2, RDS, S3)
- **AWS Account:** Which linked account(s) in an organization
- **Region:** Geographic region where spending increased
- **Usage Type:** Specific usage type within a service (e.g., data transfer, compute hours)

**Alert Mechanisms:**

Multiple notification channels supported:
1. **Email:** Individual alerts or aggregated daily/weekly reports
2. **Amazon SNS Topics:** For programmatic integration with downstream systems
3. **AWS Chatbot:** Real-time alerts to Amazon Chime chat rooms or Slack channels
4. **Amazon EventBridge:** Trigger automated responses via Lambda or Step Functions
5. **AWS User Notifications:** Additional notification preferences

**Data Source and Timing:**

- **Data Source:** Uses billing data from AWS Cost Explorer
- **Processing Frequency:** Runs approximately 3 times per day
- **Data Latency:** Up to 24 hours delay in Cost Explorer data
- **Detection Latency:** Can take up to 24 hours to detect an anomaly after usage occurs
- **New Service Ramp-Up:** Requires 10 days of historical data before detecting anomalies for newly used services
- **New Monitor Setup:** Takes 24 hours after creation to begin detecting anomalies

**Monitor Configuration Options:**

| Monitor Scope | Description | Use Case |
|--------------|-------------|----------|
| **All AWS Services** | Analyze all services independently | Comprehensive org-wide monitoring |
| **Specific Member Accounts** | Monitor individual linked accounts | Department or team-specific monitoring |
| **Cost Allocation Tags** | Monitor resources with specific tags | Project or environment-based monitoring |
| **Cost Categories** | Group spending by custom categories | Business unit or product line monitoring |

**Enterprise Configuration Examples:**

**Example 1: Production Environment Anomaly Detection**
```yaml
Monitor Name: Production Environment Anomaly Monitor
Scope:
  Type: Cost Allocation Tag
  Tag: Environment = production
Evaluation Frequency: 3x daily
Alert Threshold: $500 anomaly (spend increase)
Notification:
  - SNS Topic: prod-cost-anomaly-topic
  - Slack Channel: #finops-alerts
  - Email: finance-team@company.com
Subscribers: 5 (finance team, VP Engineering, DevOps leads)
```

**Example 2: Service-Specific Monitor**
```yaml
Monitor Name: EC2 Spend Anomaly Detection
Scope:
  Type: AWS Service
  Services: [Amazon EC2, Amazon EBS]
Alert Threshold: 20% increase from baseline
Notification:
  - EventBridge Rule → Lambda → Generate detailed instance report
  - SNS → Email to cloud ops team
Action: Trigger automated investigation script
```

**Example 3: Multi-Account Organization Monitor**
```yaml
Monitor Name: Organization-Wide Anomaly Detector
Scope:
  Type: Member Accounts
  Accounts: All linked accounts
Evaluation: Individual account anomalies + aggregate trends
Alert Threshold: $1,000 daily increase
Notification:
  - SNS Topic → Incident management system
  - Email digest: Daily summary to CFO
  - Slack: Real-time alerts for anomalies >$5,000
```

**Integration with Cost Management:**

- **Cost Explorer Integration:** Anomalies appear in Cost Explorer with visual indicators
- **Historical Tracking:** View anomaly history and patterns over time
- **Opt-Out Capability:** Can disable anomaly detection at any time
- **No Additional Cost:** Included with AWS Cost Management at no extra charge

**Limitations:**

- **Not Supported:** Bill source accounts using billing transfer or billing transfer views
- **Data Requirement:** Needs sufficient historical data to establish baselines
- **New Workloads:** Less effective for brand-new services without usage history

**Real-World Scenario:**

An e-commerce company experienced an unexpected $25,000 daily cost increase:
- **Anomaly Detection Alert:** Triggered within 6 hours of unusual spending
- **Root Cause:** Cost Explorer showed EC2 instances in ap-south-1 region
- **Investigation:** Revealed misconfigured Auto Scaling group launching 200+ c5.9xlarge instances
- **Resolution:** Terminated instances and fixed Auto Scaling policy
- **Savings:** Prevented additional $150,000 in monthly waste
- **Follow-Up:** Added budget action to deny large instance launches in non-primary regions

**Best Practices:**

1. **Layered Monitoring:** Combine with AWS Budgets for comprehensive coverage (anomaly detection for unknown issues, budgets for known thresholds)
2. **Granular Monitors:** Create multiple monitors for different scopes (account-level, tag-based, service-specific)
3. **Actionable Alerts:** Integrate with EventBridge and Lambda for automated investigation or remediation
4. **Regular Review:** Analyze anomaly patterns to identify recurring issues or areas for policy improvement
5. **Tuning Sensitivity:** Adjust alert thresholds based on organization size and risk tolerance

**AWS Documentation:**
- [Cost Anomaly Detection User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [Setting Up Anomaly Monitors](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)
- [Cost Anomaly Detection FAQ](https://aws.amazon.com/aws-cost-management/aws-cost-anomaly-detection/faqs/)

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

## SAP-C02 Exam Focus Areas

### Key Concepts for Solutions Architect Professional

**1. Pricing Models and Purchasing Options**

- **Savings Plans vs. Reserved Instances:**
  - Savings Plans: Commitment to $/hour; flexibility across instance families, regions, services (EC2/Fargate/Lambda)
  - RIs: Commitment to specific instance configuration; higher discount (up to 75% vs 72%) but less flexible
  - AWS Recommendation: Prefer Savings Plans for most workloads
  - Can coexist: AWS applies most cost-effective discount automatically

- **Compute Savings Plans vs. EC2 Instance Savings Plans:**
  - Compute: Up to 66% discount, maximum flexibility (cross-family, cross-region, multi-service)
  - EC2 Instance: Up to 72% discount, locked to instance family within region
  - Exam Scenario: Choose Compute for dynamic/unpredictable workloads; EC2 Instance for stable workloads

- **Spot Instances:**
  - Up to 90% discount vs. On-Demand
  - Can be interrupted with 2-minute warning
  - Spot price updates every 5 minutes
  - NOT compatible with Savings Plans commitments
  - Best for: Batch processing, CI/CD, containerized workloads with fault tolerance
  - Allocation strategies: Capacity-optimized (lowest interruption), price-optimized, diversified

**2. Cost Visibility and Reporting Tools**

- **Cost Explorer:**
  - 13 months historical data, 18-month forecasting
  - UI access: Free; API access: $0.01 per request
  - 24-hour minimum refresh cycle
  - Cannot be disabled after enablement
  - Exam Scenario: Use for trend analysis, RI/Savings Plans recommendations, budget planning

- **Cost and Usage Reports (CUR):**
  - Most detailed billing data (hourly line items)
  - Stored in S3; queryable with Athena
  - Updates up to 3x daily; cumulative reports
  - Includes all cost allocation tags and resource IDs
  - Exam Scenario: Use for detailed chargeback, custom billing systems, compliance reporting

- **Cost Explorer vs. CUR:**
  - Cost Explorer: Visual analysis, forecasting, quick insights
  - CUR: Raw data, SQL queries, custom analytics, audit trails

**3. Cost Allocation and Tagging**

- **Tag Types:**
  - AWS-generated tags: Prefix `aws:` (e.g., `aws:createdBy`, `aws:cloudformation:stack-name`)
  - User-defined tags: Prefix `user:` (e.g., `CostCenter`, `Environment`, `Project`)
  - Both require activation in Billing console; 24-hour propagation

- **Tag Policies (AWS Organizations):**
  - Enforce consistent tagging across accounts
  - Prevent non-compliant resource creation
  - Critical for cost governance in multi-account environments
  - Exam Scenario: Use to mandate cost allocation tags for all billable resources

- **Best Practice:** Never include sensitive information in tags (visible in billing reports)

**4. Budgets and Anomaly Detection**

- **AWS Budgets:**
  - Six types: Cost, Usage, RI Utilization, RI Coverage, Savings Plans Utilization, Savings Plans Coverage
  - Actual alerts (post-accrual) vs. Forecasted alerts (pre-accrual)
  - Automated actions: Apply IAM/SCP policies, stop instances
  - Updates 3x daily; potential delay between usage and alerts
  - Exam Scenario: Use forecasted alerts at 90% for proactive intervention

- **Cost Anomaly Detection:**
  - ML-powered; identifies deviations from historical baselines
  - Accounts for seasonality and natural growth
  - Runs 3x daily; 24-hour detection latency
  - Requires 10 days of data for new services
  - Exam Scenario: Complement budgets with anomaly detection for unknown cost spikes

- **Budgets vs. Anomaly Detection:**
  - Budgets: Known thresholds, proactive control
  - Anomaly Detection: Unknown patterns, reactive investigation

**5. Storage Cost Optimization**

- **S3 Intelligent-Tiering:**
  - No retrieval fees (unique among archive classes)
  - No minimum storage duration
  - Small monthly monitoring fee per object
  - Objects <128 KB remain in Frequent Access tier
  - Exam Scenario: Best for unknown/changing access patterns without retrieval fee risk

- **S3 Lifecycle Policies:**
  - Automate transitions between storage classes
  - Support for versioning, multipart upload cleanup, expiration
  - Exam Scenario: Use for predictable access patterns (e.g., logs: Standard → IA → Glacier → Deep Archive)

- **gp3 vs. gp2 EBS Volumes:**
  - gp3: 20% cheaper, provision IOPS/throughput independently, baseline 3,000 IOPS
  - gp2: Legacy, burst model, IOPS tied to volume size
  - Exam Scenario: Always migrate gp2 to gp3 for cost savings

**6. Compute Optimization**

- **AWS Compute Optimizer:**
  - Requires 14 days of CloudWatch data (93 days with Enhanced Metrics)
  - Analyzes CPU, memory (requires agent), network, disk I/O
  - Provides top 3 recommendations per resource with savings estimates
  - Exam Scenario: Use for rightsizing EC2, Auto Scaling groups, Lambda, ECS on Fargate

- **Graviton Instances:**
  - 40% better price-performance for EC2 compared to x86
  - 20% cheaper for Lambda
  - Exam Scenario: Consider for Linux workloads without x86 dependencies

**7. Network Cost Optimization**

- **Data Transfer Costs:**
  - Inbound: Free
  - Outbound to internet: $0.09/GB (first 10 TB)
  - Cross-region: $0.02/GB
  - Same region, different AZ: $0.01/GB
  - Same AZ: Free

- **VPC Endpoints:**
  - No data transfer charges for S3 and DynamoDB
  - Exam Scenario: Use Gateway Endpoints for S3/DynamoDB to eliminate cross-AZ and internet data transfer costs

- **CloudFront:**
  - Cheaper than direct S3 for content distribution
  - Caching reduces origin requests
  - Exam Scenario: Use for static content, media streaming, global distribution

**8. Consolidated Billing and Organizations**

- **Automatic Benefits:**
  - Combined usage for volume discounts
  - Shared Reserved Instances and Savings Plans across member accounts
  - Single payer account
  - Exam Scenario: Enable for multi-account cost optimization

- **Cost Allocation:**
  - Management account creates budgets for member accounts
  - Member accounts cannot access cost allocation tag manager
  - Use Cost Categories for custom grouping

**9. Multi-Account Cost Governance**

- **Service Control Policies (SCPs):**
  - Deny expensive instance types or regions
  - Enforce tagging requirements
  - Exam Scenario: Prevent developers from launching large instances in non-production accounts

- **Tag Policies:**
  - Enforce consistent cost allocation tags
  - Block resource creation without required tags
  - Exam Scenario: Mandate `CostCenter`, `Environment`, `Project` tags organization-wide

**10. Chargeback and Showback**

- **Showback:** Display costs per business unit without actual billing (educational)
- **Chargeback:** Actual billing to business units based on tagged resources (formal allocation)
- **Implementation:** Use CUR with Athena queries filtered by cost allocation tags

### Common Exam Scenarios

**Scenario 1: Multi-Account Organization Cost Optimization**
- **Question:** How to optimize costs across 50 AWS accounts with variable workloads?
- **Solution:**
  - Enable consolidated billing in AWS Organizations
  - Purchase Compute Savings Plans at organization level (shared across accounts)
  - Implement tag policies to enforce `CostCenter` tagging
  - Use Cost Explorer with linked account grouping for visibility
  - Set up AWS Budgets per account with forecasted alerts
  - Enable Cost Anomaly Detection for organization-wide monitoring

**Scenario 2: Unpredictable Workload with Cost Control**
- **Question:** Application with unknown usage patterns needs cost optimization and protection from runaway costs
- **Solution:**
  - Use Compute Savings Plans for baseline capacity (20-30% of expected usage)
  - On-Demand for variable capacity with Auto Scaling
  - S3 Intelligent-Tiering for storage
  - AWS Budgets with automated actions (deny resource creation at 100%)
  - Cost Anomaly Detection for ML-based spike detection

**Scenario 3: Data Lake Storage Cost Optimization**
- **Question:** 1 PB data lake with mixed access patterns needs cost reduction
- **Solution:**
  - Recent data (0-30 days): S3 Standard for frequent access
  - Warm data (31-90 days): S3 Standard-IA for infrequent access
  - Archive data (90-365 days): S3 Glacier Instant Retrieval
  - Compliance data (365+ days): S3 Glacier Deep Archive
  - S3 Lifecycle policies for automatic transitions
  - Enable S3 Intelligent-Tiering for datasets with unknown access patterns

**Scenario 4: Reserved Capacity Optimization**
- **Question:** Company has 100 EC2 instances running 24/7 but occasionally needs to change instance families
- **Solution:**
  - Analyze usage patterns with Compute Optimizer (14-day minimum)
  - Purchase Convertible RIs for baseline capacity (can exchange for different families)
  - OR use EC2 Instance Savings Plans (locked to family but flexible across sizes)
  - Monitor RI utilization with AWS Budgets (target >85% utilization)
  - Use Cost Explorer RI recommendations for purchase sizing

**Scenario 5: Developer Cost Accountability**
- **Question:** Implement cost visibility and accountability for 10 development teams
- **Solution:**
  - Define tagging strategy: `Team`, `Project`, `Environment`
  - Implement tag policies in AWS Organizations to enforce tags
  - Activate cost allocation tags in Billing console
  - Create AWS Budgets per team using tag filters
  - Generate monthly CUR reports with Athena queries grouped by `Team` tag
  - Implement showback or chargeback model

### Critical Exam Reminders

1. Cost Explorer cannot be disabled once enabled
2. Tag activation takes up to 24 hours to appear in reports
3. Compute Optimizer requires minimum 14 days of data
4. Savings Plans and RIs can coexist; AWS applies best discount
5. Spot Instances do NOT count toward Savings Plans commitments
6. S3 Intelligent-Tiering has NO retrieval fees (unlike Standard-IA)
7. VPC Gateway Endpoints for S3/DynamoDB eliminate data transfer costs
8. Consolidated billing automatically shares RIs and Savings Plans
9. Cost Anomaly Detection requires 10 days of data for new services
10. CUR is the most detailed billing source; stored in S3, queryable with Athena

**AWS Documentation:**
- [AWS Well-Architected Framework: Cost Optimization Pillar](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html)
- [AWS Cost Management User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/)
- [SAP-C02 Exam Guide](https://d1.awsstatic.com/training-and-certification/docs-sa-pro/AWS-Certified-Solutions-Architect-Professional_Exam-Guide.pdf)

## Summary

Cost optimization in AWS is an ongoing practice that requires combining multiple strategies:

**Foundation:**
- Implement comprehensive tagging strategy with enforcement via tag policies
- Enable consolidated billing for multi-account volume discounts and shared commitments
- Activate Cost Explorer and Cost and Usage Reports for visibility

**Optimization Tactics:**
- Use Compute/EC2 Instance Savings Plans for predictable baseline capacity (up to 72% savings)
- Leverage Spot Instances for fault-tolerant workloads (up to 90% savings)
- Rightsize resources using AWS Compute Optimizer (14-day minimum data collection)
- Migrate storage to appropriate S3 classes with lifecycle policies
- Upgrade gp2 EBS volumes to gp3 for 20% cost reduction

**Governance and Control:**
- Set up AWS Budgets with forecasted alerts and automated actions
- Enable Cost Anomaly Detection for ML-based unusual spending identification
- Use Service Control Policies to prevent expensive resource types in non-production accounts
- Implement chargeback or showback using CUR with Athena queries

**Continuous Improvement:**
- Review Cost Explorer RI and Savings Plans recommendations monthly
- Analyze CUR data quarterly to identify optimization opportunities
- Monitor commitment utilization (target >85% for RIs and Savings Plans)
- Track anomaly detection patterns to improve cost governance policies

For the SAP-C02 exam, focus on selecting the right tool for each scenario (Cost Explorer for visualization, CUR for detailed analysis, Budgets for proactive control, Anomaly Detection for reactive investigation) and understanding trade-offs between purchasing options (flexibility vs. discount level).
