---
title: Network Connectivity Strategies
lastUpdated: 2026-01-06
---

# Network Connectivity Strategies

Designing network connectivity for complex AWS environments requires deep understanding of Transit Gateway, Direct Connect, VPN, VPC peering, and PrivateLink architectures. At the SAP-C02 level, you must be able to architect solutions that scale to hundreds of VPCs, provide high availability across regions, and integrate seamlessly with on-premises infrastructure while maintaining security and cost optimization.

This topic covers centralized network architectures, hybrid connectivity patterns, multi-region designs, and service-specific connectivity strategies that are critical for enterprise AWS deployments.

## AWS Transit Gateway

AWS Transit Gateway acts as a cloud router that simplifies network architecture by providing a central hub to connect Amazon VPCs, AWS accounts, and on-premises networks through a single gateway. It eliminates the need for complex peering relationships and reduces operational overhead in multi-VPC environments.

### Architecture and Capabilities

Transit Gateway operates at the regional level and supports up to 5,000 VPC attachments per gateway. Each attachment can be a VPC, VPN connection, Direct Connect gateway, or peering connection to another Transit Gateway. This hub-and-spoke model dramatically simplifies network topology compared to full-mesh VPC peering.

**Key scaling characteristics:**
- Up to 50 Gbps bandwidth per VPC attachment (with ECMP across multiple tunnels)
- 5,000 attachments per Transit Gateway
- Support for 10,000 routes per route table
- Up to 20 route tables per Transit Gateway
- Inter-region peering bandwidth up to 50 Gbps per peering connection

### Route Table Architecture

Transit Gateway route tables are the core mechanism for controlling traffic flow. Unlike VPC route tables, Transit Gateway route tables determine which attachments can communicate with each other, enabling sophisticated network segmentation strategies.

**Common routing patterns:**

1. **Isolated routing**: Development, staging, and production environments each have dedicated route tables that only route to shared services VPCs (DNS, logging, security tools) but not to each other.

2. **Shared services model**: A central shared services VPC (containing Active Directory, DNS resolvers, logging infrastructure) is propagated to all environment-specific route tables, but environment VPCs cannot reach each other.

3. **Inspection architecture**: All inter-VPC traffic routes through a dedicated inspection VPC containing next-generation firewalls or AWS Network Firewall before reaching the destination.

4. **Egress-only routing**: Workload VPCs can only route to an egress VPC for internet access via NAT Gateways or proxy servers, preventing direct internet gateways in workload VPCs.

**Route propagation vs. static routes**: VPC attachments can automatically propagate their CIDR blocks to Transit Gateway route tables, or you can define static routes for more granular control. Static routes are required for overlapping CIDR ranges or when you need to override propagated routes.

### Transit Gateway Peering

Transit Gateway peering enables connectivity between Transit Gateways in different AWS Regions or different AWS accounts. This is essential for multi-region architectures and cross-account network designs.

**Peering characteristics:**
- Peering connections are encrypted and traverse the AWS global network
- No bandwidth charges between regions in the same partition (commercial, GovCloud, China)
- Static routes required (no automatic route propagation across peering connections)
- Supports transitive routing: Region A → Region B → Region C is possible with proper route configuration

**Use case**: A global enterprise has production workloads in us-east-1, eu-west-1, and ap-southeast-1. Transit Gateway peering connects these regions, allowing applications in Virginia to access shared databases in Ireland while maintaining regional isolation for compliance.

### Multicast Support

Transit Gateway is the only AWS service that natively supports IP multicast within VPCs. This is critical for applications that require one-to-many communication patterns, such as financial market data distribution, video streaming, or industrial IoT sensor networks.

**Multicast configuration:**
- Create multicast domain attached to Transit Gateway
- Associate VPC subnets as multicast members
- Register EC2 instances as multicast sources or receivers
- Supports Internet Group Management Protocol version 2 (IGMPv2)

**AWS Documentation:**
- [Transit Gateway Overview](https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html)
- [Transit Gateway Route Tables](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit Gateway Peering](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html)
- [Transit Gateway Multicast](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-multicast-overview.html)

## AWS Direct Connect

AWS Direct Connect establishes dedicated, private network connections from your data center or colocation facility to AWS, bypassing the public internet. This provides more consistent network performance, reduced bandwidth costs, and enhanced security compared to internet-based connections.

### Connection Types and Bandwidth

**Dedicated Connections**: Physical Ethernet port dedicated to your account
- Available in 1 Gbps, 10 Gbps, and 100 Gbps capacities
- Deployed at AWS Direct Connect locations (150+ globally)
- Single-mode fiber connectivity using 1000BASE-LX or 10GBASE-LR

**Hosted Connections**: Provided through AWS Direct Connect Partners
- Available in capacities from 50 Mbps to 10 Gbps
- Faster provisioning (minutes to hours vs. days for dedicated)
- Ideal for sub-1 Gbps requirements or when Direct Connect location access is limited

### Virtual Interfaces (VIFs)

Virtual Interfaces are logical connections that run on top of physical Direct Connect connections. Each VIF type serves different connectivity requirements.

#### Private VIF
Connects to VPC resources using private IP addresses from RFC 1918 address space. Traffic never traverses the public internet.

**Architecture considerations:**
- Attach to Virtual Private Gateway (VGW) for single-VPC access
- Attach to Direct Connect Gateway for multi-VPC access (up to 10 VPCs across any region)
- BGP required for route advertisement between on-premises and AWS
- Supports BGP communities for route preference and AS-path prepending

**Use case**: Enterprise migrating SAP HANA workload requires low-latency, high-bandwidth access to EC2 instances and RDS databases using private connectivity.

#### Public VIF
Provides access to AWS public endpoints (S3, DynamoDB, etc.) using public IP addresses over your private connection, avoiding internet gateway usage.

**Key characteristics:**
- Advertises all AWS public IP ranges for the region via BGP
- You must own the public IP addresses used on your side of the connection
- Traffic is NOT encrypted by default (use VPN or application-layer encryption)
- Does NOT provide access to resources in VPCs

**Use case**: On-premises backup system needs high-throughput uploads to S3 without consuming internet bandwidth or traversing public internet.

#### Transit VIF
Connects directly to AWS Transit Gateway, enabling connectivity to multiple VPCs across multiple AWS Regions through a single VIF.

**Architecture advantages:**
- Single Direct Connect connection can reach hundreds of VPCs via Transit Gateway
- Simplifies network management compared to multiple Private VIFs
- Supports Equal-Cost Multi-Path (ECMP) routing for bandwidth scaling
- Transit Gateway can be in any region (not limited to Direct Connect location region)

**Bandwidth aggregation example**: Four 10 Gbps Direct Connect connections with Transit VIFs can deliver up to 40 Gbps aggregate bandwidth to a single VPC using ECMP.

### High Availability and Resiliency

AWS recommends multiple layers of redundancy for production Direct Connect deployments:

**Maximum Resiliency (SLA 99.99%)**:
- Two dedicated connections from two different Direct Connect locations
- Each location in separate facilities with diverse network providers
- Connections terminate on separate on-premises routers
- VPN backup connections over internet for additional failover

**High Resiliency**:
- Two connections from single Direct Connect location
- Connections to separate devices in the location
- BGP failover between connections

**Development/Test Environments**:
- Single connection with VPN backup
- VPN automatically activated via BGP failover when Direct Connect fails

**BGP configuration for failover**:
- Use AS-path prepending to influence return traffic routing
- Set Local Preference on-premises to control outbound traffic preference
- Configure BFD (Bidirectional Forwarding Detection) for sub-second failure detection
- Implement BGP communities (7224:9100 for local preference, 7224:9200 for medium preference)

### Direct Connect Gateway

Direct Connect Gateway is a globally available resource that connects Direct Connect to VPCs across multiple regions without requiring VPN or Transit Gateway peering.

**Key capabilities:**
- Associate up to 10 VPCs from any AWS Region to a single Direct Connect Gateway
- VPCs cannot have overlapping CIDR blocks when attached to the same Direct Connect Gateway
- Integrates with Transit Gateway for access to thousands of VPCs
- No additional charge for Direct Connect Gateway itself

**Architecture pattern**: Global company with data centers in New York and London uses two Direct Connect locations, each with connections to a Direct Connect Gateway that provides access to VPCs in us-east-1, us-west-2, eu-west-1, and ap-southeast-1.

### Link Aggregation Groups (LAG)

LAG allows you to aggregate multiple Direct Connect connections into a single logical connection using IEEE 802.1AX-2008 standard.

**LAG requirements:**
- All connections must be dedicated connections (not hosted)
- All connections must use same bandwidth
- All connections must terminate at same Direct Connect location
- Maximum 4 connections per LAG

**Use case**: Aggregate four 10 Gbps connections into a 40 Gbps LAG for high-throughput database replication between on-premises data warehouse and Amazon Redshift.

**AWS Documentation:**
- [Direct Connect Overview](https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html)
- [Virtual Interfaces](https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html)
- [Direct Connect Resiliency](https://docs.aws.amazon.com/directconnect/latest/UserGuide/resiliency_toolkit.html)
- [Direct Connect Gateway](https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways.html)
- [Direct Connect SLA](https://aws.amazon.com/directconnect/sla/)

## VPN Connectivity

AWS provides multiple VPN options for secure, encrypted connectivity over the internet. VPNs are commonly used as backup connections for Direct Connect or as primary connectivity for remote offices and teleworkers.

### AWS Site-to-Site VPN

Site-to-Site VPN creates encrypted IPsec tunnels between your on-premises network and AWS VPCs.

**Architecture components:**
- **Virtual Private Gateway (VGW)**: AWS side of VPN, attached to VPC
- **Customer Gateway**: Represents your on-premises VPN device
- **VPN Connection**: Two IPsec tunnels for redundancy (each tunnel terminates in different Availability Zone)

**Key characteristics:**
- Maximum bandwidth: 1.25 Gbps per tunnel (up to 50 Gbps aggregate with ECMP across multiple tunnels)
- Automatic failover between tunnels
- Supports dynamic routing (BGP) or static routing
- Can attach to Transit Gateway for multi-VPC access

**ECMP for bandwidth scaling**: Create multiple VPN connections (up to 6) with identical BGP configuration. Transit Gateway distributes traffic across all tunnels, providing up to 7.5 Gbps aggregate bandwidth.

### AWS Client VPN

Managed client-based VPN service that enables remote users to securely access AWS resources and on-premises networks.

**Key features:**
- OpenVPN-based, works with standard OpenVPN clients
- Support for Active Directory, SAML-based federated authentication, and client certificate authentication
- Split-tunnel or full-tunnel configurations
- Automatic high availability across multiple Availability Zones
- CloudWatch Logs integration for connection logging

**Use case**: Remote workforce of 2,000 employees needs secure access to applications running in VPCs and on-premises data center, with authentication via corporate Active Directory and MFA.

### Accelerated Site-to-Site VPN

Uses AWS Global Accelerator to route VPN traffic through AWS global network rather than public internet, improving performance and reliability.

**Benefits:**
- Reduced latency and jitter
- Improved throughput consistency
- Automatic routing to optimal AWS edge location
- Additional cost compared to standard Site-to-Site VPN

**When to use**: Multi-region deployments where on-premises users access AWS resources in distant regions, or networks with unreliable internet connectivity.

**AWS Documentation:**
- [Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html)
- [AWS Client VPN](https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/what-is.html)
- [Accelerated Site-to-Site VPN](https://docs.aws.amazon.com/vpn/latest/s2svpn/accelerated-vpn.html)

## VPC Peering

VPC Peering creates a direct network connection between two VPCs, enabling traffic to route using private IP addresses as if they were in the same network.

### Architecture Characteristics

**Key limitations to understand for SAP-C02:**
- VPC Peering is NOT transitive: If VPC A peers with VPC B, and VPC B peers with VPC C, VPC A cannot reach VPC C through VPC B
- CIDR blocks cannot overlap between peered VPCs
- Maximum 125 peering connections per VPC
- Peering connections are 1-to-1 (requires full mesh for many VPCs)

**Cross-region peering:**
- Encrypted traffic over AWS global network
- No single point of failure
- Data transfer charges apply between regions
- Same VPC peering limits as in-region peering

### When to Use VPC Peering vs. Transit Gateway

**Use VPC Peering when:**
- Connecting small number of VPCs (typically < 10)
- Latency is critical (VPC Peering has lowest latency, no hop through Transit Gateway)
- Cost optimization for high-bandwidth workloads (no hourly charges, only data transfer)
- VPCs are in separate accounts with minimal central management

**Use Transit Gateway when:**
- Connecting many VPCs (> 10-15)
- Need centralized routing policy and network segmentation
- Require connectivity to on-premises via VPN or Direct Connect
- Need transitive routing between VPCs
- Implementing inspection architecture (firewall VPC)

**Cost comparison example**: Two VPCs exchanging 10 TB/month within same region:
- VPC Peering: $100 data transfer (0.01/GB)
- Transit Gateway: $146 attachment fees + $100 data processing + $100 data transfer = $346

### Inter-Region Peering Considerations

**Benefits:**
- Disaster recovery and multi-region applications
- Data replication between regions
- Shared services access across regions

**Considerations:**
- Plan for CIDR uniqueness across all regions
- Understand data transfer pricing between regions
- Security group rules cannot reference security groups in peered VPC in different region (use CIDR ranges)

**AWS Documentation:**
- [VPC Peering Guide](https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html)
- [VPC Peering Scenarios](https://docs.aws.amazon.com/vpc/latest/peering/peering-scenarios.html)
- [Inter-Region Peering](https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html)

## AWS PrivateLink

AWS PrivateLink enables private connectivity between VPCs, AWS services, and on-premises networks without exposing traffic to the public internet. It provides a scalable way to expose services to thousands of VPCs.

### Architecture and Use Cases

**VPC Endpoint Services (powered by PrivateLink):**
- Service provider creates Network Load Balancer in their VPC
- Service provider creates VPC endpoint service
- Service consumers create interface endpoints in their VPCs
- Traffic uses private IP addresses and never leaves AWS network

**Key characteristics:**
- No VPC peering required
- No overlapping CIDR concerns
- Scales to thousands of consumer VPCs
- Consumer-initiated connections (provider VPC cannot initiate connections back)
- Endpoint policies for granular access control

**Scenario 1 - SaaS Provider**: Company provides SaaS application to 500 enterprise customers, each with their own AWS account. Instead of VPC peering with each customer, they use PrivateLink. Customers create interface endpoints in their VPCs and connect to the service privately.

**Scenario 2 - Shared Services**: Central IT team maintains shared services (logging, monitoring, security scanning) in dedicated VPC. All application VPCs across 50 AWS accounts access these services via PrivateLink instead of complex Transit Gateway routing.

### VPC Endpoints for AWS Services

Two types of VPC endpoints provide private access to AWS services:

**Interface Endpoints (PrivateLink-based):**
- Create elastic network interface in your subnet
- Support most AWS services (S3, DynamoDB, SNS, SQS, etc.)
- Charged per hour and per GB processed
- Support security groups and DNS resolution

**Gateway Endpoints:**
- Route table entry pointing to AWS service
- Only support S3 and DynamoDB
- No additional charges
- Cannot use security groups (use bucket/table policies)

**Cost optimization tip**: Use Gateway Endpoints for S3 and DynamoDB when possible to eliminate hourly endpoint charges. Use Interface Endpoints when you need security group controls or access from on-premises via Direct Connect/VPN.

**AWS Documentation:**
- [AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html)
- [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [Endpoint Services](https://docs.aws.amazon.com/vpc/latest/privatelink/endpoint-services-overview.html)

## Hybrid DNS Resolution

Amazon Route 53 Resolver provides DNS resolution between VPCs and on-premises networks, essential for hybrid cloud architectures where resources need to resolve names across network boundaries.

### Route 53 Resolver Endpoints

**Inbound Resolver Endpoints:**
Enable on-premises DNS servers to forward queries to Route 53 Resolver for resolution of AWS resource names.

**Architecture:**
- Create endpoint with 2+ IP addresses across multiple Availability Zones
- Configure on-premises DNS servers to forward AWS domain queries to endpoint IPs
- Resolves Route 53 private hosted zones and VPC DNS names

**Use case**: On-premises applications need to resolve names like `api.internal.example.com` hosted in Route 53 private zone or EC2 instance names like `ip-10-0-1-50.ec2.internal`.

**Outbound Resolver Endpoints:**
Enable Route 53 Resolver to forward queries to on-premises DNS servers for resolution of on-premises resource names.

**Architecture:**
- Create endpoint with 2+ IP addresses across multiple Availability Zones
- Define forwarding rules specifying which domain names to forward and target DNS servers
- Route 53 forwards matching queries to on-premises DNS through Direct Connect or VPN

**Use case**: EC2 instances need to resolve on-premises Active Directory domain names or internal application hostnames.

### Resolver Rules and Sharing

**Forwarding rules** specify domain names and target IP addresses for DNS query forwarding.

**Rule types:**
- **Forward**: Forward queries for specific domain to target IPs
- **System**: Selectively override forwarding for subdomains (e.g., don't forward specific subdomains)
- **Recursive**: Use Route 53 default recursive resolution

**Rule sharing with AWS RAM**: Create resolver rules in central network account and share to all application accounts, enabling centralized DNS management for hundreds of VPCs.

**Multi-region consideration**: Resolver endpoints are regional resources. For multi-region hybrid DNS, create endpoints in each region and associate shared rules with VPCs in each region.

### DNS Firewall

Route 53 Resolver DNS Firewall protects outbound DNS queries from VPCs by filtering malicious domains and data exfiltration attempts.

**Key capabilities:**
- Block access to known malicious domains
- Allow/deny based on domain lists (managed by AWS or custom)
- Alert on suspicious DNS queries
- Integration with AWS Firewall Manager for multi-account deployment

**Use case**: Prevent EC2 instances compromised by malware from communicating with command-and-control servers via DNS lookups.

**AWS Documentation:**
- [Route 53 Resolver Overview](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html)
- [Resolver Endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-endpoints.html)
- [Resolver Rules](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html)
- [DNS Firewall](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-dns-firewall.html)

## Network Segmentation and Isolation

Effective network segmentation is critical for security, compliance, and operational isolation in complex AWS environments. Multiple complementary strategies provide defense-in-depth.

### Multi-Account Strategy with AWS Organizations

Separate AWS accounts provide the strongest isolation boundary. Combined with network connectivity services, this creates a secure foundation for enterprise architectures.

**Typical account structure:**
- **Network account**: Hosts Transit Gateway, Direct Connect, shared VPCs
- **Security account**: Centralized inspection VPC with firewall appliances
- **Shared services account**: Active Directory, DNS, logging, monitoring
- **Workload accounts**: Production, staging, development applications (often many accounts)

**Resource sharing with AWS RAM**: Share Transit Gateway, Route 53 Resolver rules, and subnets across accounts while maintaining separate billing and IAM boundaries.

### Transit Gateway Route Table Segmentation

Use separate route tables to enforce connectivity policies between network segments.

**Example architecture:**
- **Production route table**: Associates production VPCs, allows routing to shared services and Direct Connect, blocks development/staging
- **Development route table**: Associates dev/test VPCs, allows routing to shared services only
- **Shared services route table**: Associates shared services VPC, allows routing to all VPCs and on-premises
- **Inspection route table**: Forces all inter-segment traffic through firewall VPC

**Route table association and propagation**: Each VPC attachment associates with one route table (determines where traffic from that VPC can go) and can propagate to multiple route tables (determines which VPCs can reach it).

### Security Groups and Network ACLs

**Security Groups (Stateful):**
- Operate at instance/ENI level
- Default deny inbound, allow outbound
- Support security group chaining (reference other security groups)
- Evaluate all rules before permitting traffic

**Network ACLs (Stateless):**
- Operate at subnet level
- Process rules in numerical order
- Require explicit allow for both directions
- Used for subnet-level deny rules or compliance requirements

**Layering strategy**: Use Security Groups as primary control (application-aware), Network ACLs for subnet-level guardrails (block known-bad IP ranges, prevent certain ports at subnet boundary).

### AWS Network Firewall

Managed network firewall service providing IDS/IPS and deep packet inspection at VPC level.

**Capabilities:**
- Stateful rule groups for connection-aware filtering
- Suricata-compatible IPS rules
- Domain name filtering (block known malicious domains)
- Flexible rule actions: pass, drop, alert, reject

**Deployment patterns:**
- **Centralized inspection**: Deploy in dedicated inspection VPC, route all inter-VPC and egress traffic through it
- **Distributed inspection**: Deploy firewall in each workload VPC for fine-grained control
- **Hybrid**: Centralized for cross-VPC, distributed for internet egress

**Use case**: Financial services company requires IDS/IPS inspection of all east-west traffic between VPCs and all internet-bound traffic, with centralized rule management and logging to meet compliance requirements.

**AWS Documentation:**
- [AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/what-is-aws-network-firewall.html)
- [Network Segmentation Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/network-segmentation.html)

## Multi-Region Network Architectures

Global applications require careful planning for multi-region connectivity, traffic routing, and failover.

### Transit Gateway Inter-Region Peering

Connect Transit Gateways across regions to build global network backbone.

**Architecture patterns:**

**Hub-and-spoke**: Primary region hosts "hub" Transit Gateway connecting to on-premises. Regional "spoke" Transit Gateways peer with hub for cross-region and on-premises access.

**Full mesh**: Each regional Transit Gateway peers with all others, providing direct region-to-region connectivity without routing through hub.

**Hybrid**: Strategic peering between adjacent regions (us-east-1 ↔ us-west-2 ↔ eu-west-1) plus connections to hub for on-premises access.

**Routing considerations:**
- Static routes required across peering connections
- Consider latency vs. hop count when designing route preferences
- Use BGP communities and AS-path prepending at Direct Connect to influence return traffic routing

### Global Accelerator for Multi-Region Applications

AWS Global Accelerator provides static anycast IP addresses that route traffic to optimal regional endpoints.

**Network benefits:**
- Reduces latency by routing through AWS global network
- Automatic failover between regions based on health checks
- DDoS protection at AWS edge
- Preserves client IP address (when configured)

**Use case**: Global SaaS application deployed in us-east-1, eu-central-1, and ap-southeast-2 uses Global Accelerator to provide single static IP addresses to customers. Traffic automatically routes to nearest healthy region.

### Route 53 Geo-routing and Latency-based Routing

DNS-based routing policies direct users to appropriate regional endpoints.

**Geolocation routing**: Route based on user's geographic location
**Latency-based routing**: Route to lowest-latency endpoint
**Geoproximity routing**: Route based on resource and user location with bias adjustments
**Failover routing**: Automatic failover to secondary region when primary fails health checks

**Multi-region DNS strategy**: Combine routing policies (geolocation with latency-based failover) to route users to preferred region while maintaining automatic failover.

**AWS Documentation:**
- [Multi-Region Architecture Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/aws-multi-region-fundamentals/aws-multi-region-fundamentals.html)
- [AWS Global Accelerator](https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html)
- [Route 53 Routing Policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)

## Network Traffic Inspection Architectures

Enterprise environments often require centralized inspection of network traffic for security, compliance, and monitoring.

### Centralized Egress Architecture

All internet-bound traffic from workload VPCs routes through centralized egress VPC.

**Components:**
- Dedicated egress VPC with NAT Gateways or NAT instances
- Transit Gateway routes all 0.0.0.0/0 traffic to egress VPC
- Optional proxy servers, URL filtering, DLP inspection
- VPC Flow Logs and CloudWatch for monitoring

**Benefits:**
- Centralized internet breakout control
- Consistent egress IP addresses for allowlist-based partner integrations
- Simplified security policy enforcement
- Cost optimization (fewer NAT Gateways)

### Centralized Ingress Architecture

Inbound internet traffic routes through centralized inspection VPC before reaching application VPCs.

**Architecture:**
- Application Load Balancers or Network Load Balancers in public subnets
- Next-gen firewalls or AWS Network Firewall in inspection subnets
- Application targets in separate workload VPCs
- Gateway Load Balancer for transparent inline inspection

**Gateway Load Balancer pattern:**
1. Internet gateway routes traffic to GWLB endpoint
2. GWLB distributes to fleet of third-party firewall appliances
3. Inspected traffic returns through GWLB to destination
4. Transparent to applications (no NAT)

### East-West Inspection

Inspect traffic between VPCs and between on-premises and AWS.

**Implementation options:**

**Option 1 - Transit Gateway with inspection VPC:**
- Create separate route tables for source and destination VPCs
- Route all inter-VPC traffic through inspection VPC attachment
- Deploy AWS Network Firewall or third-party appliances in inspection VPC

**Option 2 - AWS Network Firewall in each VPC:**
- Deploy Network Firewall in each workload VPC
- Centrally manage rules via Firewall Manager
- Higher cost but lower latency

**Traffic flow example**: Production VPC → Transit Gateway → Inspection VPC (Network Firewall) → Transit Gateway → Shared Services VPC

**AWS Documentation:**
- [Inspection VPC Design](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-inspection-architecture.html)
- [Gateway Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/introduction.html)

## Bandwidth and Performance Considerations

Understanding bandwidth limits and optimization strategies is critical for designing high-performance network architectures.

### Service-Specific Bandwidth Limits

**VPC Peering:**
- No bandwidth limit (uses underlying network capacity)
- Single flow limited by instance network performance
- Lowest latency option for VPC-to-VPC communication

**Transit Gateway:**
- 50 Gbps per VPC attachment (with ECMP)
- 50 Gbps per peering connection
- Total Transit Gateway capacity: 50 Gbps × number of Availability Zones in region
- Single flow: limited to single path bandwidth

**Direct Connect:**
- Dedicated connection: 1/10/100 Gbps per connection
- Hosted connection: 50 Mbps to 10 Gbps
- Aggregate with LAG: up to 4 connections
- VIF bandwidth: shared across all VIFs on connection

**Site-to-Site VPN:**
- 1.25 Gbps per IPsec tunnel
- Up to 50 Gbps aggregate with ECMP (multiple VPN connections to Transit Gateway)

### ECMP for Bandwidth Scaling

Equal-Cost Multi-Path routing distributes traffic across multiple paths with equal route metrics.

**Transit Gateway ECMP:**
- Works with VPN connections and Direct Connect
- Requires BGP with identical AS-path length
- Per-flow consistent hashing (same 5-tuple always uses same path)
- Maximum 6 VPN connections or 4 Direct Connect connections

**Example**: Four Direct Connect connections (10 Gbps each) with Transit VIFs to Transit Gateway, using ECMP to achieve 40 Gbps aggregate bandwidth.

### Instance Network Performance

EC2 instance network performance limits impact VPC connectivity:

**Network bandwidth:**
- Instance-specific (t3.small: 2.1 Gbps, c7gn.16xlarge: 200 Gbps)
- Includes all network traffic (VPC, internet, EBS)

**Enhanced networking:**
- SR-IOV provides higher PPS, lower latency, lower jitter
- Enabled by default on modern instance types
- Elastic Network Adapter (ENA) or Intel 82599 VF

**Placement groups:**
- Cluster: low latency, high bandwidth within single AZ
- Partition: large distributed workloads across distinct racks
- Spread: small number of critical instances across distinct hardware

**AWS Documentation:**
- [Instance Network Bandwidth](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)
- [Enhanced Networking](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html)

## SAP-C02 Exam Strategy

### Key Decision Factors

When choosing network connectivity solutions, consider:

**Scale:**
- 1-5 VPCs: VPC Peering
- 10-100 VPCs: Transit Gateway
- 100+ VPCs: Transit Gateway with multi-account architecture

**Latency sensitivity:**
- Ultra-low latency: VPC Peering (lowest latency)
- Low latency: Transit Gateway (acceptable for most workloads)
- Moderate latency: VPN backup paths

**Cost optimization:**
- High bandwidth between two VPCs: VPC Peering (no hourly charges)
- Many VPCs with moderate traffic: Transit Gateway
- AWS service access: Gateway Endpoints (free) vs. Interface Endpoints (charged)

**Security requirements:**
- Traffic inspection: Centralized inspection VPC with Transit Gateway
- Service isolation: PrivateLink for service exposure
- Compliance: Network Firewall or third-party appliances

### Common Exam Scenarios

**Scenario: "Company with 200 VPCs across 5 regions needs to connect all VPCs to on-premises data center"**
- Solution: Regional Transit Gateways with inter-region peering, Transit VIF from Direct Connect to primary region's Transit Gateway

**Scenario: "Application requires consistent sub-5ms latency between two VPCs in same region"**
- Solution: VPC Peering (eliminates Transit Gateway hop)

**Scenario: "SaaS provider needs to expose service to 1,000 customer AWS accounts without VPC peering"**
- Solution: PrivateLink VPC Endpoint Service with Network Load Balancer

**Scenario: "Multi-region application needs automatic failover and static IP addresses"**
- Solution: AWS Global Accelerator with health checks to regional endpoints

**Scenario: "On-premises applications must resolve EC2 instance DNS names, and EC2 must resolve on-premises Active Directory"**
- Solution: Route 53 Resolver with inbound and outbound endpoints, forwarding rules for AD domain

**Scenario: "Requires inspection of all inter-VPC traffic with third-party firewall"**
- Solution: Transit Gateway with inspection VPC architecture, route all traffic through firewall VPC

### Critical Exam Facts

- Transit Gateway: 5,000 attachments, 10,000 routes per route table, 50 Gbps per attachment
- Direct Connect Gateway: Max 10 VPCs (use Transit Gateway for more)
- VPC Peering: NOT transitive, 125 peering connections per VPC
- Site-to-Site VPN: 1.25 Gbps per tunnel, up to 50 Gbps with ECMP to Transit Gateway
- PrivateLink: Unidirectional (consumer to provider), no CIDR overlap concerns
- Route 53 Resolver: Required for hybrid DNS, regional resource
- Gateway Endpoints: Only S3 and DynamoDB, no charges
- Interface Endpoints: Most AWS services, hourly + data processing charges

**AWS Documentation:**
- [AWS Networking Services Overview](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/networking-services.html)
- [Building Scalable and Secure Multi-VPC AWS Network Infrastructure](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/welcome.html)
- [Hybrid Cloud DNS Solutions](https://docs.aws.amazon.com/whitepapers/latest/hybrid-cloud-dns-options-for-vpc/welcome.html)
- [AWS Direct Connect Resiliency Recommendations](https://aws.amazon.com/directconnect/resiliency-recommendation/)
