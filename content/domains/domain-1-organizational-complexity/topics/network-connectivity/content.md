---
title: Network Connectivity Strategies
lastUpdated: 2026-01-05
---

# Network Connectivity Strategies

Designing network connectivity for complex AWS environments requires understanding of Transit Gateway, Direct Connect, VPN, and VPC peering architectures.

## AWS Transit Gateway

AWS Transit Gateway acts as a cloud router, connecting VPCs and on-premises networks through a central hub.

### Key Features
- **Central hub** - Connect thousands of VPCs and on-premises networks
- **Route tables** - Control traffic flow between attachments
- **Peering** - Connect Transit Gateways across regions
- **Multicast support** - Distribute multicast traffic

### Routing Architecture

Transit Gateway uses route tables to control traffic between:
- VPC attachments
- VPN connections
- Direct Connect gateways
- Transit Gateway peering connections

**Best Practice**: Use separate route tables for different network segments (production, development, shared services).

## AWS Direct Connect

Direct Connect provides dedicated network connections from your premises to AWS.

### Virtual Interfaces (VIFs)

1. **Private VIF** - Access VPC resources using private IP addresses
2. **Public VIF** - Access AWS public services (S3, DynamoDB) over private connection
3. **Transit VIF** - Connect to Transit Gateway for multi-VPC access

### High Availability

For production workloads, implement:
- Multiple Direct Connect connections to different locations
- VPN as backup connectivity
- BGP routing for automatic failover

## Hybrid DNS Resolution

Route 53 Resolver enables DNS queries between on-premises and AWS.

### Resolver Endpoints

- **Inbound endpoints** - On-premises systems query Route 53 private zones
- **Outbound endpoints** - AWS resources query on-premises DNS servers
- **Forwarding rules** - Direct queries to specific domains

## Network Segmentation

Use multiple strategies to segment network traffic:

1. **Separate VPCs** - Isolate by environment or application
2. **Transit Gateway route tables** - Control inter-VPC routing
3. **Security groups and NACLs** - Layer traffic controls
4. **AWS PrivateLink** - Expose services without VPC peering

## Exam Tips

- Understand when to use Transit Gateway vs VPC peering vs PrivateLink
- Know Direct Connect virtual interface types and use cases
- Remember Transit Gateway has a limit of 5000 attachments per gateway
- Route 53 Resolver is required for hybrid DNS resolution

## Common Scenarios

**Question Type**: "A company needs to connect 50 VPCs across multiple regions..."
**Answer**: Transit Gateway with inter-region peering

**Question Type**: "On-premises applications need private access to S3..."
**Answer**: Direct Connect with private VIF to VPC, then use VPC endpoint for S3

## Additional Resources

- [AWS Transit Gateway Documentation](https://docs.aws.amazon.com/vpc/latest/tgw/)
- [AWS Direct Connect Documentation](https://docs.aws.amazon.com/directconnect/latest/UserGuide/)
- [Building a Scalable and Secure Multi-VPC Network Infrastructure](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/welcome.html)
