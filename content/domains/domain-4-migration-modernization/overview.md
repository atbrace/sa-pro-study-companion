---
title: Accelerate Workload Migration and Modernization
lastUpdated: 2026-01-05
---

# Accelerate Workload Migration and Modernization

Domain 4 represents **20% of the SAP-C02 exam** and focuses on migrating existing workloads to AWS and modernizing applications for cloud-native architectures.

## Domain Overview

This domain tests your ability to:

1. **Select migration strategies** - Choose appropriate approach from the 6 R's
2. **Plan and execute migrations** - Use AWS tools for discovery, planning, and execution
3. **Minimize downtime** - Implement near-zero downtime migration strategies
4. **Modernize applications** - Transform legacy apps to cloud-native architectures
5. **Design hybrid solutions** - Connect on-premises with AWS seamlessly

## The 6 R's of Migration

### 1. Rehost (Lift and Shift)
- Move applications as-is to AWS
- Minimal changes to application
- Fastest migration approach
- Use: Application Migration Service (MGN)

### 2. Replatform (Lift, Tinker, and Shift)
- Minor optimizations during migration
- Example: Move database to RDS instead of EC2
- Some cloud benefits without code changes

### 3. Repurchase (Drop and Shop)
- Move to SaaS solution
- Example: Migrate CRM to Salesforce
- Replace custom software with commercial products

### 4. Refactor (Re-architect)
- Redesign application for cloud-native
- Microservices, serverless, containers
- Maximum cloud benefits
- Highest effort and risk

### 5. Retire
- Decommission applications no longer needed
- Reduce costs and complexity
- Often 10-20% of IT portfolio

### 6. Retain (Revisit)
- Keep on-premises for now
- Regulatory, latency, or business reasons
- Revisit later

## Key Exam Tasks

### Task 4.1: Select Migration Strategies

Evaluate workloads considering:
- **Business requirements** - Timeline, budget, risk tolerance
- **Technical feasibility** - Dependencies, complexity
- **Cloud benefits** - What benefits to achieve (cost, agility, performance)
- **Skills and resources** - Available expertise

### Task 4.2: Database Migration

Migrate databases using:
- **AWS DMS** - Replicate databases with minimal downtime
- **Schema Conversion Tool (SCT)** - Convert schema for heterogeneous migrations
- **Native tools** - Backup/restore, read replicas
- **Snowball Edge** - Large database transfers

### Task 4.3: Application Modernization

Transform applications with:
- **Containers** - ECS, EKS for microservices
- **Serverless** - Lambda, API Gateway, Step Functions
- **Managed services** - RDS, ElastiCache, SQS instead of self-managed
- **Strangler fig pattern** - Incrementally replace components

### Task 4.4: Hybrid Architectures

Connect on-premises with AWS:
- **Networking** - Direct Connect, VPN
- **Storage** - Storage Gateway, DataSync
- **Compute** - Outposts, VMware Cloud on AWS
- **Data** - DMS, Snowball, Transfer Family

## Study Approach

1. **Know the 6 R's** - When to use each strategy
2. **Learn migration tools** - MGN, DMS, SCT, DataSync, Snow Family
3. **Understand hybrid** - Direct Connect, Storage Gateway, Outposts
4. **Minimize downtime** - CDC, blue/green, pilot light patterns
5. **Modernization patterns** - Strangler fig, decomposition strategies

## Topics Covered

1. **Migration Strategies** - 6 R's, assessment, planning, execution
2. **Database Migration** - DMS, SCT, heterogeneous and homogeneous migrations
3. **Application Modernization** - Containers, serverless, microservices
4. **Hybrid Architectures** - Direct Connect, VPN, Storage Gateway, Outposts

## Exam Tips

- **DMS** - Supports homogeneous and heterogeneous migrations with CDC
- **SCT** - Required for heterogeneous migrations (Oracle → PostgreSQL)
- **MGN (Application Migration Service)** - Replaced Server Migration Service (SMS)
- **Direct Connect** - Dedicated network connection, not encrypted by default
- **Storage Gateway** - File, Volume, and Tape Gateway modes
- **DataSync** - Fast data transfer, can schedule recurring transfers
- **Snowball Edge** - 80 TB storage, can run EC2/Lambda at edge
- **Outposts** - AWS infrastructure on-premises
- **Strangler fig** - Incrementally replace monolith components

## Common Scenarios

The exam will test scenarios like:
- "Migrate 500 servers to AWS with minimal downtime"
- "Migrate Oracle database to Aurora PostgreSQL"
- "Modernize monolithic application to microservices"
- "Design hybrid solution for on-premises data center"
- "Transfer 500 TB of data to AWS"
- "Connect on-premises network to AWS with guaranteed bandwidth"

Focus on **selecting the right tools** for each migration scenario and **minimizing downtime** during transitions.
