---
title: Domain 4 - Accelerate Workload Migration and Modernization
lastUpdated: 2026-01-06
---

# Accelerate Workload Migration and Modernization

This domain focuses on migrating existing workloads to AWS and modernizing applications for cloud-native architectures. You'll need to demonstrate expertise in migration strategies, database migration, application modernization, and hybrid architectures.

## Exam Weight

This domain represents **20% of the SAP-C02 exam**. This domain requires understanding of migration strategies, tools, and patterns for moving workloads to AWS and transforming them for the cloud.

## What You'll Learn

This domain tests your ability to:

1. **Select migration strategies** - Choose the appropriate approach from the 6 R's based on business and technical requirements
2. **Plan and execute migrations** - Use AWS migration tools for discovery, planning, and execution
3. **Minimize downtime** - Implement near-zero downtime migration strategies using appropriate tools and patterns
4. **Migrate databases** - Move databases to AWS with minimal downtime using DMS and SCT
5. **Modernize applications** - Transform legacy applications to cloud-native architectures
6. **Design hybrid solutions** - Connect on-premises environments with AWS seamlessly

## The 6 R's of Migration

Understanding when to use each migration strategy is critical:

### 1. Rehost (Lift and Shift)
- Move applications as-is to AWS with minimal changes
- Fastest migration approach, lowest risk
- Use AWS Application Migration Service (MGN)
- Best for: Time-sensitive migrations, applications with limited documentation

### 2. Replatform (Lift, Tinker, and Shift)
- Minor optimizations during migration without changing core architecture
- Example: Move database to RDS instead of running on EC2
- Some cloud benefits without significant code changes
- Best for: Getting quick cloud benefits while minimizing risk

### 3. Repurchase (Drop and Shop)
- Move to a different product, typically SaaS
- Example: Migrate on-premises CRM to Salesforce
- Replace custom software with commercial products
- Best for: Legacy software with modern SaaS alternatives

### 4. Refactor (Re-architect)
- Redesign application for cloud-native architecture
- Use microservices, serverless, containers
- Maximum cloud benefits but highest effort and risk
- Best for: Applications needing significant improvements, competitive advantage

### 5. Retire
- Decommission applications that are no longer needed
- Reduces costs and complexity
- Often 10-20% of enterprise IT portfolio can be retired
- Best for: Redundant systems, unused applications

### 6. Retain (Revisit)
- Keep on-premises for now, revisit later
- Regulatory, latency, or business reasons
- Plan to migrate in future phases
- Best for: Recently upgraded systems, applications not ready for migration

## Study Approach

Follow this recommended approach to master this domain:

1. **Master the 6 R's** - Understand when to use each migration strategy
2. **Learn migration tools** - MGN, DMS, SCT, DataSync, Snow Family, Transfer Family
3. **Understand hybrid connectivity** - Direct Connect, VPN, Storage Gateway
4. **Minimize downtime patterns** - CDC, blue/green deployments, pilot light
5. **Modernization patterns** - Strangler fig, decomposition strategies, microservices
6. **Database migrations** - Homogeneous vs heterogeneous, cutover strategies

## Exam Tips

Key areas that frequently appear on the exam:

- **AWS DMS** - Supports homogeneous and heterogeneous migrations with continuous data replication (CDC)
- **Schema Conversion Tool (SCT)** - Required for heterogeneous migrations (Oracle to PostgreSQL, SQL Server to MySQL)
- **Application Migration Service (MGN)** - Replaced Server Migration Service (SMS), lift-and-shift at scale
- **Direct Connect** - Dedicated network connection, NOT encrypted by default (use VPN over DX for encryption)
- **Storage Gateway** - File Gateway, Volume Gateway, and Tape Gateway modes
- **DataSync** - Fast automated data transfer, can schedule recurring transfers
- **Snowball Edge** - 80 TB storage, can run EC2 and Lambda at edge locations
- **Snowmobile** - Exabyte-scale data transfer (up to 100 PB per Snowmobile)
- **AWS Outposts** - AWS infrastructure on-premises for low-latency or data residency requirements
- **Strangler fig pattern** - Incrementally replace monolith components with microservices

## Common Scenarios

The exam will test scenarios such as:

- "Migrate 500 servers to AWS with minimal downtime in 6 months"
- "Migrate an Oracle database to Aurora PostgreSQL with less than 1 hour downtime"
- "Modernize a monolithic Java application to microservices architecture"
- "Design hybrid solution connecting multiple on-premises data centers to AWS"
- "Transfer 500 TB of data to AWS for initial migration"
- "Connect on-premises network to AWS with guaranteed bandwidth and low latency"
- "Migrate SQL Server databases to RDS while maintaining transactional consistency"
- "Design a phased migration approach for a complex application with many dependencies"

Focus on **selecting the right migration strategy and tools** for each scenario and **minimizing downtime** during transitions.
