# AWS SAP Study App - Content Library

## Overview

This document describes the structure and organization of the study content for the AWS Solutions Architect Professional (SAP-C02) certification preparation application.

## Content Structure

```
content/
├── domains/
│   ├── domain-1-organizational-complexity/
│   │   ├── meta.yaml              # Domain metadata
│   │   ├── overview.md            # Domain overview and study path
│   │   └── topics/
│   │       ├── network-connectivity/
│   │       │   ├── meta.yaml      # Topic metadata
│   │       │   ├── content.md     # Study material
│   │       │   └── questions.yaml # Knowledge check questions
│   │       ├── security-controls/
│   │       ├── resilient-architectures/
│   │       ├── multi-account-environment/
│   │       └── cost-optimization/
│   ├── domain-2-new-solutions/
│   ├── domain-3-continuous-improvement/
│   └── domain-4-migration-modernization/
│
└── experiments/
    ├── lab-transit-gateway/
    │   ├── README.md              # Lab guide
    │   └── cdk/
    │       └── stack.ts           # CDK infrastructure
    └── [other labs]/
```

## Domain Breakdown (SAP-C02 Aligned)

### Domain 1: Design Solutions for Organizational Complexity (26%)

| Topic | Exam Task | Key Services |
|-------|-----------|--------------|
| Network Connectivity | Task 1.1 | Transit Gateway, Direct Connect, VPN, Route 53 |
| Security Controls | Task 1.2 | IAM, KMS, Security Hub, CloudTrail |
| Resilient Architectures | Task 1.3 | Elastic Disaster Recovery, Multi-Region, Backup |
| Multi-Account Environment | Task 1.4 | Organizations, Control Tower, SCPs |
| Cost Optimization | Task 1.5 | Cost Explorer, Budgets, Compute Optimizer |

### Domain 2: Design for New Solutions (29%)

| Topic | Exam Task | Key Services |
|-------|-----------|--------------|
| Deployment Strategy | Task 2.1 | CloudFormation, CodePipeline, Systems Manager |
| Business Continuity | Task 2.2 | Route 53, Elastic Disaster Recovery, Backup |
| Security Controls | Task 2.3 | IAM, WAF, Shield, GuardDuty |
| Reliability Requirements | Task 2.4 | Auto Scaling, ELB, Multi-AZ, SQS/SNS |
| Performance Objectives | Task 2.5 | CloudFront, ElastiCache, Aurora, DynamoDB |
| Cost Optimization Strategy | Task 2.6 | Savings Plans, Spot, Reserved Instances |

### Domain 3: Continuous Improvement for Existing Solutions (25%)

| Topic | Exam Task | Key Services |
|-------|-----------|--------------|
| Operational Excellence | Task 3.1 | CloudWatch, X-Ray, Systems Manager |
| Security Improvement | Task 3.2 | Config, Secrets Manager, Inspector |
| Performance Improvement | Task 3.3 | Compute Optimizer, CloudWatch, Auto Scaling |
| Reliability Improvement | Task 3.4 | Trusted Advisor, Well-Architected Tool |
| Cost Optimization | Task 3.5 | Cost Explorer, Budgets, tagging |

### Domain 4: Accelerate Workload Migration and Modernization (20%)

| Topic | Exam Task | Key Services |
|-------|-----------|--------------|
| Workload Selection | Task 4.1 | Migration Hub, Application Discovery |
| Migration Approach | Task 4.2 | DMS, SCT, DataSync, Snow Family |
| New Architecture | Task 4.3 | ECS, EKS, Lambda, Aurora, DynamoDB |
| Modernization Opportunities | Task 4.4 | Lambda, Fargate, Step Functions, EventBridge |

## File Formats

### Domain meta.yaml

```yaml
id: domain-1-organizational-complexity
name: Design Solutions for Organizational Complexity
shortName: Organizational Complexity
weight: 26                              # Exam percentage weight
description: >
  Full description of the domain...
color: blue                             # UI theme color
icon: building-2                        # Lucide icon name

examTasks:
  - id: task-1-1
    name: Task name from exam guide
    description: What this task covers

topics:
  - network-connectivity               # Topic folder names
  - security-controls

keyServices:
  - Amazon VPC
  - AWS Transit Gateway

awsDocLinks:
  - title: Document title
    url: https://docs.aws.amazon.com/...
    type: doc | whitepaper | faq
```

### Topic meta.yaml

```yaml
id: network-connectivity
name: Network Connectivity Strategies
shortName: Network Connectivity
examTask: task-1-1                      # Links to domain task
description: >
  Full description...

estimatedStudyTime: 90                  # Minutes
difficulty: beginner | intermediate | advanced

keyServices:
  - Amazon VPC
  - AWS Transit Gateway

keyConcepts:
  - Transit Gateway routing
  - Direct Connect virtual interfaces

awsDocLinks:
  - title: Document title
    url: https://...
    type: doc | whitepaper | faq

relatedExperiments:
  - lab-transit-gateway
```

### Topic content.md

```markdown
---
title: Topic Title
lastUpdated: 2025-01-05
---

# Topic Title

Introduction paragraph...

## Section Heading

Content with inline [AWS doc links](https://...).

> 📚 [Related documentation](https://...)

### Subsection

More content...

## Exam Tips

1. Key point for the exam
2. Another important concept
```

### Topic questions.yaml

```yaml
questions:
  - id: unique-id-001
    type: single | multi
    correctCount: 2                     # Only for multi-select
    text: >
      Question text that can span
      multiple lines...
    options:
      - id: A
        text: Option A text
      - id: B
        text: Option B text
      - id: C
        text: Option C text
      - id: D
        text: Option D text
    correctAnswer: B                    # Or [A, C] for multi-select
    explanation: >
      Explanation of why this answer is correct
      and why others are incorrect...
    awsDocLink: https://docs.aws.amazon.com/...
    services: [Service1, Service2]
    concepts: [concept1, concept2]
```

## Question Guidelines

### Question Types

1. **Single-select**: One correct answer from 4 options
2. **Multi-select**: 2-3 correct answers from 5-6 options

### Question Quality Standards

- Questions should be scenario-based when possible
- Avoid trivial recall questions
- Include realistic distractors
- Explanations should explain WHY, not just WHAT
- Link to specific AWS documentation
- Tag with relevant services and concepts

### Difficulty Levels

- **Initial Assessment**: Quick knowledge checks (30-60 seconds each)
- **Deep Dive**: More complex scenarios (2-3 minutes each)

## Experiment Guidelines

### Lab Structure

```
lab-name/
├── README.md          # Lab guide (Markdown)
├── meta.yaml          # Lab metadata (optional)
└── cdk/
    ├── stack.ts       # Main CDK stack
    └── package.json   # CDK dependencies
```

### Lab Requirements

1. **Clear learning objectives**
2. **Architecture diagram**
3. **Cost estimate**
4. **Step-by-step instructions**
5. **Cleanup instructions**
6. **Knowledge check questions**

### CDK Standards

- Tag all resources with `sap-study-lab` and `auto-cleanup`
- Use minimal instance sizes (t3.micro, t3.small)
- Provide stack outputs for console links
- Support clean destroy without manual intervention

## Content Checklist

### Per Topic (15 questions minimum)

- [ ] meta.yaml with all required fields
- [ ] content.md with study material
- [ ] content-advanced.md (if needed for length)
- [ ] questions.yaml with 15 knowledge check questions
- [ ] All AWS doc links verified working
- [ ] Questions reviewed for accuracy

### Per Domain

- [ ] meta.yaml with domain overview
- [ ] overview.md with study path
- [ ] All topics completed
- [ ] At least 2 related experiments

### Per Experiment

- [ ] README.md with complete lab guide
- [ ] CDK stack tested and working
- [ ] Cost estimate included
- [ ] Cleanup verified
- [ ] Learning objectives aligned with domain/topic
