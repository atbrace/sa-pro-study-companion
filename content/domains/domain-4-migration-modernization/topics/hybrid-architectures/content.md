# Hybrid Cloud Architectures

## Overview

Hybrid cloud architectures enable organizations to extend their on-premises infrastructure into AWS while maintaining seamless connectivity, consistent operations, and unified management. These architectures are critical for migration scenarios, regulatory compliance, low-latency requirements, and gradual cloud adoption strategies.

## Hybrid Networking

### AWS Direct Connect

**Architecture:**
- Dedicated private network connection from on-premises to AWS
- Bypasses public internet for predictable performance
- Available in 1 Gbps, 10 Gbps, and 100 Gbps port speeds
- Hosted connections available in smaller increments (50 Mbps to 10 Gbps)

**Key Features:**
- **Virtual Interfaces (VIFs):**
  - Private VIF: Connect to VPCs via Virtual Private Gateway (VGW)
  - Public VIF: Access AWS public services (S3, DynamoDB) privately
  - Transit VIF: Connect to AWS Transit Gateway for multi-VPC access
- **Link Aggregation Groups (LAG):** Aggregate multiple connections for higher bandwidth
- **MACsec Encryption:** Native layer 2 encryption for 10 Gbps and 100 Gbps connections
- **Direct Connect Gateway:** Connect to VPCs across multiple regions from single DX location

**Resilience Patterns:**
- **High Availability:** Multiple DX connections at same location
- **Maximum Resilience:** DX connections at multiple locations
- **Hybrid Resilience:** Primary DX with VPN failover using BGP routing priorities

**Use Cases:**
- Large-scale data transfer requirements (>1 TB regularly)
- Predictable network performance for latency-sensitive workloads
- Accessing AWS services privately without internet traversal
- Hybrid architectures requiring consistent bandwidth

### AWS Site-to-Site VPN

**Architecture:**
- IPsec VPN tunnels over public internet
- Two tunnels per VPN connection for redundancy
- Supports static routing or dynamic BGP routing
- Maximum throughput: 1.25 Gbps per tunnel (up to 2.5 Gbps with ECMP)

**Accelerated VPN:**
- Integrates with AWS Global Accelerator
- Routes traffic through AWS global network
- Improved performance and reduced jitter

**VPN CloudHub:**
- Hub-and-spoke model for connecting multiple sites
- Uses single Virtual Private Gateway
- Sites communicate with each other through AWS

**Certificate-Based Authentication:**
- AWS Certificate Manager Private CA integration
- Enhanced security for VPN endpoints

**Use Cases:**
- Quick hybrid connectivity setup
- Backup connectivity for Direct Connect
- Temporary connections for migrations
- Remote office connectivity with moderate bandwidth needs

### Transit Gateway for Hybrid Connectivity

**Hybrid Integration:**
- Centralized hub for connecting VPCs, Direct Connect, and VPN
- Supports up to 50 Gbps per VPN connection with ECMP
- Route table segmentation for traffic isolation
- Inter-region peering for global hybrid networks

**Design Patterns:**
- **Centralized Egress:** Route all internet traffic through on-premises security appliances
- **Segmented Hybrid:** Separate route tables for production, development, shared services
- **Multi-Region Hub:** Transit Gateway peering for global hybrid connectivity

## Hybrid Storage Solutions

### AWS Storage Gateway

**File Gateway:**
- **Protocol:** NFS and SMB file shares
- **Backend:** Objects stored in S3 (Standard, Standard-IA, One Zone-IA, Intelligent-Tiering)
- **Caching:** Local cache for frequently accessed data
- **Use Cases:**
  - File share migration to cloud
  - Backup and archival to S3
  - Cloud-based data processing with on-premises access
  - Disaster recovery file stores

**Volume Gateway:**
- **Cached Volumes:**
  - Primary data in S3, frequently accessed data cached locally
  - Up to 32 volumes, 32 TB each (1 PB total)
  - Low-latency access to recent data
- **Stored Volumes:**
  - Complete dataset stored on-premises
  - Asynchronous snapshots to S3
  - Up to 32 volumes, 16 TB each (512 TB total)
  - Full local data access with cloud backup
- **Protocol:** iSCSI block storage
- **Use Cases:**
  - Database backup and disaster recovery
  - Application migration with block storage requirements
  - Lift-and-shift migrations

**Tape Gateway:**
- **Protocol:** iSCSI Virtual Tape Library (VTL)
- **Backend:** Virtual tapes in S3 and Glacier
- **Compatibility:** Major backup applications (Veeam, Veritas, Commvault)
- **Capacity:** Up to 1,500 virtual tapes, 150 TB total in cache
- **Use Cases:**
  - Replace physical tape infrastructure
  - Long-term archival compliance
  - Tape backup modernization

**Hardware Appliance:**
- Pre-configured physical server for locations without virtualization
- Supports all gateway types
- Simplified deployment for branch offices

### AWS DataSync

**Architecture:**
- Agent-based data transfer service
- Automatic encryption in transit (TLS)
- Built-in data integrity verification
- Bandwidth throttling and scheduling

**Data Sources:**
- On-premises NFS and SMB file servers
- Self-managed cloud storage
- AWS Storage Gateway
- HDFS (Hadoop Distributed File System)

**Destinations:**
- Amazon S3 (all storage classes)
- Amazon EFS
- Amazon FSx (Windows File Server, Lustre, NetApp ONTAP, OpenZFS)

**Performance:**
- Up to 10 Gbps per agent
- Parallel transfers with multiple agents
- Incremental transfers after initial sync

**Advanced Features:**
- **Task Scheduling:** Automated recurring transfers
- **Filtering:** Include/exclude patterns for selective sync
- **Metadata Preservation:** Permissions, timestamps, ownership
- **Verification:** Automatic checksum validation
- **VPC Endpoints:** Private connectivity without internet

**Use Cases:**
- Large-scale data migrations (petabyte-scale)
- Active data distribution to multiple regions
- Data lake ingestion from on-premises sources
- Automated backup and archival workflows
- Content distribution for media and entertainment

**DataSync vs. Storage Gateway:**
- DataSync: One-time or scheduled bulk transfers
- Storage Gateway: Continuous hybrid storage integration

## Physical Data Transfer: Snow Family

### AWS Snowball Edge

**Snowball Edge Storage Optimized:**
- 80 TB usable HDD storage
- 1 TB SSD for high-performance operations
- 40 vCPUs, 80 GiB memory
- S3-compatible storage interface
- EC2 compute instances for edge processing

**Snowball Edge Compute Optimized:**
- 42 TB usable HDD storage + 7.68 TB NVMe SSD
- 52 vCPUs, 208 GiB memory
- Optional GPU for ML inference
- Enhanced compute for edge processing

**Clustering:**
- 5-10 devices for local storage and compute
- Durable, scalable on-premises storage pool
- S3 interface with increased performance

**Use Cases:**
- Data center migration (50-80 TB per device)
- Edge computing with local processing
- Content distribution to remote locations
- Tactical edge deployments (military, disaster response)
- Manufacturing and industrial IoT

### AWS Snowcone

**Specifications:**
- 8 TB usable HDD storage (Snowcone) or 14 TB SSD (Snowcone SSD)
- 2 vCPUs, 4 GiB memory
- Smallest device in Snow Family (4.5 lbs)
- Battery and power adapter included

**Connectivity:**
- Wi-Fi, wired network, or USB-C
- Can ship back or use DataSync for online transfer

**Use Cases:**
- Edge locations with space/power constraints
- IoT data collection in remote environments
- Drone and mobile edge computing
- Small office data migrations (<10 TB)

### AWS Snowmobile

**Specifications:**
- 100 PB capacity per Snowmobile
- Ruggedized shipping container
- GPS tracking and security escort
- Temperature controlled

**Process:**
- AWS delivers 45-foot container to data center
- High-speed network connection (multiple 10 Gbps)
- Fill container over weeks/months
- AWS transports to region and uploads

**Use Cases:**
- Exabyte-scale data center migrations
- Video libraries and media archives
- Large-scale genomics datasets
- When multiple Snowball Edge devices would be impractical

### Snow Family Selection Criteria

| Data Size | Recommended Device | Timeline |
|-----------|-------------------|----------|
| < 10 TB | Snowcone or DataSync | Days |
| 10-80 TB | Snowball Edge | 1-2 weeks |
| 80 TB - 10 PB | Multiple Snowball Edge | Weeks to months |
| > 10 PB | Snowmobile | Months |

**Decision Factors:**
- Available network bandwidth and cost
- Data transfer timeline requirements
- Need for edge computing capabilities
- Physical space and power constraints
- Security and compliance requirements

## On-Premises AWS Extensions

### AWS Outposts

**Architecture:**
- Fully managed AWS infrastructure deployed on-premises
- Same hardware, APIs, tools, and capabilities as AWS regions
- Available in 1U, 2U rack servers or 42U full racks
- Outpost capacity: 1, 2, 3, or 4 racks

**Connectivity:**
- Requires reliable network connection to parent AWS region
- Service Link: Low-bandwidth control plane connection
- Local Gateway: On-premises networking integration
- VPC extension from region spans to Outpost

**Available Services:**
- **Compute:** EC2 instances with same instance families
- **Storage:** EBS volumes, S3 on Outposts
- **Database:** RDS (MySQL, PostgreSQL), ElastiCache
- **Container:** ECS, EKS
- **Analytics:** EMR

**Deployment Models:**
- **Outpost Rack:** Full rack or multi-rack deployments
- **Outpost Server:** 1U or 2U servers for small footprints

**Use Cases:**
- Data residency and sovereignty requirements
- Local data processing with single-digit millisecond latency
- On-premises systems requiring AWS service integration
- Migrating applications with low-latency hardware dependencies
- Modernizing on-premises infrastructure with cloud services

**Networking Patterns:**
- **Local Gateway Route Table:** Route traffic between Outpost and on-premises network
- **VPC Route Table:** Route traffic between Outpost subnets and AWS region
- **Customer-Owned IP (CoIP):** Use on-premises IP addresses on Outpost resources

### VMware Cloud on AWS

**Architecture:**
- VMware SDDC (Software-Defined Data Center) running on AWS infrastructure
- Full VMware vSphere, vSAN, NSX, vCenter integration
- Dedicated, bare-metal AWS hosts
- Minimum 2 hosts, scale to 16 hosts per cluster

**Management:**
- Single pane of glass for hybrid cloud management
- vCenter integration with on-premises VMware environments
- VMware HCX for workload migration
- Consistent policies, tools, and skill sets

**Networking:**
- Dedicated VPC in AWS account
- Elastic Network Interface (ENI) for AWS service integration
- VMware NSX for software-defined networking
- Direct Connect or VPN for on-premises connectivity

**AWS Service Integration:**
- Native access to AWS services (S3, RDS, Lambda, etc.)
- Attach FSx for NetApp ONTAP, FSx for Windows File Server
- Elastic Disaster Recovery integration
- AWS native backup and disaster recovery

**Use Cases:**
- Data center extension and migration
- Disaster recovery for VMware workloads
- Application modernization with VMware investments
- Burst capacity for on-premises VMware environments
- Cloud migration without re-platforming

**Migration Strategies:**
- **VMware HCX:** Live migration with minimal downtime
- **vMotion:** Move running VMs between on-premises and cloud
- **Cold Migration:** Shutdown and transfer for non-critical workloads
- **Hybrid Operating Model:** Keep some workloads on-premises, others in cloud

## Hybrid Networking Patterns

### Pattern 1: Centralized Hybrid Connectivity

**Architecture:**
- Transit Gateway as central hub
- Direct Connect and VPN attachments
- Multiple VPCs in spoke configuration
- Centralized network monitoring and management

**Benefits:**
- Simplified routing and management
- Scalable to hundreds of VPCs
- Centralized security controls
- Cost-effective hybrid connectivity

### Pattern 2: Segregated Hybrid Environments

**Architecture:**
- Multiple Transit Gateway route tables
- Separate connectivity for production, development, shared services
- Inter-table routing for controlled communication
- Isolated failure domains

**Benefits:**
- Enhanced security through segmentation
- Compliance with data separation requirements
- Independent scaling of environments
- Reduced blast radius for issues

### Pattern 3: Multi-Region Hybrid Hub

**Architecture:**
- Transit Gateways in multiple regions
- Inter-region peering between Transit Gateways
- Regional Direct Connect or VPN attachments
- Global routing for disaster recovery

**Benefits:**
- Global application reach
- Regional failover capabilities
- Compliance with data locality requirements
- Reduced latency for distributed users

### Pattern 4: Edge-to-Cloud Continuum

**Architecture:**
- AWS Outposts or VMware Cloud for edge compute
- Direct Connect for primary connectivity
- VPN for backup and remote sites
- Snowball Edge for disconnected edge locations

**Benefits:**
- Consistent hybrid experience
- Data processing at multiple tiers
- Support for disconnected operations
- Gradual migration path

## Design Considerations

### Network Design

**Bandwidth Planning:**
- Assess current and projected data transfer volumes
- Consider Direct Connect for >1 TB monthly transfers
- Plan for burst capacity and growth
- Implement monitoring and alerting

**Latency Requirements:**
- Direct Connect for consistent low latency
- Outposts for single-digit millisecond requirements
- VPN acceptable for latency-tolerant workloads
- Consider regional proximity and routing

**Resilience:**
- Always implement redundant connections
- Use multiple Direct Connect locations for critical workloads
- VPN as backup for Direct Connect
- Test failover procedures regularly

### Storage Design

**Access Patterns:**
- File Gateway for file-based workloads
- Volume Gateway for block storage and databases
- DataSync for migration and scheduled transfers
- Snow Family for bandwidth-constrained or large-scale transfers

**Performance:**
- Cache sizing based on working set
- Local storage for latency-sensitive operations
- Bandwidth throttling to prevent network saturation
- S3 transfer acceleration for global distribution

**Data Lifecycle:**
- S3 lifecycle policies for automatic tiering
- Tape Gateway for long-term archival
- Regular backup and snapshot schedules
- Disaster recovery testing

### Compute Design

**Workload Placement:**
- Outposts for data residency and low-latency requirements
- VMware Cloud for existing VMware investments
- EC2 for cloud-native applications
- Hybrid for gradual migration strategies

**Management:**
- Consistent tooling across environments
- Centralized monitoring and logging
- Automated patch management
- Configuration management (Systems Manager)

### Security Design

**Network Security:**
- Private connectivity with Direct Connect or VPN
- Network segmentation with Transit Gateway
- Encryption in transit (MACsec, IPsec, TLS)
- AWS Network Firewall or third-party appliances

**Data Security:**
- Encryption at rest for all storage services
- Key management with AWS KMS
- IAM roles for service access
- Audit logging with CloudTrail and VPC Flow Logs

**Compliance:**
- Data residency controls with Outposts
- Regulatory requirements for data transfer
- Audit trails for all data movements
- Regular compliance assessments

## Cost Optimization

**Network Costs:**
- Direct Connect reduces data transfer costs vs. internet
- VPN charged hourly plus data transfer
- Transit Gateway charged per attachment and data processed
- Inter-region data transfer costs

**Storage Costs:**
- Storage Gateway: Gateway VM/appliance + storage in AWS
- S3 tiering for infrequently accessed data
- DataSync: Per-GB transferred pricing
- Snow Family: Device rental fees plus shipping

**Compute Costs:**
- Outposts: Upfront commitment (1 or 3 years)
- VMware Cloud: Host-based pricing
- Data transfer out charges
- Consider AWS Cost Explorer for optimization

## Monitoring and Operations

**Key Metrics:**
- Direct Connect: Connection state, bandwidth utilization, errors
- VPN: Tunnel status, throughput, latency
- Storage Gateway: Cache hit rate, upload buffer, throughput
- DataSync: Task status, files transferred, throughput
- Outposts: Instance health, storage utilization, connectivity

**Operational Tools:**
- CloudWatch for metrics and alarms
- VPC Flow Logs for network analysis
- Systems Manager for hybrid management
- AWS Health Dashboard for service events
- Third-party monitoring integration

## Summary

Hybrid cloud architectures require careful planning across networking, storage, compute, and security dimensions. Key decisions include:

1. **Connectivity:** Choose Direct Connect for predictable performance and large data volumes, VPN for quick setup and backup connectivity
2. **Storage Integration:** Select Storage Gateway mode based on protocol and access patterns, use DataSync for migrations, Snow Family for physical transfers
3. **On-Premises Extensions:** Use Outposts for AWS services on-premises, VMware Cloud for existing VMware investments
4. **Architecture Patterns:** Implement Transit Gateway hub models, plan for redundancy, and design for future scale

Success in hybrid architectures comes from understanding the full range of AWS hybrid services and selecting the right combination for specific business and technical requirements.
