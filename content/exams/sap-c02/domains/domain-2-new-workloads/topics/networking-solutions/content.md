---
title: Networking Solutions for New Workloads
lastUpdated: 2026-01-06
---

# Networking Solutions for New Workloads

Designing network architectures for new workloads at the Solutions Architect Professional level requires deep understanding of VPC design patterns, hybrid connectivity, advanced routing strategies, security layering, load balancing architectures, content delivery optimization, and network automation. This guide covers comprehensive networking solutions aligned with AWS best practices and real-world enterprise scenarios.

## Amazon VPC Design Patterns

### VPC Sizing and CIDR Blocks

**Planning Considerations**:
```
Recommended VPC CIDR: /16 (65,536 IPs)
Subnet CIDR: /24 (256 IPs per subnet, 251 usable)

AWS Reserves 5 IPs per subnet:
- .0: Network address
- .1: VPC router
- .2: DNS server
- .3: Reserved for future use
- .255: Broadcast (not supported but reserved)
```

**Multi-Tier VPC Pattern**:
```
VPC: 10.0.0.0/16

Public Subnets (Internet-facing):
  - 10.0.1.0/24 (AZ-a) - ALB, NAT Gateway
  - 10.0.2.0/24 (AZ-b) - ALB, NAT Gateway

Private Subnets (Application):
  - 10.0.11.0/24 (AZ-a) - ECS, EC2
  - 10.0.12.0/24 (AZ-b) - ECS, EC2

Data Subnets (Database):
  - 10.0.21.0/24 (AZ-a) - RDS, ElastiCache
  - 10.0.22.0/24 (AZ-b) - RDS, ElastiCache
```

**Secondary CIDR Blocks**:
- Add to existing VPC when original CIDR exhausted
- Cannot overlap with existing CIDR or peering connections
- Maximum 5 CIDR blocks per VPC
- IPv6 CIDR blocks can be associated for dual-stack networking

**Real-World Scenario**: A large enterprise running out of IP space in their 10.0.0.0/16 VPC can add 10.1.0.0/16 as a secondary CIDR without recreating the VPC or migrating workloads. This approach maintains existing connections while scaling the address space.

**Best Practices**:
- Plan for growth: Use /16 for production VPCs (allows 65,536 addresses)
- Reserve non-overlapping ranges for VPC peering or hybrid connectivity
- Document CIDR allocations in a centralized IP address management (IPAM) system
- Use AWS VPC IPAM for automated IP address management across multiple accounts

**AWS Documentation:**
- [VPC CIDR Blocks](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html)
- [Configure Your VPC](https://docs.aws.amazon.com/vpc/latest/userguide/configure-your-vpc.html)

### VPC Endpoints

**Interface Endpoints (AWS PrivateLink)**:
- ENI with private IP in your subnet
- Powered by AWS PrivateLink
- Supports most AWS services (S3, DynamoDB via Gateway endpoints)
- Charged per hour + data processed

**Gateway Endpoints**:
- Route table target (not an ENI)
- Free
- Only for S3 and DynamoDB
- Stays within AWS network (no internet gateway needed)

**Comparison**:

| Feature | Interface Endpoint | Gateway Endpoint |
|---------|-------------------|------------------|
| **Implementation** | ENI in subnet | Route table entry |
| **Services** | Most AWS services | S3, DynamoDB only |
| **Cost** | Hourly + data | Free |
| **DNS** | Private DNS name | Service endpoint |
| **Security** | Security groups | VPC endpoint policies |

**PrivateLink Architecture**:
```
┌─────────────────┐         ┌──────────────────┐
│  Consumer VPC   │         │   Provider VPC   │
│                 │         │                  │
│  ┌───────────┐  │         │  ┌────────────┐  │
│  │Application│  │         │  │   Service  │  │
│  └─────┬─────┘  │         │  │  (NLB)     │  │
│        │        │         │  └────────────┘  │
│  ┌─────▼─────┐  │         │                  │
│  │ Interface │  │  AWS    │                  │
│  │ Endpoint  │◄─┼─────────┼──PrivateLink     │
│  │   (ENI)   │  │         │                  │
│  └───────────┘  │         │                  │
└─────────────────┘         └──────────────────┘
```

**Real-World Use Cases**:
- **SaaS Provider Pattern**: Expose your application to thousands of customer VPCs without VPC peering or complex routing
- **Service Marketplace**: AWS Marketplace partners use PrivateLink to deliver services privately
- **Cross-Account Access**: Share internal services between development, staging, and production accounts without internet exposure
- **Hybrid Architecture**: Connect on-premises applications to AWS services privately over Direct Connect

**Cost Optimization**:
- Gateway endpoints (S3, DynamoDB) have no hourly charge or data processing fees
- Interface endpoints incur hourly charges per AZ plus data processing fees
- For high-volume S3/DynamoDB access, gateway endpoints can save significant costs
- Consider VPC endpoint policies to restrict access and reduce unnecessary data transfer

**Endpoint Policies**:
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": [
      "s3:GetObject",
      "s3:PutObject"
    ],
    "Resource": "arn:aws:s3:::my-specific-bucket/*"
  }]
}
```

**AWS Documentation:**
- [VPC Endpoints Overview](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [AWS PrivateLink Concepts](https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html)
- [Gateway Endpoints for S3](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)
- [Interface Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)

## VPC Routing and Internet Connectivity

### Route Tables

**Route Table Fundamentals**:
- Every subnet must be associated with a route table (main route table if not explicitly associated)
- Route tables control traffic routing at the subnet level
- Routes are evaluated based on most specific match (longest prefix match)
- Local routes for VPC CIDR blocks are automatically added and cannot be removed

**Route Priority Example**:
```
Destination         Target              Priority
10.0.0.0/16        local               Most specific (VPC local)
10.0.1.0/24        NAT Gateway         More specific
0.0.0.0/0          Internet Gateway    Least specific (default)
```

**Route Table Best Practices**:
- Create separate route tables for public, private, and data subnets
- Use route table tags to identify purpose (PublicRouteTable, PrivateRouteTableAZ1)
- Minimize the number of route tables for easier management
- Document custom routes and their purposes

**Route Propagation**:
- Virtual Private Gateway (VGW) routes can be automatically propagated via BGP
- Transit Gateway routes can propagate from attached VPCs
- Manual static routes required for VPC peering, NAT Gateway, and some endpoints

### Internet Gateway (IGW)

**Characteristics**:
- Horizontally scaled, redundant, highly available by design
- No bandwidth constraints (scales automatically)
- One IGW per VPC (1:1 relationship)
- Performs NAT for instances with public IP addresses
- Free (no hourly charges or data processing fees)

**Requirements for Internet Connectivity**:
1. Attach IGW to VPC
2. Update route table: add 0.0.0.0/0 pointing to IGW
3. Assign public IP or Elastic IP to instance
4. Configure security group to allow desired traffic
5. Configure NACL to allow desired traffic (if modified from defaults)

**Dual-Stack (IPv4 + IPv6) Configuration**:
```
Route Table:
Destination         Target
10.0.0.0/16        local
2600:1f14::/56     local
0.0.0.0/0          igw-xxxxx
::/0               igw-xxxxx
```

### NAT Gateway

**Architecture and Design**:
- Managed NAT service (AWS handles patching, scaling, availability within AZ)
- Deployed in a public subnet with Elastic IP
- Supports up to 45 Gbps bandwidth with automatic scaling
- Charged per hour plus data processing fees

**NAT Gateway Types**:

| Type | Use Case | Connectivity | Elastic IP |
|------|----------|--------------|------------|
| **Public** | Internet access from private subnets | Internet via IGW | Required |
| **Private** | Connect to other VPCs or on-premises | Transit Gateway or VGW | Not supported |

**High Availability Pattern**:
```
VPC: 10.0.0.0/16

AZ-a:
  Public Subnet (10.0.1.0/24) → IGW
    ├─ NAT Gateway A (EIP-1)
  Private Subnet (10.0.11.0/24) → NAT Gateway A

AZ-b:
  Public Subnet (10.0.2.0/24) → IGW
    ├─ NAT Gateway B (EIP-2)
  Private Subnet (10.0.12.0/24) → NAT Gateway B

Key: Deploy NAT Gateway in EACH AZ for fault tolerance
```

**Real-World Scenario**: An e-commerce application with auto-scaling EC2 instances in private subnets needs to download software updates and access third-party APIs. By deploying NAT Gateways in each AZ, the architecture ensures that an AZ failure doesn't prevent instances in other AZs from accessing the internet.

**NAT Gateway vs NAT Instance**:

| Feature | NAT Gateway | NAT Instance |
|---------|-------------|--------------|
| **Availability** | Highly available within AZ | Manual HA setup required |
| **Bandwidth** | Up to 45 Gbps | Depends on instance type |
| **Maintenance** | AWS managed | Customer managed |
| **Security Groups** | Not supported | Supported |
| **Bastion Host** | Not supported | Can be used as bastion |
| **Cost** | Hourly + data processing | EC2 instance cost |
| **Use Case** | Production workloads | Legacy, cost optimization for low traffic |

**Cost Optimization**:
- Consider single NAT Gateway for non-production environments (accept cross-AZ data transfer costs)
- Evaluate VPC endpoints for AWS services to reduce NAT Gateway data processing charges
- For outbound-only traffic patterns, NAT Gateway can be more cost-effective than public IPs on all instances

**Monitoring**:
- CloudWatch metrics: ActiveConnectionCount, BytesInFromDestination, BytesOutToDestination
- VPC Flow Logs to analyze traffic patterns
- Set CloudWatch alarms for ErrorPortAllocation (indicates connection limit reached)

**AWS Documentation:**
- [NAT Gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [VPC Routing](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html)
- [Internet Gateways](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html)

## VPC Security: Defense in Depth

### Security Groups

**Core Characteristics**:
- **Stateful**: Return traffic automatically allowed regardless of rules
- **Instance-level** protection (attached to ENIs)
- **Allow rules only**: Cannot create explicit deny rules
- **Default deny**: All inbound traffic blocked by default

**Stateful Behavior Example**:
```
Scenario: Web server with inbound rule allowing HTTP (port 80)

Inbound Rule:  Protocol: TCP, Port: 80, Source: 0.0.0.0/0
Outbound Rule: (default allow all)

Traffic Flow:
1. Client initiates HTTP request to server port 80 → ALLOWED
2. Server responds from ephemeral port (e.g., 49152) → AUTOMATICALLY ALLOWED
   (No explicit outbound rule needed for response traffic)
```

**Rule Structure**:
```yaml
Security Group: web-tier-sg
Inbound Rules:
  - Protocol: TCP
    Port: 443
    Source: 0.0.0.0/0
    Description: HTTPS from internet

  - Protocol: TCP
    Port: 22
    Source: sg-12345678 (bastion-sg)
    Description: SSH from bastion hosts only

Outbound Rules:
  - Protocol: TCP
    Port: 3306
    Destination: sg-87654321 (database-sg)
    Description: MySQL to database tier
```

**Security Group Referencing**:
- Reference another security group as source/destination instead of IP addresses
- Enables dynamic, scalable architectures (instances can scale without rule updates)
- Best practice for multi-tier applications

**Real-World Pattern: Three-Tier Application**:
```
Load Balancer SG (alb-sg):
  Inbound:  TCP/443 from 0.0.0.0/0
  Outbound: TCP/8080 to app-tier-sg

Application Tier SG (app-tier-sg):
  Inbound:  TCP/8080 from alb-sg
  Outbound: TCP/3306 to db-tier-sg

Database Tier SG (db-tier-sg):
  Inbound:  TCP/3306 from app-tier-sg
  Outbound: None (default deny)
```

**Best Practices**:
- Minimize the number of security groups (reuse common patterns)
- Use descriptive names and detailed rule descriptions
- Restrict SSH/RDP to specific IP ranges or bastion security groups
- Avoid 0.0.0.0/0 for SSH (port 22) and RDP (port 3389)
- Regularly audit security groups using AWS Security Hub or third-party tools
- Use VPC Flow Logs to analyze actual traffic patterns and refine rules

**Security Group Quotas**:
- Default: 2,500 security groups per VPC (can request increase)
- 60 inbound + 60 outbound rules per security group (soft limit)
- 5 security groups per network interface (default limit)

**AWS Documentation:**
- [Security Groups for Your VPC](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- [Security Group Rules Reference](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html)

### Network Access Control Lists (NACLs)

**Core Characteristics**:
- **Stateless**: Must explicitly allow both request and response traffic
- **Subnet-level** protection (applies to all instances in subnet)
- **Allow and Deny rules**: Can create explicit deny rules
- **Rule evaluation**: Rules processed in order (lowest number first)
- **Default NACL**: Allows all inbound and outbound traffic

**Stateless Behavior**:
```
Scenario: Allow HTTP traffic

Inbound Rules:
  100: Allow TCP/80 from 0.0.0.0/0

Outbound Rules:
  100: Allow TCP/1024-65535 to 0.0.0.0/0  (ephemeral ports)

Note: Ephemeral ports vary by client OS
- Linux kernels: 32768-60999
- Windows Server 2008+: 49152-65535
- NAT Gateway: 1024-65535
```

**Rule Numbering Best Practice**:
```
NACL Rules (use increments of 10 or 100):

Inbound:
  100: Allow TCP/443 from 10.0.0.0/8
  200: Allow TCP/80 from 0.0.0.0/0
  300: Deny TCP/22 from 203.0.113.0/24  (block specific IP range)
  400: Allow TCP/22 from 0.0.0.0/0
  32767: Deny all (default rule, cannot be modified)

First matching rule applies → Rule 300 blocks SSH from 203.0.113.0/24
```

**Security Groups vs NACLs Decision Matrix**:

| Requirement | Use Security Groups | Use NACLs |
|-------------|---------------------|-----------|
| Instance-level control | Yes | No |
| Stateful behavior needed | Yes | No |
| Explicit deny required | No | Yes |
| Subnet-level control | No | Yes |
| Reference other SGs | Yes | No |
| Simplicity preferred | Yes | No |

**Defense-in-Depth Pattern**:
```
Internet → NACL (subnet) → Security Group (instance) → Application

Example:
1. NACL: Allow TCP/443 from 0.0.0.0/0, Deny known malicious IPs
2. Security Group: Allow TCP/443 from ALB security group only
3. Application: Validate input, implement authentication
```

**Common NACL Use Cases**:
- Block specific IP addresses or ranges (e.g., known attackers)
- Explicit deny rules for compliance requirements
- Subnet-level protection for sensitive data tiers
- Additional layer of defense beyond security groups

**NACL Limitations**:
- Cannot filter traffic to/from Amazon DNS, DHCP, instance metadata, time sync service
- Maximum 20 inbound + 20 outbound rules per NACL (soft limit, can increase to 40)
- Stateless nature requires careful planning of ephemeral port ranges

**Ephemeral Ports Reference**:
```
Common ephemeral port ranges by platform:
- Linux (kernel 4.15+):    32768-60999
- Windows Server 2008+:    49152-65535
- AWS NAT Gateway:         1024-65535
- Elastic Load Balancing:  1024-65535

Recommendation: Allow 1024-65535 for broad compatibility
```

**AWS Documentation:**
- [Network ACLs](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [Recommended Network ACL Rules](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-recommended-nacl-rules.html)
- [Ephemeral Ports](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html#nacl-ephemeral-ports)

## Multi-VPC and Hybrid Connectivity

### AWS Transit Gateway

**Architecture Overview**:
AWS Transit Gateway acts as a regional network transit hub, connecting multiple VPCs, on-premises networks, and remote offices through a central point. This hub-and-spoke model simplifies network architecture compared to complex VPC peering meshes.

**Key Components**:
- **Attachments**: VPCs, VPN connections, Direct Connect gateways, Transit Gateway peering, Connect (SD-WAN)
- **Route Tables**: Control traffic flow between attachments (default and custom tables)
- **Associations**: Each attachment associates with exactly one route table
- **Route Propagation**: Dynamic route learning from VPN (BGP) and Direct Connect

**Transit Gateway vs VPC Peering**:

| Feature | Transit Gateway | VPC Peering |
|---------|-----------------|-------------|
| **Scalability** | Hub-and-spoke, thousands of VPCs | Mesh topology, limited scale |
| **Transitive Routing** | Supported | Not supported |
| **On-Premises** | Integrated (VPN, Direct Connect) | Not supported |
| **Inter-Region** | Peering supported | Peering supported |
| **Cost** | Hourly + data processing | Data transfer only |
| **Management** | Centralized | Per-connection |
| **Use Case** | Enterprise, many VPCs | Simple VPC-to-VPC |

**Real-World Architecture: Multi-Account Hub-and-Spoke**:
```
                    ┌─────────────────────┐
                    │  Transit Gateway    │
                    │    (us-east-1)      │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐          ┌─────▼─────┐          ┌────▼────┐
   │Prod VPC │          │Shared Svcs│          │Dev VPC  │
   │10.1.0.0 │          │  VPC      │          │10.3.0.0 │
   │  /16    │          │10.2.0.0/16│          │  /16    │
   └─────────┘          └─────┬─────┘          └─────────┘
                              │
                     ┌────────▼────────┐
                     │ Direct Connect  │
                     │   On-Premises   │
                     └─────────────────┘
```

**Route Table Segmentation**:
```yaml
Production Route Table:
  Associations: Production VPC, Shared Services VPC
  Routes:
    - 10.1.0.0/16 → Prod VPC
    - 10.2.0.0/16 → Shared Services VPC
    - 192.168.0.0/16 → VPN (on-premises)

  Note: Dev VPC NOT in route table (network isolation)

Development Route Table:
  Associations: Dev VPC, Shared Services VPC
  Routes:
    - 10.3.0.0/16 → Dev VPC
    - 10.2.0.0/16 → Shared Services VPC

  Note: Cannot reach Production VPC or on-premises
```

**Advanced Features**:
- **Appliance Mode**: Maintains flow symmetry for stateful appliances (firewalls, IDS/IPS)
- **Multicast Support**: Distribute streaming content to multiple subscribers
- **Inter-Region Peering**: Connect Transit Gateways across regions using AWS global network
- **ECMP (Equal-Cost Multi-Path)**: Load balance traffic across multiple VPN tunnels

**Performance Specifications**:
- Up to 50 Gbps per VPC attachment
- Up to 5,000 attachments per Transit Gateway
- MTU: 8,500 bytes (VPC, Direct Connect), 1,500 bytes (VPN)
- Bandwidth scaling: Automatic within attachment limits

**Cost Optimization**:
- Hourly charge per attachment (VPC, VPN, Direct Connect)
- Data processing charge per GB
- Costs allocated to attachment owner by default (configurable)
- Consider VPC peering for simple two-VPC scenarios to avoid Transit Gateway costs

**Use Case: Centralized Egress**:
```
All spoke VPCs route internet traffic through shared egress VPC:
- Centralized NAT Gateways in egress VPC
- Centralized security inspection (firewall appliances)
- Simplified compliance and logging
- Cost optimization (fewer NAT Gateways)
```

**AWS Documentation:**
- [What is AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html)
- [Transit Gateway Route Tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Transit Gateway Design Best Practices](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html)

### VPC Peering

**Characteristics**:
- Direct network connection between two VPCs (one-to-one)
- Non-transitive: VPC A peered to VPC B, VPC B peered to VPC C does NOT mean A can reach C
- Supports cross-account and cross-region peering
- Free for same-region peering (standard data transfer rates)
- Inter-region peering charged per GB transferred

**Peering Requirements**:
- Non-overlapping CIDR blocks
- Unique peering connection for each VPC pair
- Update route tables in both VPCs to enable traffic flow

**When to Use VPC Peering**:
- Simple connectivity between two VPCs
- Low latency requirements (direct connection)
- Cost optimization for two-VPC scenarios (vs Transit Gateway)
- Connecting VPCs in different regions

**Limitations**:
- Does not support edge-to-edge routing (no transitive routing through on-premises, IGW, NAT)
- Does not support overlapping CIDR blocks
- Becomes complex at scale (full mesh requires n(n-1)/2 connections for n VPCs)

**AWS Documentation:**
- [VPC Peering](https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html)
- [VPC Peering Configurations](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html)

## Elastic Load Balancing

### Load Balancer Selection

| Feature | ALB | NLB | GLB | CLB (Legacy) |
|---------|-----|-----|-----|--------------|
| **Layer** | 7 (HTTP/HTTPS) | 4 (TCP/UDP/TLS) | 3 (Network) | 4 & 7 |
| **Performance** | Good | Ultra-high | Ultra-high | Basic |
| **Static IP** | No (use Global Accelerator) | Yes | Yes | No |
| **WebSockets** | Yes | Yes | No | No |
| **Target Types** | Instance, IP, Lambda | Instance, IP, ALB | GENEVE listeners | Instance only |
| **Path/Host routing** | Yes | No | No | No |
| **SSL Offload** | Yes | Yes | No | Yes |
| **Use Case** | Web apps, microservices | Extreme performance, static IP | Appliances, firewalls | Legacy |

### Application Load Balancer (ALB)

**Key Features**:
- **Content-based routing**: Path, host, headers, query string
- **Target groups**: EC2, ECS, Lambda, IP addresses
- **Authentication**: OIDC, Amazon Cognito
- **Fixed response**: Return static response without targets
- **Redirects**: HTTP to HTTPS, custom redirects

**Routing Rules**:
```yaml
Rules:
  - Priority: 1
    Condition: Host header = api.example.com
    Action: Forward to api-target-group

  - Priority: 2
    Condition: Path = /images/*
    Action: Forward to images-target-group

  - Priority: 3
    Condition: Query string = version=v2
    Action: Forward to v2-target-group

  - Default:
    Action: Forward to default-target-group
```

**ALB Target Types**:
- **Instance**: Route to EC2 instance ID
- **IP**: Route to private IP (container IPs, on-premises)
- **Lambda**: Invoke Lambda function (JSON to Lambda event)

**ALB + Lambda Pattern**:
```
HTTP Request → ALB → Lambda Function
              ↓
    {
      "requestContext": {...},
      "httpMethod": "GET",
      "path": "/api/users",
      "queryStringParameters": {...},
      "body": "..."
    }
```

> 📚 [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

### Network Load Balancer (NLB)

**When to Use NLB**:
- Ultra-low latency (< 100 microseconds)
- Millions of requests per second
- Static IP addresses required
- Source IP preservation
- TCP/UDP/TLS traffic

**NLB Features**:
- **Static IP**: One per AZ (Elastic IP support)
- **Connection-based**: Maintains TCP connections
- **Cross-zone load balancing**: Optional (disabled by default)
- **Preserve source IP**: Client IP visible to targets
- **TLS termination**: Offload TLS encryption

**NLB + PrivateLink**:
```
Expose services to other VPCs or accounts via PrivateLink
Consumer → VPC Endpoint → NLB → Target Group
```

> 📚 [Network Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/)

### Gateway Load Balancer (GLB)

**Use Cases**:
- Third-party virtual appliances (firewalls, IDS/IPS)
- Transparent network gateway + load balancing
- Deploy, scale, manage virtual appliances

**Architecture**:
```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Source  │─────>│   GLB    │─────>│  Firewall│
│   VPC    │      │ Endpoint │      │ Appliance│
└──────────┘      └──────────┘      └────┬─────┘
                                         │
                                    Inspect
                                         │
                                    ┌────▼─────┐
                                    │Destination│
                                    │   VPC    │
                                    └──────────┘
```

**GENEVE Protocol**:
- Encapsulation protocol for GLB
- Preserves flow stickiness
- Appliances must support GENEVE

## Amazon CloudFront

### CloudFront Distributions

**Overview**:
Amazon CloudFront is a global content delivery network (CDN) that delivers data, videos, applications, and APIs securely with low latency and high transfer speeds. CloudFront integrates with AWS services and provides advanced features for caching, security, and customization.

**Key Concepts**:
- **Distributions**: Configuration defining how content is delivered
- **Origins**: Source location for content (S3, HTTP servers, ALB, etc.)
- **Edge Locations**: Globally distributed cache servers (400+ locations across 90+ cities)
- **Regional Edge Caches**: Mid-tier caching layer between edge locations and origins
- **Behaviors**: Path-based routing and caching rules

**Origin Types**:

| Origin Type | Use Case | Example |
|-------------|----------|---------|
| **S3 Bucket** | Static content | Images, CSS, JS, videos |
| **S3 Website** | Static website hosting | SPA applications |
| **ALB** | Dynamic content | API endpoints, web apps |
| **EC2/On-Premises** | Custom origin | Legacy apps, third-party |
| **API Gateway** | REST APIs | Serverless APIs |
| **MediaStore** | Video streaming | Live and on-demand video |

**CloudFront Behaviors**:
```yaml
Behaviors:
  - Path: /api/*
    Origin: ALB
    CacheTTL: 0 (no caching)
    AllowedMethods: GET, POST, PUT, DELETE
    ForwardHeaders: Host, Authorization

  - Path: /images/*
    Origin: S3
    CacheTTL: 86400 (1 day)
    AllowedMethods: GET, HEAD
    CompressObjects: Yes

  - Default:
    Origin: S3 or ALB
    CacheTTL: 3600 (1 hour)
```

> 📚 [Amazon CloudFront Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/)

### CloudFront Optimization Strategies

**Caching**:
- **TTL Settings**: Min TTL, Max TTL, Default TTL
- **Cache Keys**: URL, query strings, headers, cookies
- **Cache Policies**: Managed or custom policies
- **Origin Request Policies**: Headers/cookies to origin

**Security**:
- **Origin Access Control (OAC)**: Restrict S3 access to CloudFront
- **Signed URLs/Cookies**: Restrict access to paid content
- **AWS WAF**: Filter malicious requests
- **Field-Level Encryption**: Encrypt sensitive data

**Performance**:
- **Compression**: Gzip, Brotli compression
- **HTTP/2 and HTTP/3**: Faster protocol support
- **Origin Shield**: Additional caching layer before origin
- **Lambda@Edge**: Execute code at edge locations

**Lambda@Edge Use Cases**:
```javascript
// Viewer Request: Modify request from user
// Origin Request: Modify request to origin
// Origin Response: Modify response from origin
// Viewer Response: Modify response to user

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;

    // A/B Testing: Route to different origins
    const random = Math.random();
    if (random < 0.5) {
        request.origin.s3.domainName = 'bucket-a.s3.amazonaws.com';
    } else {
        request.origin.s3.domainName = 'bucket-b.s3.amazonaws.com';
    }

    callback(null, request);
};
```

### CloudFront with S3

**Origin Access Control (OAC)**:
OAC replaces Origin Access Identity (OAI) as the recommended method to restrict S3 bucket access to CloudFront only. OAC supports all S3 buckets, including SSE-KMS encryption and dynamic requests (PUT, POST, DELETE).

```json
S3 Bucket Policy with OAC:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT:distribution/DISTID"
      }
    }
  }]
}
```

**Real-World Scenario**: A media company hosts millions of images in S3 and uses CloudFront for global delivery. With OAC, the S3 bucket blocks public access while CloudFront delivers content worldwide. This prevents users from bypassing CloudFront to access S3 directly, ensuring consistent security policies and cost tracking.

**S3 Transfer Acceleration with CloudFront**:
- CloudFront uses AWS edge locations for faster uploads to S3
- Beneficial for users geographically distant from S3 bucket region
- Automatic route optimization through AWS backbone network

**Use Cases**:
- Static website hosting with global delivery and custom domain
- Media distribution (images, videos) with adaptive bitrate streaming
- Software distribution with download acceleration
- API acceleration for dynamic content (with appropriate caching policies)
- Single-page applications (SPAs) with client-side routing

**AWS Documentation:**
- [Amazon CloudFront Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/)
- [Restricting S3 Content with OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront Caching](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html)

## Amazon Route 53

### Routing Policies

**Simple Routing**:
- Single resource or multiple values
- No health checks
- Random selection if multiple values

**Weighted Routing**:
```
A Record (www): 70% → ALB-1
A Record (www): 30% → ALB-2

Use case: Blue/green deployments, A/B testing
```

**Latency-Based Routing**:
- Route to region with lowest latency
- Based on user-to-AWS region latency
- Use case: Global applications

**Failover Routing**:
```
Primary: us-east-1 ALB (health check)
Secondary: us-west-2 ALB (standby)

Automatic failover on health check failure
```

**Geolocation Routing**:
- Route based on user geographic location
- Country or continent level
- Use case: Content localization, compliance

**Geoproximity Routing**:
- Route based on resource and user location
- Bias to shift traffic (+/- 1 to 99)
- Use case: Traffic flow management

**Multi-Value Answer Routing**:
- Return up to 8 healthy IPs per query
- Client-side load balancing with health checking
- Health checks for each value
- Alternative to simple routing with health checks

**Routing Policy Selection Guide**:

| Use Case | Recommended Policy | Why |
|----------|-------------------|-----|
| A/B testing, gradual rollout | Weighted | Precise traffic percentage control |
| Global application, performance focus | Latency-based | Routes to fastest AWS region |
| Active-passive DR | Failover | Automatic health-based failover |
| Content localization, compliance | Geolocation | Route by user country/continent |
| Traffic flow optimization | Geoproximity | Fine-tune routing with bias |
| High availability, client load balancing | Multi-value answer | Returns multiple healthy endpoints |

**Real-World Scenario: Blue/Green Deployment**:
```yaml
# Initial state: 100% traffic to blue
www.example.com (weighted):
  - Weight: 100, Target: blue-alb.example.com

# Gradual cutover: Route 10% to green for testing
www.example.com (weighted):
  - Weight: 90, Target: blue-alb.example.com
  - Weight: 10, Target: green-alb.example.com

# After validation: Full cutover to green
www.example.com (weighted):
  - Weight: 0, Target: blue-alb.example.com
  - Weight: 100, Target: green-alb.example.com
```

**AWS Documentation:**
- [Route 53 Routing Policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)
- [Choosing a Routing Policy](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-choosing.html)

### Route 53 Health Checks

**Types**:

*Endpoint Health Check*:
- Monitor endpoint via HTTP/HTTPS/TCP
- String matching in response
- Latency measurement

*Calculated Health Check*:
- Combine multiple health checks
- AND, OR, NOT logic
- Use case: Complex failover

*CloudWatch Alarm*:
- Monitor CloudWatch metric
- Use case: Application-level health

**Health Check Configuration**:
```yaml
Protocol: HTTPS
Port: 443
Path: /health
Interval: 30 seconds (or 10 seconds for fast interval)
Failure Threshold: 3
String Matching: "healthy"
Regions: Multiple AWS regions (recommended for global applications)
SNI (Server Name Indication): Enabled for HTTPS health checks
```

**Best Practices**:
- Use health checks from multiple regions to avoid false positives from regional network issues
- Set appropriate failure threshold (3 failures = unhealthy after 90 seconds at 30s interval)
- Implement dedicated health check endpoints in applications (don't use homepage)
- Use string matching to verify application is responding correctly, not just returning HTTP 200
- Monitor health check metrics in CloudWatch

**Real-World Scenario**: A financial services application requires 99.99% availability. Route 53 health checks monitor the primary ALB endpoint every 10 seconds from multiple global regions. When three consecutive checks fail, Route 53 automatically fails over to the secondary region ALB within 30 seconds, ensuring minimal downtime.

**AWS Documentation:**
- [Route 53 Health Checks](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html)
- [Creating Health Checks](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating.html)

### Route 53 Resolver

**Hybrid DNS Resolution**:

*Inbound Endpoint*:
- On-premises queries AWS resources
- Create in VPC subnets
- On-premises DNS forwards to inbound endpoint

*Outbound Endpoint*:
- AWS queries on-premises resources
- Create forwarding rules
- DNS queries forwarded to on-premises

**Architecture**:
```
┌──────────────────┐         ┌──────────────────┐
│   On-Premises    │         │    AWS VPC       │
│                  │         │                  │
│  DNS Server ────>│─────────│──> Inbound       │
│  (Query AWS)     │         │    Endpoint      │
│                  │         │   (2+ ENIs)      │
│              <───│─────────│<── Outbound      │
│  DNS Server      │         │    Endpoint      │
│  (AWS queries)   │         │   (Forwarding    │
│                  │         │    Rules)        │
└──────────────────┘         └──────────────────┘
    VPN/Direct Connect
```

**Resolver Endpoints**:
- Each endpoint requires 2+ IP addresses (one per AZ for high availability)
- Endpoints deployed as ENIs in VPC subnets
- Charged per endpoint per hour plus queries processed

**Forwarding Rules**:
- Domain-based forwarding (e.g., corp.example.com forwards to on-premises DNS)
- SYSTEM rules (default AWS DNS resolution)
- FORWARD rules (conditional forwarding to target IPs)
- Can share rules across accounts using AWS Resource Access Manager (RAM)

**Real-World Use Case: Hybrid Cloud DNS**:
```
Scenario: Enterprise with Active Directory on-premises and workloads in AWS

Configuration:
1. Inbound Endpoint: On-premises can resolve ec2.internal, RDS endpoints
2. Outbound Endpoint: AWS EC2 can resolve corp.example.com (Active Directory)
3. Forwarding Rule: *.corp.example.com → 10.0.1.10, 10.0.2.10 (on-prem DNS)

Benefit: Seamless name resolution across hybrid environment
```

**AWS Documentation:**
- [Route 53 Resolver](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html)
- [Resolver Endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-endpoints.html)
- [Forwarding Rules](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html)

## AWS Global Accelerator

**Key Differences from CloudFront**:

| Feature | Global Accelerator | CloudFront |
|---------|-------------------|------------|
| **Use Case** | TCP/UDP apps, gaming, VoIP | HTTP/HTTPS content |
| **Static IP** | 2 Anycast IPs | Dynamic IPs |
| **Caching** | No | Yes |
| **Layer** | 4 (Network) | 7 (Application) |
| **Health Checks** | Built-in | Via Route 53 |

**When to Use Global Accelerator**:
- Non-HTTP(S) protocols (TCP, UDP)
- Static IP addresses required (whitelist, hardcoded)
- Gaming, VoIP, IoT applications
- Instant regional failover
- Deterministic routing (no DNS caching issues)

**Architecture**:
```
User → Anycast IP (2 static IPs)
         ↓
    AWS Edge Location (closest)
         ↓
    AWS Global Network (optimized path)
         ↓
    Application Endpoint (ALB, NLB, EC2, EIP)
```

**Benefits**:
- 60% performance improvement (AWS backbone)
- Automatic failover (< 30 seconds)
- DDoS protection (AWS Shield Standard)
- Static IP addresses (2 Anycast IPs)

> 📚 [AWS Global Accelerator](https://docs.aws.amazon.com/global-accelerator/latest/dg/)

## Network Security Services

### AWS WAF (Web Application Firewall)

**Deployment**:
- CloudFront distributions
- Application Load Balancer
- API Gateway
- AWS AppSync

**Rule Types**:

*Managed Rules*:
- AWS Managed (Core Rule Set, Known Bad Inputs)
- AWS Marketplace (third-party rules)
- Free and paid options

*Custom Rules*:
```yaml
Rules:
  - Name: RateLimitRule
    Type: Rate-based
    Limit: 2000 requests per 5 minutes
    Scope: IP address

  - Name: GeoBlockRule
    Type: Geo match
    Action: Block
    Countries: [CN, RU]

  - Name: SQLiProtection
    Type: SQL injection match
    Field: Query string
    Action: Block

  - Name: XSSProtection
    Type: XSS match
    Field: Body
    Action: Block
```

**Web ACL Components**:
- **Rules**: Conditions to match
- **Rule Groups**: Collection of rules
- **IP Sets**: IP address lists
- **Regex Pattern Sets**: String matching patterns

> 📚 [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/)

### AWS Shield

**Shield Standard**:
- Automatic DDoS protection
- Free for all AWS customers
- Protects against common L3/L4 attacks
- Integrated with CloudFront, Route 53, ALB

**Shield Advanced**:
- $3,000/month + data transfer
- Enhanced DDoS protection
- 24/7 DDoS Response Team (DRT)
- Cost protection (credits for scaling costs)
- Real-time attack visibility
- Advanced reporting

**Shield Advanced Features**:
- Layer 7 attack mitigation
- Application-layer protection
- Health-based detection
- CloudWatch metrics
- DRT assistance

**Protected Resources**:
- CloudFront distributions
- Route 53 hosted zones
- Elastic Load Balancers
- EC2 Elastic IPs
- Global Accelerator

## Exam Tips and Key Takeaways

### VPC Design and Connectivity
1. **CIDR Planning**: Use /16 for production VPCs (65,536 IPs), plan for secondary CIDRs, avoid overlapping ranges for peering
2. **High Availability**: Deploy resources across multiple AZs; use separate route tables per AZ for isolation
3. **NAT Gateway HA**: Deploy one NAT Gateway per AZ for fault tolerance (avoid cross-AZ failures)
4. **Transit Gateway vs VPC Peering**: Use Transit Gateway for hub-and-spoke with 3+ VPCs or hybrid connectivity; use VPC Peering for simple two-VPC scenarios
5. **Route Evaluation**: Most specific route wins (longest prefix match); local routes cannot be overridden

### Security
6. **Security Groups (Stateful)**: Allow rules only, automatic return traffic, instance-level, reference other SGs for dynamic scaling
7. **NACLs (Stateless)**: Allow and deny rules, subnet-level, must configure ephemeral ports (1024-65535), rules evaluated in order
8. **Defense in Depth**: Layer NACL + Security Group + application-level security for comprehensive protection
9. **VPC Endpoints**: Gateway endpoints (free) for S3/DynamoDB; interface endpoints (charged) for other services
10. **Endpoint Policies**: Restrict VPC endpoint access to specific S3 buckets or resources

### Load Balancing
11. **ALB**: Use for HTTP/HTTPS with path/host routing, Lambda targets, authentication, WebSocket support
12. **NLB**: Use for TCP/UDP, static IPs required, extreme performance (millions of requests/sec), source IP preservation
13. **GLB**: Use for third-party appliances (firewalls, IDS/IPS) with GENEVE protocol support
14. **NLB + PrivateLink**: Expose services to other VPCs or accounts without VPC peering
15. **Cross-zone load balancing**: Disabled by default for NLB (enable for even distribution, understand cost implications)

### Content Delivery and DNS
16. **CloudFront vs Global Accelerator**: CloudFront for HTTP/HTTPS with caching; Global Accelerator for TCP/UDP with static Anycast IPs
17. **Origin Access Control (OAC)**: Restrict S3 bucket access to CloudFront only (replaces OAI, supports SSE-KMS)
18. **Lambda@Edge**: Execute code at edge locations for viewer/origin request/response manipulation
19. **Route 53 Weighted Routing**: Blue/green deployments, A/B testing with precise traffic percentage control
20. **Route 53 Failover**: Active-passive DR with health check-based automatic failover
21. **Route 53 Latency-Based**: Route users to lowest latency region for global applications
22. **Route 53 Geolocation**: Content localization, compliance requirements (route by country/continent)
23. **Route 53 Resolver**: Hybrid DNS resolution between AWS and on-premises (inbound/outbound endpoints with forwarding rules)

### Security Services
24. **AWS WAF**: Deploy on CloudFront, ALB, API Gateway for application-layer filtering (rate limiting, geo-blocking, SQL injection protection)
25. **Shield Standard**: Free, automatic DDoS protection for all AWS customers (CloudFront, Route 53, ALB)
26. **Shield Advanced**: $3K/month, enhanced DDoS protection, 24/7 DRT support, cost protection, required for critical applications

### PrivateLink and Hybrid
27. **PrivateLink Use Cases**: SaaS provider pattern, cross-account service sharing, AWS Marketplace services, hybrid architectures
28. **Interface Endpoint**: ENI with private IP, security group support, charged per hour + data
29. **Gateway Endpoint**: Route table entry, no ENI, free, only S3 and DynamoDB
30. **Transit Gateway Features**: Appliance mode for stateful devices, multicast support, inter-region peering, ECMP for VPN

### Architecture Patterns
31. **Multi-Tier VPC**: Public subnets (ALB, NAT), private subnets (app tier), data subnets (RDS)
32. **Centralized Egress**: Route all spoke VPC internet traffic through shared egress VPC with centralized NAT and inspection
33. **Shared Services VPC**: Hub-and-spoke with Transit Gateway, shared services accessible from all spokes
34. **Regional Failover**: Route 53 health checks + failover routing for automatic DR failover

### Cost Optimization
35. **Gateway Endpoints**: Use for S3/DynamoDB to eliminate NAT Gateway data processing charges
36. **Single NAT Gateway**: Non-production environments can use one NAT Gateway (accept cross-AZ data transfer costs)
37. **VPC Peering**: Free for same-region (vs Transit Gateway hourly + data charges) for simple two-VPC connectivity
38. **CloudFront Regional Edge Caches**: Reduce origin load and costs for frequently accessed content

## Common Architectural Patterns

### Multi-Region Active-Active with Global Accelerator

```
┌──────────────┐
│    Users     │
└──────┬───────┘
       │
┌──────▼─────────────┐
│ Global Accelerator │
│  (2 Anycast IPs)   │
└──────┬─────────────┘
       │
   ┌───┴────┬─────────────┐
   │        │             │
┌──▼─────┐ ┌▼──────┐ ┌───▼──────┐
│us-east │ │eu-west│ │ap-south  │
│  NLB   │ │  NLB  │ │   NLB    │
└────────┘ └───────┘ └──────────┘
```

### CloudFront with Multi-Origin

```
┌────────────────┐
│   CloudFront   │
└────┬───────────┘
     │
 ┌───┴─────┬──────────┬──────────┐
 │         │          │          │
┌▼──────┐ ┌▼───────┐ ┌▼───────┐ ┌▼────────┐
│   S3  │ │  ALB   │ │API GW  │ │MediaPkg │
│Static │ │Dynamic │ │  API   │ │  Video  │
└───────┘ └────────┘ └────────┘ └─────────┘

Behavior: /images/* → S3
Behavior: /api/*    → ALB
Behavior: /rest/*   → API Gateway
Behavior: /video/*  → MediaPackage
```

### Hybrid Connectivity with PrivateLink

```
┌──────────────────────┐         ┌──────────────────┐
│   Consumer VPC       │         │   Service VPC    │
│   (Customer Acct)    │         │  (Provider Acct) │
│                      │         │                  │
│  ┌────────────────┐  │         │  ┌────────────┐  │
│  │  Application   │  │         │  │  Service   │  │
│  └───────┬────────┘  │         │  │   (NLB)    │  │
│          │           │         │  └────────────┘  │
│  ┌───────▼────────┐  │         │                  │
│  │VPC Endpoint    │  │  AWS    │                  │
│  │(Interface ENI) │◄─┼─────────┼───PrivateLink    │
│  └────────────────┘  │         │                  │
└──────────────────────┘         └──────────────────┘
```

### Web Application with WAF Protection

```
┌────────────┐
│   Route 53 │
└──────┬─────┘
       │
┌──────▼─────────┐
│   CloudFront   │
│   + WAF Rules  │ ← Rate limiting, Geo blocking
└──────┬─────────┘
       │
┌──────▼──────┐
│     ALB     │
│  + WAF      │ ← SQL injection, XSS protection
└──────┬──────┘
       │
┌──────▼──────┐
│  App Tier   │
│  (ECS/EKS)  │
└─────────────┘
```

## Summary

This comprehensive guide covers the essential networking solutions for designing new workloads in AWS at the Solutions Architect Professional level. Key areas include:

- **VPC Fundamentals**: CIDR planning, subnet design, route tables, internet and NAT gateways for foundational network architecture
- **Security Layering**: Defense-in-depth with Security Groups (stateful, instance-level) and NACLs (stateless, subnet-level) plus VPC endpoints for private AWS service access
- **Hybrid Connectivity**: Transit Gateway for scalable hub-and-spoke architectures, VPC Peering for simple connections, Route 53 Resolver for DNS integration
- **Load Balancing**: Application Load Balancer for HTTP/HTTPS with advanced routing, Network Load Balancer for extreme performance and static IPs, Gateway Load Balancer for security appliances
- **Global Delivery**: CloudFront for content caching and acceleration, Global Accelerator for TCP/UDP applications with static Anycast IPs
- **DNS and Traffic Management**: Route 53 routing policies for blue/green deployments, disaster recovery, global performance optimization, and geolocation-based routing
- **Advanced Patterns**: PrivateLink for service sharing, centralized egress architectures, multi-region failover, and cost-optimized designs

Successful SAP-C02 candidates must demonstrate the ability to select appropriate networking services based on requirements (performance, cost, security, compliance), design highly available and scalable architectures, implement defense-in-depth security, and optimize for cost while maintaining operational excellence.

## Additional AWS Documentation

**Foundational Resources:**
- [Amazon VPC User Guide](https://docs.aws.amazon.com/vpc/latest/userguide/)
- [AWS Networking and Content Delivery Services](https://aws.amazon.com/products/networking/)
- [VPC Network Performance](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-performance.html)

**Whitepapers and Best Practices:**
- [AWS Well-Architected Framework - Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [AWS Well-Architected Framework - Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)
- [Building a Scalable and Secure Multi-VPC AWS Network Infrastructure](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/welcome.html)

**Service-Specific Documentation:**
- [Elastic Load Balancing User Guide](https://docs.aws.amazon.com/elasticloadbalancing/)
- [Amazon Route 53 Developer Guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/)
- [AWS Global Accelerator Developer Guide](https://docs.aws.amazon.com/global-accelerator/latest/dg/)
- [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/)
- [AWS Shield](https://docs.aws.amazon.com/shield/latest/developerguide/)

**Advanced Topics:**
- [AWS PrivateLink Guide](https://docs.aws.amazon.com/vpc/latest/privatelink/)
- [AWS Transit Gateway Guide](https://docs.aws.amazon.com/vpc/latest/tgw/)
- [VPC Peering Guide](https://docs.aws.amazon.com/vpc/latest/peering/)
- [AWS Direct Connect](https://docs.aws.amazon.com/directconnect/latest/UserGuide/)

**FAQs:**
- [Amazon VPC FAQs](https://aws.amazon.com/vpc/faqs/)
- [Elastic Load Balancing FAQs](https://aws.amazon.com/elasticloadbalancing/faqs/)
- [Amazon Route 53 FAQs](https://aws.amazon.com/route53/faqs/)
- [Amazon CloudFront FAQs](https://aws.amazon.com/cloudfront/faqs/)
- [AWS Global Accelerator FAQs](https://aws.amazon.com/global-accelerator/faqs/)
