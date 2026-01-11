---
title: Domain 4 - ML Solution Monitoring, Maintenance, and Security
lastUpdated: 2026-01-10
---

# ML Solution Monitoring, Maintenance, and Security

This domain focuses on production monitoring, detecting model degradation, optimizing costs, and securing ML workloads. You'll need to demonstrate expertise in operational excellence and security best practices for ML systems.

## Exam Weight

This domain represents **24%** of the MLA-C01 exam. Understanding how to maintain ML systems in production and implement security controls is essential.

## What You'll Learn

This domain tests your ability to:

1. **Monitor model inference** - Track accuracy, latency, throughput, and detect model degradation
2. **Detect data drift** - Identify when incoming data deviates from training data distribution
3. **Monitor infrastructure** - Track compute utilization, costs, and resource health
4. **Optimize costs** - Right-size instances, use spot capacity, and manage endpoint costs
5. **Implement security** - Configure IAM, encryption, network isolation, and compliance

## Key Services

Focus your study on these primary services:

- **SageMaker Model Monitor** - Automated monitoring for data quality and model drift
- **Amazon CloudWatch** - Metrics, logs, and alarms for ML infrastructure
- **AWS CloudTrail** - API activity logging and auditing
- **AWS IAM** - Identity and access management for ML resources
- **AWS KMS** - Encryption key management
- **Amazon VPC** - Network isolation for SageMaker resources
- **SageMaker Clarify** - Bias and explainability monitoring in production

## Study Approach

Follow this recommended approach to master this domain:

1. **Master Model Monitor** - Understand baseline creation, monitoring schedules, and alerts
2. **Learn drift types** - Data drift, concept drift, prediction drift, and detection methods
3. **Know CloudWatch metrics** - Key SageMaker metrics for endpoints, training, and processing
4. **Understand security controls** - VPC configuration, IAM roles, encryption at rest and in transit
5. **Practice cost optimization** - Instance selection, auto-scaling, spot instances, serverless
6. **Hands-on labs** - Set up actual monitoring and alerting to understand practical implementation

## Exam Tips

Key areas that frequently appear on the exam:

- **Model Monitor types** - Data Quality, Model Quality, Bias Drift, Feature Attribution Drift
- **Baseline creation** - Using training data to establish statistical baselines
- **Monitoring schedules** - Hourly, daily, or custom schedules for drift detection
- **CloudWatch alarms** - Threshold-based alerts for latency, errors, and drift violations
- **IAM for SageMaker** - Execution roles, resource-based policies, cross-account access
- **VPC configuration** - Private subnets, NAT gateways, VPC endpoints for SageMaker
- **Encryption** - KMS keys for training data, model artifacts, and endpoint traffic

## Common Scenarios

The exam will test scenarios such as:

- "Set up monitoring to detect when model accuracy degrades in production"
- "Configure alerts when data drift exceeds acceptable thresholds"
- "Implement least-privilege access for a data science team using SageMaker"
- "Encrypt model artifacts and ensure training jobs run in isolated VPCs"
- "Optimize endpoint costs for a model with variable traffic patterns"
- "Create an audit trail for all model training and deployment activities"
