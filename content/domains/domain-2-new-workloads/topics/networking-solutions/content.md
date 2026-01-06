---
title: Networking Solutions for New Workloads
lastUpdated: 2026-01-05
---

# Networking Solutions for New Workloads

Designing network architectures for new workloads requires understanding VPC fundamentals, load balancing strategies, content delivery optimization, DNS routing policies, and network security services.

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

> 📚 [VPC CIDR Blocks](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html)

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

> 📚 [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)

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

**Web Distribution**:
- HTTP/HTTPS content delivery
- Origin: S3, HTTP server, ALB, custom origin
- Edge locations worldwide (400+)

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
```json
S3 Bucket Policy:
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

**Use Cases**:
- Static website hosting with global delivery
- Media distribution (images, videos)
- Software distribution (download acceleration)
- API acceleration

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
- Return multiple healthy IPs
- Client-side load balancing
- Health checks for each value

> 📚 [Route 53 Routing Policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)

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
Interval: 30 seconds
Failure Threshold: 3
String Matching: "healthy"
Regions: Multiple AWS regions
```

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
│                  │         │                  │
│              <───│─────────│<── Outbound      │
│  DNS Server      │         │    Endpoint      │
│  (AWS queries)   │         │    (Forwarding   │
│                  │         │     Rules)       │
└──────────────────┘         └──────────────────┘
```

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

## Exam Tips

1. **ALB for HTTP/HTTPS** with path/host routing; **NLB for TCP/UDP** with static IP and extreme performance
2. **Gateway endpoints (free) for S3 and DynamoDB**; interface endpoints for other services
3. **CloudFront for HTTP/HTTPS content delivery**; Global Accelerator for TCP/UDP applications
4. **PrivateLink for private connectivity** to VPCs or AWS services without internet gateway
5. **Route 53 weighted routing for blue/green deployments**; latency-based for global apps
6. **Route 53 failover for active-passive DR**; geolocation for compliance
7. **NLB + PrivateLink to expose services** to other VPCs or accounts
8. **Lambda@Edge for content customization** at edge locations
9. **Origin Access Control (OAC) to restrict S3 access** to CloudFront only
10. **Global Accelerator provides static Anycast IPs** for non-HTTP protocols
11. **WAF on CloudFront, ALB, or API Gateway** for application-layer filtering
12. **Shield Advanced for critical applications** requiring DDoS response team
13. **VPC endpoint policies to restrict access** to specific S3 buckets or resources
14. **Route 53 Resolver for hybrid DNS** between AWS and on-premises
15. **Cross-zone load balancing** disabled by default for NLB (cost optimization)

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

> 📚 [AWS Networking Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-performance.html)
