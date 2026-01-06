---
title: Migration Strategies and Planning
lastUpdated: 2026-01-05
---

# Migration Strategies and Planning

Successfully migrating workloads to AWS requires comprehensive planning, assessment, and selection of appropriate migration strategies. Understanding the 6 R's framework and AWS migration tools is essential for SAP-C02.

## The 6 R's Migration Framework

AWS defines six migration strategies (the "6 R's") for moving applications to the cloud.

### 1. Rehost (Lift-and-Shift)

Move applications to AWS without modifications.

**When to Use:**
- Large-scale legacy migrations with tight timelines
- Applications with no business case for re-architecture
- "Migrate first, optimize later" approach
- Need to quickly exit data centers

**Key Tool:** AWS Application Migration Service (MGN)

**Benefits:**
- Fastest migration path
- Lower initial cost and risk
- No application changes required

**Considerations:**
- May not leverage cloud-native features
- Potential for higher long-term operational costs

### 2. Replatform (Lift-Tinker-and-Shift)

Make minimal cloud optimizations without changing core architecture.

**Examples:**
- Migrate database to Amazon RDS instead of EC2
- Replace on-premises load balancers with Application Load Balancer
- Migrate middleware to AWS managed services

**Benefits:**
- Some cloud optimization without full refactoring
- Improved operational efficiency
- Reduced management overhead

**Use Cases:**
- Applications that can benefit from managed services
- Workloads with minor compatibility issues
- Opportunity for quick wins with minimal risk

### 3. Repurchase (Drop-and-Shop)

Move to a different product, typically SaaS.

**Examples:**
- Replace on-premises CRM with Salesforce
- Migrate email to Microsoft 365 or Google Workspace
- Replace custom HR system with Workday

**Considerations:**
- License costs and contracts
- Data migration complexity
- User training requirements
- Feature parity assessment

**Benefits:**
- Eliminate infrastructure management
- Regular feature updates
- Reduced maintenance burden

### 4. Refactor / Re-architect

Reimagine application architecture using cloud-native features.

**Examples:**
- Migrate monolith to microservices on ECS/EKS
- Convert to serverless using Lambda and API Gateway
- Implement event-driven architecture with EventBridge

**When to Use:**
- Strong business need for improved agility or scalability
- Legacy architecture limiting innovation
- High operational costs in current state
- Opportunity to address technical debt

**Benefits:**
- Maximum cloud optimization
- Improved scalability and resilience
- Better alignment with DevOps practices

**Considerations:**
- Highest effort and cost
- Requires skilled development resources
- Longer timeline

### 5. Retire

Decommission applications no longer needed.

**Assessment Questions:**
- What is the actual usage of this application?
- Is there a replacement already in use?
- What is the cost of maintaining it?
- Are there compliance requirements for data retention?

**Benefits:**
- Immediate cost savings
- Reduced attack surface
- Simplified portfolio

**Process:**
- Identify through discovery tools
- Validate with business stakeholders
- Plan data archival if needed
- Document retirement decision

### 6. Retain (Revisit)

Keep applications in source environment (for now).

**Reasons to Retain:**
- Recent major investment in on-premises infrastructure
- Applications not ready for migration
- No business value in migrating
- Regulatory or compliance constraints
- Planning to retire soon anyway

**Strategy:**
- Document reason for retention
- Set review date to revisit decision
- Monitor for changed circumstances
- May use hybrid architecture temporarily

## AWS Migration Hub

Central location to track application migrations across multiple AWS and partner tools.

### Key Capabilities

**1. Discovery and Assessment**
- Integrate with Application Discovery Service
- Import data from third-party discovery tools
- View application inventory and dependencies

**2. Migration Tracking**
- Track status across multiple tools (MGN, DMS, etc.)
- Unified dashboard for all migrations
- Application grouping and wave management

**3. Strategy Recommendations**
- AWS Migration Hub Strategy Recommendations
- Analyze application portfolio
- Suggest appropriate migration strategies
- Generate directional business case

**4. Refactor Spaces**
- Manage application modernization projects
- Track refactoring to microservices
- Integrate with development tools

### Integration Points

Migration Hub integrates with:
- AWS Application Migration Service (MGN)
- AWS Database Migration Service (DMS)
- CloudEndure Migration (legacy)
- Partner migration tools (ATADATA, RiverMeadow, etc.)

## AWS Application Migration Service (MGN)

Recommended service for lift-and-shift migrations of physical, virtual, and cloud servers to AWS.

### Architecture

**Components:**
1. **Replication Agent** - Installed on source servers
2. **Replication Servers** - Temporary EC2 instances for data replication
3. **Staging Area** - VPC subnet for replication servers
4. **Target Instances** - Converted production instances

### Migration Process

**Phase 1: Continuous Replication**
- Agent replicates block-level data to staging area
- Minimal performance impact on source
- Asynchronous replication with compression

**Phase 2: Testing**
- Launch test instances from replicated data
- Validate application functionality
- No impact on production workloads
- Can test multiple times

**Phase 3: Cutover**
- Launch production instances
- Sync final delta changes
- Redirect traffic to AWS
- Decommission source servers

### Key Features

- **Automated conversion** - Automatically converts source servers to boot and run on AWS
- **Minimal downtime** - Typically minutes during cutover
- **Wide compatibility** - Supports Windows, Linux, most applications
- **Non-disruptive testing** - Test without affecting source systems
- **Post-launch templates** - Define instance type, networking, tags

### Best Practices

1. Start with a pilot wave of non-critical applications
2. Test network connectivity and dependencies first
3. Use Launch Templates to standardize configurations
4. Plan maintenance windows for final cutover
5. Monitor replication lag before cutover

## Migration Portfolio Assessment

### AWS Application Discovery Service

Helps plan migrations by collecting information about on-premises data centers.

**Discovery Methods:**

1. **Agentless Discovery (VMware only)**
   - Deploy Application Discovery Service Agentless Collector
   - Collects static configuration and utilization data
   - No installation on individual VMs required

2. **Agent-based Discovery**
   - Install AWS Application Discovery Agent
   - Detailed system configuration and performance data
   - Network dependency information
   - Process and connection details

**Data Collected:**
- Server specifications (CPU, RAM, disk)
- Resource utilization metrics
- Network connections and dependencies
- Running processes

### AWS Migration Evaluator

Builds a data-driven business case for AWS migration.

**Process:**
1. **Data Collection** - Install collector or upload existing data
2. **Analysis** - AWS analyzes current infrastructure costs
3. **Modeling** - Projects AWS costs with different strategies
4. **Business Case** - Detailed report with TCO analysis

**Deliverables:**
- Current state cost baseline
- Projected AWS costs by migration pattern
- Quick win opportunities
- 3-year TCO comparison
- Cost optimization recommendations

### Migration Readiness Assessment (MRA)

Structured evaluation of organization's readiness to migrate.

**Assessment Dimensions:**
- Business (strategy, stakeholder alignment)
- People (skills, organizational change)
- Process (governance, project management)
- Technology (architecture, operations)
- Security (compliance, risk management)
- Operations (monitoring, incident response)

## Landing Zone Preparation

Prepare AWS environment before migrating workloads.

### AWS Control Tower

Automated landing zone setup with governance guardrails.

**Key Components:**

1. **Multi-Account Structure**
   - Management account (billing and governance)
   - Log Archive account (centralized logging)
   - Audit account (security tooling)
   - Production and non-production OUs

2. **Guardrails**
   - Preventive (SCPs that restrict actions)
   - Detective (Config Rules that flag violations)
   - Mandatory, strongly recommended, and elective

3. **Account Factory**
   - Automated account provisioning
   - Standardized baseline configurations
   - Integration with Service Catalog

### Landing Zone Design Patterns

**Network Architecture:**
- Hub-and-spoke with Transit Gateway
- Centralized egress/ingress (Network Firewall)
- Hybrid connectivity (Direct Connect, VPN)
- DNS resolution strategy

**Security Baseline:**
- AWS Organizations with SCPs
- Centralized logging (CloudTrail, Config)
- GuardDuty, Security Hub across accounts
- Secrets Manager for credentials
- IAM Identity Center for SSO

**Operational Baseline:**
- Centralized monitoring (CloudWatch cross-account)
- Systems Manager for patch management
- Backup strategy with AWS Backup
- Cost allocation tags and budgets

## Migration Wave Planning

Organize migrations into logical groups (waves).

### Wave Planning Criteria

**Group by:**
- Application dependencies
- Business units or teams
- Migration complexity
- Business priority
- Compliance requirements
- Shared infrastructure

### Wave Structure

**Wave 0 - Foundation**
- Landing zone setup
- Network connectivity
- Security baseline
- Operational tooling

**Wave 1 - Pilot**
- 3-5 low-risk applications
- Validate migration process
- Train teams
- Identify issues

**Wave 2-N - Production Migrations**
- Based on dependencies and priority
- Typically 2-4 week cycles
- Include rollback plans
- Post-migration validation

**Final Wave - Complex/Critical**
- High-complexity applications
- Business-critical systems
- After teams have experience

### Migration Factory Model

Industrialized approach to large-scale migrations.

**Components:**
- Centralized migration team (factory)
- Standardized runbooks and automation
- Metrics and tracking dashboards
- Continuous improvement process

**Benefits:**
- Increased velocity over time
- Knowledge sharing across teams
- Economies of scale
- Reduced risk through standardization

## Exam Tips

- **Know all 6 R's** and when to apply each strategy
- **Rehost (MGN)** is fastest, **refactor** gives most cloud benefits
- **Migration Hub** is the central tracking point, not a migration tool itself
- **MGN** is the recommended lift-and-shift tool (replaced CloudEndure)
- **Application Discovery Service** helps understand dependencies
- **Migration Evaluator** builds business case with TCO analysis
- **Control Tower** automates landing zone with guardrails
- **Wave planning** groups migrations logically, starts with pilot
- **Retire** can provide immediate savings - don't migrate everything
- **Landing zone** must be ready before migrations begin

## Common Scenario Patterns

**Scenario:** "Large-scale data center exit with 500+ servers, tight deadline..."
**Answer:** Rehost strategy with AWS MGN, use Migration Hub for tracking, migrate in waves

**Scenario:** "Need business justification for migration before starting..."
**Answer:** Use Migration Evaluator to build TCO-based business case

**Scenario:** "Migrate first, optimize later approach..."
**Answer:** Start with rehost (MGN), then selectively replatform or refactor based on business value

**Scenario:** "Setting up AWS environment for hundreds of migrated applications..."
**Answer:** Use Control Tower to establish landing zone with multi-account structure and guardrails

**Scenario:** "Application with complex dependencies must all migrate together..."
**Answer:** Use Application Discovery Service to map dependencies, migrate as single wave

## Additional Resources

- [AWS Migration Hub Documentation](https://docs.aws.amazon.com/migrationhub/latest/ug/)
- [AWS Application Migration Service Documentation](https://docs.aws.amazon.com/mgn/latest/ug/)
- [AWS Prescriptive Guidance for Migration](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-guide/)
- [Understanding the 6 R's](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-readiness/understanding-6-rs.html)
- [AWS Migration Evaluator Guide](https://docs.aws.amazon.com/migration-evaluator/latest/userguide/)
