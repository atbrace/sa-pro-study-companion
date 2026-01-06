---
title: Design Solutions for New Workloads
lastUpdated: 2026-01-05
---

# Design Solutions for New Workloads

Domain 2 represents **29% of the SAP-C02 exam** and focuses on designing solutions for new workloads on AWS. This domain tests your ability to select appropriate services, design deployment strategies, ensure business continuity, implement security controls, meet reliability requirements, optimize performance, and manage costs.

## Domain Overview

When designing solutions for new workloads, you must consider:

1. **Compute Options** - EC2, Lambda, containers (ECS/EKS), Batch
2. **Storage Solutions** - S3, EBS, EFS, FSx, Storage Gateway
3. **Database Services** - RDS, Aurora, DynamoDB, ElastiCache, specialized databases
4. **Networking Architecture** - VPC design, load balancing, DNS, CDN
5. **Application Integration** - Messaging, event-driven architectures, orchestration
6. **Serverless Patterns** - Lambda, API Gateway, event sources, DynamoDB

## Key Exam Tasks

### Task 2.1: Design Deployment Strategies

Design deployment strategies using:
- **Compute services** based on workload characteristics
- **Container orchestration** for microservices
- **Serverless architectures** for event-driven workloads
- **Batch processing** for large-scale data processing

### Task 2.2: Ensure Business Continuity

Implement:
- **Backup strategies** across services
- **Disaster recovery** with appropriate RTO/RPO
- **High availability** with multi-AZ and cross-region deployments
- **Data replication** and failover mechanisms

### Task 2.3: Determine Security Controls

Design security with:
- **Encryption at rest and in transit**
- **IAM policies and roles** for least privilege
- **Network security** with VPCs, security groups, NACLs
- **Secrets management** with Secrets Manager/Parameter Store

### Task 2.4: Meet Reliability Requirements

Ensure reliability through:
- **Fault tolerance** with multi-AZ deployments
- **Auto Scaling** based on metrics
- **Monitoring and alerting** with CloudWatch
- **Health checks** and automatic recovery

### Task 2.5: Meet Performance Objectives

Optimize performance with:
- **Right-sized compute resources**
- **Caching strategies** (CloudFront, ElastiCache, DAX)
- **Database optimization** (read replicas, indexing, query optimization)
- **Network performance** (placement groups, enhanced networking, accelerated networking)

### Task 2.6: Cost Optimization

Manage costs through:
- **Appropriate pricing models** (On-Demand, Reserved, Spot, Savings Plans)
- **Right-sizing** resources
- **Storage class optimization**
- **Serverless for variable workloads**

## Study Approach

1. **Understand service capabilities** - Know when to use each service
2. **Compare alternatives** - EC2 vs Lambda, RDS vs DynamoDB, etc.
3. **Design patterns** - Learn common architectural patterns
4. **Hands-on practice** - Deploy actual workloads to understand trade-offs
5. **Cost awareness** - Always consider cost implications

## Topics Covered

This domain includes the following topics:

1. **Compute Solutions** - EC2, Lambda, containers, batch processing
2. **Storage Solutions** - Object, block, file, and hybrid storage
3. **Database Solutions** - Relational, NoSQL, caching, and specialized databases
4. **Networking Solutions** - VPC architecture, load balancing, content delivery
5. **Application Integration** - Messaging, events, orchestration
6. **Serverless Architectures** - Event-driven patterns, API design, state management

## Exam Tips

- **Know service limits** and how to request increases
- **Understand trade-offs** between different service options
- **Security is not optional** - always implement encryption and least privilege
- **Cost optimization** should be considered from the start
- **Multi-AZ vs Multi-Region** - know when each is appropriate
- **Managed services** are generally preferred for operational excellence

## Common Scenarios

The exam will test scenarios like:
- "Design a highly available web application with database backend"
- "Choose the right database for a specific use case"
- "Optimize costs for a batch processing workload"
- "Design a serverless API with authentication"
- "Implement disaster recovery with 1-hour RTO"
- "Select storage solutions for different access patterns"

Focus on understanding **why** certain services are chosen for specific scenarios, not just **what** services exist.
