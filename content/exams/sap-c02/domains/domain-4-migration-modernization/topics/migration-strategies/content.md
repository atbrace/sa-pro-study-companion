---
title: Migration Strategies and Planning
lastUpdated: 2026-01-06
---

# Migration Strategies and Planning

Successfully migrating workloads to AWS requires comprehensive planning, assessment, and selection of appropriate migration strategies. AWS provides a structured framework called the "7 Rs of migration" that guides organizations in choosing the optimal approach for each application in their portfolio. Understanding these strategies, along with AWS migration assessment and orchestration tools, is critical for SAP-C02 certification and real-world large-scale migrations.

This topic covers the complete migration lifecycle from portfolio discovery through wave execution, emphasizing the decision frameworks and tools that Solutions Architects use to design and execute successful cloud migrations.

## The 7 Rs Migration Framework

AWS defines seven migration strategies (the "7 Rs") for moving applications to the cloud. For large-scale migrations, AWS recommends focusing primarily on Rehost, Replatform, Relocate, and Retire strategies to maximize velocity while minimizing complexity. Refactor and Repurchase strategies are typically applied selectively after initial migration to optimize specific high-value workloads.

### 1. Rehost (Lift-and-Shift)

Move applications to AWS without making any modifications to the application code, architecture, or configuration.

**When to Use:**
- Large-scale legacy migrations with aggressive timelines (data center exits, lease expirations)
- Applications with no business case for re-architecture
- "Migrate first, optimize later" approach to establish cloud presence quickly
- Applications running on physical servers, VMware vSphere, Microsoft Hyper-V, or other cloud platforms
- Regulatory requirements to minimize changes during migration
- Need to quickly exit data centers or reduce on-premises footprint

**Key Tools:**
- **AWS Application Migration Service (MGN)** - Primary rehost tool for physical, virtual, and cloud-to-cloud migrations
- **AWS VM Import/Export** - Simplified tool for one-time VM migrations
- **AWS Cloud Migration Factory Solution** - Orchestration framework for high-volume rehost migrations

**Real-World Scenario:**
A financial services company with 500+ physical and virtual servers in an on-premises data center faces a lease expiration in 12 months. They use AWS MGN to rehost the entire portfolio to EC2 instances, completing migration in 10 months. Post-migration, they selectively replatform databases to RDS and refactor customer-facing applications to containers, achieving 40% cost reduction over 18 months.

**Benefits:**
- Fastest migration path with minimal downtime (minutes during cutover)
- Lower initial cost, complexity, and risk compared to refactoring
- No application code changes, testing, or compatibility issues
- Immediate infrastructure cost savings from AWS pricing models
- Establishes foundation for future cloud-native optimization
- Automated server conversion handles OS boot and driver compatibility

**Considerations:**
- Does not leverage cloud-native features like auto-scaling, managed services, or serverless
- May result in higher long-term operational costs if left unoptimized
- Licensing costs may increase if not right-sized (over-provisioned instances)
- Requires post-migration optimization phase to realize full cloud value
- Network latency patterns may differ from on-premises architecture

### 2. Replatform (Lift-Tinker-and-Shift)

Make targeted cloud optimizations without changing the core application architecture or business logic. This strategy strikes a balance between speed of migration and cloud optimization benefits.

**Examples:**
- Migrate self-managed database on EC2 to Amazon RDS (SQL Server, PostgreSQL, MySQL, Oracle)
- Replace on-premises load balancers with Elastic Load Balancing (ALB, NLB)
- Migrate application servers to containerized deployment on Amazon ECS or EKS
- Upgrade operating system during migration (e.g., Windows Server 2012 to Windows Server 2022)
- Migrate from x86 architecture to AWS Graviton processors for cost savings
- Replace commercial database with open-source equivalent (Oracle to Amazon Aurora PostgreSQL)
- Convert .NET Framework applications to .NET Core using Porting Assistant for .NET
- Containerize Java/Tomcat or .NET/IIS applications using AWS App2Container

**Real-World Scenario:**
An e-commerce company migrates its three-tier web application. The web tier is rehosted to EC2, but the database layer is replatformed from SQL Server on Windows to Amazon RDS for SQL Server with Multi-AZ deployment. The Application Load Balancer replaces their F5 hardware load balancer. This approach reduces database management overhead by 70% while maintaining application compatibility.

**Benefits:**
- Tangible cloud optimization without full refactoring investment
- Reduced operational overhead through managed services
- Improved availability, scalability, and disaster recovery capabilities
- Lower licensing costs (when migrating to open-source or AWS-native services)
- Faster than refactoring with lower risk than lift-and-shift long-term
- Improved security posture through managed service best practices

**Use Cases:**
- Applications that can benefit from managed database or messaging services
- Workloads with minor compatibility issues easily resolved during migration
- Operating system or middleware upgrades required for compliance
- Opportunity for quick wins with minimal development effort
- Database or middleware vendor license renewal approaching
- Applications with predictable resource utilization patterns suitable for containerization

**Considerations:**
- Requires compatibility testing for platform changes
- May need minor application configuration changes
- Database schema conversion may be needed for engine changes
- Licensing implications must be evaluated (BYOL vs. license-included)
- Staff training on new managed services

### 3. Repurchase (Drop-and-Shop)

Replace the existing application with a different product, typically moving from a traditional license model to a Software-as-a-Service (SaaS) subscription model. This strategy involves abandoning existing software in favor of a cloud-native alternative.

**Examples:**
- Replace on-premises CRM system with Salesforce or Microsoft Dynamics 365
- Migrate email infrastructure to Microsoft 365 or Google Workspace
- Replace custom-built HR system with Workday or SAP SuccessFactors
- Move content management from SharePoint on-premises to SharePoint Online
- Replace custom workflow systems with ServiceNow
- Migrate traditional monitoring tools to SaaS alternatives like Datadog or New Relic

**Real-World Scenario:**
A manufacturing company maintains a custom-built employee portal and HR system developed over 15 years with high maintenance costs and limited mobile support. They repurchase with Workday HCM, eliminating the need to migrate legacy code to AWS and gaining modern mobile interfaces, analytics, and continuous feature updates. The transition requires 6 months of data migration and change management but eliminates 3 full-time developer positions previously dedicated to maintenance.

**Benefits:**
- Complete elimination of infrastructure management and maintenance overhead
- Regular automatic feature updates and security patches
- Reduced maintenance burden and elimination of technical debt
- Modern user interfaces and mobile accessibility
- Built-in integrations with other cloud services
- Pay-as-you-go or subscription pricing aligned with usage
- Immediate access to vendor innovation and new capabilities
- Reduced staffing requirements for application support

**Considerations:**
- Upfront license and subscription costs may be higher than rehosting
- Complex data migration from legacy systems to SaaS platforms
- Extensive user training and change management requirements
- Feature parity assessment - SaaS may lack specific custom features
- Vendor lock-in and reduced customization flexibility
- Compliance and data residency requirements for regulated industries
- Integration requirements with remaining on-premises or AWS-hosted systems
- Contract negotiation and exit strategy planning

**Use Cases:**
- Applications with high maintenance costs and aging codebases
- Non-differentiating internal tools (HR, email, collaboration)
- Systems requiring extensive upgrades to remain supported
- Organizations lacking specialized development talent
- Desire to shift from capital expenditure to operational expenditure model

### 4. Refactor / Re-architect

Fundamentally reimagine and rebuild application architecture using cloud-native features and design patterns. This strategy involves modifying application code and architecture to leverage AWS capabilities such as microservices, serverless computing, containers, and event-driven architectures.

**Examples:**
- Decompose monolithic application into microservices on Amazon ECS with Fargate or Amazon EKS
- Convert traditional three-tier web application to serverless using AWS Lambda, API Gateway, and DynamoDB
- Implement event-driven architecture using Amazon EventBridge, SQS, and SNS
- Rebuild data processing pipeline using AWS Glue, Amazon EMR, or AWS Step Functions
- Migrate batch processing to containerized workflows on AWS Batch
- Re-architect for multi-tenancy with account-level or schema-level isolation
- Implement CQRS pattern using separate read/write databases (DynamoDB and Aurora)

**Real-World Scenario:**
A media streaming company runs a monolithic video processing application on physical servers with limited scalability. They refactor to a serverless architecture using Lambda for video transcoding jobs triggered by S3 events, with metadata stored in DynamoDB and processing state managed by Step Functions. This enables processing of 10,000+ concurrent video uploads (previously limited to 50) while reducing infrastructure costs by 60% through pay-per-use pricing.

**When to Use:**
- Strong business need for dramatic improvements in scalability, agility, or performance
- Legacy monolithic architecture fundamentally limiting innovation velocity
- High operational costs in current state due to inefficient resource utilization
- Opportunity to address significant technical debt accumulated over years
- Competitive pressure requiring rapid feature delivery and experimentation
- Application requires global scale or extreme elasticity
- Existing application cannot meet performance or compliance requirements
- Modernization enables new revenue opportunities or business models

**Benefits:**
- Maximum cloud optimization and cost efficiency through consumption-based pricing
- Dramatic improvements in scalability, resilience, and fault tolerance
- Better alignment with DevOps, CI/CD, and infrastructure-as-code practices
- Improved developer productivity through managed services and separation of concerns
- Enhanced security through service-level isolation and fine-grained IAM policies
- Ability to independently scale and deploy application components
- Reduced operational burden through serverless and managed container services

**Considerations:**
- Highest effort, cost, and timeline of all migration strategies
- Requires skilled development resources with cloud-native expertise
- Application downtime during cutover may be significant without careful planning
- Testing complexity increases with distributed systems
- Organizational change management required for new operational models
- Monitoring and debugging distributed systems requires new tools and skills
- Not recommended for initial large-scale migrations - apply selectively post-migration

**AWS recommends:** For large-scale migrations, use refactor sparingly and only for high-value applications. Most organizations achieve better outcomes by rehosting first, then selectively refactoring applications with clear business justification post-migration.

### 5. Retire

Decommission and shut down applications that are no longer needed, used, or provide business value. Retire is often the most overlooked but highest-value migration strategy, delivering immediate cost savings without migration effort.

**Common Retirement Candidates:**
- Zombie applications with average CPU and memory utilization under 5%
- Idle applications with 5-20% utilization over 90-day periods
- Applications with no inbound network connections for 90+ days
- Shadow IT systems with fewer than 10 active users
- Redundant applications replaced by newer systems but never decommissioned
- Backup or disaster recovery systems for retired applications
- Development and test environments for applications no longer in development
- Applications approaching end-of-support with no migration business case

**Assessment Questions:**
- What is the actual usage of this application over the past 90 days?
- How many active users does this application have?
- Is there a replacement application already in use?
- What is the annual cost of maintaining this application (licensing, infrastructure, support)?
- What business process depends on this application?
- Are there compliance or legal requirements for data retention?
- What is the last time this application was updated or patched?

**Real-World Scenario:**
During portfolio discovery for a 1,200-server migration, a healthcare organization identifies 180 servers (15%) as candidates for retirement. This includes 65 servers supporting applications with zero users in 90 days, 40 test/dev environments for decommissioned applications, and 75 redundant backup systems. Retiring these servers before migration saves 4.5 million USD over 3 years and eliminates 15% of migration scope.

**Benefits:**
- Immediate cost savings without migration investment
- Reduced security attack surface and compliance scope
- Simplified application portfolio and reduced technical debt
- Faster overall migration by reducing scope
- Reduced licensing costs for unused software
- Decreased operational burden on IT teams
- Lower cloud consumption costs by not migrating unnecessary workloads

**Process:**
1. **Identify candidates** using AWS Application Discovery Service utilization data
2. **Validate with business stakeholders** to confirm no hidden dependencies or business value
3. **Plan data archival** if regulatory or compliance requirements exist
4. **Document retirement decision** with business justification and stakeholder approval
5. **Archive data** to Amazon S3 Glacier or tape if required (with appropriate retention policies)
6. **Decommission infrastructure** and reclaim licenses
7. **Update CMDB** and documentation to reflect retired status

**Data Retention Strategies:**
- Archive to Amazon S3 with Glacier storage class for long-term retention
- Use S3 Object Lock for WORM (Write Once Read Many) compliance requirements
- Export database backups to S3 before decommissioning
- Implement S3 Lifecycle policies for automatic transition to Glacier Deep Archive
- Tag archived data with retention period and legal hold requirements

### 6. Retain (Revisit)

Intentionally keep applications in the source environment (on-premises or current hosting location) and defer migration decision to a future date. Retain does not mean "never migrate" but rather "not migrating now" with a plan to revisit the decision later.

**Reasons to Retain:**
- Recent major capital investment in on-premises infrastructure or hardware refresh
- Applications not ready for migration due to unresolved dependencies or technical blockers
- Regulatory, compliance, or data residency constraints preventing cloud deployment
- Mainframe, AS/400, or specialized hardware dependencies (manufacturing equipment, non-x86 Unix)
- Applications planned for retirement within 12-18 months
- No clear business value or ROI for migrating specific applications
- Vendor roadmap includes cloud-native SaaS version releasing soon
- Complex licensing agreements with penalties for early termination
- Applications undergoing active redevelopment or replacement
- Security or compliance assessment incomplete

**Real-World Scenario:**
A manufacturing company with a 1,000-server estate decides to retain 120 servers supporting industrial control systems with specialized hardware dependencies. These systems communicate with physical manufacturing equipment via proprietary protocols and require sub-10ms latency. The company implements AWS Direct Connect for hybrid connectivity, allowing cloud-migrated applications to communicate with retained on-premises systems while re-evaluating these applications every 6 months as AWS Outposts and Local Zones expand.

**Strategy:**
- **Document retention rationale** with clear business or technical justification
- **Set formal review dates** (quarterly or semi-annually) to revisit migration decision
- **Monitor for changed circumstances** such as new AWS services, compliance changes, or vendor updates
- **Plan hybrid architecture** using AWS Direct Connect, VPN, or AWS Outposts for connectivity
- **Track costs** of retained applications separately to evaluate future migration business case
- **Maintain security posture** for hybrid environments with consistent IAM, networking, and monitoring

**Hybrid Architecture Patterns for Retained Applications:**
- **Hybrid networking:** AWS Direct Connect or Site-to-Site VPN for private connectivity
- **Data synchronization:** AWS DataSync or AWS Storage Gateway for file sharing
- **Database replication:** AWS DMS for continuous replication to AWS for DR or reporting
- **Hybrid identity:** AWS Directory Service or AWS IAM Identity Center with on-premises Active Directory
- **Monitoring:** CloudWatch agent on on-premises servers with unified dashboards

**Considerations:**
- Retained applications still incur on-premises costs (data center, power, cooling, hardware maintenance)
- Hybrid architectures introduce complexity in networking, security, and operations
- Deferred migration may result in higher future costs if technology debt accumulates
- Skills and knowledge for on-premises systems may become harder to maintain over time
- Compliance requirements may change, enabling future migration

### 7. Relocate

Transfer servers, instances, or applications between AWS infrastructure without modifying the application. Relocate is the newest strategy in the 7 Rs framework, focusing on moving workloads that are already virtualized or running in the cloud to different AWS platforms or between AWS resources.

**Examples:**
- Move VMware vSphere VMs to VMware Cloud on AWS without conversion
- Transfer Amazon RDS database instances between VPCs or AWS accounts
- Move EC2 instances between AWS Regions using AMI copy and relaunch
- Migrate resources between AWS accounts during organizational restructuring
- Relocate Amazon S3 buckets between Regions using S3 Replication
- Move Amazon EBS volumes across Availability Zones

**Real-World Scenario:**
A company acquired through merger runs 200 VMware VMs on-premises. Instead of converting VMs to EC2 instances (rehost), they use VMware Cloud on AWS to relocate the entire VMware environment to AWS infrastructure within 2 weeks. This preserves existing VMware tools, runbooks, and staff expertise while gaining AWS infrastructure benefits. Over time, they selectively migrate VMs to native EC2 to reduce VMware licensing costs.

**Capabilities:**
- Transfer applications from on-premises VMware to VMware Cloud on AWS
- Move workloads between cloud platforms with minimal disruption
- Relocate AWS resources between VPCs, Regions, or accounts
- No requirement for new hardware procurement
- No application code rewriting or architectural changes
- Minimal operational process changes

**Advantages:**
- Fastest possible migration path with near-zero downtime
- Preserves existing virtualization investments and tooling
- No compatibility testing or application changes required
- Maintains familiar operational procedures and staff skills
- Immediate access to AWS services and global infrastructure
- Enables incremental transformation to cloud-native architecture

**Use Cases:**
- VMware environments requiring quick migration with minimal business disruption
- Mergers and acquisitions requiring rapid AWS account consolidation
- Disaster recovery scenarios requiring cross-Region resource relocation
- Data residency changes requiring regional resource movement
- Organizations with significant VMware expertise and tooling investments
- Tight migration timelines where rehost conversion time is prohibitive

**Key AWS Services:**
- **VMware Cloud on AWS** - Run VMware vSphere natively on AWS infrastructure
- **AWS Application Migration Service** - Can relocate VMs with minimal conversion
- **Amazon RDS** - Supports cross-Region and cross-account relocation
- **AWS Database Migration Service** - Relocate databases with minimal downtime
- **Amazon S3 Replication** - Automated relocation of objects across Regions

**Considerations:**
- VMware Cloud on AWS has ongoing licensing costs that may exceed native EC2
- Not all AWS services support cross-Region or cross-account relocation
- Network architecture may require redesign when relocating between VPCs or Regions
- Some relocations still require downtime for final cutover
- Long-term strategy should consider migration to AWS-native services for cost optimization

**AWS Documentation:**
- [VMware Cloud on AWS](https://aws.amazon.com/vmware/)
- [Migrating to VMware Cloud on AWS](https://docs.vmware.com/en/VMware-Cloud-on-AWS/services/com.vmware.vmc-aws-migrations/GUID-migrate-to-vmc.html)

## AWS Migration Hub

AWS Migration Hub provides a central location to discover, track, and manage application migrations across your entire portfolio using multiple AWS and partner migration tools. It serves as the orchestration and visibility layer for large-scale migrations, not as a migration tool itself.

**Important Note:** As of November 2025, AWS Migration Hub is no longer accepting new customers. AWS recommends exploring AWS Transform for similar capabilities. However, understanding Migration Hub remains relevant for the SAP-C02 exam as many existing migration projects continue to use it.

### Key Capabilities

**1. Discovery and Assessment**
- Integrates with AWS Application Discovery Service for automated inventory collection
- Imports data from third-party discovery tools via API or CSV upload
- Visualizes application inventory with server specifications and resource utilization
- Maps application dependencies through network connection analysis
- Provides consolidated view of on-premises environment before migration planning

**2. Migration Tracking and Orchestration**
- Tracks migration status across multiple AWS tools (MGN, DMS, Server Migration Service)
- Provides unified dashboard showing migration progress for entire portfolio
- Organizes servers into logical application groups for coordinated migration
- Supports wave-based migration planning with progress metrics
- Automatically updates status as migration tools report progress
- Displays migration history and audit trail for compliance

**3. Migration Hub Strategy Recommendations**
Strategy Recommendations analyzes your application portfolio and recommends optimal transformation paths:

- **Application analysis:** Examines server inventory, runtime environments, and application dependencies
- **Runtime focus:** Analyzes Microsoft IIS web servers and Java applications (Tomcat, JBoss)
- **Anti-pattern detection:** Identifies application incompatibilities requiring resolution before migration
- **Strategy recommendations:** Suggests one of three transformation strategies based on analysis:
  - **Rehost** to Amazon EC2 using AWS Application Migration Service
  - **Replatform** to containers using AWS App2Container
  - **Refactor** to modern platforms (.NET Core, PostgreSQL, microservices)
- **Tool recommendations:** Identifies specific AWS services and tools for recommended strategy
- **Business case generation:** Provides directional cost analysis and effort estimates

**4. Migration Hub Refactor Spaces**
Enables incremental application refactoring to microservices in AWS:

- Creates isolated refactor environments within existing AWS accounts
- Routes traffic incrementally from monolith to refactored microservices
- Manages service-to-service communication during transformation
- Integrates with development and deployment tools (CodePipeline, ECS, Lambda)
- Supports strangler fig pattern for gradual modernization without big-bang rewrites

**5. Migration Hub Orchestrator**
Simplifies and automates complex migration workflows:

- Provides predefined, customizable migration workflow templates
- Automates server and enterprise application migrations
- Centralizes migration lifecycle management in single location
- Orchestrates multi-step migration processes with dependencies
- Tracks detailed progress of each workflow step

### Integration Points

Migration Hub integrates with multiple AWS and partner tools:

**AWS Services:**
- **AWS Application Migration Service (MGN)** - Lift-and-shift rehost migrations
- **AWS Database Migration Service (DMS)** - Database migration tracking
- **AWS Application Discovery Service** - Automated server and application discovery
- **AWS App2Container** - Java and .NET containerization
- **Porting Assistant for .NET** - .NET Framework compatibility analysis
- **AWS Schema Conversion Tool** - Database schema migration assessment

**Partner Tools:**
- ATADATA ATAmotion
- RiverMeadow Cloud Migration SaaS
- Cloudamize
- Turbonomic (now part of IBM)
- Carbonite Migrate (now OpenText)

### Migration Hub Home Region

Migration Hub uses a **home region** concept where all discovery and migration tracking data is stored:

- You must select a home region during initial setup
- All discovery data and migration tracking metadata stored in this region
- Home region selection is permanent and cannot be changed
- Applications can migrate to any AWS Region, regardless of home region
- Supported home regions: us-east-1, us-west-2, eu-west-1, eu-central-1, ap-northeast-1, ap-southeast-2

**AWS Documentation:**
- [AWS Migration Hub User Guide](https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html)
- [Migration Hub Strategy Recommendations](https://docs.aws.amazon.com/migrationhub-strategy/latest/userguide/what-is-mhub-strategy.html)
- [Migration Hub Refactor Spaces](https://docs.aws.amazon.com/migrationhub-refactor-spaces/latest/userguide/what-is-mhub-refactor-spaces.html)

## AWS Application Migration Service (MGN)

AWS Application Migration Service is the primary AWS service for lift-and-shift (rehost) migrations of physical servers, VMware vSphere VMs, Microsoft Hyper-V VMs, and cloud-based servers to AWS. MGN automates the conversion process and enables large-scale migrations with minimal downtime.

### Architecture and Components

**1. Replication Agent**
- Lightweight software installed on each source server (Windows or Linux)
- Performs continuous block-level replication of server volumes
- Compresses and encrypts data in transit
- Tracks changed blocks to minimize bandwidth usage
- Minimal performance impact (typically less than 3% CPU, 2% network)

**2. Staging Area Subnet**
- Designated VPC subnet where replication infrastructure operates
- Must have internet connectivity (direct or via NAT Gateway) to reach MGN endpoints
- Temporary infrastructure automatically created and managed by MGN
- Uses default VPC unless specified otherwise

**3. Replication Servers**
- Temporary EC2 instances automatically launched in staging area
- Receive replicated data from source servers
- Convert data to EBS snapshots
- Automatically scaled based on number of source servers
- Charged as standard EC2 instances but managed by MGN

**4. Launch Templates**
- Define target instance configuration (instance type, subnet, security groups, IAM role)
- Separate templates for test and cutover launches
- Support for post-launch scripts and configuration automation
- Can specify EBS volume types and encryption settings

**5. Target Instances**
- Final EC2 instances launched from replicated data
- Automatically configured to boot in AWS environment
- Drivers and boot configuration adjusted for AWS compatibility

### Migration Process

**Phase 1: Initial Setup**
1. Install AWS Replication Agent on source servers
2. Agent automatically registers with MGN and begins initial data replication
3. MGN creates staging area resources (replication servers, EBS volumes)
4. Full volume copy transferred to AWS (may take hours to days depending on data size)
5. Replication status visible in MGN console: Not ready → Initial sync → Ready for testing

**Phase 2: Continuous Replication**
- After initial sync, agent replicates only changed blocks (delta replication)
- Asynchronous replication with typical lag of 1-5 minutes
- Replication continues indefinitely until cutover
- No performance impact on source applications
- Encrypted replication using TLS 1.2+

**Phase 3: Testing**
- Launch test instances from replicated data without affecting source servers
- Test application functionality, network connectivity, and performance in AWS
- Validate DNS, load balancers, and application dependencies
- Can launch and terminate test instances multiple times
- Test launches do not interrupt continuous replication

**Phase 4: Cutover**
1. Schedule maintenance window and notify stakeholders
2. Stop or quiesce application on source server
3. Wait for final delta replication to complete (typically 1-5 minutes)
4. Launch cutover instance with production configuration
5. Update DNS or load balancer to point to AWS instance
6. Validate application functionality in production
7. Mark servers as "Cutover complete" in MGN console
8. Decommission source servers after validation period

### Key Features and Capabilities

**Automated OS Conversion**
- Automatically adjusts boot loader and kernel for AWS environment
- Installs AWS-compatible drivers (network, storage, PV drivers)
- Modifies Windows boot configuration (BCD) for Xen/Nitro compatibility
- No manual intervention required for OS-level changes

**Wide Platform Support**
- **Operating Systems:** Windows Server 2008 R2+, RHEL 5+, CentOS 5+, Ubuntu 12.04+, SUSE Linux 11 SP4+, Debian 7+, Oracle Linux 6+
- **Source Platforms:** Physical servers, VMware vSphere, Hyper-V, Azure, GCP
- **Target Regions:** All 32+ AWS commercial and GovCloud regions

**Minimal Downtime Migration**
- Typical cutover downtime: 1-10 minutes (time for final sync and reboot)
- Significantly lower than traditional migration approaches (hours or days)
- Zero downtime possible for clustered or load-balanced applications using blue/green cutover

**Non-Disruptive Testing**
- Launch test instances multiple times without affecting source
- Parallel testing of multiple migration waves
- Validate networking, security, and application functionality before cutover
- No impact on production source systems

**Point-in-Time Recovery**
- MGN maintains EBS snapshots of replicated data
- Can launch instances from any previous snapshot
- Provides rollback capability if issues discovered post-cutover

**Integration and Automation**
- Integrates with AWS Migration Hub for tracking
- APIs for automation and orchestration
- CloudWatch metrics for replication lag and health monitoring
- EventBridge integration for workflow automation
- Tagging support for cost allocation and automation

### Supported Migration Scenarios

- Data center exit or lease expiration
- Disaster recovery establishment
- Cloud-to-cloud migration (Azure, GCP to AWS)
- Application portfolio rationalization
- Operating system version upgrades during migration
- Consolidation of distributed infrastructure

### Best Practices

**Planning:**
1. Conduct application dependency mapping using Application Discovery Service
2. Group servers into applications and migration waves
3. Identify network connectivity requirements (ports, protocols, latency)
4. Plan for licensing (BYOL vs license-included)
5. Define success criteria and rollback procedures

**Implementation:**
1. Start with pilot wave of 3-5 non-critical applications
2. Test network connectivity from source to MGN service endpoints before agent installation
3. Create Launch Templates with standardized configurations (subnets, security groups, tags)
4. Monitor replication lag and ensure lag is under 5 minutes before cutover
5. Use AWS Systems Manager for post-launch configuration automation
6. Document each migration with runbooks and lessons learned

**Optimization:**
1. Right-size instance types based on actual utilization data (use CloudWatch metrics)
2. Convert to GP3 EBS volumes for cost savings
3. Implement backup strategy using AWS Backup
4. Apply security best practices (IMDSv2, encrypted EBS, VPC endpoints)
5. Schedule cutover during low-usage periods

**Security:**
- Replication traffic encrypted with TLS 1.2+
- Use VPC endpoints to keep replication traffic on AWS backbone
- Apply least-privilege IAM policies for MGN service role
- Encrypt target EBS volumes with AWS KMS
- Implement security groups with minimal required access

### Pricing

- No additional charge for AWS Application Migration Service itself
- You pay for underlying AWS resources:
  - **Replication servers:** EC2 instances (t3.small or larger)
  - **EBS volumes:** Staging area storage (gp2/gp3)
  - **Data transfer:** Data transfer from source to AWS (varies by source location)
  - **Target instances:** Standard EC2 and EBS pricing
- Free tier: 90 days of replication server costs covered for each migrated server
- Cost estimator available in MGN console

**AWS Documentation:**
- [AWS Application Migration Service User Guide](https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html)
- [MGN Supported Operating Systems](https://docs.aws.amazon.com/mgn/latest/ug/supported-operating-systems.html)
- [MGN Architecture and How It Works](https://docs.aws.amazon.com/mgn/latest/ug/how-it-works.html)

## Migration Portfolio Assessment

Successful migrations begin with comprehensive portfolio discovery and assessment. AWS provides tools to automate data collection, analyze current infrastructure, and build data-driven business cases for cloud migration.

### AWS Application Discovery Service

AWS Application Discovery Service automates the collection of server inventory, configuration, and utilization data from on-premises data centers. This data informs migration planning, dependency mapping, and cost modeling.

**Important Note:** As of November 2025, AWS Application Discovery Service is no longer open to new customers. AWS recommends exploring AWS Transform for similar capabilities.

#### Discovery Methods Comparison

**1. Agentless Discovery (VMware vCenter Only)**

**Deployment:**
- OVA file deployed to VMware vCenter as virtual appliance
- Single collector can discover entire vCenter inventory
- No software installation on individual VMs required

**Data Collected:**
- **Static configuration:** Server hostnames, IP addresses, MAC addresses, disk allocations
- **Database information:** Database engine versions, schemas (for supported databases)
- **Utilization metrics:** CPU, RAM, and disk I/O (average and peak values)
- **Network connections:** TCP connections between servers (Layer 4)

**Collection Interval:** Every 60 minutes

**Limitations:**
- Cannot discover physical servers
- No process-level information
- No detailed time-series performance data
- Limited to VMware vSphere environments

**Best For:** Quick inventory of VMware environments, database discovery for DMS planning

**2. Agent-Based Discovery (Physical and Virtual Servers)**

**Deployment:**
- Lightweight agent installed on each Windows or Linux server
- Supports physical servers, VMware, Hyper-V, and other virtualization platforms

**Data Collected:**
- **Static configuration:** All data from agentless discovery plus OS details
- **Detailed performance:** Time-series CPU, memory, disk, and network metrics
- **Network connections:** Inbound and outbound connections with processes
- **Running processes:** Process names, paths, and resource consumption
- **Dependency mapping:** Which processes communicate with which servers

**Collection Interval:** Every 15 seconds for performance data

**Advantages:**
- Platform-agnostic (works on physical and any virtual platform)
- Detailed dependency mapping for application grouping
- Exportable time-series data for cost modeling
- Process-level visibility for application discovery

**Best For:** Comprehensive discovery, dependency mapping, physical servers, non-VMware environments

**3. File-Based Import**
- Direct CSV import of infrastructure inventory
- Enables migration assessment without deploying collectors
- Requires manual data gathering or export from existing CMDB tools
- Data quality depends on accuracy of source information

#### Data Collection Comparison Matrix

| Feature | Agentless Collector | Discovery Agent |
|---------|---------------------|-----------------|
| **Supported Infrastructure** | VMware VMs only | Physical servers and any virtualization platform |
| **Deployment Model** | One collector per vCenter | One agent per server |
| **Running Processes** | No | Yes |
| **Network Dependencies** | Yes (TCP connections) | Yes (with process details) |
| **Collection Frequency** | 60 minutes | 15 seconds |
| **Time-Series Export** | No | Yes (API and console) |
| **Database Discovery** | Yes | No |
| **Application Grouping** | Limited | Comprehensive |

#### Integration with Migration Hub

All discovery data automatically flows to AWS Migration Hub (in configured home region):
- Server inventory with specifications and utilization
- Network connection graph for dependency visualization
- Application grouping based on observed communication patterns
- Export capability to S3, Athena, and QuickSight for analysis
- Integration with Migration Hub Strategy Recommendations

#### Database Discovery Integration

Application Discovery Service integrates with AWS Database Migration Service (DMS) Fleet Advisor:
- Discovers database engines (Oracle, SQL Server, MySQL, PostgreSQL)
- Collects schema complexity metrics
- Identifies duplicate schemas across database instances
- Provides target recommendations for AWS database services
- Feeds data into AWS Schema Conversion Tool for assessment

#### Best Practices

**Planning:**
1. Select appropriate discovery method based on infrastructure (agentless for VMware-only, agent-based for mixed environments)
2. Configure Migration Hub home region before starting discovery (data stored permanently in this region)
3. Plan for network connectivity from discovery infrastructure to AWS endpoints

**Implementation:**
1. Start with agentless discovery for quick VMware inventory
2. Deploy agents selectively on key servers requiring detailed dependency analysis
3. Run discovery for minimum 14 days to capture workload patterns and variations
4. Tag servers during discovery to facilitate application grouping

**Data Analysis:**
1. Export utilization data to right-size EC2 instances and avoid over-provisioning
2. Use network connection data to identify application dependencies before migration
3. Identify zombie and idle servers for retirement candidates (see Retire strategy)
4. Generate EC2 instance recommendations based on actual utilization vs. allocated resources

**AWS Documentation:**
- [AWS Application Discovery Service User Guide](https://docs.aws.amazon.com/application-discovery/latest/userguide/what-is-appdiscovery.html)
- [Discovery Methods Comparison](https://docs.aws.amazon.com/application-discovery/latest/userguide/discovery-methods.html)

### AWS Migration Evaluator

AWS Migration Evaluator (formerly TSO Logic) builds a data-driven business case for AWS migration by analyzing current infrastructure costs and projecting AWS costs across different migration strategies.

**Process:**

**1. Data Collection (2-4 weeks)**
- Install lightweight collector on on-premises infrastructure management tools
- Or upload existing configuration and utilization data
- Collector gathers resource inventory, utilization patterns, and software licensing data
- Data automatically transmitted to AWS Migration Evaluator service

**2. Current State Analysis**
- AWS team analyzes current infrastructure costs including:
  - Hardware depreciation and refresh cycles
  - Software licensing (OS, databases, applications)
  - Data center facilities (power, cooling, space)
  - Network connectivity costs
  - Storage and backup infrastructure
  - Labor costs for operations and maintenance
- Builds comprehensive total cost of ownership (TCO) baseline

**3. Future State Modeling**
- Projects AWS costs using different migration patterns:
  - **Rapid migration (Rehost):** Lift-and-shift to EC2 with minimal optimization
  - **Hybrid migration:** Mix of rehost and replatform strategies
  - **Optimized migration:** Aggressive use of managed services and modernization
- Models different AWS pricing options (On-Demand, Reserved Instances, Savings Plans, Spot)
- Accounts for AWS support plans, data transfer, and backup costs

**4. Business Case Delivery**
AWS provides detailed report including:
- **Current state TCO baseline** with cost breakdown by category
- **Projected AWS costs** for 1-year and 3-year periods
- **Cost comparison** showing potential savings across migration strategies
- **Quick win opportunities** identifying highest-ROI migration candidates
- **Directional roadmap** for phased migration approach
- **Financial analysis** including cash flow, NPV, and payback period

**Deliverables:**

- **Executive summary:** High-level findings for CxO stakeholders
- **Detailed cost model:** Line-item comparison of current state vs. AWS
- **Migration pattern analysis:** Cost implications of different 7 Rs strategies
- **Right-sizing recommendations:** EC2 instance types based on actual utilization
- **Optimization opportunities:** Managed services, Reserved Instances, Savings Plans
- **Risk assessment:** Technical and financial migration risks
- **3-year TCO projection:** Total cost of ownership in AWS vs. on-premises

**Benefits:**

- Data-driven justification for migration investment
- Identifies cost-saving opportunities before migration
- Quantifies financial benefits of different migration strategies
- Supports budget planning and CFO approval
- No cost to AWS customers (delivered by AWS team)
- Typically shows 30-50% cost reduction over 3 years

**Use Cases:**
- Building executive-level business case for migration
- Justifying migration budget and resource allocation
- Comparing AWS against other cloud providers
- Planning multi-year migration roadmap with financial modeling
- Identifying which applications to migrate first based on ROI

**AWS Documentation:**
- [AWS Migration Evaluator Overview](https://aws.amazon.com/migration-evaluator/)

### Migration Readiness Assessment (MRA)

Migration Readiness Assessment is a structured framework for evaluating an organization's readiness to execute large-scale cloud migration. Based on the AWS Cloud Adoption Framework (CAF), MRA identifies capability gaps and creates actionable roadmaps to address them.

#### Assessment Framework: AWS Cloud Adoption Framework (CAF)

The MRA evaluates readiness across six perspectives:

**1. Business Perspective**
- Cloud migration aligned with business strategy and objectives
- Executive sponsorship and stakeholder buy-in secured
- Business case and financial justification approved
- Organizational change management plan in place
- KPIs and success metrics defined

**2. People Perspective**
- Cloud skills and competencies assessed
- Training and certification plans developed
- Roles and responsibilities defined for migration team
- Organizational structure supports cloud operating model
- Change management and communication strategy established
- Third-party partner engagement planned (if needed)

**3. Governance Perspective**
- Cloud governance model defined (policies, standards, controls)
- Financial management and cost allocation approach established
- Portfolio prioritization and decision-making framework in place
- Risk management and compliance requirements identified
- Audit and regulatory requirements addressed

**4. Platform Perspective**
- Landing zone architecture designed
- Network connectivity strategy defined (Direct Connect, VPN)
- Multi-account structure planned (AWS Organizations, Control Tower)
- Disaster recovery and business continuity requirements documented
- Scalability and performance requirements defined

**5. Security Perspective**
- Security reference architecture designed
- Identity and access management approach defined
- Data protection and encryption strategy established
- Compliance and regulatory requirements mapped to AWS controls
- Security monitoring and incident response procedures planned
- Shared responsibility model understood by stakeholders

**6. Operations Perspective**
- Cloud operating model defined (centralized, federated, or hybrid)
- Monitoring and observability strategy established
- Incident management and support processes adapted for cloud
- Automation and infrastructure-as-code approach planned
- Backup, patching, and maintenance procedures defined

#### MRA Outcomes

**1. Current State Assessment**
- Maturity rating for each CAF perspective (foundational, developing, competent, expert)
- Identification of organizational strengths and weaknesses
- Gap analysis highlighting blockers to successful migration

**2. Actionable Recommendations**
- Prioritized list of gaps to address before migration
- Specific actions with owners and timelines
- Training and skill development recommendations
- Third-party partnership recommendations

**3. Migration Readiness Roadmap**
- Phased plan to close identified gaps
- Timeline for achieving migration readiness
- Resource requirements and budget estimates
- Risk mitigation strategies

#### Best Practices

- Conduct MRA early in migration planning (before detailed application assessment)
- Engage stakeholders from all six CAF perspectives
- Revisit MRA periodically as organizational capabilities mature
- Use MRA findings to inform mobilize phase activities
- Address critical gaps before beginning large-scale migrations

**AWS Documentation:**
- [AWS Cloud Adoption Framework](https://aws.amazon.com/cloud-adoption-framework/)
- [Migration Readiness Assessment Guide](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-readiness/welcome.html)

## Landing Zone Preparation

A well-designed landing zone is the foundation for successful migration and long-term cloud operations. The landing zone establishes the multi-account structure, security controls, networking architecture, and operational baseline that migrated applications will use. Building the landing zone is typically completed during the Mobilize phase before Wave 1 migrations begin.

### AWS Control Tower

AWS Control Tower provides automated setup and governance for a secure, multi-account AWS environment based on AWS best practices. It automates the creation of a landing zone and provides ongoing governance through guardrails.

**Key Components:**

**1. Multi-Account Structure**

AWS Control Tower establishes a foundational account structure:

- **Management Account (root account)**
  - Billing consolidation and payment
  - AWS Organizations management
  - Control Tower administration
  - Should NOT run production workloads

- **Log Archive Account**
  - Centralized storage for all audit logs (CloudTrail, Config, VPC Flow Logs)
  - S3 buckets with restrictive access policies
  - Cross-account log delivery from all organization accounts
  - Long-term retention with S3 Lifecycle policies to Glacier

- **Audit Account**
  - Read-only access to all accounts for security and compliance teams
  - Security Hub aggregation across organization
  - GuardDuty delegated administrator
  - AWS Config aggregator for compliance reporting
  - Break-glass access for security incident response

- **Organizational Units (OUs)**
  - **Security OU:** Contains Log Archive and Audit accounts
  - **Sandbox OU:** Developer experimentation environments with restrictive SCPs
  - **Workloads OU:** Production and non-production application accounts
    - Production OU: Production workloads with strict guardrails
    - Non-Production OU: Development, test, staging environments
  - **Infrastructure OU:** Shared services (network hub, directory services, CI/CD)

**2. Guardrails**

Guardrails implement governance policies across all accounts:

**Preventive Guardrails (SCPs)**
- Service Control Policies that restrict actions at the account level
- Enforced in real-time - prevent non-compliant actions from occurring
- Cannot be overridden by local account administrators
- Examples:
  - Disallow public S3 buckets
  - Require encryption for EBS volumes
  - Prevent disabling of CloudTrail
  - Restrict regions where resources can be created
  - Deny deletion of security-related resources

**Detective Guardrails (AWS Config Rules)**
- Monitor for policy violations and configuration drift
- Alert when non-compliant configurations detected
- Displayed in Control Tower dashboard
- Examples:
  - Detect unencrypted RDS databases
  - Identify security groups allowing 0.0.0.0/0 access
  - Monitor for root account usage
  - Check for unrestricted SSH access

**Guardrail Categories:**
- **Mandatory:** Automatically enabled, cannot be disabled (e.g., disallow public write access to Log Archive bucket)
- **Strongly Recommended:** AWS best practices, should be enabled for most organizations
- **Elective:** Optional, based on specific compliance or security requirements

**3. Account Factory**

Automated account provisioning with consistent baselines:

- **Standardized account creation** through Service Catalog or console
- **Pre-configured baselines** including:
  - VPC with subnets in multiple Availability Zones
  - IAM Identity Center (SSO) access configured
  - CloudTrail and Config enabled and sending to Log Archive
  - Guardrails automatically applied based on OU
  - Standard tags for cost allocation
- **Self-service for teams** while maintaining central governance
- **Customizable blueprints** for different workload types
- **Integration with ITSM** systems via API

**4. Control Tower Dashboard**

Centralized visibility and governance:
- Account inventory across organization
- Guardrail compliance status
- Detected drift from landing zone baseline
- Account provisioning and lifecycle management
- Guardrail violation alerts

### Landing Zone Design Patterns for Migration

**Network Architecture:**

**Hub-and-Spoke with AWS Transit Gateway**
- Centralized network hub in Infrastructure OU
- Transit Gateway with route tables for isolation
- Spoke VPCs in workload accounts connect to hub
- Centralized egress/ingress through Network Firewall or NAT Gateway
- Hybrid connectivity (AWS Direct Connect, Site-to-Site VPN) terminates in hub
- Benefits: Simplified routing, centralized security, reduced PrivateLink costs

**Hybrid Connectivity**
- **AWS Direct Connect:** Dedicated 1 Gbps or 10 Gbps connection to on-premises
  - Low-latency, high-bandwidth connectivity for migration and ongoing operations
  - Private connection bypassing internet for security and performance
  - Redundant connections for high availability
- **Site-to-Site VPN:** IPsec tunnels for encrypted connectivity
  - Faster to provision than Direct Connect
  - Lower cost for smaller migrations
  - Can be used as backup for Direct Connect
- **AWS Transit Gateway integration** for simplified routing to all VPCs

**DNS Resolution Strategy**
- **Route 53 Resolver endpoints** for hybrid DNS:
  - Inbound endpoints: On-premises resolves AWS private hosted zones
  - Outbound endpoints: AWS resolves on-premises DNS names
- **Centralized Route 53 private hosted zones** shared across accounts
- **DNS firewall** to protect against DNS exfiltration attacks

**Security Baseline:**

**Identity and Access Management**
- **AWS IAM Identity Center (successor to AWS SSO):**
  - Centralized SSO for all accounts in organization
  - Integration with Active Directory or Okta
  - Permission sets defining access levels (Admin, ReadOnly, Developer)
  - Multi-factor authentication enforced
- **Service Control Policies (SCPs)** for organization-wide restrictions
- **IAM roles for cross-account access** instead of long-term credentials
- **IAM Access Analyzer** to identify external resource access

**Centralized Security Monitoring**
- **AWS CloudTrail:** All API calls logged to Log Archive account
  - Organization trail covering all accounts
  - Log file validation and encryption
  - Integration with CloudWatch Logs for alerting
- **AWS Config:** Track resource configuration changes
  - Centralized aggregator in Audit account
  - Compliance rules for security baselines
- **Amazon GuardDuty:** Threat detection across all accounts
  - Delegated administrator in Audit account
  - Automated threat findings aggregation
- **AWS Security Hub:** Centralized security findings
  - Aggregates findings from GuardDuty, Config, Inspector, Macie
  - CIS AWS Foundations Benchmark compliance
  - Integration with SIEM systems

**Data Protection**
- **AWS KMS:** Centralized key management
  - Separate KMS keys per environment (prod, non-prod)
  - Cross-account key access for shared services
- **Amazon Macie:** Sensitive data discovery in S3
- **AWS Secrets Manager:** Centralized credential management
  - Automatic rotation for database credentials
  - Cross-account secret sharing

**Operational Baseline:**

**Monitoring and Observability**
- **CloudWatch cross-account dashboards** in centralized operations account
- **CloudWatch Logs centralization** for log analytics
- **CloudWatch Application Insights** for automated monitoring
- **AWS Systems Manager OpsCenter** for operational issue management

**Patch and Configuration Management**
- **AWS Systems Manager Patch Manager** across all accounts
- **Systems Manager State Manager** for configuration compliance
- **Automation runbooks** for common operational tasks
- **Systems Manager Session Manager** for secure instance access (no SSH keys)

**Backup and Disaster Recovery**
- **AWS Backup** with centralized backup policies
- **Cross-Region backup** for critical workloads
- **Backup compliance monitoring** through AWS Backup reports
- **Recovery Time Objective (RTO) and Recovery Point Objective (RPO)** defined per application

**Cost Management**
- **Cost allocation tags** applied through Account Factory
- **AWS Budgets** with alerts for cost anomalies
- **Cost and Usage Reports** to S3 for analysis
- **AWS Cost Explorer** for cost visualization
- **Savings Plans and Reserved Instances** management at organization level

**Landing Zone Implementation Timeline:**

- **Week 1-2:** Requirements gathering, architecture design, account structure planning
- **Week 3-4:** Control Tower deployment, OU structure, initial guardrails
- **Week 5-6:** Network hub setup (Transit Gateway, Direct Connect), DNS configuration
- **Week 7-8:** Security baseline (Identity Center, GuardDuty, Security Hub)
- **Week 9-10:** Operational tooling (CloudWatch, Systems Manager, Backup)
- **Week 11-12:** Account Factory customization, testing, documentation

**AWS Documentation:**
- [AWS Control Tower User Guide](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
- [AWS Landing Zone Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-aws-environment/)
- [Multi-Account Strategy for AWS](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)

## Migration Wave Planning

Wave planning organizes the migration of hundreds or thousands of servers into logical, manageable groups (waves) that can be executed in sequence. Effective wave planning balances velocity, risk, and business impact while building team experience over time.

### Wave Planning Criteria and Grouping Strategies

**Application Dependencies**
- Migrate tightly coupled applications together in same wave
- Use Application Discovery Service dependency mapping to identify communication patterns
- Avoid splitting applications with synchronous dependencies across waves
- Consider cascading dependencies (A depends on B, B depends on C)
- Example: Migrate all three tiers of a web application (web, app, database) together

**Business Units or Teams**
- Align waves with organizational structure for clear ownership
- Single business unit per wave simplifies stakeholder management
- Enables parallel migrations when teams are independent
- Consider timezone and language differences for global organizations

**Migration Complexity and Risk**
- Group similar complexity levels together for specialized expertise
- Start with simple, low-risk applications to build confidence
- Reserve complex applications for later waves after team maturity
- Risk factors: Legacy OS, custom middleware, complex networking, compliance requirements

**Business Priority and Value**
- High-priority, high-value applications migrated early to deliver business benefits faster
- Balance "quick wins" with foundation-building
- Consider revenue impact and customer-facing systems

**Compliance and Regulatory Requirements**
- Group applications with similar compliance requirements (PCI-DSS, HIPAA, SOC 2)
- Allows focused compliance validation per wave
- May require specific security configurations in landing zone

**Shared Infrastructure Components**
- Migrate shared services (Active Directory, DNS, file servers) early
- Dependent applications migrate in subsequent waves
- Reduces rework and circular dependencies

**Geographic Location and Data Center**
- Group by data center for predictable network connectivity
- Aligns with data center lease expirations or exit schedules
- Minimizes cross-data-center dependencies during migration

### Wave Structure and Phasing

**Wave 0 - Foundation (Mobilize Phase)**

**Duration:** 8-12 weeks

**Objectives:**
- Establish landing zone with Control Tower
- Configure hybrid connectivity (Direct Connect, VPN)
- Deploy security baseline (GuardDuty, Security Hub, CloudTrail)
- Set up operational tooling (CloudWatch, Systems Manager)
- Create migration runbooks and automation
- Train migration teams on AWS and migration tools

**Deliverables:**
- Fully functional landing zone ready to receive workloads
- Network connectivity tested and validated
- Security controls operational and monitored
- Migration tools configured (MGN, DMS, Migration Hub)
- Team trained and certified

**Wave 1 - Pilot**

**Duration:** 2-4 weeks

**Server Count:** 3-5 low-risk, non-critical applications (10-20 servers)

**Objectives:**
- Validate migration process end-to-end
- Test landing zone configuration under real workload
- Train migration team with real applications
- Identify gaps in runbooks and automation
- Build confidence with stakeholders
- Establish performance baselines

**Application Selection Criteria:**
- Non-critical to business operations
- Simple architecture (ideally two-tier or simpler)
- Tolerant of brief downtime
- Representative of broader portfolio
- Willing business owner who understands this is a learning wave

**Success Criteria:**
- Applications running successfully in AWS
- Performance meets or exceeds on-premises baseline
- Migration completed within estimated timeline
- Lessons learned documented and incorporated
- Team demonstrates competency with migration tools

**Wave 2-N - Production Migrations**

**Duration:** 2-4 week cycles per wave

**Server Count:** 20-50 servers per wave initially, increasing to 100+ as velocity improves

**Objectives:**
- Execute migrations at scale with increasing velocity
- Apply lessons learned from previous waves
- Build migration factory efficiency
- Decommission on-premises infrastructure progressively

**Wave Composition:**
- Applications grouped by criteria above (dependencies, business unit, etc.)
- Mix of rehost and replatform strategies
- Include rollback plans for each application
- Schedule cutover windows during low-usage periods

**Typical Cadence:**
- Week 1: Finalize wave scope, replication begins
- Week 2: Testing in AWS, issue remediation
- Week 3: Cutover planning, stakeholder communication
- Week 4: Cutover execution, validation, on-premises decommission
- Continuous: Replication for next wave overlaps with current wave

**Final Wave - Complex and Business-Critical Applications**

**Timing:** After 70-80% of portfolio migrated and team is experienced

**Application Characteristics:**
- Business-critical systems requiring zero data loss
- Complex multi-tier architectures with many dependencies
- Applications with stringent performance requirements
- Legacy applications requiring extensive testing
- Systems with complex data migrations

**Approach:**
- Extended testing period with performance benchmarking
- Rehearse cutover multiple times in test environment
- Blue-green deployment for zero-downtime cutover
- Extended hypercare period post-migration
- Retain on-premises infrastructure as fallback for defined period

### Migration Factory Model

The Migration Factory is an industrialized, repeatable approach to large-scale migrations that improves velocity and quality over time.

**Organizational Model:**

**Centralized Migration Team (Factory Team)**
- **Migration Architects:** Design migration strategies, create runbooks
- **Migration Engineers:** Execute migrations using standardized processes
- **Automation Specialists:** Build and maintain migration automation
- **Quality Assurance:** Validate migrations, ensure standards compliance
- **Project Managers:** Coordinate waves, track progress, manage risks

**Federated Application Teams**
- Subject matter experts for applications being migrated
- Validate testing and cutover success
- Own post-migration optimization
- Provide application-specific knowledge to factory team

**Factory Components:**

**1. Standardized Runbooks**
- Step-by-step migration procedures for each application pattern
- Pre-migration checklist (dependencies, licensing, backup)
- Migration execution steps (MGN setup, replication, testing, cutover)
- Post-migration validation (functionality, performance, security)
- Rollback procedures if issues occur
- Template-based, customized per application

**2. Automation and Tools**
- **Infrastructure as Code:** Terraform or CDK for landing zone and application infrastructure
- **Migration tool automation:** APIs for MGN, DMS, Migration Hub
- **Post-migration configuration:** Systems Manager Automation for patching, monitoring setup
- **Testing automation:** Scripts to validate application functionality
- **Orchestration:** Step Functions or Jenkins pipelines to coordinate multi-step migrations

**3. Metrics and Dashboards**
- **Velocity metrics:** Servers migrated per week, time per server
- **Quality metrics:** Rollback rate, defect count, test pass rate
- **Progress tracking:** Applications migrated vs. total, burn-up charts
- **Resource utilization:** Team capacity, bottlenecks
- **Cost metrics:** Migration costs vs. budget, AWS consumption trends

**4. Continuous Improvement Process**
- **Weekly retrospectives:** Lessons learned from completed waves
- **Runbook updates:** Incorporate learnings into standardized procedures
- **Automation enhancements:** Identify repetitive tasks for automation
- **Skills development:** Training on new techniques and AWS services
- **Best practice sharing:** Cross-team knowledge transfer

**Factory Benefits:**

**Increased Velocity**
- Week 1-4 (Wave 1): 10 servers migrated
- Week 5-12 (Waves 2-4): 120 servers migrated (30 per wave)
- Week 13-24 (Waves 5-10): 600 servers migrated (100 per wave)
- Velocity typically doubles every 4-6 waves

**Improved Quality**
- Standardized runbooks reduce errors and rework
- Automated testing catches issues earlier
- Shared lessons prevent repeat mistakes
- Rollback rate decreases from 15% to under 3%

**Knowledge Concentration**
- Centralized expertise rather than distributed across teams
- Faster onboarding of new team members
- Documented institutional knowledge

**Economies of Scale**
- Reusable automation amortized across hundreds of migrations
- Bulk licensing agreements for migration tools
- Optimized resource utilization (team size, AWS consumption)

**Risk Reduction**
- Proven processes reduce migration failures
- Predictable timelines and costs
- Consistent security and compliance posture

### Wave Planning Best Practices

1. **Start with comprehensive discovery** - Use Application Discovery Service for minimum 14 days
2. **Build dependency maps** - Ensure applications migrate with their dependencies
3. **Set realistic wave sizes** - Don't overcommit in early waves
4. **Plan for 10-15% buffer** - Some applications will require additional time
5. **Schedule cutover windows carefully** - Avoid fiscal close periods, holiday blackouts
6. **Communicate extensively** - Stakeholder updates before, during, and after each wave
7. **Maintain fallback options** - Retain source infrastructure until validated in AWS
8. **Track and publish metrics** - Transparency builds confidence and identifies issues early
9. **Celebrate successes** - Recognize team accomplishments to maintain momentum
10. **Adapt based on learnings** - Don't rigidly follow plan if better approach emerges

**AWS Documentation:**
- [AWS Migration Hub Orchestrator](https://docs.aws.amazon.com/migrationhub-orchestrator/latest/userguide/what-is-migration-hub-orchestrator.html)
- [Large Migration Wave Planning](https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-governance-playbook/wave-planning.html)
- [Migration Factory Solution](https://aws.amazon.com/solutions/implementations/aws-cloudendure-migration-factory-solution/)

## SAP-C02 Exam Tips

**The 7 Rs Framework:**
- **Know all 7 Rs** (Rehost, Replatform, Repurchase, Refactor, Retire, Retain, Relocate) and decision criteria for each
- **Relocate** is the newest R, focusing on VMware Cloud on AWS and cross-Region/account moves
- **Retire** often overlooked but highest ROI - 10-20% of typical portfolios are retirement candidates
- **Retain** is for applications with valid business/technical reasons to defer migration, not "never migrate"
- For large-scale migrations, prioritize **Rehost, Replatform, Relocate, and Retire** for velocity
- **Refactor** should be applied selectively post-migration, not during initial migration waves

**Migration Tools:**
- **AWS Application Migration Service (MGN)** is the primary rehost tool (replaced CloudEndure Migration)
- **MGN** supports physical servers, VMware, Hyper-V, and cloud-to-cloud migrations with minimal downtime
- **Migration Hub** is for tracking and orchestration, not a migration execution tool
- **Migration Hub Strategy Recommendations** analyzes applications and suggests transformation strategies
- **VMware Cloud on AWS** enables relocate strategy for VMware environments

**Discovery and Assessment:**
- **Application Discovery Service** has two methods: agentless (VMware only) and agent-based (all platforms)
- Agent-based discovery provides process-level details and dependency mapping; agentless does not
- Discovery data stored in **Migration Hub home region** permanently
- **Migration Evaluator** builds data-driven business case with 3-year TCO analysis
- **Migration Readiness Assessment (MRA)** evaluates organizational readiness across 6 CAF perspectives

**Landing Zone:**
- **Landing zone must be ready before Wave 1 migrations** begin
- **AWS Control Tower** automates landing zone with multi-account structure and guardrails
- **Guardrails** are preventive (SCPs) or detective (Config Rules)
- Landing zone includes Management, Log Archive, Audit accounts plus workload OUs
- **Account Factory** provides self-service account provisioning with baseline configurations

**Wave Planning:**
- **Wave 0 (Foundation)** establishes landing zone before any migrations
- **Wave 1 (Pilot)** uses 3-5 low-risk applications to validate process
- Production waves organized by dependencies, business units, complexity, or priority
- **Migration Factory model** improves velocity through standardization and automation
- Applications with tight dependencies should migrate in same wave

**Key Concepts:**
- **Rehost is fastest** (days to weeks), **Refactor provides most cloud benefits** but takes longest (months)
- **Replatform** balances speed and optimization (e.g., EC2 database to RDS)
- **MGN replication lag** should be under 5 minutes before cutover
- **Continuous replication** in MGN enables non-disruptive testing
- **Blue-green cutover** achieves zero downtime for critical applications
- **Hybrid connectivity** (Direct Connect, VPN) required for migrations and retained applications

## Common Exam Scenario Patterns

**Scenario:** "Large-scale data center exit with 500+ servers, lease expiring in 12 months..."
**Solution:**
- Rehost strategy using AWS MGN for fastest migration
- Use Application Discovery Service for dependency mapping and inventory
- Organize into waves starting with pilot (3-5 apps), then 2-4 week production waves
- Track progress with Migration Hub
- Implement migration factory for standardization and velocity

**Scenario:** "CFO requires business justification and cost analysis before approving migration..."
**Solution:**
- Engage AWS Migration Evaluator to build data-driven business case
- Deliverable includes current state TCO, projected AWS costs, 3-year comparison
- Identifies quick wins and cost optimization opportunities
- Typically shows 30-50% cost reduction justifying migration investment

**Scenario:** "Organization wants to migrate quickly now, optimize for cloud-native features later..."
**Solution:**
- "Migrate first, optimize later" approach using Rehost (MGN)
- Establish AWS presence quickly with minimal risk
- Post-migration, selectively apply Replatform and Refactor to high-value applications
- Enables faster data center exit while preserving optimization opportunities

**Scenario:** "Setting up AWS environment for hundreds of migrated applications with strong governance requirements..."
**Solution:**
- Use AWS Control Tower to establish landing zone
- Multi-account structure with Management, Log Archive, Audit accounts
- Preventive guardrails (SCPs) to enforce policies
- Detective guardrails (Config Rules) to monitor compliance
- Account Factory for standardized account provisioning

**Scenario:** "Complex three-tier application with database dependencies must all migrate together..."
**Solution:**
- Use Application Discovery Service agent-based discovery for dependency mapping
- Migrate all tiers (web, app, database) in single wave to maintain dependencies
- Consider replatforming database to RDS during migration for operational benefits
- Test all tiers together in AWS before cutover
- Coordinate cutover window to migrate all components within same maintenance window

**Scenario:** "VMware environment with 200 VMs needs rapid migration, team has deep VMware expertise..."
**Solution:**
- Use Relocate strategy with VMware Cloud on AWS
- Preserves existing VMware tools, runbooks, and team skills
- Near-zero downtime migration
- Over time, selectively migrate VMs to native EC2 for cost optimization
- Hybrid approach balances speed with eventual cloud-native benefits

**Scenario:** "Portfolio discovery reveals 180 of 1,200 servers have zero usage or users in past 90 days..."
**Solution:**
- Apply Retire strategy to unused servers
- Archive data to S3 Glacier if regulatory retention required
- Immediate cost savings without migration effort
- Reduces migration scope by 15%, accelerating overall timeline
- Use Application Discovery Service utilization data to identify retirement candidates

**Scenario:** "Application requires sub-10ms latency to on-premises manufacturing equipment, cannot migrate to cloud..."
**Solution:**
- Apply Retain strategy with documented justification
- Set quarterly review date to revisit as AWS Outposts expands
- Implement hybrid architecture with Direct Connect for connectivity
- Track costs separately to evaluate future migration business case
- Consider AWS Outposts for future on-premises AWS deployment

**Scenario:** "Database migration from Oracle to PostgreSQL with minimal downtime requirement..."
**Solution:**
- Apply Replatform strategy using AWS DMS for continuous replication
- Use AWS Schema Conversion Tool to assess and convert schema
- Target Amazon Aurora PostgreSQL for managed service benefits
- DMS enables cutover with minutes of downtime
- Reduces licensing costs while improving availability and scalability

**Scenario:** "Organization scored low on People and Governance perspectives in Migration Readiness Assessment..."
**Solution:**
- Address gaps during Mobilize phase before starting migrations
- Develop cloud skills training and certification plan
- Establish cloud governance model with policies and standards
- Define roles and responsibilities for cloud operating model
- Delay Wave 1 migrations until critical capability gaps addressed

## Key Takeaways for SAP-C02

1. **7 Rs are decision framework** - Each application in portfolio should be assigned one of 7 strategies
2. **Tools have specific purposes** - MGN for rehost, DMS for databases, Migration Hub for tracking
3. **Discovery before strategy** - Application Discovery Service data informs migration strategy selection
4. **Landing zone is prerequisite** - Must be ready before migrations begin, built during Mobilize phase
5. **Wave planning manages scale** - Pilot wave validates process, production waves build velocity
6. **Migration Factory industrializes** - Standardization and automation improve quality and speed
7. **Not everything migrates** - Retire and Retain are valid strategies, don't force-fit all applications
8. **Assessment tools** - Migration Evaluator for business case, MRA for organizational readiness
9. **Minimal downtime is achievable** - MGN and DMS enable minutes of downtime for most migrations
10. **Governance from start** - Control Tower guardrails prevent configuration drift and non-compliance

## AWS Documentation and Resources

**Migration Strategies:**
- [AWS Migration Strategies (7 Rs)](https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html)
- [AWS Cloud Migration Guide](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-guide/)

**Migration Tools:**
- [AWS Application Migration Service (MGN)](https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html)
- [AWS Migration Hub User Guide](https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html)
- [AWS Application Discovery Service](https://docs.aws.amazon.com/application-discovery/latest/userguide/what-is-appdiscovery.html)

**Planning and Assessment:**
- [AWS Migration Evaluator](https://aws.amazon.com/migration-evaluator/)
- [Migration Readiness Assessment](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-readiness/welcome.html)
- [AWS Cloud Adoption Framework](https://aws.amazon.com/cloud-adoption-framework/)

**Landing Zone and Governance:**
- [AWS Control Tower User Guide](https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html)
- [AWS Landing Zone Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-aws-environment/)
- [Multi-Account AWS Environment](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)

**Wave Planning and Execution:**
- [Large Migration Wave Planning](https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-governance-playbook/wave-planning.html)
- [AWS Migration Hub Orchestrator](https://docs.aws.amazon.com/migrationhub-orchestrator/latest/userguide/what-is-migration-hub-orchestrator.html)
- [Cloud Migration Factory on AWS](https://aws.amazon.com/solutions/implementations/aws-cloudendure-migration-factory-solution/)

**Whitepapers:**
- [AWS Migration Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/aws-migration-whitepaper/aws-migration-whitepaper.html)
- [AWS Well-Architected Framework - Operational Excellence Pillar](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html)
