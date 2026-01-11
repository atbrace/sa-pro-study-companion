---
title: Domain 2 - Design Solutions for New Workloads
lastUpdated: 2026-01-06
---

# Design Solutions for New Workloads

This domain focuses on designing solutions for new workloads on AWS. You'll need to demonstrate expertise in selecting appropriate services, designing deployment strategies, ensuring business continuity, implementing security controls, meeting reliability requirements, optimizing performance, and managing costs.

## Exam Weight

This domain represents **29% of the SAP-C02 exam**, making it the highest weighted area. This domain requires deep knowledge of AWS services and when to use each one based on specific requirements.

## What You'll Learn

This domain tests your ability to:

1. **Design deployment strategies** - Select appropriate compute, container, and serverless services based on workload characteristics and business requirements
2. **Ensure business continuity** - Implement backup, disaster recovery, and high availability solutions across AWS services
3. **Determine security controls** - Design encryption, access management, network security, and secrets management for new workloads
4. **Meet reliability requirements** - Implement fault tolerance, auto-scaling, monitoring, and health checks
5. **Meet performance objectives** - Optimize compute, storage, database, and network performance to meet SLAs
6. **Optimize costs** - Select appropriate pricing models, right-size resources, and design cost-effective architectures

## Key Service Categories

When designing new workloads, you must consider:

- **Compute Options** - EC2, Lambda, containers (ECS/EKS), Batch
- **Storage Solutions** - S3, EBS, EFS, FSx, Storage Gateway
- **Database Services** - RDS, Aurora, DynamoDB, ElastiCache, specialized databases
- **Networking Architecture** - VPC design, load balancing, DNS, CDN
- **Application Integration** - Messaging, event-driven architectures, orchestration
- **Serverless Patterns** - Lambda, API Gateway, event sources, state management

## Study Approach

Follow this recommended approach to master this domain:

1. **Understand service capabilities** - Know when to use each service and its limitations
2. **Compare alternatives** - EC2 vs Lambda, RDS vs DynamoDB, ECS vs EKS
3. **Learn design patterns** - Common architectural patterns for different workload types
4. **Hands-on practice** - Deploy actual workloads to understand trade-offs
5. **Cost awareness** - Always consider cost implications of architectural decisions
6. **Security by design** - Incorporate security controls from the beginning

## Exam Tips

Key areas that frequently appear on the exam:

- **Know service limits** - Understand default limits and how to request increases
- **Understand trade-offs** - Security vs performance, cost vs reliability, managed vs self-managed
- **Encryption everywhere** - Data at rest and in transit must be encrypted
- **Multi-AZ vs Multi-Region** - Know when each is appropriate for HA and DR
- **Managed services preference** - AWS prefers managed services for operational excellence
- **Database selection** - OLTP vs OLAP, relational vs NoSQL, caching strategies
- **Lambda limitations** - Execution time, memory, concurrent executions, VPC cold starts
- **Container orchestration** - ECS vs EKS trade-offs, Fargate vs EC2 launch types

## Common Scenarios

The exam will test scenarios such as:

- "Design a highly available web application with database backend"
- "Choose the right database for a specific use case (high read, low latency, etc.)"
- "Optimize costs for a batch processing workload that runs nightly"
- "Design a serverless API with authentication and rate limiting"
- "Implement disaster recovery with 1-hour RTO and 15-minute RPO"
- "Select storage solutions for different access patterns (frequent, infrequent, archival)"
- "Design a microservices architecture with service discovery and load balancing"
- "Optimize performance for a global application with users worldwide"

Focus on understanding **why** certain services are chosen for specific scenarios, not just **what** services exist.
